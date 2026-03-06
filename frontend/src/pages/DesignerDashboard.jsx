import { useState, useEffect, useContext } from "react";
import { Palette, Calendar, CheckCircle, Clock, XCircle, Eye, BellRing, Bell } from "lucide-react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

const DesignerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [marking, setMarking]           = useState(null); // id en cours de marquage

  const fetchMesProjets = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/affectations/mes-projets");
      setAffectations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur fetch projets designer", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMesProjets(); }, []);

  const handleMarquerLu = async (affectationId) => {
    setMarking(affectationId);
    try {
      await API.patch(`/affectations/${affectationId}/lire`);
      // Mettre à jour localement sans refetch
      setAffectations(prev =>
        prev.map(a => a._id === affectationId ? { ...a, lu: true } : a)
      );
    } catch (err) {
      console.error("Erreur marquage lu", err);
    } finally {
      setMarking(null);
    }
  };

  const projets        = affectations.map(a => a.id_projet).filter(Boolean);
  const totalAssignes  = affectations.length;
  const enCours        = projets.filter(p => p?.statut === "En cours").length;
  const termines       = projets.filter(p => p?.statut === "Terminé").length;
  const nonLus         = affectations.filter(a => !a.lu).length;

  const getStatutBadge = (statut) => {
    const map = {
      "En cours":    { color: "#2563EB", bg: "rgba(37,99,235,0.1)",  icon: <Clock size={12}/> },
      "En révision": { color: "#D97706", bg: "rgba(217,119,6,0.1)",  icon: <Eye size={12}/> },
      "Validé":      { color: "#059669", bg: "rgba(5,150,105,0.1)",  icon: <CheckCircle size={12}/> },
      "Refusé":      { color: "#DC2626", bg: "rgba(220,38,38,0.1)",  icon: <XCircle size={12}/> },
      "Terminé":     { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: <CheckCircle size={12}/> },
    };
    return map[statut] || { color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: null };
  };

  const getUrgencyColor = (dateFin) => {
    if (!dateFin) return "#64748B";
    const diff = Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return "#DC2626";
    if (diff <= 3) return "#DC2626";
    if (diff <= 7) return "#D97706";
    return "#059669";
  };

  const stats = [
    { label: "Projets assignés",  value: totalAssignes, color: "#2563EB", bg: "rgba(37,99,235,0.08)",  icon: <Palette size={20} color="#2563EB"/> },
    { label: "Non lus",           value: nonLus,        color: "#F59E0B", bg: "rgba(245,158,11,0.08)", icon: <BellRing size={20} color="#F59E0B"/> },
    { label: "En cours",          value: enCours,       color: "#059669", bg: "rgba(5,150,105,0.08)",  icon: <Clock size={20} color="#059669"/> },
    { label: "Terminés",          value: termines,      color: "#7C3AED", bg: "rgba(124,58,237,0.08)", icon: <CheckCircle size={20} color="#7C3AED"/> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E2A4A", marginBottom: 6 }}>
          Bonjour, {user?.nom} 👋
        </h1>
        <p style={{ color: "#64748B", fontSize: 14 }}>Voici vos projets assignés.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14, border: "1px solid #F1F5F9" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bannière non lus */}
      {nonLus > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, marginBottom: 24 }}>
          <BellRing size={18} color="#F59E0B"/>
          <span style={{ fontSize: 14, color: "#92400E", fontWeight: 600 }}>
            Vous avez {nonLus} nouvelle{nonLus > 1 ? "s" : ""} assignation{nonLus > 1 ? "s" : ""} non lue{nonLus > 1 ? "s" : ""}. Cliquez sur "Marquer comme lu" pour confirmer.
          </span>
        </div>
      )}

      {/* Table projets */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1E2A4A" }}>
            Mes projets ({totalAssignes})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p>Chargement...</p>
          </div>
        ) : affectations.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(37,99,235,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Palette size={28} color="#2563EB"/>
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, color: "#374151" }}>Aucun projet assigné pour le moment.</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>L'admin vous assignera bientôt à un projet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
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
                {affectations.map((a) => {
                  const p  = a.id_projet;
                  const sc = getStatutBadge(p?.statut);
                  const urgColor = getUrgencyColor(p?.date_fin);
                  const isNew = !a.lu;

                  return (
                    <tr key={a._id} style={{ background: isNew ? "rgba(245,158,11,0.04)" : "white" }}>
                      {/* Projet */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Point orange si non lu */}
                          {isNew && (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }}/>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 14 }}>{p?.nom || "—"}</div>
                            {p?.description && (
                              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{p.description.slice(0, 60)}...</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                            {p?.id_client?.nom?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.id_client?.nom || "—"}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{p?.id_client?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Date fin */}
                      <td>
                        {p?.date_fin ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Calendar size={13} color={urgColor}/>
                            <span style={{ fontSize: 13, fontWeight: 600, color: urgColor }}>
                              {new Date(p.date_fin).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        ) : "—"}
                      </td>

                      {/* Statut */}
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: sc.bg, color: sc.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                          {sc.icon}{p?.statut || "—"}
                        </span>
                      </td>

                      {/* Assigné le */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
                          <Calendar size={12}/>
                          {new Date(a.date_affectation).toLocaleDateString("fr-FR")}
                        </div>
                      </td>

                      {/* Lu */}
                      <td style={{ textAlign: "center" }}>
                        {a.lu ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(5,150,105,0.1)", color: "#059669", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                            <CheckCircle size={13}/> Lu
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarquerLu(a._id)}
                            disabled={marking === a._id}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "white", border: "none", borderRadius: 20, padding: "5px 14px", cursor: marking === a._id ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, opacity: marking === a._id ? 0.7 : 1, transition: "all .2s" }}
                          >
                            <Bell size={13}/>
                            {marking === a._id ? "..." : "Marquer lu"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignerDashboard;
