import { useState, useEffect, useRef } from "react";
import API from "../api";
import {
  FolderPlus, Eye, Loader, CheckCircle, AlertCircle,
  Pencil, Trash2, X, Save, Calendar, AlignLeft,
  UserPlus, UserMinus, Users, ChevronRight, Image,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportBeautifulExcel } from "../utils/excelExport";

// ── helpers ───────────────────────────────────────────────────────────────────
const validerDates = (debut, fin) => {
  const errors = { date_début: "", date_fin: "" };
  if (debut && fin && fin < debut)
    errors.date_fin = "La date de fin ne peut pas être avant la date de début.";
  return errors;
};

const FieldError = ({ msg }) =>
  msg ? <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:5, color:"#DC2626", fontSize:12 }}><AlertCircle size={12}/>{msg}</div> : null;

// ── Modal shell ───────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, maxWidth = 560 }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16, backdropFilter:"blur(3px)" }}>
    <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth, boxShadow:"0 20px 60px rgba(0,0,0,0.18)", overflow:"hidden", animation:"slideUp .2s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px", borderBottom:"1px solid #F1F5F9" }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#1E2A4A", margin:0 }}>{title}</h2>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8" }}><X size={20}/></button>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
    <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
  </div>
);

// ── AssignerDropdown ──────────────────────────────────────────────────────────
const AssignerDropdown = ({ projet, onAssigned }) => {
  const [open, setOpen]           = useState(false);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [msg, setMsg]             = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleOpen = async () => {
    const next = !open; setOpen(next);
    if (!next) return;
    setLoading(true); setMsg("");
    try {
      const { data: allUsers } = await API.get("/utilisateurs");
      const allDesigners = Array.isArray(allUsers) ? allUsers.filter(u => u.rôle === "designer") : [];
      const { data: affectations } = await API.get(`/affectations/projet/${projet._id}`);
      const affectedIds = new Set((Array.isArray(affectations) ? affectations : []).map(a => String(a.id_designer?._id || a.id_designer)));
      setDesigners(allDesigners.filter(d => !affectedIds.has(String(d._id))));
    } catch { setMsg("Erreur chargement"); }
    finally { setLoading(false); }
  };

  const handleAssigner = async (d) => {
    setAssigning(d._id);
    try {
      await API.post("/affectations", { id_projet: projet._id, id_designer: d._id });
      setMsg("✅ " + d.nom + " assigné !");
      setDesigners(prev => prev.filter(x => x._id !== d._id));
      onAssigned && onAssigned();
      setTimeout(() => { setOpen(false); setMsg(""); }, 1500);
    } catch (err) { setMsg("❌ " + (err.response?.data?.message || "Erreur")); }
    finally { setAssigning(null); }
  };

  return (
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      {/* feature/amine : bouton désactivé si statut "Refusé" */}
      <button
        onClick={handleOpen}
        title={projet.statut !== "Refusé" ? "Assigner un designer" : undefined}
        disabled={projet.statut === "Refusé"}
        style={{ ...iconBtn, color:"#059669", opacity: projet.statut === "Refusé" ? 0.3 : 1 }}
      >
        <UserPlus size={15}/>
      </button>
      {open && (
        <div style={{ position:"absolute", right:0, top:"110%", zIndex:500, background:"white", borderRadius:12, minWidth:240, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", border:"1px solid #E2E8F0", overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid #F1F5F9", fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>Designers disponibles</div>
          {msg && <div style={{ padding:"8px 14px", fontSize:13, color: msg.startsWith("✅")?"#059669":"#DC2626", background: msg.startsWith("✅")?"#F0FDF4":"#FEF2F2" }}>{msg}</div>}
          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:16 }}><Loader size={18} color="#2563EB"/></div>
          ) : designers.length === 0 && !msg ? (
            <div style={{ padding:"12px 14px", fontSize:13, color:"#94A3B8", textAlign:"center" }}>Tous les designers sont déjà assignés</div>
          ) : (
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {designers.map(d => (
                <button key={d._id} onClick={() => handleAssigner(d)} disabled={!!assigning}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"none", border:"none", cursor:assigning?"not-allowed":"pointer", borderBottom:"1px solid #F8FAFC" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#059669,#0D9488)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:11, flexShrink:0 }}>{d.nom?.charAt(0)}</div>
                  <div style={{ textAlign:"left", flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1E293B" }}>{d.nom}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>{d.email}</div>
                  </div>
                  {assigning === d._id ? <Loader size={13} color="#059669"/> : <UserPlus size={13} color="#059669"/>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── DetailModal ───────────────────────────────────────────────────────────────
const DetailModal = ({ projet, onClose, onEdit, onDelete, getStatutColor }) => {
  const sc = getStatutColor(projet.statut);
  const [affectations, setAffectations] = useState([]);
  const [loadingAff, setLoadingAff]     = useState(true);
  const [msgAff, setMsgAff]             = useState("");

  const fetchAff = async () => {
    setLoadingAff(true);
    try {
      const { data } = await API.get(`/affectations/projet/${projet._id}`);
      setAffectations(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoadingAff(false); }
  };
  useEffect(() => { fetchAff(); }, []);

  const handleRetirer = async (id) => {
    try { await API.delete(`/affectations/${id}`); setMsgAff("Designer retiré."); fetchAff(); }
    catch { setMsgAff("❌ Erreur."); }
  };

  return (
    <Modal title="Détails du projet" onClose={onClose} maxWidth={620}>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
          <div>
            <div style={{ fontSize:13, color:"#94A3B8", marginBottom:4 }}>Nom du projet</div>
            <div style={{ fontSize:17, fontWeight:700 }}>{projet.nom}</div>
          </div>
          <span style={{ background:sc.bg, color:sc.color, borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>{projet.statut}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#F8FAFC", borderRadius:10 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#2563EB,#7C3AED)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14 }}>{projet.id_client?.nom?.charAt(0)||"?"}</div>
          <div><div style={{ fontSize:14, fontWeight:600 }}>{projet.id_client?.nom||"—"}</div><div style={{ fontSize:12, color:"#94A3B8" }}>{projet.id_client?.email}</div></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={dCard}><Calendar size={14} color="#2563EB" style={{ marginBottom:4 }}/><div style={{ fontSize:12, color:"#94A3B8" }}>Début</div><div style={{ fontWeight:600, fontSize:14 }}>{new Date(projet.date_début).toLocaleDateString("fr-FR")}</div></div>
          <div style={dCard}><Calendar size={14} color="#7C3AED" style={{ marginBottom:4 }}/><div style={{ fontSize:12, color:"#94A3B8" }}>Fin</div><div style={{ fontWeight:600, fontSize:14 }}>{new Date(projet.date_fin).toLocaleDateString("fr-FR")}</div></div>
        </div>
        {projet.description && (
          <div style={dCard}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <AlignLeft size={14} color="#64748B"/>
              <span style={{ fontSize:12, color:"#94A3B8" }}>Description</span>
            </div>
            <p style={{ margin:0, fontSize:14, color:"#374151", lineHeight:1.6 }}>{projet.description}</p>
          </div>
        )}
        <div style={{ borderTop:"1px solid #F1F5F9", paddingTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <Users size={16} color="#2563EB"/><span style={{ fontWeight:700, fontSize:15 }}>Designers assignés ({affectations.length})</span>
          </div>
          {msgAff && <div style={{ padding:"8px 12px", borderRadius:8, marginBottom:12, fontSize:13, color:"#64748B", background:"#F8FAFC" }}>{msgAff}</div>}
          {loadingAff ? <div style={{ display:"flex", justifyContent:"center", padding:16 }}><Loader size={20} color="#2563EB"/></div>
          : affectations.length === 0 ? <div style={{ textAlign:"center", padding:"12px 0", color:"#94A3B8", fontSize:13 }}>Aucun designer assigné.</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {affectations.map(a => (
                <div key={a._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#F8FAFC", borderRadius:10, border:"1px solid #E2E8F0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#059669,#0D9488)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12 }}>{a.id_designer?.nom?.charAt(0)||"?"}</div>
                    <div><div style={{ fontSize:13, fontWeight:600 }}>{a.id_designer?.nom}</div><div style={{ fontSize:11, color:"#94A3B8" }}>{a.id_designer?.email}</div></div>
                  </div>
                  {/* feature/amine : badge lu/non lu */}
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    padding:"6px 12px", borderRadius:999, fontSize:12, fontWeight:500,
                    background: a.lu ? "#ECFDF5" : "#F3F4F6",
                    color:      a.lu ? "#16A34A" : "#6B7280",
                    border:     a.lu ? "1px solid #BBF7D0" : "1px solid #E5E7EB",
                  }}>
                    {a.lu ? <><CheckCircle size={14}/><span>Lu</span></> : <span>Non lu</span>}
                  </div>
                  <button onClick={() => handleRetirer(a._id)} style={{ background:"none", border:"1px solid #FECACA", borderRadius:8, cursor:"pointer", color:"#DC2626", padding:"4px 10px", display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
                    <UserMinus size={13}/> Retirer
                  </button>
                </div>
              ))}
            </div>
          }
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", borderTop:"1px solid #F1F5F9", paddingTop:16 }}>
          <button onClick={onDelete} style={btnDanger}><Trash2 size={15}/> Supprimer</button>
          <button onClick={onEdit} style={btnPrimary}><Pencil size={15}/> Modifier</button>
        </div>
      </div>
    </Modal>
  );
};

// ── EditModal ─────────────────────────────────────────────────────────────────
const EditModal = ({ projet, users, onClose, onSaved, setMsg }) => {
  const [form, setForm] = useState({
    nom: projet.nom || "", description: projet.description || "",
    date_début: projet.date_début ? projet.date_début.slice(0, 10) : "",
    date_fin:   projet.date_fin   ? projet.date_fin.slice(0, 10)   : "",
    statut: projet.statut || "En cours",
    id_client: projet.id_client?._id || projet.id_client || "",
  });
  const [formErrors, setFormErrors] = useState({ date_début: "", date_fin: "" });
  const [saving, setSaving] = useState(false);
  const clients = users.filter(u => u.rôle === "client");

  const exportProjetsExcel = () => {
    const headers = ["Projet", "Client", "Email client", "Date début", "Date fin", "Statut", "Demanded"];
    const rows = projets.map((p) => [
      p.nom || "",
      p.id_client?.nom || "",
      p.id_client?.email || "",
      p.date_début ? new Date(p.date_début).toLocaleDateString("fr-FR") : "",
      p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "",
      p.statut || "",
      p.demanded ? "Oui" : "Non",
    ]);
    exportBeautifulExcel({
      title: "Liste des projets",
      headers,
      rows,
      filenamePrefix: "projets-admin",
      sheetName: "Projets",
    });
  };

  const handleDateChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated); setFormErrors(validerDates(updated.date_début, updated.date_fin));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validerDates(form.date_début, form.date_fin);
    setFormErrors(errors);
    if (errors.date_début || errors.date_fin) return;
    setSaving(true);
    try {
      await API.put(`/projets/${projet._id}`, form);
      setMsg({ type:"success", text:"✅ Projet modifié." }); onSaved();
    } catch (err) { setMsg({ type:"error", text:`❌ ${err.response?.data?.message || "Erreur"}` }); }
    finally { setSaving(false); }
  };

  const hasErr = formErrors.date_début || formErrors.date_fin;
  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <form onSubmit={handleSave}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Nom *</label><input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} required style={inp}/></div>
          <div><label style={lbl}>Client</label><select value={form.id_client} onChange={e=>setForm({...form,id_client:e.target.value})} style={inp}><option value="">Choisir</option>{clients.map(c=><option key={c._id} value={c._id}>{c.nom}</option>)}</select></div>
          <div><label style={lbl}>Statut</label><select value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})} style={inp}>{["En cours","En révision","Validé","Refusé","Terminé"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>Date début *</label><input type="date" value={form.date_début} onChange={e=>handleDateChange("date_début",e.target.value)} required style={{...inp,borderColor:formErrors.date_début?"#DC2626":"#E2E8F0"}}/><FieldError msg={formErrors.date_début}/></div>
          <div><label style={lbl}>Date fin *</label><input type="date" value={form.date_fin} onChange={e=>handleDateChange("date_fin",e.target.value)} required style={{...inp,borderColor:formErrors.date_fin?"#DC2626":"#E2E8F0"}}/><FieldError msg={formErrors.date_fin}/></div>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} style={{...inp,resize:"vertical"}}/></div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnOutline}>Annuler</button>
          <button type="submit" disabled={saving || !!hasErr} style={{...btnPrimary, opacity:saving||hasErr?0.7:1, cursor:saving||hasErr?"not-allowed":"pointer"}}>
            {saving ? <Loader size={15}/> : <Save size={15}/>}{saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ── DeleteModal ───────────────────────────────────────────────────────────────
const DeleteModal = ({ projet, onClose, onConfirm, deleting }) => (
  <Modal title="Supprimer le projet" onClose={onClose}>
    <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
      <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(220,38,38,0.1)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><Trash2 size={24} color="#DC2626"/></div>
      <p style={{ fontSize:15, color:"#374151", marginBottom:6 }}>Voulez-vous vraiment supprimer</p>
      <p style={{ fontSize:16, fontWeight:700, color:"#1E293B", marginBottom:20 }}>« {projet.nom} » ?</p>
      <p style={{ fontSize:13, color:"#94A3B8", marginBottom:24 }}>Cette action est irréversible.</p>
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <button onClick={onClose} style={btnOutline}>Annuler</button>
        <button onClick={onConfirm} disabled={deleting} style={{...btnDanger, opacity:deleting?0.7:1}}>
          {deleting ? <Loader size={15}/> : <Trash2 size={15}/>}{deleting ? "Suppression..." : "Supprimer"}
        </button>
      </div>
    </div>
  </Modal>
);

// ── AdminProjets ──────────────────────────────────────────────────────────────
const AdminProjets = () => {
  const [projets, setProjets]             = useState([]);
  const [users, setUsers]                 = useState([]);
  const [maquettes, setMaquettes]         = useState([]);
  const [fetching, setFetching]           = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [projetLoading, setProjetLoading] = useState(false);
  const [msg, setMsg]                     = useState({ type:"", text:"" });
  const [form, setForm] = useState({ nom:"", description:"", date_début:"", date_fin:"", statut:"En attente", id_client:"", demanded:false });
  const [formErrors, setFormErrors]       = useState({ date_début:"", date_fin:"" });
  const [detailProjet, setDetailProjet]   = useState(null);
  const [editProjet, setEditProjet]       = useState(null);
  const [deleteProjet, setDeleteProjet]   = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const navigate = useNavigate();

  const fetchProjets = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/projets");
      setProjets(Array.isArray(data) ? data.filter(p => !(p.demanded && p.statut === "En attente")) : []);
    } catch {} finally { setFetching(false); }
  };

  useEffect(() => {
    fetchProjets();
    API.get("/utilisateurs").then(r => setUsers(r.data)).catch(() => {});
    API.get("/maquettes").then(r => {
      const list = Array.isArray(r.data) ? r.data : r.data?.maquettes || [];
      setMaquettes(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ type:"", text:"" }), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // ✅ FIX: vérifie si une maquette existe pour ce projet dans la liste chargée
  const getMaquette = (projetId) =>
    maquettes.some(m => String(m.id_projet?._id || m.id_projet) === String(projetId));

  const handleDateChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated); setFormErrors(validerDates(updated.date_début, updated.date_fin));
  };

  const hasCreateDateErrors = formErrors.date_début || formErrors.date_fin;

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validerDates(form.date_début, form.date_fin);
    setFormErrors(errors);
    if (errors.date_début || errors.date_fin) return;
    if (!form.nom || !form.id_client || !form.date_début || !form.date_fin) {
      setMsg({ type:"error", text:"❌ Champs obligatoires manquants." }); return;
    }
    setProjetLoading(true);
    try {
      await API.post("/projets", form);
      setMsg({ type:"success", text:"✅ Projet créé !" });
      setForm({ nom:"", description:"", date_début:"", date_fin:"", statut:"En attente", id_client:"", demanded:false });
      setFormErrors({ date_début:"", date_fin:"" });
      setShowForm(false); fetchProjets();
    } catch (e) { setMsg({ type:"error", text:`❌ ${e.response?.data?.message || "Erreur"}` }); }
    finally { setProjetLoading(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/projets/${deleteProjet._id}`);
      setMsg({ type:"success", text:"✅ Projet supprimé." });
      setDeleteProjet(null); setDetailProjet(null); fetchProjets();
    } catch (e) { setMsg({ type:"error", text:`❌ ${e.response?.data?.message || "Erreur"}` }); }
    finally { setDeleting(false); }
  };

  const getStatutColor = (s) => ({
    "En cours":    { color:"#2563EB", bg:"rgba(37,99,235,0.1)"  },
    "En attente":  { color:"#D97706", bg:"rgba(217,119,6,0.1)"  },
    "En révision": { color:"#D97706", bg:"rgba(217,119,6,0.1)"  },
    Validé:        { color:"#059669", bg:"rgba(5,150,105,0.1)"  },
    Refusé:        { color:"#DC2626", bg:"rgba(220,38,38,0.1)"  },
    Terminé:       { color:"#7C3AED", bg:"rgba(124,58,237,0.1)" },
  }[s] || { color:"#64748B", bg:"rgba(100,116,139,0.1)" });

  // ✅ FIX: GET /maquettes/projet/:id retourne un TABLEAU
  const openEditor = async (projet) => {
    try {
      const { data: liste } = await API.get(`/maquettes/projet/${projet._id}`);
      const maquette = Array.isArray(liste) && liste.length > 0 ? liste[0] : null;
      if (!maquette) {
        setMsg({ type:"error", text:"❌ Aucune maquette pour ce projet." });
        return;
      }
      navigate(`/admin/editeur/${maquette._id}`);
    } catch (e) {
      console.error(e);
      setMsg({ type:"error", text:"❌ Erreur ouverture éditeur." });
    }
  };

  const clients = users.filter(u => u.rôle === "client");

  const exportProjetsExcel = () => {
    const headers = ["Projet", "Client", "Email client", "Date début", "Date fin", "Statut", "Demanded"];
    const rows = projets.map((p) => [
      p.nom || "",
      p.id_client?.nom || "",
      p.id_client?.email || "",
      p.date_début ? new Date(p.date_début).toLocaleDateString("fr-FR") : "",
      p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "",
      p.statut || "",
      p.demanded ? "Oui" : "Non",
    ]);
    exportBeautifulExcel({
      title: "Liste des projets",
      headers,
      rows,
      filenamePrefix: "projets-admin",
      sheetName: "Projets",
    });
  };

  return (
    <div>
      {deleteProjet && <DeleteModal projet={deleteProjet} onClose={() => setDeleteProjet(null)} onConfirm={handleDelete} deleting={deleting}/>}
      {!deleteProjet && editProjet && <EditModal projet={editProjet} users={users} onClose={() => setEditProjet(null)} onSaved={() => { setEditProjet(null); setDetailProjet(null); fetchProjets(); }} setMsg={setMsg}/>}
      {!deleteProjet && !editProjet && detailProjet && <DetailModal projet={detailProjet} onClose={() => setDetailProjet(null)} onEdit={() => setEditProjet(detailProjet)} onDelete={() => setDeleteProjet(detailProjet)} getStatutColor={getStatutColor}/>}

      <h1 style={{ fontSize:24, fontWeight:600, marginBottom:8 }}>Gestion des projets</h1>
      <p style={{ color:"#64748B", fontSize:14, marginBottom:28 }}>Créez, gérez et assignez des designers aux projets.</p>

      {msg.text && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:10, marginBottom:20, background: msg.type==="success"?"#F0FDF4":"#FEF2F2", color: msg.type==="success"?"#059669":"#DC2626", border:`1px solid ${msg.type==="success"?"#BBF7D0":"#FECACA"}` }}>
          {msg.type==="success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}{msg.text}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontSize:18, fontWeight:600 }}>Tous les projets ({projets.length})</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={exportProjetsExcel} style={{ background:"#0f766e", color:"white", border:"none", borderRadius:10, padding:"10px 14px", cursor:"pointer", fontWeight:600, fontSize:14 }}>
            Exporter Excel
          </button>
          <button onClick={() => { setShowForm(!showForm); setFormErrors({ date_début:"", date_fin:"" }); }} style={{ display:"flex", alignItems:"center", gap:8, background:"#2563EB", color:"white", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:600, fontSize:14 }}>
            <FolderPlus size={18}/>{showForm ? "Annuler" : "Nouveau projet"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:24, borderLeft:"4px solid #2563EB", padding:24 }}>
          <h3 style={{ marginBottom:20 }}><FolderPlus size={18}/> Créer un projet</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div><label style={lbl}>Nom *</label><input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="ex: Refonte site" required style={inp}/></div>
              <div><label style={lbl}>Client *</label><select value={form.id_client} onChange={e=>setForm({...form,id_client:e.target.value})} required style={inp}><option value="">Choisir un client</option>{clients.map(c=><option key={c._id} value={c._id}>{c.nom} — {c.email}</option>)}</select></div>
              <div><label style={lbl}>Date début *</label><input type="date" value={form.date_début} onChange={e=>handleDateChange("date_début",e.target.value)} required style={{...inp,borderColor:formErrors.date_début?"#DC2626":"#E2E8F0"}}/><FieldError msg={formErrors.date_début}/></div>
              <div><label style={lbl}>Date fin *</label><input type="date" value={form.date_fin} onChange={e=>handleDateChange("date_fin",e.target.value)} required style={{...inp,borderColor:formErrors.date_fin?"#DC2626":"#E2E8F0"}}/><FieldError msg={formErrors.date_fin}/></div>
              <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} style={{...inp,resize:"vertical"}}/></div>
            </div>
            <button type="submit" disabled={projetLoading || !!hasCreateDateErrors}
              style={{ display:"flex", alignItems:"center", gap:8, background: projetLoading||hasCreateDateErrors?"#93C5FD":"#2563EB", color:"white", border:"none", borderRadius:10, padding:"12px 28px", cursor: projetLoading||hasCreateDateErrors?"not-allowed":"pointer", fontWeight:600 }}>
              {projetLoading ? <Loader size={16}/> : <FolderPlus size={16}/>}{projetLoading ? "Création..." : "Créer le projet"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {fetching ? (
          <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Loader size={32} color="#2563EB"/></div>
        ) : projets.length === 0 ? (
          <div style={{ textAlign:"center", padding:48, color:"#94A3B8" }}><div style={{ fontSize:48, marginBottom:12 }}>📁</div><p style={{ fontWeight:600 }}>Aucun projet.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Projet</th><th>Client</th><th>Dates</th><th>Statut</th><th style={{ textAlign:"center" }}>Demanded</th><th style={{ textAlign:"center" }}>Actions</th><th style={{ textAlign:"center" }}>Éditeur</th></tr>
              </thead>
              <tbody>
                {projets.map(p => {
                  const sc = getStatutColor(p.statut);
                  const hasMaq = getMaquette(p._id);
                  return (
                    <tr key={p._id}>
                      <td><div style={{ fontWeight:600 }}>{p.nom}</div>{p.description&&<div style={{ fontSize:12, color:"#94A3B8" }}>{p.description.slice(0,50)}...</div>}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#2563EB,#7C3AED)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>{p.id_client?.nom?.charAt(0)||"?"}</div>
                          <div><div style={{ fontSize:13, fontWeight:600 }}>{p.id_client?.nom||"—"}</div><div style={{ fontSize:11, color:"#94A3B8" }}>{p.id_client?.email}</div></div>
                        </div>
                      </td>
                      <td><div style={{ fontSize:12, color:"#64748B" }}>📅 {new Date(p.date_début).toLocaleDateString("fr-FR")}</div><div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>🏁 {new Date(p.date_fin).toLocaleDateString("fr-FR")}</div></td>
                      <td><span style={{ background:sc.bg, color:sc.color, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>{p.statut}</span></td>
                      <td style={{ textAlign:"center" }}><span style={{ background: p.demanded?"rgba(5,150,105,0.1)":"rgba(100,116,139,0.1)", color: p.demanded?"#059669":"#64748B", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>{p.demanded?"✅ Oui":"❌ Non"}</span></td>
                      <td style={{ textAlign:"center" }}>
                        <div style={{ display:"flex", gap:6, justifyContent:"center", alignItems:"center" }}>
                          <AssignerDropdown projet={p} onAssigned={() => setMsg({ type:"success", text:`✅ Designer assigné à "${p.nom}"` })}/>
                          <button onClick={() => { setDetailProjet(p); setEditProjet(null); setDeleteProjet(null); }} title="Voir" style={{...iconBtn, color:"#2563EB"}}><Eye size={15}/></button>
                          <button onClick={() => { setEditProjet(p); setDetailProjet(null); setDeleteProjet(null); }} title="Modifier" style={{...iconBtn, color:"#D97706"}}><Pencil size={15}/></button>
                          <button onClick={() => { setDeleteProjet(p); setDetailProjet(null); setEditProjet(null); }} title="Supprimer" style={{...iconBtn, color:"#DC2626"}}><Trash2 size={15}/></button>
                        </div>
                      </td>
                      <td style={{ textAlign:"center" }}>
                        {hasMaq ? (
                          <button onClick={() => openEditor(p)} style={btnGoEditor}>
                            <Image size={16}/> Ouvrir l'éditeur <ChevronRight size={16}/>
                          </button>
                        ) : (
                          <span style={{ fontSize:12, color:"#CBD5E1" }}>⏳ Non générée</span>
                        )}
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

// ── shared styles ─────────────────────────────────────────────────────────────
const lbl       = { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 };
const inp       = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" };
const dCard     = { background:"#F8FAFC", borderRadius:10, padding:"12px 14px", border:"1px solid #F1F5F9" };
const iconBtn   = { background:"none", border:"1px solid currentColor", borderRadius:8, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"5px 8px" };
const btnPrimary  = { display:"inline-flex", alignItems:"center", gap:7, background:"#2563EB", color:"white", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:600, fontSize:14 };
const btnOutline  = { display:"inline-flex", alignItems:"center", gap:7, background:"white", color:"#374151", border:"1px solid #E2E8F0", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:600, fontSize:14 };
const btnDanger   = { display:"inline-flex", alignItems:"center", gap:7, background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:600, fontSize:14 };
const btnGoEditor = { display:"inline-flex", alignItems:"center", gap:6, background:"#7C3AED", color:"white", border:"none", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" };

export default AdminProjets;