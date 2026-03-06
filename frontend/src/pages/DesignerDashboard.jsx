import { useState, useEffect, useContext } from 'react';
import API from '../api';
import { AuthContext } from '../context/AuthContext';
import {
  Palette, Clock, CheckCircle, AlertCircle,
  Briefcase, Eye, Loader, Calendar, User
} from 'lucide-react';

const DesignerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [projets, setProjets]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchMesProjets = async () => {
      setLoading(true);
      try {
        const { data } = await API.get('/affectations/mes-projets');
        setProjets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erreur chargement projets', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMesProjets();
  }, []);

  const getStatutBadge = (statut) => {
    const map = {
      'En cours':    { color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   icon: <Clock size={13}/> },
      'En révision': { color: '#D97706', bg: 'rgba(217,119,6,0.1)',   icon: <Clock size={13}/> },
      'Validé':      { color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: <CheckCircle size={13}/> },
      'Refusé':      { color: '#DC2626', bg: 'rgba(220,38,38,0.1)',   icon: <AlertCircle size={13}/> },
      'Terminé':     { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)',  icon: <CheckCircle size={13}/> },
      'En attente':  { color: '#D97706', bg: 'rgba(217,119,6,0.1)',   icon: <Clock size={13}/> },
    };
    return map[statut] || { color: '#64748B', bg: 'rgba(100,116,139,0.1)', icon: null };
  };

  const getUrgencyColor = (dateFin) => {
    const diff = Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return '#DC2626';
    if (diff <= 3) return '#DC2626';
    if (diff <= 7) return '#D97706';
    return '#059669';
  };

  const enCours  = projets.filter(a => a.id_projet?.statut === 'En cours');
  const termines = projets.filter(a => a.id_projet?.statut === 'Terminé');

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Mes projets</h1>
      <p style={{ color: '#64748B', fontSize: 14, marginBottom: 28 }}>
        Projets auxquels vous êtes assigné(e).
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Projets assignés',  count: projets.length,    color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  icon: <Briefcase size={22}/> },
          { label: 'En cours',          count: enCours.length,    color: '#D97706', bg: 'rgba(217,119,6,0.1)',  icon: <Clock size={22}/> },
          { label: 'Terminés',          count: termines.length,   color: '#059669', bg: 'rgba(5,150,105,0.1)', icon: <CheckCircle size={22}/> },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: s.bg, borderRadius: 10, padding: 10, color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1E293B' }}>{s.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Liste projets */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Mes projets assignés</h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={32} color="#2563EB"/>
          </div>
        ) : projets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
            <Palette size={48} style={{ marginBottom: 12, opacity: 0.3 }}/>
            <p style={{ fontWeight: 600 }}>Aucun projet assigné pour le moment.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>L'admin vous assignera bientôt à un projet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Client</th>
                  <th>Date fin</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'center' }}>Assigné le</th>
                </tr>
              </thead>
              <tbody>
                {projets.map((a) => {
                  const p = a.id_projet;
                  if (!p) return null;
                  const s = getStatutBadge(p.statut);
                  return (
                    <tr key={a._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Palette size={16}/>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nom}</div>
                            {p.description && <div style={{ fontSize: 12, color: '#94A3B8' }}>{p.description.slice(0, 50)}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                            {p.id_client?.nom?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.id_client?.nom || '—'}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.id_client?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: getUrgencyColor(p.date_fin), fontWeight: 600, fontSize: 13 }}>
                          🏁 {new Date(p.date_fin).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {s.icon} {p.statut}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: '#64748B' }}>
                        <Calendar size={12} style={{ marginRight: 4 }}/>
                        {new Date(a.date_affectation).toLocaleDateString('fr-FR')}
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

export default DesignerDashboard;
