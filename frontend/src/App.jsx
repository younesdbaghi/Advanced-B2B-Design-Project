import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import DashboardLayout from './components/DashboardLayout'; // <-- Ajout du Layout

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import DesignerDashboard from './pages/DesignerDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Le Layout enveloppe toutes nos routes */}
        <DashboardLayout>
          <Routes>
            {/* Route Login */}
            <Route 
              path="/login" 
              element={<GuestRoute><Login /></GuestRoute>} 
            />
            
            {/* Routes Admin */}
            <Route 
              path="/admin" 
              element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} 
            />
            
            {/* Routes Client */}
            <Route 
              path="/client" 
              element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} 
            />
            
            {/* Routes Designer */}
            <Route 
              path="/designer" 
              element={<ProtectedRoute allowedRoles={['designer']}><DesignerDashboard /></ProtectedRoute>} 
            />

            {/* Redirection */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DashboardLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;