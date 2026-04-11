import React, { useEffect, useState } from "react";
import API from "../api";
import { Trash2, Eye, Edit3, X, Download, FileText, Calendar, Loader, AlertCircle, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import { exportBeautifulExcel } from "../utils/excelExport";

function History() {
  const [rapports, setRapports] = useState([]);
  const [rapport, setRapport] = useState({});
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projets, setProjets] = useState([]);

  const [showView, setShowView] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- États pour le système de Tags ---
  const [updateData, setUpdateData] = useState({
    date: "",
    travail_effectué: [],
    tâches_restantes: [],
    blocages: [],
  });

  const [tagInputs, setTagInputs] = useState({
    travail_effectué: "",
    tâches_restantes: "",
    blocages: ""
  });

  const [tagEditing, setTagEditing] = useState({
    travail_effectué: null,
    tâches_restantes: null,
    blocages: null
  });

  const user = JSON.parse(localStorage.getItem("user"));

  // --- Fonctions de gestion des Tags (portées de Rapport.js) ---
  const handleTagKeyDown = (e, field) => {
    if (e.key === "Enter" || e.key === ";") {
      e.preventDefault();
      const values = tagInputs[field].split(/[;\n]/);
      let updated = [...updateData[field]];

      values.forEach(val => {
        const trimmed = val.trim();
        if (!trimmed) return;
        if (tagEditing[field] !== null) {
          updated[tagEditing[field]] = trimmed;
        } else {
          updated.push(trimmed);
        }
      });

      setUpdateData({ ...updateData, [field]: updated });
      setTagInputs({ ...tagInputs, [field]: "" });
      setTagEditing({ ...tagEditing, [field]: null });
    }
  };

  const handleEditTag = (field, index) => {
    setTagInputs({ ...tagInputs, [field]: updateData[field][index] });
    setTagEditing({ ...tagEditing, [field]: index });
  };

  const removeTag = (field, index) => {
    const updated = updateData[field].filter((_, i) => i !== index);
    setUpdateData({ ...updateData, [field]: updated });
  };

  // --- Fonctions API ---
  const fetchProjets = async () => {
    try {
      const res = await API.get("/projets");
      setProjets(res.data);
    } catch (e) { console.log("fetch projets failed :", e); }
  };

  const fetchRapport = async () => {
    setLoading(true);
    try {
      const res = await API.get("/rapport");
      setRapports(res.data.rapports);
    } catch (e) { console.log("fetch failed :", e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRapport();
    fetchProjets();
  }, []);

  const handleView = async (id) => {
    try {
      const res = await API.get(`/rapport/${id}`);
      setRapport(res.data.rapport);
      setShowView(true);
    } catch (e) { console.log("err view :", e); }
  };

  const handleUpdate = (rapport) => {
    setId(rapport._id);
    setUpdateData({
      date: rapport.date?.split("T")[0] || "",
      travail_effectué: Array.isArray(rapport.travail_effectué) ? rapport.travail_effectué : [],
      tâches_restantes: Array.isArray(rapport.tâches_restantes) ? rapport.tâches_restantes : [],
      blocages: Array.isArray(rapport.blocages) ? rapport.blocages : [],
    });
    // Reset inputs temporaires
    setTagInputs({ travail_effectué: "", tâches_restantes: "", blocages: "" });
    setShowUpdate(true);
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await API.put(`/rapport/${id}`, updateData);
      setShowUpdate(false);
      fetchRapport();
    } catch (e) { console.log("update err", e); }
    finally { setIsUpdating(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce rapport ?")) return;
    try {
      await API.delete(`/rapport/${id}`);
      fetchRapport();
    } catch (e) { console.log("delete err", e); }
  };

  const downloadPDF = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/Api_B2B/rapportPDF/${id}`,
        {},
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "rapport.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { console.log("err download pdf ", e); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getDesignerNom = (rapport) => {
    if (!rapport || !rapport.id_designer) return "Designer inconnu";
    return typeof rapport.id_designer === 'object' ? rapport.id_designer.nom : "Designer inconnu";
  };

  const getProjetNom = (rapport) => {
    if (!rapport || !rapport.id_projet) return "Projet inconnu";
    if (typeof rapport.id_projet === 'object') return rapport.id_projet.nom;
    const projet = projets.find(p => p._id === rapport.id_projet);
    return projet?.nom || "Projet inconnu";
  };

  const formatTexte = (texte) => {
    if (Array.isArray(texte)) return texte.join(' • ');
    return texte || "";
  };

  const exportHistoryExcel = () => {
    const sourceRows = rapports.filter((r) => r && r._id);
    const formatListForCell = (value) => {
      if (Array.isArray(value)) return value.map((v) => `- ${v}`).join("\n");
      return value || "";
    };

    const headers = ["Date", "Designer", "Projet", "Travail effectué", "Tâches restantes", "Blocages"];
    const rows = sourceRows.map((r) => ([
      formatDate(r.date),
      getDesignerNom(r),
      getProjetNom(r),
      formatListForCell(r.travail_effectué),
      formatListForCell(r.tâches_restantes),
      formatListForCell(r.blocages)
    ]));
    exportBeautifulExcel({
      title: "Historique des rapports",
      headers,
      rows,
      filenamePrefix: "historique-rapports",
      sheetName: "Historique",
    });
  };

  return (
    <div className="h-root">
      {/* ── Header ── */}
      <div className="h-header">
        <div>
          <p className="h-sup">Tableau de bord</p>
          <h1 className="h-title">Historique des rapports</h1>
          <p className="h-sub">Consultez et gérez tous les rapports quotidiens</p>
        </div>
        <div className="h-header-actions">
          <div className="h-badge">
            <FileText size={16} color="#6366F1" />
            <span>{rapports.length} rapport{rapports.length !== 1 ? "s" : ""}</span>
          </div>
          <button className="h-export-btn" onClick={exportHistoryExcel}>
            Exporter Excel
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="panel">
        {loading ? (
          <div className="center-block"><Loader className="spin" size={28} color="#6366F1" /></div>
        ) : rapports.length === 0 ? (
          <div className="center-block">
            <div className="empty-icon"><FileText size={28} color="#6366F1" /></div>
            <p className="empty-title">Aucun rapport disponible</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Designer</th>
                  <th>Projet</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rapports.filter(r => r && r._id).map((p) => (
                  <tr key={p._id}>
                    <td><div className="date-cell"><Calendar size={13} color="#6366F1" /><span>{formatDate(p.date)}</span></div></td>
                    <td><span className="truncate">{getDesignerNom(p)}</span></td>
                    <td><span className="truncate">{getProjetNom(p)}</span></td>
                    <td>
                      <div className="actions-cell">
                        <button className="icon-btn down-c" onClick={() => downloadPDF(p._id)}><Download size={15} /></button>
                        <button className="icon-btn eye-c" onClick={() => handleView(p._id)} title="Voir"><Eye size={15} /></button>
                        {user?.rôle === "designer" && (
                          <button className="icon-btn edit-c" onClick={() => handleUpdate(p)} title="Modifier"><Edit3 size={15} /></button>
                        )}
                        <button className="icon-btn del-c" onClick={() => handleDelete(p._id)} title="Supprimer"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── VIEW MODAL ── */}
      {showView && rapport && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <div className="modal-head-left"><div className="modal-icon"><FileText size={18} color="#6366F1" /></div><h3>Détails</h3></div>
              <button className="modal-close" onClick={() => setShowView(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><div className="detail-label"><Calendar size={13} /> Date</div><div className="detail-value">{formatDate(rapport.date)}</div></div>
              <div className="detail-section"><div className="detail-section-label">Travail effectué</div><div className="detail-section-text">{formatTexte(rapport.travail_effectué)}</div></div>
              <div className="detail-section"><div className="detail-section-label">Tâches restantes</div><div className="detail-section-text">{formatTexte(rapport.tâches_restantes)}</div></div>
              <div className="detail-section"><div className="detail-section-label"><AlertCircle size={13} color="#F59E0B" /> Blocages</div><div className="detail-section-text">{formatTexte(rapport.blocages) || "Aucun"}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPDATE MODAL (VERSION RAPPORT) ── */}
      {showUpdate && (
        <div className="overlay">
          <div className="modal h-modal-scroll">
            <div className="modal-head">
              <div className="modal-head-left">
                <div className="modal-icon"><Edit3 size={18} color="#6366F1" /></div>
                <h3>Modifier le rapport</h3>
              </div>
              <button className="modal-close" onClick={() => setShowUpdate(false)}><X size={18} /></button>
            </div>
            <form className="modal-body" onSubmit={submitUpdate}>
              <div className="field">
                <label className="field-label"><Calendar size={12} /> Date</label>
                <input type="date" value={updateData.date} onChange={(e) => setUpdateData({ ...updateData, date: e.target.value })} className="inp" />
              </div>

              {/* Travail Effectué */}
              <div className="field">
                <label className="field-label"><CheckCircle size={12} color="#10B981" /> Travail effectué</label>
                <textarea
                  placeholder="Écrire puis Entrée ou ;"
                  value={tagInputs.travail_effectué}
                  onChange={(e) => setTagInputs({ ...tagInputs, travail_effectué: e.target.value })}
                  onKeyDown={(e) => handleTagKeyDown(e, "travail_effectué")}
                  className="inp"
                  style={{ borderColor: tagEditing.travail_effectué !== null ? "#f59e0b" : "#E2E8F0" }}
                />
                <div className="tagsContainer">
                  {updateData.travail_effectué.map((tag, index) => (
                    <div key={index} className="tag-chip" onClick={() => handleEditTag("travail_effectué", index)}>
                      {tag} <span className="tag-close" onClick={(e) => { e.stopPropagation(); removeTag("travail_effectué", index); }}>×</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tâches Restantes */}
              <div className="field">
                <label className="field-label"><Clock size={12} color="#F59E0B" /> Tâches restantes</label>
                <textarea
                  placeholder="Écrire puis Entrée ou ;"
                  value={tagInputs.tâches_restantes}
                  onChange={(e) => setTagInputs({ ...tagInputs, tâches_restantes: e.target.value })}
                  onKeyDown={(e) => handleTagKeyDown(e, "tâches_restantes")}
                  className="inp"
                  style={{ borderColor: tagEditing.tâches_restantes !== null ? "#f59e0b" : "#E2E8F0" }}
                />
                <div className="tagsContainer">
                  {updateData.tâches_restantes.map((tag, index) => (
                    <div key={index} className="tag-chip" onClick={() => handleEditTag("tâches_restantes", index)}>

                      {tag} <span className="tag-close" onClick={(e) => { e.stopPropagation(); removeTag("tâches_restantes", index); }}>×</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blocages */}
              <div className="field">
                <label className="field-label"><AlertCircle size={12} color="#EF4444" /> Blocages</label>
                <textarea
                  placeholder="Écrire puis Entrée ou ;"
                  value={tagInputs.blocages}
                  onChange={(e) => setTagInputs({ ...tagInputs, blocages: e.target.value })}
                  onKeyDown={(e) => handleTagKeyDown(e, "blocages")}
                  className="inp"
                  style={{ borderColor: tagEditing.blocages !== null ? "#f59e0b" : "#E2E8F0" }}
                />
                <div className="tagsContainer">
                  {updateData.blocages.map((tag, index) => (
                    <div key={index} className="tag-chip" onClick={() => handleEditTag("blocages", index)}>
                      {tag} <span className="tag-close" onClick={(e) => { e.stopPropagation(); removeTag("blocages", index); }}>×</span>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={isUpdating}>
                {isUpdating ? <Loader size={15} className="spin" /> : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .h-root { font-family: 'Plus Jakarta Sans', sans-serif; max-width: 1100px; margin: 0 auto; padding: 28px 24px 60px; color: #1E293B; }
        .h-header { display: flex; justify-content: space-between; margin-bottom: 28px; }
        .h-title { font-size: 26px; font-weight: 800; margin: 0; }
        .h-header-actions { display: flex; align-items: center; gap: 10px; }
        .h-badge { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 18px; font-size: 13px; font-weight: 700; color: #6366F1; }
        .h-export-btn { border: none; background: #0f766e; color: #fff; border-radius: 10px; padding: 10px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .h-export-btn:hover { background: #0d5f59; }

        .panel { background: white; border-radius: 16px; border: 1px solid #F1F5F9; overflow: hidden; }
        .table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { text-align: left; padding: 14px 18px; color: #94A3B8; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #F1F5F9; }
        .data-table td { padding: 15px 18px; border-bottom: 1px solid #F8FAFC; }

        .actions-cell { display: flex; gap: 8px; justify-content: center; }
        .icon-btn { border: none; cursor: pointer; padding: 7px; border-radius: 8px; display: flex; transition: .2s; }
        .eye-c { color: #2a9d8f; background: rgba(42,157,143,0.1); }
        .edit-c { color: #6366F1; background: rgba(99,102,241,0.1); }
        .del-c { color: #e63946; background: rgba(230,57,70,0.1); }
        .down-c { color: #10B981; background: rgba(16,185,129,0.1); }
        .icon-btn:hover { transform: scale(1.1); }

        .overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: white; border-radius: 20px; width: 100%; max-width: 520px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); animation: popIn .25s ease; }
        .h-modal-scroll { max-height: 90vh; overflow-y: auto; }
        
        @keyframes popIn { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #F1F5F9; }
        .modal-body { display: flex; flex-direction: column; gap: 16px; padding: 20px 24px; }
        
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
        .inp { width: 100%; padding: 10px 12px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 13px; outline: none; resize: none; }
        .inp:focus { border-color: #6366F1; }

        .tagsContainer { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .tag-chip { background: #1E293B; color: white; padding: 4px 10px; border-radius: 100px; font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: .2s; }
        .tag-chip:hover { background: #334155; }
        .tag-close { font-weight: bold; cursor: pointer; color: #94A3B8; }

        .btn-submit { background: #6366F1; color: white; border: none; border-radius: 12px; padding: 12px; font-weight: 700; cursor: pointer; transition: .2s; margin-top: 10px; }
        .btn-submit:hover { background: #4F46E5; }

        .detail-section-text { background: #F8FAFC; padding: 12px; border-radius: 10px; font-size: 13px; line-height: 1.5; border: 1px solid #F1F5F9; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default History;