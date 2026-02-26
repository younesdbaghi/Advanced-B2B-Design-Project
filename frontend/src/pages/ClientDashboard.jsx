import { useState, useEffect } from 'react';
import API from '../api';
import { 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Eye,
  Loader 
} from 'lucide-react';

const ClientDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulation d'appel API (à remplacer par votre endpoint réel)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Exemple : API.get('/mes-projets')
        // En attendant, on utilise des données factices
        setTimeout(() => {
          setProjects([
            { 
              id: 1, 
              nom: 'Refonte site e-commerce', 
              statut: 'en cours', 
              dateDebut: '2025-02-01', 
              designer: 'Alice Martin',
              progression: 65 
            },
            { 
              id: 2, 
              nom: 'Création logo', 
              statut: 'terminé', 
              dateDebut: '2025-01-15', 
              designer: 'Thomas Dubois',
              progression: 100 
            },
            { 
              id: 3, 
              nom: 'Application mobile', 
              statut: 'en attente', 
              dateDebut: '2025-03-01', 
              designer: 'Sophie Lefèvre',
              progression: 10 
            },
          ]);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Erreur lors du chargement des projets', error);
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const getStatusBadge = (statut) => {
    switch(statut) {
      case 'en cours':
        return { color: 'var(--primary-color)', bg: 'rgba(67, 97, 238, 0.1)', icon: <Clock size={14} /> };
      case 'terminé':
        return { color: 'var(--success)', bg: 'rgba(42, 157, 143, 0.1)', icon: <CheckCircle size={14} /> };
      case 'en attente':
        return { color: 'var(--danger)', bg: 'rgba(230, 57, 70, 0.1)', icon: <AlertCircle size={14} /> };
      default:
        return { color: 'var(--text-muted)', bg: 'rgba(163, 174, 209, 0.1)', icon: null };
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
        Mes projets
      </h1>

      {/* Cartes récapitulatives */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(67, 97, 238, 0.1)', borderRadius: '12px', padding: '10px' }}>
              <Briefcase color="var(--primary-color)" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Projets actifs</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{projects.filter(p => p.statut === 'en cours').length}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(42, 157, 143, 0.1)', borderRadius: '12px', padding: '10px' }}>
              <CheckCircle color="var(--success)" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Projets terminés</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{projects.filter(p => p.statut === 'terminé').length}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(230, 57, 70, 0.1)', borderRadius: '12px', padding: '10px' }}>
              <AlertCircle color="var(--danger)" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>En attente</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{projects.filter(p => p.statut === 'en attente').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des projets */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Détail des projets</h3>

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
                  <th>Designer</th>
                  <th>Date de début</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const status = getStatusBadge(project.statut);
                  return (
                    <tr key={project.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={18} color="var(--text-muted)" />
                          {project.nom}
                        </div>
                      </td>
                      <td>{project.designer}</td>
                      <td>{new Date(project.dateDebut).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span className="badge" style={{ 
                          backgroundColor: status.bg, 
                          color: status.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {status.icon}
                          {project.statut}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '80px', 
                            height: '6px', 
                            background: 'var(--border-color)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${project.progression}%`, 
                              height: '100%',
                              background: project.progression === 100 ? 'var(--success)' : 'var(--primary-color)',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{project.progression}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => alert(`Détails du projet : ${project.nom}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--primary-color)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={18} />
                          Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Aucun projet trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Style pour l'animation de rotation (identique à AdminDashboard) */}
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

export default ClientDashboard;