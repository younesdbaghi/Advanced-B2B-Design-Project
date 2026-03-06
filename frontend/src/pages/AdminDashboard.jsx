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
  AlertCircle,
  FolderPlus,
  Calendar,
  Clock
} from 'lucide-react';

const AdminDashboard = () => {
  // ── Active tab ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('projets');

  // ── Utilisateurs ───────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // États pour l'édition d'utilisateurs
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

  // ── Projets ────────────────────────────────────────────────
  const [projets, setProjets] = useState([]);
  const [fetchingProjets, setFetchingProjets] = useState(true);
  const [showProjetForm, setShowProjetForm] = useState(false);
  const [projetLoading, setProjetLoading] = useState(false);
  const [projetMsg, setProjetMsg] = useState({ type: '', text: '' });

  const [projetForm, setProjetForm] = useState({
    nom: '',
    description: '',
    date_début: '',
    date_fin: '',
    statut: 'En cours',
    id_client: '',
    demanded: false,
  });

  // ── Fetch ──────────────────────────────────────────────────
  const fetchUsers = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/utilisateurs");
      setUsers(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs", error);
      setMessage({ type: 'error', text: "Impossible de charger les utilisateurs." });
    } finally {
      setFetching(false);
    }
  };

  const fetchProjets = async () => {
    setFetchingProjets(true);
    try {
      const { data } = await API.get("/projets");
      setProjets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur lors de la récupération des projets", error);
    } finally {
      setFetchingProjets(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProjets();
  }, []);

  // ── Méthodes Utilisateurs ──────────────────────────────────
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const { data } = await API.post("/utilisateurs", { nom, email, rôle: role });
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

  const openViewModal = (user) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingUser(null);
  };

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
      await API.put(`/utilisateurs/${editingUser._id}`, {
        nom: editNom,
        email: editEmail,
        rôle: editRole,
      });

      setMessage({ type: 'success', text: '✅ Utilisateur mis à jour avec succès.' });
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

  // ── Méthodes Projets ───────────────────────────────────────
  const handleCreateProjet = async (e) => {
    e.preventDefault();
    setProjetMsg({ type: '', text: '' });
    if (!projetForm.nom || !projetForm.id_client || !projetForm.date_début || !projetForm.date_fin) {
      setProjetMsg({ type: 'error', text: '❌ Nom, client, dates de début et fin sont obligatoires.' });
      return;
    }
    setProjetLoading(true);
    try {
      await API.post("/projets", projetForm);
      setProjetMsg({ type: 'success', text: '✅ Projet créé avec succès !' });
      setProjetForm({ nom: '', description: '', date_début: '', date_fin: '', statut: 'En cours', id_client: '', demanded: false });
      setShowProjetForm(false);
      fetchProjets();
    } catch (error) {
      setProjetMsg({ type: 'error', text: `❌ ${error.response?.data?.message || "Erreur création projet"}` });
    } finally {
      setProjetLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Briefcase size={16} />;
      case 'designer': return <Palette size={16} />;
      default: return <User size={16} />;
    }
  };


  const getStatutColor = (statut) => {
    const map = {
      'En cours': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
      'En révision': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
      'Validé': { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
      'Refusé': { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
      'Terminé': { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
    };
    return map[statut] || { color: '#64748B', bg: 'rgba(100,116,139,0.1)' };
  };

  const clients = users.filter(u => u.rôle === 'client');

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
        Dashboard Admin
      </h1>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #E2E8F0', paddingBottom: 0 }}>
        {[
          { id: 'projets', label: '📁 Projets' },
          { id: 'utilisateurs', label: '👥 Utilisateurs' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: 'transparent', borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === tab.id ? '#2563EB' : '#64748B',
              marginBottom: '-2px', borderRadius: '8px 8px 0 0',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          TAB PROJETS
      ════════════════════════════════════════════ */}
      {activeTab === 'projets' && (
        <div>
          {/* Message projet */}
          {projetMsg.text && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
              borderRadius: 10, marginBottom: 20,
              background: projetMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              color: projetMsg.type === 'success' ? '#059669' : '#DC2626',
              border: `1px solid ${projetMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            }}>
              {projetMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {projetMsg.text}
            </div>
          )}

          {/* Header + bouton créer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B' }}>
              Liste des projets ({projets.length})
            </h2>
            <button onClick={() => setShowProjetForm(!showProjetForm)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#2563EB', color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
                fontWeight: 600, fontSize: 14,
              }}>
              <FolderPlus size={18} />
              {showProjetForm ? 'Annuler' : 'Nouveau projet'}
            </button>
          </div>

          {/* ── Formulaire création projet ── */}
          {showProjetForm && (
            <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #2563EB', padding: 24 }}>
              <h3 style={{ marginBottom: 20, color: '#1E2A4A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderPlus size={20} /> Créer un nouveau projet
              </h3>

              <form onSubmit={handleCreateProjet}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Nom du projet *</label>
                    <input value={projetForm.nom}
                      onChange={e => setProjetForm({ ...projetForm, nom: e.target.value })}
                      placeholder="ex: Refonte site e-commerce"
                      required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Client *</label>
                    <select value={projetForm.id_client}
                      onChange={e => setProjetForm({ ...projetForm, id_client: e.target.value })}
                      required style={inputStyle}>
                      <option value="">Choisir un client</option>
                      {clients.map(c => (
                        <option key={c._id} value={c._id}>{c.nom} — {c.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date de début *</label>
                    <input type="date" value={projetForm.date_début}
                      onChange={e => setProjetForm({ ...projetForm, date_début: e.target.value })}
                      required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date de fin *</label>
                    <input type="date" value={projetForm.date_fin}
                      onChange={e => setProjetForm({ ...projetForm, date_fin: e.target.value })}
                      required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Statut</label>
                    <select value={projetForm.statut}
                      onChange={e => setProjetForm({ ...projetForm, statut: e.target.value })}
                      style={inputStyle}>
                      <option value="En cours">En cours</option>
                      <option value="En révision">En révision</option>
                      <option value="Validé">Validé</option>
                      <option value="Refusé">Refusé</option>
                      <option value="Terminé">Terminé</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={labelStyle}>Demandé par le client</label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      {[true, false].map(val => (
                        <button key={String(val)} type="button"
                          onClick={() => setProjetForm({ ...projetForm, demanded: val })}
                          style={{
                            flex: 1, padding: '10px', border: '2px solid',
                            borderColor: projetForm.demanded === val ? '#2563EB' : '#E2E8F0',
                            borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            background: projetForm.demanded === val ? 'rgba(37,99,235,0.08)' : 'white',
                            color: projetForm.demanded === val ? '#2563EB' : '#64748B',
                          }}>
                          {val ? '✅ Oui' : '❌ Non'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={projetForm.description}
                    onChange={e => setProjetForm({ ...projetForm, description: e.target.value })}
                    placeholder="Décrivez le projet..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={projetLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: projetLoading ? '#93C5FD' : '#2563EB',
                    color: 'white', border: 'none', borderRadius: 10,
                    padding: '12px 28px', cursor: projetLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: 14,
                  }}>
                  {projetLoading ? <Loader size={16} className="spin" /> : <FolderPlus size={16} />}
                  {projetLoading ? 'Création...' : 'Créer le projet'}
                </button>
              </form>
            </div>
          )}

          {/* Demandes en attente */}
          {projets.filter(p => p.demanded && p.statut === 'En attente').length > 0 && (
            <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #D97706' }}>
              <h3 style={{ color: '#D97706', marginBottom: 16 }}>
                ⏳ Demandes clients ({projets.filter(p => p.demanded && p.statut === 'En attente').length})
              </h3>
              {projets.filter(p => p.demanded && p.statut === 'En attente').map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nom}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Client : {p.id_client?.nom} · {new Date(p.date_début).toLocaleDateString('fr-FR')} → {new Date(p.date_fin).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => { await API.patch(`/projets/${p._id}/accepter`); fetchProjets(); }}
                      style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      ✅ Accepter
                    </button>
                    <button onClick={async () => { await API.patch(`/projets/${p._id}/refuser`); fetchProjets(); }}
                      style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      ❌ Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Liste des projets ── */}
          <div className="card">
            {fetchingProjets ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader size={32} color="#2563EB" className="spin" />
              </div>
            ) : projets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                <FolderPlus size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Aucun projet pour l'instant.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Projet</th>
                      <th>Client</th>
                      <th>Dates</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'center' }}>Demandé</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projets.map(p => {
                      const sc = getStatutColor(p.statut);
                      return (
                        <tr key={p._id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1E293B' }}>{p.nom}</div>
                            {p.description && (
                              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                                {p.description.slice(0, 60)}{p.description.length > 60 ? '...' : ''}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                background: '#EFF6FF', color: '#2563EB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 13,
                              }}>
                                {p.id_client?.nom?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.id_client?.nom || '—'}</div>
                                <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.id_client?.email || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} />
                              {new Date(p.date_début).toLocaleDateString('fr-FR')}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Clock size={12} />
                              {new Date(p.date_fin).toLocaleDateString('fr-FR')}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              background: sc.bg, color: sc.color,
                              borderRadius: 20, padding: '4px 12px',
                              fontSize: 12, fontWeight: 600,
                            }}>
                              {p.statut}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: p.demanded ? 'rgba(5,150,105,0.1)' : 'rgba(100,116,139,0.1)',
                              color: p.demanded ? '#059669' : '#64748B',
                              borderRadius: 20, padding: '4px 12px',
                              fontSize: 12, fontWeight: 600,
                            }}>
                              {p.demanded ? '✅ Oui' : '❌ Non'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button title="Voir" style={iconBtn('#2563EB')}>
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB UTILISATEURS
      ════════════════════════════════════════════ */}
      {activeTab === 'utilisateurs' && (
        <div>
          {/* Message de notification Utilisateurs */}
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

          {/* Formulaire création utilisateur */}
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
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODALES UTILISATEURS
      ════════════════════════════════════════════ */}

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

      {/* ════════════════════════════════════════════
          STYLES GLOBALES ET EN LIGNE
      ════════════════════════════════════════════ */}
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

// ── Variables de Style (Projets) ────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', background: 'white',
};

const iconBtn = (color) => ({
  background: 'none', border: 'none', cursor: 'pointer', color, padding: 4,
});

export default AdminDashboard;