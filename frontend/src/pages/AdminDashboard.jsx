import { useState, useEffect } from "react";
import API from "../api";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [message, setMessage] = useState("");


  const fetchUsers = async () => {
    try {
      const { data } = await API.get("/utilisateurs");
      setUsers(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs", error);
    }
  };

  // Récupérer la liste des utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const { data } = await API.post("/utilisateurs", {
        nom,
        email,
        rôle: role,
      });
      // Affiche le message de succès (et le mdp temporaire si le mail a échoué)
      setMessage(
        `✅ ${data.message} ${
          data.mot_de_passe_temp
            ? `(Mot de passe généré : ${data.mot_de_passe_temp})`
            : ""
        }`
      );

      // Réinitialiser le formulaire et rafraîchir la liste
      setNom("");
      setEmail("");
      fetchUsers();
    } catch (error) {
      setMessage(
        `❌ Erreur : ${
          error.response?.data?.message || "Impossible de créer l'utilisateur"
        }`
      );
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard Administrateur</h1>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          marginBottom: "30px",
        }}
      >
        <h3>Créer un nouvel utilisateur</h3>
        {message && (
          <p>
            <strong>{message}</strong>
          </p>
        )}

        <form onSubmit={handleCreateUser}>
          <input
            type="text"
            placeholder="Nom complet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
          <br />
          <br />

          <input
            type="email"
            placeholder="Adresse Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <br />
          <br />

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="client">Client</option>
            <option value="designer">Designer</option>
          </select>
          <br />
          <br />

          <button type="submit">Créer l'utilisateur</button>
        </form>
      </div>

      <h3>Liste des utilisateurs</h3>
      <table
        border="1"
        cellPadding="10"
        style={{ width: "100%", textAlign: "left" }}
      >
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.nom}</td>
              <td>{u.email}</td>
              <td>{u.rôle}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
