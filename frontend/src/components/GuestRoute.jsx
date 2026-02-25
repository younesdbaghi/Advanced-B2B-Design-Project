import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const GuestRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Si l'utilisateur est déjà connecté, on le renvoie vers son propre dashboard
  if (user) {
    return <Navigate to={`/${user.rôle}`} replace />;
  }

  // Sinon, on le laisse accéder à la page (ex: Login)
  return children;
};

export default GuestRoute;