import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  LogOut, History, UserCircle, Briefcase, FileSignature,
  Layers, Users, FolderOpen, Bell, X, MessageSquare
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import API from '../api';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [showNotif, setShowNotif]         = useState(false);
  const notifRef = useRef(null);

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
        // ✅ Notifs dynamiques : corrections transmises par l'admin
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

  // Fermer si clic dehors
  useEffect(() => {
    const handle = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
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
      // Pour designer : marque toutes lues localement (pas de route bulk pour l'instant)
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
    if (d < 1)  return "À l'instant";
    if (d < 60) return `Il y a ${d} min`;
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${j}j`;
  };

  const getIcon = (type) => ({
    validation: '✅', refus: '❌', demande: '📋', correction: '⚠️',
  }[type] || '🔔');

  if (!user) return children;

  const menuItems = {
    admin: [
      { path: '/admin/utilisateurs', icon: <Users size={20} />,         label: 'Utilisateurs' },
      { path: '/admin/projets',      icon: <FolderOpen size={20} />,    label: 'Projets' },
      { path: '/admin/demandes',     icon: <Bell size={20} />,          label: 'Demandes' },
      { path: '/admin/feedbacks',    icon: <MessageSquare size={20} />, label: 'Feedbacks' },
      { path: '/admin/history',      icon: <History size={20} />,       label: 'Rapport Historique' },
    ],
    client: [
      { path: '/client',           icon: <Briefcase size={20} />,     label: 'Mes Projets' },
      { path: '/client/feedbacks', icon: <MessageSquare size={20} />, label: 'Feedbacks' },
    ],
    designer: [
      { path: '/designer',         icon: <FileSignature size={20} />, label: 'Tableau de bord' },
      { path: '/designer/history', icon: <History size={20} />,       label: 'Rapport Historique' },
    ],
  };

  const currentMenu = menuItems[user.rôle] || [];

  const isActive = (itemPath) => {
    const sorted = [...currentMenu].sort((a, b) => b.path.length - a.path.length);
    const bestMatch = sorted.find(item => location.pathname.startsWith(item.path));
    return bestMatch?.path === itemPath;
  };

  const currentLabel =
    [...currentMenu]
      .sort((a, b) => b.path.length - a.path.length)
      .find(item => location.pathname.startsWith(item.path))?.label || 'Tableau de bord';

  // ─────────────────────────────────────────────────────────
  return (
    <div className="layout-container">

      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <Layers size={22} color="var(--primary)" />
          <span>DevPortal</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {currentMenu.map((item, index) => (
            <Link key={index} to={item.path} className={`menu-item ${isActive(item.path) ? 'active' : ''}`}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        <button onClick={logout} className="menu-item logout-btn">
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>

      {/* ── MAIN ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <div className="topbar">
          <h2>{currentLabel}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* ── CLOCHE — admin + designer uniquement ── */}
            {(user.rôle === 'admin' || user.rôle === 'designer') && (
              <div style={{ position: 'relative' }} ref={notifRef}>
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
                  <Bell size={20} color={unreadCount > 0 ? (user.rôle === 'designer' ? '#DC2626' : '#2563EB') : '#64748B'} />
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

            {/* Profil utilisateur */}
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user.nom}</span>
                <span className="user-role">{user.rôle}</span>
              </div>
              <div className="user-avatar">
                {user.nom?.charAt(0)?.toUpperCase() || <UserCircle size={22} />}
              </div>
            </div>
          </div>
        </div>

        <div className="content-area">
          {children}
        </div>
      </div>

      <style>{`
        .logout-btn { color: var(--danger) !important; margin-top: 8px; border-top: 1px solid var(--border-light); padding-top: 16px; }
        .logout-btn:hover { background: var(--danger-bg) !important; color: var(--danger) !important; }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
