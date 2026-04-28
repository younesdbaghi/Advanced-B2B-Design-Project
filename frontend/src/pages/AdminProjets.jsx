import { useEffect, useRef, useState } from "react";
import API from "../api";
import {
  AlertCircle,
  AlignLeft,
  Calendar,
  CheckCircle,
  ChevronRight,
  Eye,
  FolderPlus,
  Image,
  Loader,
  Pencil,
  Save,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportBeautifulExcel } from "../utils/excelExport";

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748B",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.18)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "rgba(248,250,252,0.84)",
  color: "#0f172a",
};

const softCardStyle = {
  background: "rgba(248,250,252,0.8)",
  borderRadius: 18,
  padding: "14px 16px",
  border: "1px solid rgba(226,232,240,0.9)",
};

const iconButton = (color) => ({
  width: 34,
  height: 34,
  borderRadius: 12,
  border: `1px solid ${color}`,
  background: "rgba(255,255,255,0.82)",
  color,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "0 18px",
  border: "none",
  borderRadius: 999,
  background: "linear-gradient(135deg,#2563EB,#06B6D4)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(148,163,184,0.18)",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.14)",
  color: "#dc2626",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const getProjectStartDate = (project) =>
  project?.["date_début"] || project?.["date_début"] || project?.date_debut || "";

const validateDates = (start, end) => {
  const errors = { start: "", end: "" };
  if (start && end && end < start) errors.end = "La date de fin ne peut pas etre avant la date de debut.";
  return errors;
};

const FieldError = ({ message }) =>
  message ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, color: "#DC2626", fontSize: 12 }}>
      <AlertCircle size={12} />
      {message}
    </div>
  ) : null;

const Modal = ({ title, subtitle, children, onClose, maxWidth = 620 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.46)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1200 }}>
    <div style={{ width: "100%", maxWidth, background: "rgba(255,255,255,0.96)", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 28, boxShadow: "0 28px 70px rgba(15,23,42,0.18)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "24px 24px 18px", borderBottom: "1px solid rgba(226,232,240,0.86)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em" }}>{title}</h2>
          {subtitle && <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 14, border: "1px solid rgba(148,163,184,0.16)", background: "rgba(248,250,252,0.9)", color: "#64748B", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

const AssignerDropdown = ({ projet, onAssigned }) => {
  const [open, setOpen] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [message, setMessage] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;
    setLoading(true);
    setMessage("");
    try {
      const { data: allUsers } = await API.get("/utilisateurs");
      const designersList = Array.isArray(allUsers) ? allUsers.filter((u) => u["rôle"] === "designer") : [];
      const { data: affectations } = await API.get(`/affectations/projet/${projet._id}`);
      const assigned = new Set((Array.isArray(affectations) ? affectations : []).map((a) => String(a.id_designer?._id || a.id_designer)));
      setDesigners(designersList.filter((designer) => !assigned.has(String(designer._id))));
    } catch {
      setMessage("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (designer) => {
    setAssigning(designer._id);
    try {
      await API.post("/affectations", { id_projet: projet._id, id_designer: designer._id });
      setMessage(`${designer.nom} assigne.`);
      setDesigners((prev) => prev.filter((item) => item._id !== designer._id));
      onAssigned?.();
      setTimeout(() => {
        setOpen(false);
        setMessage("");
      }, 900);
    } catch (error) {
      setMessage(error.response?.data?.message || "Erreur");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={handleOpen} disabled={projet.statut === "Refusé"} style={{ ...iconButton("#059669"), opacity: projet.statut === "Refusé" ? 0.38 : 1 }}>
        <UserPlus size={15} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", minWidth: 250, borderRadius: 20, border: "1px solid rgba(148,163,184,0.18)", background: "rgba(255,255,255,0.96)", boxShadow: "0 24px 60px rgba(15,23,42,0.14)", overflow: "hidden", zIndex: 20 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(226,232,240,0.86)", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Designers disponibles</div>
          {message && <div style={{ padding: "10px 16px", fontSize: 13, color: message.includes("Erreur") ? "#DC2626" : "#059669" }}>{message}</div>}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}><Loader size={18} color="#2563EB" className="spin" /></div>
          ) : designers.length === 0 ? (
            <div style={{ padding: "14px 16px", color: "#94A3B8", fontSize: 13 }}>Aucun designer disponible.</div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {designers.map((designer) => (
                <button key={designer._id} onClick={() => handleAssign(designer)} disabled={Boolean(assigning)} style={{ width: "100%", padding: "12px 16px", border: "none", borderBottom: "1px solid rgba(248,250,252,0.92)", background: "transparent", cursor: assigning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 12, background: "linear-gradient(135deg,#059669,#0D9488)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{designer.nom?.charAt(0) || "D"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{designer.nom}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{designer.email}</div>
                  </div>
                  {assigning === designer._id ? <Loader size={14} className="spin" /> : <UserPlus size={14} color="#059669" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailModal = ({ projet, onClose, onEdit, onDelete, getStatusColor }) => {
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchAffectations = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/affectations/projet/${projet._id}`);
      setAffectations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffectations();
  }, []);

  const handleRetirer = async (id) => {
    try {
      await API.delete(`/affectations/${id}`);
      setMessage("Designer retire.");
      fetchAffectations();
    } catch {
      setMessage("Erreur retrait.");
    }
  };

  const status = getStatusColor(projet.statut);

  return (
    <Modal title="Details du projet" subtitle="Vue complete avant modification ou suppression." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Projet</div>
            <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{projet.nom}</div>
          </div>
          <span style={{ background: status.bg, color: status.color, padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${status.border}` }}>{projet.statut}</span>
        </div>

        <div style={softCardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 16, background: "linear-gradient(135deg,#2563EB,#06B6D4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
              {projet.id_client?.nom?.charAt(0) || "C"}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{projet.id_client?.nom || "Client"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{projet.id_client?.email || "Email non renseigne"}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div style={softCardStyle}>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Debut</div>
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
              <Calendar size={14} color="#2563EB" />
              {new Date(getProjectStartDate(projet)).toLocaleDateString("fr-FR")}
            </div>
          </div>
          <div style={softCardStyle}>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fin</div>
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
              <Calendar size={14} color="#06B6D4" />
              {new Date(projet.date_fin).toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>

        {projet.description && (
          <div style={softCardStyle}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <AlignLeft size={13} />
              Description
            </div>
            <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7 }}>{projet.description}</p>
          </div>
        )}

        <div style={{ borderTop: "1px solid rgba(226,232,240,0.86)", paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={16} color="#2563EB" />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Designers assignes ({affectations.length})</span>
          </div>

          {message && <div className="admin-alert admin-alert--success" style={{ marginBottom: 12 }}>{message}</div>}

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 18 }}><Loader size={22} className="spin" color="#2563EB" /></div>
          ) : affectations.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: 22 }}>Aucun designer assigne.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {affectations.map((affectation) => (
                <div key={affectation._id} style={{ ...softCardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 14, background: "linear-gradient(135deg,#059669,#0D9488)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                      {affectation.id_designer?.nom?.charAt(0) || "D"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{affectation.id_designer?.nom}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{affectation.id_designer?.email}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRetirer(affectation._id)} style={dangerButtonStyle}>
                    <UserMinus size={14} />
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", borderTop: "1px solid rgba(226,232,240,0.86)", paddingTop: 18 }}>
          <button onClick={onDelete} style={dangerButtonStyle}><Trash2 size={15} />Supprimer</button>
          <button onClick={onEdit} style={primaryButtonStyle}><Pencil size={15} />Modifier</button>
        </div>
      </div>
    </Modal>
  );
};

const EditModal = ({ projet, users, onClose, onSaved, setMsg }) => {
  const [form, setForm] = useState({
    nom: projet.nom || "",
    description: projet.description || "",
    date_début: getProjectStartDate(projet)?.slice(0, 10) || "",
    date_fin: projet.date_fin ? projet.date_fin.slice(0, 10) : "",
    statut: projet.statut || "En cours",
    id_client: projet.id_client?._id || projet.id_client || "",
  });
  const [formErrors, setFormErrors] = useState({ start: "", end: "" });
  const [saving, setSaving] = useState(false);
  const clients = users.filter((u) => u["rôle"] === "client");

  const handleDateChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setFormErrors(validateDates(updated.date_début, updated.date_fin));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validateDates(form.date_début, form.date_fin);
    setFormErrors(errors);
    if (errors.start || errors.end) return;
    setSaving(true);
    try {
      await API.put(`/projets/${projet._id}`, form);
      setMsg({ type: "success", text: "Projet modifie." });
      onSaved();
    } catch (error) {
      setMsg({ type: "error", text: error.response?.data?.message || "Erreur modification" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Modifier le projet" subtitle="Mettez a jour le cadrage, les dates et le client." onClose={onClose}>
      <form onSubmit={handleSave}>
        <div className="admin-form-grid admin-form-grid--two" style={{ marginBottom: 18 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Nom du projet</label><input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required style={inputStyle} /></div>
          <div><label style={labelStyle}>Client</label><select value={form.id_client} onChange={(e) => setForm({ ...form, id_client: e.target.value })} style={inputStyle}><option value="">Choisir un client</option>{clients.map((client) => <option key={client._id} value={client._id}>{client.nom}</option>)}</select></div>
          <div><label style={labelStyle}>Statut</label><select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} style={inputStyle}>{["En cours", "En attente", "En révision", "Validé", "Refusé", "Terminé"].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
          <div><label style={labelStyle}>Date debut</label><input type="date" value={form.date_début} onChange={(e) => handleDateChange("date_début", e.target.value)} required style={{ ...inputStyle, borderColor: formErrors.start ? "#dc2626" : "rgba(148,163,184,0.18)" }} /><FieldError message={formErrors.start} /></div>
          <div><label style={labelStyle}>Date fin</label><input type="date" value={form.date_fin} onChange={(e) => handleDateChange("date_fin", e.target.value)} required style={{ ...inputStyle, borderColor: formErrors.end ? "#dc2626" : "rgba(148,163,184,0.18)" }} /><FieldError message={formErrors.end} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Annuler</button>
          <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? <Loader size={15} className="spin" /> : <Save size={15} />}{saving ? "Enregistrement..." : "Enregistrer"}</button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteModal = ({ projet, onClose, onConfirm, deleting }) => (
  <Modal title="Supprimer le projet" subtitle="Cette action est irreversible." onClose={onClose} maxWidth={520}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 60, height: 60, margin: "0 auto 18px", borderRadius: 20, background: "rgba(239,68,68,0.08)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={26} /></div>
      <p style={{ color: "#475569", marginBottom: 8 }}>Voulez-vous vraiment supprimer ce projet ?</p>
      <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 800 }}>“{projet.nom}”</h3>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
        <button onClick={onClose} style={ghostButtonStyle}>Annuler</button>
        <button onClick={onConfirm} disabled={deleting} style={dangerButtonStyle}>{deleting ? <Loader size={15} className="spin" /> : <Trash2 size={15} />}{deleting ? "Suppression..." : "Supprimer"}</button>
      </div>
    </div>
  </Modal>
);

const AdminProjets = () => {
  const [projets, setProjets] = useState([]);
  const [users, setUsers] = useState([]);
  const [maquettes, setMaquettes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [projetLoading, setProjetLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [form, setForm] = useState({ nom: "", description: "", date_début: "", date_fin: "", statut: "En attente", id_client: "", demanded: false });
  const [formErrors, setFormErrors] = useState({ start: "", end: "" });
  const [detailProjet, setDetailProjet] = useState(null);
  const [editProjet, setEditProjet] = useState(null);
  const [deleteProjet, setDeleteProjet] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchProjets = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/projets");
      setProjets(Array.isArray(data) ? data.filter((p) => !(p.demanded && p.statut === "En attente")) : []);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchProjets();
    API.get("/utilisateurs").then((response) => setUsers(response.data)).catch(() => { });
    API.get("/maquettes").then((response) => setMaquettes(Array.isArray(response.data) ? response.data : response.data?.maquettes || [])).catch(() => { });
  }, []);

  useEffect(() => {
    if (!msg.text) return;
    const timeout = setTimeout(() => setMsg({ type: "", text: "" }), 4000);
    return () => clearTimeout(timeout);
  }, [msg]);

  const handleDateChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setFormErrors(validateDates(updated.date_début, updated.date_fin));
  };

  const toggleProjectForm = () => {
    setShowForm((prev) => !prev);
    setFormErrors({ start: "", end: "" });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateDates(form.date_début, form.date_fin);
    setFormErrors(errors);
    if (errors.start || errors.end) return;
    if (!form.nom || !form.id_client || !form.date_début || !form.date_fin) {
      setMsg({ type: "error", text: "Champs obligatoires manquants." });
      return;
    }
    setProjetLoading(true);
    try {
      await API.post("/projets", form);
      setMsg({ type: "success", text: "Projet cree." });
      setForm({ nom: "", description: "", date_début: "", date_fin: "", statut: "En attente", id_client: "", demanded: false });
      setFormErrors({ start: "", end: "" });
      setShowForm(false);
      fetchProjets();
    } catch (error) {
      setMsg({ type: "error", text: error.response?.data?.message || "Erreur creation" });
    } finally {
      setProjetLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/projets/${deleteProjet._id}`);
      setMsg({ type: "success", text: "Projet supprime." });
      setDeleteProjet(null);
      setDetailProjet(null);
      fetchProjets();
    } catch (error) {
      setMsg({ type: "error", text: error.response?.data?.message || "Erreur suppression" });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => ({
    "En cours": { color: "#2563EB", bg: "rgba(37,99,235,0.1)", border: "rgba(37,99,235,0.18)" },
    "En attente": { color: "#D97706", bg: "rgba(217,119,6,0.1)", border: "rgba(217,119,6,0.18)" },
    "En révision": { color: "#D97706", bg: "rgba(217,119,6,0.1)", border: "rgba(217,119,6,0.18)" },
    Validé: { color: "#059669", bg: "rgba(5,150,105,0.1)", border: "rgba(5,150,105,0.18)" },
    Refusé: { color: "#DC2626", bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.18)" },
    Terminé: { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.18)" },
  }[status] || { color: "#64748B", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.18)" });

  const hasMockup = (projetId) => maquettes.some((maquette) => String(maquette.id_projet?._id || maquette.id_projet) === String(projetId));

  const openEditor = async (projet) => {
    try {
      const { data: list } = await API.get(`/maquettes/projet/${projet._id}`);
      const maquette = Array.isArray(list) && list.length > 0 ? list[0] : null;
      if (!maquette) return setMsg({ type: "error", text: "Aucune maquette pour ce projet." });
      navigate(`/admin/editeur/${maquette._id}`);
    } catch {
      setMsg({ type: "error", text: "Erreur ouverture editeur." });
    }
  };

  const clients = users.filter((u) => u["rôle"] === "client");

  const exportProjetsExcel = () => {
    const headers = ["Projet", "Client", "Email client", "Date debut", "Date fin", "Statut", "Demanded"];
    const rows = projets.map((projet) => [projet.nom || "", projet.id_client?.nom || "", projet.id_client?.email || "", getProjectStartDate(projet) ? new Date(getProjectStartDate(projet)).toLocaleDateString("fr-FR") : "", projet.date_fin ? new Date(projet.date_fin).toLocaleDateString("fr-FR") : "", projet.statut || "", projet.demanded ? "Oui" : "Non"]);
    exportBeautifulExcel({ title: "Liste des projets", headers, rows, filenamePrefix: "projets-admin", sheetName: "Projets" });
  };

  return (
    <div className="admin-page">
      {deleteProjet && <DeleteModal projet={deleteProjet} onClose={() => setDeleteProjet(null)} onConfirm={handleDelete} deleting={deleting} />}
      {!deleteProjet && editProjet && <EditModal projet={editProjet} users={users} onClose={() => setEditProjet(null)} onSaved={() => { setEditProjet(null); setDetailProjet(null); fetchProjets(); }} setMsg={setMsg} />}
      {!deleteProjet && !editProjet && detailProjet && <DetailModal projet={detailProjet} onClose={() => setDetailProjet(null)} onEdit={() => setEditProjet(detailProjet)} onDelete={() => setDeleteProjet(detailProjet)} getStatusColor={getStatusColor} />}

      <div className="admin-page-header">
        <div className="admin-page-copy">
          <span className="admin-page-sup"><FolderPlus size={14} />Administration</span>
          <h1 className="admin-page-title">Gestion des projets</h1>
          <p className="admin-page-text">Suivez les projets, statuts et acces maquette.</p>
        </div>
        <div className="admin-page-actions">
          <div className="admin-chip"><Users size={15} />{projets.length} projet{projets.length > 1 ? "s" : ""}</div>
          <button onClick={exportProjetsExcel} className="admin-btn admin-btn--secondary">Exporter Excel</button>
          <button onClick={toggleProjectForm} className="admin-btn admin-btn--primary"><FolderPlus size={18} />{showForm ? "Annuler" : "Nouveau projet"}</button>
        </div>
      </div>

      {msg.text && <div className={`admin-alert ${msg.type === "success" ? "admin-alert--success" : "admin-alert--error"}`}>{msg.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}{msg.text}</div>}

      {showForm && (
        <div className="card">
          <div className="admin-section-head"><div><div className="admin-section-title">Creer un projet</div><p className="admin-section-text">Renseignez les infos essentielles.</p></div></div>
          <form onSubmit={handleCreate}>
            <div className="admin-form-grid admin-form-grid--two" style={{ marginBottom: 16 }}>
              <div><label style={labelStyle}>Nom du projet</label><input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Refonte site" required style={inputStyle} /></div>
              <div><label style={labelStyle}>Client</label><select value={form.id_client} onChange={(e) => setForm({ ...form, id_client: e.target.value })} required style={inputStyle}><option value="">Choisir un client</option>{clients.map((client) => <option key={client._id} value={client._id}>{client.nom} - {client.email}</option>)}</select></div>
              <div><label style={labelStyle}>Date debut</label><input type="date" value={form.date_début} onChange={(e) => handleDateChange("date_début", e.target.value)} required style={{ ...inputStyle, borderColor: formErrors.start ? "#dc2626" : "rgba(148,163,184,0.18)" }} /><FieldError message={formErrors.start} /></div>
              <div><label style={labelStyle}>Date fin</label><input type="date" value={form.date_fin} onChange={(e) => handleDateChange("date_fin", e.target.value)} required style={{ ...inputStyle, borderColor: formErrors.end ? "#dc2626" : "rgba(148,163,184,0.18)" }} /><FieldError message={formErrors.end} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></div>
            </div>
            <button type="submit" disabled={projetLoading} style={primaryButtonStyle}>{projetLoading ? <Loader size={16} className="spin" /> : <FolderPlus size={16} />}{projetLoading ? "Creation..." : "Creer le projet"}</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="admin-section-head"><div><div className="admin-section-title">Tous les projets</div><p className="admin-section-text">Clients, statuts et acces editeur.</p></div><div className="admin-chip"><FolderPlus size={15} />{projets.length} element{projets.length > 1 ? "s" : ""}</div></div>
        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader size={32} color="#2563EB" className="spin" /></div>
        ) : projets.length === 0 ? (
          <div className="admin-empty-state"><FolderPlus size={34} /><div>Aucun projet disponible.</div></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Projet</th><th>Client</th><th>Dates</th><th>Statut</th><th style={{ textAlign: "center" }}>Demanded</th><th style={{ textAlign: "center" }}>Actions</th><th style={{ textAlign: "center" }}>Editeur</th></tr>
              </thead>
              <tbody>
                {projets.map((projet) => {
                  const status = getStatusColor(projet.statut);
                  const hasEditor = hasMockup(projet._id);
                  return (
                    <tr key={projet._id}>
                      <td><div style={{ fontWeight: 700 }}>{projet.nom}</div>{projet.description && <div style={{ marginTop: 3, fontSize: 12, color: "#94A3B8" }}>{projet.description.slice(0, 60)}{projet.description.length > 60 ? "..." : ""}</div>}</td>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#06B6D4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{projet.id_client?.nom?.charAt(0) || "C"}</div><div><div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{projet.id_client?.nom || "Client"}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{projet.id_client?.email || ""}</div></div></div></td>
                      <td><div style={{ fontSize: 12, color: "#64748B" }}>Debut: {getProjectStartDate(projet) ? new Date(getProjectStartDate(projet)).toLocaleDateString("fr-FR") : "-"}</div><div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>Fin: {projet.date_fin ? new Date(projet.date_fin).toLocaleDateString("fr-FR") : "-"}</div></td>
                      <td><span style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>{projet.statut}</span></td>
                      <td style={{ textAlign: "center" }}><span style={{ background: projet.demanded ? "rgba(5,150,105,0.1)" : "rgba(100,116,139,0.1)", color: projet.demanded ? "#059669" : "#64748B", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: `1px solid ${projet.demanded ? "rgba(5,150,105,0.18)" : "rgba(100,116,139,0.18)"}` }}>{projet.demanded ? "Oui" : "Non"}</span></td>
                      <td style={{ textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}><AssignerDropdown projet={projet} onAssigned={() => setMsg({ type: "success", text: `Designer assigne a ${projet.nom}.` })} /><button onClick={() => setDetailProjet(projet)} style={iconButton("#2563EB")}><Eye size={15} /></button><button onClick={() => setEditProjet(projet)} style={iconButton("#D97706")}><Pencil size={15} /></button><button onClick={() => setDeleteProjet(projet)} style={iconButton("#DC2626")}><Trash2 size={15} /></button></div></td>
                      <td style={{ textAlign: "center" }}>{hasEditor ? <button onClick={() => openEditor(projet)} style={primaryButtonStyle}><Image size={15} />Ouvrir<ChevronRight size={15} /></button> : <span style={{ color: "#94A3B8", fontSize: 12 }}>Aucune maquette</span>}</td>
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
export default AdminProjets;
