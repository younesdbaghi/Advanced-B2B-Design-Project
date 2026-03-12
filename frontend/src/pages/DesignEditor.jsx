import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import debounce from "lodash.debounce";
import API from "../api";
import {
  Type, Square, Circle, Image as ImageIcon,
  ArrowLeft, Loader, GitBranch, Plus, Check,
  ChevronDown, Clock, Eye,
} from "lucide-react";

const DesignEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const wrapperRef = useRef(null);
  const [fabricCanvas, setFabricCanvas]           = useState(null);
  const [designData, setDesignData]               = useState(null);
  const [saveStatus, setSaveStatus]               = useState("Chargement des données...");
  const [currentVersionNum, setCurrentVersionNum] = useState(null);
  const [creatingVersion, setCreatingVersion]     = useState(false);
  const [versionSuccess, setVersionSuccess]       = useState(false);

  const [versions, setVersions]             = useState([]);
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const dropdownRef = useRef(null);

  const maquetteIdRef       = useRef(null);
  const currentVersionIdRef = useRef(null);
  // 🔑 Flag pour bloquer l'auto-save pendant le chargement d'une version
  const isSwitchingVersion  = useRef(false);

  // Fermer dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1️⃣ RÉCUPÉRATION DES DONNÉES
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [resMaquette, resVersion] = await Promise.all([
          API.get(`/maquettes/${id}`),
          API.get(`/maquettes/${id}/latest-version`),
        ]);
        if (isMounted) {
          setDesignData({ maquette: resMaquette.data, version: resVersion.data });
          setCurrentVersionNum(resVersion.data.numéro_version);
          maquetteIdRef.current = resMaquette.data._id;
          currentVersionIdRef.current = resVersion.data._id;
        }
      } catch (err) {
        if (isMounted) setSaveStatus("Erreur de chargement des données");
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id]);

  // Charger la liste des versions
  const fetchVersions = async () => {
    if (!maquetteIdRef.current) return;
    try {
      const { data } = await API.get(`/versions/maquette/${maquetteIdRef.current}`);
      setVersions(data);
    } catch (err) {
      console.error("Erreur chargement versions", err);
    }
  };

  // 2️⃣ INITIALISATION DU CANVAS
  useEffect(() => {
    if (!designData || !wrapperRef.current) return;

    setSaveStatus("Initialisation de l'éditeur...");
    wrapperRef.current.innerHTML = "";
    const canvasElement = document.createElement("canvas");
    wrapperRef.current.appendChild(canvasElement);

    const canvas = new fabric.Canvas(canvasElement, {
      width: 900, height: 600,
      backgroundColor: "#f0f2f5",
      preserveObjectStacking: true,
    });
    setFabricCanvas(canvas);

    const { maquette, version } = designData;

    const loadCanvasContent = async () => {
      try {
        const hasObjects = version.contenu?.objects && version.contenu.objects.length > 0;
        const hasImageFond = !!maquette.image_fond;

        if (hasObjects) {
          const loadRes = canvas.loadFromJSON(version.contenu, () => {
            canvas.renderAll(); setSaveStatus("À jour");
          });
          if (loadRes && typeof loadRes.then === "function") {
            await loadRes; canvas.renderAll(); setSaveStatus("À jour");
          }
        } else if (hasImageFond) {
          const imgRes = fabric.Image.fromURL(maquette.image_fond,
            (img) => { if (img && !imgRes) { canvas.renderAll(); setSaveStatus("À jour"); } }
          );
          if (imgRes && typeof imgRes.then === "function") {
            await imgRes; canvas.renderAll(); setSaveStatus("À jour");
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
  }, [designData]);

  // 3️⃣ AUTO-SAVE — bloqué si isSwitchingVersion est true
  const triggerSave = async (canvasInstance, vId) => {
    // ⛔ Ne pas sauvegarder pendant le chargement d'une version
    if (isSwitchingVersion.current) return;
    if (!vId) return;
    setSaveStatus("Sauvegarde...");
    try {
      const json = canvasInstance.toJSON();
      await API.put(`/versions/${vId}`, { contenu: json });
      setSaveStatus("À jour ☁️");
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

    const handleChange = () => {
      if (isSwitchingVersion.current) return; // ⛔ ignorer les events pendant le switch
      debouncedSave(fabricCanvas, vId);
    };
    const handleRemove = () => {
      if (isSwitchingVersion.current) return; // ⛔
      debouncedSave.cancel();
      triggerSave(fabricCanvas, vId);
    };

    fabricCanvas.on("object:modified", handleChange);
    fabricCanvas.on("object:added",    handleChange);
    fabricCanvas.on("object:removed",  handleRemove);

    return () => {
      fabricCanvas.off("object:modified", handleChange);
      fabricCanvas.off("object:added",    handleChange);
      fabricCanvas.off("object:removed",  handleRemove);
    };
  }, [fabricCanvas, designData, debouncedSave]);

  // 4️⃣ CRÉER UNE NOUVELLE VERSION
  const handleNouvelleVersion = async () => {
    if (!fabricCanvas || !maquetteIdRef.current || creatingVersion) return;
    setCreatingVersion(true);
    try {
      const json = fabricCanvas.toJSON();
      const { data } = await API.post("/versions", {
        contenu: json,
        id_maquette: maquetteIdRef.current,
        commentaire: "Nouvelle version manuelle",
      });
      const newVersion = data.version;
      setCurrentVersionNum(newVersion.numéro_version);
      currentVersionIdRef.current = newVersion._id;
      setSaveStatus("À jour ☁️");
      setDesignData((prev) => ({ ...prev, version: newVersion }));
      setVersionSuccess(true);
      setTimeout(() => setVersionSuccess(false), 2000);
      await fetchVersions();
    } catch (err) {
      setSaveStatus("Erreur création version ❌");
    } finally {
      setCreatingVersion(false);
    }
  };

  // 5️⃣ CHARGER UNE VERSION PRÉCÉDENTE
  const handleLoadVersion = async (version) => {
    if (!fabricCanvas || loadingVersion) return;
    setDropdownOpen(false);
    setLoadingVersion(true);

    // 🔑 Bloquer l'auto-save AVANT de toucher au canvas
    isSwitchingVersion.current = true;
    debouncedSave.cancel(); // annuler tout save en attente

    try {
      const contenu = version.contenu;

      if (contenu?.objects?.length > 0) {
        const loadRes = fabricCanvas.loadFromJSON(contenu, () => {
          fabricCanvas.renderAll();
        });
        if (loadRes && typeof loadRes.then === "function") {
          await loadRes;
          fabricCanvas.renderAll();
        }
      } else {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#f0f2f5";
        fabricCanvas.renderAll();
      }

      setCurrentVersionNum(version.numéro_version);
      currentVersionIdRef.current = version._id;
      setDesignData((prev) => ({ ...prev, version }));
      setSaveStatus(`Version ${version.numéro_version} chargée`);
    } catch (err) {
      console.error("Erreur chargement version", err);
      setSaveStatus("Erreur chargement version ❌");
    } finally {
      setLoadingVersion(false);
      // ✅ Réactiver l'auto-save APRÈS que tout est stable
      setTimeout(() => { isSwitchingVersion.current = false; }, 300);
    }
  };

  const handleToggleDropdown = async () => {
    if (!dropdownOpen) await fetchVersions();
    setDropdownOpen((prev) => !prev);
  };

  // ─── OUTILS ────────────────────────────────────────────────
  const addText = () => {
    if (!fabricCanvas) return;
    fabricCanvas.add(new fabric.IText("Texte ici", { left: 100, top: 100, fill: "#333", fontSize: 24 }));
  };
  const addRect = () => {
    if (!fabricCanvas) return;
    fabricCanvas.add(new fabric.Rect({ left: 150, top: 150, fill: "#4361ee", width: 100, height: 100 }));
  };
  const addCircle = () => {
    if (!fabricCanvas) return;
    fabricCanvas.add(new fabric.Circle({ left: 200, top: 200, fill: "#e63946", radius: 50 }));
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
              img.scaleToWidth(300); img.set({ left: 50, top: 50 });
              fabricCanvas.add(img); fabricCanvas.setActiveObject(img); fabricCanvas.renderAll();
            }
          });
          if (imgRes && typeof imgRes.then === "function") {
            const img = await imgRes;
            img.scaleToWidth(300); img.set({ left: 50, top: 50 });
            fabricCanvas.add(img); fabricCanvas.setActiveObject(img); fabricCanvas.renderAll();
          }
        } catch (err) { console.error("Erreur image:", err); }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const obj = fabricCanvas?.getActiveObject();
        if (obj && !obj.isEditing) fabricCanvas.remove(obj);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fabricCanvas]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <>
      <div className="editor-layout">
        <div className="editor-header">
          <button className="btn-back" onClick={() => navigate("/designer")}>
            <ArrowLeft size={18} /> Retour
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: "bold", color: "#1E293B" }}>
              {designData?.maquette?.nom || "Sans nom"}
            </span>

            {/* Dropdown versions */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={handleToggleDropdown}
                disabled={!fabricCanvas}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: dropdownOpen ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.1)",
                  color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)",
                  borderRadius: 8, padding: "5px 12px",
                  cursor: !fabricCanvas ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 600, transition: "background 0.15s",
                  opacity: !fabricCanvas ? 0.5 : 1,
                }}
              >
                <GitBranch size={13} />
                v{currentVersionNum ?? "—"}
                <ChevronDown size={13} style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0,
                  background: "white", borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 260, zIndex: 9999, overflow: "hidden",
                }}>
                  <div style={{
                    padding: "10px 14px", borderBottom: "1px solid #F1F5F9",
                    fontSize: 11, fontWeight: 700, color: "#94A3B8",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Clock size={11} /> Historique des versions
                  </div>

                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {versions.length === 0 ? (
                      <div style={{ padding: "16px 14px", color: "#94A3B8", fontSize: 13, textAlign: "center" }}>
                        Aucune version
                      </div>
                    ) : (
                      versions.map((v) => {
                        const isCurrent = v.numéro_version === currentVersionNum;
                        return (
                          <button
                            key={v._id}
                            onClick={() => !isCurrent && handleLoadVersion(v)}
                            disabled={isCurrent || loadingVersion}
                            style={{
                              width: "100%", display: "flex", alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px", border: "none", textAlign: "left",
                              background: isCurrent ? "#F0F7FF" : "white",
                              cursor: isCurrent ? "default" : "pointer",
                              borderBottom: "1px solid #F8FAFC",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = "#F8FAFC"; }}
                            onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "white"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: 8,
                                background: isCurrent ? "rgba(37,99,235,0.12)" : "rgba(100,116,139,0.08)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: isCurrent ? "#2563EB" : "#94A3B8", flexShrink: 0,
                              }}>
                                <GitBranch size={14} />
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? "#2563EB" : "#1E293B" }}>
                                  Version {v.numéro_version}
                                  {isCurrent && (
                                    <span style={{
                                      marginLeft: 6, fontSize: 10, background: "#2563EB",
                                      color: "white", borderRadius: 10, padding: "1px 6px",
                                    }}>
                                      actuelle
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                                  {formatDate(v.date_creation)}
                                </div>
                              </div>
                            </div>
                            {!isCurrent && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                                <Eye size={12} /> Charger
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bouton + Nouvelle version */}
            <button
              onClick={handleNouvelleVersion}
              disabled={!fabricCanvas || creatingVersion}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: versionSuccess ? "#059669" : "#2563EB",
                color: "white", border: "none", borderRadius: 8,
                padding: "6px 14px",
                cursor: (!fabricCanvas || creatingVersion) ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600,
                opacity: (!fabricCanvas || creatingVersion) ? 0.6 : 1,
                transition: "background 0.3s",
              }}
            >
              {creatingVersion ? <Loader size={14} className="spin" /> : versionSuccess ? <Check size={14} /> : <Plus size={14} />}
              {creatingVersion ? "Création..." : versionSuccess ? "Créée !" : "Nouvelle version"}
            </button>
          </div>

          <div className="save-status">
            {(saveStatus === "Sauvegarde..." || loadingVersion) && <Loader size={16} className="spin" />}
            {loadingVersion ? "Chargement..." : saveStatus}
          </div>
        </div>

        <div className="editor-body">
          <div className="editor-toolbar">
            <button className="tool-btn" onClick={addText} disabled={!fabricCanvas}><Type size={20} /> Texte</button>
            <button className="tool-btn" onClick={addRect} disabled={!fabricCanvas}><Square size={20} /> Rectangle</button>
            <button className="tool-btn" onClick={addCircle} disabled={!fabricCanvas}><Circle size={20} /> Cercle</button>
            <label className={`tool-btn ${!fabricCanvas ? "disabled" : ""}`}>
              <ImageIcon size={20} /> Image
              <input type="file" accept="image/*" hidden onChange={handleImportImage} disabled={!fabricCanvas} />
            </label>
          </div>

          <div className="editor-canvas-container">
            {!designData ? (
              <Loader size={40} color="var(--primary-color)" className="spin" />
            ) : (
              <div ref={wrapperRef} className="canvas-shadow" style={{ width: 900, height: 600 }} />
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
