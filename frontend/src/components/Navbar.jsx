import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null; // On ne montre pas la navbar sur la page login

  return (
    <nav style={{ padding: '10px 20px', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <strong>DevPortal B2B</strong>
        <span style={{ marginLeft: '15px', fontStyle: 'italic' }}>
          ({user.rôle})
        </span>
      </div>
      <div>
        {/* Affichage conditionnel des liens selon le rôle */}
        {user.rôle === 'admin' && <Link to="/admin" style={{ color: 'white', marginRight: '15px' }}>Dashboard Admin</Link>}
        {user.rôle === 'client' && <Link to="/client" style={{ color: 'white', marginRight: '15px' }}>Dashboard Client</Link>}
        {user.rôle === 'designer' && <Link to="/designer" style={{ color: 'white', marginRight: '15px' }}>Dashboard Designer</Link>}
        
        <button onClick={logout} style={{ cursor: 'pointer' }}>Déconnexion</button>
      </div>
    </nav>
  );
};

export default Navbar;