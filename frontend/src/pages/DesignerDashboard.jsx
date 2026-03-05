import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { Plus, X, Upload, Loader, Image as ImageIcon, Edit3, Trash2, Eye } from 'lucide-react';

const DesignerDashboard = () => {
  const navigate = useNavigate();
  const [maquettes, setMaquettes] = useState([]);
  const[projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States Popup Création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const[formData, setFormData] = useState({ nom: '', description: '', id_projet: '', image_fond: '' });
  const [isCreating, setIsCreating] = useState(false);

  // States Popup Modification
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const[editData, setEditData] = useState({ _id: '', nom: '', description: '', id_projet: '' });
  const[isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const [resMaquettes, resProjets] = await Promise.all([
        API.get('/maquettes'),
        API.get('/projets')
      ]);
      setMaquettes(resMaquettes.data);
      setProjets(resProjets.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur', error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); },[]);

  // --- CRÉATION ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image_fond: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const startDesign = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await API.post('/maquettes', formData);
      navigate(`/designer/editeur/${res.data.maquette._id}`);
    } catch (err) {
      alert("Erreur lors de la création.");
      setIsCreating(false);
    }
  };

  // --- MODIFICATION INFOS ---
  const openEditModal = (maq) => {
    // On pré-remplit les champs avec la maquette sélectionnée
    setEditData({ 
      _id: maq._id, 
      nom: maq.nom, 
      description: maq.description || '', 
      id_projet: maq.id_projet?._id || '' 
    });
    setIsEditModalOpen(true);
  };

  const updateInfo = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await API.put(`/maquettes/${editData._id}`, editData);
      // Mettre à jour la liste localement
      setMaquettes(maquettes.map(m => m._id === editData._id ? res.data : m));
      setIsEditModalOpen(false);
      setIsUpdating(false);
    } catch (error) {
      alert("Erreur lors de la modification.");
      setIsUpdating(false);
    }
  };

  // --- SUPPRESSION ---
  const deleteMaquette = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce design ?")) {
      try {
        await API.delete(`/maquettes/${id}`);
        setMaquettes(maquettes.filter(m => m._id !== id));
      } catch (err) {
        alert("Erreur lors de la suppression.");
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, width: "100%" }}>Mes Designs</h1>
        <button style={{ width: "250px" }} className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Nouveau Design
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><Loader className="spin" size={32} /></div>
      ) : (
        <div className="maquette-grid">
          {maquettes.map((maq) => (
            <div className="maquette-card" key={maq._id}>
              {/* Miniature cliquable (ouvre l'éditeur) */}
              <div className="maquette-thumbnail" onClick={() => navigate(`/designer/editeur/${maq._id}`)}>
                {maq.image_fond ? (
                  <img src={maq.image_fond} alt="Miniature" />
                ) : (
                  <div className="no-image"><ImageIcon size={40} color="#ccc" /></div>
                )}
              </div>
              
              {/* Infos & Actions */}
              <div className="maquette-info">
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{maq.nom}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{maq.id_projet?.nom || 'Sans projet'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* OEIL : Ouvre le design */}
                  <button className="icon-btn eye-btn" onClick={() => navigate(`/designer/editeur/${maq._id}`)} title="Voir le design"><Eye size={18} /></button>
                  {/* CRAYON : Modifie les infos */}
                  <button className="icon-btn edit-btn" onClick={() => openEditModal(maq)} title="Modifier les infos"><Edit3 size={18} /></button>
                  {/* POUBELLE : Supprime */}
                  <button className="icon-btn delete-btn" onClick={() => deleteMaquette(maq._id)} title="Supprimer"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
          {maquettes.length === 0 && <p>Aucun design pour le moment.</p>}
        </div>
      )}

      {/* POPUP CRÉATION */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>Nouveau Design</h3>
              <X cursor="pointer" onClick={() => setIsModalOpen(false)} />
            </div>
            <form onSubmit={startDesign} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Nom..." required className="custom-input" onChange={e => setFormData({...formData, nom: e.target.value})} />
              <select required className="custom-input" onChange={e => setFormData({...formData, id_projet: e.target.value})}>
                <option value="">-- Assigner à un projet --</option>
                {projets.map(p => <option key={p._id} value={p._id}>{p.nom}</option>)}
              </select>
              <div className="upload-box">
                <Upload size={24} color="var(--text-muted)" />
                <p>{formData.image_fond ? 'Image prête ✅' : 'Importer une image de fond'}</p>
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </div>
              <button type="submit" className="btn-primary" disabled={isCreating}>
                {isCreating ? 'Chargement...' : 'Commencer 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODIFICATION INFOS */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>Modifier les informations</h3>
              <X cursor="pointer" onClick={() => setIsEditModalOpen(false)} />
            </div>
            <form onSubmit={updateInfo} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" value={editData.nom} required className="custom-input" onChange={e => setEditData({...editData, nom: e.target.value})} />
              <textarea value={editData.description} placeholder="Description" className="custom-input" onChange={e => setEditData({...editData, description: e.target.value})} />
              <select value={editData.id_projet} required className="custom-input" onChange={e => setEditData({...editData, id_projet: e.target.value})}>
                <option value="">-- Assigner à un projet --</option>
                {projets.map(p => <option key={p._id} value={p._id}>{p.nom}</option>)}
              </select>
              <button type="submit" className="btn-primary" disabled={isUpdating}>
                {isUpdating ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSS INTÉGRÉ */}
      <style>{`
        .btn-primary { display: flex; justify-content: center; gap: 8px; align-items: center; background: var(--primary-color); color: white; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
        .maquette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .maquette-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: 0.3s; }
        .maquette-card:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        .maquette-thumbnail { height: 180px; background: #f0f2f5; cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid #eee; }
        .maquette-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .maquette-info { padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .icon-btn { border: none; background: none; cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s; }
        .eye-btn { color: #2a9d8f; background: rgba(42, 157, 143, 0.1); }
        .edit-btn { color: var(--primary-color); background: rgba(67, 97, 238, 0.1); }
        .delete-btn { color: #e63946; background: rgba(230, 57, 70, 0.1); }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; padding: 30px; border-radius: 16px; width: 100%; max-width: 450px; }
        .custom-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
        .upload-box { border: 2px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center; position: relative; background: #f9f9fc; }
        .upload-box input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DesignerDashboard;