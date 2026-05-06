import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  FileText,
  Grid3x3,
  Layers,
  Layout,
  MessageCircle,
  MessageSquare,
  PenTool,

  Phone,
  Send,
  Sparkles,
  X,
  Eye,
} from "lucide-react";


import dashboardPreview from "../assets/landing/dashboard_preview.png";
import editorPreview from "../assets/landing/editor_preview.png";
import portalPreview from "../assets/landing/portal_preview.png";
import "./LandingPage.css";


const services = [
  {
    id: "01",
    title: "Éditeur Visuel Intelligent",
    description: "Composez vos interfaces avec un canvas haute performance supportant le drag-and-drop de composants complexes.",
    icon: Layout,
    color: "#3B82F6"
  },
  {
    id: "02",
    title: "Bibliothèque de Composants",
    description: "Accédez à des centaines d'éléments UI réutilisables, des graphiques aux formulaires, prêts pour la production.",
    icon: Grid3x3,
    color: "#6366F1"
  },
  {
    id: "03",
    title: "Gestion des Versions",
    description: "Historique complet de vos designs. Comparez les itérations et restaurez n'importe quelle étape en un clic.",
    icon: Layers,
    color: "#8B5CF6"
  },
  {
    id: "04",
    title: "Collaboration & Feedback",
    description: "Centralisez les retours clients directement sur le design pour éliminer les malentendus et accélérer la validation.",
    icon: MessageSquare,
    color: "#EC4899"
  },
  {
    id: "05",
    title: "Dashboards Rôle-Specifiques",
    description: "Vues personnalisées pour les admins, designers et clients. Chaque utilisateur accède aux outils dont il a besoin.",
    icon: Briefcase,
    color: "#F59E0B"
  },
  {
    id: "06",
    title: "Rapports PDF & Exports",
    description: "Générez des rapports d'activité et des dossiers de corrections professionnels d'un seul clic.",
    icon: FileText,
    color: "#10B981"
  },
];


const featureCards = [
  {
    icon: Layout,
    title: "Editeur visuel complet",
    desc: "",
  },
  {
    icon: Layers,
    title: "Versions et validation",
    desc: "",
  },
  {
    icon: MessageCircle,
    title: "Feedback client cible",
    desc: "",
  },
  {
    icon: BarChart3,
    title: "Rapports et historique",
    desc: "",
  },
];

const previews = [
  {
    image: dashboardPreview,
    title: "Pilotage & Analytics",
    text: "Une vue 360° sur l'avancement de vos projets design.",
    details: "Suivez les KPIs, les budgets et le planning en temps réel avec des graphiques interactifs et des indicateurs de performance clés.",
    tags: ["Insights", "Projets", "KPIs"],
  },
  {
    image: editorPreview,
    title: "Studio de Création",
    text: "Le moteur de votre créativité, sans les frictions techniques.",
    details: "Un éditeur visuel puissant supportant les composants interactifs, la persistence d'états et une collaboration fluide entre designers.",
    tags: ["Canvas", "Interface", "UX"],
  },
  {
    image: portalPreview,
    title: "Validation Client 2.0",
    text: "Dites adieu aux mails interminables de feedback.",
    details: "Un espace collaboratif où les clients déposent leurs annotations directement sur les maquettes pour une itération instantanée.",
    tags: ["Client", "Feedback", "Validation"],
  },
];


const workflowSteps = [
  {
    icon: Send,
    title: "Demande de projet",
    text: "",
  },
  {
    icon: PenTool,
    title: "Creation de maquette",
    text: "",
  },
  {
    icon: CheckCircle,
    title: "Validation et corrections",
    text: "",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};

const Modal = ({ isOpen, onClose, title, image, tags }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="landing-modal-overlay" onClick={onClose}>
      <div className="landing-modal" onClick={(event) => event.stopPropagation()}>
        <button className="landing-modal-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
        <img src={image} alt={title} className="landing-modal-image" />
        <h3>{title}</h3>
        <div className="landing-tags">
          {tags.map((tag) => (
            <span key={tag} className="landing-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const SpotlightSection = () => {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(320);
  const mouseY = useMotionValue(220);
  const springX = useSpring(mouseX, { stiffness: 140, damping: 24 });
  const springY = useSpring(mouseY, { stiffness: 140, damping: 24 });
  const spotlight = useMotionTemplate`radial-gradient(540px circle at ${springX}px ${springY}px, rgba(0, 102, 255, 0.20), transparent 78%)`;

  const handleMouseMove = (event) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(event.clientX - left);
    mouseY.set(event.clientY - top);
  };

  return (
    <section ref={containerRef} onMouseMove={handleMouseMove} className="landing-spotlight">
      <motion.div className="landing-spotlight-glow" style={{ background: spotlight }} />
      <div className="landing-wrap landing-spotlight-content">
        <div className="landing-section-header landing-section-header-light">
          <span className="landing-badge landing-badge-dark">FONCTIONNALITES REELLES</span>
          <h2>Des modules deja relies a ton application</h2>
        </div>

        <div className="landing-feature-grid">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.title}
              className="landing-feature-card"
              {...fadeUp}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              whileHover={{ y: -8 }}
            >
              <div className="landing-feature-icon">
                <card.icon size={28} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-page">
      <a
        href="https://wa.me/212720278838"
        target="_blank"
        rel="noopener noreferrer"
        className="landing-whatsapp"
        aria-label="Contacter sur WhatsApp"
      >
        <MessageCircle size={30} fill="white" />
      </a>

      <header className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
        <div className="landing-wrap landing-nav-row">
          <Link to="/" className="landing-brand">
            DevPortal<span>.</span>
          </Link>

          <nav className="landing-nav-links">
            {["Services", "Modules", "Workflow", "Contact"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="landing-nav-link">
                {item}
                <motion.span 
                  className="landing-nav-indicator"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </a>
            ))}
          </nav>

          <div className="landing-nav-actions">
            <Link to="/login" className="landing-btn landing-btn-primary">
              Connexion
            </Link>
          </div>
        </div>
      </header>


      <main>
        <section className="landing-hero">
          <div className="landing-wrap landing-hero-grid">
            <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="landing-badge">
                <Sparkles size={15} />
                PLATEFORME B2B DE DESIGN
              </span>

              <h1>
                Pilote tes projets design avec un vrai <span>workflow app</span>.
              </h1>

              <div className="landing-hero-actions">
                <Link to="/login" className="landing-btn landing-btn-primary">
                  Acceder a la plateforme <ArrowRight size={18} />
                </Link>
                <a href="#services" className="landing-btn landing-btn-outline">
                  Voir les modules
                </a>
              </div>
            </motion.div>

            <motion.div
              className="landing-hero-visual"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.15 }}
            >
              <div className="landing-hero-card">
                <img src={editorPreview} alt="Apercu de l'editeur DevPortal" />
              </div>
            </motion.div>
          </div>
        </section>

        <section id="services" className="landing-section landing-section-alt">
          <div className="landing-wrap">
            <div className="landing-section-header">
              <span className="landing-badge">NOTRE EXPERTISE</span>
              <h2>Une suite complète d'outils pour votre workflow B2B</h2>
              <p>Oubliez la dispersion des outils. DevPortal réunit tout ce dont vous avez besoin pour concevoir et valider vos projets digitaux.</p>
            </div>

            <div className="landing-services-grid">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  className="landing-service-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ 
                    y: -10,
                    boxShadow: `0 30px 60px rgba(0, 0, 0, 0.08), 0 10px 20px -5px ${service.color}20` 
                  }}
                >
                  <div className="landing-service-num">{service.id}</div>
                  <div 
                    className="landing-service-icon"
                    style={{ background: `${service.color}15`, color: service.color }}
                  >
                    <service.icon size={26} strokeWidth={2.5} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <motion.div 
                    className="landing-service-accent"
                    style={{ backgroundColor: service.color }}
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>


        <section id="modules" className="landing-section">
          <div className="landing-wrap">
            <div className="landing-section-header">
              <span className="landing-badge">APERCUS PRODUIT</span>
              <h2>Des ecrans qui montrent le produit, pas une promesse vide</h2>
            </div>

            <div className="landing-preview-grid">
              {previews.map((preview, index) => (
                <motion.div
                  key={preview.title}
                  className="landing-preview-card"
                  onClick={() => setSelectedPreview(preview)}
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.15,
                    ease: [0.22, 1, 0.36, 1] 
                  }}
                  whileHover={{ 
                    y: -12,
                    boxShadow: "0 40px 80px rgba(9, 37, 84, 0.18)" 
                  }}
                >
                  <div className="landing-preview-media">
                    <div className="landing-preview-overlay">
                      <div className="landing-preview-icon">
                        <Eye size={24} />
                      </div>
                    </div>
                    <motion.img 
                      src={preview.image} 
                      alt={preview.title} 
                      whileHover={{ scale: 1.05 }} 
                      transition={{ duration: 0.4 }} 
                    />
                  </div>
                  <div className="landing-preview-body">
                    <div className="landing-preview-header">
                      <h3>{preview.title}</h3>
                      <p>{preview.text}</p>
                    </div>
                    <div className="landing-tags">
                      {preview.tags.map((tag) => (
                        <span key={tag} className="landing-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="landing-preview-link">
                      Découvrir l'interface <ArrowRight size={16} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <SpotlightSection />

        <section id="workflow" className="landing-section landing-section-alt">
          <div className="landing-wrap">
            <div className="landing-section-header">
              <span className="landing-badge">WORKFLOW B2B</span>
              <h2>Un cycle clair entre demande, creation, retour et validation</h2>
            </div>

            <div className="landing-workflow-grid">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  className="landing-workflow-card"
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                >
                  <div className="landing-workflow-icon">
                    <step.icon size={28} />
                  </div>
                  <h3>{step.title}</h3>
                  {step.text ? <p>{step.text}</p> : null}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-wrap" id="contact">
          <motion.div className="landing-cta" {...fadeUp} transition={{ duration: 0.5 }}>
            <h2>Montre ce que ton app fait vraiment</h2>
            <div className="landing-cta-actions">
              <Link to="/login" className="landing-btn landing-btn-primary">
                Commencer maintenant
              </Link>
              <a href="tel:+212720278838" className="landing-btn landing-btn-outline landing-btn-light">
                <Phone size={18} />
                Appel gratuit
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap">
          <div className="landing-footer-grid">
            <div>
              <Link to="/" className="landing-footer-logo">
                DevPortal<span>.</span>
              </Link>
            </div>

            <div>
              <h4>Navigation</h4>
              <div className="landing-footer-links">
                <a href="#services">Services</a>
                <a href="#modules">Modules</a>
                <a href="#workflow">Workflow</a>
                <a href="#contact">Contact</a>
              </div>
            </div>

            <div>
              <h4>Contact</h4>
              <div className="landing-footer-links">
                <a href="https://wa.me/212720278838" target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <a href="tel:+212720278838">+212 720 278 838</a>
                <a href="/login">Acces plateforme</a>
              </div>
            </div>
          </div>

          <div className="landing-footer-bottom">
            Copyright 2026 DevPortal.
          </div>
        </div>
      </footer>

      <Modal
        isOpen={Boolean(selectedPreview)}
        onClose={() => setSelectedPreview(null)}
        {...(selectedPreview || previews[0])}
      />
    </div>
  );
};

export default LandingPage;
