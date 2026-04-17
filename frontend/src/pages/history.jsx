import React, { useEffect, useState } from "react";
import API from "../api";
import { Trash2, Eye, Edit3, X, Download, FileText, Calendar, Loader, AlertCircle, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import { exportBeautifulExcel } from "../utils/excelExport";
import { generateRapportPDF } from "../utils/pdfGenerator";

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
      const res = await API.get(`/rapport/${id}`);
      const rapportData = res.data.rapport;
      if (!rapportData) return;
      
      const designerName = getDesignerNom(rapportData);
      const projectNom = getProjetNom(rapportData);

      const pdfBlob = generateRapportPDF(rapportData, designerName, projectNom);
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RAPPORT_${projectNom.replace(/\s+/g, "_")}_${new Date(rapportData.date).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.open(url, '_blank');
    } catch (e) {
      console.log("err download pdf ", e);
    }
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

  const userRole = user?.["r\u00f4le"] || user?.role || user?.["rÃ´le"] || "";
  const visibleRapports = rapports.filter((item) => item && item._id);

  return (
    <div className="h-root admin-page">
      {/* ── Header ── */}
      <div className="admin-page-header">
        <div className="admin-page-copy">
          <span className="admin-page-sup">
            <FileText size={14} />
            Administration
          </span>
          <h1 className="admin-page-title">Rapports & historique</h1>
          <p className="admin-page-text">
            Consultez les rapports et le suivi des designers.
          </p>
        </div>
        <div className="admin-page-actions">
          <div className="admin-chip">
            <FileText size={15} />
            <span>{visibleRapports.length} rapport{visibleRapports.length !== 1 ? "s" : ""}</span>
          </div>
          <button className="admin-btn admin-btn--secondary" onClick={exportHistoryExcel}>
            Exporter Excel
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="panel history-panel">
        {loading ? (
          <div className="admin-empty-state" style={{ border: "none", background: "transparent", padding: 60 }}>
            <Loader className="spin" size={28} color="#0066FF" />
            <div>Chargement de l historique...</div>
          </div>
        ) : visibleRapports.length === 0 ? (
          <div className="admin-empty-state" style={{ margin: 4 }}>
            <FileText size={34} />
            <div>Aucun rapport disponible.</div>
          </div>
        ) : (
          <div className="table-wrap history-table-wrap">
            <table className="data-table history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Designer</th>
                  <th>Projet</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRapports.map((p) => (
                  <tr key={p._id}>
                    <td><div className="date-cell"><Calendar size={13} color="#0066FF" /><span>{formatDate(p.date)}</span></div></td>
                    <td><span className="truncate">{getDesignerNom(p)}</span></td>
                    <td><span className="truncate">{getProjetNom(p)}</span></td>
                    <td>
                      <div className="actions-cell history-actions-cell">
                        <button className="history-icon-btn history-icon-btn--download" onClick={() => downloadPDF(p._id)} title="Telecharger"><Download size={15} /></button>
                        <button className="history-icon-btn history-icon-btn--view" onClick={() => handleView(p._id)} title="Voir"><Eye size={15} /></button>
                        {userRole === "designer" && (
                          <button className="history-icon-btn history-icon-btn--edit" onClick={() => handleUpdate(p)} title="Modifier"><Edit3 size={15} /></button>
                        )}
                        <button className="history-icon-btn history-icon-btn--delete" onClick={() => handleDelete(p._id)} title="Supprimer"><Trash2 size={15} /></button>
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
              <div className="modal-head-left"><div className="modal-icon"><FileText size={18} color="#0066FF" /></div><h3>Détails</h3></div>
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
                <div className="modal-icon"><Edit3 size={18} color="#0066FF" /></div>
                <h3>Modifier le rapport</h3>
              </div>
              <button className="modal-close" onClick={() => setShowUpdate(false)}><X size={18} /></button>
            </div>
            <form className="modal-body" onSubmit={submitUpdate}>
              <div className="field">
                <label className="field-label"><Calendar size={12} /> Date</label>
                <input type="date" value={updateData.date} onChange={(e) => setTagInputs({ ...updateData, date: e.target.value })} className="inp" />
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
        .h-root {
          max-width: none;
        }
        .history-panel {
          overflow: hidden;
        }
        .history-table tbody tr td {
          transition: background 0.2s ease;
        }
        .history-actions-cell {
          justify-content: center;
        }
        .history-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .history-icon-btn:hover {
          transform: translateY(-2px);
        }
        .history-icon-btn--download {
          color: #059669;
          background: rgba(5,150,105,0.1);
          border-color: rgba(5,150,105,0.16);
        }
        .history-icon-btn--view {
          color: #0066FF;
          background: rgba(0,102,255,0.08);
          border-color: rgba(0,102,255,0.12);
        }
        .history-icon-btn--edit {
          color: #D97706;
          background: rgba(245,158,11,0.1);
          border-color: rgba(245,158,11,0.16);
        }
        .history-icon-btn--delete {
          color: #DC2626;
          background: rgba(220,38,38,0.08);
          border-color: rgba(220,38,38,0.14);
        }
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(7,21,43,0.68);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,250,255,0.94));
          border-radius: 28px;
          width: 100%;
          max-width: 620px;
          border: 1px solid rgba(187,213,239,0.72);
          box-shadow: 0 32px 90px rgba(2,6,23,0.35);
          animation: popIn .24s ease;
        }
        .h-modal-scroll {
          max-height: 90vh;
          overflow-y: auto;
        }
        @keyframes popIn {
          from { transform: translateY(12px) scale(.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(226,232,240,0.86);
        }
        .modal-head-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .modal-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,102,255,0.08);
        }
        .modal-head h3 {
          margin: 0;
          font-size: 22px;
          line-height: 1.04;
          letter-spacing: -0.04em;
          color: #07152B;
        }
        .modal-close {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(187,213,239,0.72);
          background: rgba(248,250,252,0.92);
          color: #64748B;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 22px 24px 24px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-label {
          font-size: 11px;
          font-weight: 800;
          color: #64748B;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.08em;
        }
        .inp {
          width: 100%;
          padding: 13px 14px;
          border: 1.5px solid rgba(187,213,239,0.82);
          border-radius: 18px;
          font-size: 13px;
          outline: none;
          resize: none;
          background: rgba(255,255,255,0.94);
          color: #07152B;
        }
        .inp:focus {
          border-color: #0066FF;
          box-shadow: 0 0 0 5px rgba(0,102,255,0.08);
        }
        .tagsContainer {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .tag-chip {
          background: linear-gradient(135deg, #07152B, #123062);
          color: white;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: .2s;
        }
        .tag-chip:hover {
          transform: translateY(-1px);
        }
        .tag-close {
          font-weight: bold;
          cursor: pointer;
          color: rgba(255,255,255,0.72);
        }
        .btn-submit {
          background: linear-gradient(135deg, #0066FF, #00A8FF);
          color: white;
          border: none;
          border-radius: 18px;
          padding: 14px 16px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s;
          margin-top: 6px;
          box-shadow: 0 18px 38px rgba(0,102,255,0.24);
        }
        .btn-submit:hover {
          transform: translateY(-2px);
        }
        .detail-section-text {
          background: rgba(248,250,252,0.9);
          padding: 14px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.6;
          border: 1px solid rgba(187,213,239,0.72);
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default History;
