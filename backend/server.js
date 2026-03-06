const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// SCHÉMAS MONGODB
// ==========================================

const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 150 },
  mot_de_passe: { type: String, required: true, maxlength: 255 },
  rôle: { type: String, enum: ["admin", "designer", "client"], required: true },
  date_inscription: { type: Date, default: Date.now },
  dernier_connexion: { type: Date },
});
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);

const projetSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, maxlength: 150 },
    description: { type: String },
    date_début: { type: Date, required: true },
    date_fin: { type: Date, required: true },
    statut: {
      type: String,
      enum: ["En cours", "En révision", "Validé", "Refusé", "Terminé", "En attente"],
      required: true,
      default: "En cours",
    },
    id_client: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    id_admin_createur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    demanded: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: "date_modification" } }
);
const Projet = mongoose.model("Projet", projetSchema);

const affectationSchema = new mongoose.Schema({
  id_projet: { type: mongoose.Schema.Types.ObjectId, ref: "Projet", required: true },
  id_designer: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  date_affectation: { type: Date, default: Date.now },
});
affectationSchema.index({ id_projet: 1, id_designer: 1 }, { unique: true });
const Affectation = mongoose.model("Affectation", affectationSchema);

const maquetteSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, maxlength: 150 },
    description: { type: String },
    id_projet: { type: mongoose.Schema.Types.ObjectId, ref: "Projet", required: true },
    id_createur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: "date_modification" } }
);
const Maquette = mongoose.model("Maquette", maquetteSchema);

const versionSchema = new mongoose.Schema(
  {
    numéro_version: { type: Number, required: true },
    contenu: { type: mongoose.Schema.Types.Mixed, required: true },
    commentaire: { type: String },
    id_maquette: { type: mongoose.Schema.Types.ObjectId, ref: "Maquette", required: true },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: false } }
);
const Version = mongoose.model("Version", versionSchema);

const feedbackSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Com", "Val", "Refus"], required: true },
    commentaire: { type: String, required: true },
    justification: { type: String },
    id_version: { type: mongoose.Schema.Types.ObjectId, ref: "Version", required: true },
    id_auteur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: false } }
);
const Feedback = mongoose.model("Feedback", feedbackSchema);

const rapportQuotidienSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  travail_effectué: { type: String, required: true },
  tâches_restantes: { type: String, required: true },
  blocages: { type: String },
  date_soumission: { type: Date, default: Date.now },
  id_projet: { type: mongoose.Schema.Types.ObjectId, ref: "Projet", required: true },
  id_designer: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
});
const RapportQuotidien = mongoose.model("RapportQuotidien", rapportQuotidienSchema);

const connexionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  adresse_IP: { type: String, required: true },
  id_utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
});
const ConnexionLog = mongoose.model("ConnexionLog", connexionLogSchema);

// ==========================================
// FONCTIONS UTILES & MIDDLEWARES
// ==========================================

const envoyerEmailBienvenue = async (email, nom, motDePasse) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Bienvenue sur DevPortal B2B",
    html: `<h2>Bonjour ${nom},</h2><p>Votre compte a été créé. Voici votre mot de passe temporaire : <strong>${motDePasse}</strong></p>`,
  });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Accès refusé. Aucun token fourni." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré." });
  }
};

const checkRole = (rolesAutorises) => (req, res, next) => {
  if (!rolesAutorises.includes(req.user.rôle))
    return res.status(403).json({ message: "Accès interdit." });
  next();
};

// ==========================================
// ROUTES API (préfixe /Api_B2B)
// ==========================================
const apiRouter = express.Router();

// ---- AUTH ----
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    const user = await Utilisateur.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect." });
    user.dernier_connexion = Date.now();
    await user.save();
    const token = jwt.sign(
      { id: user._id, rôle: user.rôle },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "24h" }
    );
    res.status(200).json({
      token,
      user: { id: user._id, nom: user.nom, email: user.email, rôle: user.rôle },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// ---- UTILISATEURS ----
apiRouter.get("/utilisateurs", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    res.status(200).json(await Utilisateur.find().select("-mot_de_passe"));
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération utilisateurs", error });
  }
});

apiRouter.post("/utilisateurs", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { nom, email, rôle } = req.body;
    if (await Utilisateur.findOne({ email }))
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    const motDePasseClair = Math.random().toString(36).slice(-8);
    const motDePasseHash = await bcrypt.hash(motDePasseClair, await bcrypt.genSalt(10));
    const u = await new Utilisateur({ nom, email, rôle, mot_de_passe: motDePasseHash }).save();
    try {
      await envoyerEmailBienvenue(email, nom, motDePasseClair);
      res.status(201).json({ message: "Utilisateur créé et email envoyé.", utilisateur: { _id: u._id, nom, email, rôle } });
    } catch (mailError) {
      console.log("Erreur envoi email :", mailError.message);
      res.status(201).json({ message: "Utilisateur créé (email non envoyé).", mot_de_passe_temp: motDePasseClair, utilisateur: { _id: u._id, nom, email, rôle } });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur création utilisateur", error: error.message });
  }
});

apiRouter.get("/utilisateurs/:id", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id).select("-mot_de_passe");
    if (!utilisateur) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json(utilisateur);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération utilisateur", error: error.message });
  }
});

apiRouter.put("/utilisateurs/:id", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { nom, email, rôle } = req.body;
    if (email) {
      const existing = await Utilisateur.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: "Email déjà utilisé par un autre compte." });
    }
    const updated = await Utilisateur.findByIdAndUpdate(
      req.params.id, { nom, email, rôle }, { new: true, runValidators: true }
    ).select("-mot_de_passe");
    if (!updated) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json({ message: "Utilisateur mis à jour.", utilisateur: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur modification utilisateur", error: error.message });
  }
});

apiRouter.delete("/utilisateurs/:id", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
    const deleted = await Utilisateur.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json({ message: "Utilisateur supprimé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
});

// ---- DESIGNERS DISPONIBLES ----

// GET designers disponibles (non assignés à aucun projet actif)
apiRouter.get("/designers", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    // Trouve tous les designers déjà assignés à un projet
    const affectations = await Affectation.find().distinct("id_designer");
    
    // Retourne les designers qui ne sont PAS dans cette liste
    const designers = await Utilisateur.find({
      rôle: "designer",
      _id: { $nin: affectations }
    }).select("-mot_de_passe");
    
    res.status(200).json(designers);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération designers", error: error.message });
  }
});

// ---- PROJETS ----

apiRouter.get("/projets", verifyToken, async (req, res) => {
  try {
    const projets = await Projet.find()
      .populate("id_client", "nom email")
      .populate("id_admin_createur", "nom email");
    res.status(200).json(projets);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération projets", error });
  }
});

apiRouter.post("/projets/demande", verifyToken, checkRole(['client']), async (req, res) => {
  try {
    const { nom, description, date_début, date_fin } = req.body;
    if (!nom || !date_début || !date_fin)
      return res.status(400).json({ message: "Nom, date_début et date_fin sont requis." });
    const admin = await Utilisateur.findOne({ rôle: "admin" });
    if (!admin) return res.status(500).json({ message: "Aucun administrateur trouvé." });
    const demande = await Projet.create({
      nom, description: description || "",
      date_début, date_fin,
      statut: "En attente", demanded: true,
      id_client: req.user.id, id_admin_createur: admin._id,
    });
    res.status(201).json({ message: "Demande envoyée.", demande });
  } catch (error) {
    res.status(500).json({ message: "Erreur création demande", error: error.message });
  }
});

apiRouter.post("/projets", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const projet = new Projet({ ...req.body, id_admin_createur: req.user.id });
    await projet.save();
    res.status(201).json(projet);
  } catch (error) {
    res.status(400).json({ message: "Erreur création projet", error });
  }
});

apiRouter.patch("/projets/:id/accepter", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const projet = await Projet.findByIdAndUpdate(
      req.params.id, { statut: "En cours" }, { new: true }
    ).populate("id_client", "nom email");
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });
    res.status(200).json({ message: "Projet accepté.", projet });
  } catch (error) {
    res.status(500).json({ message: "Erreur acceptation", error: error.message });
  }
});

apiRouter.patch("/projets/:id/refuser", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const projet = await Projet.findByIdAndUpdate(
      req.params.id, { statut: "Refusé" }, { new: true }
    );
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });
    res.status(200).json({ message: "Demande refusée.", projet });
  } catch (error) {
    res.status(500).json({ message: "Erreur refus", error: error.message });
  }
});

apiRouter.get("/projets/:id", verifyToken, async (req, res) => {
  try {
    const projet = await Projet.findById(req.params.id)
      .populate("id_client", "nom email")
      .populate("id_admin_createur", "nom email");
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });
    res.status(200).json(projet);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération projet", error: error.message });
  }
});

apiRouter.put("/projets/:id", verifyToken, async (req, res) => {
  try {
    const projet = await Projet.findByIdAndUpdate(
      req.params.id, { ...req.body }, { new: true }
    ).populate("id_client", "nom email");
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });
    res.status(200).json({ message: "Projet modifié.", projet });
  } catch (error) {
    res.status(500).json({ message: "Erreur modification", error: error.message });
  }
});

apiRouter.delete("/projets/:id", verifyToken, async (req, res) => {
  try {
    const projet = await Projet.findByIdAndDelete(req.params.id);
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });
    res.status(200).json({ message: "Projet supprimé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
});

// ---- AFFECTATIONS ----

// GET affectations d'un projet (admin)
apiRouter.get("/affectations/projet/:id_projet", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const affectations = await Affectation.find({ id_projet: req.params.id_projet })
      .populate("id_designer", "nom email");
    res.status(200).json(affectations);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération affectations", error: error.message });
  }
});

// GET projets du designer connecté
apiRouter.get("/affectations/mes-projets", verifyToken, checkRole(['designer']), async (req, res) => {
  try {
    const affectations = await Affectation.find({ id_designer: req.user.id })
      .populate({
        path: "id_projet",
        populate: { path: "id_client", select: "nom email" }
      });
    res.status(200).json(affectations);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération projets designer", error: error.message });
  }
});

// POST assigner un designer à un projet (admin)
apiRouter.post("/affectations", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { id_projet, id_designer } = req.body;
    if (!id_projet || !id_designer)
      return res.status(400).json({ message: "id_projet et id_designer sont requis." });

    // Vérifier que le designer existe
    const designer = await Utilisateur.findOne({ _id: id_designer, rôle: "designer" });
    if (!designer) return res.status(404).json({ message: "Designer introuvable." });

    // Vérifier que le projet existe
    const projet = await Projet.findById(id_projet);
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });

    const affectation = await Affectation.create({ id_projet, id_designer });
    await affectation.populate("id_designer", "nom email");
    res.status(201).json({ message: "Designer assigné avec succès.", affectation });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: "Ce designer est déjà assigné à ce projet." });
    res.status(500).json({ message: "Erreur assignation", error: error.message });
  }
});

// DELETE retirer un designer d'un projet (admin)
apiRouter.delete("/affectations/:id", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const affectation = await Affectation.findByIdAndDelete(req.params.id);
    if (!affectation) return res.status(404).json({ message: "Affectation introuvable." });
    res.status(200).json({ message: "Designer retiré du projet." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression affectation", error: error.message });
  }
});

// ---- AUTRES ROUTES ----
apiRouter.post("/maquettes", verifyToken, checkRole(['designer', 'admin']), (req, res) => res.send("Création maquette OK"));
apiRouter.get("/maquettes", verifyToken, (req, res) => res.send("Route Maquettes B2B"));
apiRouter.get("/versions", verifyToken, (req, res) => res.send("Route Versions B2B"));
apiRouter.get("/feedbacks", verifyToken, (req, res) => res.send("Route Feedbacks B2B"));
apiRouter.get("/rapports", verifyToken, (req, res) => res.send("Route Rapports B2B"));

app.use("/Api_B2B", apiRouter);

// ==========================================
// INITIALISATION BASE DE DONNÉES & SERVEUR
// ==========================================
const initAdmin = async () => {
  try {
    const adminExists = await Utilisateur.findOne({ rôle: "admin" });
    if (!adminExists) {
      const hash = await bcrypt.hash("admin", await bcrypt.genSalt(10));
      await Utilisateur.create({ nom: "admin", email: "admin", mot_de_passe: hash, rôle: "admin" });
      console.log("✅ Compte admin par défaut créé (email: admin / mdp: admin)");
    } else {
      console.log("⚡ Compte admin déjà existant.");
    }
  } catch (error) {
    console.error("❌ Erreur init admin :", error.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connecté");
    await initAdmin();
  } catch (error) {
    console.error("❌ Erreur MongoDB :", error.message);
    process.exit(1);
  }
};
connectDB();

app.get("/", (req, res) => res.send("API Project Management est en ligne..."));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur sur le port ${PORT}`));