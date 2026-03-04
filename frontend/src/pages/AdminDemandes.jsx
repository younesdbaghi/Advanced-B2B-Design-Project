import { useState, useEffect, useRef } from "react";
import API from "../api";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  Check,
  XCircle,
  Filter,
  ArrowUpDown,
  CheckCheck,
  X,
  Trash2
} from 'lucide-react';

const AdminDemandes = () => {
  const [demandes, setDemandes] = useState([]);
  const [filteredDemandes, setFilteredDemandes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);
  
  const sliderRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const menuRef = useRef(null);

  const fetchDemandes = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/projets");
      const enAttente = Array.isArray(data)
        ? data.filter(p => p.demanded && p.statut === 'En attente')
        : [];
      setDemandes(enAttente);
      setCurrentIndex(0);
    } catch { 
      console.error("Erreur demandes"); 
    } finally { 
      setFetching(false); 
    }
  };

  useEffect(() => { fetchDemandes(); }, []);

  // Fermer le menu si on clique outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trier les demandes quand l'ordre change ou que les demandes sont mises à jour
  useEffect(() => {
    sortDemandes();
  }, [demandes, sortOrder]);

  const sortDemandes = () => {
    const sorted = [...demandes].sort((a, b) => {
      const dateA = new Date(a.date_creation || a.createdAt || Date.now());
      const dateB = new Date(b.date_creation || b.createdAt || Date.now());
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Plus récent d'abord
      } else {
        return dateA - dateB; // Plus ancien d'abord
      }
    });
    setFilteredDemandes(sorted);
    
    // Ajuster l'index courant si nécessaire
    if (sorted.length > 0 && demandes.length > 0) {
      const currentDemande = demandes[currentIndex];
      const newIndex = sorted.findIndex(d => d._id === currentDemande._id);
      setCurrentIndex(newIndex !== -1 ? newIndex : 0);
    }
  };

  const handleAccepter = async (id) => {
    try {
      await API.patch(`/projets/${id}/accepter`);
      setMsg({ type: 'success', text: 'Projet accepté !' });
      fetchDemandes();
    } catch { 
      setMsg({ type: 'error', text: 'Erreur acceptation.' }); 
    }
  };

  const handleRefuser = async (id) => {
    try {
      await API.patch(`/projets/${id}/refuser`);
      setMsg({ type: 'error', text: 'Demande refusée.' });
      fetchDemandes();
    } catch { 
      setMsg({ type: 'error', text: 'Erreur refus.' }); 
    }
  };

  const handleAccepterTout = async () => {
    if (filteredDemandes.length === 0) return;
    
    setProcessingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const demande of filteredDemandes) {
      try {
        await API.patch(`/projets/${demande._id}/accepter`);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setMsg({ 
      type: successCount > 0 ? 'success' : 'error', 
      text: `${successCount} demande(s) acceptée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}` 
    });
    
    fetchDemandes();
    setProcessingBulk(false);
  };

  const handleRefuserTout = async () => {
    if (filteredDemandes.length === 0) return;
    
    setProcessingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const demande of filteredDemandes) {
      try {
        await API.patch(`/projets/${demande._id}/refuser`);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setMsg({ 
      type: 'error', 
      text: `${successCount} demande(s) refusée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}` 
    });
    
    fetchDemandes();
    setProcessingBulk(false);
  };

  const handlePrevious = () => {
    if (isAnimating || filteredDemandes.length === 0) return;
    setIsAnimating(true);
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredDemandes.length - 1));
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection('');
      }, 50);
    }, 300);
  };

  const handleNext = () => {
    if (isAnimating || filteredDemandes.length === 0) return;
    setIsAnimating(true);
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev < filteredDemandes.length - 1 ? prev + 1 : 0));
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection('');
      }, 50);
    }, 300);
  };

  // Touch handlers pour swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '1.5rem',
    },
    header: {
      marginBottom: '1.5rem',
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.5rem',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#1E293B',
    },
    subtitle: {
      color: '#64748B',
      fontSize: '0.875rem',
    },
    actionsBar: {
      display: 'flex',
      gap: '0.75rem',
      marginBottom: '1rem',
      flexWrap: 'wrap',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 1rem',
      backgroundColor: '#FEF3C7',
      color: '#D97706',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
    },
    sortButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 1rem',
      backgroundColor: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#475569',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    sortMenu: {
      position: 'relative',
    },
    sortDropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '0.5rem',
      backgroundColor: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 50,
      minWidth: '200px',
      overflow: 'hidden',
    },
    sortOption: {
      padding: '0.75rem 1rem',
      cursor: 'pointer',
      fontSize: '0.875rem',
      color: '#1E293B',
      transition: 'background 0.2s',
      borderBottom: '1px solid #F1F5F9',
    },
    bulkActions: {
      display: 'flex',
      gap: '0.5rem',
      marginLeft: 'auto',
    },
    bulkButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 1rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
    },
    acceptAllButton: {
      backgroundColor: '#ECFDF5',
      color: '#059669',
      border: '1px solid #A7F3D0',
    },
    rejectAllButton: {
      backgroundColor: '#FEF2F2',
      color: '#DC2626',
      border: '1px solid #FECACA',
    },
    message: {
      base: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
      },
      success: {
        backgroundColor: '#ECFDF5',
        color: '#059669',
        border: '1px solid #A7F3D0',
      },
      error: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #FECACA',
      },
    },
    loaderContainer: {
      display: 'flex',
      justifyContent: 'center',
      padding: '3rem',
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      backgroundColor: '#F8FAFC',
      borderRadius: '12px',
      border: '2px dashed #E2E8F0',
    },
    sliderWrapper: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '16px',
      marginBottom: '1rem',
    },
    sliderContainer: {
      display: 'flex',
      transition: 'transform 0.3s ease-in-out',
      transform: `translateX(${slideDirection === 'left' ? '-100%' : slideDirection === 'right' ? '100%' : '0%'})`,
    },
    slide: {
      flex: '0 0 100%',
      opacity: isAnimating ? 0 : 1,
      transition: 'opacity 0.2s ease',
    },
    card: {
      backgroundColor: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    },
    cardContent: {
      padding: '1.25rem',
    },
    headerCard: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
    },
    statusBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.25rem 0.75rem',
      backgroundColor: '#FEF3C7',
      color: '#D97706',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: '600',
    },
    dateText: {
      fontSize: '0.7rem',
      color: '#94A3B8',
    },
    projectName: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#1E293B',
      marginBottom: '0.5rem',
    },
    description: {
      fontSize: '0.8rem',
      color: '#64748B',
      lineHeight: '1.5',
      marginBottom: '1rem',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    clientInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      backgroundColor: '#F8FAFC',
      borderRadius: '10px',
      marginBottom: '1rem',
    },
    clientAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.8rem',
      fontWeight: '600',
      flexShrink: 0,
    },
    clientName: {
      fontSize: '0.8rem',
      fontWeight: '600',
      color: '#1E293B',
    },
    clientEmail: {
      fontSize: '0.7rem',
      color: '#64748B',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    },
    datesContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.5rem',
      marginBottom: '1rem',
    },
    dateBox: {
      backgroundColor: '#F1F5F9',
      borderRadius: '8px',
      padding: '0.5rem',
    },
    dateLabel: {
      fontSize: '0.6rem',
      color: '#64748B',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: '0.15rem',
    },
    dateValue: {
      fontSize: '0.75rem',
      color: '#1E293B',
      fontWeight: '600',
    },
    actions: {
      display: 'flex',
      gap: '0.5rem',
    },
    buttonAccept: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
      padding: '0.6rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.75rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    buttonReject: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
      padding: '0.6rem',
      backgroundColor: 'white',
      color: '#DC2626',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      fontSize: '0.75rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      marginTop: '1rem',
    },
    navButton: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: 'white',
      border: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1rem',
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: '#CBD5E1',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    dotActive: {
      width: '20px',
      borderRadius: '3px',
      backgroundColor: '#D97706',
    },
    counter: {
      textAlign: 'center',
      marginTop: '0.5rem',
      fontSize: '0.7rem',
      color: '#94A3B8',
    },
    processingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
  };

  const currentDemande = filteredDemandes[currentIndex] || null;

  return (
    <div style={styles.container}>
      {/* Processing overlay */}
      {processingBulk && (
        <div style={styles.processingOverlay}>
          <Loader size={48} color="#D97706" />
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Demandes clients</h1>
          
          {/* Menu de tri */}
          <div style={styles.sortMenu} ref={menuRef}>
            <button 
              style={styles.sortButton}
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <Filter size={14} />
              Trier par
              <ArrowUpDown size={14} />
            </button>
            
            {showSortMenu && (
              <div style={styles.sortDropdown}>
                <div 
                  style={{
                    ...styles.sortOption,
                    backgroundColor: sortOrder === 'newest' ? '#FEF3C7' : 'white',
                    fontWeight: sortOrder === 'newest' ? '600' : '400',
                  }}
                  onClick={() => {
                    setSortOrder('newest');
                    setShowSortMenu(false);
                  }}
                >
                  🆕 Plus récent d'abord
                </div>
                <div 
                  style={{
                    ...styles.sortOption,
                    backgroundColor: sortOrder === 'oldest' ? '#FEF3C7' : 'white',
                    fontWeight: sortOrder === 'oldest' ? '600' : '400',
                    borderBottom: 'none',
                  }}
                  onClick={() => {
                    setSortOrder('oldest');
                    setShowSortMenu(false);
                  }}
                >
                  📅 Plus ancien d'abord
                </div>
              </div>
            )}
          </div>
        </div>
        <p style={styles.subtitle}>Gérez les demandes en attente</p>
      </div>

      {/* Barre d'actions */}
      {!fetching && filteredDemandes.length > 0 && (
        <div style={styles.actionsBar}>
          <div style={styles.badge}>
            <Clock size={14} />
            <span>{filteredDemandes.length} en attente</span>
          </div>

          <div style={styles.bulkActions}>
            <button
              style={{
                ...styles.bulkButton,
                ...styles.acceptAllButton,
                opacity: processingBulk ? 0.5 : 1,
              }}
              onClick={handleAccepterTout}
              disabled={processingBulk}
              onMouseEnter={e => !processingBulk && (e.currentTarget.style.backgroundColor = '#D1FAE5')}
              onMouseLeave={e => !processingBulk && (e.currentTarget.style.backgroundColor = '#ECFDF5')}
            >
              <CheckCheck size={14} />
              Tout accepter
            </button>
            <button
              style={{
                ...styles.bulkButton,
                ...styles.rejectAllButton,
                opacity: processingBulk ? 0.5 : 1,
              }}
              onClick={handleRefuserTout}
              disabled={processingBulk}
              onMouseEnter={e => !processingBulk && (e.currentTarget.style.backgroundColor = '#FEE2E2')}
              onMouseLeave={e => !processingBulk && (e.currentTarget.style.backgroundColor = '#FEF2F2')}
            >
              <X size={14} />
              Tout refuser
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {msg.text && (
        <div style={{
          ...styles.message.base,
          ...(msg.type === 'success' ? styles.message.success : styles.message.error),
        }}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Loading */}
      {fetching && (
        <div style={styles.loaderContainer}>
          <Loader size={32} color="#D97706" />
        </div>
      )}

      {/* Empty */}
      {!fetching && filteredDemandes.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <div style={{ fontWeight: '600', color: '#475569' }}>Aucune demande</div>
        </div>
      )}

      {/* Slider avec effet de glissement */}
      {!fetching && filteredDemandes.length > 0 && currentDemande && (
        <>
          <div 
            style={styles.sliderWrapper}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div style={styles.sliderContainer} ref={sliderRef}>
              <div style={styles.slide}>
                <div style={styles.card}>
                  <div style={styles.cardContent}>
                    {/* Header */}
                    <div style={styles.headerCard}>
                      <span style={styles.statusBadge}>
                        <Clock size={12} />
                        En attente
                      </span>
                      <span style={styles.dateText}>
                        {new Date(currentDemande.date_creation || currentDemande.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {/* Project name */}
                    <h3 style={styles.projectName}>{currentDemande.nom}</h3>
                    
                    {/* Description */}
                    {currentDemande.description && (
                      <p style={styles.description}>{currentDemande.description}</p>
                    )}

                    {/* Client */}
                    <div style={styles.clientInfo}>
                      <div style={styles.clientAvatar}>
                        {currentDemande.id_client?.nom?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={styles.clientName}>
                          {currentDemande.id_client?.nom || 'Client'}
                        </div>
                        <div style={styles.clientEmail}>
                          <Mail size={10} />
                          {currentDemande.id_client?.email || 'Email'}
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div style={styles.datesContainer}>
                      <div style={styles.dateBox}>
                        <div style={styles.dateLabel}>Début</div>
                        <div style={styles.dateValue}>
                          {new Date(currentDemande.date_début).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div style={styles.dateBox}>
                        <div style={styles.dateLabel}>Fin</div>
                        <div style={styles.dateValue}>
                          {new Date(currentDemande.date_fin).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={styles.actions}>
                      <button
                        onClick={() => handleAccepter(currentDemande._id)}
                        style={styles.buttonAccept}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#047857'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#059669'}
                        disabled={processingBulk}
                      >
                        <Check size={14} />
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRefuser(currentDemande._id)}
                        style={styles.buttonReject}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#DC2626';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#DC2626';
                        }}
                        disabled={processingBulk}
                      >
                        <XCircle size={14} />
                        Refuser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={styles.navigationButtons}>
            <button
              onClick={handlePrevious}
              style={styles.navButton}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              disabled={isAnimating || processingBulk}
            >
              <ChevronLeft size={18} color="#4B5563" />
            </button>
            <button
              onClick={handleNext}
              style={styles.navButton}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              disabled={isAnimating || processingBulk}
            >
              <ChevronRight size={18} color="#4B5563" />
            </button>
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            {filteredDemandes.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index > currentIndex) {
                    setSlideDirection('left');
                  } else if (index < currentIndex) {
                    setSlideDirection('right');
                  }
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentIndex(index);
                    setTimeout(() => {
                      setIsAnimating(false);
                      setSlideDirection('');
                    }, 50);
                  }, 300);
                }}
                style={{
                  ...styles.dot,
                  ...(index === currentIndex ? styles.dotActive : {}),
                }}
                disabled={isAnimating || processingBulk}
              />
            ))}
          </div>

          {/* Counter */}
          <div style={styles.counter}>
            {currentIndex + 1} / {filteredDemandes.length}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDemandes;