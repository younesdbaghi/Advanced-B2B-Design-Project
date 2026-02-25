import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AuthContext);

  // 1. Si l'utilisateur n'est pas connecté du tout -> go Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si connecté mais qu'il n'a pas le droit d'être sur cette page
  if (allowedRoles && !allowedRoles.includes(user.rôle)) {
    // On le redirige automatiquement vers SON espace à lui
    return <Navigate to={`/${user.rôle}`} replace />;
  }

  // 3. Tout est ok, on affiche la page
  return children;
};

export default ProtectedRoute;