import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  LogOut, History, UserCircle, Briefcase, FileSignature,
  Layers, Users, FolderOpen, Bell, X, MessageSquare, Key,
  CheckCircle2, XCircle, FileText
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import API from '../api';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isEditorRoute = location.pathname.includes("/editeur/");

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // ── Fetch selon le rôle ───────────────────────────────────
  const fetchNotifs = async () => {
    if (!user) return;
    try {
      if (user.rôle === 'admin') {
        const { data } = await API.get('/notifications');
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.lu).length);
      } else if (user.rôle === 'designer') {
        const { data } = await API.get('/notifications/designer');
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.lu).length);
      }
      // client : pas de notifs pour l'instant
    } catch (err) {
      console.error('Erreur notifications', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    if (user.rôle === 'admin' || user.rôle === 'designer') {
      const interval = setInterval(fetchNotifs, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fermer les menus si clic dehors
  useEffect(() => {
    const handle = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Actions ───────────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      if (user.rôle === 'admin') {
        await API.patch('/notifications/mark-all-read');
      }
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const markOneAsRead = async (id) => {
    try {
      if (user.rôle === 'admin') {
        await API.patch(`/notifications/${id}/read`);
      } else if (user.rôle === 'designer') {
        await API.patch(`/notifications/designer/${id}/read`);
      }
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, lu: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const deleteNotif = async (id) => {
    const notif = notifications.find(n => n._id === id);
    try {
      if (user.rôle === 'admin') await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notif && !notif.lu) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const formatTimeAgo = (date) => {
    const d = Math.floor((new Date() - new Date(date)) / 60000);
    const h = Math.floor(d / 60);
    const j = Math.floor(h / 24);
    if (d < 1) return "À l'instant";
    if (d < 60) return `Il y a ${d} min`;
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${j}j`;
  };

  const getIcon = (type) => {
    const commonProps = { size: 18, strokeWidth: 2.1 };

    if (type === 'validation') return <CheckCircle2 {...commonProps} color="#059669" />;
    if (type === 'refus') return <XCircle {...commonProps} color="#dc2626" />;
    if (type === 'demande') return <FileText {...commonProps} color="#2563eb" />;
    if (type === 'correction') return <XCircle {...commonProps} color="#dc2626" />;
    return <Bell {...commonProps} color="#2563eb" />;
  };

  const getNotifTone = (type) => {
    if (type === 'refus') return 'danger';
    if (type === 'correction') return 'danger';
    if (type === 'validation') return 'success';
    return userRole === 'designer' ? 'danger' : 'info';
  };

  const getNotifLabel = (type) => ({
    validation: 'Validation',
    refus: 'Refus',
    demande: 'Nouvelle demande',
    correction: 'Correction',
  }[type] || 'Notification');

  const NotificationTypeIcon = ({ type }) => {
    const tone = getNotifTone(type);
    const commonProps = { size: 18, strokeWidth: 2.1 };

    if (type === 'validation') return <CheckCircle2 {...commonProps} color="#059669" />;
    if (type === 'refus') return <XCircle {...commonProps} color="#dc2626" />;
    if (type === 'demande') return <FileText {...commonProps} color="#2563eb" />;
    if (type === 'correction') return <AlertTriangle {...commonProps} color="#d97706" />;
    return <Bell {...commonProps} color={tone === 'danger' ? '#dc2626' : '#2563eb'} />;
  };

  const handleChangePassword = () => {
    setShowUserMenu(false);
    navigate('/change');
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  if (!user) return children;

  const userRole = user?.["r\u00f4le"] || user?.role || "";

  const menuItems = {
    admin: [
      { path: '/admin/utilisateurs', icon: <Users size={20} />, label: 'Utilisateurs' },
      { path: '/admin/projets', icon: <FolderOpen size={20} />, label: 'Projets' },
      { path: '/admin/demandes', icon: <Bell size={20} />, label: 'Demandes' },
      { path: '/admin/feedbacks', icon: <MessageSquare size={20} />, label: 'Feedbacks' },
      { path: '/admin/history', icon: <History size={20} />, label: 'Rapport Historique' },
    ],
    client: [
      { path: '/client', icon: <Briefcase size={20} />, label: 'Mes Projets' },
      { path: '/client/feedbacks', icon: <MessageSquare size={20} />, label: 'Feedbacks' },
    ],
    designer: [
      { path: '/designer', icon: <FileSignature size={20} />, label: 'Tableau de bord' },
      { path: '/designer/history', icon: <History size={20} />, label: 'Rapport Historique' },
    ],
  };

  const currentMenu = menuItems[userRole] || [];

  const isActive = (itemPath) => {
    const sorted = [...currentMenu].sort((a, b) => b.path.length - a.path.length);
    const bestMatch = sorted.find(item => location.pathname.startsWith(item.path));
    return bestMatch?.path === itemPath;
  };

  const currentLabel =
    [...currentMenu]
      .sort((a, b) => b.path.length - a.path.length)
      .find(item => location.pathname.startsWith(item.path))?.label || 'Tableau de bord';

  const roleLabelSafe =
    userRole === 'admin'
      ? 'Espace Admin'
      : userRole === 'designer'
        ? 'Espace Designer'
        : 'Espace Client';

  /*

  const roleLabel =
    user.rôle === 'admin'
      ? 'Espace Admin'
      : user.rôle === 'designer'
        ? 'Espace Designer'
        : 'Espace Client';

  // ─────────────────────────────────────────────────────────
  */
  return (
    /*
    <div className={`layout-container dashboard-shell dashboard-shell--${user.rôle}`}>

    */
    <div className={`layout-container dashboard-shell dashboard-shell--${userRole}${isEditorRoute ? ' dashboard-shell--editor' : ''}`}>

      {/* ── SIDEBAR ── */}
      <div className="sidebar dashboard-sidebar">
        <div className="sidebar-logo">
          <Layers size={22} color="var(--primary)" />
          <div className="sidebar-logo__copy">
            <span>DevPortal</span>
            <small>{roleLabelSafe}</small>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {currentMenu.map((item, index) => (
            <Link key={index} to={item.path} className={`menu-item ${isActive(item.path) ? 'active' : ''}`}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        <button onClick={handleLogout} className="menu-item logout-btn">
          <LogOut size={20} />
          Déconnexion
        </button>

        <div className="sidebar-footer">
          <div className="sidebar-footer__label">Session active</div>
          <div>{user.nom}</div>
          <div style={{ color: 'rgba(203, 213, 225, 0.56)' }}>{user.email}</div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <div className="topbar dashboard-topbar">
          <div className="dashboard-topbar__title-block">
            <span className="dashboard-topbar__eyebrow">{roleLabelSafe}</span>
            <h2>{currentLabel}</h2>
          </div>

          <div className="dashboard-topbar__actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* ── CLOCHE — admin + designer uniquement ── */}
            {(userRole === 'admin' || userRole === 'designer' || userRole === 'client') && (
              <div className="notif-shell" ref={notifRef}>
                <button
                  onClick={() => { setShowNotif(prev => !prev); if (!showNotif && unreadCount > 0) markAllAsRead(); }}
                  style={{
                    position: 'relative',
                    background: unreadCount > 0 ? (user.rôle === 'designer' ? '#FFF5F5' : '#EFF6FF') : 'transparent',
                    border: unreadCount > 0 ? `1px solid ${user.rôle === 'designer' ? '#FECACA' : '#BFDBFE'}` : '1px solid transparent',
                    borderRadius: 10, padding: '7px 10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                  }}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -5, right: -5,
                      background: user.rôle === 'designer' ? '#DC2626' : '#EF4444',
                      color: 'white', borderRadius: '50%', width: 18, height: 18,
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid white',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotif && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                    width: 370, maxHeight: 460,
                    background: 'white', borderRadius: 14,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    border: '1px solid #E2E8F0',
                    zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBFF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span style={{ background: user.rôle === 'designer' ? '#FEF2F2' : '#EFF6FF', color: user.rôle === 'designer' ? '#DC2626' : '#2563EB', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {notifications.some(n => !n.lu) && (
                          <button onClick={markAllAsRead} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            Tout lu
                          </button>
                        )}
                        <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Liste */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94A3B8' }}>
                          <Bell size={32} style={{ marginBottom: 10, opacity: 0.25 }} />
                          <p style={{ fontSize: 13 }}>Aucune notification</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n._id}
                          onClick={() => !n.lu && markOneAsRead(n._id)}
                          style={{
                            padding: '12px 18px', borderBottom: '1px solid #F8FAFC',
                            background: n.lu ? 'white' : (user.rôle === 'designer' ? '#FFF5F5' : '#F0F7FF'),
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            cursor: n.lu ? 'default' : 'pointer', transition: 'background 0.15s',
                          }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: n.lu ? '#F1F5F9' : (user.rôle === 'designer' ? 'rgba(220,38,38,0.1)' : '#DBEAFE'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                            {getIcon(n.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#1E293B', fontWeight: n.lu ? 400 : 600 }}>
                              {n.message}
                            </p>
                            <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, display: 'block' }}>
                              {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {!n.lu && <span style={{ width: 7, height: 7, borderRadius: '50%', background: user.rôle === 'designer' ? '#DC2626' : '#2563EB', display: 'block' }} />}
                            {user.rôle === 'admin' && (
                              <button onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 2 }}>
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profil utilisateur avec dropdown */}
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <div 
                className="user-profile"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-info">
                  <span className="user-name">{user.nom}</span>
                  <span className="user-role">{userRole}</span>
                </div>
                <div className="user-avatar">
                  {user.nom?.charAt(0)?.toUpperCase() || <UserCircle size={22} />}
                </div>
              </div>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 240,
                  background: 'white',
                  borderRadius: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid #E2E8F0',
                  zIndex: 9999,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    background: '#FAFBFF'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1E293B' }}>
                      {user.nom}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {user.email}
                    </div>
                  </div>
                  
                  <div style={{ padding: '8px 0' }}>
                    <button
                      onClick={handleChangePassword}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        border: 'none',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#334155',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <Key size={18} color="#64748B" />
                      Changer le mot de passe
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        border: 'none',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#DC2626',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <LogOut size={18} color="#DC2626" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className={`content-area dashboard-content${isEditorRoute ? " dashboard-content--full" : ""}`}>
          {children}
        </div>
      </div>

      <style>{`
        .logout-btn { color: var(--danger) !important; margin-top: 8px; border-top: 1px solid var(--border-light); padding-top: 16px; }
        .logout-btn:hover { background: var(--danger-bg) !important; color: var(--danger) !important; }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .user-profile:hover {
          background: #F8FAFC;
        }
        .user-info {
          text-align: right;
        }
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          display: block;
        }
        .user-role {
          font-size: 11px;
          color: #64748B;
          text-transform: capitalize;
        }
        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0066FF 0%, #00A8FF 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }
        .notif-shell {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .notif-shell > button {
          position: relative !important;
          width: 42px !important;
          height: 42px !important;
          padding: 0 !important;
          border-radius: 14px !important;
          border: 1px solid rgba(191, 219, 254, 0.68) !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(239,246,255,0.92)) !important;
          color: #2563eb !important;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.12) !important;
          justify-content: center;
        }
        .notif-shell > button svg {
          width: 20px;
          height: 20px;
          display: block;
          stroke: currentColor;
          stroke-width: 2.2;
        }
        .notif-shell > button[style*='#FFF5F5'] {
          color: #dc2626 !important;
        }
        .notif-shell > button[style*='transparent'] {
          color: #64748b !important;
        }
        .notif-shell > button:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(37, 99, 235, 0.18) !important;
        }
        .notif-shell > button > span {
          min-width: 18px !important;
          height: 18px !important;
          padding: 0 4px !important;
          border-radius: 999px !important;
          border: 2px solid #fff !important;
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.22) !important;
        }
        .notif-shell > div {
          width: 380px !important;
          max-height: 500px !important;
          border-radius: 24px !important;
          border: 1px solid rgba(226, 232, 240, 0.92) !important;
          background: rgba(255,255,255,0.98) !important;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16) !important;
          overflow: hidden !important;
        }
        .notif-shell > div > div:first-child {
          padding: 16px 18px !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.86) !important;
          background: linear-gradient(180deg, #f8fbff, #f1f7ff) !important;
        }
        .notif-shell > div > div:first-child span:first-child {
          font-size: 15px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
        }
        .notif-shell > div > div:last-child {
          padding: 10px !important;
        }
        .notif-shell > div > div:last-child > div:first-child {
          padding: 28px 16px !important;
          border-radius: 18px;
          background: #f8fbff;
        }
        .notif-shell > div > div:last-child > div[style*='cursor: pointer'],
        .notif-shell > div > div:last-child > div[style*='cursor: default'] {
          padding: 13px 14px !important;
          border: 1px solid rgba(226, 232, 240, 0.86);
          border-radius: 18px !important;
          background: #ffffff !important;
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s !important;
        }
        .notif-shell > div > div:last-child > div[style*='cursor: pointer'] + div,
        .notif-shell > div > div:last-child > div[style*='cursor: default'] + div {
          margin-top: 8px;
        }
        .notif-shell > div > div:last-child > div[style*='cursor: pointer']:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.07);
        }
        .notif-shell > div > div:last-child > div[style*='#F0F7FF'] {
          border-color: rgba(147, 197, 253, 0.72) !important;
          background: linear-gradient(180deg, #ffffff, #f5faff) !important;
        }
        .notif-shell > div > div:last-child > div[style*='#FFF5F5'] {
          border-color: rgba(252, 165, 165, 0.72) !important;
          background: linear-gradient(180deg, #ffffff, #fff7f7) !important;
        }
        .notif-shell > div > div:last-child > div > div:first-child {
          width: 40px !important;
          height: 40px !important;
          border-radius: 14px !important;
          font-size: 0 !important;
        }
        .notif-shell > div > div:last-child > div > div:nth-child(2) p {
          font-size: 13px !important;
          line-height: 1.5 !important;
          color: #0f172a !important;
        }
        .notif-shell > div > div:last-child > div > div:nth-child(2) span {
          font-size: 11px !important;
          color: #64748b !important;
        }
        .notif-shell > div > div:last-child > div button {
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #fff !important;
          border: 1px solid rgba(226, 232, 240, 0.92) !important;
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;

