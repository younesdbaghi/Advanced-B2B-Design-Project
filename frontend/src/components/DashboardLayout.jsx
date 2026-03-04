import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, UserCircle, Briefcase,FileSignature,Layers,Users,FolderOpen,Bell} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return children;

  const menuItems = {
    admin: [
      { path: '/admin/utilisateurs', icon: <Users size={20} />,      label: 'Utilisateurs' },
      { path: '/admin/projets',      icon: <FolderOpen size={20} />, label: 'Projets' },
      { path: '/admin/demandes', icon: <Bell size={20} />, label: 'Demandes' },
    ],
    client: [
      { path: '/client', icon: <Briefcase size={20} />, label: 'Mes Projets' },
    ],
    designer: [
      { path: '/designer', icon: <FileSignature size={20} />, label: 'Mes Maquettes' },
    ],
  };

  const currentMenu = menuItems[user.rôle] || [];

  const currentLabel =
    currentMenu.find(item => location.pathname.startsWith(item.path))?.label || 'Tableau de bord';

  return (
    <div className="layout-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <Layers color="var(--primary-color)" /> DevPortal
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentMenu.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        <button
          onClick={logout}
          className="menu-item"
          style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', color: 'var(--danger)' }}
        >
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="main-content">
        {/* TOPBAR */}
        <div className="topbar">
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{currentLabel}</h2>
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{user.nom}</span>
              <span className="user-role">{user.rôle}</span>
            </div>
            <div className="user-avatar">
              <UserCircle size={32} />
            </div>
          </div>
        </div>

        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
