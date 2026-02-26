import { useState, useEffect } from "react";
import API from "../api";
import { 
  UserPlus, 
  Mail, 
  User, 
  Briefcase, 
  Palette, 
  Trash2, 
  Edit, 
  Loader, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Récupérer la liste des utilisateurs
  const fetchUsers = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/utilisateurs");
      setUsers(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs", error);
      setMessage({ 
        type: 'error', 
        text: "Impossible de charger les utilisateurs." 
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Création d'un utilisateur
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const { data } = await API.post("/utilisateurs", {
        nom,
        email,
        rôle: role,
      });

      setMessage({
        type: 'success',
        text: `✅ ${data.message}${data.mot_de_passe_temp ? ` (Mot de passe temporaire : ${data.mot_de_passe_temp})` : ''}`
      });

      // Réinitialiser le formulaire et rafraîchir la liste
      setNom("");
      setEmail("");
      fetchUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erreur : ${error.response?.data?.message || "Impossible de créer l'utilisateur"}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Suppression d'un utilisateur (si l'API le permet)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    try {
      await API.delete(`/utilisateurs/${userId}`); // Adaptez l'endpoint selon votre API
      setMessage({ type: 'success', text: 'Utilisateur supprimé avec succès.' });
      fetchUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erreur lors de la suppression : ${error.response?.data?.message || "Erreur inconnue"}`
      });
    }
  };

  // Récupération de l'icône du rôle
  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Briefcase size={16} />;
      case 'designer': return <Palette size={16} />;
      default: return <User size={16} />;
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
        Gestion des utilisateurs
      </h1>

      {/* Message de notification */}
      {message.text && (
        <div className={`error-message`} style={{ 
          backgroundColor: message.type === 'success' ? '#e3f9e5' : '#ffe3e5',
          color: message.type === 'success' ? '#2a9d8f' : '#e63946',
          marginBottom: '24px'
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Carte de création d'utilisateur */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={20} /> Créer un nouvel utilisateur
        </h3>

        <form onSubmit={handleCreateUser}>
          <div className="input-group">
            <label>Nom complet</label>
            <div className="input-wrapper">
              <User size={18} />
              <input
                type="text"
                placeholder="Jean Dupont"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Adresse email</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                placeholder="jean.dupont@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Rôle</label>
            <div className="input-wrapper">
              {role === 'client' ? <User size={18} /> : <Palette size={18} />}
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="client">Client</option>
                <option value="designer">Designer</option>
                {/* Le rôle admin n'est généralement pas créé depuis l'interface */}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? <Loader className="spin" size={18} /> : <UserPlus size={18} />}
            {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
          </button>
        </form>
      </div>

      {/* Liste des utilisateurs */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Liste des utilisateurs</h3>

        {fetching ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader className="spin" size={32} color="var(--primary-color)" />
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                          {u.nom?.charAt(0) || 'U'}
                        </div>
                        {u.nom}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge" style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: u.rôle === 'admin' ? 'rgba(233, 57, 70, 0.1)' : undefined,
                        color: u.rôle === 'admin' ? 'var(--danger)' : undefined
                      }}>
                        {getRoleIcon(u.rôle)}
                        {u.rôle}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => alert('Fonction d\'édition à implémenter')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          marginRight: '8px'
                        }}
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--danger)'
                        }}
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Style pour l'animation de rotation (à ajouter dans votre CSS global si vous le souhaitez) */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;