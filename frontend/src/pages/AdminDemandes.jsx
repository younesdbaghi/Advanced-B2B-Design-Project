import { useEffect, useRef, useState } from "react";
import API from "../api";
import {
  ArrowUpDown,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader,
  Mail,
  X,
  XCircle,
  AlertCircle,
} from "lucide-react";

const AdminDemandes = () => {
  const [demandes, setDemandes] = useState([]);
  const [filteredDemandes, setFilteredDemandes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);

  const menuRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const fetchDemandes = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/projets");
      const pending = Array.isArray(data)
        ? data.filter((p) => p.demanded && p.statut === "En attente")
        : [];
      setDemandes(pending);
      setCurrentIndex(0);
    } catch {
      setMsg({ type: "error", text: "Impossible de charger les demandes." });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const sorted = [...demandes].sort((a, b) => {
      const dateA = new Date(a.date_creation || a.createdAt || Date.now());
      const dateB = new Date(b.date_creation || b.createdAt || Date.now());
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredDemandes(sorted);

    if (!sorted.length) {
      setCurrentIndex(0);
      return;
    }

    const currentDemande = filteredDemandes[currentIndex];
    const newIndex = sorted.findIndex((d) => d._id === currentDemande?._id);
    setCurrentIndex(newIndex !== -1 ? newIndex : 0);
  }, [demandes, sortOrder]);

  const handleAccepter = async (id) => {
    try {
      await API.patch(`/projets/${id}/accepter`);
      setMsg({ type: "success", text: "Projet accepte." });
      fetchDemandes();
    } catch {
      setMsg({ type: "error", text: "Erreur acceptation." });
    }
  };

  const handleRefuser = async (id) => {
    try {
      await API.patch(`/projets/${id}/refuser`);
      setMsg({ type: "error", text: "Demande refusee." });
      fetchDemandes();
    } catch {
      setMsg({ type: "error", text: "Erreur refus." });
    }
  };

  const handleAccepterTout = async () => {
    if (!filteredDemandes.length) return;

    setProcessingBulk(true);
    let successCount = 0;
    let errorCount = 0;

    for (const demande of filteredDemandes) {
      try {
        await API.patch(`/projets/${demande._id}/accepter`);
        successCount += 1;
      } catch {
        errorCount += 1;
      }
    }

    setMsg({
      type: successCount > 0 ? "success" : "error",
      text: `${successCount} demande(s) acceptee(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
    });

    fetchDemandes();
    setProcessingBulk(false);
  };

  const handleRefuserTout = async () => {
    if (!filteredDemandes.length) return;

    setProcessingBulk(true);
    let successCount = 0;
    let errorCount = 0;

    for (const demande of filteredDemandes) {
      try {
        await API.patch(`/projets/${demande._id}/refuser`);
        successCount += 1;
      } catch {
        errorCount += 1;
      }
    }

    setMsg({
      type: "error",
      text: `${successCount} demande(s) refusee(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
    });

    fetchDemandes();
    setProcessingBulk(false);
  };

  const handlePrevious = () => {
    if (!filteredDemandes.length) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredDemandes.length - 1));
  };

  const handleNext = () => {
    if (!filteredDemandes.length) return;
    setCurrentIndex((prev) => (prev < filteredDemandes.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      if (diff < 0) handlePrevious();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const currentDemande = filteredDemandes[currentIndex] || null;
  const demandeDate = currentDemande
    ? new Date(currentDemande.date_creation || currentDemande.createdAt || Date.now()).toLocaleDateString("fr-FR")
    : "";
  const demandeStartDate = currentDemande
    ? currentDemande["date_début"] || currentDemande["date_début"] || currentDemande.date_debut
    : null;

  return (
    <div className="admin-page demandes-page">
      {processingBulk && (
        <div className="demandes-overlay">
          <div className="demandes-overlay__content">
            <Loader size={34} className="spin" />
            <span>Traitement des demandes...</span>
          </div>
        </div>
      )}

      <div className="admin-page-header">
        <div className="admin-page-copy">
          <span className="admin-page-sup">
            <Clock size={14} />
            Administration
          </span>
          <h1 className="admin-page-title">Demandes clients</h1>
          <p className="admin-page-text">
            Validez les demandes en attente plus vite.
          </p>
        </div>

        <div className="admin-page-actions demandes-actions-wrap">
          <div className="admin-chip">
            <Clock size={15} />
            {filteredDemandes.length} en attente
          </div>

          <div className="demandes-sort" ref={menuRef}>
            <button className="admin-btn admin-btn--ghost" onClick={() => setShowSortMenu((prev) => !prev)}>
              <Filter size={15} />
              Trier
              <ArrowUpDown size={14} />
            </button>

            {showSortMenu && (
              <div className="demandes-sort-menu">
                <button
                  className={sortOrder === "newest" ? "is-active" : ""}
                  onClick={() => {
                    setSortOrder("newest");
                    setShowSortMenu(false);
                  }}
                >
                  Plus recent d abord
                </button>
                <button
                  className={sortOrder === "oldest" ? "is-active" : ""}
                  onClick={() => {
                    setSortOrder("oldest");
                    setShowSortMenu(false);
                  }}
                >
                  Plus ancien d abord
                </button>
              </div>
            )}
          </div>

          <button
            className="admin-btn admin-btn--secondary"
            onClick={handleAccepterTout}
            disabled={processingBulk || !filteredDemandes.length}
          >
            <CheckCheck size={15} />
            Tout accepter
          </button>

          <button
            className="admin-btn admin-btn--danger"
            onClick={handleRefuserTout}
            disabled={processingBulk || !filteredDemandes.length}
          >
            <X size={15} />
            Tout refuser
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`admin-alert ${msg.type === "success" ? "admin-alert--success" : "admin-alert--error"}`}>
          {msg.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {fetching && (
        <div className="card">
          <div className="admin-empty-state">
            <Loader size={32} className="spin" />
            <div>Chargement des demandes...</div>
          </div>
        </div>
      )}

      {!fetching && !filteredDemandes.length && (
        <div className="card">
          <div className="admin-empty-state">
            <Clock size={34} />
            <div>Aucune demande en attente.</div>
          </div>
        </div>
      )}

      {!fetching && currentDemande && (
        <div
          className="card demande-card"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="admin-section-head">
            <div>
              <div className="admin-section-title">Demande en cours de revue</div>
              <p className="admin-section-text">
                Carte {currentIndex + 1} / {filteredDemandes.length}
              </p>
            </div>

            <div className="demande-stage">
              <Clock size={14} />
              En attente
            </div>
          </div>

          <div className="demande-card__content">
            <div className="demande-main">
              <div className="demande-date">{demandeDate}</div>
              <h2>{currentDemande.nom}</h2>
              {currentDemande.description && <p>{currentDemande.description}</p>}

              <div className="demande-client">
                <div className="demande-client__avatar">
                  {currentDemande.id_client?.nom?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <strong>{currentDemande.id_client?.nom || "Client"}</strong>
                  <span>
                    <Mail size={12} />
                    {currentDemande.id_client?.email || "Email non renseigne"}
                  </span>
                </div>
              </div>
            </div>

            <div className="demande-meta-grid">
              <div className="demande-meta">
                <span>Debut</span>
                <strong>
                  <Calendar size={14} />
                  {demandeStartDate ? new Date(demandeStartDate).toLocaleDateString("fr-FR") : "-"}
                </strong>
              </div>
              <div className="demande-meta">
                <span>Fin</span>
                <strong>
                  <Calendar size={14} />
                  {new Date(currentDemande.date_fin).toLocaleDateString("fr-FR")}
                </strong>
              </div>
            </div>
          </div>

          <div className="demande-actions">
            <button
              className="admin-btn admin-btn--secondary"
              onClick={() => handleAccepter(currentDemande._id)}
              disabled={processingBulk}
            >
              <Check size={15} />
              Accepter
            </button>

            <button
              className="admin-btn admin-btn--danger"
              onClick={() => handleRefuser(currentDemande._id)}
              disabled={processingBulk}
            >
              <XCircle size={15} />
              Refuser
            </button>
          </div>

          <div className="demande-navigation">
            <button className="demande-nav-btn" onClick={handlePrevious} disabled={processingBulk}>
              <ChevronLeft size={18} />
            </button>

            <div className="demande-dots">
              {filteredDemandes.map((demande, index) => (
                <button
                  key={demande._id || index}
                  className={index === currentIndex ? "is-active" : ""}
                  onClick={() => setCurrentIndex(index)}
                  disabled={processingBulk}
                />
              ))}
            </div>

            <button className="demande-nav-btn" onClick={handleNext} disabled={processingBulk}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .demandes-page { max-width: none; }
        .demandes-actions-wrap { align-items: center; }
        .demandes-sort { position: relative; }
        .demandes-sort-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 220px;
          padding: 8px;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(255,255,255,0.96);
          box-shadow: 0 24px 60px rgba(15,23,42,0.12);
          backdrop-filter: blur(16px);
          z-index: 5;
        }
        .demandes-sort-menu button {
          width: 100%;
          border: none;
          background: transparent;
          padding: 11px 14px;
          border-radius: 14px;
          text-align: left;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
        }
        .demandes-sort-menu button.is-active {
          background: rgba(37,99,235,0.08);
          color: #2563eb;
        }
        .demandes-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(15,23,42,0.28);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .demandes-overlay__content {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 18px 22px;
          border-radius: 22px;
          background: rgba(255,255,255,0.94);
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow: 0 24px 60px rgba(15,23,42,0.14);
          color: #0f172a;
          font-weight: 700;
        }
        .demande-card__content {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.9fr);
          gap: 18px;
          align-items: start;
        }
        .demande-main h2 {
          margin: 12px 0 0;
          font-size: clamp(1.8rem, 2.8vw, 2.5rem);
          line-height: 1.02;
          letter-spacing: -0.05em;
          color: #0f172a;
        }
        .demande-main p {
          margin: 14px 0 0;
          color: #526277;
          line-height: 1.75;
          font-size: 15px;
        }
        .demande-date {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(37,99,235,0.08);
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
        }
        .demande-stage {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(245,158,11,0.12);
          color: #b45309;
          border: 1px solid rgba(245,158,11,0.18);
          font-size: 12px;
          font-weight: 700;
        }
        .demande-client {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          padding: 16px;
          border-radius: 22px;
          background: rgba(248,250,252,0.78);
          border: 1px solid rgba(148,163,184,0.14);
        }
        .demande-client__avatar {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: #fff;
          font-weight: 800;
          box-shadow: 0 14px 32px rgba(37,99,235,0.18);
        }
        .demande-client strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
        }
        .demande-client span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          color: #64748b;
          font-size: 13px;
        }
        .demande-meta-grid {
          display: grid;
          gap: 12px;
        }
        .demande-meta {
          padding: 18px;
          border-radius: 22px;
          background: rgba(248,250,252,0.78);
          border: 1px solid rgba(148,163,184,0.14);
        }
        .demande-meta span {
          display: block;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .demande-meta strong {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-size: 15px;
        }
        .demande-actions {
          display: flex;
          gap: 12px;
          margin-top: 22px;
          flex-wrap: wrap;
        }
        .demande-navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 22px;
        }
        .demande-nav-btn {
          width: 44px;
          height: 44px;
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 16px;
          background: rgba(255,255,255,0.86);
          color: #0f172a;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
        }
        .demande-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .demande-dots button {
          width: 8px;
          height: 8px;
          border: none;
          border-radius: 999px;
          background: rgba(148,163,184,0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .demande-dots button.is-active {
          width: 24px;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
        }
        @media (max-width: 900px) {
          .demande-card__content {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .demandes-actions-wrap {
            width: 100%;
          }
          .demandes-sort {
            width: 100%;
          }
          .demandes-sort > button {
            width: 100%;
          }
          .demande-actions {
            flex-direction: column;
          }
          .demande-actions .admin-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDemandes;
