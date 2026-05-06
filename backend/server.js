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
  lu: { type: Boolean, default: false },
});
affectationSchema.index({ id_projet: 1, id_designer: 1 }, { unique: true });
const Affectation = mongoose.model("Affectation", affectationSchema);

const maquetteSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, maxlength: 150 },
    description: { type: String },
    image_fond: { type: String },
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
    statut: { type: String, enum: ["En cours", "En validation", "À corriger", "Validé", "Refusé", "Traité"], default: "En cours" },
    est_auto_save: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: false } }
);
const Version = mongoose.model("Version", versionSchema);

const feedbackSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Com", "Val", "Refus"], required: true },
    commentaire: { type: String, default: "" },
    commentaire_admin: { type: String, default: "" },
    justification: { type: String },
    id_version: { type: mongoose.Schema.Types.ObjectId, ref: "Version", required: true },
    id_auteur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    transmis_designer: { type: Boolean, default: false },
    date_transmission: { type: Date },
    lu: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: false } }
);
const Feedback = mongoose.model("Feedback", feedbackSchema);

const rapportQuotidienSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  travail_effectué: { type: [String], required: true },
  tâches_restantes: { type: [String], required: true },
  blocages: { type: [String] },
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

const commentaireElementSchema = new mongoose.Schema(
  {
    validation_id: { type: mongoose.Schema.Types.ObjectId, ref: "Validation", required: true },
    id_element: { type: String, required: true },
    label_element: { type: String, default: "" },
    commentaire_client: { type: String, default: "" },
    commentaire_admin: { type: String, default: "" },
  },
  { timestamps: { createdAt: "date_creation", updatedAt: false } }
);
const CommentaireElement = mongoose.model("CommentaireElement", commentaireElementSchema);

const validationSchema = new mongoose.Schema(
  {
    maquette_id: { type: mongoose.Schema.Types.ObjectId, ref: "Maquette", required: true },
    version_id: { type: mongoose.Schema.Types.ObjectId, ref: "Version", required: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    statut: { type: String, enum: ["validé", "à corriger"], required: true },
    justification: { type: String, default: "" },
    transmis_designer: { type: Boolean, default: false },
    date_transmission: { type: Date },
    lu_designer: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "date_validation", updatedAt: false } }
);
const Validation = mongoose.model("Validation", validationSchema);

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    type: { type: String, enum: ["validation", "refus", "demande", "info", "correction"], default: "info" },
    lu: { type: Boolean, default: false },
    id_projet: { type: mongoose.Schema.Types.ObjectId, ref: "Projet", default: null },
    id_version: { type: mongoose.Schema.Types.ObjectId, ref: "Version", default: null },
    id_client: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", default: null },
    id_destinataire: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", default: null },
  },
  { timestamps: true }
);
const Notification = mongoose.model("Notification", notificationSchema);

// ==========================================
// MIDDLEWARES
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

const creerNotification = async ({ message, type = "info", id_projet = null, id_version = null, id_client = null, id_destinataire = null }) => {
  try {
    await Notification.create({ message, type, id_projet, id_version, id_client, id_destinataire });
  } catch (err) {
    console.error("❌ Erreur création notification :", err.message);
  }
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
// ROUTES API
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

apiRouter.put("/auth/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userID = req.user.id;
    const user = await Utilisateur.findById(userID);
    if (!user) return res.status(400).json({ msg: "Utilisateur non trouvé." });
    const ifPassword = await bcrypt.compare(currentPassword, user.mot_de_passe);
    if (!ifPassword) return res.status(404).json({ msg: "Mot de passe actuel incorrect." });
    user.mot_de_passe = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ msg: "Mot de passe modifié avec succès." });
  } catch (e) {
    console.error("Erreur change-password :", e);
    res.status(500).json({ error: e.message });
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
apiRouter.get("/designers", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const affectations = await Affectation.aggregate([
      { $group: { _id: "$id_designer", count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } }
    ]);
    const busyDesigners = affectations.map(a => a._id);
    const designers = await Utilisateur.find({
      rôle: "designer",
      _id: { $nin: busyDesigners }
    }).select("-mot_de_passe");
    res.status(200).json(designers);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération designers", error: error.message });
  }
});

// ---- PROJETS ----
apiRouter.get("/projets", verifyToken, async (req, res) => {
  try {
    const filter = req.user.rôle === "client" ? { id_client: req.user.id } : {};
    const projets = await Projet.find(filter)
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
      req.params.id, { statut: "En cours" }, { returnDocument: "after" }
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
      req.params.id, { statut: "Refusé" }, { returnDocument: "after" }
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
      req.params.id, { ...req.body }, { returnDocument: "after" }
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

apiRouter.get("/affectations/projet/:id_projet", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const affectations = await Affectation.find({ id_projet: req.params.id_projet })
      .populate("id_designer", "nom email");
    res.status(200).json(affectations);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération affectations", error: error.message });
  }
});

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

apiRouter.patch("/affectations/:id/lire", verifyToken, checkRole(['designer']), async (req, res) => {
  try {
    const affectation = await Affectation.findByIdAndUpdate(
      req.params.id,
      { lu: true },
      { returnDocument: "after" }
    );
    if (!affectation) return res.status(404).json({ message: "Affectation introuvable." });
    res.status(200).json({ message: "Affectation marquée comme lue.", affectation });
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
});

apiRouter.post("/affectations", verifyToken, checkRole(['admin']), async (req, res) => {
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

apiRouter.delete("/affectations/:id", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const affectation = await Affectation.findByIdAndDelete(req.params.id);
    if (!affectation) return res.status(404).json({ message: "Affectation introuvable." });
    res.status(200).json({ message: "Designer retiré du projet." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression affectation", error: error.message });
  }
});

// ==========================================
// ROUTES MAQUETTES
// ==========================================

apiRouter.post("/maquettes", verifyToken, checkRole(['designer', 'admin']), async (req, res) => {
  try {
    const { nom, description, id_projet, image_fond } = req.body;
    console.log("Création maquette - données reçues :", { nom, description, id_projet, image_fond });
    if (!nom || !id_projet) return res.status(400).json({ message: "nom et id_projet sont requis" });
    const maquette = await Maquette.create({ nom, description, id_projet, id_createur: req.user.id, image_fond });

    const version = await Version.create({
      id_maquette: maquette._id,
      numéro_version: 1,
      contenu: { version: "5.3.0", objects: [] },
      commentaire: "Version initiale",
      statut: "En cours",
    });

    res.status(201).json({ maquette, version });
  } catch (err) { res.status(500).json({ message: "Erreur création maquette", error: err.message }); }
});

apiRouter.get("/maquettes", verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.id_projet) filter.id_projet = req.query.id_projet;
    if (req.user.rôle === "designer") filter.id_createur = req.user.id;
    const maquettes = await Maquette.find(filter).populate("id_projet", "nom statut").sort({ date_creation: -1 });
    res.json(maquettes);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/maquettes/projet/:id_projet", verifyToken, async (req, res) => {
  try {
    const maquettes = await Maquette.find({ id_projet: req.params.id_projet })
      .populate("id_createur", "nom")
      .sort({ date_creation: -1 });

    const result = await Promise.all(maquettes.map(async (maq) => {
      const versions = await Version.find({ id_maquette: maq._id, est_auto_save: { $ne: true } })
        .select("-contenu")
        .sort({ numéro_version: -1 });
      return { ...maq.toObject(), versions };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/maquettes/:id/latest-version", verifyToken, async (req, res) => {
  try {
    let version = await Version.findOne({ id_maquette: req.params.id, est_auto_save: { $ne: true } })
      .sort({ numéro_version: -1 });

    if (!version) {
      const maquette = await Maquette.findById(req.params.id);
      if (!maquette) return res.status(404).json({ message: "Maquette introuvable" });
      version = await Version.create({
        id_maquette: req.params.id,
        numéro_version: 1,
        contenu: { version: "5.3.0", objects: [] },
        commentaire: "Version initiale (auto)",
        statut: "En cours",
      });
    }

    res.json(version);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/maquettes/:id", verifyToken, async (req, res) => {
  try {
    const maquette = await Maquette.findById(req.params.id).populate("id_projet").populate("id_createur", "nom");
    if (!maquette) return res.status(404).json({ message: "Maquette introuvable" });
    res.json(maquette);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.put("/maquettes/:id", verifyToken, checkRole(['designer', 'admin']), async (req, res) => {
  try {
    const maquette = await Maquette.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (!maquette) return res.status(404).json({ message: "Maquette introuvable" });
    res.json(maquette);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.delete("/maquettes/:id", verifyToken, checkRole(['designer', 'admin']), async (req, res) => {
  try {
    await Maquette.findByIdAndDelete(req.params.id);
    res.json({ message: "Maquette supprimée" });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

// ==========================================
// ROUTES VERSIONS
// ==========================================

apiRouter.get("/versions/maquette/:id_maquette", verifyToken, async (req, res) => {
  try {
    const versions = await Version.find({ id_maquette: req.params.id_maquette, est_auto_save: { $ne: true } })
      .select("-contenu")
      .sort({ numéro_version: -1 });
    res.json(versions);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/versions/:id", verifyToken, async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ message: "Version introuvable" });
    res.json(version);
  } catch (err) { res.status(500).json({ message: "Erreur serveur", error: err.message }); }
});

apiRouter.post("/versions", verifyToken, checkRole(['designer', 'admin']), async (req, res) => {
  try {
    const { id_maquette, contenu, commentaire } = req.body;
    if (!id_maquette || !contenu) return res.status(400).json({ message: "id_maquette et contenu requis" });
    const derniere = await Version.findOne({ id_maquette, est_auto_save: { $ne: true } }).sort({ numéro_version: -1 });
    const numero = derniere ? derniere.numéro_version + 1 : 1;
    const version = await Version.create({ id_maquette, contenu, commentaire: commentaire || `Version ${numero}`, numéro_version: numero, statut: "En cours" });
    res.status(201).json({ version });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.put("/versions/:id", verifyToken, checkRole(['designer', 'admin']), async (req, res) => {
  try {
    const version = await Version.findByIdAndUpdate(req.params.id, { contenu: req.body.contenu }, { returnDocument: "after" });
    if (!version) return res.status(404).json({ message: "Version introuvable" });
    res.json({ version });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.delete("/versions/:id", verifyToken, checkRole(['designer', 'admin']), async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ message: "Version introuvable" });

    const versionCount = await Version.countDocuments({
      id_maquette: version.id_maquette,
      est_auto_save: { $ne: true }
    });
    if (versionCount <= 1)
      return res.status(400).json({ message: "Impossible de supprimer la dernière version d'une maquette" });

    const validations = await Validation.find({ version_id: req.params.id });
    for (const val of validations) {
      await CommentaireElement.deleteMany({ validation_id: val._id });
    }
    await Validation.deleteMany({ version_id: req.params.id });
    await Feedback.deleteMany({ id_version: req.params.id });
    await Version.findByIdAndDelete(req.params.id);

    res.json({ message: "✅ Version supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression version", error: err.message });
  }
});

apiRouter.patch("/versions/:id/statut", verifyToken, async (req, res) => {
  try {
    const { statut } = req.body;
    const version = await Version.findByIdAndUpdate(req.params.id, { statut }, { returnDocument: "after" });
    if (!version) return res.status(404).json({ message: "Version introuvable" });
    res.json({ version });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

// ==========================================
// ROUTES FEEDBACKS
// ==========================================

apiRouter.get("/feedbacks", verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.id_version) filter.id_version = req.query.id_version;
    const feedbacks = await Feedback.find(filter)
      .populate("id_auteur", "nom rôle")
      .sort({ date_creation: -1 });
    res.json(feedbacks);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/feedbacks/en-attente", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ type: "Refus", transmis_designer: false })
      .populate("id_auteur", "nom email")
      .populate({ path: "id_version", select: "numéro_version statut id_maquette", populate: { path: "id_maquette", select: "nom id_projet", populate: { path: "id_projet", select: "nom" } } })
      .sort({ date_creation: -1 });
    res.json(feedbacks);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.post("/feedbacks", verifyToken, checkRole(['client']), async (req, res) => {
  try {
    const { type, commentaire, justification, id_version } = req.body;
    if (!type || !id_version) return res.status(400).json({ message: "type et id_version requis" });
    if (type === "Refus" && !commentaire) return res.status(400).json({ message: "Un commentaire est obligatoire pour un refus" });

    const version = await Version.findById(id_version).populate("id_maquette");
    if (!version) return res.status(404).json({ message: "Version introuvable" });

    const feedback = await Feedback.create({
      type, commentaire: commentaire || "", justification,
      id_version, id_auteur: req.user.id,
      transmis_designer: false,
      commentaire_admin: "",
    });

    const newStatutVersion = type === "Val" ? "Validé" : "À corriger";
    await Version.findByIdAndUpdate(id_version, { statut: newStatutVersion });

    if (type === "Val") {
      await Projet.findByIdAndUpdate(version.id_maquette.id_projet, { statut: "Validé" });
    } else {
      await Projet.findByIdAndUpdate(version.id_maquette.id_projet, { statut: "En révision" });
    }

    res.status(201).json({ feedback, message: type === "Val" ? "Version validée ✅" : "Refus envoyé à l'admin 📨" });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.patch("/feedbacks/:id/moderer", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { commentaire_admin } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { commentaire_admin },
      { returnDocument: "after" }
    ).populate("id_auteur", "nom");
    if (!feedback) return res.status(404).json({ message: "Feedback introuvable" });
    res.json({ feedback });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.patch("/feedbacks/:id/transmettre", verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { transmis_designer: true, date_transmission: new Date() },
      { returnDocument: "after" }
    ).populate({ path: "id_version", populate: { path: "id_maquette", select: "nom id_projet" } });
    if (!feedback) return res.status(404).json({ message: "Feedback introuvable" });
    res.json({ feedback, message: "Feedback transmis au designer ✅" });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/feedbacks/corrections", verifyToken, checkRole(['designer']), async (req, res) => {
  try {
    const mesMaquettes = await Maquette.find({ id_createur: req.user.id }).select("_id");
    const maquetteIds = mesMaquettes.map(m => m._id);
    const versions = await Version.find({ id_maquette: { $in: maquetteIds } }).select("_id");
    const versionIds = versions.map(v => v._id);

    const feedbacks = await Feedback.find({
      id_version: { $in: versionIds },
      type: "Refus",
      transmis_designer: true,
    })
      .populate("id_auteur", "nom")
      .populate({ path: "id_version", select: "numéro_version id_maquette", populate: { path: "id_maquette", select: "nom id_projet", populate: { path: "id_projet", select: "nom" } } })
      .sort({ date_creation: -1 });

    res.json(feedbacks);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

// ==========================================
// ROUTES VALIDATIONS
// ==========================================

apiRouter.post("/validations", verifyToken, checkRole(["client"]), async (req, res) => {
  try {
    const { maquette_id, version_id, statut, commentaires, justification } = req.body;

    if (!maquette_id || !version_id || !statut)
      return res.status(400).json({ message: "maquette_id, version_id et statut sont requis." });
    if (!["validé", "à corriger"].includes(statut))
      return res.status(400).json({ message: "statut doit être 'validé' ou 'à corriger'." });

    const version = await Version.findOne({ _id: version_id, id_maquette: maquette_id });
    if (!version) return res.status(404).json({ message: "Version introuvable." });
    const maquette = await Maquette.findById(maquette_id).populate("id_projet");
    if (!maquette) return res.status(404).json({ message: "Maquette introuvable." });

    const validation = await Validation.create({
      maquette_id, version_id,
      client_id: req.user.id,
      statut,
      justification: justification || "",
      transmis_designer: false,
      lu_designer: false,
    });

    let commentairesInseres = [];
    if (statut === "à corriger" && Array.isArray(commentaires) && commentaires.length > 0) {
      const docs = commentaires.map(c => ({
        validation_id: validation._id,
        id_element: c.id_element,
        label_element: c.label_element || "",
        commentaire_client: c.commentaire_client || "",
        commentaire_admin: "",
      }));
      commentairesInseres = await CommentaireElement.insertMany(docs);
      console.log("CommentaireElement insérés :", commentairesInseres);
      await Version.findByIdAndUpdate(version_id, { statut: "À corriger" });
      await Projet.findByIdAndUpdate(maquette.id_projet, { statut: "En révision" });
    }

    if (statut === "validé") {
      await Version.findByIdAndUpdate(version_id, { statut: "Validé" });
      await Projet.findByIdAndUpdate(maquette.id_projet, { statut: "Validé" });
      const client = await Utilisateur.findById(req.user.id).select("nom");
      const projetNom = maquette.id_projet?.nom || "Projet";
      await creerNotification({
        message: `${client?.nom || "Un client"} a validé la version ${version.numéro_version} du projet "${projetNom}"`,
        type: "validation",
        id_projet: maquette.id_projet?._id || maquette.id_projet,
        id_version: version_id,
        id_client: req.user.id,
      });
    }

    if (statut === "à corriger") {
      const client = await Utilisateur.findById(req.user.id).select("nom");
      const projetNom = maquette.id_projet?.nom || "Projet";
      await creerNotification({
        message: `${client?.nom || "Un client"} a rejeté la version ${version.numéro_version} du projet "${projetNom}" — corrections demandées`,
        type: "refus",
        id_projet: maquette.id_projet?._id || maquette.id_projet,
        id_version: version_id,
        id_client: req.user.id,
      });
    }

    res.status(201).json({
      message: statut === "validé" ? "✅ Version validée." : "📝 Rejet enregistré, en attente admin.",
      validation,
      commentaires: commentairesInseres,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur validation.", error: err.message });
  }
});

apiRouter.put("/commentaires/:id", verifyToken, checkRole(["client"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire_client } = req.body;

    if (!commentaire_client)
      return res.status(400).json({ message: "Le commentaire est requis." });

    const commentaire = await CommentaireElement.findByIdAndUpdate(id, { commentaire_client }, { new: true });
    if (!commentaire) return res.status(404).json({ message: "Commentaire introuvable." });

    res.json(commentaire);
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour commentaire.", error: err.message });
  }
});

apiRouter.get("/validations", verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.maquette_id) filter.maquette_id = req.query.maquette_id;
    if (req.query.version_id) filter.version_id = req.query.version_id;
    if (req.query.statut) filter.statut = req.query.statut;

    const validations = await Validation.find(filter)
      .populate("client_id", "nom email")
      .populate("version_id", "numéro_version statut")
      .populate({ path: "maquette_id", select: "nom id_projet", populate: { path: "id_projet", select: "nom" } })
      .sort({ date_validation: -1 });
    res.json(validations);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération validations.", error: err.message });
  }
});

apiRouter.get("/validations/maquette/:id_maquette", verifyToken, async (req, res) => {
  try {
    const versionIds = (await Version.find({
      id_maquette: req.params.id_maquette
    }).select("_id")).map(v => v._id);

    const validations = await Validation.find({
      version_id: { $in: versionIds }
    })
      .populate("client_id", "nom email")
      .populate("version_id", "numéro_version statut")
      .sort({ date_validation: -1 });

    const feedbacks = await Feedback.find({
      id_version: { $in: versionIds }
    })
      .populate("id_auteur", "nom email")
      .populate("id_version", "numéro_version")
      .sort({ date_creation: -1 });

    const commentaires = await CommentaireElement.find({
      validation_id: { $in: validations.map(v => v._id) }
    });

    res.json({ validations, feedbacks, commentaires });

  } catch (err) {
    res.status(500).json({ message: "Erreur.", error: err.message });
  }
});

apiRouter.get("/validations/a-corriger", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const validations = await Validation.find({ statut: "à corriger", transmis_designer: false })
      .populate("client_id", "nom email")
      .populate({ path: "version_id", select: "numéro_version statut id_maquette", populate: { path: "id_maquette", select: "nom id_projet", populate: { path: "id_projet", select: "nom" } } })
      .sort({ date_validation: -1 });

    const result = await Promise.all(validations.map(async v => {
      const commentaires = await CommentaireElement.find({ validation_id: v._id });
      return { ...v.toObject(), commentaires };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Erreur.", error: err.message });
  }
});

apiRouter.get("/validations/corrections-designer", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const mesMaquettes = await Maquette.find({ id_createur: req.user.id }).select("_id id_projet nom").populate("id_projet", "nom");
    const maquetteIds = mesMaquettes.map(m => m._id);
    const versionIds = (await Version.find({ id_maquette: { $in: maquetteIds } }).select("_id")).map(v => v._id);

    const corrections = await Validation.find({
      version_id: { $in: versionIds },
      statut: "à corriger",
      transmis_designer: true,
      lu_designer: false,
    })
      .populate("client_id", "nom email")
      .populate({ path: "version_id", select: "numéro_version id_maquette", populate: { path: "id_maquette", select: "nom id_projet", populate: { path: "id_projet", select: "nom" } } })
      .sort({ date_validation: -1 });

    const result = await Promise.all(corrections.map(async c => {
      const commentaires = await CommentaireElement.find({
        validation_id: c._id,
        $or: [{ commentaire_admin: { $ne: "" } }, { commentaire_client: { $ne: "" } }]
      });
      return { ...c.toObject(), commentaires };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Erreur.", error: err.message });
  }
});

apiRouter.get("/validations/:id/commentaires", verifyToken, async (req, res) => {
  try {
    const commentaires = await CommentaireElement.find({ validation_id: req.params.id });
    res.json(commentaires);
  } catch (err) {
    res.status(500).json({ message: "Erreur.", error: err.message });
  }
});

// ==========================================
// ✅ NOUVELLE ROUTE : Téléchargement rapport corrections (JSON)
// GET /validations/:id/download
// ==========================================
apiRouter.get("/validations/:id/download", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const validation = await Validation.findById(req.params.id)
      .populate("client_id", "nom email")
      .populate({
        path: "version_id",
        select: "numéro_version id_maquette date_creation",
        populate: {
          path: "id_maquette",
          select: "nom id_projet",
          populate: { path: "id_projet", select: "nom description date_début date_fin" }
        }
      });

    if (!validation) return res.status(404).json({ message: "Validation introuvable." });

    const commentaires = await CommentaireElement.find({ validation_id: validation._id });

    // Construire un rapport structuré lisible
    const rapport = {
      rapport_corrections: {
        genere_le: new Date().toLocaleDateString("fr-FR", {
          day: "2-digit", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }),
        projet: {
          nom: validation.version_id?.id_maquette?.id_projet?.nom || "—",
          description: validation.version_id?.id_maquette?.id_projet?.description || "—",
          date_début: validation.version_id?.id_maquette?.id_projet?.date_début || null,
          date_fin: validation.version_id?.id_maquette?.id_projet?.date_fin || null,
        },
        maquette: {
          nom: validation.version_id?.id_maquette?.nom || "—",
          version: `v${validation.version_id?.numéro_version || "?"}`,
        },
        demande_par: {
          nom: validation.client_id?.nom || "—",
          email: validation.client_id?.email || "—",
        },
        date_rejet: validation.date_validation
          ? new Date(validation.date_validation).toLocaleDateString("fr-FR", {
            day: "2-digit", month: "long", year: "numeric"
          })
          : "—",
        statut: validation.statut,
        nombre_corrections: commentaires.length,
        corrections: commentaires.map((c, i) => ({
          numero: i + 1,
          element: c.label_element || c.id_element || `Élément ${i + 1}`,
          id_element: c.id_element,
          remarque_client: c.commentaire_client || "(aucune)",
          note_admin: c.commentaire_admin || "(aucune)",
        })),
        instructions: commentaires.length === 0
          ? "Rejet général sans remarques spécifiques. Veuillez contacter le client pour plus de détails."
          : `Veuillez apporter les ${commentaires.length} correction(s) listées ci-dessus, puis soumettre une nouvelle version.`,
      }
    };

    const filename = `corrections_${(validation.version_id?.id_maquette?.nom || "maquette").replace(/\s+/g, "_")}_v${validation.version_id?.numéro_version || "1"}_${Date.now()}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(rapport, null, 2));
  } catch (err) {
    res.status(500).json({ message: "Erreur génération rapport.", error: err.message });
  }
});

apiRouter.patch("/commentaires-elements/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { commentaire_admin } = req.body;
    const doc = await CommentaireElement.findByIdAndUpdate(
      req.params.id,
      { commentaire_admin },
      { returnDocument: "after" }
    );
    if (!doc) return res.status(404).json({ message: "Commentaire introuvable." });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Erreur.", error: err.message });
  }
});

apiRouter.patch("/validations/:id/transmettre", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const validation = await Validation.findByIdAndUpdate(
      req.params.id,
      { transmis_designer: true, date_transmission: new Date() },
      { returnDocument: "after" }
    )
      .populate("client_id", "nom email")
      .populate({ path: "version_id", select: "numéro_version id_maquette", populate: { path: "id_maquette", select: "nom id_projet id_createur", populate: { path: "id_projet", select: "nom" } } });

    if (!validation) return res.status(404).json({ message: "Validation introuvable." });

    const clientNom = validation.client_id?.nom || "Un client";
    const projetNom = validation.version_id?.id_maquette?.id_projet?.nom || "Projet";
    const versionNum = validation.version_id?.numéro_version || "?";
    const designerId = validation.version_id?.id_maquette?.id_createur || null;

    await creerNotification({
      message: `⚠️ ${clientNom} a rejeté la version ${versionNum} du projet "${projetNom}" — des corrections sont à apporter`,
      type: "correction",
      id_projet: validation.version_id?.id_maquette?.id_projet?._id || null,
      id_version: validation.version_id?._id || null,
      id_client: validation.client_id?._id || null,
      id_destinataire: designerId,
    });

    res.json({ validation, message: "✅ Réclamation transmise au designer." });
  } catch (err) {
    res.status(500).json({ message: "Erreur.", error: err.message });
  }
});

const envoyerEmailCorrectionLue = async (clientEmail, clientNom, projetNom, versionNum, commentaires) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const commentairesHtml = commentaires && commentaires.length > 0
    ? `<div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #ff9800;">
         <h3 style="margin-top: 0;">Commentaires de correction :</h3>
         <ul>
           ${commentaires.map(c => `<li><strong>${c.label_element || 'Élément'}</strong>: ${c.commentaire_client || c.commentaire_admin || 'Aucun commentaire'}</li>`).join('')}
         </ul>
       </div>`
    : '';

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: clientEmail,
    subject: `Le designer a pris en charge vos corrections - ${projetNom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Bonjour ${clientNom},</h2>
        
        <p>Le designer a bien <strong style="color: #4CAF50;">pris en charge et corrigé</strong> vos demandes de correction pour :</p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Projet :</strong> ${projetNom}</p>
          <p style="margin: 10px 0 0 0;"><strong>Version :</strong> ${versionNum}</p>
        </div>
        ${commentairesHtml}
        <p>Le designer va maintenant procéder aux corrections demandées. Vous serez notifié dès qu'une nouvelle version sera disponible.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Cet email est un message automatique. Merci de ne pas y répondre directement.</p>
      </div>
    `,
  });
};

apiRouter.patch("/validations/:id/lu-designer", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const validation = await Validation.findById(req.params.id)
      .populate("client_id", "nom email")
      .populate({
        path: "version_id",
        select: "numéro_version id_maquette statut",
        populate: {
          path: "id_maquette",
          select: "nom id_projet",
          populate: { path: "id_projet", select: "nom" }
        }
      });

    if (!validation) return res.status(404).json({ message: "Validation introuvable." });

    if (validation.lu_designer) {
      return res.status(400).json({ message: "Cette correction a déjà été marquée comme lue." });
    }

    const commentaires = await CommentaireElement.find({ validation_id: validation._id });

    validation.lu_designer = true;
    await validation.save();

    console.log(`✅ Validation ${validation} marked as read by designer.`);
    if (validation.version_id && validation.version_id.statut === "À corriger") {
      await Version.findByIdAndUpdate(validation.version_id._id, { statut: "Traité" });
      console.log(`✅ Version ${validation.version_id.numéro_version} status updated to "Traité"`);
    }

    // Send email to client
    try {
      if (validation.client_id && validation.client_id.email) {
        await envoyerEmailCorrectionLue(
          validation.client_id.email,
          validation.client_id.nom || "Client",
          validation.version_id?.id_maquette?.id_projet?.nom || "Projet",
          validation.version_id?.numéro_version || "?",
          commentaires
        );
        console.log(`✅ Email de notification envoyé à ${validation.client_id.email}`);
      }
    } catch (emailError) {
      console.error("❌ Erreur lors de l'envoi de l'email:", emailError.message);
    }

    try {
      await creerNotification({
        message: `Le designer a pris en charge les corrections pour la version ${validation.version_id?.numéro_version || ""} du projet "${validation.version_id?.id_maquette?.id_projet?.nom || ""}"`,
        type: "correction",
        id_projet: validation.version_id?.id_maquette?.id_projet?._id || null,
        id_version: validation.version_id?._id || null,
        id_destinataire: validation.client_id?._id || null,
      });
    } catch (notifError) {
      console.error("❌ Erreur création notification:", notifError.message);
    }

    res.json({
      message: "✅ Correction marquée comme lue. Le client a été notifié par email.",
      validation
    });
  } catch (err) {
    console.error("Erreur dans lu-designer:", err);
    res.status(500).json({ message: "Erreur lors du traitement.", error: err.message });
  }
});

// ==========================================
// ROUTES RAPPORTS QUOTIDIENS
// ==========================================

apiRouter.post("/rapport", verifyToken, async (req, res) => {
  try {
    const { date, id_projet, travail_effectué, tâches_restantes, blocages } = req.body;
    const rapport = await RapportQuotidien.create({
      date, travail_effectué, tâches_restantes, blocages,
      id_projet, id_designer: req.user.id,
    });
    if (rapport) return res.status(200).json({ msg: "Rapport écrit avec succès", rapport });
    return res.status(400).json({ msg: "Rapport non écrit" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.get("/rapport", verifyToken, async (req, res) => {
  try {
    const rapports = await RapportQuotidien.find().populate("id_designer id_projet");
    if (rapports) return res.status(200).json({ msg: "Data fetched successfully", rapports });
    return res.status(400).json({ msg: "Fetch failed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.get("/rapport/:id", verifyToken, async (req, res) => {
  try {
    const rapport = await RapportQuotidien.findById(req.params.id);
    if (rapport) return res.status(200).json({ msg: "Rapport fetched", rapport });
    return res.status(400).json({ msg: "Fetch failed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.put("/rapport/:id", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const updated = await RapportQuotidien.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (updated) return res.status(200).json({ msg: "Updated successfully", rapport: updated });
    return res.status(400).json({ msg: "Update failed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.delete("/rapport/:id", verifyToken, async (req, res) => {
  try {
    await RapportQuotidien.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "Deleted successfully" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// ROUTES NOTIFICATIONS (admin)
// ==========================================

apiRouter.get("/notifications", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .populate("id_client", "nom email")
      .populate("id_projet", "nom");
    res.status(200).json(notifications);
  } catch (err) { res.status(500).json({ message: "Erreur notifications", error: err.message }); }
});

apiRouter.get("/notifications/count", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const count = await Notification.countDocuments({ lu: false });
    res.status(200).json({ unread: count });
  } catch (err) { res.status(500).json({ message: "Erreur count", error: err.message }); }
});

apiRouter.patch("/notifications/mark-all-read", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    await Notification.updateMany({ lu: false }, { lu: true });
    res.status(200).json({ message: "Toutes les notifications marquées comme lues." });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.patch("/notifications/:id/read", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { lu: true }, { returnDocument: "after" });
    if (!notif) return res.status(404).json({ message: "Notification introuvable." });
    res.status(200).json({ notification: notif });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.delete("/notifications/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.id);
    if (!notif) return res.status(404).json({ message: "Notification introuvable." });
    res.status(200).json({ message: "Supprimée." });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

// ==========================================
// ROUTES NOTIFICATIONS DESIGNER
// ==========================================

apiRouter.get("/notifications/designer", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const notifs = await Notification.find({
      id_destinataire: req.user.id,
      lu: false,
    })
      .sort({ createdAt: -1 })
      .populate("id_client", "nom email")
      .populate("id_projet", "nom")
      .populate("id_version", "numéro_version");
    res.status(200).json(notifs);
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.get("/notifications/designer/count", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const count = await Notification.countDocuments({ id_destinataire: req.user.id, lu: false });
    res.status(200).json({ unread: count });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

apiRouter.patch("/notifications/designer/:id/read", verifyToken, checkRole(["designer"]), async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, id_destinataire: req.user.id },
      { lu: true },
      { returnDocument: "after" }
    );
    if (!notif) return res.status(404).json({ message: "Introuvable." });
    res.status(200).json({ notification: notif });
  } catch (err) { res.status(500).json({ message: "Erreur", error: err.message }); }
});

app.use("/Api_B2B", apiRouter);

// ==========================================
// SCHÉMAS CHAT (MongoDB)
// ==========================================
const conversationSchema = new mongoose.Schema({
  nom: { type: String }, // Pour les groupes
  isGroup: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur" }],
  dernier_message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  createur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur" },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  id_conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  id_expediteur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  texte: { type: String },
  type: { type: String, enum: ["text", "image", "file"], default: "text" },
  fileUrl: { type: String },
  fileName: { type: String },
  lu: { type: Boolean, default: false },
  modifie: { type: Boolean, default: false }, // NOUVEAU
  supprime: { type: Boolean, default: false }, // NOUVEAU
}, { timestamps: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
const Message = mongoose.model("Message", messageSchema);

// ==========================================
// CONFIGURATION SOCKET.IO (Temps Réel)
// ==========================================
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const usersOnline = new Map(); // userId -> socketId

// 3. LOGIQUE SOCKET.IO AMÉLIORÉE
// Serveur Node.js
io.on("connection", (socket) => {
  
  socket.on("setup", (userId) => {
    socket.join(userId);
    console.log("User joined his own room:", userId);
  });

  socket.on("join_chat", (room) => {
    socket.join(room);
    console.log("User joined conversation room:", room);
  });

  socket.on("new_message", (newMessageReceived) => {
    // On récupère la conversation
    const chat = newMessageReceived.id_conversation;
    if (!chat.participants) return console.log("Chat participants not defined");

    // On envoie le message à tous les participants de la conversation
    chat.participants.forEach((user) => {
      const pId = user._id || user; // Gère si c'est un objet ou un ID
      
      // On n'envoie pas à l'expéditeur (optionnel, selon votre logique front)
      // if (pId === newMessageReceived.id_expediteur._id) return;

      // Envoyer à la room personnelle de chaque participant
      socket.in(pId.toString()).emit("message_received", newMessageReceived);
    });
  });

  // Pour le statut "En train d'écrire"
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop_typing", (room) => socket.in(room).emit("stop_typing"));
});





// ==========================================
// ROUTES API CHAT
// ==========================================
const chatRouter = express.Router();

// 4. NOUVELLES ROUTES API
chatRouter.put("/messages/:msgId", verifyToken, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.msgId, 
      { texte: req.body.texte, modifie: true }, 
      { new: true }
    ).populate("id_expediteur", "nom rôle").populate("id_conversation");
    res.json(msg);
  } catch (err) { res.status(500).json(err); }
});

chatRouter.delete("/messages/:msgId", verifyToken, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.msgId, 
      { texte: "Message supprimé", supprime: true, type: "text", fileUrl: null }, 
      { new: true }
    ).populate("id_expediteur", "nom rôle").populate("id_conversation");
    res.json(msg);
  } catch (err) { res.status(500).json(err); }
});

// 3. API : Route pour marquer comme lu
chatRouter.patch("/read/:convId", verifyToken, async (req, res) => {
  await Message.updateMany(
    { id_conversation: req.params.convId, id_expediteur: { $ne: req.user.id } },
    { $set: { lu: true } }
  );
  res.json({ success: true });
});

// API : Récupérer les contacts autorisés selon le rôle
chatRouter.get("/contacts", verifyToken, async (req, res) => {
  try {
    const monRole = req.user.rôle;
    let filtre = { _id: { $ne: req.user.id } }; // Ne pas s'inclure soi-même

    if (monRole === "client") {
      // LE CLIENT NE DOIT COMMUNIQUER QU'AVEC ADMIN
      filtre.rôle = "admin";
    } 
    else if (monRole === "designer") {
      // LE DESIGNER NE DOIT COMMUNIQUER QU'AVEC ADMIN ET DESIGNER
      filtre.rôle = { $in: ["admin", "designer"] };
    }
    // L'ADMIN peut voir tout le monde (donc pas de filtre supplémentaire)

    const users = await Utilisateur.find(filtre).select("nom email rôle");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Récupérer toutes les conversations de l'utilisateur
chatRouter.get("/conversations", verifyToken, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user.id })
      .populate("participants", "nom email rôle")
      .populate("dernier_message")
      .sort({ updatedAt: -1 })
      .lean(); // Utiliser lean pour pouvoir modifier l'objet

    // Pour chaque conversation, compter les messages non lus
    const enhancedConvs = await Promise.all(convs.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        id_conversation: c._id,
        id_expediteur: { $ne: req.user.id },
        lu: false
      });
      return { ...c, unreadCount };
    }));

    res.json(enhancedConvs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Créer ou récupérer une conversation privée
chatRouter.post("/privee", verifyToken, async (req, res) => {
  try {
    const { targetId } = req.body;
    const targetUser = await Utilisateur.findById(targetId);

    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé." });

    // --- VÉRIFICATION DES DROITS ---
    if (req.user.rôle === "client" && targetUser.rôle !== "admin") {
      return res.status(403).json({ message: "Action interdite : vous ne pouvez contacter que l'administrateur." });
    }
    if (req.user.rôle === "designer" && targetUser.rôle === "client") {
      return res.status(403).json({ message: "Action interdite : les designers ne peuvent pas contacter les clients." });
    }

    // --- LOGIQUE EXISTANTE ---
    let conv = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user.id, targetId] }
    }).populate("participants", "nom email rôle");

    if (!conv) {
      conv = await Conversation.create({ participants: [req.user.id, targetId], isGroup: false });
      conv = await Conversation.findById(conv._id).populate("participants", "nom email rôle");
    }
    res.json(conv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Récupérer les messages d'une conversation
chatRouter.get("/messages/:convId", verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({ id_conversation: req.params.convId })
      .populate("id_expediteur", "nom rôle")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Envoyer un message
chatRouter.post("/messages", verifyToken, async (req, res) => {
  try {
    // On récupère toutes les infos du body, pas juste le texte
    const { id_conversation, texte, type, fileUrl, fileName } = req.body;
    
    let msg = await Message.create({ 
      id_conversation, 
      texte, 
      id_expediteur: req.user.id,
      type: type || "text",
      fileUrl: fileUrl || null,
      fileName: fileName || null
    });

    await Conversation.findByIdAndUpdate(id_conversation, { dernier_message: msg._id });
    msg = await msg.populate("id_expediteur", "nom rôle");
    
    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.use("/Api_B2B/chat", chatRouter);


// ==========================================
// INITIALISATION
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