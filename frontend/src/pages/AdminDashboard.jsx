import { useState, useEffect, useRef } from "react";
import API from "../api";
import {
  UserPlus, Mail, User, Briefcase, Palette, Trash2, Edit, Eye,
  Loader, CheckCircle, AlertCircle, FolderPlus, Calendar, Clock,
  Bell, X, Send, ChevronDown, ChevronUp, Edit3, AlertTriangle
} from "lucide-react";
import { exportBeautifulExcel } from "../utils/excelExport";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("projets");

  // ── Notifications ──────────────────────────────────────────
  const [notifications, setNotifications]         = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount]             = useState(0);
  const notifRef = useRef(null);

  // ── Utilisateurs ───────────────────────────────────────────
  const [users, setUsers]     = useState([]);
  const [nom, setNom]         = useState("");
  const [email, setEmail]     = useState("");
  const [role, setRole]       = useState("client");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingUser, setEditingUser]     = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNom, setEditNom]   = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole]   = useState("client");
  const [viewingUser, setViewingUser]     = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Projets ────────────────────────────────────────────────
  const [projets, setProjets]               = useState([]);
  const [fetchingProjets, setFetchingProjets] = useState(true);
  const [showProjetForm, setShowProjetForm] = useState(false);
  const [projetLoading, setProjetLoading]   = useState(false);
  const [projetMsg, setProjetMsg]           = useState({ type: "", text: "" });
  const [projetForm, setProjetForm]         = useState({
    nom: "", description: "", date_début: "", date_fin: "",
    statut: "En cours", id_client: "", demanded: false,
  });

  // ── Réclamations ───────────────────────────────────────────
  const [reclamations, setReclamations]       = useState([]);
  const [loadingRecl, setLoadingRecl]         = useState(true);
  const [expandedRecl, setExpandedRecl]       = useState({});
  const [editingComments, setEditingComments] = useState({});
  const [savingComment, setSavingComment]     = useState(null);
  const [transmitting, setTransmitting]       = useState(null);
  const [reclToast, setReclToast]             = useState(null);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchUsers = async () => {
    setFetching(true);
    try { const { data } = await API.get("/utilisateurs"); setUsers(data); }
    catch { setMessage({ type: "error", text: "Impossible de charger les utilisateurs." }); }
    finally { setFetching(false); }
  };

  const fetchProjets = async () => {
    setFetchingProjets(true);
    try { const { data } = await API.get("/projets"); setProjets(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
    finally { setFetchingProjets(false); }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get("/notifications");
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.lu).length);
    } catch (e) { console.error(e); }
  };

  const fetchReclamations = async () => {
    setLoadingRecl(true);
    try {
      const { data } = await API.get("/validations/a-corriger");
      const list = Array.isArray(data) ? data : [];
      setReclamations(list);
      const init = {};
      list.forEach(r => (r.commentaires || []).forEach(c => {
        init[c._id] = c.commentaire_admin || c.commentaire_client || "";
      }));
      setEditingComments(init);
    } catch (e) { console.error(e); }
    finally { setLoadingRecl(false); }
  };

  useEffect(() => {
    fetchUsers(); fetchProjets(); fetchNotifications(); fetchReclamations();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Notifications actions ──────────────────────────────────
  const markAllAsRead = async () => {
    try { await API.patch("/notifications/mark-all-read"); setNotifications(p => p.map(n => ({...n, lu: true}))); setUnreadCount(0); }
    catch (e) { console.error(e); }
  };
  const markOneAsRead = async (id) => {
    try { await API.patch(`/notifications/${id}/read`); setNotifications(p => p.map(n => n._id === id ? {...n, lu: true} : n)); setUnreadCount(p => Math.max(0, p - 1)); }
    catch (e) { console.error(e); }
  };
  const deleteNotification = async (id) => {
    try {
      const notif = notifications.find(n => n._id === id);
      await API.delete(`/notifications/${id}`);
      setNotifications(p => p.filter(n => n._id !== id));
      setUnreadCount(p => notif && !notif.lu ? Math.max(0, p - 1) : p);
    } catch (e) { console.error(e); }
  };

  // ── Utilisateurs actions ───────────────────────────────────
  const handleCreateUser = async (e) => {
    e.preventDefault(); setMessage({ type: "", text: "" }); setLoading(true);
    try {
      const { data } = await API.post("/utilisateurs", { nom, email, rôle: role });
      setMessage({ type: "success", text: `✅ ${data.message}${data.mot_de_passe_temp ? ` (MDP temp : ${data.mot_de_passe_temp})` : ""}` });
      setNom(""); setEmail(""); fetchUsers();
    } catch (error) { setMessage({ type: "error", text: `❌ ${error.response?.data?.message || "Erreur"}` }); }
    finally { setLoading(false); }
  };
  const openViewModal  = (u) => { setViewingUser(u); setShowViewModal(true); };
  const closeViewModal = () => { setShowViewModal(false); setViewingUser(null); };
  const openEditModal  = (u) => { setEditingUser(u); setEditNom(u.nom); setEditEmail(u.email); setEditRole(u.rôle); setShowEditModal(true); };
  const closeEditModal = () => { setShowEditModal(false); setEditingUser(null); };
  const handleUpdateUser = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await API.put(`/utilisateurs/${editingUser._id}`, { nom: editNom, email: editEmail, rôle: editRole });
      setMessage({ type: "success", text: "✅ Mis à jour." }); closeEditModal(); fetchUsers();
    } catch (error) { setMessage({ type: "error", text: `❌ ${error.response?.data?.message || "Erreur"}` }); }
    finally { setLoading(false); }
  };
  const confirmDelete = (u) => { setDeleteTarget({ id: u._id, nom: u.nom }); setShowDeleteModal(true); };
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try { await API.delete(`/utilisateurs/${deleteTarget.id}`); setMessage({ type: "success", text: "✅ Supprimé." }); fetchUsers(); }
    catch (error) { setMessage({ type: "error", text: `❌ ${error.response?.data?.message || "Erreur"}` }); }
    finally { setShowDeleteModal(false); setDeleteTarget(null); }
  };

  // ── Projets actions ────────────────────────────────────────
  const handleCreateProjet = async (e) => {
    e.preventDefault(); setProjetMsg({ type: "", text: "" });
    if (!projetForm.nom || !projetForm.id_client || !projetForm.date_début || !projetForm.date_fin) {
      setProjetMsg({ type: "error", text: "❌ Nom, client, dates obligatoires." }); return;
    }
    setProjetLoading(true);
    try {
      await API.post("/projets", projetForm);
      setProjetMsg({ type: "success", text: "✅ Projet créé !" });
      setProjetForm({ nom: "", description: "", date_début: "", date_fin: "", statut: "En cours", id_client: "", demanded: false });
      setShowProjetForm(false); fetchProjets();
    } catch (error) { setProjetMsg({ type: "error", text: `❌ ${error.response?.data?.message || "Erreur"}` }); }
    finally { setProjetLoading(false); }
  };

  // ── Réclamations actions ───────────────────────────────────
  const showReclToast = (type, msg) => { setReclToast({ type, msg }); setTimeout(() => setReclToast(null), 4000); };
  const handleSaveComment = async (commentaireId) => {
    setSavingComment(commentaireId);
    try {
      await API.patch(`/commentaires-elements/${commentaireId}`, { commentaire_admin: editingComments[commentaireId] });
      setReclamations(prev => prev.map(r => ({ ...r, commentaires: (r.commentaires || []).map(c => c._id === commentaireId ? { ...c, commentaire_admin: editingComments[commentaireId] } : c) })));
      showReclToast("success", "Commentaire sauvegardé ✅");
    } catch { showReclToast("error", "Erreur sauvegarde."); }
    finally { setSavingComment(null); }
  };
  const handleTransmettre = async (validationId) => {
    if (!window.confirm("Transmettre cette réclamation au designer ?")) return;
    setTransmitting(validationId);
    try { await API.patch(`/validations/${validationId}/transmettre`); setReclamations(prev => prev.filter(r => r._id !== validationId)); showReclToast("success", "✅ Transmise au designer !"); }
    catch { showReclToast("error", "Erreur transmission."); }
    finally { setTransmitting(null); }
  };

  // ── Helpers ────────────────────────────────────────────────
  const getRoleIcon = (r) => r === "admin" ? <Briefcase size={16}/> : r === "designer" ? <Palette size={16}/> : <User size={16}/>;
  const getStatutColor = (s) => ({ "En cours": {color:"#2563EB",bg:"rgba(37,99,235,0.1)"}, "En révision": {color:"#D97706",bg:"rgba(217,119,6,0.1)"}, "Validé": {color:"#059669",bg:"rgba(5,150,105,0.1)"}, "Refusé": {color:"#DC2626",bg:"rgba(220,38,38,0.1)"}, "Terminé": {color:"#7C3AED",bg:"rgba(124,58,237,0.1)"} }[s] || {color:"#64748B",bg:"rgba(100,116,139,0.1)"});
  const formatTimeAgo = (d) => { const m = Math.floor((new Date()-new Date(d))/60000); if (m<1) return "À l'instant"; if (m<60) return `Il y a ${m} min`; if (m<1440) return `Il y a ${Math.floor(m/60)}h`; return `Il y a ${Math.floor(m/1440)}j`; };
  const clients = users.filter(u => u.rôle === "client");

  const tabs = [
    { id: "projets",      label: "📁 Projets" },
    { id: "utilisateurs", label: "👥 Utilisateurs" },
    { id: "reclamations", label: `⚠️ Réclamations${reclamations.length > 0 ? ` (${reclamations.length})` : ""}`, alert: reclamations.length > 0 },
  ];

  const exportAdminProjetsExcel = () => {
    const headers = ["Projet", "Client", "Email client", "Date début", "Date fin", "Statut", "Demandé"];
    const rows = projets.map((p) => [
      p.nom || "",
      p.id_client?.nom || "",
      p.id_client?.email || "",
      p.date_début ? new Date(p.date_début).toLocaleDateString("fr-FR") : "",
      p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "",
      p.statut || "",
      p.demanded ? "Oui" : "Non",
    ]);
    exportBeautifulExcel({ title: "Dashboard Admin - Projets", headers, rows, filenamePrefix: "dashboard-admin-projets", sheetName: "Projets" });
  };

  const exportAdminUsersExcel = () => {
    const headers = ["Nom", "Email", "Rôle"];
    const rows = users.map((u) => [u.nom || "", u.email || "", u.rôle || ""]);
    exportBeautifulExcel({ title: "Dashboard Admin - Utilisateurs", headers, rows, filenamePrefix: "dashboard-admin-utilisateurs", sheetName: "Utilisateurs" });
  };

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:600 }}>Dashboard Admin</h1>

        {/* Cloche */}
        <div style={{ position:"relative" }} ref={notifRef}>
          <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllAsRead(); }}
            style={{ position:"relative", background:"white", border:"1px solid #E2E8F0", borderRadius:12, padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"all 0.2s" }}>
            <Bell size={20} color={unreadCount > 0 ? "#2563EB" : "#64748B"}/>
            {unreadCount > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:"#EF4444", color:"white", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {showNotifications && (
            <div style={{ position:"absolute", right:0, top:"calc(100% + 10px)", width:380, maxHeight:480, background:"white", borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", border:"1px solid #E2E8F0", zIndex:999, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#FAFBFF" }}>
                <div>
                  <span style={{ fontWeight:700, fontSize:15, color:"#1E293B" }}>Notifications</span>
                  {unreadCount > 0 && <span style={{ marginLeft:8, background:"#EFF6FF", color:"#2563EB", borderRadius:20, padding:"2px 8px", fontSize:12, fontWeight:600 }}>{unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}</span>}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {notifications.some(n => !n.lu) && <button onClick={markAllAsRead} style={{ fontSize:12, color:"#2563EB", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Tout marquer lu</button>}
                  <button onClick={() => setShowNotifications(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8" }}><X size={18}/></button>
                </div>
              </div>
              <div style={{ overflowY:"auto", flex:1 }}>
                {notifications.length === 0
                  ? <div style={{ padding:"40px 20px", textAlign:"center", color:"#94A3B8" }}><Bell size={36} style={{ marginBottom:12, opacity:0.3 }}/><p style={{ fontSize:14 }}>Aucune notification</p></div>
                  : notifications.map(n => (
                    <div key={n._id} onClick={() => !n.lu && markOneAsRead(n._id)}
                      style={{ padding:"14px 20px", borderBottom:"1px solid #F8FAFC", background: n.lu ? "white" : "#EFF6FF", display:"flex", alignItems:"flex-start", gap:12, cursor: n.lu ? "default" : "pointer" }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, background: n.lu ? "#F1F5F9" : "#DBEAFE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                        {n.type === "validation" ? "✅" : n.type === "refus" ? "❌" : n.type === "demande" ? "📋" : n.type === "correction" ? "⚠️" : "🔔"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:13, color:"#1E293B", fontWeight: n.lu ? 400 : 600, lineHeight:1.5 }}>{n.message}</p>
                        <span style={{ fontSize:11, color:"#94A3B8", marginTop:4, display:"block" }}>{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                        {!n.lu && <span style={{ width:8, height:8, borderRadius:"50%", background:"#2563EB", display:"block" }}/>}
                        <button onClick={e => { e.stopPropagation(); deleteNotification(n._id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#CBD5E1", padding:2 }}><X size={14}/></button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display:"flex", gap:4, marginBottom:24, borderBottom:"2px solid #E2E8F0" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ position:"relative", padding:"10px 20px", border:"none", cursor:"pointer", fontWeight:600, fontSize:14, background:"transparent", borderBottom: activeTab === tab.id ? "2px solid #2563EB" : "2px solid transparent", color: tab.alert && activeTab !== tab.id ? "#DC2626" : activeTab === tab.id ? "#2563EB" : "#64748B", marginBottom:"-2px", borderRadius:"8px 8px 0 0" }}>
            {tab.label}
            {tab.alert && activeTab !== tab.id && <span style={{ position:"absolute", top:6, right:6, width:7, height:7, borderRadius:"50%", background:"#DC2626", animation:"pulse 1.5s ease-in-out infinite" }}/>}
          </button>
        ))}
      </div>

      {/* ════ TAB PROJETS ════ */}
      {activeTab === "projets" && (
        <div>
          {projetMsg.text && <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:10, marginBottom:20, background: projetMsg.type === "success" ? "#F0FDF4" : "#FEF2F2", color: projetMsg.type === "success" ? "#059669" : "#DC2626", border:`1px solid ${projetMsg.type === "success" ? "#BBF7D0" : "#FECACA"}` }}>{projetMsg.type === "success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}{projetMsg.text}</div>}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ fontSize:18, fontWeight:600, color:"#1E293B" }}>Liste des projets ({projets.length})</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={exportAdminProjetsExcel} style={{ background:"#0f766e", color:"white", border:"none", borderRadius:10, padding:"10px 14px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
                Exporter Excel
              </button>
              <button onClick={() => setShowProjetForm(!showProjetForm)} style={{ display:"flex", alignItems:"center", gap:8, background:"#2563EB", color:"white", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:600, fontSize:14 }}><FolderPlus size={18}/>{showProjetForm ? "Annuler" : "Nouveau projet"}</button>
            </div>
          </div>

          {showProjetForm && (
            <div className="card" style={{ marginBottom:24, borderLeft:"4px solid #2563EB", padding:24 }}>
              <h3 style={{ marginBottom:20, color:"#1E2A4A", display:"flex", alignItems:"center", gap:8 }}><FolderPlus size={20}/> Créer un nouveau projet</h3>
              <form onSubmit={handleCreateProjet}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={projetForm.nom} onChange={e => setProjetForm({...projetForm, nom:e.target.value})} placeholder="ex: Refonte site" required style={inputStyle}/></div>
                  <div><label style={labelStyle}>Client *</label><select value={projetForm.id_client} onChange={e => setProjetForm({...projetForm, id_client:e.target.value})} required style={inputStyle}><option value="">Choisir un client</option>{clients.map(c => <option key={c._id} value={c._id}>{c.nom} — {c.email}</option>)}</select></div>
                  <div><label style={labelStyle}>Date début *</label><input type="date" value={projetForm.date_début} onChange={e => setProjetForm({...projetForm, date_début:e.target.value})} required style={inputStyle}/></div>
                  <div><label style={labelStyle}>Date fin *</label><input type="date" value={projetForm.date_fin} onChange={e => setProjetForm({...projetForm, date_fin:e.target.value})} required style={inputStyle}/></div>
                  <div><label style={labelStyle}>Statut</label><select value={projetForm.statut} onChange={e => setProjetForm({...projetForm, statut:e.target.value})} style={inputStyle}><option>En cours</option><option>En révision</option><option>Validé</option><option>Refusé</option><option>Terminé</option></select></div>
                  <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}><label style={labelStyle}>Demandé par client</label><div style={{ display:"flex", gap:12, marginTop:8 }}>{[true,false].map(val => (<button key={String(val)} type="button" onClick={() => setProjetForm({...projetForm, demanded:val})} style={{ flex:1, padding:10, border:"2px solid", borderColor: projetForm.demanded===val ? "#2563EB" : "#E2E8F0", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13, background: projetForm.demanded===val ? "rgba(37,99,235,0.08)" : "white", color: projetForm.demanded===val ? "#2563EB" : "#64748B" }}>{val ? "✅ Oui" : "❌ Non"}</button>))}</div></div>
                </div>
                <div style={{ marginBottom:16 }}><label style={labelStyle}>Description</label><textarea value={projetForm.description} onChange={e => setProjetForm({...projetForm, description:e.target.value})} rows={3} style={{ ...inputStyle, resize:"vertical" }}/></div>
                <button type="submit" disabled={projetLoading} style={{ display:"flex", alignItems:"center", gap:8, background: projetLoading ? "#93C5FD" : "#2563EB", color:"white", border:"none", borderRadius:10, padding:"12px 28px", cursor: projetLoading ? "not-allowed" : "pointer", fontWeight:600, fontSize:14 }}>{projetLoading ? <Loader size={16} className="spin"/> : <FolderPlus size={16}/>}{projetLoading ? "Création..." : "Créer"}</button>
              </form>
            </div>
          )}

          {projets.filter(p => p.demanded && p.statut === "En attente").length > 0 && (
            <div className="card" style={{ marginBottom:24, borderLeft:"4px solid #D97706" }}>
              <h3 style={{ color:"#D97706", marginBottom:16 }}>⏳ Demandes clients ({projets.filter(p => p.demanded && p.statut === "En attente").length})</h3>
              {projets.filter(p => p.demanded && p.statut === "En attente").map(p => (
                <div key={p._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #F1F5F9" }}>
                  <div><div style={{ fontWeight:600 }}>{p.nom}</div><div style={{ fontSize:12, color:"#94A3B8" }}>{p.id_client?.nom} · {new Date(p.date_début).toLocaleDateString("fr-FR")} → {new Date(p.date_fin).toLocaleDateString("fr-FR")}</div></div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={async () => { await API.patch(`/projets/${p._id}/accepter`); fetchProjets(); }} style={{ background:"#059669", color:"white", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13 }}>✅ Accepter</button>
                    <button onClick={async () => { await API.patch(`/projets/${p._id}/refuser`); fetchProjets(); }} style={{ background:"#DC2626", color:"white", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13 }}>❌ Refuser</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            {fetchingProjets ? <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Loader size={32} color="#2563EB" className="spin"/></div>
            : projets.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94A3B8" }}><FolderPlus size={48} style={{ marginBottom:12, opacity:0.3 }}/><p>Aucun projet.</p></div>
            : <div className="table-container"><table><thead><tr><th>Projet</th><th>Client</th><th>Dates</th><th>Statut</th><th style={{ textAlign:"center" }}>Demandé</th><th style={{ textAlign:"center" }}>Actions</th></tr></thead>
                <tbody>{projets.map(p => { const sc = getStatutColor(p.statut); return (
                  <tr key={p._id}>
                    <td><div style={{ fontWeight:600, color:"#1E293B" }}>{p.nom}</div>{p.description && <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{p.description.slice(0,60)}{p.description.length>60?"...":""}</div>}</td>
                    <td><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:30, height:30, borderRadius:"50%", background:"#EFF6FF", color:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>{p.id_client?.nom?.charAt(0)||"?"}</div><div><div style={{ fontSize:13, fontWeight:600 }}>{p.id_client?.nom||"—"}</div><div style={{ fontSize:11, color:"#94A3B8" }}>{p.id_client?.email}</div></div></div></td>
                    <td><div style={{ fontSize:12, color:"#64748B", display:"flex", alignItems:"center", gap:4 }}><Calendar size={12}/>{new Date(p.date_début).toLocaleDateString("fr-FR")}</div><div style={{ fontSize:12, color:"#64748B", display:"flex", alignItems:"center", gap:4, marginTop:2 }}><Clock size={12}/>{new Date(p.date_fin).toLocaleDateString("fr-FR")}</div></td>
                    <td><span style={{ background:sc.bg, color:sc.color, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>{p.statut}</span></td>
                    <td style={{ textAlign:"center" }}><span style={{ background: p.demanded ? "rgba(5,150,105,0.1)" : "rgba(100,116,139,0.1)", color: p.demanded ? "#059669" : "#64748B", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>{p.demanded ? "✅ Oui" : "❌ Non"}</span></td>
                    <td style={{ textAlign:"center" }}><button style={iconBtn("#2563EB")} title="Voir"><Eye size={16}/></button></td>
                  </tr>
                ); })}</tbody>
              </table></div>}
          </div>
        </div>
      )}

      {/* ════ TAB UTILISATEURS ════ */}
      {activeTab === "utilisateurs" && (
        <div>
          {message.text && <div style={{ backgroundColor: message.type==="success" ? "#e3f9e5" : "#ffe3e5", color: message.type==="success" ? "#2a9d8f" : "#e63946", marginBottom:24, display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:6 }}>{message.type==="success" ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}{message.text}</div>}
          <div className="card" style={{ marginBottom:32 }}>
            <h3 style={{ marginBottom:20, display:"flex", alignItems:"center", gap:8 }}><UserPlus size={20}/> Créer un utilisateur</h3>
            <form onSubmit={handleCreateUser}>
              <div className="input-group"><label>Nom complet</label><div className="input-wrapper"><User size={18}/><input type="text" placeholder="Jean Dupont" value={nom} onChange={e => setNom(e.target.value)} required/></div></div>
              <div className="input-group"><label>Email</label><div className="input-wrapper"><Mail size={18}/><input type="email" placeholder="jean@exemple.com" value={email} onChange={e => setEmail(e.target.value)} required/></div></div>
              <div className="input-group"><label>Rôle</label><div className="input-wrapper">{role==="client" ? <User size={18}/> : <Palette size={18}/>}<select value={role} onChange={e => setRole(e.target.value)}><option value="client">Client</option><option value="designer">Designer</option></select></div></div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop:10 }}>{loading ? <Loader className="spin" size={18}/> : <UserPlus size={18}/>}{loading ? "Création..." : "Créer l'utilisateur"}</button>
            </form>
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Liste des utilisateurs</h3>
              <button onClick={exportAdminUsersExcel} style={{ background:"#0f766e", color:"white", border:"none", borderRadius:10, padding:"8px 14px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
                Exporter Excel
              </button>
            </div>
            {fetching ? <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Loader className="spin" size={32} color="var(--primary-color)"/></div>
            : <div className="table-container"><table><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th style={{ textAlign:"center" }}>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td><div style={{ display:"flex", alignItems:"center", gap:8 }}><div className="user-avatar" style={{ width:32, height:32, fontSize:14 }}>{u.nom?.charAt(0)||"U"}</div>{u.nom}</div></td>
                      <td>{u.email}</td>
                      <td><span className="badge" style={{ display:"inline-flex", alignItems:"center", gap:4, backgroundColor: u.rôle==="admin" ? "rgba(233,57,70,0.1)" : undefined, color: u.rôle==="admin" ? "var(--danger)" : undefined }}>{getRoleIcon(u.rôle)}{u.rôle}</span></td>
                      <td style={{ textAlign:"center" }}>
                        <button onClick={() => openViewModal(u)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", marginRight:8 }} title="Voir"><Eye size={18}/></button>
                        <button onClick={() => openEditModal(u)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", marginRight:8 }} title="Modifier"><Edit size={18}/></button>
                        <button onClick={() => confirmDelete(u)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger)" }} title="Supprimer"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {users.length===0 && <tr><td colSpan="4" style={{ textAlign:"center", padding:40, color:"var(--text-muted)" }}>Aucun utilisateur.</td></tr>}
                </tbody>
              </table></div>}
          </div>
        </div>
      )}

      {/* ════ TAB RÉCLAMATIONS ════ */}
      {activeTab === "reclamations" && (
        <div>
          {reclToast && <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderRadius:12, fontWeight:700, fontSize:13, background: reclToast.type==="success" ? "#059669" : "#DC2626", color:"white", boxShadow:"0 6px 24px rgba(0,0,0,0.15)" }}>{reclToast.type==="success" ? <CheckCircle size={15}/> : <AlertTriangle size={15}/>}{reclToast.msg}</div>}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"rgba(220,38,38,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}><AlertTriangle size={22} color="#DC2626"/></div>
              <div><h2 style={{ fontSize:20, fontWeight:800, margin:0, color:"#0F172A" }}>Réclamations clients</h2><p style={{ fontSize:13, color:"#94A3B8", margin:"2px 0 0" }}>Rejets en attente de modération et transmission</p></div>
            </div>
            <div style={{ background:"rgba(220,38,38,0.1)", color:"#DC2626", borderRadius:20, padding:"6px 16px", fontSize:13, fontWeight:700 }}>{reclamations.length} en attente</div>
          </div>

          {loadingRecl ? <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Loader size={28} color="#6366F1" className="spin"/></div>
          : reclamations.length === 0 ? (
            <div style={{ textAlign:"center", padding:"70px 20px", background:"white", borderRadius:16, border:"1px solid #F1F5F9" }}>
              <CheckCircle size={48} color="#C7D2FE"/>
              <p style={{ fontSize:16, fontWeight:700, color:"#374151", margin:"14px 0 6px" }}>Aucune réclamation en attente</p>
              <span style={{ fontSize:13, color:"#94A3B8" }}>Toutes les réclamations ont été transmises ✅</span>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {reclamations.map(r => {
                const vNum   = r.version_id?.numéro_version;
                const maqNom = r.version_id?.id_maquette?.nom;
                const projet = r.version_id?.id_maquette?.id_projet;
                const isOpen = expandedRecl[r._id];
                const avecContenu = (r.commentaires || []).filter(c => c.commentaire_client || c.commentaire_admin);
                return (
                  <div key={r._id} style={{ background:"white", borderRadius:16, border:"1px solid #E2E8F0", overflow:"hidden" }}>
                    <div onClick={() => setExpandedRecl(p => ({...p, [r._id]:!p[r._id]}))} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:"#DC2626", animation:"pulse 1.5s ease-in-out infinite" }}/>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", display:"flex", alignItems:"center", gap:8 }}>
                            {projet?.nom || "Projet"} — {maqNom || "Maquette"}
                            <span style={{ background:"rgba(99,102,241,0.1)", color:"#6366F1", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>v{vNum || "?"}</span>
                          </div>
                          <div style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>
                            Client : <strong style={{ color:"#374151" }}>{r.client_id?.nom || "—"}</strong>
                            {" · "}{new Date(r.date_validation).toLocaleDateString("fr-FR", {day:"2-digit", month:"short", year:"numeric"})}
                            {avecContenu.length > 0 && <span style={{ marginLeft:8, color:"#DC2626", fontWeight:600 }}>· {avecContenu.length} remarque{avecContenu.length!==1?"s":""}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ background:"rgba(220,38,38,0.1)", color:"#DC2626", borderRadius:20, padding:"4px 11px", fontSize:11, fontWeight:700 }}>✕ Rejet</span>
                        {isOpen ? <ChevronUp size={16} color="#94A3B8"/> : <ChevronDown size={16} color="#94A3B8"/>}
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop:"1px solid #F1F5F9", padding:"0 20px 20px" }}>
                        {avecContenu.length === 0
                          ? <p style={{ fontSize:13, color:"#94A3B8", padding:"16px 0", textAlign:"center" }}>Aucune remarque spécifique.</p>
                          : <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:16 }}>
                              {avecContenu.map(c => (
                                <div key={c._id} style={{ background:"#F8FAFC", borderRadius:10, padding:"12px 14px", border:"1px solid #E2E8F0" }}>
                                  <div style={{ fontSize:11, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Élément : {c.label_element || c.id_element}</div>
                                  <div style={{ fontSize:12, color:"#64748B", fontStyle:"italic", background:"rgba(100,116,139,0.06)", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>💬 Client : "{c.commentaire_client}"</div>
                                  <div style={{ fontSize:11, fontWeight:700, color:"#6366F1", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}><Edit3 size={11}/> Votre reformulation (pour le designer){c.commentaire_admin && <span style={{ background:"rgba(245,158,11,0.1)", color:"#D97706", borderRadius:6, padding:"1px 7px", fontSize:10 }}>Modifié</span>}</div>
                                  <textarea value={editingComments[c._id] ?? c.commentaire_admin ?? c.commentaire_client ?? ""} onChange={e => setEditingComments(p => ({...p, [c._id]: e.target.value}))} rows={3} placeholder="Reformuler pour le designer…" style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box" }} onFocus={e => e.target.style.borderColor="#6366F1"} onBlur={e => e.target.style.borderColor="#E2E8F0"}/>
                                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
                                    <button onClick={() => handleSaveComment(c._id)} disabled={savingComment===c._id} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(5,150,105,0.1)", color:"#059669", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                                      {savingComment===c._id ? <><Loader size={12} className="spin"/> Sauvegarde…</> : <><CheckCircle size={12}/> Sauvegarder</>}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                        }
                        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:18, paddingTop:14, borderTop:"1px solid #F1F5F9" }}>
                          <button onClick={() => handleTransmettre(r._id)} disabled={transmitting===r._id}
                            style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"white", border:"none", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:700, cursor: transmitting===r._id ? "not-allowed" : "pointer", opacity: transmitting===r._id ? 0.7 : 1, boxShadow:"0 4px 14px rgba(99,102,241,0.35)" }}>
                            {transmitting===r._id ? <><Loader size={15} className="spin"/> Transmission…</> : <><Send size={15}/> Transmettre au designer</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ MODALES ════ */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom:20 }}>Détails utilisateur</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><strong>Nom :</strong> {viewingUser.nom}</div>
              <div><strong>Email :</strong> {viewingUser.email}</div>
              <div><strong>Rôle :</strong> {viewingUser.rôle}</div>
              {viewingUser.date_inscription && <div><strong>Inscrit le :</strong> {new Date(viewingUser.date_inscription).toLocaleString()}</div>}
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20 }}><button className="btn-secondary" onClick={closeViewModal}>Fermer</button></div>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom:20 }}>Modifier l'utilisateur</h3>
            <form onSubmit={handleUpdateUser}>
              <div className="input-group"><label>Nom</label><div className="input-wrapper"><User size={18}/><input type="text" value={editNom} onChange={e => setEditNom(e.target.value)} required/></div></div>
              <div className="input-group"><label>Email</label><div className="input-wrapper"><Mail size={18}/><input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required/></div></div>
              <div className="input-group"><label>Rôle</label><div className="input-wrapper">{editRole==="client" ? <User size={18}/> : <Palette size={18}/>}<select value={editRole} onChange={e => setEditRole(e.target.value)}><option value="client">Client</option><option value="designer">Designer</option></select></div></div>
              <div style={{ display:"flex", gap:12, marginTop:20 }}><button type="submit" className="btn-primary" disabled={loading}>{loading ? <Loader className="spin" size={18}/> : "Enregistrer"}</button><button type="button" className="btn-secondary" onClick={closeEditModal}>Annuler</button></div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom:20, color:"#e63946" }}>Confirmer la suppression</h3>
            <p>Supprimer <strong>{deleteTarget.nom}</strong> ? Action irréversible.</p>
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:20 }}>
              <button className="btn-danger" onClick={executeDelete}>Supprimer</button>
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal-content { background:white; padding:24px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 4px 20px rgba(0,0,0,0.2); }
        .btn-secondary { background:#e2e8f0; color:#2d3748; border:none; padding:10px 16px; border-radius:6px; font-weight:500; cursor:pointer; }
        .btn-secondary:hover { background:#cbd5e0; }
        .btn-danger { background-color:#e63946; color:white; border:none; padding:10px 16px; border-radius:6px; font-weight:500; cursor:pointer; }
        .btn-danger:hover { background-color:#c82333; }
      `}</style>
    </div>
  );
};

const labelStyle = { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 };
const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" };
const iconBtn = (color) => ({ background:"none", border:"none", cursor:"pointer", color, padding:4 });

export default AdminDashboard;