const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

dotenv.config();

const app = express();

// ==========================================
// 1) MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// 2) SCHÉMAS MONGODB (MODÈLES)
// ==========================================

// 1. UTILISATEUR
const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 150 },
  mot_de_passe: { type: String, required: true, maxlength: 255 },
  rôle: { type: String, enum: ["admin", "designer", "client"], required: true },
  date_inscription: { type: Date, default: Date.now },
  dernier_connexion: { type: Date },
});
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);

// 2. PROJET
const projetSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, maxlength: 150 },
    description: { type: String },
    date_début: { type: Date, required: true },
    date_fin: { type: Date, required: true },
    statut: {
      type: String,
      enum:["En cours", "En révision", "Validé", "Refusé", "Terminé"],
      required: true,
      default: "En cours",
    },
    id_client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
    id_admin_createur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "date_creation", updatedAt: "date_modification" },
  }
);
const Projet = mongoose.model("Projet", projetSchema);

// 3. AFFECTATION (Projet ⇄ Designer)
const affectationSchema = new mongoose.Schema({
  id_projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Projet",
    required: true,
  },
  id_designer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
  date_affectation: { type: Date, default: Date.now },
});
affectationSchema.index({ id_projet: 1, id_designer: 1 }, { unique: true });
const Affectation = mongoose.model("Affectation", affectationSchema);

// 4. MAQUETTE
const maquetteSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, maxlength: 150 },
    description: { type: String },
    id_projet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Projet",
      required: true,
    },
    id_createur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "date_creation", updatedAt: "date_modification" },
  }
);
const Maquette = mongoose.model("Maquette", maquetteSchema);

// 5. VERSION
const versionSchema = new mongoose.Schema(
  {
    numéro_version: { type: Number, required: true },
    contenu: { type: mongoose.Schema.Types.Mixed, required: true },
    commentaire: { type: String },
    id_maquette: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maquette",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "date_creation", updatedAt: false },
  }
);
const Version = mongoose.model("Version", versionSchema);

// 6. FEEDBACK
const feedbackSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Com", "Val", "Refus"], required: true },
    commentaire: { type: String, required: true },
    justification: { type: String },
    id_version: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Version",
      required: true,
    },
    id_auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "date_creation", updatedAt: false },
  }
);
const Feedback = mongoose.model("Feedback", feedbackSchema);

// 7. RAPPORT_QUOTIDIEN
const rapportQuotidienSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  travail_effectué: { type: String, required: true },
  tâches_restantes: { type: String, required: true },
  blocages: { type: String },
  date_soumission: { type: Date, default: Date.now },
  id_projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Projet",
    required: true,
  },
  id_designer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
});
const RapportQuotidien = mongoose.model(
  "RapportQuotidien",
  rapportQuotidienSchema
);

// 8. CONNEXION_LOG
const connexionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  adresse_IP: { type: String, required: true },
  id_utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
});
const ConnexionLog = mongoose.model("ConnexionLog", connexionLogSchema);

// ==========================================
// 2.5) UTILS ET MIDDLEWARES (AUTH & MAIL)
// ==========================================

// Fonction d'envoi d'email
const envoyerEmailBienvenue = async (email, nom, motDePasse) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Bienvenue sur DevPortal B2B - Vos identifiants",
    html: `
      <h2>Bonjour ${nom},</h2>
      <p>Votre compte a été créé avec succès sur notre plateforme.</p>
      <p>Voici vos identifiants de connexion :</p>
      <ul>
        <li><strong>Email :</strong> ${email}</li>
        <li><strong>Mot de passe temporaire :</strong> ${motDePasse}</li>
      </ul>
      <p>Nous vous conseillons de le modifier dès votre première connexion.</p>
      <p>L'équipe DevPortal</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Middleware : Vérifier le Token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: "Accès refusé. Aucun token fourni." });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key"
    );
    req.user = decoded; // Ajoute les infos de l'utilisateur à la requête (id, rôle)
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalide ou expiré." });
  }
};

// Middleware : Vérifier dynamiquement les rôles autorisés
const checkRole = (rolesAutorises) => {
  return (req, res, next) => {
    // req.user vient du middleware verifyToken appelé juste avant
    if (!rolesAutorises.includes(req.user.rôle)) {
      return res.status(403).json({ 
        message: "Accès interdit. Vous n'avez pas les droits pour effectuer cette action." 
      });
    }
    next();
  };
};

// ==========================================
// 3) ROUTES API (Préfixe : /Api_B2B)
// ==========================================
const apiRouter = express.Router();

// --- AUTHENTIFICATION ---

// POST /Api_B2B/auth/login
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    const user = await Utilisateur.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch)
      return res.status(400).json({ message: "Mot de passe incorrect." });

    // Mise à jour de la dernière connexion
    user.dernier_connexion = Date.now();
    await user.save();

    // Génération du token
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

// --- Routes UTILISATEUR ---

// GET /Api_B2B/utilisateurs (Protégé : Admin uniquement)
apiRouter.get("/utilisateurs", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find().select("-mot_de_passe");
    res.status(200).json(utilisateurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs", error });
  }
});

// POST /Api_B2B/utilisateurs (Création de User par l'Admin avec mot de passe généré et email)
apiRouter.post("/utilisateurs", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { nom, email, rôle } = req.body;

    // 1. Vérifier si l'email existe
    const existingUser = await Utilisateur.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Cet email est déjà utilisé." });

    // 2. Générer un mot de passe aléatoire de 8 caractères
    const motDePasseClair = Math.random().toString(36).slice(-8);

    // 3. Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const motDePasseHash = await bcrypt.hash(motDePasseClair, salt);

    // 4. Créer et sauvegarder l'utilisateur
    const nouvelUtilisateur = new Utilisateur({
      nom,
      email,
      rôle,
      mot_de_passe: motDePasseHash,
    });
    const utilisateurSauvegarde = await nouvelUtilisateur.save();

    // 5. Envoyer l'email (désactivé s'il y a une erreur de configuration mail, mais ne bloque pas la création)
    try {
      await envoyerEmailBienvenue(email, nom, motDePasseClair);
    } catch (mailError) {
      console.log("Erreur envoi email : ", mailError.message);
      // On retourne quand même le succès avec un warning
      return res.status(201).json({
        message: "Utilisateur créé, mais l'email n'a pas pu être envoyé (vérifiez config .env).",
        mot_de_passe_temp: motDePasseClair, // Affiché pour que l'admin puisse le copier si le mail échoue
        utilisateur: { _id: utilisateurSauvegarde._id, nom, email, rôle },
      });
    }

    res.status(201).json({
      message: "Utilisateur créé et email envoyé avec succès.",
      utilisateur: { _id: utilisateurSauvegarde._id, nom, email, rôle },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'utilisateur", error: error.message });
  }
});

// --- Routes PROJET ---

// GET /Api_B2B/projets (Protégé : il faut être connecté, tous les rôles y ont accès)
apiRouter.get("/projets", verifyToken, async (req, res) => {
  try {
    const projets = await Projet.find()
      .populate("id_client", "nom email")
      .populate("id_admin_createur", "nom email");
    res.status(200).json(projets);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des projets", error });
  }
});

// POST /Api_B2B/projets (Protégé : Admin uniquement)
apiRouter.post("/projets", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    // Injecter l'id de l'admin créateur directement depuis le token
    const nouveauProjet = new Projet({
      ...req.body,
      id_admin_createur: req.user.id,
    });
    const projetSauvegarde = await nouveauProjet.save();
    res.status(201).json(projetSauvegarde);
  } catch (error) {
    res.status(400).json({ message: "Erreur lors de la création du projet", error });
  }
});

// --- Autres routes (Exemples utilisant checkRole) ---

// Seuls le Designer et l'Admin peuvent poster des Maquettes
apiRouter.post("/maquettes", verifyToken, checkRole(['designer', 'admin']), (req, res) => {
  res.send("Création de maquette B2B - Autorisé pour Designer et Admin");
});

// Seul le Client peut valider un projet
apiRouter.put("/projets/valider", verifyToken, checkRole(['client']), (req, res) => {
  res.send("Validation de projet - Autorisé uniquement pour le Client");
});

// Squelettes basiques
apiRouter.get("/affectations", verifyToken, (req, res) => res.send("Route Affectations B2B"));
apiRouter.get("/maquettes", verifyToken, (req, res) => res.send("Route Maquettes B2B"));
apiRouter.get("/versions", verifyToken, (req, res) => res.send("Route Versions B2B"));
apiRouter.get("/feedbacks", verifyToken, (req, res) => res.send("Route Feedbacks B2B"));
apiRouter.get("/rapports", verifyToken, (req, res) => res.send("Route Rapports B2B"));

// Toutes les routes définies dans apiRouter seront accessibles via /Api_B2B/...
app.use("/Api_B2B", apiRouter);


// ==========================================
// BASE DE DONNÉES & SERVEUR - INTOUCHABLE //
// ==========================================

// Fonction pour créer l'admin par défaut
const initAdmin = async () => {
  try {
    const adminExists = await Utilisateur.findOne({ rôle: "admin" });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash("admin", salt); // Mot de passe : admin

      await Utilisateur.create({
        nom: "admin",
        email: "admin", // Identifiant de connexion ("username")
        mot_de_passe: hashPassword,
        rôle: "admin",
      });
      console.log("✅ Compte Admin par défaut créé avec succès (email: admin / mdp: admin)");
    } else {
      console.log("⚡ Compte Admin déjà existant.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la création de l'admin par défaut :", error.message);
  }
};

// Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connecté");

    // Appel de la création automatique après la connexion réussie
    await initAdmin();
  } catch (error) {
    console.error("❌ Erreur MongoDB :", error.message);
    process.exit(1);
  }
};

connectDB();

// Route de test (optionnelle mais pratique pour vérifier que l'API tourne)
app.get("/", (req, res) => {
  res.send("API Project Management est en ligne...");
});

// Définition du Port et lancement du serveur
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
});