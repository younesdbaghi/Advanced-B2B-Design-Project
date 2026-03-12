import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import debounce from "lodash.debounce";
import API from "../api";
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  ArrowLeft,
  Loader,
} from "lucide-react";

const DesignEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const wrapperRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [designData, setDesignData] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Chargement des données...");

  const user = JSON.parse(localStorage.getItem("user"));
  const isDesigner = user?.rôle === "designer";

  // 🔒 Fonction pour rendre le canvas en lecture seule
  const lockCanvasObjects = (canvas) => {
    canvas.selection = false;
    canvas.skipTargetFind = true;

    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
      obj.hasControls = false;
      obj.hasBorders = false;
      obj.lockMovementX = true;
      obj.lockMovementY = true;
      obj.lockRotation = true;
      obj.lockScalingX = true;
      obj.lockScalingY = true;
    });

    canvas.renderAll();
  };

  // 1️⃣ Récupération des données depuis le backend
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [resMaquette, resVersion] = await Promise.all([
          API.get(`/maquettes/${id}`),
          API.get(`/maquettes/${id}/latest-version`),
        ]);
        if (isMounted) {
          setDesignData({
            maquette: resMaquette.data,
            version: resVersion.data,
          });
        }
      } catch (err) {
        if (isMounted) setSaveStatus("Erreur de chargement des données");
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id]);

  // 2️⃣ Initialisation du canvas
  useEffect(() => {
    if (!designData || !wrapperRef.current) return;

    setSaveStatus("Initialisation de l'éditeur...");
    wrapperRef.current.innerHTML = "";
    const canvasElement = document.createElement("canvas");
    wrapperRef.current.appendChild(canvasElement);

    const canvas = new fabric.Canvas(canvasElement, {
      width: 900,
      height: 600,
      backgroundColor: "#f0f2f5",
      preserveObjectStacking: true,
    });
    setFabricCanvas(canvas);

    const { maquette, version } = designData;

    const loadCanvasContent = async () => {
      try {
        const hasObjects = version.contenu?.objects?.length > 0;
        const hasImageFond = !!maquette.image_fond;

        if (hasObjects) {
          const loadRes = canvas.loadFromJSON(version.contenu, () => {
            canvas.renderAll();
            setSaveStatus("À jour");
            if (!isDesigner) lockCanvasObjects(canvas);
          });
          if (loadRes && typeof loadRes.then === "function") {
            await loadRes;
            canvas.renderAll();
            if (!isDesigner) lockCanvasObjects(canvas);
          }
        } else if (hasImageFond) {
          const handleImg = async (img) => {
            canvas.renderAll();
            setSaveStatus("À jour");
            if (!isDesigner) lockCanvasObjects(canvas);
          };
          const imgRes = fabric.Image.fromURL(
            maquette.image_fond,
            (img) => { if (img && !imgRes) handleImg(img); }
          );
          if (imgRes && typeof imgRes.then === "function") {
            const img = await imgRes;
            await handleImg(img);
          }
        } else {
          setSaveStatus("À jour");
        }
      } catch (error) {
        console.error("Erreur d'affichage", error);
        setSaveStatus("Erreur d'affichage");
      }
    };

    loadCanvasContent();
    return () => { canvas.dispose(); };
  }, [designData, isDesigner]);

  // 3️⃣ Sauvegarde automatique
  const triggerSave = async (canvasInstance, vId) => {
    if (!vId || !isDesigner) return;
    setSaveStatus("Sauvegarde...");
    try {
      const json = canvasInstance.toJSON();
      await API.put(`/versions/${vId}`, { contenu: json });
      setSaveStatus("Sauvegardé ☁️");
    } catch (err) {
      setSaveStatus("Erreur ❌");
    }
  };
  const debouncedSave = useRef(debounce((c, v) => triggerSave(c, v), 500)).current;

  useEffect(() => {
    if (!fabricCanvas || !designData?.version?._id || !isDesigner) return;
    const vId = designData.version._id;
    const handleChange = () => debouncedSave(fabricCanvas, vId);
    const handleRemove = () => { debouncedSave.cancel(); triggerSave(fabricCanvas, vId); };

    fabricCanvas.on("object:modified", handleChange);
    fabricCanvas.on("object:added", handleChange);
    fabricCanvas.on("object:removed", handleRemove);

    return () => {
      fabricCanvas.off("object:modified", handleChange);
      fabricCanvas.off("object:added", handleChange);
      fabricCanvas.off("object:removed", handleRemove);
    };
  }, [fabricCanvas, designData, debouncedSave, isDesigner]);

  // ─── Outils d'édition
  const addText = () => {
    if (!fabricCanvas || !isDesigner) return;
    const text = new fabric.IText("Texte ici", { left: 100, top: 100, fill: "#333", fontSize: 24 });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
  };
  const addRect = () => {
    if (!fabricCanvas || !isDesigner) return;
    const rect = new fabric.Rect({ left: 150, top: 150, fill: "#4361ee", width: 100, height: 100 });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
  };
  const addCircle = () => {
    if (!fabricCanvas || !isDesigner) return;
    const circle = new fabric.Circle({ left: 200, top: 200, fill: "#e63946", radius: 50 });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
  };
  const handleImportImage = async (e) => {
    if (!fabricCanvas || !isDesigner) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (f) => {
        try {
          const url = f.target.result;
          const imgRes = fabric.Image.fromURL(url, (img) => {
            if (img && !imgRes) {
              img.scaleToWidth(300);
              img.set({ left: 50, top: 50 });
              fabricCanvas.add(img);
              fabricCanvas.setActiveObject(img);
              fabricCanvas.renderAll();
            }
          });
          if (imgRes && typeof imgRes.then === "function") {
            const img = await imgRes;
            img.scaleToWidth(300);
            img.set({ left: 50, top: 50 });
            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
            fabricCanvas.renderAll();
          }
        } catch (err) { console.error("Erreur image:", err); }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  // Raccourci Supprimer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDesigner) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObj = fabricCanvas?.getActiveObject();
        if (activeObj && !activeObj.isEditing) fabricCanvas.remove(activeObj);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fabricCanvas, isDesigner]);

  return (
    <>
      <div className="editor-layout">
        <div className="editor-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Retour
          </button>
          <div style={{ fontWeight: "bold" }}>
            {designData?.maquette?.nom || "Sans nom"}
          </div>
          <div className="save-status">
            {saveStatus === "Sauvegarde..." && <Loader size={16} className="spin" />}
            {saveStatus}
          </div>
        </div>

        <div className="editor-body">
          {isDesigner && (
            <div className="editor-toolbar">
              <button className="tool-btn" onClick={addText}>
                <Type size={20} /> Texte
              </button>
              <button className="tool-btn" onClick={addRect}>
                <Square size={20} /> Rectangle
              </button>
              <button className="tool-btn" onClick={addCircle}>
                <Circle size={20} /> Cercle
              </button>
              <label className={`tool-btn ${!fabricCanvas ? "disabled" : ""}`}>
                <ImageIcon size={20} /> Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImportImage}
                  disabled={!fabricCanvas}
                />
              </label>
            </div>
          )}

          <div className="editor-canvas-container">
            {!designData ? (
              <Loader size={40} color="var(--primary-color)" className="spin" />
            ) : (
              <div ref={wrapperRef} className="canvas-shadow" style={{ width: 900, height: 600 }} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DesignEditor;