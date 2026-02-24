const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connecté");
  } catch (error) {
    console.error("❌ Erreur MongoDB :", error.message);
    process.exit(1);
  }
};

// Lancer la connexion
connectDB();

// Route test
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});