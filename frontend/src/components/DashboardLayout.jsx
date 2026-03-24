import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, History, UserCircle, Briefcase, FileSignature, Layers, Users, FolderOpen, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return children;

  const menuItems = {
    admin: [
      { path: '/admin/utilisateurs', icon: <Users size={20} />, label: 'Utilisateurs' },
      { path: '/admin/projets', icon: <FolderOpen size={20} />, label: 'Projets' },
      { path: '/admin/demandes', icon: <Bell size={20} />, label: 'Demandes' },
      { path: '/admin/history', icon: <History size={20} />, label: 'Rapport Historique' },
    ],
    client: [
      { path: '/client', icon: <Briefcase size={20} />, label: 'Mes Projets' },
    ],
    designer: [
      { path: '/designer', icon: <FileSignature size={20} />, label: 'Tableau de bord' },
      { path: '/designer/history', icon: <History size={20} />, label: 'Rapport Historique' },
    ],
  };

  const currentMenu = menuItems[user.rôle] || [];

  // ✅ FIX : on cherche l'item le plus long qui correspond (le plus spécifique)
  const isActive = (itemPath) => {
    // Tri par longueur décroissante pour trouver le match le plus précis
    const sorted = [...currentMenu].sort((a, b) => b.path.length - a.path.length);
    const bestMatch = sorted.find(item => location.pathname.startsWith(item.path));
    return bestMatch?.path === itemPath;
  };

  const currentLabel =
    [...currentMenu]
      .sort((a, b) => b.path.length - a.path.length)
      .find(item => location.pathname.startsWith(item.path))?.label || 'Tableau de bord';

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
            <Link
              key={index}
              to={item.path}
              className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        <button
          onClick={logout}
          className="menu-item logout-btn"
        >
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>

      {/* ── MAIN ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <div className="topbar">
          <h2>{currentLabel}</h2>
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{user.nom}</span>
              <span className="user-role">{user.rôle}</span>
            </div>
            <div className="user-avatar">
              {user.nom?.charAt(0)?.toUpperCase() || <UserCircle size={22} />}
            </div>
            <Link to={"/change"}>change password</Link>

          </div>
        </div>

        <div className="content-area">
          {children}
        </div>
      </div>

      <style>{`
        .logout-btn {
          color: var(--danger) !important;
          margin-top: 8px;
          border-top: 1px solid var(--border-light);
          padding-top: 16px;
        }
        .logout-btn:hover {
          background: var(--danger-bg) !important;
          color: var(--danger) !important;
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;