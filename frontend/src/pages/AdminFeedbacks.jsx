import React, { useState, useEffect } from "react";
import API from "../api";
import {
  Loader, Eye, CheckCircle, XCircle, MessageSquare,
  Image, AlertCircle, Send, X, Edit3,
  Edit,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportBeautifulExcel } from "../utils/excelExport";

// ── Avatars ────────────────────────────────────────────────────────────────────
const AvatarStack = ({ designers }) => {
  if (!designers || designers.length === 0) return <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>;
  const visible = designers.slice(0, 2);
  const extra = designers.length - 2;
  const colors = ["linear-gradient(135deg,#EC4899,#F43F5E)", "linear-gradient(135deg,#6366F1,#8B5CF6)", "linear-gradient(135deg,#059669,#0D9488)", "linear-gradient(135deg,#F59E0B,#EF4444)"];
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

// ── Badges ─────────────────────────────────────────────────────────────────────
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

// ── Popup Réclamations ─────────────────────────────────────────────────────────
// Admin voit les éléments du client, peut modifier, puis transmet au designer
const ReclamationsModal = ({ validation, projetNom, clientNom, versionNum, onClose, onTransmitted, isEditMode = false }) => {
  const [commentaires, setCommentaires] = useState([]);
  const [editedComments, setEditedComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);   // id du commentaire en cours de sauvegarde
  const [transmitting, setTransmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Charger les commentaires au montage
  useEffect(() => {
    const fetchCommentaires = async () => {
      try {
        const { data } = await API.get(`/validations/${validation._id}/commentaires`);
        const list = Array.isArray(data) ? data : [];
        setCommentaires(list);
        // Initialiser les inputs avec commentaire_admin s'il existe, sinon commentaire_client
        const init = {};
        list.forEach(c => { init[c._id] = c.commentaire_admin || c.commentaire_client || ""; });
        setEditedComments(init);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchCommentaires();
  }, [validation._id]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // Sauvegarder un commentaire admin
  const handleSaveComment = async (commentaireId) => {
    setSaving(commentaireId);
    try {
      await API.patch(`/commentaires-elements/${commentaireId}`, {
        commentaire_admin: editedComments[commentaireId],
      });
      setCommentaires(prev => prev.map(c =>
        c._id === commentaireId ? { ...c, commentaire_admin: editedComments[commentaireId] } : c
      ));
      showToast("success", "Sauvegardé ✅");
    } catch { showToast("error", "Erreur sauvegarde"); }
    finally { setSaving(null); }
  };

  // Sauvegarder TOUS les commentaires modifiés puis transmettre
  const handleTransmettre = async () => {
    setTransmitting(true);
    try {
      // 1. Sauvegarder tous les commentaires modifiés
      const toSave = commentaires.filter(c =>
        editedComments[c._id] !== (c.commentaire_admin || c.commentaire_client || "")
      );
      await Promise.all(toSave.map(c =>
        API.patch(`/commentaires-elements/${c._id}`, { commentaire_admin: editedComments[c._id] })
      ));

      // 2. Transmettre au designer
      await API.patch(`/validations/${validation._id}/transmettre`);

      showToast("success", "✅ Transmis au designer !");
      setTimeout(() => {
        onTransmitted && onTransmitted(validation._id);
        onClose();
      }, 1200);
    } catch { showToast("error", "Erreur transmission."); setTransmitting(false); }
  };

  const avecContenu = commentaires.filter(c => c.commentaire_client || c.commentaire_admin);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(5px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, width: "100%", maxWidth: 600, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0 }}>
              Réclamations — Version {versionNum}
            </h3>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
              Client : <strong style={{ color: "#374151" }}>{clientNom}</strong>
              {projetNom && <> · Projet : <strong style={{ color: "#374151" }}>{projetNom}</strong></>}
            </p>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0" }}>
              Vous pouvez modifier les commentaires avant transmission au designer.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#64748B", display: "flex", flexShrink: 0, marginLeft: 12 }}><X size={18} /></button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ margin: "12px 24px 0", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: toast.type === "success" ? "#059669" : "#DC2626", color: "white" }}>
            {toast.msg}
          </div>
        )}

        {/* Corps */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader size={24} color="#6366F1" style={{ animation: "spin 1s linear infinite" }} /></div>
          ) : avecContenu.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94A3B8", fontSize: 13 }}>
              ⚠️ Rejet général — le client n'a pas laissé de remarques spécifiques.
            </div>
          ) : (
            avecContenu.map((c, i) => (
              <div key={c._id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", border: "1px solid #E2E8F0" }}>
                {/* Label élément */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  🔲 Élément : {c.label_element || c.id_element || `Élément ${i + 1}`}
                </div>

                {/* Commentaire original du client (lecture seule) */}
                <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic", background: "rgba(100,116,139,0.06)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                  💬 <strong>Client :</strong> "{c.commentaire_client || "—"}"
                </div>

                {/* Champ éditable pour l'admin */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <Edit3 size={11} /> Votre version (transmise au designer)
                  {c.commentaire_admin && c.commentaire_admin !== c.commentaire_client && (
                    <span style={{ background: "rgba(245,158,11,0.1)", color: "#D97706", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>Modifié</span>
                  )}
                </div>
                <textarea
                  value={editedComments[c._id] ?? ""}
                  onChange={e => setEditedComments(p => ({ ...p, [c._id]: e.target.value }))}
                  rows={3}
                  placeholder="Reformuler ou compléter le commentaire pour le designer…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", transition: "border-color .2s" }}
                  onFocus={e => e.target.style.borderColor = "#6366F1"}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <button onClick={() => handleSaveComment(c._id)} disabled={saving === c._id}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(5,150,105,0.1)", color: "#059669", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {saving === c._id ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Sauvegarde…</> : <><CheckCircle size={12} /> Sauvegarder</>}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — bouton Confirmer & Transmettre */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 9, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleTransmettre}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isEditMode ? "green" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "white", border: "none", borderRadius: 9, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: transmitting || loading ? "not-allowed" : "pointer", opacity: transmitting || loading ? 0.7 : 1, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
            {transmitting ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Transmission…</> :
              <><Send size={15} /> {isEditMode ? "Modifier" : "Confirmer & Transmettre au designer"}</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── AdminFeedbacks ─────────────────────────────────────────────────────────────
const AdminFeedbacks = () => {
  const navigate = useNavigate();
  const [projets, setProjets] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [designersByProjet, setDesignersByProjet] = useState({});
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [maquetteData, setMaquetteData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [edit, setEdit] = useState(false)


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

  // Quand une validation est transmise → la marquer localement
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
      p.date_début ? new Date(p.date_début).toLocaleDateString("fr-FR") : "",
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
      const fbType = val?.statut === "validé" ? "Validé" : val?.statut === "à corriger" ? "Refusé" : "En attente";
      const recap = val?.commentaires?.length ? `${val.commentaires.length} remarque(s)` : "";
      return [ `V${v.numéro_version}`, fbType, recap, v.date_creation ? new Date(v.date_creation).toLocaleDateString("fr-FR") : "" ];
    });
    exportBeautifulExcel({ title: `Versions feedbacks - ${projetNom}`, headers, rows, filenamePrefix: `admin-feedbacks-versions-${projetNom}`, sheetName: "Versions" });
  };

  return (
    <div>
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

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: "#1E293B" }}>Feedbacks</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>Consultez les retours clients et transmettez les corrections aux designers.</p>
        <button onClick={exportProjetsExcel} style={{ background:"#0f766e", color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", cursor:"pointer", fontWeight:600, fontSize:12 }}>
          Exporter Excel
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader size={28} color="#2563EB" className="spin" /></div>
        ) : projets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}><MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} /><p>Aucun projet.</p></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                    <tr style={{ borderBottom: isSelected ? "none" : "1px solid #F8FAFC", background: isSelected ? "#EFF6FF" : idx % 2 === 0 ? "white" : "#FAFBFF" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1E293B" }}>{p.nom}</div>
                        {p.description && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{p.description.slice(0, 45)}{p.description.length > 45 ? "…" : ""}</div>}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.id_client?.nom?.charAt(0) || "?"}</div>
                          <div><div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{p.id_client?.nom || "—"}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{p.id_client?.email || ""}</div></div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748B" }}>{new Date(p.date_début).toLocaleDateString("fr-FR")}</td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748B" }}>{new Date(p.date_fin).toLocaleDateString("fr-FR")}</td>
                      <td style={{ padding: "14px 20px" }}><StatutBadge statut={p.statut} /></td>
                      <td style={{ padding: "14px 20px" }}><AvatarStack designers={designers} /></td>
                      <td style={{ padding: "14px 20px" }}>
                        <button onClick={() => handleVoirFeedbacks(p)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 13, fontWeight: 600, padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                          {isSelected ? "▲ Masquer" : "Voir Feedbacks"}
                        </button>
                      </td>
                    </tr>

                    {isSelected && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ background: "#F8FBFF", borderTop: "2px solid #BFDBFE", borderBottom: "1px solid #E2E8F0", padding: "24px 32px" }}>
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
                                      <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
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

                                          const fbType = fb?.type || (val?.statut === "validé" ? "Val" : val?.statut === "à corriger" ? "Refus" : null);
                                          const isRefus = fbType === "Refus";
                                          const dejaTransmis = val?.transmis_designer;

                                          return (
                                            <tr key={v._id} style={{ borderBottom: "1px solid #F1F5F9", background: vi % 2 === 0 ? "white" : "#FAFBFF" }}>
                                              {/* Version */}
                                              <td style={{ padding: "12px 16px" }}>
                                                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "white", fontWeight: 700, fontSize: 13 }}>
                                                  V{v.numéro_version}
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
                                                        versionNum: v.numéro_version,
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
                                                      {
                                                        setReclModal({
                                                          validation: val,
                                                          projetNom: p.nom,
                                                          clientNom: p.id_client?.nom || "Client",
                                                          versionNum: v.numéro_version,
                                                          isEditMode: false
                                                        })
                                                      }
                                                      setEdit(false)
                                                    }
                                                    }
                                                    style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.14)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.08)"}
                                                  >
                                                    ⚠️ Voir réclamations & Transmettre
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

      <style>{`.spin{animation:spin 1s linear infinite;}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default AdminFeedbacks;