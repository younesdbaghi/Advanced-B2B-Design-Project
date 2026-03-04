import { useState, useEffect } from "react";
import API from "../api";
import { FolderPlus, Calendar, Clock, Eye, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const AdminProjets = () => {
  const [projets, setProjets]             = useState([]);
  const [users, setUsers]                 = useState([]);
  const [fetching, setFetching]           = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [projetLoading, setProjetLoading] = useState(false);
  const [msg, setMsg]                     = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    nom: '', description: '', date_début: '', date_fin: '',
    statut: 'En cours', id_client: '', demanded: false,
  });

  const fetchProjets = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/projets");
      // On affiche tous les projets sauf les demandes en attente
      const liste = Array.isArray(data)
        ? data.filter(p => !(p.demanded && p.statut === 'En attente'))
        : [];
      setProjets(liste);
    } catch { console.error("Erreur projets"); }
    finally { setFetching(false); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await API.get("/utilisateurs");
      setUsers(data);
    } catch { console.error("Erreur users"); }
  };

  useEffect(() => { fetchProjets(); fetchUsers(); }, []);

  const handleCreateProjet = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.id_client || !form.date_début || !form.date_fin) {
      setMsg({ type: 'error', text: '❌ Nom, client, dates obligatoires.' });
      return;
    }
    setProjetLoading(true);
    setMsg({ type: '', text: '' });
    try {
      await API.post("/projets", form);
      setMsg({ type: 'success', text: '✅ Projet créé avec succès !' });
      setForm({ nom: '', description: '', date_début: '', date_fin: '', statut: 'En cours', id_client: '', demanded: false });
      setShowForm(false);
      fetchProjets();
    } catch (error) {
      setMsg({ type: 'error', text: `❌ ${error.response?.data?.message || "Erreur création"}` });
    } finally { setProjetLoading(false); }
  };

  const getStatutColor = (statut) => {
    const map = {
      'En cours':    { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
      'En révision': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
      'Validé':      { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
      'Refusé':      { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
      'Terminé':     { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
    };
    return map[statut] || { color: '#64748B', bg: 'rgba(100,116,139,0.1)' };
  };

  const clients = users.filter(u => u.rôle === 'client');

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Gestion des projets</h1>
      <p style={{ color: '#64748B', fontSize: 14, marginBottom: 28 }}>
        Créez et gérez tous les projets de la plateforme.
      </p>

      {/* Message */}
      {msg.text && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: msg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: msg.type === 'success' ? '#059669' : '#DC2626',
          border: `1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {msg.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {msg.text}
        </div>
      )}

      {/* Header + bouton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B' }}>
          Tous les projets ({projets.length})
        </h2>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#2563EB', color: 'white', border: 'none',
          borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
        }}>
          <FolderPlus size={18}/>
          {showForm ? 'Annuler' : 'Nouveau projet'}
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #2563EB', padding: 24 }}>
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderPlus size={18}/> Créer un projet
          </h3>
          <form onSubmit={handleCreateProjet}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Nom du projet *</label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})}
                  placeholder="ex: Refonte site" required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Client *</label>
                <select value={form.id_client} onChange={e => setForm({...form, id_client: e.target.value})} required style={inp}>
                  <option value="">Choisir un client</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.nom} — {c.email}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Date début *</label>
                <input type="date" value={form.date_début}
                  onChange={e => setForm({...form, date_début: e.target.value})} required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Date fin *</label>
                <input type="date" value={form.date_fin}
                  onChange={e => setForm({...form, date_fin: e.target.value})} required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Statut</label>
                <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} style={inp}>
                  {['En cours','En révision','Validé','Refusé','Terminé'].map(s =>
                    <option key={s} value={s}>{s}</option>
                  )}
                </select>
              </div>
              <div>
                <label style={lbl}>Demandé par le client</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => setForm({...form, demanded: val})}
                      style={{
                        flex: 1, padding: '10px', border: '2px solid',
                        borderColor: form.demanded === val ? '#2563EB' : '#E2E8F0',
                        borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        background: form.demanded === val ? 'rgba(37,99,235,0.08)' : 'white',
                        color: form.demanded === val ? '#2563EB' : '#64748B',
                      }}>
                      {val ? '✅ Oui' : '❌ Non'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Description</label>
                <textarea value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Décrivez le projet..." rows={3}
                  style={{ ...inp, resize: 'vertical' }}/>
              </div>
            </div>
            <button type="submit" disabled={projetLoading} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: projetLoading ? '#93C5FD' : '#2563EB', color: 'white',
              border: 'none', borderRadius: 10, padding: '12px 28px',
              cursor: projetLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14,
            }}>
              {projetLoading ? <Loader size={16}/> : <FolderPlus size={16}/>}
              {projetLoading ? 'Création...' : 'Créer le projet'}
            </button>
          </form>
        </div>
      )}

      {/* Liste projets */}
      <div className="card">
        {fetching ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={32} color="#2563EB"/>
          </div>
        ) : projets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Aucun projet pour l'instant.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Cliquez sur "Nouveau projet" pour commencer.</p>
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
                  <th style={{ textAlign: 'center' }}>Demanded</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projets.map(p => {
                  const sc = getStatutColor(p.statut);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.nom}</div>
                        {p.description && (
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>
                            {p.description.slice(0, 50)}{p.description.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                            color: 'white', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, fontSize: 13,
                          }}>
                            {p.id_client?.nom?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.id_client?.nom || '—'}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.id_client?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          📅 {new Date(p.date_début).toLocaleDateString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          🏁 {new Date(p.date_fin).toLocaleDateString('fr-FR')}
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
                          borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                        }}>
                          {p.demanded ? '✅ Oui' : '❌ Non'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button title="Voir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}>
                          <Eye size={16}/>
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
  );
};

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' };

export default AdminProjets;
