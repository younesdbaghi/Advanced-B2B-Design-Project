import { useState, useEffect } from 'react';
import API from '../api';
import { 
  Palette, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload,
  Eye,
  Download,
  Loader 
} from 'lucide-react';

const DesignerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulation d'appel API (à remplacer par votre endpoint réel)
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Exemple : API.get('/mes-taches')
        setTimeout(() => {
          setTasks([
            { 
              id: 1, 
              projet: 'Refonte site e-commerce', 
              description: 'Maquette homepage',
              statut: 'à faire',
              dateLimite: '2025-03-10',
              client: 'Jean Dupont'
            },
            { 
              id: 2, 
              projet: 'Création logo', 
              description: 'Proposition 3 versions',
              statut: 'en cours',
              dateLimite: '2025-02-28',
              client: 'Marie Curie'
            },
            { 
              id: 3, 
              projet: 'Application mobile', 
              description: 'Écran de connexion',
              statut: 'terminé',
              dateLimite: '2025-02-15',
              client: 'Pierre Martin'
            },
            { 
              id: 4, 
              projet: 'Bannière publicitaire', 
              description: 'Format web et print',
              statut: 'en attente',
              dateLimite: '2025-03-05',
              client: 'Sophie Lefèvre'
            },
          ]);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Erreur lors du chargement des tâches', error);
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const getStatusBadge = (statut) => {
    switch(statut) {
      case 'en cours':
        return { color: 'var(--primary-color)', bg: 'rgba(67, 97, 238, 0.1)', icon: <Clock size={14} /> };
      case 'terminé':
        return { color: 'var(--success)', bg: 'rgba(42, 157, 143, 0.1)', icon: <CheckCircle size={14} /> };
      case 'en attente':
      case 'à faire':
        return { color: 'var(--danger)', bg: 'rgba(230, 57, 70, 0.1)', icon: <AlertCircle size={14} /> };
      default:
        return { color: 'var(--text-muted)', bg: 'rgba(163, 174, 209, 0.1)', icon: null };
    }
  };

  const getUrgencyColor = (dateLimite) => {
    const today = new Date();
    const limit = new Date(dateLimite);
    const diffDays = Math.ceil((limit - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'var(--danger)';
    if (diffDays <= 3) return 'var(--danger)';
    if (diffDays <= 7) return 'orange';
    return 'var(--success)';
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
        Mes maquettes
      </h1>

      {/* Cartes récapitulatives */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(67, 97, 238, 0.1)', borderRadius: '12px', padding: '10px' }}>
              <Palette color="var(--primary-color)" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tâches en cours</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{tasks.filter(t => t.statut === 'en cours').length}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(230, 57, 70, 0.1)', borderRadius: '12px', padding: '10px' }}>
              <AlertCircle color="var(--danger)" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>À faire / en attente</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{tasks.filter(t => t.statut === 'à faire' || t.statut === 'en attente').length}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(42, 157, 143, 0.1)', borderRadius: '12px', padding: '10px' }}>
              <CheckCircle color="var(--success)" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Terminées</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{tasks.filter(t => t.statut === 'terminé').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Tâches de conception</h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader className="spin" size={32} color="var(--primary-color)" />
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Description</th>
                  <th>Client</th>
                  <th>Date limite</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const status = getStatusBadge(task.statut);
                  const urgencyColor = getUrgencyColor(task.dateLimite);
                  return (
                    <tr key={task.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Palette size={18} color="var(--text-muted)" />
                          {task.projet}
                        </div>
                      </td>
                      <td>{task.description}</td>
                      <td>{task.client}</td>
                      <td>
                        <span style={{ 
                          color: urgencyColor, 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {new Date(task.dateLimite).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ 
                          backgroundColor: status.bg, 
                          color: status.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {status.icon}
                          {task.statut}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => alert(`Aperçu de ${task.projet}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--primary-color)'
                            }}
                            title="Aperçu"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => alert(`Télécharger les fichiers de ${task.projet}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)'
                            }}
                            title="Télécharger"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => alert(`Uploader une nouvelle version pour ${task.projet}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--success)'
                            }}
                            title="Uploader"
                          >
                            <Upload size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Aucune tâche assignée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default DesignerDashboard;