import { useState, useEffect, useContext } from 'react';
import API from '../api';
import { AuthContext } from '../context/AuthContext';
import {
  Briefcase, Clock, CheckCircle, AlertCircle,
  FileText, Eye, Loader, PlusCircle, Send,
  Pencil, Trash2, X, Save, Calendar, AlignLeft
} from 'lucide-react';

// ─── Modal générique ────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(15,23,42,0.55)',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:1000, padding:16, backdropFilter:'blur(3px)',
  }}>
    <div style={{
      background:'white', borderRadius:16, width:'100%', maxWidth:560,
      boxShadow:'0 20px 60px rgba(0,0,0,0.18)', overflow:'hidden',
      animation:'slideUp .2s ease',
    }}>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'18px 24px', borderBottom:'1px solid #F1F5F9',
      }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#1E2A4A', margin:0 }}>{title}</h2>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex' }}>
          <X size={20}/>
        </button>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
    <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
  </div>
);

// ─── Modal Détails (lecture seule) ──────────────────────────────────────────
const DetailModal = ({ projet, onClose, onEdit, onDelete, getStatusBadge }) => {
  const s = getStatusBadge(projet.statut);
  return (
    <Modal title="Détails du projet" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Nom + statut */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div>
            <div style={{ fontSize:13, color:'#94A3B8', marginBottom:4 }}>Nom du projet</div>
            <div style={{ fontSize:17, fontWeight:700, color:'#1E293B' }}>{projet.nom}</div>
          </div>
          <span style={{ background:s.bg, color:s.color, borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
            {s.icon} {projet.statut}
          </span>
        </div>

        {/* Dates */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={detailCard}>
            <Calendar size={14} color="#2563EB" style={{ marginBottom:4 }}/>
            <div style={{ fontSize:12, color:'#94A3B8' }}>Date de début</div>
            <div style={{ fontWeight:600, color:'#1E293B', fontSize:14 }}>
              {new Date(projet.date_début).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <div style={detailCard}>
            <Calendar size={14} color="#7C3AED" style={{ marginBottom:4 }}/>
            <div style={{ fontSize:12, color:'#94A3B8' }}>Date de fin</div>
            <div style={{ fontWeight:600, color:'#1E293B', fontSize:14 }}>
              {new Date(projet.date_fin).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>

        {/* Description */}
        {projet.description && (
          <div style={detailCard}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <AlignLeft size={14} color="#64748B"/>
              <span style={{ fontSize:12, color:'#94A3B8' }}>Description</span>
            </div>
            <p style={{ margin:0, fontSize:14, color:'#374151', lineHeight:1.6 }}>{projet.description}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
          <button onClick={onDelete} style={{ ...btnOutline, color:'#DC2626', borderColor:'#FECACA' }}>
            <Trash2 size={15}/> Supprimer
          </button>
          <button onClick={onEdit} style={{ ...btnPrimary }}>
            <Pencil size={15}/> Modifier
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal Édition ──────────────────────────────────────────────────────────
const EditModal = ({ projet, onClose, onSaved, setMsg }) => {
  const [form, setForm] = useState({
    nom:        projet.nom        || '',
    description:projet.description|| '',
    date_début: projet.date_début ? projet.date_début.slice(0,10) : '',
    date_fin:   projet.date_fin   ? projet.date_fin.slice(0,10)   : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.date_début || !form.date_fin) {
      setMsg({ type:'error', text:'❌ Nom, date début et date fin sont obligatoires.' });
      return;
    }
    setSaving(true);
    try {
      await API.put(`/projets/${projet._id}`, form);
      setMsg({ type:'success', text:'✅ Projet modifié avec succès.' });
      onSaved();
    } catch (err) {
      setMsg({ type:'error', text:`❌ ${err.response?.data?.message || 'Erreur lors de la modification'}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <form onSubmit={handleSave}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Nom du projet *</label>
            <input value={form.nom} onChange={e => setForm({...form, nom:e.target.value})}
              placeholder="Nom du projet" required style={inp}/>
          </div>
          <div>
            <label style={lbl}>Date de début *</label>
            <input type="date" value={form.date_début}
              onChange={e => setForm({...form, date_début:e.target.value})}
              required style={inp}/>
          </div>
          <div>
            <label style={lbl}>Date de fin *</label>
            <input type="date" value={form.date_fin}
              onChange={e => setForm({...form, date_fin:e.target.value})}
              required style={inp}/>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Description</label>
            <textarea value={form.description}
              onChange={e => setForm({...form, description:e.target.value})}
              rows={4} style={{ ...inp, resize:'vertical' }}
              placeholder="Décrivez le projet..."/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button type="button" onClick={onClose} style={btnOutline}>Annuler</button>
          <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed':'pointer' }}>
            {saving ? <Loader size={15}/> : <Save size={15}/>}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Modal Confirmation suppression ─────────────────────────────────────────
const DeleteModal = ({ projet, onClose, onConfirm, deleting }) => (
  <Modal title="Supprimer le projet" onClose={onClose}>
    <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
      <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(220,38,38,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
        <Trash2 size={24} color="#DC2626"/>
      </div>
      <p style={{ fontSize:15, color:'#374151', marginBottom:6 }}>
        Voulez-vous vraiment supprimer le projet
      </p>
      <p style={{ fontSize:16, fontWeight:700, color:'#1E293B', marginBottom:20 }}>« {projet.nom} » ?</p>
      <p style={{ fontSize:13, color:'#94A3B8', marginBottom:24 }}>Cette action est irréversible.</p>
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        <button onClick={onClose} style={btnOutline}>Annuler</button>
        <button onClick={onConfirm} disabled={deleting}
          style={{ ...btnPrimary, background: deleting ? '#FCA5A5' : '#DC2626', cursor: deleting ? 'not-allowed':'pointer' }}>
          {deleting ? <Loader size={15}/> : <Trash2 size={15}/>}
          {deleting ? 'Suppression...' : 'Supprimer'}
        </button>
      </div>
    </div>
  </Modal>
);

// ─── Composant principal ─────────────────────────────────────────────────────
const ClientDashboard = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [sending, setSending]     = useState(false);
  const [msg, setMsg]             = useState({ type:'', text:'' });
  const [form, setForm]           = useState({ nom:'', description:'', date_début:'', date_fin:'' });

  // Modal states
  const [detailProjet, setDetailProjet] = useState(null);   // projet affiché en détail
  const [editProjet, setEditProjet]     = useState(null);   // projet en cours d'édition
  const [deleteProjet, setDeleteProjet] = useState(null);   // projet à supprimer
  const [deleting, setDeleting]         = useState(false);

  // Auto-dismiss msg
  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ type:'', text:'' }), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  // ── Fetch ──
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/projets');
      const mesProjets = Array.isArray(data)
        ? data.filter(p => p.id_client?._id === user?.id || p.id_client === user?.id)
        : [];
      setProjects(mesProjets);
    } catch (err) {
      console.error('Erreur projets', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchProjects(); }, []);

  // ── Créer demande ──
  const handleDemandeProjet = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.date_début || !form.date_fin) {
      setMsg({ type:'error', text:'❌ Nom, date début et date fin sont obligatoires.' });
      return;
    }
    setSending(true);
    setMsg({ type:'', text:'' });
    try {
      await API.post('/projets/demande', {
        nom:form.nom, description:form.description,
        date_début:form.date_début, date_fin:form.date_fin,
        demanded:true, id_client:user?.id,
      });
      setMsg({ type:'success', text:"✅ Demande envoyée ! L'admin va la traiter." });
      setForm({ nom:'', description:'', date_début:'', date_fin:'' });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      setMsg({ type:'error', text:`❌ ${err.response?.data?.message || 'Erreur envoi demande'}` });
    } finally {
      setSending(false);
    }
  };

  // ── Supprimer ──
  const handleDelete = async () => {
    if (!deleteProjet) return;
    setDeleting(true);
    try {
      await API.delete(`/projets/${deleteProjet._id}`);
      setMsg({ type:'success', text:'✅ Projet supprimé avec succès.' });
      setDeleteProjet(null);
      setDetailProjet(null);
      fetchProjects();
    } catch (err) {
      setMsg({ type:'error', text:`❌ ${err.response?.data?.message || 'Erreur suppression'}` });
    } finally {
      setDeleting(false);
    }
  };

  // ── Après édition ──
  const handleSaved = () => {
    setEditProjet(null);
    setDetailProjet(null);
    fetchProjects();
  };

  const getStatusBadge = (statut) => {
    const map = {
      'En cours':    { color:'#2563EB', bg:'rgba(37,99,235,0.1)',   icon:<Clock size={14}/> },
      'En révision': { color:'#D97706', bg:'rgba(217,119,6,0.1)',   icon:<Clock size={14}/> },
      'Validé':      { color:'#059669', bg:'rgba(5,150,105,0.1)',   icon:<CheckCircle size={14}/> },
      'Refusé':      { color:'#DC2626', bg:'rgba(220,38,38,0.1)',   icon:<AlertCircle size={14}/> },
      'Terminé':     { color:'#7C3AED', bg:'rgba(124,58,237,0.1)',  icon:<CheckCircle size={14}/> },
      'En attente':  { color:'#D97706', bg:'rgba(217,119,6,0.1)',   icon:<Clock size={14}/> },
    };
    return map[statut] || { color:'#64748B', bg:'rgba(100,116,139,0.1)', icon:null };
  };

  const demandesEnAttente = projects.filter(p => p.demanded && p.statut === 'En attente');
  const projetsActifs     = projects.filter(p => !p.demanded || p.statut !== 'En attente');

  return (
    <div>
      {/* ── Modals ── */}
      {deleteProjet && (
        <DeleteModal
          projet={deleteProjet}
          onClose={() => setDeleteProjet(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
      {!deleteProjet && editProjet && (
        <EditModal
          projet={editProjet}
          onClose={() => setEditProjet(null)}
          onSaved={handleSaved}
          setMsg={setMsg}
        />
      )}
      {!deleteProjet && !editProjet && detailProjet && (
        <DetailModal
          projet={detailProjet}
          onClose={() => setDetailProjet(null)}
          onEdit={() => setEditProjet(detailProjet)}
          onDelete={() => setDeleteProjet(detailProjet)}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:600 }}>Mes projets</h1>
        <button onClick={() => setShowForm(!showForm)} style={{
          display:'flex', alignItems:'center', gap:8,
          background:'#2563EB', color:'white', border:'none',
          borderRadius:10, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:14,
        }}>
          <PlusCircle size={18}/>
          {showForm ? 'Annuler' : 'Demander un projet'}
        </button>
      </div>

      {/* ── Message ── */}
      {msg.text && (
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'12px 16px', borderRadius:10, marginBottom:20,
          background: msg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color:       msg.type === 'success' ? '#059669' : '#DC2626',
          border:`1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {msg.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {msg.text}
        </div>
      )}

      {/* ── Formulaire demande projet ── */}
      {showForm && (
        <div className="card" style={{ marginBottom:24, borderLeft:'4px solid #2563EB', padding:24 }}>
          <h3 style={{ marginBottom:20, display:'flex', alignItems:'center', gap:8, color:'#1E2A4A' }}>
            <Send size={20}/> Demander un nouveau projet
          </h3>
          <form onSubmit={handleDemandeProjet}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Nom du projet *</label>
                <input value={form.nom} onChange={e => setForm({...form, nom:e.target.value})}
                  placeholder="ex: Refonte de mon site web" required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Date de début souhaitée *</label>
                <input type="date" value={form.date_début}
                  onChange={e => setForm({...form, date_début:e.target.value})}
                  required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Date de livraison souhaitée *</label>
                <input type="date" value={form.date_fin}
                  onChange={e => setForm({...form, date_fin:e.target.value})}
                  required style={inp}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Description de votre besoin</label>
                <textarea value={form.description}
                  onChange={e => setForm({...form, description:e.target.value})}
                  placeholder="Décrivez votre projet, vos attentes, votre cible..."
                  rows={4} style={{ ...inp, resize:'vertical' }}/>
              </div>
            </div>
            <button type="submit" disabled={sending} style={{
              display:'flex', alignItems:'center', gap:8,
              background: sending ? '#93C5FD' : '#2563EB', color:'white',
              border:'none', borderRadius:10, padding:'12px 24px',
              cursor: sending ? 'not-allowed':'pointer', fontWeight:600, fontSize:14,
            }}>
              {sending ? <Loader size={16}/> : <Send size={16}/>}
              {sending ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </form>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:28 }}>
        {[
          { label:'Projets actifs',      count:projetsActifs.filter(p => p.statut === 'En cours').length, color:'#2563EB', bg:'rgba(37,99,235,0.1)',  icon:<Briefcase size={22}/> },
          { label:'Demandes en attente', count:demandesEnAttente.length,                                   color:'#D97706', bg:'rgba(217,119,6,0.1)',  icon:<Clock size={22}/> },
          { label:'Terminés',            count:projects.filter(p => p.statut === 'Terminé').length,        color:'#059669', bg:'rgba(5,150,105,0.1)', icon:<CheckCircle size={22}/> },
          { label:'Total',               count:projects.length,                                             color:'#7C3AED', bg:'rgba(124,58,237,0.1)',icon:<FileText size={22}/> },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ background:s.bg, borderRadius:10, padding:10, color:s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:13, color:'#64748B' }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:700, color:'#1E293B' }}>{s.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Demandes en attente ── */}
      {demandesEnAttente.length > 0 && (
        <div className="card" style={{ marginBottom:24, borderLeft:'4px solid #D97706' }}>
          <h3 style={{ marginBottom:16, color:'#D97706', display:'flex', alignItems:'center', gap:8 }}>
            <Clock size={18}/> Demandes en attente de validation ({demandesEnAttente.length})
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Projet demandé</th>
                  <th>Date début</th>
                  <th>Date fin</th>
                  <th>Statut</th>
                  <th style={{ textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandesEnAttente.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{p.nom}</div>
                      {p.description && <div style={{ fontSize:12, color:'#94A3B8' }}>{p.description.slice(0,60)}...</div>}
                    </td>
                    <td style={{ fontSize:13, color:'#64748B' }}>{new Date(p.date_début).toLocaleDateString('fr-FR')}</td>
                    <td style={{ fontSize:13, color:'#64748B' }}>{new Date(p.date_fin).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span style={{ background:'rgba(217,119,6,0.1)', color:'#D97706', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:600 }}>
                        ⏳ En attente admin
                      </span>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); setDetailProjet(p); setEditProjet(null); setDeleteProjet(null); }}
                          title="Voir détails"
                          style={{ ...iconBtn, color:'#2563EB' }}>
                          <Eye size={15}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditProjet(p); setDetailProjet(null); setDeleteProjet(null); }}
                          title="Modifier"
                          style={{ ...iconBtn, color:'#D97706' }}>
                          <Pencil size={15}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteProjet(p); setDetailProjet(null); setEditProjet(null); }}
                          title="Supprimer"
                          style={{ ...iconBtn, color:'#DC2626' }}>
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mes projets ── */}
      <div className="card">
        <h3 style={{ marginBottom:20 }}>Mes projets ({projetsActifs.length})</h3>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <Loader size={32} color="#2563EB"/>
          </div>
        ) : projetsActifs.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#94A3B8' }}>
            <Briefcase size={48} style={{ marginBottom:12, opacity:0.3 }}/>
            <p>Aucun projet pour l'instant.</p>
            <p style={{ fontSize:13 }}>Cliquez sur "Demander un projet" pour commencer.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Date début</th>
                  <th>Date fin</th>
                  <th>Statut</th>
                  <th style={{ textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projetsActifs.map(p => {
                  const s = getStatusBadge(p.statut);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <FileText size={16} color="#2563EB"/>
                          <div>
                            <div style={{ fontWeight:600 }}>{p.nom}</div>
                            {p.description && <div style={{ fontSize:12, color:'#94A3B8' }}>{p.description.slice(0,50)}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:13, color:'#64748B' }}>{new Date(p.date_début).toLocaleDateString('fr-FR')}</td>
                      <td style={{ fontSize:13, color:'#64748B' }}>{new Date(p.date_fin).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span style={{ background:s.bg, color:s.color, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4 }}>
                          {s.icon} {p.statut}
                        </span>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); setDetailProjet(p); setEditProjet(null); setDeleteProjet(null); }}
                            title="Voir détails"
                            style={{ ...iconBtn, color:'#2563EB' }}>
                            <Eye size={15}/>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditProjet(p); setDetailProjet(null); setDeleteProjet(null); }}
                            title="Modifier"
                            style={{ ...iconBtn, color:'#D97706' }}>
                            <Pencil size={15}/>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteProjet(p); setDetailProjet(null); setEditProjet(null); }}
                            title="Supprimer"
                            style={{ ...iconBtn, color:'#DC2626' }}>
                            <Trash2 size={15}/>
                          </button>
                        </div>
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

// ─── Styles partagés ────────────────────────────────────────────────────────
const lbl       = { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 };
const inp       = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box', background:'white' };
const detailCard= { background:'#F8FAFC', borderRadius:10, padding:'12px 14px', border:'1px solid #F1F5F9' };
const iconBtn   = { background:'none', border:'1px solid currentColor', borderRadius:8, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'5px 8px', opacity:0.85, transition:'opacity .15s' };
const btnPrimary= { display:'inline-flex', alignItems:'center', gap:7, background:'#2563EB', color:'white', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontWeight:600, fontSize:14 };
const btnOutline= { display:'inline-flex', alignItems:'center', gap:7, background:'white', color:'#374151', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontWeight:600, fontSize:14 };

export default ClientDashboard;
