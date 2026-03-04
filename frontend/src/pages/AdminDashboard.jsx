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
  Eye,
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

  // États pour l'édition
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("client");

  // État pour la visualisation
  const [viewingUser, setViewingUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // État pour la confirmation de suppression
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, nom }
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  // Visualisation
  const openViewModal = (user) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingUser(null);
  };

  // Édition
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditNom(user.nom);
    setEditEmail(user.email);
    setEditRole(user.rôle);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditNom("");
    setEditEmail("");
    setEditRole("client");
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const { data } = await API.put(`/utilisateurs/${editingUser._id}`, {
        nom: editNom,
        email: editEmail,
        rôle: editRole,
      });

      setMessage({
        type: 'success',
        text: '✅ Utilisateur mis à jour avec succès.',
      });
      closeEditModal();
      fetchUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erreur : ${error.response?.data?.message || "Impossible de mettre à jour l'utilisateur"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Suppression
  const confirmDelete = (user) => {
    setDeleteTarget({ id: user._id, nom: user.nom });
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/utilisateurs/${deleteTarget.id}`);
      setMessage({ type: 'success', text: '✅ Utilisateur supprimé avec succès.' });
      fetchUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erreur lors de la suppression : ${error.response?.data?.message || "Erreur inconnue"}`
      });
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Icône du rôle
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
        <div className="error-message" style={{
          backgroundColor: message.type === 'success' ? '#e3f9e5' : '#ffe3e5',
          color: message.type === 'success' ? '#2a9d8f' : '#e63946',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '6px'
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
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? <Loader className="spin" size={18} /> : <UserPlus size={18} />}
            {loading ? 'Création en cours...' : "Créer l'utilisateur"}
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
                        onClick={() => openViewModal(u)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginRight: '8px' }}
                        title="Voir"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(u)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginRight: '8px' }}
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => confirmDelete(u)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
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

      {/* Modal de visualisation */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>Détails de l'utilisateur</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Nom :</strong> {viewingUser.nom}</div>
              <div><strong>Email :</strong> {viewingUser.email}</div>
              <div><strong>Rôle :</strong> {viewingUser.rôle}</div>
              {viewingUser.date_inscription && (
                <div><strong>Date d'inscription :</strong> {new Date(viewingUser.date_inscription).toLocaleString()}</div>
              )}
              {viewingUser.dernier_connexion && (
                <div><strong>Dernière connexion :</strong> {new Date(viewingUser.dernier_connexion).toLocaleString()}</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={closeViewModal}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>Modifier l'utilisateur</h3>
            <form onSubmit={handleUpdateUser}>
              <div className="input-group">
                <label>Nom complet</label>
                <div className="input-wrapper">
                  <User size={18} />
                  <input
                    type="text"
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
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
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Rôle</label>
                <div className="input-wrapper">
                  {editRole === 'client' ? <User size={18} /> : <Palette size={18} />}
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="client">Client</option>
                    <option value="designer">Designer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <Loader className="spin" size={18} /> : 'Enregistrer'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeEditModal}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px', color: '#e63946' }}>Confirmer la suppression</h3>
            <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{deleteTarget.nom}</strong> ?</p>
            <p style={{ fontSize: '0.9rem', color: '#6c757d' }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-danger"
                onClick={executeDelete}
                style={{
                  backgroundColor: '#e63946',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .btn-secondary {
          background: #e2e8f0;
          color: #2d3748;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-secondary:hover {
          background: #cbd5e0;
        }
        .btn-danger {
          background-color: #e63946;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-danger:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;