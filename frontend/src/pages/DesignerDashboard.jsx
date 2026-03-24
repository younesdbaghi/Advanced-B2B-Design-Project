import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Palette, Calendar, CheckCircle, Clock, XCircle, Eye,
  BellRing, Bell, Plus, X, Upload, Loader, Image as ImageIcon,
  Edit3, Trash2, Notebook, LayoutGrid, List
} from "lucide-react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

const DesignerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // --- Maquettes ---
  const [maquettes, setMaquettes] = useState([]);
  const [projets, setProjets] = useState([]);
  const [loadingMaquettes, setLoadingMaquettes] = useState(true);

  // --- Affectations ---
  const [affectations, setAffectations] = useState([]);
  const [loadingAff, setLoadingAff] = useState(true);
  const [marking, setMarking] = useState(null);

  // --- UI ---
  const [activeTab, setActiveTab] = useState("overview"); // overview | designs | projets
  const [viewMode, setViewMode] = useState("grid");

  // --- Modals ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nom: "", description: "", id_projet: "", image_fond: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ _id: "", nom: "", description: "", id_projet: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [resMaq, resPrj, resAff] = await Promise.all([
        API.get("/maquettes"),
        API.get("/projets"),
        API.get("/affectations/mes-projets"),
      ]);
      setMaquettes(resMaq.data);
      setProjets(resPrj.data);
      setAffectations(Array.isArray(resAff.data) ? resAff.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMaquettes(false);
      setLoadingAff(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Maquettes actions ────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image_fond: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const startDesign = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await API.post("/maquettes", formData);
      navigate(`/designer/editeur/${res.data.maquette._id}`);
    } catch {
      alert("Erreur lors de la création.");
      setIsCreating(false);
    }
  };

  const openEditModal = (maq) => {
    setEditData({ _id: maq._id, nom: maq.nom, description: maq.description || "", id_projet: maq.id_projet?._id || "" });
    setIsEditModalOpen(true);
  };

  const updateInfo = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await API.put(`/maquettes/${editData._id}`, editData);
      setMaquettes(maquettes.map(m => m._id === editData._id ? res.data : m));
      setIsEditModalOpen(false);
    } catch { alert("Erreur lors de la modification."); }
    finally { setIsUpdating(false); }
  };

  const deleteMaquette = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce design ?")) {
      try {
        await API.delete(`/maquettes/${id}`);
        setMaquettes(maquettes.filter(m => m._id !== id));
      } catch { alert("Erreur lors de la suppression."); }
    }
  };

  // ─── Affectations actions ─────────────────────────────────────────────────────
  const handleMarquerLu = async (affectationId) => {
    setMarking(affectationId);
    try {
      await API.patch(`/affectations/${affectationId}/lire`);
      setAffectations(prev => prev.map(a => a._id === affectationId ? { ...a, lu: true } : a));
    } catch (e) { console.error(e); }
    finally { setMarking(null); }
  };

  // ─── Computed stats ───────────────────────────────────────────────────────────
  const affProjets = affectations.map(a => a.id_projet).filter(Boolean);
  const nonLus = affectations.filter(a => !a.lu).length;
  const enCours = affProjets.filter(p => p?.statut === "En cours").length;
  const termines = affProjets.filter(p => p?.statut === "Terminé").length;

  const stats = [
    { label: "Designs créés", value: maquettes.length, color: "#6366F1", bg: "rgba(99,102,241,0.1)", icon: <Palette size={20} color="#6366F1" /> },
    { label: "Projets assignés", value: affectations.length, color: "#0EA5E9", bg: "rgba(14,165,233,0.1)", icon: <LayoutGrid size={20} color="#0EA5E9" /> },
    { label: "Non lus", value: nonLus, color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: <BellRing size={20} color="#F59E0B" /> },
    { label: "En cours", value: enCours, color: "#10B981", bg: "rgba(16,185,129,0.1)", icon: <Clock size={20} color="#10B981" /> },
    { label: "Terminés", value: termines, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", icon: <CheckCircle size={20} color="#8B5CF6" /> },
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const getStatutBadge = (statut) => {
    const map = {
      "En cours": { color: "#2563EB", bg: "rgba(37,99,235,0.1)", icon: <Clock size={11} /> },
      "En révision": { color: "#D97706", bg: "rgba(217,119,6,0.1)", icon: <Eye size={11} /> },
      "Validé": { color: "#059669", bg: "rgba(5,150,105,0.1)", icon: <CheckCircle size={11} /> },
      "Refusé": { color: "#DC2626", bg: "rgba(220,38,38,0.1)", icon: <XCircle size={11} /> },
      "Terminé": { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: <CheckCircle size={11} /> },
    };
    return map[statut] || { color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: null };
  };


  const getUrgencyColor = (dateFin) => {
    if (!dateFin) return "#64748B";
    const diff = Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "#DC2626";
    if (diff <= 3) return "#DC2626";
    if (diff <= 7) return "#D97706";
    return "#059669";
  };

  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "designs", label: `Mes Designs (${maquettes.length})` },
    { id: "projets", label: `Mes Projets (${affectations.length})` },
  ];
  let users = JSON.parse(localStorage.getItem("user"))
  console.log(users)
  console.log("ffectation", affectations)
  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <p className="db-greeting">Bonjour,</p>
          <h1 className="db-name">{user?.nom || "Designer"} 👋</h1>
        </div>
        <button className="btn-create" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nouveau Design
        </button>
      </div>

      {/* ── Notification Banner ── */}
      {nonLus > 0 && (
        <div className="banner-notif">
          <BellRing size={16} color="#92400E" />
          <span>Vous avez <strong>{nonLus}</strong> nouvelle{nonLus > 1 ? "s" : ""} assignation{nonLus > 1 ? "s" : ""} non lue{nonLus > 1 ? "s" : ""}.</span>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ "--accent": s.color, "--accent-bg": s.bg }}>
            <div className="stat-icon">{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: OVERVIEW ══════════════ */}
      {activeTab === "overview" && (
        <div className="overview-grid">
          {/* Recent Designs */}
          <div className="panel">
            <div className="panel-head">
              <h2>Designs récents</h2>
              <button className="link-btn" onClick={() => setActiveTab("designs")}>Voir tout →</button>
            </div>
            {loadingMaquettes
              ? <Spinner />
              : maquettes.length === 0
                ? <Empty icon={<Palette size={28} color="#6366F1" />} text="Aucun design créé." />
                : (
                  <div className="recent-list">
                    {maquettes.slice(0, 4).map(maq => (
                      <div key={maq._id} className="recent-item" onClick={() => navigate(`/designer/editeur/${maq._id}`)}>
                        <div className="recent-thumb">
                          {maq.image_fond
                            ? <img src={maq.image_fond} alt="thumb" />
                            : <ImageIcon size={20} color="#ccc" />
                          }
                        </div>
                        <div>
                          <div className="recent-title">{maq.nom}</div>
                          <div className="recent-sub">{maq.id_projet?.nom || "Sans projet"}</div>
                        </div>
                        <Eye size={15} color="#94A3B8" style={{ marginLeft: "auto" }} />
                      </div>
                    ))}
                  </div>
                )
            }
          </div>

          {/* Recent Projets */}
          <div className="panel">
            <div className="panel-head">
              <h2>Projets récents</h2>
              <button className="link-btn" onClick={() => setActiveTab("projets")}>Voir tout →</button>
            </div>
            {loadingAff
              ? <Spinner />
              : affectations.length === 0
                ? <Empty icon={<LayoutGrid size={28} color="#0EA5E9" />} text="Aucun projet assigné." />
                : (
                  <div className="recent-list">
                    {affectations.slice(0, 4).map(a => {
                      const p = a.id_projet;
                      const sc = getStatutBadge(p?.statut);
                      return (
                        <div key={a._id} className="recent-item">
                          <div className="avatar">{p?.id_client?.nom?.charAt(0) || "?"}</div>
                          <div>
                            <div className="recent-title">{p?.nom || "—"}</div>
                            <div className="recent-sub">{p?.id_client?.nom || "—"}</div>
                          </div>
                          <span className="badge" style={{ color: sc.color, background: sc.bg, marginLeft: "auto" }}>
                            {sc.icon} {p?.statut}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
            }
          </div>
        </div>
      )}

      {/* ══════════════ TAB: DESIGNS ══════════════ */}
      {activeTab === "designs" && (
        <div>
          <div className="section-bar">
            <h2 className="section-title">Mes Designs</h2>
            <div className="view-toggle">
              <button className={viewMode === "grid" ? "vt-active" : ""} onClick={() => setViewMode("grid")}><LayoutGrid size={16} /></button>
              <button className={viewMode === "list" ? "vt-active" : ""} onClick={() => setViewMode("list")}><List size={16} /></button>
            </div>
          </div>

          {loadingMaquettes
            ? <Spinner />
            : maquettes.length === 0
              ? <Empty icon={<Palette size={40} color="#6366F1" />} text="Aucun design pour le moment." sub="Créez votre premier design avec le bouton + ci-dessus." />
              : viewMode === "grid"
                ? (
                  <div className="maq-grid">
                    {maquettes.map(maq => (
                      <div key={maq._id} className="maq-card">
                        <div className="maq-thumb" onClick={() => navigate(`/designer/editeur/${maq._id}`)}>
                          {maq.image_fond
                            ? <img src={maq.image_fond} alt="Miniature" />
                            : <div className="no-img"><ImageIcon size={36} color="#ccc" /></div>
                          }
                          <div className="maq-overlay"><Eye size={20} color="white" /></div>
                        </div>
                        <div className="maq-info">
                          <div>
                            <div className="maq-name">{maq.nom}</div>
                            <div className="maq-proj">{maq.id_projet?.nom || "Sans projet"}</div>
                          </div>
                          <div className="maq-actions">
                            <button className="icon-btn eye-c" onClick={() => navigate(`/designer/editeur/${maq._id}`)} title="Voir"><Eye size={15} /></button>
                            <button className="icon-btn edit-c" onClick={() => openEditModal(maq)} title="Modifier"><Edit3 size={15} /></button>
                            <button className="icon-btn del-c" onClick={() => deleteMaquette(maq._id)} title="Supprimer"><Trash2 size={15} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
                : (
                  <div className="panel">
                    <table className="data-table">
                      <thead><tr><th>Design</th><th>Projet</th><th>Actions</th></tr></thead>
                      <tbody>
                        {maquettes.map(maq => (
                          <tr key={maq._id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f0f2f5", flexShrink: 0 }}>
                                  {maq.image_fond ? <img src={maq.image_fond} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><ImageIcon size={18} color="#ccc" /></div>}
                                </div>
                                <span style={{ fontWeight: 600 }}>{maq.nom}</span>
                              </div>
                            </td>
                            <td><span className="badge" style={{ color: "#6366F1", background: "rgba(99,102,241,0.1)" }}>{maq.id_projet?.nom || "Sans projet"}</span></td>
                            <td>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button className="icon-btn eye-c" onClick={() => navigate(`/designer/editeur/${maq._id}`)}><Eye size={15} /></button>
                                <button className="icon-btn edit-c" onClick={() => openEditModal(maq)}><Edit3 size={15} /></button>
                                <button className="icon-btn del-c" onClick={() => deleteMaquette(maq._id)}><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
          }

          {/* Journal rapide */}
          {maquettes.length > 0 && (
            <div className="journal-cta" onClick={() => navigate("/rapport")}>
              <div className="journal-icon"><Notebook size={22} color="#6366F1" /></div>
              <div>
                <div className="journal-title">Journal quotidien</div>
                <div className="journal-sub">Créer un journal quotidien de vos activités</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#6366F1", fontSize: 20 }}>→</span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: PROJETS ══════════════ */}
      {activeTab === "projets" && (
        <div className="panel">
          {loadingAff
            ? <Spinner />
            : affectations.length === 0
              ? <Empty icon={<LayoutGrid size={40} color="#0EA5E9" />} text="Aucun projet assigné." sub="L'administrateur vous assignera bientôt à un projet." />
              : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Projet</th>
                        <th>Client</th>
                        <th>Date fin</th>
                        <th>Statut</th>
                        <th>Assigné le</th>
                        <th style={{ textAlign: "center" }}>Lu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {console.log("Affectations:", affectations)}
                      {affectations.map(a => {
                        const p = a.id_projet;
                        const sc = getStatutBadge(p?.statut);
                        const uc = getUrgencyColor(p?.date_fin);
                        const isNew = !a.lu;
                        return (
                          <tr key={a._id} style={{ background: isNew ? "rgba(245,158,11,0.04)" : "" }}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {isNew && <div className="dot-notif" />}
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p?.nom || "—"}</div>
                                  {p?.description && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{p.description.slice(0, 55)}…</div>}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div className="avatar">{p?.id_client?.nom?.charAt(0) || "?"}</div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.id_client?.nom || "—"}</div>
                                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{p?.id_client?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {p?.date_fin
                                ? <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: uc }}>
                                  <Calendar size={12} />{new Date(p.date_fin).toLocaleDateString("fr-FR")}
                                </span>
                                : "—"}
                            </td>
                            <td>
                              <span className="badge" style={{ color: sc.color, background: sc.bg }}>
                                {sc.icon}{p?.statut || "—"}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: "#64748B" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <Calendar size={11} />{new Date(a.date_affectation).toLocaleDateString("fr-FR")}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {a.lu
                                ? <span className="badge" style={{ color: "#059669", background: "rgba(5,150,105,0.1)" }}><CheckCircle size={11} /> Lu</span>
                                : (
                                  <button
                                    className="btn-mark-lu"
                                    onClick={() => handleMarquerLu(a._id)}
                                    disabled={marking === a._id}
                                    style={{ opacity: marking === a._id ? 0.7 : 1 }}
                                  >
                                    <Bell size={12} /> {marking === a._id ? "…" : "Marquer lu"}
                                  </button>
                                )
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
          }
        </div>
      )}

      {/* ══════════════ MODAL: CRÉATION ══════════════ */}
      {isModalOpen && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>Nouveau Design</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={startDesign} className="modal-form">
              <input type="text" placeholder="Nom du design *" required className="inp" onChange={e => setFormData({ ...formData, nom: e.target.value })} />
              <select required className="inp" onChange={e => setFormData({ ...formData, id_projet: e.target.value })}>
                <option value="">— Assigner à un projet —</option>
                {affectations.filter(p => p.id_designer === users.id).map(p => <option key={p._id} value={p._id}>{p.id_projet.nom}</option>)}
              </select>
              <label className="upload-zone">
                <Upload size={22} color="#6366F1" />
                <span>{formData.image_fond ? "Image prête ✅" : "Importer une image de fond"}</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
              <button type="submit" className="btn-submit" disabled={isCreating}>
                {isCreating ? <><Loader size={16} className="spin" /> Chargement…</> : "Commencer 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: MODIFICATION ══════════════ */}
      {isEditModalOpen && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>Modifier les informations</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={updateInfo} className="modal-form">
              <input type="text" value={editData.nom} required className="inp" onChange={e => setEditData({ ...editData, nom: e.target.value })} />
              <textarea value={editData.description} placeholder="Description" className="inp" rows={3} onChange={e => setEditData({ ...editData, description: e.target.value })} />
              <select value={editData.id_projet} required className="inp" onChange={e => setEditData({ ...editData, id_projet: e.target.value })}>
                <option value="">— Assigner à un projet —</option>
                {projets.map(p => <option key={p._id} value={p._id}>{p.nom}</option>)}
              </select>
              <button type="submit" className="btn-submit" disabled={isUpdating}>
                {isUpdating ? <><Loader size={16} className="spin" /> Sauvegarde…</> : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ STYLES ══════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .db-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 24px 60px;
          color: #1E293B;
          min-height: 100vh;
        }

        /* ── Header ── */
        .db-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
        }
        .db-greeting { font-size: 13px; color: #94A3B8; font-weight: 500; margin: 0 0 2px; }
        .db-name     { font-size: 26px; font-weight: 800; margin: 0; color: #0F172A; }

        .btn-create {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white; border: none; border-radius: 12px;
          padding: 11px 22px; font-weight: 700; font-size: 14px;
          cursor: pointer; box-shadow: 0 4px 15px rgba(99,102,241,0.4);
          transition: all .2s; white-space: nowrap;
        }
        .btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.45); }

        /* ── Banner ── */
        .banner-notif {
          display: flex; align-items: center; gap: 10px;
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3);
          border-radius: 12px; padding: 12px 18px; margin-bottom: 24px;
          font-size: 13px; color: #92400E; font-weight: 600;
        }

        /* ── Stats ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: white; border-radius: 16px;
          padding: 18px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05); border: 1px solid #F1F5F9;
          transition: transform .2s;
        }
        .stat-card:hover { transform: translateY(-3px); }
        .stat-icon {
          width: 46px; height: 46px; border-radius: 12px;
          background: var(--accent-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .stat-value { font-size: 26px; font-weight: 800; color: var(--accent); }
        .stat-label { font-size: 11px; color: #94A3B8; font-weight: 600; margin-top: 1px; }

        /* ── Tabs ── */
        .tabs { display: flex; gap: 4px; background: white; padding: 5px; border-radius: 14px; border: 1px solid #E2E8F0; margin-bottom: 24px; width: fit-content; }
        .tab-btn {
          padding: 9px 20px; border: none; border-radius: 10px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          background: none; color: #64748B; transition: all .2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .tab-btn.active { background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; box-shadow: 0 3px 10px rgba(99,102,241,0.35); }
        .tab-btn:hover:not(.active) { background: none; color: #374151; }

        /* ── Panels ── */
        .panel { background: white; border-radius: 16px; padding: 22px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); border: 1px solid #F1F5F9; margin-bottom: 20px; }
        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .panel-head h2 { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0; }
        .link-btn { background: none; border: none; color: #6366F1; font-weight: 600; font-size: 13px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; }

        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 700px) { .overview-grid { grid-template-columns: 1fr; } }

        /* ── Recent list ── */
        .recent-list { display: flex; flex-direction: column; gap: 10px; }
        .recent-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px; border: 1px solid #F1F5F9;
          cursor: pointer; transition: background .15s;
        }
        .recent-item:hover { background: none; }
        .recent-thumb {
          width: 42px; height: 42px; border-radius: 8px;
          background: #f0f2f5; overflow: hidden; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .recent-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .recent-title { font-size: 13px; font-weight: 700; color: #1E293B; }
        .recent-sub   { font-size: 11px; color: #94A3B8; margin-top: 1px; }

        /* ── Avatar ── */
        .avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; flex-shrink: 0;
        }

        /* ── Badge ── */
        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          border-radius: 20px; padding: 4px 11px;
          font-size: 11px; font-weight: 700;
        }

        /* ── Section bar ── */
        .section-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .section-title { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0; }
        .view-toggle { display: flex; gap: 4px; background: white; border-radius: 10px; padding: 4px; border: 1px solid #E2E8F0; }
        .view-toggle button { border: none; background: none; padding: 6px 8px; border-radius: 8px; cursor: pointer; color: #94A3B8; display: flex; }
        .view-toggle .vt-active { background: #6366F1; color: white; }

        /* ── Maquette Grid ── */
        .maq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin-bottom: 20px; }
        .maq-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #F1F5F9; transition: all .25s; }
        .maq-card:hover { transform: translateY(-5px); box-shadow: 0 10px 28px rgba(0,0,0,0.1); }
        .maq-thumb {
          height: 165px; background: #f0f2f5; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; position: relative;
        }
        .maq-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .no-img { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .maq-overlay {
          position: absolute; inset: 0; background: rgba(99,102,241,0.55);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity .2s;
        }
        .maq-thumb:hover .maq-overlay { opacity: 1; }
        .maq-info { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
        .maq-name  { font-size: 14px; font-weight: 700; color: #1E293B; }
        .maq-proj  { font-size: 11px; color: #94A3B8; margin-top: 2px; }
        .maq-actions { display: flex; gap: 6px; }

        /* ── Icon buttons ── */
        .icon-btn { border: none; cursor: pointer; padding: 7px; border-radius: 8px; transition: all .18s; display: flex; align-items: center; }
        .eye-c  { color: #2a9d8f; background: rgba(42,157,143,0.1); }
        .edit-c { color: #6366F1;  background: rgba(99,102,241,0.1); }
        .del-c  { color: #e63946;  background: rgba(230,57,70,0.1); }
        .icon-btn:hover { filter: brightness(1.1); transform: scale(1.08); }

        /* ── Table ── */
        .table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { text-align: left; padding: 10px 14px; color: #94A3B8; font-weight: 700; font-size: 11px; border-bottom: 1px solid #F1F5F9; text-transform: uppercase; letter-spacing: .05em; }
        .data-table td { padding: 13px 14px; border-bottom: 1px solid none; color: #374151; vertical-align: middle; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover td { background: none; }

        /* ── Dot notif ── */
        .dot-notif { width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; flex-shrink: 0; }

        /* ── Mark lu button ── */
        .btn-mark-lu {
          display: inline-flex; align-items: center; gap: 5px;
          background: #F59E0B; color: white; border: none;
          border-radius: 20px; padding: 5px 14px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all .2s;
        }
        .btn-mark-lu:hover { background: #D97706; }
        .btn-mark-lu:disabled { cursor: not-allowed; }

        /* ── Journal CTA ── */
        .journal-cta {
          display: flex; align-items: center; gap: 14px;
          background: white; border: 1px dashed #C7D2FE; border-radius: 14px;
          padding: 18px 20px; cursor: pointer; transition: all .2s; margin-top: 4px;
        }
        .journal-cta:hover { background: rgba(99,102,241,0.04); border-color: #6366F1; }
        .journal-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .journal-title { font-size: 14px; font-weight: 700; color: #1E293B; }
        .journal-sub   { font-size: 12px; color: #94A3B8; margin-top: 2px; }

        /* ── Modal ── */
        .overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.6);
          backdrop-filter: blur(6px); display: flex; align-items: center;
          justify-content: center; z-index: 1000; padding: 20px;
        }
        .modal {
          background: white; border-radius: 20px; width: 100%; max-width: 440px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.2); animation: popIn .25s ease;
        }
        @keyframes popIn { from { transform: scale(.94) translateY(12px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .modal-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 22px 24px 0;
        }
        .modal-head h3 { font-size: 17px; font-weight: 800; margin: 0; color: #0F172A; }
        .modal-close {
          border: none; background: #F1F5F9; border-radius: 8px; padding: 7px;
          cursor: pointer; color: #64748B; display: flex; transition: background .15s;
        }
        .modal-close:hover { background: #E2E8F0; }
        .modal-form {
          display: flex; flex-direction: column; gap: 13px;
          padding: 20px 24px 24px;
        }
        .inp {
          width: 100%; padding: 12px 14px; border: 1.5px solid #E2E8F0;
          border-radius: 10px; font-size: 14px; color: #1E293B;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: border-color .2s; outline: none; box-sizing: border-box;
          resize: none;
        }
        .inp:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .upload-zone {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          border: 2px dashed #C7D2FE; border-radius: 12px; padding: 22px 16px;
          background: rgba(99,102,241,0.03); cursor: pointer;
          transition: border-color .2s; text-align: center;
          font-size: 13px; color: #6366F1; font-weight: 600;
        }
        .upload-zone:hover { border-color: #6366F1; background: rgba(99,102,241,0.06); }
        .btn-submit {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white; border: none; border-radius: 12px; padding: 13px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 15px rgba(99,102,241,0.4);
          transition: all .2s;
        }
        .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(99,102,241,0.4); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        /* ── Spinner ── */
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ─── Helpers composants ────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
    <Loader className="spin" size={28} color="#6366F1" />
  </div>
);

const Empty = ({ icon, text, sub }) => (
  <div style={{ textAlign: "center", padding: "40px 0" }}>
    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
      {icon}
    </div>
    <p style={{ fontWeight: 700, fontSize: 15, color: "#374151", margin: 0 }}>{text}</p>
    {sub && <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>{sub}</p>}
  </div>
);

export default DesignerDashboard;