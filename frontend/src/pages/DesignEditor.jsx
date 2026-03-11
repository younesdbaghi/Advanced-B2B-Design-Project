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

  // 1️⃣ RÉCUPÉRATION DES DONNÉES DEPUIS LE BACKEND
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

  // 2️⃣ INITIALISATION DU CANVAS
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
        const hasObjects =
          version.contenu?.objects && version.contenu.objects.length > 0;
        const hasImageFond = !!maquette.image_fond;

        // ── Cas 1 : le canvas a déjà des objets sauvegardés → on les charge
        if (hasObjects) {
          const loadRes = canvas.loadFromJSON(version.contenu, () => {
            canvas.renderAll();
            setSaveStatus("À jour");
          });
          if (loadRes && typeof loadRes.then === "function") {
            await loadRes;
            canvas.renderAll();
            setSaveStatus("À jour");
          }
        }

        else if (hasImageFond) {
          const handleImg = async (img) => {
            canvas.renderAll();
            setSaveStatus("À jour");
          };

          const imgRes = fabric.Image.fromURL(
            maquette.image_fond,
            (img) => { if (img && !imgRes) handleImg(img); } // Fabric v5
          );
          if (imgRes && typeof imgRes.then === "function") {
            const img = await imgRes;
            await handleImg(img); // Fabric v6
          }
        }

        // ── Cas 3 : canvas vide, pas d'image → canvas blanc
        else {
          setSaveStatus("À jour");
        }
      } catch (error) {
        console.error("Erreur d'affichage", error);
        setSaveStatus("Erreur d'affichage");
      }
    };

    loadCanvasContent();

    return () => { canvas.dispose(); };
  }, [designData]);

  // 3️⃣ SAUVEGARDE AUTOMATIQUE
  const triggerSave = async (canvasInstance, vId) => {
    if (!vId) return;
    setSaveStatus("Sauvegarde...");
    try {
      const json = canvasInstance.toJSON();
      await API.put(`/versions/${vId}`, { contenu: json });
      setSaveStatus("Sauvegardé ☁️");
    } catch (err) {
      setSaveStatus("Erreur ❌");
    }
  };

  const debouncedSave = useRef(
    debounce((c, v) => triggerSave(c, v), 500)
  ).current;

  useEffect(() => {
    if (!fabricCanvas || !designData?.version?._id) return;
    const vId = designData.version._id;
    const handleChange = () => debouncedSave(fabricCanvas, vId);

    // ✅ Sauvegarde immédiate à la suppression — pas de debounce
    // Sans ça, un rechargement rapide après suppression restaure l'image
    // car le debounce n'a pas encore eu le temps d'envoyer la requête
    const handleRemove = () => {
      debouncedSave.cancel();
      triggerSave(fabricCanvas, vId);
    };

    fabricCanvas.on("object:modified", handleChange);
    fabricCanvas.on("object:added",    handleChange);
    fabricCanvas.on("object:removed",  handleRemove); // ← était handleChange

    return () => {
      fabricCanvas.off("object:modified", handleChange);
      fabricCanvas.off("object:added",    handleChange);
      fabricCanvas.off("object:removed",  handleRemove);
    };
  }, [fabricCanvas, designData, debouncedSave]);

  // ─── OUTILS D'ÉDITION ──────────────────────────────────────────────────────
  const addText = () => {
    if (!fabricCanvas) return;
    const text = new fabric.IText("Texte ici", {
      left: 100, top: 100, fill: "#333", fontSize: 24,
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
  };

  const addRect = () => {
    if (!fabricCanvas) return;
    const rect = new fabric.Rect({
      left: 150, top: 150, fill: "#4361ee", width: 100, height: 100,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    const circle = new fabric.Circle({
      left: 200, top: 200, fill: "#e63946", radius: 50,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
  };

  const handleImportImage = async (e) => {
    if (!fabricCanvas) return;
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
        } catch (err) {
          console.error("Erreur image:", err);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  // Raccourci Supprimer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObj = fabricCanvas?.getActiveObject();
        if (activeObj && !activeObj.isEditing) fabricCanvas.remove(activeObj);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fabricCanvas]);

  return (
    <>
      <div className="editor-layout">
        <div className="editor-header">
          <button className="btn-back" onClick={() => navigate("/designer")}>
            <ArrowLeft size={18} /> Retour
          </button>
          <div style={{ fontWeight: "bold" }}>
            {designData?.maquette?.nom || "Sans nom"}
          </div>
          <div className="save-status">
            {saveStatus === "Sauvegarde..." && (
              <Loader size={16} className="spin" />
            )}
            {saveStatus}
          </div>
        </div>

        <div className="editor-body">
          <div className="editor-toolbar">
            <button className="tool-btn" onClick={addText} disabled={!fabricCanvas}>
              <Type size={20} /> Texte
            </button>
            <button className="tool-btn" onClick={addRect} disabled={!fabricCanvas}>
              <Square size={20} /> Rectangle
            </button>
            <button className="tool-btn" onClick={addCircle} disabled={!fabricCanvas}>
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

          <div className="editor-canvas-container">
            {!designData ? (
              <Loader size={40} color="var(--primary-color)" className="spin" />
            ) : (
              <div
                ref={wrapperRef}
                className="canvas-shadow"
                style={{ width: 900, height: 600 }}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        .editor-layout {
          display: flex; flex-direction: column; height: 100vh;
          background: #eef2f6; position: fixed; top: 0; left: 0; right: 0; z-index: 2000;
        }
        .editor-header {
          height: 60px; background: white;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .btn-back {
          display: flex; gap: 8px; align-items: center;
          background: none; border: none; font-weight: 600; cursor: pointer; color: #555;
        }
        .save-status {
          display: flex; align-items: center; gap: 8px;
          color: #666; font-size: 14px; min-width: 150px; justify-content: flex-end;
        }
        .editor-body { display: flex; flex: 1; overflow: hidden; }
        .editor-toolbar {
          width: 80px; background: white;
          display: flex; flex-direction: column; align-items: center;
          padding: 20px 0; gap: 15px; border-right: 1px solid #ddd; overflow-y: auto;
        }
        .tool-btn {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          background: none; border: none; font-size: 11px; font-weight: 600;
          color: #555; cursor: pointer; padding: 10px; border-radius: 8px;
          width: 60px; transition: 0.2s;
        }
        .tool-btn:hover:not(:disabled) { background: #f0f4ff; color: var(--primary-color); }
        .tool-btn:disabled, .tool-btn.disabled { opacity: 0.5; cursor: not-allowed; }
        .editor-canvas-container {
          flex: 1; display: flex; align-items: center; justify-content: center;
          overflow: auto; padding: 20px;
        }
        .canvas-shadow {
          box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
          border-radius: 4px; overflow: hidden; background: white;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default DesignEditor;