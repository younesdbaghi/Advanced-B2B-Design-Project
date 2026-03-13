const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const pdfDocument = require("pdfkit");

dotenv.config();
const app = express();
app.use(cors());
// Limite à 50mb très importante pour les images/canvas des maquettes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
      default: "En attente",
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
    image_fond: { type: String },
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
  if (!token)
    return res.status(401).json({ message: "Accès refusé. Aucun token fourni." });
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

// ---- HEALTH CHECK ----
apiRouter.get("/", (req, res) => res.send("Serveur actif et prêt !"));

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
apiRouter.get("/utilisateurs", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find().select("-mot_de_passe");
    res.status(200).json(utilisateurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération utilisateurs", error });
  }
});

apiRouter.post("/utilisateurs", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { nom, email, rôle } = req.body;
    if (await Utilisateur.findOne({ email }))
      return res.status(400).json({ message: "Cet email est déjà utilisé." });

    const motDePasseClair = Math.random().toString(36).slice(-8);
    const motDePasseHash = await bcrypt.hash(motDePasseClair, await bcrypt.genSalt(10));

    const nouvelUtilisateur = new Utilisateur({ nom, email, rôle, mot_de_passe: motDePasseHash });
    const utilisateurSauvegarde = await nouvelUtilisateur.save();

    try {
      await envoyerEmailBienvenue(email, nom, motDePasseClair);
      res.status(201).json({
        message: "Utilisateur créé et email envoyé.",
        utilisateur: { _id: utilisateurSauvegarde._id, nom, email, rôle },
      });
    } catch (mailError) {
      console.log("Erreur envoi email :", mailError.message);
      res.status(201).json({
        message: "Utilisateur créé (email non envoyé).",
        mot_de_passe_temp: motDePasseClair,
        utilisateur: { _id: utilisateurSauvegarde._id, nom, email, rôle },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur création utilisateur", error: error.message });
  }
});

apiRouter.get("/utilisateurs/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id).select("-mot_de_passe");
    if (!utilisateur) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.status(200).json(utilisateur);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération utilisateur", error: error.message });
  }
});

apiRouter.put("/utilisateurs/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { nom, email, rôle } = req.body;
    if (email) {
      const existing = await Utilisateur.findOne({ email, _id: { $ne: req.params.id } });
      if (existing)
        return res.status(400).json({ message: "Email déjà utilisé par un autre compte." });
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

apiRouter.delete("/utilisateurs/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
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
apiRouter.get("/designers", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const affectations = await Affectation.find().distinct("id_designer");
    const designers = await Utilisateur.find({
      rôle: "designer",
      _id: { $nin: affectations },
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

apiRouter.post("/projets/demande", verifyToken, checkRole(["client"]), async (req, res) => {
  try {
    const { nom, description, date_début, date_fin } = req.body;
    if (!nom || !date_début || !date_fin)
      return res.status(400).json({ message: "Nom, date_début et date_fin sont requis." });

    const admin = await Utilisateur.findOne({ rôle: "admin" });
    if (!admin) return res.status(500).json({ message: "Aucun administrateur trouvé." });

    const demande = await Projet.create({
      nom, description: description || "",
      date_début, date_fin,
      statut: "En attente",
      demanded: true,
      id_client: req.user.id,
      id_admin_createur: admin._id,
    });
    res.status(201).json({ message: "Demande envoyée.", demande });
  } catch (error) {
    res.status(500).json({ message: "Erreur création demande", error: error.message });
  }
});

apiRouter.post("/projets", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const projet = new Projet({ ...req.body, id_admin_createur: req.user.id });
    await projet.save();
    res.status(201).json(projet);
  } catch (error) {
    res.status(400).json({ message: "Erreur création projet", error });
  }
});

apiRouter.put("/projets/valider", verifyToken, checkRole(["client"]), (req, res) => {
  res.send("Validation projet OK");
});

apiRouter.patch("/projets/:id/accepter", verifyToken, checkRole(["admin"]), async (req, res) => {
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

apiRouter.patch("/projets/:id/refuser", verifyToken, checkRole(["admin"]), async (req, res) => {
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
    if (req.user.rôle === "client") {
      const projet = await Projet.findById(req.params.id);
      if (!projet) return res.status(404).json({ message: "Projet introuvable." });
      if (String(projet.id_client) !== String(req.user.id))
        return res.status(403).json({ message: "Vous ne pouvez pas modifier ce projet." });
      if (projet.statut !== "En attente")
        return res.status(400).json({ message: "Vous ne pouvez modifier que les demandes En attente." });
    }
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
    if (req.user.rôle === "client") {
      const projet = await Projet.findById(req.params.id);
      if (!projet) return res.status(404).json({ message: "Projet introuvable." });
      if (String(projet.id_client) !== String(req.user.id))
        return res.status(403).json({ message: "Vous ne pouvez pas annuler ce projet." });
      if (projet.statut !== "En attente")
        return res.status(400).json({ message: "Vous ne pouvez annuler que les demandes En attente." });
    }
    const projet = await Projet.findByIdAndDelete(req.params.id);
    if (!projet) return res.status(404).json({ message: "Projet introuvable." });
    res.status(200).json({ message: "Projet supprimé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
});

// ---- AFFECTATIONS ----

apiRouter.get("/affectations/projet/:id_projet", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const affectations = await Affectation.find({ id_projet: req.params.id_projet })
      .populate("id_designer", "nom email");
    res.status(200).json(affectations);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération affectations", error: error.message });
  }
});

apiRouter.get("/affectations/mes-projets", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const affectations = await Affectation.find({ id_designer: req.user.id }).populate({
      path: "id_projet",
      populate: { path: "id_client", select: "nom email" },
    });
    res.status(200).json(affectations);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération projets designer", error: error.message });
  }
});

apiRouter.post("/affectations", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { id_projet, id_designer } = req.body;
    if (!id_projet || !id_designer)
      return res.status(400).json({ message: "id_projet et id_designer sont requis." });

    const designer = await Utilisateur.findOne({ _id: id_designer, rôle: "designer" });
    if (!designer) return res.status(404).json({ message: "Designer introuvable." });

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

apiRouter.delete("/affectations/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const affectation = await Affectation.findByIdAndDelete(req.params.id);
    if (!affectation) return res.status(404).json({ message: "Affectation introuvable." });
    res.status(200).json({ message: "Designer retiré du projet." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression affectation", error: error.message });
  }
});

// ---- MAQUETTES & ÉDITEUR DESIGN ----

apiRouter.get("/maquettes", verifyToken, async (req, res) => {
  try {
    const maquettes = await Maquette.find()
      .populate("id_projet", "nom")
      .sort({ date_creation: -1 });
    res.status(200).json(maquettes);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération maquettes" });
  }
});

// Récupérer la maquette d'un projet spécifique (utilisée par ClientDashboard)
apiRouter.get("/maquettes/projet/:id_projet", verifyToken, async (req, res) => {
  try {
    const maquette = await Maquette.findOne({ id_projet: req.params.id_projet })
      .sort({ date_creation: -1 })
      .populate("id_projet", "nom")
      .populate("id_createur", "nom");
    if (!maquette) return res.status(200).json({ maquette: null });
    res.status(200).json({ maquette });
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération maquette du projet", error: error.message });
  }
});

apiRouter.get("/maquettes/:id", verifyToken, async (req, res) => {
  try {
    const maquette = await Maquette.findById(req.params.id);
    res.status(200).json(maquette);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/maquettes", verifyToken, async (req, res) => {
  try {
    const { nom, description, id_projet, image_fond } = req.body;
    const nouvelleMaquette = await Maquette.create({
      nom, description, id_projet,
      id_createur: req.user.id,
      image_fond,
    });
    const contenuInitial = { version: "5.3.0", objects: [], initialized: false };
    const nouvelleVersion = await Version.create({
      numéro_version: 1,
      contenu: contenuInitial,
      id_maquette: nouvelleMaquette._id,
    });
    res.status(201).json({ maquette: nouvelleMaquette, version: nouvelleVersion });
  } catch (error) {
    res.status(500).json({ message: "Erreur de création." });
  }
});

apiRouter.put("/maquettes/:id", verifyToken, async (req, res) => {
  try {
    const { nom, description, id_projet } = req.body;
    const maquetteMaj = await Maquette.findByIdAndUpdate(
      req.params.id, { nom, description, id_projet }, { new: true }
    ).populate("id_projet", "nom");
    res.status(200).json(maquetteMaj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete("/maquettes/:id", verifyToken, async (req, res) => {
  try {
    await Maquette.findByIdAndDelete(req.params.id);
    await Version.deleteMany({ id_maquette: req.params.id });
    res.status(200).json({ message: "Maquette supprimée" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer la dernière version d'une maquette
apiRouter.get("/maquettes/:id/latest-version", verifyToken, async (req, res) => {
  try {
    const version = await Version.findOne({ id_maquette: req.params.id })
      .sort({ date_creation: -1 });
    if (!version) return res.status(404).json({ message: "Version introuvable." });
    res.status(200).json(version);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération version.", error: error.message });
  }
});

// ---- VERSIONS ----

// Mettre à jour une version existante (gardé pour compatibilité)
apiRouter.put("/versions/:id", verifyToken, async (req, res) => {
  try {
    const { contenu } = req.body;
    const versionUpdate = await Version.findByIdAndUpdate(
      req.params.id, { contenu }, { new: true }
    );
    res.status(200).json({ message: "Design sauvegardé", version: versionUpdate });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la sauvegarde.", error: error.message });
  }
});

// ---- SUPPRIMER UNE VERSION ----
apiRouter.delete("/versions/:id", verifyToken, async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ message: "Version introuvable." });

    // Vérifier si c'est la seule version de la maquette (on empêche sa suppression)
    const count = await Version.countDocuments({ id_maquette: version.id_maquette });
    if (count <= 1) {
      return res.status(400).json({ message: "Impossible de supprimer l'unique version de cette maquette." });
    }

    await Version.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Version supprimée avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
});

// ✅ Créer une nouvelle version (incrémente le numéro automatiquement)
apiRouter.post("/versions", verifyToken, async (req, res) => {
  try {
    const { contenu, commentaire, id_maquette } = req.body;
    if (!id_maquette || !contenu)
      return res.status(400).json({ message: "id_maquette et contenu sont requis." });

    // Trouver la dernière version pour incrémenter le numéro
    const lastVersion = await Version.findOne({ id_maquette })
      .sort({ numéro_version: -1 });

    const nouveauNumero = lastVersion ? lastVersion.numéro_version + 1 : 1;

    const nouvelleVersion = await Version.create({
      numéro_version: nouveauNumero,
      contenu,
      commentaire: commentaire || "",
      id_maquette,
    });

    res.status(201).json({ message: "Nouvelle version créée.", version: nouvelleVersion });
  } catch (error) {
    res.status(500).json({ message: "Erreur création version", error: error.message });
  }
});

// Récupérer toutes les versions d'une maquette (historique)
apiRouter.get("/versions/maquette/:id_maquette", verifyToken, async (req, res) => {
  try {
    const versions = await Version.find({ id_maquette: req.params.id_maquette })
      .sort({ numéro_version: -1 });
    res.status(200).json(versions);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération versions", error: error.message });
  }
});

// ---- RAPPORTS QUOTIDIENS ----

apiRouter.post("/rapport", verifyToken, async (req, res) => {
  try {
    const { date, id_projet, travail_effectué, tâches_restantes, blocages } = req.body;
    const rapport = await RapportQuotidien.create({
      date, travail_effectué, tâches_restantes, blocages,
      id_projet, id_designer: req.user.id,
    });
    if (rapport) return res.status(200).json({ msg: "rapport écrit avec succès", rapport });
    return res.status(400).json({ msg: "rapport non écrit" });
  } catch (e) {
    console.log("err : ", e);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/rapport", verifyToken, async (req, res) => {
  try {
    const rapports = await RapportQuotidien.find().populate("id_designer id_projet");
    if (rapports) return res.status(201).json({ msg: "data fetched successfully", rapports });
    return res.status(400).json({ msg: "data fetch failed" });
  } catch (e) {
    console.log("err fetch rapport", e);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/rapport/:id", verifyToken, async (req, res) => {
  try {
    const rapport = await RapportQuotidien.findById(req.params.id);
    if (rapport) return res.status(200).json({ msg: "rapport fetch successfully", rapport });
    return res.status(400).json({ msg: "fetch rapport failed" });
  } catch (e) {
    console.log("err : ", e);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete("/rapport/:id", verifyToken, async (req, res) => {
  try {
    await RapportQuotidien.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "delete successfully" });
  } catch (e) {
    console.log("err delete : ", e);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/rapport/:id", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const updatedRapport = await RapportQuotidien.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (updatedRapport)
      return res.status(200).json({ msg: "updated successfully", rapport: updatedRapport });
    return res.status(400).json({ msg: "update failed" });
  } catch (e) {
    console.log("err updated : ", e);
    res.status(500).json({ error: e.message });
  }
});

// Générer un PDF d'un rapport quotidien
apiRouter.post("/rapportPDF/:id", verifyToken, async (req, res) => {
  try {
    const { date, travail_effectué, tâches_restantes, blocages, id_designer, id_projet } =
      await RapportQuotidien.findById(req.params.id).populate("id_projet id_designer");

    const doc = new pdfDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=rapport.pdf");
    doc.pipe(res);

    doc.fontSize(30).fillColor("#2c3e50").text("Rapport Journalier", { align: "center" });
    doc.moveDown();
    doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
    doc.fontSize(14).fillColor("black").text(`Date : ${date.toISOString().split("T")[0]}`);
    doc.moveDown();
    doc.fontSize(16).fillColor("#34495e").text("Nom de designer : ");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("black").text(id_designer.nom);
    doc.moveDown();
    doc.fontSize(16).fillColor("#34495e").text("Nom de projet : ");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("black").text(id_projet.nom);
    doc.moveDown();
    doc.fontSize(16).fillColor("#34495e").text("Travail effectué : ");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("black").text(travail_effectué);
    doc.moveDown();
    doc.fontSize(16).fillColor("#34495e").text("Tâches restantes : ");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("black").text(tâches_restantes);
    doc.moveDown();
    doc.fontSize(16).fillColor("#34495e").text("Blocages : ");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("black").text(blocages || "Aucun");
    doc.end();
  } catch (e) {
    console.log("err rapportPDF : ", e);
    res.status(500).json({ error: e.message });
  }
});

// ---- FEEDBACKS ----
apiRouter.get("/feedbacks", verifyToken, (req, res) =>
  res.send("Route Feedbacks B2B à implémenter")
);

// ==========================================
// MONTAGE FINAL DU ROUTEUR
// ==========================================
app.use("/Api_B2B", apiRouter);

// ==========================================
// INITIALISATION BASE DE DONNÉES & SERVEUR
// ==========================================
const initAdmin = async () => {
  try {
    const adminExists = await Utilisateur.findOne({ rôle: "admin" });
    if (!adminExists) {
      const hash = await bcrypt.hash("admin", await bcrypt.genSalt(10));
      await Utilisateur.create({
        nom: "admin", email: "admin",
        mot_de_passe: hash, rôle: "admin",
      });
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