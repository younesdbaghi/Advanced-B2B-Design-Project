import { useState, useEffect } from "react";
import API from "../api";
import { UserPlus, Mail, User, Briefcase, Palette, Trash2, Edit, Loader, CheckCircle, AlertCircle, X, Save } from 'lucide-react';

const AdminUsers = () => {

  const [users, setUsers] = useState([]);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Edit modal state
  const [editUser, setEditUser] = useState(null); // user being edited
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("client");
  const [editLoading, setEditLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const fetchUsers = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/utilisateurs");
      setUsers(data);
    } catch {
      setMessage({ type: 'error', text: "Impossible de charger les utilisateurs." });
    } finally { setFetching(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const { data } = await API.post("/utilisateurs", { nom, email, rôle: role });
      setMessage({
        type: 'success',
        text: `✅ ${data.message}${data.mot_de_passe_temp ? ` — Mot de passe : ${data.mot_de_passe_temp}` : ''}`
      });
      setNom(""); setEmail("");
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `❌ ${error.response?.data?.message || "Erreur création"}` });
    } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      await API.delete(`/utilisateurs/${userId}`);
      setMessage({ type: 'success', text: 'Utilisateur supprimé.' });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `❌ ${error.response?.data?.message || "Erreur suppression"}` });
    }
  };

  // Open edit modal pre-filled with user data
  const openEdit = (u) => {
    setEditUser(u);
    setEditNom(u.nom || "");
    setEditEmail(u.email || "");
    setEditRole(u.rôle || "client");
    setMessage({ type: '', text: '' });
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await API.put(`/utilisateurs/${editUser._id}`, { nom: editNom, email: editEmail, rôle: editRole });
      setMessage({ type: 'success', text: 'Utilisateur mis à jour avec succès.' });
      setEditUser(null);
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `❌ ${error.response?.data?.message || "Erreur modification"}` });
    } finally { setEditLoading(false); }
  };

  const getRoleIcon = (r) => {
    if (r === 'admin') return <Briefcase size={14} />;
    if (r === 'designer') return <Palette size={14} />;
    return <User size={14} />;
  };
  let usersF = users.filter(u => u.rôle !== "admin")
  const filteredUsers = usersF.filter(u => {
    const matchSearch =
      u.nom.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchRole =
      roleFilter === "all" || u.rôle === roleFilter;

    return matchSearch && matchRole;
  });
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Gestion des utilisateurs</h1>

      {message.text && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: message.type === 'success' ? '#059669' : '#DC2626',
          border: `1px solid ${message.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 32, width: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Modifier l'utilisateur</h3>
              <button onClick={() => setEditUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditUser}>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Nom complet</label>
                <input type="text" value={editNom} onChange={e => setEditNom(e.target.value)}
                  required style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Adresse email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  required style={inp} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Rôle</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} style={inp}>
                  <option value="client">Client</option>
                  <option value="designer">Designer</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditUser(null)} style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0',
                  background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#64748B',
                }}>
                  Annuler
                </button>
                <button type="submit" disabled={editLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: editLoading ? '#93C5FD' : '#2563EB', color: 'white',
                  border: 'none', borderRadius: 10, padding: '10px 20px',
                  cursor: editLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14,
                }}>
                  {editLoading ? <Loader size={16} /> : <Save size={16} />}
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulaire création */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={20} /> Créer un nouvel utilisateur
        </h3>
        <form onSubmit={handleCreateUser}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Nom complet</label>
              <input type="text" placeholder="Jean Dupont"
                value={nom} onChange={e => setNom(e.target.value)}
                required style={inp} />
            </div>
            <div>
              <label style={lbl}>Adresse email</label>
              <input type="email" placeholder="jean@exemple.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required style={inp} />
            </div>
            <div>
              <label style={lbl}>Rôle</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={inp}>
                <option value="client">Client</option>
                <option value="designer">Designer</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: loading ? '#93C5FD' : '#2563EB', color: 'white',
            border: 'none', borderRadius: 10, padding: '12px 24px',
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14,
          }}>
            {loading ? <Loader size={16} /> : <UserPlus size={16} />}
            {loading ? 'Création...' : "Créer l'utilisateur"}
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inp}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={inp}
        >
          <option value="all">Tous les rôles</option>
          <option value="client">Client</option>
          <option value="designer">Designer</option>
        </select>
      </div>
      {/* Liste */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Liste des utilisateurs ({users.length})</h3>
        {fetching ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={32} color="#2563EB" />
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
                {filteredUsers.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                          {u.nom?.charAt(0) || 'U'}
                        </div>
                        {u.nom}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        backgroundColor: u.rôle === 'admin' ? 'rgba(233,57,70,0.1)' : undefined,
                        color: u.rôle === 'admin' ? 'var(--danger)' : undefined,
                      }}>
                        {getRoleIcon(u.rôle)} {u.rôle}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => openEdit(u)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', marginRight: 8 }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteUser(u._id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Aucun utilisateur.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' };

export default AdminUsers;