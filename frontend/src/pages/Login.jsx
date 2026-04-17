import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";

import editorPreview from "../assets/landing/interface-2.png";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (email !== "admin" && !email.toLowerCase().endsWith("@gmail.com")) {
      setError("L'adresse email doit obligatoirement etre un compte @gmail.com");
      return;
    }

    setLoading(true);

    try {
      const { data } = await API.post("/auth/login", { email, mot_de_passe: password });
      setIsSuccess(true);

      setTimeout(() => {
        login(data.user, data.token);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Identifiants invalides ou erreur serveur.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-login"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="auth-login-shell">
        <section className="auth-login-showcase">
          <div className="auth-login-showcase-glow auth-login-showcase-glow--one" />
          <div className="auth-login-showcase-glow auth-login-showcase-glow--two" />

          <Link to="/" className="auth-login-back">
            <ArrowLeft size={18} />
            Retour a l'accueil
          </Link>

          <motion.div
            className="auth-login-showcase-inner"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            <div className="auth-login-brand">DevPortal.</div>

            <span className="auth-login-badge auth-login-badge--dark">
              <Sparkles size={14} />
              ESPACE SECURISE
            </span>

            <h1>Connecte-toi.</h1>
            <p className="auth-login-showcase-text">Reprends ton projet en quelques secondes.</p>

            <div className="auth-login-preview">
              <div className="auth-login-preview-screen">
                <img src={editorPreview} alt="Apercu de l'editeur DevPortal" />
              </div>
            </div>
          </motion.div>
        </section>

        <section className="auth-login-pane">
          <div className="auth-login-pane-circle auth-login-pane-circle--one" />
          <div className="auth-login-pane-circle auth-login-pane-circle--two" />

          <Link to="/" className="auth-login-back auth-login-back-mobile">
            <ArrowLeft size={18} />
            Retour a l'accueil
          </Link>

          <motion.div
            className="auth-login-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  className="auth-login-success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="auth-login-success-icon"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  >
                    <CheckCircle2 size={46} />
                  </motion.div>
                  <h2>Connexion reussie</h2>
                  <p>Redirection vers ton espace en cours...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="auth-login-card-head">
              <span className="auth-login-badge">CONNEXION PLATEFORME</span>
              <h2>Bon retour</h2>
            </div>

            {error && (
              <motion.div
                className="auth-login-error"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="auth-login-form">
              <label className="auth-login-label" htmlFor="login-email">
                Adresse email
              </label>
              <div className="auth-login-field">
                <Mail size={18} />
                <input
                  id="login-email"
                  type="text"
                  placeholder="admin ou compte@gmail.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <label className="auth-login-label" htmlFor="login-password">
                Mot de passe
              </label>
              <div className="auth-login-field">
                <Lock size={18} />
                <input
                  id="login-password"
                  type="password"
                  placeholder="Saisissez votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-login-submit" disabled={loading || isSuccess}>
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>

            <div className="auth-login-help">
              <a href="tel:+212720278838">Contacter le support</a>
            </div>
          </motion.div>
        </section>
      </div>
    </motion.div>
  );
};

export default Login;
