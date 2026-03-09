import React, { useEffect, useState } from "react";
import API from "../api";
import { Trash2, Eye, Edit3, X, Download, FileText, Calendar, Loader, AlertCircle, CheckCircle, Clock } from "lucide-react";
import axios from "axios";

function History() {
  const [rapports, setRapports] = useState([]);
  const [rapport, setRapport] = useState({});
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showView, setShowView] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [updateData, setUpdateData] = useState({
    date: "",
    travail_effectué: "",
    tâches_restantes: "",
    blocages: "",
  });

  const user = JSON.parse(localStorage.getItem("user"));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdateData({ ...updateData, [name]: value });
  };

  const fetchRapport = async () => {
    setLoading(true);
    try {
      const res = await API.get("/rapport");
      setRapports(res.data.rapports);
    } catch (e) {
      console.log("fetch failed :", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRapport(); }, []);

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
      date: rapport.date,
      travail_effectué: rapport.travail_effectué,
      tâches_restantes: rapport.tâches_restantes,
      blocages: rapport.blocages,
    });
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
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const a = document.createElement("a");
      a.href = url;
      a.download = "rapport.pdf";

      document.body.appendChild(a);
      a.click();
      a.remove();

    } catch (e) {
      console.log("err download pdf ", e);
    }
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="h-root">

      {/* ── Header ── */}
      <div className="h-header">
        <div>
          <p className="h-sup">Tableau de bord</p>
          <h1 className="h-title">Historique des rapports</h1>
          <p className="h-sub">Consultez et gérez tous les rapports quotidiens des designers</p>
        </div>
        <div className="h-badge">
          <FileText size={16} color="#6366F1" />
          <span>{rapports.length} rapport{rapports.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Table panel ── */}
      <div className="panel">
        {loading ? (
          <div className="center-block">
            <Loader className="spin" size={28} color="#6366F1" />
          </div>
        ) : rapports.length === 0 ? (
          <div className="center-block">
            <div className="empty-icon"><FileText size={28} color="#6366F1" /></div>
            <p className="empty-title">Aucun rapport disponible</p>
            <p className="empty-sub">Les rapports apparaîtront ici une fois créés.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Travail effectué</th>
                  <th>Tâches restantes</th>
                  <th>Blocages</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rapports.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="date-cell">
                        <Calendar size={13} color="#6366F1" />
                        <span>{formatDate(p.date)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="truncate">{p.travail_effectué}</span>
                    </td>
                    <td>
                      <span className="truncate">{p.tâches_restantes}</span>
                    </td>
                    <td>
                      {p.blocages
                        ? <span className="badge-blocage"><AlertCircle size={11} /> {p.blocages}</span>
                        : <span className="badge-ok"><CheckCircle size={11} /> Aucun</span>
                      }
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="icon-btn down-c" onClick={() => downloadPDF(p._id)}>
                          <Download size={15} /></button>
                        <button className="icon-btn eye-c" onClick={() => handleView(p._id)} title="Voir">
                          <Eye size={15} />
                        </button>
                        {user?.rôle === "designer" && (
                          <button className="icon-btn edit-c" onClick={() => handleUpdate(p)} title="Modifier">
                            <Edit3 size={15} />
                          </button>
                        )}
                        <button className="icon-btn del-c" onClick={() => handleDelete(p._id)} title="Supprimer">
                          <Trash2 size={15} />
                        </button>
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
      {showView && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <div className="modal-head-left">
                <div className="modal-icon"><FileText size={18} color="#6366F1" /></div>
                <h3>Détails du rapport</h3>
              </div>
              <button className="modal-close" onClick={() => setShowView(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <div className="detail-label"><Calendar size={13} /> Date</div>
                <div className="detail-value">{formatDate(rapport.date)}</div>
              </div>
              <div className="detail-section">
                <div className="detail-section-label">Travail effectué</div>
                <div className="detail-section-text">{rapport.travail_effectué}</div>
              </div>
              <div className="detail-section">
                <div className="detail-section-label">Tâches restantes</div>
                <div className="detail-section-text">{rapport.tâches_restantes}</div>
              </div>
              <div className="detail-section">
                <div className="detail-section-label"><AlertCircle size={13} color="#F59E0B" /> Blocages</div>
                <div className="detail-section-text">{rapport.blocages || "Aucun blocage signalé"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPDATE MODAL ── */}
      {showUpdate && (
        <div className="overlay">
          <div className="modal">
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
                <input type="date" name="date" value={updateData.date?.split("T")[0]} onChange={handleChange} className="inp" />
              </div>
              <div className="field">
                <label className="field-label"><CheckCircle size={12} color="#10B981" /> Travail effectué</label>
                <textarea name="travail_effectué" value={updateData.travail_effectué} onChange={handleChange} className="inp" rows={3} />
              </div>
              <div className="field">
                <label className="field-label"><Clock size={12} color="#F59E0B" /> Tâches restantes</label>
                <textarea name="tâches_restantes" value={updateData.tâches_restantes} onChange={handleChange} className="inp" rows={3} />
              </div>
              <div className="field">
                <label className="field-label"><AlertCircle size={12} color="#EF4444" /> Blocages</label>
                <input name="blocages" value={updateData.blocages} onChange={handleChange} className="inp" placeholder="Aucun blocage..." />
              </div>
              <button type="submit" className="btn-submit" disabled={isUpdating}>
                {isUpdating ? <><Loader size={15} className="spin" /> Sauvegarde…</> : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .h-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 24px 60px;
          background: none;
          min-height: 100vh;
          color: #1E293B;
        }

        /* ── Header ── */
        .h-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
        }
        .h-sup   { font-size: 12px; font-weight: 600; color: #6366F1; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 4px; }
        .h-title { font-size: 26px; font-weight: 800; color: #0F172A; margin: 0 0 5px; }
        .h-sub   { font-size: 13px; color: #94A3B8; margin: 0; }

        .h-badge {
          display: flex; align-items: center; gap: 8px;
          background: white; border: 1px solid #E2E8F0;
          border-radius: 12px; padding: 10px 18px;
          font-size: 13px; font-weight: 700; color: #6366F1;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          white-space: nowrap;
        }

        /* ── Panel ── */
        .panel {
          background: white;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          border: 1px solid #F1F5F9;
          overflow: hidden;
        }

        .center-block {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px 20px; gap: 12px;
        }
        .empty-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(99,102,241,0.08);
          display: flex; align-items: center; justify-content: center;
        }
        .empty-title { font-size: 15px; font-weight: 700; color: #374151; margin: 0; }
        .empty-sub   { font-size: 13px; color: #94A3B8; margin: 0; }

        /* ── Table ── */
        .table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table thead { background: none; }
        .data-table th {
          text-align: left; padding: 14px 18px;
          color: #94A3B8; font-weight: 700; font-size: 11px;
          text-transform: uppercase; letter-spacing: .06em;
          border-bottom: 1px solid #F1F5F9;
        }
        .data-table td {
          padding: 15px 18px; border-bottom: 1px solid none;
          color: #374151; vertical-align: middle;
        }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tbody tr:hover td { background: none; }

        .date-cell { display: flex; align-items: center; gap: 7px; font-weight: 700; color: #1E293B; white-space: nowrap; }

        .truncate {
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
          max-width: 240px; line-height: 1.5;
        }

        .badge-blocage {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(239,68,68,0.1); color: #DC2626;
          border-radius: 20px; padding: 4px 11px;
          font-size: 11px; font-weight: 700;
        }
        .badge-ok {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(16,185,129,0.1); color: #059669;
          border-radius: 20px; padding: 4px 11px;
          font-size: 11px; font-weight: 700;
        }

        .actions-cell { display: flex; align-items: center; justify-content: center; gap: 8px; }

        /* ── Icon buttons ── */
        .icon-btn { border: none; cursor: pointer; padding: 7px; border-radius: 8px; transition: all .18s; display: flex; align-items: center; }
        .eye-c  { color: #2a9d8f; background: rgba(42,157,143,0.1); }
        .edit-c { color: #6366F1;  background: rgba(99,102,241,0.1); }
        .del-c  { color: #e63946;  background: rgba(230,57,70,0.1); }
        .down-c {color: #35e611}
        .icon-btn:hover { filter: brightness(1.1); transform: scale(1.1); }

        /* ── Overlay & Modal ── */
        .overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,0.6);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal {
          background: white; border-radius: 20px;
          width: 100%; max-width: 480px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.2);
          animation: popIn .25s ease;
          overflow: hidden;
        }
        @keyframes popIn {
          from { transform: scale(.94) translateY(12px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }

        .modal-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #F1F5F9;
        }
        .modal-head-left { display: flex; align-items: center; gap: 12px; }
        .modal-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(99,102,241,0.1);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .modal-head h3 { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0; }

        .modal-close {
          border: none; background: #F1F5F9; border-radius: 8px;
          padding: 7px; cursor: pointer; color: #64748B;
          display: flex; transition: background .15s;
        }
        .modal-close:hover { background: #E2E8F0; }

        /* ── Modal Body ── */
        .modal-body {
          display: flex; flex-direction: column; gap: 16px;
          padding: 22px 24px 24px;
        }

        /* View details */
        .detail-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: none; border-radius: 10px;
        }
        .detail-label {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 700; color: #94A3B8;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .detail-value { font-size: 14px; font-weight: 700; color: #1E293B; }

        .detail-section { display: flex; flex-direction: column; gap: 7px; }
        .detail-section-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; color: #94A3B8;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .detail-section-text {
          background: none; border-radius: 10px;
          padding: 12px 14px; font-size: 13px; color: #374151;
          line-height: 1.6; border: 1px solid #F1F5F9;
        }

        /* Form fields */
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; color: #64748B;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .inp {
          width: 100%; padding: 11px 13px;
          border: 1.5px solid #E2E8F0; border-radius: 10px;
          font-size: 13px; color: #1E293B;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none; transition: border-color .2s;
          resize: none; box-sizing: border-box;
        }
        .inp:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }

        .btn-submit {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white; border: none; border-radius: 12px;
          padding: 13px; font-size: 14px; font-weight: 700;
          cursor: pointer; margin-top: 4px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 15px rgba(99,102,241,0.4);
          transition: all .2s;
        }
        .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(99,102,241,0.4); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default History;