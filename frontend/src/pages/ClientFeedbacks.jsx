import React, { useState, useEffect, useContext } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import {
  Loader, Eye, CheckCircle, XCircle,
  MessageSquare, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Badge statut version ──────────────────────────────────────────────────────
const VersionStatutBadge = ({ type }) => {
  if (!type)
    return <span style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>En attente</span>;

  const cfg = {
    Val:   { label: "Validé",      color: "#059669", bg: "rgba(5,150,105,0.1)",  icon: <CheckCircle size={12} /> },
    Refus: { label: "Refusé",      color: "#DC2626", bg: "rgba(220,38,38,0.1)",  icon: <XCircle size={12} />     },
    Com:   { label: "Commentaire", color: "#D97706", bg: "rgba(217,119,6,0.1)",  icon: <MessageSquare size={12} /> },
  }[type] || { label: type, color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: null };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: "4px 12px",
      fontSize: 12, fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Badge statut projet ───────────────────────────────────────────────────────
const StatutBadge = ({ statut }) => {
  const cfg = {
    "En cours":    { color: "#2563EB", bg: "rgba(37,99,235,0.1)"  },
    "En attente":  { color: "#D97706", bg: "rgba(217,119,6,0.1)"  },
    "En révision": { color: "#D97706", bg: "rgba(217,119,6,0.1)"  },
    "Validé":      { color: "#059669", bg: "rgba(5,150,105,0.1)"  },
    "Refusé":      { color: "#DC2626", bg: "rgba(220,38,38,0.1)"  },
    "Terminé":     { color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
  }[statut] || { color: "#64748B", bg: "rgba(100,116,139,0.1)" };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: "4px 12px",
      fontSize: 12, fontWeight: 700,
    }}>
      {statut}
    </span>
  );
};

// ── ClientFeedbacks ───────────────────────────────────────────────────────────
const ClientFeedbacks = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [projets, setProjets]               = useState([]);
  const [fetching, setFetching]             = useState(true);
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [fbData, setFbData]                 = useState({});
  const [loadingFb, setLoadingFb]           = useState({});

  // ── Charger les projets du client (le serveur filtre déjà par client) ───────
  useEffect(() => {
    const load = async () => {
      setFetching(true);
      try {
        const { data } = await API.get("/projets");
        // Le server retourne déjà les projets du client connecté
        // On exclut juste les demandes en attente non encore acceptées
        const mesProjets = Array.isArray(data)
          ? data.filter(p => !(p.demanded && p.statut === "En attente"))
          : [];
        setProjets(mesProjets);
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [user]);

  // ── Toggle + chargement lazy des feedbacks ────────────────────────────────
  const handleToggle = async (projetId) => {
    if (selectedProjet === projetId) { setSelectedProjet(null); return; }
    setSelectedProjet(projetId);
    if (fbData[projetId]) return; // déjà chargé

    setLoadingFb(prev => ({ ...prev, [projetId]: true }));
    try {
      const { data: liste } = await API.get(`/maquettes/projet/${projetId}`);
      // GET /maquettes/projet/:id retourne un TABLEAU
      const maquette = Array.isArray(liste) && liste.length > 0 ? liste[0] : null;

      if (!maquette) {
        setFbData(prev => ({ ...prev, [projetId]: { maquette: null, versions: [], feedbacks: [] } }));
        return;
      }

      const [versRes, fbRes] = await Promise.all([
        API.get(`/versions/maquette/${maquette._id}`),
        API.get(`/validations/maquette/${maquette._id}`),
      ]);

      // /validations/maquette/:id retourne { validations, feedbacks }
      const fbData = fbRes.data;
      const feedbacks = Array.isArray(fbData) ? fbData : (fbData?.feedbacks || fbData?.validations || []);

      setFbData(prev => ({
        ...prev,
        [projetId]: {
          maquette,
          versions:  Array.isArray(versRes.data) ? versRes.data : [],
          feedbacks,
        },
      }));
    } catch (e) {
      console.error(e);
      setFbData(prev => ({ ...prev, [projetId]: { maquette: null, versions: [], feedbacks: [] } }));
    } finally {
      setLoadingFb(prev => ({ ...prev, [projetId]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: "#1E293B" }}>
        Historique des feedbacks
      </h1>
      <p style={{ color: "#64748B", fontSize: 14, marginBottom: 28 }}>
        Consultez les retours sur les versions de vos projets.
      </p>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader size={28} color="#2563EB" className="spin" />
          </div>
        ) : projets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}>
            <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p>Aucun projet disponible.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFF", borderBottom: "1px solid #F1F5F9" }}>
                {["Projet", "Date début", "Date fin", "Statut", "Feedbacks"].map(h => (
                  <th key={h} style={{
                    padding: "13px 20px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: "#64748B",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projets.map((p, idx) => {
                const isOpen    = selectedProjet === p._id;
                const isLoading = loadingFb[p._id];
                const data      = fbData[p._id];

                return (
                  // ✅ FIX : key sur le Fragment au lieu du <tr> enfant
                  <React.Fragment key={p._id}>
                    {/* ── Ligne projet ── */}
                    <tr style={{
                      borderBottom: isOpen ? "none" : "1px solid #F8FAFC",
                      background: isOpen ? "#EFF6FF" : idx % 2 === 0 ? "white" : "#FAFBFF",
                    }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1E293B" }}>{p.nom}</div>
                        {p.description && (
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                            {p.description.slice(0, 45)}{p.description.length > 45 ? "…" : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748B" }}>
                        {new Date(p.date_début).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748B" }}>
                        {new Date(p.date_fin).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <StatutBadge statut={p.statut} />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <button
                          onClick={() => handleToggle(p._id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#2563EB", fontSize: 13, fontWeight: 600,
                            display: "inline-flex", alignItems: "center", gap: 5, padding: 0,
                          }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                        >
                          {isLoading
                            ? <Loader size={13} className="spin" />
                            : isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          }
                          {isOpen ? "Masquer" : "Voir Feedbacks"}
                        </button>
                      </td>
                    </tr>

                    {/* ── Panneau détail ── */}
                    {isOpen && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div style={{
                            background: "#F8FBFF",
                            borderTop: "2px solid #BFDBFE",
                            borderBottom: "1px solid #E2E8F0",
                            padding: "20px 32px",
                          }}>
                            {isLoading ? (
                              <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                                <Loader size={20} color="#2563EB" className="spin" />
                              </div>
                            ) : !data ? null
                            : data.maquette === null ? (
                              <div style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "12px 16px", borderRadius: 10,
                                background: "#FFFBEB", border: "1px solid #FDE68A",
                                color: "#92400E", fontSize: 13,
                              }}>
                                <AlertCircle size={16} />
                                Aucune maquette créée pour ce projet.
                              </div>
                            ) : (
                              <>
                                {/* Lien maquette */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Maquette :</span>
                                  <button
                                    onClick={() => navigate(`/client/editeur/${data.maquette._id}`)}
                                    style={{
                                      background: "none", border: "none", cursor: "pointer",
                                      color: "#2563EB", fontSize: 13, fontWeight: 600,
                                      textDecoration: "underline", padding: 0,
                                      display: "inline-flex", alignItems: "center", gap: 4,
                                    }}
                                  >
                                    <Eye size={13} /> voir maquette
                                  </button>
                                </div>

                                {/* Tableau versions */}
                                {data.versions.length === 0 ? (
                                  <p style={{ fontSize: 13, color: "#94A3B8" }}>Aucune version disponible.</p>
                                ) : (
                                  <table style={{
                                    width: "100%", borderCollapse: "collapse",
                                    background: "white", borderRadius: 10,
                                    overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                  }}>
                                    <thead>
                                      <tr style={{ background: "#F1F5F9" }}>
                                        {["Version", "Statut", "Votre commentaire", "Date"].map(h => (
                                          <th key={h} style={{
                                            padding: "10px 16px", textAlign: "left",
                                            fontSize: 11, fontWeight: 700, color: "#64748B",
                                            textTransform: "uppercase", letterSpacing: "0.04em",
                                          }}>
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {data.versions.map((v, vi) => {
                                        const fb = data.feedbacks.find(
                                          f => String(f.id_version?._id || f.id_version || f.version_id?._id || f.version_id) === String(v._id)
                                            && (f.type === "Val" || f.type === "Refus" || f.statut === "validé" || f.statut === "à corriger")
                                        );
                                        const fbType    = fb?.type || (fb?.statut === "validé" ? "Val" : fb?.statut === "à corriger" ? "Refus" : null);
                                        const fbComment = fb?.commentaire || fb?.justification || "";
                                        return (
                                          <tr key={v._id} style={{
                                            borderBottom: "1px solid #F1F5F9",
                                            background: vi % 2 === 0 ? "white" : "#FAFBFF",
                                          }}>
                                            <td style={{ padding: "11px 16px" }}>
                                              <div style={{
                                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                width: 32, height: 32, borderRadius: 8,
                                                background: "linear-gradient(135deg,#4F46E5,#7C3AED)",
                                                color: "white", fontWeight: 700, fontSize: 12,
                                              }}>
                                                V{v.numéro_version}
                                              </div>
                                            </td>
                                            <td style={{ padding: "11px 16px" }}>
                                              <VersionStatutBadge type={fbType} />
                                            </td>
                                            <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151", maxWidth: 300 }}>
                                              {fb?.justification
                                                ? <span style={{ fontStyle: "italic", color: "#64748B" }}>"{fb.justification}"</span>
                                                : fbComment
                                                  ? <span style={{ color: "#94A3B8" }}>{fbComment}</span>
                                                  : <span style={{ color: "#CBD5E1" }}>—</span>
                                              }
                                            </td>
                                            <td style={{ padding: "11px 16px", fontSize: 12, color: "#94A3B8" }}>
                                              {new Date(v.date_creation).toLocaleDateString("fr-FR")}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
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
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientFeedbacks;
