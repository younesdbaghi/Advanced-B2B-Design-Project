import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, UserCircle, Briefcase, FileSignature, Layers } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return children;

  const menuItems = {
    admin:[
      { path: '/admin', icon: <UserCircle size={20} />, label: 'Mes utilisateurs' },
      // Tu pourras ajouter d'autres liens ici plus tard
    ],
    client:[
      { path: '/client', icon: <Briefcase size={20} />, label: 'Mes Projets' },
    ],
    designer:[
      { path: '/designer', icon: <FileSignature size={20} />, label: 'Mes Maquettes' },
    ]
  };

  const currentMenu = menuItems[user.rôle] ||[];

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
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
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
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            {currentMenu.find(item => item.path === location.pathname)?.label || 'Tableau de bord'}
          </h2>
          
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

        {/* PAGES (Le contenu de tes dashboards s'affichera ici) */}
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;