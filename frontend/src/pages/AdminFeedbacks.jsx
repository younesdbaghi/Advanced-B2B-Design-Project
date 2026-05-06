import React, { useState, useEffect } from "react";
import API from "../api";
import {
  Loader, Eye, CheckCircle, XCircle, MessageSquare,
  Image, AlertCircle, Send, X, Edit3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportBeautifulExcel } from "../utils/excelExport";

// â”€â”€ Avatars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AvatarStack = ({ designers }) => {
  if (!designers || designers.length === 0) return <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>;
  const visible = designers.slice(0, 2);
  const extra = designers.length - 2;
  const colors = [
    "linear-gradient(135deg,#0066FF,#00A8FF)",
    "linear-gradient(135deg,#07152B,#123062)",
    "linear-gradient(135deg,#0891B2,#22C55E)",
    "linear-gradient(135deg,#1D4ED8,#38BDF8)",
  ];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((d, i) => (
        <div key={d._id || i} title={d.nom} style={{ width: 30, height: 30, borderRadius: "50%", background: colors[i % colors.length], color: "white", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i, position: "relative" }}>
          {d.nom?.charAt(0)?.toUpperCase() || "?"}
        </div>
      ))}
      {extra > 0 && <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#94A3B8", color: "white", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", marginLeft: -8, position: "relative", zIndex: 0 }}>+{extra}</div>}
    </div>
  );
};

// â”€â”€ Badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getProjectStartDate = (project) =>
  
  
  
  project?.date_debut ||
  "";

const getVersionNumber = (version) =>
  
  
  version?.numero_version ||
  version?.version ||
  "";

const getValidationFeedbackType = (validation) => {
  const status = validation?.statut;

  if (status === "valid\u00e9") return "Val";
  if (status === "\u00e0 corriger") return "Refus";
  return null;
};

const ADMIN_RECLAMATIONS_PER_PAGE = 4;

const StatutBadge = ({ statut }) => {
  const cfg = { "En cours": { color: "#2563EB", bg: "rgba(37,99,235,0.1)" }, "En attente": { color: "#D97706", bg: "rgba(217,119,6,0.1)" }, "En révision": { color: "#D97706", bg: "rgba(217,119,6,0.1)" }, "Validé": { color: "#059669", bg: "rgba(5,150,105,0.1)" }, "Refusé": { color: "#DC2626", bg: "rgba(220,38,38,0.1)" }, "Terminé": { color: "#7C3AED", bg: "rgba(124,58,237,0.1)" } }[statut] || { color: "#64748B", bg: "rgba(100,116,139,0.1)" };
  return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{statut}</span>;
};

const VersionStatutBadge = ({ type }) => {
  if (!type) return <span style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>En attente</span>;
  const cfg = {
    Val: { label: "Validé", color: "#059669", bg: "rgba(5,150,105,0.1)", icon: <CheckCircle size={12} /> },
    Refus: { label: "Refusé", color: "#DC2626", bg: "rgba(220,38,38,0.1)", icon: <XCircle size={12} /> },
    Com: { label: "Commentaire", color: "#D97706", bg: "rgba(217,119,6,0.1)", icon: <MessageSquare size={12} /> },
  }[type] || { label: type, color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: null };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{cfg.icon} {cfg.label}</span>;
};

// â”€â”€ Popup Réclamations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin voit les éléments du client, peut modifier, puis transmet au designer
const ReclamationsModal = ({ validation, projetNom, clientNom, versionNum, onClose, onTransmitted, isEditMode = false }) => {
  const [commentaires, setCommentaires] = useState([]);
  const [editedComments, setEditedComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [transmitting, setTransmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchCommentaires = async () => {
      try {
        const { data } = await API.get(`/validations/${validation._id}/commentaires`);
        const list = Array.isArray(data) ? data : [];
        setCommentaires(list);
        const init = {};
        list.forEach((c) => {
          init[c._id] = c.commentaire_admin || c.commentaire_client || "";
        });
        setEditedComments(init);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCommentaires();
  }, [validation._id]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveComment = async (commentaireId) => {
    setSaving(commentaireId);
    try {
      await API.patch(`/commentaires-elements/${commentaireId}`, {
        commentaire_admin: editedComments[commentaireId],
      });
      setCommentaires((prev) => prev.map((c) => (
        c._id === commentaireId ? { ...c, commentaire_admin: editedComments[commentaireId] } : c
      )));
      showToast("success", "Sauvegarde effectuee");
    } catch {
      showToast("error", "Erreur de sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const handleTransmettre = async () => {
    setTransmitting(true);
    try {
      const toSave = commentaires.filter((c) => editedComments[c._id] !== (c.commentaire_admin || c.commentaire_client || ""));
      await Promise.all(toSave.map((c) => API.patch(`/commentaires-elements/${c._id}`, { commentaire_admin: editedComments[c._id] })));
      await API.patch(`/validations/${validation._id}/transmettre`);
      showToast("success", isEditMode ? "Modification enregistree" : "Transmission au designer effectuee");
      setTimeout(() => {
        onTransmitted && onTransmitted(validation._id);
        onClose();
      }, 900);
    } catch {
      showToast("error", "Erreur de transmission");
      setTransmitting(false);
    }
  };

  const avecContenu = commentaires.filter((c) => c.commentaire_client || c.commentaire_admin);
  const totalPages = Math.max(1, Math.ceil(avecContenu.length / ADMIN_RECLAMATIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ADMIN_RECLAMATIONS_PER_PAGE;
  const paginatedCommentaires = avecContenu.slice(pageStart, pageStart + ADMIN_RECLAMATIONS_PER_PAGE);
  const editedCount = Object.entries(editedComments).filter(([, value]) => String(value || "").trim()).length;

  useEffect(() => {
    setPage(1);
  }, [validation?._id]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <div onClick={onClose} className="admin-recl-overlay">
      <div onClick={(e) => e.stopPropagation()} className="admin-recl-modal">
        <div className="admin-recl-header">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div className="admin-recl-icon">!</div>
            <div className="admin-recl-hero">
              <div className="admin-recl-hero-top">
                <span className="admin-recl-eyebrow">Admin review</span>
                <span className="admin-recl-chip">Version {versionNum}</span>
              </div>
              <h3 className="admin-recl-title">{isEditMode ? "Modifier la transmission" : "Voir les reclamations"}</h3>
              <p className="admin-recl-subtitle">Relisez, reformulez et transmettez au designer une version claire des demandes du client.</p>
              <div className="admin-recl-stats">
                <div className="admin-recl-stat">
                  <span>Client</span>
                  <strong>{clientNom || "Client"}</strong>
                </div>
                <div className="admin-recl-stat">
                  <span>Projet</span>
                  <strong>{projetNom || "Sans projet"}</strong>
                </div>
                <div className="admin-recl-stat admin-recl-stat--success">
                  <span>Commentaires</span>
                  <strong>{avecContenu.length}</strong>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="admin-recl-close"><X size={18} /></button>
        </div>

        {toast && (
          <div className={`admin-recl-toast ${toast.type === "success" ? "is-success" : "is-error"}`}>
            {toast.msg}
          </div>
        )}

        <div className="admin-recl-counter">
          <span>{avecContenu.length} remarque{avecContenu.length > 1 ? "s" : ""} client</span>
          <div className="admin-recl-counter-right">
            <div className="admin-recl-progress">
              <span className="admin-recl-progress__bar" style={{ width: `${avecContenu.length ? Math.min(100, Math.round((editedCount / Math.max(avecContenu.length, 1)) * 100)) : 0}%` }} />
            </div>
            <span>Page {currentPage}/{totalPages}</span>
          </div>
        </div>

        <div className="admin-recl-body">
          {loading ? (
            <div className="admin-recl-loading"><Loader size={24} color="#6366F1" className="spin" /></div>
          ) : avecContenu.length === 0 ? (
            <div className="admin-recl-empty">
              <span>!</span>
              <p>Rejet general: le client n'a pas laisse de remarques specifiques.</p>
            </div>
          ) : (
            <>
              <div className="admin-recl-grid">
                {paginatedCommentaires.map((c, i) => (
                  <div key={c._id} className="admin-recl-card">
                    <div className="admin-recl-card__head">
                      <div className="admin-recl-card__thumb-wrap">
                        {c.thumbnail || c._thumbnail ? (
                          <img
                            src={c.thumbnail || c._thumbnail}
                            alt={c.label_element || c.id_element || `Element ${pageStart + i + 1}`}
                            className="admin-recl-card__thumb"
                          />
                        ) : (
                          <div className="admin-recl-card__thumb-fallback">
                            {(c.label_element || c.id_element || "E").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="admin-recl-card__meta">
                        <span>Element</span>
                        <strong>{c.label_element || c.id_element || `Element ${pageStart + i + 1}`}</strong>
                      </div>
                      <div className={`admin-recl-card__badge ${c.commentaire_admin && c.commentaire_admin !== c.commentaire_client ? "is-edited" : ""}`}>
                        {c.commentaire_admin && c.commentaire_admin !== c.commentaire_client ? "Modifie" : "Original"}
                      </div>
                    </div>

                    <div className="admin-recl-client-comment">
                      <span className="admin-recl-client-comment__label">Client</span>
                      <p>{c.commentaire_client || "-"}</p>
                    </div>

                    <div className="admin-recl-editor-label">
                      <Edit3 size={12} /> Version admin transmise au designer
                    </div>
                    <textarea
                      value={editedComments[c._id] ?? ""}
                      onChange={(e) => setEditedComments((p) => ({ ...p, [c._id]: e.target.value }))}
                      rows={3}
                      placeholder="Reformuler ou completer le commentaire pour le designer..."
                      className="admin-recl-textarea"
                    />
                    <div className="admin-recl-card__actions">
                      <button onClick={() => handleSaveComment(c._id)} disabled={saving === c._id} className="admin-recl-save-btn">
                        {saving === c._id ? <><Loader size={12} className="spin" /> Sauvegarde...</> : <><CheckCircle size={12} /> Sauvegarder</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {avecContenu.length > ADMIN_RECLAMATIONS_PER_PAGE && (
                <div className="admin-recl-pagination">
                  <button type="button" className="admin-recl-page-btn" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>Precedent</button>
                  <div className="admin-recl-page-list">
                    {Array.from({ length: totalPages }, (_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <button key={pageNumber} type="button" className={`admin-recl-page-index ${pageNumber === currentPage ? "is-active" : ""}`} onClick={() => setPage(pageNumber)}>
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className="admin-recl-page-btn" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Suivant</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="admin-recl-footer">
          <button onClick={onClose} className="admin-recl-cancel-btn">Annuler</button>
          <button onClick={handleTransmettre} disabled={transmitting || loading} className={`admin-recl-submit-btn ${isEditMode ? "is-edit" : ""}`}>
            {transmitting ? <><Loader size={15} className="spin" /> Transmission...</> : <><Send size={15} /> {isEditMode ? "Modifier" : "Confirmer et transmettre"}</>}
          </button>
        </div>
      </div>
      <style>{`
        .admin-recl-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background:
            radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 28%),
            linear-gradient(180deg, rgba(15,23,42,0.8), rgba(15,23,42,0.92));
          backdrop-filter: blur(14px) saturate(130%);
        }
        .admin-recl-modal {
          width: 100%;
          max-width: 760px;
          max-height: 88vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,250,252,0.98));
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 40px 90px rgba(2,6,23,0.35), 0 0 0 1px rgba(255,255,255,0.2);
        }
        .admin-recl-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 22px 14px;
          background: linear-gradient(135deg, rgba(238,242,255,0.95), rgba(255,255,255,0.86));
          border-bottom: 1px solid rgba(226,232,240,0.9);
        }
        .admin-recl-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white;
          font-weight: 900;
          font-size: 18px;
          box-shadow: 0 14px 24px rgba(99,102,241,0.28);
          flex-shrink: 0;
        }
        .admin-recl-hero { display: flex; flex-direction: column; gap: 8px; }
        .admin-recl-hero-top, .admin-recl-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .admin-recl-eyebrow, .admin-recl-chip { display: inline-flex; align-items: center; border-radius: 999px; font-size: 11px; font-weight: 800; }
        .admin-recl-eyebrow { padding: 5px 10px; background: rgba(99,102,241,0.08); color: #4F46E5; text-transform: uppercase; letter-spacing: 0.08em; }
        .admin-recl-chip { padding: 5px 10px; background: white; color: #0F172A; border: 1px solid rgba(148,163,184,0.2); box-shadow: 0 8px 18px rgba(15,23,42,0.06); }
        .admin-recl-title { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.04em; color: #0F172A; }
        .admin-recl-subtitle { margin: 0; max-width: 560px; font-size: 13px; line-height: 1.55; color: #64748B; font-weight: 500; }
        .admin-recl-stat { min-width: 96px; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.95); display: flex; flex-direction: column; gap: 2px; box-shadow: 0 8px 18px rgba(15,23,42,0.05); }
        .admin-recl-stat--success { background: linear-gradient(180deg, rgba(236,253,245,0.95), rgba(255,255,255,0.95)); border-color: rgba(16,185,129,0.18); }
        .admin-recl-stat span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94A3B8; }
        .admin-recl-stat strong { font-size: 13px; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-recl-close { width: 38px; height: 38px; border: 1px solid rgba(148,163,184,0.18); border-radius: 12px; background: rgba(255,255,255,0.78); color: #64748B; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 18px rgba(15,23,42,0.08); transition: all 0.2s ease; }
        .admin-recl-close:hover { color: #4F46E5; background: white; transform: translateY(-1px); }
        .admin-recl-toast { margin: 12px 22px 0; padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 800; color: white; }
        .admin-recl-toast.is-success { background: linear-gradient(135deg, #10B981, #059669); }
        .admin-recl-toast.is-error { background: linear-gradient(135deg, #EF4444, #B91C1C); }
        .admin-recl-counter { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 22px; background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(248,250,252,0.94)); border-bottom: 1px solid rgba(226,232,240,0.9); font-size: 11px; color: #64748B; font-weight: 700; }
        .admin-recl-counter-right { display: flex; align-items: center; gap: 12px; min-width: 220px; justify-content: flex-end; }
        .admin-recl-progress { position: relative; width: 140px; height: 8px; border-radius: 999px; overflow: hidden; background: rgba(226,232,240,0.95); box-shadow: inset 0 1px 2px rgba(15,23,42,0.08); }
        .admin-recl-progress__bar { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: linear-gradient(90deg, #6366F1, #8B5CF6, #10B981); box-shadow: 0 0 18px rgba(99,102,241,0.24); transition: width 0.28s ease; }
        .admin-recl-body { flex: 1; overflow-y: auto; padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 12px; background: radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(248,250,252,0.95) 60%), linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%); }
        .admin-recl-loading { display: flex; justify-content: center; padding: 40px; }
        .admin-recl-empty { text-align: center; color: #94A3B8; padding: 34px 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 18px; border: 1px dashed rgba(148,163,184,0.35); background: rgba(255,255,255,0.72); }
        .admin-recl-empty p { margin: 0; font-size: 13px; }
        .admin-recl-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .admin-recl-card { border-radius: 18px; border: 1px solid rgba(226,232,240,0.95); background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96)); box-shadow: 0 10px 18px rgba(15,23,42,0.05); overflow: hidden; }
        .admin-recl-card__head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.86)); border-bottom: 1px solid rgba(226,232,240,0.7); }
        .admin-recl-card__thumb-wrap { flex-shrink: 0; }
        .admin-recl-card__thumb { width: 62px; height: 42px; object-fit: cover; display: block; border-radius: 10px; border: 1px solid rgba(203,213,225,0.85); background: linear-gradient(180deg, #F8FAFC, #EEF2F7); box-shadow: inset 0 1px 2px rgba(15,23,42,0.04); }
        .admin-recl-card__thumb-fallback { width: 62px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(203,213,225,0.85); background: linear-gradient(135deg, #E0E7FF, #F8FAFC); color: #4F46E5; font-size: 18px; font-weight: 900; }
        .admin-recl-card__meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .admin-recl-card__meta span { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; }
        .admin-recl-card__meta strong { font-size: 12px; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-recl-card__badge { padding: 5px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; color: #92400E; background: rgba(251,191,36,0.16); border: 1px solid rgba(251,191,36,0.25); white-space: nowrap; }
        .admin-recl-card__badge.is-edited { color: #047857; background: rgba(16,185,129,0.14); border-color: rgba(16,185,129,0.24); }
        .admin-recl-client-comment { margin: 12px 14px 10px; padding: 10px 12px; border-radius: 12px; background: rgba(100,116,139,0.06); border: 1px solid rgba(226,232,240,0.75); }
        .admin-recl-client-comment__label { display: block; margin-bottom: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748B; }
        .admin-recl-client-comment p { margin: 0; font-size: 13px; line-height: 1.55; color: #334155; font-style: italic; }
        .admin-recl-editor-label { display: inline-flex; align-items: center; gap: 6px; margin: 0 14px 8px; font-size: 11px; font-weight: 800; color: #4F46E5; }
        .admin-recl-textarea { width: calc(100% - 28px); margin: 0 14px; padding: 12px 13px; border: 1.5px solid rgba(203,213,225,0.95); border-radius: 12px; font-size: 12px; font-family: inherit; line-height: 1.55; color: #0F172A; background: rgba(255,255,255,0.96); min-height: 82px; resize: vertical; outline: none; box-sizing: border-box; transition: all 0.22s ease; box-shadow: inset 0 1px 2px rgba(15,23,42,0.04); }
        .admin-recl-textarea:focus { border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 4px rgba(224,231,255,0.95), 0 10px 22px rgba(99,102,241,0.08); background: white; }
        .admin-recl-card__actions { display: flex; justify-content: flex-end; padding: 10px 14px 14px; }
        .admin-recl-save-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(16,185,129,0.16); border-radius: 12px; padding: 8px 13px; background: rgba(236,253,245,0.95); color: #059669; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s ease; }
        .admin-recl-save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 20px rgba(16,185,129,0.12); }
        .admin-recl-save-btn:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
        .admin-recl-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 2px; }
        .admin-recl-page-list { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
        .admin-recl-page-btn, .admin-recl-page-index { border: 1px solid rgba(203,213,225,0.9); background: rgba(255,255,255,0.92); color: #0F172A; border-radius: 12px; padding: 9px 13px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.22s ease; box-shadow: 0 8px 18px rgba(15,23,42,0.05); }
        .admin-recl-page-btn:hover:not(:disabled), .admin-recl-page-index:hover { border-color: rgba(99,102,241,0.4); color: #4F46E5; background: rgba(238,242,255,0.96); transform: translateY(-1px); }
        .admin-recl-page-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
        .admin-recl-page-index.is-active { border-color: transparent; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; box-shadow: 0 12px 24px rgba(99,102,241,0.24); }
        .admin-recl-footer { padding: 14px 20px; border-top: 1px solid rgba(226,232,240,0.92); display: flex; justify-content: space-between; align-items: center; gap: 12px; background: rgba(255,255,255,0.82); backdrop-filter: blur(12px); flex-shrink: 0; }
        .admin-recl-cancel-btn { border: 1px solid rgba(203,213,225,0.95); background: rgba(241,245,249,0.92); color: #64748B; border-radius: 12px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
        .admin-recl-cancel-btn:hover { background: white; color: #0F172A; }
        .admin-recl-submit-btn { display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 14px; padding: 11px 18px; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 16px 28px rgba(99,102,241,0.26); transition: all 0.22s ease; }
        .admin-recl-submit-btn.is-edit { background: linear-gradient(135deg, #10B981, #059669); box-shadow: 0 16px 28px rgba(16,185,129,0.22); }
        .admin-recl-submit-btn:hover:not(:disabled) { transform: translateY(-2px); filter: saturate(1.04); }
        .admin-recl-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; transform: none; }
        @media (max-width: 820px) {
          .admin-recl-overlay { padding: 14px; }
          .admin-recl-modal { max-height: 94vh; border-radius: 20px; }
          .admin-recl-header, .admin-recl-body, .admin-recl-counter { padding-left: 16px; padding-right: 16px; }
          .admin-recl-counter { flex-direction: column; align-items: stretch; }
          .admin-recl-counter-right { min-width: 0; justify-content: space-between; }
          .admin-recl-progress { width: 100%; }
          .admin-recl-footer { flex-direction: column; align-items: stretch; }
          .admin-recl-pagination { flex-direction: column; align-items: stretch; }
          .admin-recl-page-btn { width: 100%; }
          .admin-recl-stats { gap: 8px; }
          .admin-recl-stat { flex: 1; min-width: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
// â”€â”€ AdminFeedbacks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AdminFeedbacks = () => {
  const navigate = useNavigate();
  const [projets, setProjets] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [designersByProjet, setDesignersByProjet] = useState({});
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [maquetteData, setMaquetteData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);


  // État du popup réclamations
  const [reclModal, setReclModal] = useState(null); // { validation, projetNom, clientNom, versionNum }

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      try {
        const { data } = await API.get("/projets");
        const list = Array.isArray(data) ? data.filter(p => !(p.demanded && p.statut === "En attente")) : [];
        setProjets(list);
        const entries = await Promise.all(list.map(async (p) => {
          try { const { data: aff } = await API.get(`/affectations/projet/${p._id}`); return [p._id, (aff || []).map(a => a.id_designer).filter(Boolean)]; }
          catch { return [p._id, []]; }
        }));
        setDesignersByProjet(Object.fromEntries(entries));
      } catch (e) { console.error(e); }
      finally { setFetching(false); }
    };
    load();
  }, []);

  const handleVoirFeedbacks = async (projet) => {
    if (selectedProjet?._id === projet._id) { setSelectedProjet(null); setMaquetteData(null); return; }
    setSelectedProjet(projet); setMaquetteData(null); setLoadingDetail(true);
    try {
      const { data: liste } = await API.get(`/maquettes/projet/${projet._id}`);
      const maquette = Array.isArray(liste) && liste.length > 0 ? liste[0] : null;
      if (!maquette) { setMaquetteData({ maquette: null, versions: [], feedbacks: [], validations: [] }); return; }

      const [versRes, fbRes] = await Promise.all([
        API.get(`/versions/maquette/${maquette._id}`),
        API.get(`/validations/maquette/${maquette._id}`),
      ]);

      const fbData = fbRes.data;
      const feedbacks = Array.isArray(fbData?.feedbacks) ? fbData.feedbacks : [];
      const validations = Array.isArray(fbData?.validations) ? fbData.validations : [];

      setMaquetteData({ maquette, versions: Array.isArray(versRes.data) ? versRes.data : [], feedbacks, validations });
    } catch (e) { console.error(e); setMaquetteData({ maquette: null, versions: [], feedbacks: [], validations: [] }); }
    finally { setLoadingDetail(false); }
  };

  // Quand une validation est transmise â†’ la marquer localement
  const handleTransmitted = (validationId) => {
    setMaquetteData(prev => ({
      ...prev,
      validations: (prev?.validations || []).map(v =>
        v._id === validationId ? { ...v, transmis_designer: true } : v
      ),
    }));
  };

  const openEditor = (id) => navigate(`/admin/editeur/${id}`);

  const exportProjetsExcel = () => {
    const headers = ["Projet", "Client", "Date début", "Date fin", "Statut", "Designers"];
    const rows = projets.map((p) => [
      p.nom || "",
      p.id_client?.nom || "",
      getProjectStartDate(p) ? new Date(getProjectStartDate(p)).toLocaleDateString("fr-FR") : "",
      p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "",
      p.statut || "",
      (designersByProjet[p._id] || []).map((d) => d.nom).join(", "),
    ]);
    exportBeautifulExcel({ title: "Feedbacks Admin - Projets", headers, rows, filenamePrefix: "admin-feedbacks-projets", sheetName: "Projets" });
  };

  const exportVersionsExcel = (projetNom, versions, validations) => {
    const headers = ["Version", "Statut", "Réclamation", "Date"];
    const rows = versions.map((v) => {
      const val = validations?.find((f) => String(f.version_id?._id || f.version_id) === String(v._id));
      const fbType = getValidationFeedbackType(val) === "Val" ? "Valide" : getValidationFeedbackType(val) === "Refus" ? "Refuse" : "En attente";
      const recap = val?.commentaires?.length ? `${val.commentaires.length} remarque(s)` : "";
      return [ `V${getVersionNumber(v)}`, fbType, recap, v.date_creation ? new Date(v.date_creation).toLocaleDateString("fr-FR") : "" ];
    });
    exportBeautifulExcel({ title: `Versions feedbacks - ${projetNom}`, headers, rows, filenamePrefix: `admin-feedbacks-versions-${projetNom}`, sheetName: "Versions" });
  };

  return (
    <div className="admin-page admin-feedbacks-page">
      {/* Popup réclamations */}
      {reclModal && (
        <ReclamationsModal
          validation={reclModal.validation}
          projetNom={reclModal.projetNom}
          clientNom={reclModal.clientNom}
          versionNum={reclModal.versionNum}
          onClose={() => setReclModal(null)}
          onTransmitted={handleTransmitted}
          isEditMode={reclModal.isEditMode}
        />
      )}

      <div className="admin-page-header">
        <div className="admin-page-copy">
          <span className="admin-page-sup">
            <MessageSquare size={14} />
            Administration
          </span>
          <h1 className="admin-page-title">Feedbacks</h1>
          <p className="admin-page-text">
            Suivez les retours et transmettez les corrections.
          </p>
        </div>

        <div className="admin-page-actions">
          <div className="admin-chip">
            <MessageSquare size={15} />
            {projets.length} projet{projets.length > 1 ? "s" : ""} suivi{projets.length > 1 ? "s" : ""}
          </div>
          <button onClick={exportProjetsExcel} className="admin-btn admin-btn--secondary">
            Exporter Excel
          </button>
        </div>
      </div>

      <div className="card admin-feedbacks-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="admin-section-head" style={{ padding: "24px 24px 0" }}>
          <div>
            <div className="admin-section-title">Retours par projet</div>
            <p className="admin-section-text">Ouvrez un projet pour voir versions et reclamations.</p>
          </div>
          <div className="admin-chip">
            <MessageSquare size={15} />
            {projets.length} projet{projets.length > 1 ? "s" : ""}
          </div>
        </div>
        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader size={28} color="#2563EB" className="spin" /></div>
        ) : projets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}><MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} /><p>Aucun projet.</p></div>
        ) : (
          <table className="admin-feedbacks-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFF", borderBottom: "1px solid #F1F5F9" }}>
                {["Projet", "Client", "Date début", "Date fin", "Statut", "Designer", "Action"].map(h => (
                  <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projets.map((p, idx) => {
                const isSelected = selectedProjet?._id === p._id;
                const designers = designersByProjet[p._id] || [];
                return (
                  <React.Fragment key={p._id}>
                    <tr className={isSelected ? "admin-feedbacks-row admin-feedbacks-row--selected" : "admin-feedbacks-row"} style={{ borderBottom: isSelected ? "none" : "1px solid #F8FAFC", background: isSelected ? "#EFF6FF" : idx % 2 === 0 ? "white" : "#FAFBFF" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1E293B" }}>{p.nom}</div>
                        {p.description && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{p.description.slice(0, 45)}{p.description.length > 45 ? "â€¦" : ""}</div>}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0066FF,#00A8FF)", color: "white", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 10px 22px rgba(0,102,255,0.16)" }}>{p.id_client?.nom?.charAt(0) || "?"}</div>
                          <div><div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{p.id_client?.nom || "—"}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{p.id_client?.email || ""}</div></div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748B" }}>{getProjectStartDate(p) ? new Date(getProjectStartDate(p)).toLocaleDateString("fr-FR") : "—"}</td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748B" }}>{new Date(p.date_fin).toLocaleDateString("fr-FR")}</td>
                      <td style={{ padding: "14px 20px" }}><StatutBadge statut={p.statut} /></td>
                      <td style={{ padding: "14px 20px" }}><AvatarStack designers={designers} /></td>
                      <td style={{ padding: "14px 20px" }}>
                        <button onClick={() => handleVoirFeedbacks(p)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 13, fontWeight: 600, padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                          {isSelected ? "Masquer" : "Ouvrir"}
                        </button>
                      </td>
                    </tr>

                    {isSelected && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className="admin-feedbacks-detail" style={{ background: "#F8FBFF", borderTop: "2px solid #BFDBFE", borderBottom: "1px solid #E2E8F0", padding: "24px 32px" }}>
                            {loadingDetail ? (
                              <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader size={22} color="#2563EB" className="spin" /></div>
                            ) : !maquetteData ? null
                              : maquetteData.maquette === null ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: 13 }}>
                                  <AlertCircle size={16} /> Aucune maquette créée pour ce projet.
                                </div>
                              ) : (
                                <>
                                  {/* Lien maquette */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Maquette :</span>
                                    <button onClick={() => openEditor(maquetteData.maquette._id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 13, fontWeight: 600, textDecoration: "underline", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                      <Image size={13} /> voir maquette
                                    </button>
                                  </div>

                                  {/* Tableau versions */}
                                  {maquetteData.versions.length === 0 ? (
                                    <p style={{ fontSize: 13, color: "#94A3B8" }}>Aucune version.</p>
                                  ) : (
                                    <>
                                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                                        <button
                                          onClick={() => exportVersionsExcel(p.nom || "projet", maquetteData.versions, maquetteData.validations)}
                                          style={{ background:"#0f766e", color:"#fff", border:"none", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontWeight:600, fontSize:12 }}
                                        >
                                          Exporter versions Excel
                                        </button>
                                      </div>
                                      <table className="admin-feedbacks-versions" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                                      <thead>
                                        <tr style={{ background: "#F1F5F9" }}>
                                          {["Version", "Statut", "Réclamation", "Date", "Action"].map(h => (
                                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {maquetteData.versions.map((v, vi) => {
                                          // Feedback ancien système
                                          const fb = maquetteData.feedbacks?.find(f =>
                                            String(f.id_version?._id || f.id_version) === String(v._id)
                                            && (f.type === "Val" || f.type === "Refus")
                                          );
                                          // Validation nouveau système
                                          const val = maquetteData.validations?.find(f =>
                                            String(f.version_id?._id || f.version_id) === String(v._id)
                                          );

                                          const fbType = fb?.type || getValidationFeedbackType(val);
                                          const isRefus = fbType === "Refus";
                                          const dejaTransmis = val?.transmis_designer;

                                          return (
                                            <tr key={v._id} style={{ borderBottom: "1px solid #F1F5F9", background: vi % 2 === 0 ? "white" : "#FAFBFF" }}>
                                              {/* Version */}
                                              <td style={{ padding: "12px 16px" }}>
                                                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "white", fontWeight: 700, fontSize: 13 }}>
                                                  V{getVersionNumber(v)}
                                                </div>
                                              </td>

                                              {/* Statut */}
                                              <td style={{ padding: "12px 16px" }}>
                                                <VersionStatutBadge type={fbType} />
                                              </td>

                                              {/* Réclamation */}
                                              <td style={{ padding: "12px 16px", maxWidth: 280 }}>
                                                {!isRefus ? (
                                                  <span style={{ fontSize: 13, color: "#CBD5E1" }}>—</span>
                                                ) : dejaTransmis ? (
                                                  /* Déjà transmis */
                                                  <button
                                                    onClick={() => {
                                                      setReclModal({
                                                        validation: val,
                                                        projetNom: p.nom,
                                                        clientNom: p.id_client?.nom || "Client",
                                                        versionNum: getVersionNumber(v),
                                                        isEditMode: true
                                                      })
                                                    }
                                                    }
                                                    style={{ border: "none", cursor: "pointer" }}
                                                  >
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(5,150,105,0.1)", color: "#059669", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, border: "1px solid green" }}>
                                                      <CheckCircle size={13} /> Transmis au designer
                                                    </span>
                                                  </button>
                                                ) : val?._id ? (
                                                  /* Bouton ouvrir popup */
                                                  <button
                                                    onClick={() => {
                                                      setReclModal({
                                                        validation: val,
                                                        projetNom: p.nom,
                                                        clientNom: p.id_client?.nom || "Client",
                                                        versionNum: getVersionNumber(v),
                                                        isEditMode: false
                                                      })
                                                    }
                                                    }
                                                    style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.14)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.08)"}
                                                  >
                                                    âš ï¸ Voir réclamations & Transmettre
                                                  </button>
                                                ) : (
                                                  /* Ancien système sans CommentaireElement */
                                                  <span style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
                                                    {fb?.justification ? `"${fb.justification}"` : "Rejet sans détails"}
                                                  </span>
                                                )}
                                              </td>

                                              {/* Date */}
                                              <td style={{ padding: "12px 16px", fontSize: 12, color: "#94A3B8" }}>
                                                {new Date(v.date_creation).toLocaleDateString("fr-FR")}
                                              </td>

                                              {/* Action */}
                                              <td style={{ padding: "12px 16px" }}>
                                                <button onClick={() => openEditor(maquetteData.maquette._id)}
                                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, padding: 0 }}>
                                                  <Eye size={15} /> Voir
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      </table>
                                    </>
                                  )}
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .admin-feedbacks-page {
          max-width: none;
        }
        .admin-feedbacks-card {
          overflow: hidden;
        }
        .admin-feedbacks-table th,
        .admin-feedbacks-table td {
          vertical-align: middle;
        }
        .admin-feedbacks-row td {
          transition: background 0.2s ease;
        }
        .admin-feedbacks-row:hover td {
          background: rgba(236, 244, 255, 0.86);
        }
        .admin-feedbacks-row--selected td {
          background: rgba(226, 239, 255, 0.96) !important;
        }
        .admin-feedbacks-detail {
          background: linear-gradient(180deg, rgba(247, 251, 255, 0.98), rgba(240, 246, 255, 0.96)) !important;
        }
        .admin-feedbacks-versions tbody tr:hover td {
          background: rgba(244, 248, 255, 0.9);
        }
        .admin-feedbacks-versions th,
        .admin-feedbacks-versions td {
          vertical-align: middle;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminFeedbacks;

