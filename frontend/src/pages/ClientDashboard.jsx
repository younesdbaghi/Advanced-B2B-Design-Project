import { useState, useEffect, useContext, useRef } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import {
  Briefcase, Clock, CheckCircle, AlertCircle,
  FileText, Loader, PlusCircle, Send,
  Edit2, X, Image, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Canvas Fabric.js lecture seule ────────────────────────────────────────────
const loadFabric = () =>
  new Promise((resolve) => {
    if (window.fabric) return resolve(window.fabric);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";
    script.onload = () => resolve(window.fabric);
    document.head.appendChild(script);
  });

const MaquetteCanvas = ({ maquette }) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [loadingCanvas, setLoadingCanvas] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setLoadingCanvas(true); setError("");
        const fabric = await loadFabric();
        const { data: version } = await API.get(`/maquettes/${maquette._id}/latest-version`);
        if (!isMounted) return;
        if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
        const canvas = new fabric.Canvas(canvasRef.current, { width: 1200, height: 700, selection: false, interactive: false });
        fabricRef.current = canvas;
        fabric.Object.prototype.selectable = false;
        fabric.Object.prototype.evented = false;
        fabric.Object.prototype.hasControls = false;
        fabric.Object.prototype.hasBorders = false;

        if (maquette.image_fond) {
          await new Promise((res) => {
            fabric.Image.fromURL(maquette.image_fond, (img) => {
              canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: canvas.width / img.width, scaleY: canvas.height / img.height,
              });
              res();
            }, { crossOrigin: "anonymous" });
          });
        }

        // version est l'objet directement (pas de wrapper)
        const contenu = version?.contenu;
        if (contenu?.objects?.length > 0) {
          await new Promise((res) => {
            canvas.loadFromJSON(contenu, () => {
              canvas.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
              canvas.renderAll(); res();
            });
          });
        } else { canvas.renderAll(); }
        setLoadingCanvas(false);
      } catch (e) {
        console.error(e);
        if (isMounted) { setError("Impossible de charger la maquette."); setLoadingCanvas(false); }
      }
    };
    init();
    return () => { isMounted = false; if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; } };
  }, [maquette._id]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {loadingCanvas && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#F8FAFC", borderRadius:10, zIndex:10, minHeight:300 }}>
          <Loader size={32} color="#7C3AED" style={{ marginBottom:12 }}/>
          <span style={{ color:"#64748B", fontSize:14 }}>Chargement...</span>
        </div>
      )}
      {error ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:300, color:"#DC2626", gap:8 }}>
          <AlertCircle size={32}/><span style={{ fontSize:14 }}>{error}</span>
        </div>
      ) : (
        <div style={{ width:"100%", overflowX:"auto", border:"1px solid #E2E8F0", borderRadius:10, background:"#fff", maxHeight:"60vh" }}>
          <canvas ref={canvasRef}/>
        </div>
      )}
    </div>
  );
};

const FieldError = ({ msg }) =>
  msg ? <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:5, color:"#DC2626", fontSize:12 }}><AlertCircle size={12}/>{msg}</div> : null;

// ── ClientDashboard ───────────────────────────────────────────────────────────
const ClientDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [projects, setProjects]       = useState([]);
  const [maquettesMap, setMaquettesMap] = useState({});
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [sending, setSending]         = useState(false);
  const [msg, setMsg]                 = useState({ type: "", text: "" });

  const [form, setForm]             = useState({ nom: "", description: "", date_début: "", date_fin: "" });
  const [formErrors, setFormErrors] = useState({ date_début: "", date_fin: "" });
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [editErrors, setEditErrors] = useState({ date_début: "", date_fin: "" });

  const today = new Date().toISOString().split("T")[0];

  // ── Fetch projets + maquettes ──────────────────────────────────────────────
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/projets");
      // Le serveur filtre déjà par client connecté
      const mesProjets = Array.isArray(data) ? data : [];
      setProjects(mesProjets);

      // Récupérer la maquette de chaque projet
      // GET /maquettes/projet/:id retourne un TABLEAU d'objets maquette
      const entries = await Promise.all(
        mesProjets.map(async (p) => {
          try {
            const { data: liste } = await API.get(`/maquettes/projet/${p._id}`);
            // On prend la première maquette du tableau (la plus récente)
            const maquette = Array.isArray(liste) && liste.length > 0 ? liste[0] : null;
            return [String(p._id), maquette];
          } catch {
            return [String(p._id), null];
          }
        })
      );
      setMaquettesMap(Object.fromEntries(entries));
    } catch (err) {
      console.error("Erreur projets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // ── Validation dates ───────────────────────────────────────────────────────
  const validerDates = (debut, fin) => {
    const errors = { date_début: "", date_fin: "" };
    if (debut && fin && fin < debut) errors.date_fin = "La date de fin ne peut pas être avant la date de début.";
    return errors;
  };

  // ── Demande projet ─────────────────────────────────────────────────────────
  const handleDemandeProjet = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.date_début || !form.date_fin) { setMsg({ type:"error", text:"❌ Tous les champs obligatoires." }); return; }
    const errors = validerDates(form.date_début, form.date_fin);
    setFormErrors(errors);
    if (errors.date_début || errors.date_fin) return;
    setSending(true); setMsg({ type:"", text:"" });
    try {
      await API.post("/projets/demande", { nom:form.nom, description:form.description, date_début:form.date_début, date_fin:form.date_fin });
      setMsg({ type:"success", text:"✅ Demande envoyée ! L'admin va la traiter." });
      setForm({ nom:"", description:"", date_début:"", date_fin:"" });
      setFormErrors({ date_début:"", date_fin:"" });
      setShowForm(false); fetchProjects();
    } catch (err) { setMsg({ type:"error", text:`❌ ${err.response?.data?.message || "Erreur"}` }); }
    finally { setSending(false); }
  };

  // ── Edit demande ───────────────────────────────────────────────────────────
  const startEdit = (p) => {
    setEditingId(p._id); setEditErrors({ date_début:"", date_fin:"" });
    setEditForm({ nom:p.nom, description:p.description||"", date_début:p.date_début?.slice(0,10), date_fin:p.date_fin?.slice(0,10) });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.nom || !editForm.date_début || !editForm.date_fin) { setMsg({ type:"error", text:"❌ Champs obligatoires manquants." }); return; }
    const errors = validerDates(editForm.date_début, editForm.date_fin);
    setEditErrors(errors);
    if (errors.date_début || errors.date_fin) return;
    setSending(true);
    try {
      await API.put(`/projets/${editingId}`, editForm);
      setMsg({ type:"success", text:"✅ Demande modifiée." });
      setEditingId(null); fetchProjects();
    } catch (err) { setMsg({ type:"error", text:`❌ ${err.response?.data?.message || "Erreur"}` }); }
    finally { setSending(false); }
  };

  const handleAnnuler = async (p) => {
    if (!window.confirm(`Annuler la demande "${p.nom}" ?`)) return;
    try {
      await API.delete(`/projets/${p._id}`);
      setMsg({ type:"success", text:"✅ Demande annulée." }); fetchProjects();
    } catch (err) { setMsg({ type:"error", text:`❌ ${err.response?.data?.message || "Erreur"}` }); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getMaquette  = (p) => maquettesMap[String(p._id)] ?? null;
  const canView      = (p) => p.statut !== "Refusé" && getMaquette(p) !== null;
  const getDisabledLabel = (p) => p.statut === "Refusé" ? "🚫 Projet refusé" : "⏳ Maquette non générée";

  const getStatusBadge = (statut) => {
    const map = {
      "En cours":    { color:"#2563EB", bg:"rgba(37,99,235,0.1)",  icon:<Clock size={14}/> },
      "En révision": { color:"#D97706", bg:"rgba(217,119,6,0.1)",  icon:<Clock size={14}/> },
      "Validé":      { color:"#059669", bg:"rgba(5,150,105,0.1)",  icon:<CheckCircle size={14}/> },
      "Refusé":      { color:"#DC2626", bg:"rgba(220,38,38,0.1)",  icon:<AlertCircle size={14}/> },
      "Terminé":     { color:"#7C3AED", bg:"rgba(124,58,237,0.1)", icon:<CheckCircle size={14}/> },
      "En attente":  { color:"#D97706", bg:"rgba(217,119,6,0.1)",  icon:<Clock size={14}/> },
    };
    return map[statut] || { color:"#64748B", bg:"rgba(100,116,139,0.1)", icon:null };
  };

  const demandesEnAttente = projects.filter(p => p.demanded && p.statut === "En attente");
  const projetsActifs     = projects.filter(p => !p.demanded || p.statut !== "En attente");
  const inpErr = { ...inp, border:"1px solid #DC2626" };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:600 }}>Mes projets</h1>
        <button onClick={() => { setShowForm(!showForm); setFormErrors({ date_début:"", date_fin:"" }); }} style={{ display:"flex", alignItems:"center", gap:8, background:"#2563EB", color:"white", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:600, fontSize:14 }}>
          <PlusCircle size={18}/>{showForm ? "Annuler" : "Demander un projet"}
        </button>
      </div>

      {msg.text && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:10, marginBottom:20, background: msg.type==="success"?"#F0FDF4":"#FEF2F2", color: msg.type==="success"?"#059669":"#DC2626", border:`1px solid ${msg.type==="success"?"#BBF7D0":"#FECACA"}` }}>
          {msg.type==="success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}{msg.text}
        </div>
      )}

      {/* ── Formulaire demande ── */}
      {showForm && (
        <div className="card" style={{ marginBottom:24, borderLeft:"4px solid #2563EB", padding:24 }}>
          <h3 style={{ marginBottom:20, display:"flex", alignItems:"center", gap:8, color:"#1E2A4A" }}><Send size={20}/> Demander un nouveau projet</h3>
          <form onSubmit={handleDemandeProjet}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Nom du projet *</label>
                <input value={form.nom} onChange={e=>setForm({...form, nom:e.target.value})} placeholder="ex: Refonte de mon site web" required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Date de début souhaitée *</label>
                <input type="date" value={form.date_début} min={today}
                  onChange={e=>{ const d=e.target.value; const f=form.date_fin&&form.date_fin<d?"":form.date_fin; setForm({...form,date_début:d,date_fin:f}); setFormErrors(validerDates(d,f)); }}
                  required style={formErrors.date_début?inpErr:inp}/>
                <FieldError msg={formErrors.date_début}/>
              </div>
              <div>
                <label style={lbl}>Date de livraison souhaitée *</label>
                <input type="date" value={form.date_fin} min={form.date_début||today}
                  onChange={e=>{ const f=e.target.value; setForm({...form,date_fin:f}); setFormErrors(validerDates(form.date_début,f)); }}
                  required style={formErrors.date_fin?inpErr:inp}/>
                <FieldError msg={formErrors.date_fin}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Description</label>
                <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Décrivez votre projet..." rows={4} style={{...inp,resize:"vertical"}}/>
              </div>
            </div>
            <button type="submit" disabled={sending} style={{ display:"flex", alignItems:"center", gap:8, background:sending?"#93C5FD":"#2563EB", color:"white", border:"none", borderRadius:10, padding:"12px 24px", cursor:sending?"not-allowed":"pointer", fontWeight:600, fontSize:14 }}>
              {sending?<Loader size={16}/>:<Send size={16}/>}{sending?"Envoi...":"Envoyer la demande"}
            </button>
          </form>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:16, marginBottom:28 }}>
        {[
          { label:"Projets actifs",       count:projetsActifs.filter(p=>p.statut==="En cours").length,  color:"#2563EB", bg:"rgba(37,99,235,0.1)",  icon:<Briefcase size={22}/> },
          { label:"Demandes en attente",  count:demandesEnAttente.length,                               color:"#D97706", bg:"rgba(217,119,6,0.1)",  icon:<Clock size={22}/> },
          { label:"Terminés",             count:projects.filter(p=>p.statut==="Terminé").length,        color:"#059669", bg:"rgba(5,150,105,0.1)",  icon:<CheckCircle size={22}/> },
          { label:"Total",                count:projects.length,                                         color:"#7C3AED", bg:"rgba(124,58,237,0.1)", icon:<FileText size={22}/> },
        ].map((s,i)=>(
          <div key={i} className="card" style={{ padding:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ background:s.bg, borderRadius:10, padding:10, color:s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:13, color:"#64748B" }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:700, color:"#1E293B" }}>{s.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Demandes en attente ── */}
      {demandesEnAttente.length > 0 && (
        <div className="card" style={{ marginBottom:24, borderLeft:"4px solid #D97706" }}>
          <h3 style={{ marginBottom:16, color:"#D97706", display:"flex", alignItems:"center", gap:8 }}>
            <Clock size={18}/> Demandes en attente ({demandesEnAttente.length})
          </h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Projet</th><th>Date début</th><th>Date fin</th><th>Statut</th><th style={{ textAlign:"center" }}>Actions</th></tr></thead>
              <tbody>
                {demandesEnAttente.map(p => (
                  <tr key={p._id}>
                    {editingId === p._id ? (
                      <td colSpan={5} style={{ padding:"16px 12px" }}>
                        <form onSubmit={handleEditSubmit}>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                            <div><label style={lbl}>Nom *</label><input value={editForm.nom} onChange={e=>setEditForm({...editForm,nom:e.target.value})} required style={inp}/></div>
                            <div>
                              <label style={lbl}>Date début *</label>
                              <input type="date" value={editForm.date_début} min={today}
                                onChange={e=>{const d=e.target.value;const f=editForm.date_fin&&editForm.date_fin<d?"":editForm.date_fin;setEditForm({...editForm,date_début:d,date_fin:f});setEditErrors(validerDates(d,f));}}
                                required style={editErrors.date_début?inpErr:inp}/>
                              <FieldError msg={editErrors.date_début}/>
                            </div>
                            <div>
                              <label style={lbl}>Date fin *</label>
                              <input type="date" value={editForm.date_fin} min={editForm.date_début||today}
                                onChange={e=>{const f=e.target.value;setEditForm({...editForm,date_fin:f});setEditErrors(validerDates(editForm.date_début,f));}}
                                required style={editErrors.date_fin?inpErr:inp}/>
                              <FieldError msg={editErrors.date_fin}/>
                            </div>
                            <div><label style={lbl}>Description</label><input value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} style={inp}/></div>
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <button type="submit" disabled={sending||!!editErrors.date_début||!!editErrors.date_fin} style={{ display:"flex", alignItems:"center", gap:6, background:sending?"#93C5FD":"#2563EB", color:"white", border:"none", borderRadius:8, padding:"8px 16px", cursor:sending?"not-allowed":"pointer", fontWeight:600, fontSize:13, opacity:(editErrors.date_début||editErrors.date_fin)?0.5:1 }}>
                              {sending?<Loader size={14}/>:<CheckCircle size={14}/>}{sending?"Sauvegarde...":"Sauvegarder"}
                            </button>
                            <button type="button" onClick={()=>setEditingId(null)} style={{ display:"flex", alignItems:"center", gap:6, background:"#F1F5F9", color:"#64748B", border:"1px solid #E2E8F0", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
                              <X size={14}/> Annuler
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td><div style={{ fontWeight:600 }}>{p.nom}</div>{p.description&&<div style={{ fontSize:12, color:"#94A3B8" }}>{p.description.slice(0,60)}...</div>}</td>
                        <td style={{ fontSize:13, color:"#64748B" }}>{new Date(p.date_début).toLocaleDateString("fr-FR")}</td>
                        <td style={{ fontSize:13, color:"#64748B" }}>{new Date(p.date_fin).toLocaleDateString("fr-FR")}</td>
                        <td><span style={{ background:"rgba(217,119,6,0.1)", color:"#D97706", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>⏳ En attente admin</span></td>
                        <td style={{ textAlign:"center" }}>
                          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
                            <button onClick={()=>startEdit(p)} style={{ ...btnSmallAction, color:"#2563EB", background:"rgba(37,99,235,0.08)" }}><Edit2 size={13}/> Modifier</button>
                            <button onClick={()=>handleAnnuler(p)} style={{ ...btnSmallAction, color:"#DC2626", background:"rgba(220,38,38,0.08)" }}><X size={13}/> Annuler</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Projets actifs ── */}
      <div className="card">
        <h3 style={{ marginBottom:20 }}>Mes projets ({projetsActifs.length})</h3>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Loader size={32} color="#2563EB"/></div>
        ) : projetsActifs.length === 0 ? (
          <div style={{ textAlign:"center", padding:48, color:"#94A3B8" }}>
            <Briefcase size={48} style={{ marginBottom:12, opacity:0.3 }}/>
            <p>Aucun projet pour l'instant.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Projet</th><th>Date début</th><th>Date fin</th><th>Statut</th><th style={{ textAlign:"right" }}>Accès Éditeur</th></tr></thead>
              <tbody>
                {projetsActifs.map(p => {
                  const s  = getStatusBadge(p.statut);
                  const mq = getMaquette(p);
                  const ok = canView(p);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <FileText size={16} color="#2563EB"/>
                          <div>
                            <div style={{ fontWeight:600 }}>{p.nom}</div>
                            {p.description && <div style={{ fontSize:12, color:"#94A3B8" }}>{p.description.slice(0,50)}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:13, color:"#64748B" }}>{new Date(p.date_début).toLocaleDateString("fr-FR")}</td>
                      <td style={{ fontSize:13, color:"#64748B" }}>{new Date(p.date_fin).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <span style={{ background:s.bg, color:s.color, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                          {s.icon} {p.statut}
                        </span>
                      </td>
                      <td style={{ textAlign:"right" }}>
                        {ok ? (
                          <button onClick={() => navigate(`/client/editeur/${mq._id}`)} style={btnGoEditor}>
                            <Image size={16}/> Ouvrir l'éditeur <ChevronRight size={16}/>
                          </button>
                        ) : (
                          <span style={{ fontSize:12, color:"#CBD5E1" }}>{getDisabledLabel(p)}</span>
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
      <style>{`button:not(:disabled):hover { opacity: 0.87; }`}</style>
    </div>
  );
};

const lbl       = { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 };
const inp       = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" };
const btnGoEditor   = { background:"#7C3AED", color:"white", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, display:"inline-flex", alignItems:"center", gap:10, transition:"all 0.2s" };
const btnSmallAction = { display:"inline-flex", alignItems:"center", gap:4, border:"1px solid rgba(0,0,0,0.1)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600 };

export default ClientDashboard;
