import { useState, useEffect } from "react";
import API from "../api";
import {
  UserPlus,
  Mail,
  User,
  Briefcase,
  Palette,
  Trash2,
  Edit,
  Loader,
  CheckCircle,
  AlertCircle,
  X,
  Save,
} from "lucide-react";
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
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
};

const actionButton = (color, background, borderColor, marginRight = 0) => ({
  width: 34,
  height: 34,
  borderRadius: 12,
  border: `1px solid ${borderColor}`,
  background,
  cursor: "pointer",
  color,
  marginRight,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [editUser, setEditUser] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("client");
  const [editLoading, setEditLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const { data } = await API.get("/utilisateurs");
      setUsers(data);
    } catch {
      setMessage({ type: "error", text: "Impossible de charger les utilisateurs." });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);
    try {
      const { data } = await API.post("/utilisateurs", { nom, email, rôle: role });
      setMessage({
        type: "success",
        text: `${data.message}${data.mot_de_passe_temp ? ` - Mot de passe : ${data.mot_de_passe_temp}` : ""}`,
      });
      setNom("");
      setEmail("");
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Erreur creation" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      await API.delete(`/utilisateurs/${userId}`);
      setMessage({ type: "success", text: "Utilisateur supprime." });
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Erreur suppression" });
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditNom(u.nom || "");
    setEditEmail(u.email || "");
    setEditRole(u.rôle || "client");
    setMessage({ type: "", text: "" });
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await API.put(`/utilisateurs/${editUser._id}`, {
        nom: editNom,
        email: editEmail,
        rôle: editRole,
      });
      setMessage({ type: "success", text: "Utilisateur mis a jour avec succes." });
      setEditUser(null);
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Erreur modification" });
    } finally {
      setEditLoading(false);
    }
  };

  const getRoleIcon = (currentRole) => {
    if (currentRole === "admin") return <Briefcase size={14} />;
    if (currentRole === "designer") return <Palette size={14} />;
    return <User size={14} />;
  };

  const visibleUsers = users.filter((u) => u.rôle !== "admin");
  const filteredUsers = visibleUsers.filter((u) => {
    const matchSearch =
      u.nom.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchRole = roleFilter === "all" || u.rôle === roleFilter;
    return matchSearch && matchRole;
  });

  const exportUsersExcel = () => {
    const headers = ["Nom", "Email", "Role"];
    const rows = filteredUsers.map((u) => [u.nom || "", u.email || "", u.rôle || ""]);
    exportBeautifulExcel({
      title: "Liste des utilisateurs",
      headers,
      rows,
      filenamePrefix: "utilisateurs",
      sheetName: "Utilisateurs",
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-copy">
          <span className="admin-page-sup">
            <UserPlus size={14} />
            Administration
          </span>
          <h1 className="admin-page-title">Gestion des utilisateurs</h1>
          <p className="admin-page-text">
            Creez et gerez les comptes admin, client et designer.
          </p>
        </div>

        <div className="admin-page-actions">
          <div className="admin-chip">
            <User size={15} />
            {filteredUsers.length} profil{filteredUsers.length > 1 ? "s" : ""} visible{filteredUsers.length > 1 ? "s" : ""}
          </div>
          <button onClick={exportUsersExcel} className="admin-btn admin-btn--secondary">
            Exporter Excel
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`admin-alert ${message.type === "success" ? "admin-alert--success" : "admin-alert--error"}`}>
          {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {editUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.46)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.96)",
              borderRadius: 28,
              padding: 32,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 28px 70px rgba(15,23,42,0.18)",
              border: "1px solid rgba(148,163,184,0.16)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Modifier l utilisateur
                </h3>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                  Mettez a jour les informations et le role du compte.
                </p>
              </div>

              <button
                onClick={() => setEditUser(null)}
                style={{
                  background: "rgba(248,250,252,0.9)",
                  border: "1px solid rgba(148,163,184,0.16)",
                  cursor: "pointer",
                  color: "#64748B",
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditUser}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nom complet</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Adresse email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={inputStyle}>
                  <option value="client">Client</option>
                  <option value="designer">Designer</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setEditUser(null)} className="admin-btn admin-btn--ghost">
                  Annuler
                </button>
                <button type="submit" disabled={editLoading} className="admin-btn admin-btn--primary">
                  {editLoading ? <Loader size={16} /> : <Save size={16} />}
                  {editLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="admin-section-head">
          <div>
            <div className="admin-section-title">Creer un nouvel utilisateur</div>
            <p className="admin-section-text">
              Ajoutez un client ou un designer.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateUser}>
          <div className="admin-form-grid" style={{ marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nom complet</label>
              <input
                type="text"
                placeholder="Jean Dupont"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Adresse email</label>
              <input
                type="email"
                placeholder="jean@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                <option value="client">Client</option>
                <option value="designer">Designer</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="admin-btn admin-btn--primary">
            {loading ? <Loader size={16} /> : <UserPlus size={16} />}
            {loading ? "Creation..." : "Creer l utilisateur"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="admin-section-head">
          <div>
            <div className="admin-section-title">Liste des utilisateurs</div>
            <p className="admin-section-text">
              Recherche par nom, email ou role.
            </p>
          </div>

          <div className="admin-chip">
            <Mail size={15} />
            {users.length} compte{users.length > 1 ? "s" : ""} total
          </div>
        </div>

        <div className="admin-filter-bar" style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={inputStyle}>
            <option value="all">Tous les roles</option>
            <option value="client">Client</option>
            <option value="designer">Designer</option>
          </select>
        </div>

        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader size={32} color="#2563EB" />
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 14 }}>
                          {u.nom?.charAt(0) || "U"}
                        </div>
                        {u.nom}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge">
                        {getRoleIcon(u.rôle)} {u.rôle}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => openEdit(u)}
                        style={actionButton("#2563EB", "rgba(37,99,235,0.08)", "rgba(37,99,235,0.14)", 8)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        style={actionButton("#DC2626", "rgba(239,68,68,0.08)", "rgba(239,68,68,0.14)")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
                      Aucun utilisateur trouve.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
