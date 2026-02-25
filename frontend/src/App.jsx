import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute'; // <-- Ajout ici
import Navbar from './components/Navbar';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import DesignerDashboard from './pages/DesignerDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar /> 
        
        <Routes>
          {/* 🔴 Route publique STRICTE (bloquée si connecté) */}
          <Route 
            path="/login" 
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            } 
          />
          
          {/* 🟢 Routes Protégées selon le rôle */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/client" 
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/designer" 
            element={
              <ProtectedRoute allowedRoles={['designer']}>
                <DesignerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Redirection par défaut : renvoie à l'accueil selon statut */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;