import { useState, useEffect, useContext, useRef } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader,
  PlusCircle,
  Send,
  Edit2,
  X,
  Image,
  ExternalLink,
} from "lucide-react";

// ── Charger Fabric.js depuis CDN une seule fois ──────────────
const loadFabric = () =>
  new Promise((resolve) => {
    if (window.fabric) return resolve(window.fabric);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";
    script.onload = () => resolve(window.fabric);
    document.head.appendChild(script);
  });

// ── Composant aperçu canvas (lecture seule) ──────────────────
const MaquetteCanvas = ({ maquette }) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [loadingCanvas, setLoadingCanvas] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setLoadingCanvas(true);
        setError("");

        const fabric = await loadFabric();

        // Récupérer la dernière version (contenu JSON Fabric)
        const { data: version } = await API.get(
          `/maquettes/${maquette._id}/latest-version`
        );

        if (!isMounted) return;

        // Détruire le canvas précédent si il existe
        if (fabricRef.current) {
          fabricRef.current.dispose();
          fabricRef.current = null;
        }

        // Créer le canvas Fabric en lecture seule
        const canvas = new fabric.Canvas(canvasRef.current, {
          width: 1200,
          height: 700,
          selection: false, // pas de sélection
          interactive: false, // pas d'interaction
          renderOnAddRemove: false,
        });
        fabricRef.current = canvas;

        // Désactiver tous les contrôles
        fabric.Object.prototype.selectable = false;
        fabric.Object.prototype.evented = false;
        fabric.Object.prototype.hasControls = false;
        fabric.Object.prototype.hasBorders = false;
        fabric.Object.prototype.lockMovementX = true;
        fabric.Object.prototype.lockMovementY = true;

        // Charger le fond si présent
        if (maquette.image_fond) {
          await new Promise((res) => {
            fabric.Image.fromURL(
              maquette.image_fond,
              (img) => {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                  scaleX: canvas.width / img.width,
                  scaleY: canvas.height / img.height,
                });
                res();
              },
              { crossOrigin: "anonymous" }
            );
          });
        }

        // Charger le contenu JSON de la version
        const contenu = version.contenu;
        if (contenu && contenu.objects?.length > 0) {
          await new Promise((res, rej) => {
            canvas.loadFromJSON(contenu, () => {
              // Désactiver l'interactivité sur chaque objet chargé
              canvas.getObjects().forEach((obj) => {
                obj.selectable = false;
                obj.evented = false;
                obj.hasControls = false;
                obj.hasBorders = false;
              });
              canvas.renderAll();
              res();
            });
          });
        } else {
          canvas.renderAll();
        }

        setLoadingCanvas(false);
      } catch (e) {
        console.error("Erreur chargement canvas", e);
        if (isMounted) {
          setError("Impossible de charger la maquette.");
          setLoadingCanvas(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [maquette._id]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {loadingCanvas && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#F8FAFC",
            borderRadius: 10,
            zIndex: 10,
            minHeight: 300,
          }}
        >
          <Loader size={32} color="#7C3AED" style={{ marginBottom: 12 }} />
          <span style={{ color: "#64748B", fontSize: 14 }}>
            Chargement de la maquette...
          </span>
        </div>
      )}

      {error ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            color: "#DC2626",
            gap: 8,
          }}
        >
          <AlertCircle size={32} />
          <span style={{ fontSize: 14 }}>{error}</span>
        </div>
      ) : (
        /* Conteneur scrollable pour le canvas */
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            overflowY: "auto",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            background: "#fff",
            maxHeight: "60vh",
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const ClientDashboard = () => {
  const { user } = useContext(AuthContext);

  const [projects, setProjects] = useState([]);
  const [maquettesMap, setMaquettesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [maquetteModal, setMaquetteModal] = useState({
    open: false,
    projet: null,
    maquette: null,
  });

  const [form, setForm] = useState({
    nom: "",
    description: "",
    date_début: "",
    date_fin: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // ── Charger projets + maquettes ─────────────────────────────
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/projets");
      const mesProjets = Array.isArray(data)
        ? data.filter(
            (p) => String(p.id_client?._id || p.id_client) === String(user?.id)
          )
        : [];
      setProjects(mesProjets);

      // Pour chaque projet, chercher sa maquette
      const entries = await Promise.all(
        mesProjets.map(async (p) => {
          try {
            const { data: res } = await API.get(`/maquettes/projet/${p._id}`);
            return [String(p._id), res.maquette]; // null si pas encore créée
          } catch {
            return [String(p._id), null];
          }
        })
      );
      setMaquettesMap(Object.fromEntries(entries));
    } catch (err) {
      console.error("Erreur projets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ── Demander un projet ──────────────────────────────────────
  const handleDemandeProjet = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.date_début || !form.date_fin) {
      setMsg({
        type: "error",
        text: "❌ Nom, date début et date fin sont obligatoires.",
      });
      return;
    }
    setSending(true);
    setMsg({ type: "", text: "" });
    try {
      await API.post("/projets/demande", {
        nom: form.nom,
        description: form.description,
        date_début: form.date_début,
        date_fin: form.date_fin,
      });
      setMsg({
        type: "success",
        text: "✅ Demande envoyée ! L'admin va la traiter.",
      });
      setForm({ nom: "", description: "", date_début: "", date_fin: "" });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      setMsg({
        type: "error",
        text: `❌ ${err.response?.data?.message || "Erreur envoi demande"}`,
      });
    } finally {
      setSending(false);
    }
  };

  // ── Modifier demande ────────────────────────────────────────
  const startEdit = (p) => {
    setEditingId(p._id);
    setEditForm({
      nom: p.nom,
      description: p.description || "",
      date_début: p.date_début?.slice(0, 10),
      date_fin: p.date_fin?.slice(0, 10),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.nom || !editForm.date_début || !editForm.date_fin) {
      setMsg({ type: "error", text: "❌ Champs obligatoires manquants." });
      return;
    }
    setSending(true);
    try {
      await API.put(`/projets/${editingId}`, editForm);
      setMsg({ type: "success", text: "✅ Demande modifiée." });
      setEditingId(null);
      fetchProjects();
    } catch (err) {
      setMsg({
        type: "error",
        text: `❌ ${err.response?.data?.message || "Erreur modification"}`,
      });
    } finally {
      setSending(false);
    }
  };

  // ── Annuler demande ─────────────────────────────────────────
  const handleAnnuler = async (p) => {
    if (!window.confirm(`Annuler la demande "${p.nom}" ?`)) return;
    try {
      await API.delete(`/projets/${p._id}`);
      setMsg({ type: "success", text: "✅ Demande annulée." });
      fetchProjects();
    } catch (err) {
      setMsg({
        type: "error",
        text: `❌ ${err.response?.data?.message || "Erreur annulation"}`,
      });
    }
  };

  // ── Logique maquette ────────────────────────────────────────
  const getMaquette = (p) => maquettesMap[String(p._id)] ?? null;
  const canViewMaquette = (p) =>
    p.statut !== "Refusé" && getMaquette(p) !== null;
  const getDisabledLabel = (p) =>
    p.statut === "Refusé" ? "🚫 Projet refusé" : "⏳ Non générée";

  const handleVoirMaquette = (p) => {
    if (!canViewMaquette(p)) return;
    setMaquetteModal({ open: true, projet: p, maquette: getMaquette(p) });
  };

  // ── Badge statut ────────────────────────────────────────────
  const getStatusBadge = (statut) => {
    const map = {
      "En cours": {
        color: "#2563EB",
        bg: "rgba(37,99,235,0.1)",
        icon: <Clock size={14} />,
      },
      "En révision": {
        color: "#D97706",
        bg: "rgba(217,119,6,0.1)",
        icon: <Clock size={14} />,
      },
      Validé: {
        color: "#059669",
        bg: "rgba(5,150,105,0.1)",
        icon: <CheckCircle size={14} />,
      },
      Refusé: {
        color: "#DC2626",
        bg: "rgba(220,38,38,0.1)",
        icon: <AlertCircle size={14} />,
      },
      Terminé: {
        color: "#7C3AED",
        bg: "rgba(124,58,237,0.1)",
        icon: <CheckCircle size={14} />,
      },
      "En attente": {
        color: "#D97706",
        bg: "rgba(217,119,6,0.1)",
        icon: <Clock size={14} />,
      },
    };
    return (
      map[statut] || {
        color: "#64748B",
        bg: "rgba(100,116,139,0.1)",
        icon: null,
      }
    );
  };

  const demandesEnAttente = projects.filter(
    (p) => p.demanded && p.statut === "En attente"
  );
  const projetsActifs = projects.filter(
    (p) => !p.demanded || p.statut !== "En attente"
  );

  return (
    <div>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Mes projets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <PlusCircle size={18} />
          {showForm ? "Annuler" : "Demander un projet"}
        </button>
      </div>

      {/* ── Message ── */}
      {msg.text && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 20,
            background: msg.type === "success" ? "#F0FDF4" : "#FEF2F2",
            color: msg.type === "success" ? "#059669" : "#DC2626",
            border: `1px solid ${
              msg.type === "success" ? "#BBF7D0" : "#FECACA"
            }`,
          }}
        >
          {msg.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {msg.text}
        </div>
      )}

      {/* ── Formulaire demande ── */}
      {showForm && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            borderLeft: "4px solid #2563EB",
            padding: 24,
          }}
        >
          <h3
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#1E2A4A",
            }}
          >
            <Send size={20} /> Demander un nouveau projet
          </h3>
          <form onSubmit={handleDemandeProjet}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Nom du projet *</label>
                <input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: Refonte de mon site web"
                  required
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Date de début souhaitée *</label>
                <input
                  type="date"
                  value={form.date_début}
                  onChange={(e) =>
                    setForm({ ...form, date_début: e.target.value })
                  }
                  required
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Date de livraison souhaitée *</label>
                <input
                  type="date"
                  value={form.date_fin}
                  onChange={(e) =>
                    setForm({ ...form, date_fin: e.target.value })
                  }
                  required
                  style={inp}
                />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Décrivez votre projet..."
                  rows={4}
                  style={{ ...inp, resize: "vertical" }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={sending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: sending ? "#93C5FD" : "#2563EB",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                cursor: sending ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {sending ? <Loader size={16} /> : <Send size={16} />}
              {sending ? "Envoi..." : "Envoyer la demande"}
            </button>
          </form>
        </div>
      )}

      {/* ── Stats ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          {
            label: "Projets actifs",
            count: projetsActifs.filter((p) => p.statut === "En cours").length,
            color: "#2563EB",
            bg: "rgba(37,99,235,0.1)",
            icon: <Briefcase size={22} />,
          },
          {
            label: "Demandes en attente",
            count: demandesEnAttente.length,
            color: "#D97706",
            bg: "rgba(217,119,6,0.1)",
            icon: <Clock size={22} />,
          },
          {
            label: "Terminés",
            count: projects.filter((p) => p.statut === "Terminé").length,
            color: "#059669",
            bg: "rgba(5,150,105,0.1)",
            icon: <CheckCircle size={22} />,
          },
          {
            label: "Total",
            count: projects.length,
            color: "#7C3AED",
            bg: "rgba(124,58,237,0.1)",
            icon: <FileText size={22} />,
          },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  background: s.bg,
                  borderRadius: 10,
                  padding: 10,
                  color: s.color,
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#64748B" }}>{s.label}</div>
                <div
                  style={{ fontSize: 26, fontWeight: 700, color: "#1E293B" }}
                >
                  {s.count}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Demandes en attente ── */}
      {demandesEnAttente.length > 0 && (
        <div
          className="card"
          style={{ marginBottom: 24, borderLeft: "4px solid #D97706" }}
        >
          <h3
            style={{
              marginBottom: 16,
              color: "#D97706",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={18} /> Demandes en attente ({demandesEnAttente.length})
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Date début</th>
                  <th>Date fin</th>
                  <th>Statut</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandesEnAttente.map((p) => (
                  <tr key={p._id}>
                    {editingId === p._id ? (
                      <td colSpan={5} style={{ padding: "16px 12px" }}>
                        <form onSubmit={handleEditSubmit}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr 1fr 1fr",
                              gap: 12,
                              marginBottom: 12,
                            }}
                          >
                            <div>
                              <label style={lbl}>Nom *</label>
                              <input
                                value={editForm.nom}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    nom: e.target.value,
                                  })
                                }
                                required
                                style={inp}
                              />
                            </div>
                            <div>
                              <label style={lbl}>Date début *</label>
                              <input
                                type="date"
                                value={editForm.date_début}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    date_début: e.target.value,
                                  })
                                }
                                required
                                style={inp}
                              />
                            </div>
                            <div>
                              <label style={lbl}>Date fin *</label>
                              <input
                                type="date"
                                value={editForm.date_fin}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    date_fin: e.target.value,
                                  })
                                }
                                required
                                style={inp}
                              />
                            </div>
                            <div>
                              <label style={lbl}>Description</label>
                              <input
                                value={editForm.description}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    description: e.target.value,
                                  })
                                }
                                style={inp}
                              />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="submit"
                              disabled={sending}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: sending ? "#93C5FD" : "#2563EB",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                padding: "8px 16px",
                                cursor: sending ? "not-allowed" : "pointer",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {sending ? (
                                <Loader size={14} />
                              ) : (
                                <CheckCircle size={14} />
                              )}
                              {sending ? "Sauvegarde..." : "Sauvegarder"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: "#F1F5F9",
                                color: "#64748B",
                                border: "1px solid #E2E8F0",
                                borderRadius: 8,
                                padding: "8px 16px",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              <X size={14} /> Annuler
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.nom}</div>
                          {p.description && (
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>
                              {p.description.slice(0, 60)}...
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: "#64748B" }}>
                          {new Date(p.date_début).toLocaleDateString("fr-FR")}
                        </td>
                        <td style={{ fontSize: 13, color: "#64748B" }}>
                          {new Date(p.date_fin).toLocaleDateString("fr-FR")}
                        </td>
                        <td>
                          <span
                            style={{
                              background: "rgba(217,119,6,0.1)",
                              color: "#D97706",
                              borderRadius: 20,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            ⏳ En attente admin
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 8,
                            }}
                          >
                            <button
                              onClick={() => startEdit(p)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "rgba(37,99,235,0.08)",
                                color: "#2563EB",
                                border: "1px solid rgba(37,99,235,0.2)",
                                borderRadius: 8,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              <Edit2 size={13} /> Modifier
                            </button>
                            <button
                              onClick={() => handleAnnuler(p)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "rgba(220,38,38,0.08)",
                                color: "#DC2626",
                                border: "1px solid rgba(220,38,38,0.2)",
                                borderRadius: 8,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              <X size={13} /> Annuler
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Projets actifs ── */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>
          Mes projets ({projetsActifs.length})
        </h3>
        {loading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Loader size={32} color="#2563EB" />
          </div>
        ) : projetsActifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
            <Briefcase size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>Aucun projet pour l'instant.</p>
            <p style={{ fontSize: 13 }}>
              Cliquez sur "Demander un projet" pour commencer.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Date début</th>
                  <th>Date fin</th>
                  <th>Statut</th>
                  <th style={{ textAlign: "center" }}>Maquette</th>
                </tr>
              </thead>
              <tbody>
                {projetsActifs.map((p) => {
                  const s = getStatusBadge(p.statut);
                  const canView = canViewMaquette(p);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <FileText size={16} color="#2563EB" />
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.nom}</div>
                            {p.description && (
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>
                                {p.description.slice(0, 50)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: "#64748B" }}>
                        {new Date(p.date_début).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={{ fontSize: 13, color: "#64748B" }}>
                        {new Date(p.date_fin).toLocaleDateString("fr-FR")}
                      </td>
                      <td>
                        <span
                          style={{
                            background: s.bg,
                            color: s.color,
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {s.icon} {p.statut}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <button
                            onClick={() => handleVoirMaquette(p)}
                            disabled={!canView}
                            title={!canView ? getDisabledLabel(p) : ""}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: canView
                                ? "rgba(124,58,237,0.08)"
                                : "rgba(100,116,139,0.06)",
                              color: canView ? "#7C3AED" : "#CBD5E1",
                              border: `1px solid ${
                                canView
                                  ? "rgba(124,58,237,0.25)"
                                  : "rgba(203,213,225,0.4)"
                              }`,
                              borderRadius: 8,
                              padding: "6px 14px",
                              cursor: canView ? "pointer" : "not-allowed",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            <Image size={14} />
                            Voir maquette
                            {canView && (
                              <ExternalLink
                                size={11}
                                style={{ opacity: 0.6 }}
                              />
                            )}
                          </button>
                          {!canView && (
                            <span style={{ fontSize: 11, color: "#94A3B8" }}>
                              {getDisabledLabel(p)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Maquette avec canvas Fabric.js ── */}
      {maquetteModal.open && maquetteModal.maquette && (
        <div
          onClick={() =>
            setMaquetteModal({ open: false, projet: null, maquette: null })
          }
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 16,
              width: "95%",
              maxWidth: 1100,
              maxHeight: "92vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid #F1F5F9",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    borderRadius: 8,
                    padding: 8,
                    color: "#7C3AED",
                  }}
                >
                  <Image size={18} />
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 16, color: "#1E293B" }}
                  >
                    {maquetteModal.maquette.nom}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>
                    Projet : {maquetteModal.projet?.nom} · Aperçu en lecture
                    seule
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <a
                  href={`/designer/maquettes/${maquetteModal.maquette._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#7C3AED",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <ExternalLink size={14} /> Ouvrir dans l'éditeur
                </a>
                <button
                  onClick={() =>
                    setMaquetteModal({
                      open: false,
                      projet: null,
                      maquette: null,
                    })
                  }
                  style={{
                    background: "#F1F5F9",
                    border: "none",
                    borderRadius: 8,
                    padding: 8,
                    cursor: "pointer",
                    color: "#64748B",
                    display: "flex",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Corps — canvas Fabric.js */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 24,
                background: "#F8FAFC",
              }}
            >
              {/* MaquetteCanvas charge la version et affiche le canvas complet */}
              <MaquetteCanvas maquette={maquetteModal.maquette} />
            </div>
          </div>
        </div>
      )}

      <style>{`button:not(:disabled):hover { opacity: 0.87; }`}</style>
    </div>
  );
};

const lbl = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};
const inp = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "white",
};

export default ClientDashboard;
