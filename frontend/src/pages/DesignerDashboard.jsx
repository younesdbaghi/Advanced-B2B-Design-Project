import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Palette, Calendar, CheckCircle, Clock, XCircle, Eye,
  BellRing, Plus, X, Upload, Loader, Image as ImageIcon,
  Edit3, Trash2, Notebook, LayoutGrid, List, Download,
  ChevronDown, ChevronRight, AlertTriangle, FileText,
  ArrowRight, Wrench, User, MessageSquare
} from "lucide-react";
import jsPDF from "jspdf";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

const DesignerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [maquettes, setMaquettes] = useState([]);
  const [projets, setProjets] = useState([]);
  const [loadingMaquettes, setLoadingMaquettes] = useState(true);

  const [affectations, setAffectations] = useState([]);
  const [loadingAff, setLoadingAff] = useState(true);
  const [marking, setMarking] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState("grid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nom: "", description: "", id_projet: "", image_fond: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ _id: "", nom: "", description: "", id_projet: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  const [corrections, setCorrections] = useState([]);
  const [loadingCorrections, setLoadingCorrections] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedVersions, setExpandedVersions] = useState({});
  const [downloading, setDownloading] = useState(null);
  const [markingDone, setMarkingDone] = useState(null);

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [resMaq, resPrj, resAff] = await Promise.all([
        API.get("/maquettes"),
        API.get("/projets"),
        API.get("/affectations/mes-projets"),
      ]);

      const maqData = Array.isArray(resMaq.data) ? resMaq.data : Array.isArray(resMaq.data?.maquettes) ? resMaq.data.maquettes : Array.isArray(resMaq.data?.data) ? resMaq.data.data : [];
      const prjData = Array.isArray(resPrj.data) ? resPrj.data : Array.isArray(resPrj.data?.projets) ? resPrj.data.projets : Array.isArray(resPrj.data?.data) ? resPrj.data.data : [];
      const affData = Array.isArray(resAff.data) ? resAff.data : Array.isArray(resAff.data?.affectations) ? resAff.data.affectations : Array.isArray(resAff.data?.data) ? resAff.data.data : [];

      setMaquettes(maqData);
      setProjets(prjData);
      setAffectations(affData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMaquettes(false);
      setLoadingAff(false);
    }
  };

  const fetchCorrections = async () => {
    try {
      const { data } = await API.get("/validations/corrections-designer");
      setCorrections(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoadingCorrections(false); }
  };

  const handleMarquerLuCorrection = async (correctionId) => {
    setMarkingDone(correctionId);
    try {
      await API.patch(`/validations/${correctionId}/lu-designer`);
      setCorrections(prev => prev.filter(c => c._id !== correctionId));
    } catch (e) { console.error(e); }
    finally { setMarkingDone(null); }
  };

  // ─── PROFESSIONAL PDF REPORT GENERATOR (RETOURNE BLOB) ───────────────────────
  const generateProfessionalPDFBlob = (correction, maquetteName, versionNum, projectName) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    
    // Colors - Modern Professional Palette
    const primaryColor = [67, 56, 202]; // #4338CA - Deep Indigo
    const secondaryColor = [79, 70, 229]; // #4F46E5 - Indigo
    const accentColor = [220, 38, 38]; // #DC2626 - Red for corrections
    const darkText = [17, 24, 39]; // #111827 - Gray-900
    const mediumText = [75, 85, 99]; // #4B5563 - Gray-600
    const lightText = [156, 163, 175]; // #9CA3AF - Gray-400
    const bgLight = [249, 250, 251]; // #F9FAFB
    const successColor = [16, 185, 129]; // #10B981 - Emerald

    // Helper function to add line break
    const addLineBreak = (height = 3) => {
      yPosition += height;
    };

    // ──── HEADER SECTION WITH GRADIENT EFFECT ────
    // Header background bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 55, "F");
    
    // Decorative circle
    doc.setFillColor(...secondaryColor);
    doc.circle(pageWidth - 25, 25, 15, "F");
    doc.setFillColor(...primaryColor);
    doc.circle(pageWidth - 35, 30, 8, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text("RAPPORT DE", 15, 25);
    doc.text("CORRECTIONS", 15, 35);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255, 0.8);
    doc.text("Design Review Report", 15, 44);

    // Right side info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const today = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
    doc.text(`Date: ${today}`, pageWidth - 45, 20);
    doc.text(`Version: v${versionNum}`, pageWidth - 45, 27);
    doc.text(`Designer: ${user?.nom || 'Design Studio'}`, pageWidth - 45, 34);

    yPosition = 65;

    // ──── PROJECT INFO CARD ────
    // Card background
    doc.setFillColor(...bgLight);
    doc.roundedRect(15, yPosition, pageWidth - 30, 45, 5, 5, "F");
    
    // Card border accent
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPosition, pageWidth - 30, 45, 5, 5);
    
    // Project icon and title
    doc.setFillColor(...primaryColor);
    doc.circle(30, yPosition + 12, 4, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.text("PROJET", 40, yPosition + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...darkText);
    doc.text(projectName || "Sans projet", 40, yPosition + 20);
    
    // Design info
    doc.setFillColor(...secondaryColor);
    doc.circle(30, yPosition + 32, 4, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.text("MAQUETTE", 40, yPosition + 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...darkText);
    doc.text(maquetteName, 40, yPosition + 40);
    
    yPosition += 55;

    // ──── CLIENT INFO BOX ────
    // Background box with border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPosition, pageWidth - 30, 35, 5, 5, "F");
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(1);
    doc.roundedRect(15, yPosition, pageWidth - 30, 35, 5, 5);

    // Client label with icon
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text("👤 FEEDBACK CLIENT", 25, yPosition + 10);

    const client = correction.client_id || {};
    
    // Client name with badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...darkText);
    doc.text(client?.nom || "Client", 25, yPosition + 22);
    
    // Status badge
    doc.setFillColor(...successColor);
    doc.roundedRect(25 + doc.getTextWidth(client?.nom || "Client") + 10, yPosition + 16, 30, 8, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("ACTIF", 25 + doc.getTextWidth(client?.nom || "Client") + 15, yPosition + 22);

    // Client email
    if (client?.email) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mediumText);
      doc.text(client.email, pageWidth - 45, yPosition + 22);
    }

    yPosition += 45;

    // ──── CORRECTIONS SECTION ────
    // Section header
    doc.setFillColor(...accentColor);
    doc.rect(15, yPosition, 4, 20, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...accentColor);
    doc.text("POINTS À CORRIGER", 24, yPosition + 14);
    
    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...mediumText);
    doc.text("Veuillez apporter les modifications suivantes", 24, yPosition + 22);

    yPosition += 35;

    // ──── CORRECTIONS LIST ────
    const commentaires = (correction.commentaires || []).filter(
      cm => cm.commentaire_admin || cm.commentaire_client
    );

    if (commentaires.length === 0) {
      // Empty state card
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(15, yPosition, pageWidth - 30, 35, 5, 5, "F");
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, yPosition, pageWidth - 30, 35, 5, 5);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...accentColor);
      doc.text("⚠️ Rejet global", 30, yPosition + 15);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mediumText);
      doc.text("Veuillez contacter le client pour plus de détails", 30, yPosition + 25);
      
      yPosition += 45;
    } else {
      commentaires.forEach((cm, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 15;
        }

        // Correction card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, yPosition, pageWidth - 30, 35, 4, 4, "F");
        
        // Left accent bar
        doc.setFillColor(...accentColor);
        doc.rect(15, yPosition, 5, 35, "F");
        
        // Priority badge
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(25, yPosition + 5, 55, 8, 4, 4, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...accentColor);
        doc.text(`ÉLÉMENT ${index + 1}`, 30, yPosition + 11);
        
        // Element label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...darkText);
        doc.text(cm.label_element || cm.id_element || `Élément ${index + 1}`, 25, yPosition + 22);
        
        // Comment text with wrapping
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...mediumText);
        
        const commentText = cm.commentaire_admin || cm.commentaire_client;
        const wrappedText = doc.splitTextToSize(commentText, pageWidth - 55);
        
        // Calculate height needed
        const textHeight = wrappedText.length * 4.5;
        
        // Adjust card height based on content
        if (textHeight > 20) {
          // Redraw card with new height
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(15, yPosition, pageWidth - 30, textHeight + 20, 4, 4, "F");
          doc.setFillColor(...accentColor);
          doc.rect(15, yPosition, 5, textHeight + 20, "F");
        }
        
        doc.text(wrappedText, 25, yPosition + 30);
        
        yPosition += (textHeight + 25);
        
        // Separator line between corrections
        if (index < commentaires.length - 1) {
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.3);
          doc.line(25, yPosition - 5, pageWidth - 25, yPosition - 5);
          yPosition += 5;
        }
      });

      yPosition += 10;
    }

    // ──── ACTION REQUIRED SECTION ────
    if (yPosition < pageHeight - 70) {
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(15, yPosition, pageWidth - 30, 45, 5, 5, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text("📋 PROCHAINES ÉTAPES", 25, yPosition + 12);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mediumText);
      doc.text("1. Appliquez les modifications suggérées avec attention", 25, yPosition + 24);
      doc.text("2. Révisez les détails techniques et visuels", 25, yPosition + 32);
      doc.text("3. Soumettez la version corrigée pour validation", 25, yPosition + 40);
      
      yPosition += 55;
    }

    // ──── FOOTER ────
    // Add footer on last page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
      
      // Footer text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...lightText);
      doc.text(`Rapport généré le ${today} • Document confidentiel`, 15, pageHeight - 8);
      doc.text(`Page ${i} / ${totalPages}`, pageWidth - 25, pageHeight - 8);
      
      // Company info
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text("Design Studio Pro - Service de corrections qualité", pageWidth / 2, pageHeight - 8, { align: "center" });
    }

    // ✅ Retourner le blob au lieu de sauvegarder directement
    return doc.output('blob');
  };

  // ─── TÉLÉCHARGEMENT PDF PROFESSIONNEL + AFFICHAGE ───────────────────────────────────────
  const handleDownloadCorrection = async (validationId, correction, maquetteName, versionNum) => {
    setDownloading(validationId);
    try {
      // Get project name
      const projectName = correction.version_id?.id_maquette?.id_projet?.nom || "Projet";
      
      // 1️⃣ GÉNÉRER LE PDF (retourne Blob)
      const pdfBlob = generateProfessionalPDFBlob(correction, maquetteName, versionNum, projectName);
      
      // 2️⃣ TÉLÉCHARGER LE FICHIER
      const fileName = `RAPPORT_CORRECTIONS_${maquetteName.replace(/\s+/g, "_")}_V${versionNum}_${new Date().toISOString().split('T')[0]}.pdf`;
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pdfBlob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // 3️⃣ AFFICHER LE PDF DANS UNE NOUVELLE FENÊTRE (en même temps)
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
    } catch (e) {
      console.error("Erreur lors du téléchargement :", e);
      alert("Impossible de télécharger le rapport de corrections.");
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchCorrections();
  }, []);

  // ─── Maquettes actions ────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image_fond: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const startDesign = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await API.post("/maquettes", formData);
      navigate(`/designer/editeur/${res.data.maquette._id}`);
    } catch {
      alert("Erreur lors de la création.");
      setIsCreating(false);
    }
  };

  const openEditModal = (maq) => {
    setEditData({ _id: maq._id, nom: maq.nom, description: maq.description || "", id_projet: maq.id_projet?._id || "" });
    setIsEditModalOpen(true);
  };

  const updateInfo = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await API.put(`/maquettes/${editData._id}`, editData);
      setMaquettes(maquettes.map(m => m._id === editData._id ? res.data : m));
      setIsEditModalOpen(false);
    } catch { alert("Erreur lors de la modification."); }
    finally { setIsUpdating(false); }
  };

  const deleteMaquette = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce design ?")) {
      try {
        await API.delete(`/maquettes/${id}`);
        setMaquettes(maquettes.filter(m => m._id !== id));
      } catch { alert("Erreur lors de la suppression."); }
    }
  };

  const handleMarquerLu = async (affectationId) => {
    setMarking(affectationId);
    try {
      await API.patch(`/affectations/${affectationId}/lire`);
      setAffectations(prev => prev.map(a => a._id === affectationId ? { ...a, lu: true } : a));
    } catch (e) { console.error(e); }
    finally { setMarking(null); }
  };

  // ─── Computed stats ───────────────────────────────────────────────────────────
  const affProjets = affectations.map(a => a.id_projet).filter(Boolean);
  const nonLus     = affectations.filter(a => !a.lu).length;
  const enCours    = affProjets.filter(p => p?.statut === "En cours").length;
  const termines   = affProjets.filter(p => p?.statut === "Terminé").length;

  const projetsAcceptes = affectations
    .map(a => a.id_projet)
    .filter(Boolean)
    .map(p => p._id);

  const stats = [
    { label: "Designs créés",    value: maquettes.length,    color: "#6366F1", bg: "rgba(99,102,241,0.1)",  icon: <Palette size={20} color="#6366F1"/> },
    { label: "Projets assignés", value: affectations.length, color: "#0EA5E9", bg: "rgba(14,165,233,0.1)",  icon: <LayoutGrid size={20} color="#0EA5E9"/> },
    { label: "Non lus",          value: nonLus,              color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  icon: <BellRing size={20} color="#F59E0B"/> },
    { label: "Corrections",      value: corrections.length,  color: "#DC2626", bg: "rgba(220,38,38,0.1)",   icon: <XCircle size={20} color="#DC2626"/> },
    { label: "En cours",         value: enCours,             color: "#10B981", bg: "rgba(16,185,129,0.1)",  icon: <Clock size={20} color="#10B981"/> },
    { label: "Terminés",         value: termines,            color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  icon: <CheckCircle size={20} color="#8B5CF6"/> },
  ];

  const getStatutBadge = (statut) => {
    const map = {
      "En cours":    { color: "#2563EB", bg: "rgba(37,99,235,0.1)",  icon: <Clock size={11}/> },
      "En révision": { color: "#D97706", bg: "rgba(217,119,6,0.1)",  icon: <Eye size={11}/> },
      "Validé":      { color: "#059669", bg: "rgba(5,150,105,0.1)",  icon: <CheckCircle size={11}/> },
      "Refusé":      { color: "#DC2626", bg: "rgba(220,38,38,0.1)",  icon: <XCircle size={11}/> },
      "Terminé":     { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: <CheckCircle size={11}/> },
    };
    return map[statut] || { color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: null };
  };

  const getUrgencyColor = (dateFin) => {
    if (!dateFin) return "#64748B";
    const diff = Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 3) return "#DC2626";
    if (diff <= 7) return "#D97706";
    return "#059669";
  };

  // ─── Grouper les corrections par projet puis version ──────────────────────
  const groupCorrectionsByProjectAndVersion = () => {
    const grouped = {};
    corrections.forEach(c => {
      const projectId   = c.version_id?.id_maquette?.id_projet?._id || "unknown";
      const projectName = c.version_id?.id_maquette?.id_projet?.nom  || "Projet inconnu";
      const versionId   = c.version_id?._id || "unknown";
      const versionNum  = c.version_id?.numéro_version || "N/A";
      const maquetteName= c.version_id?.id_maquette?.nom || "Maquette";
      const maquetteId  = c.version_id?.id_maquette?._id || "unknown";

      if (!grouped[projectId]) grouped[projectId] = { projectName, projectId, versions: {} };
      if (!grouped[projectId].versions[versionId])
        grouped[projectId].versions[versionId] = { versionNum, versionId, maquetteName, maquetteId, corrections: [] };

      grouped[projectId].versions[versionId].corrections.push(c);
    });
    return grouped;
  };

  const toggleProjectExpanded = (id) => setExpandedProjects(p => ({ ...p, [id]: !p[id] }));
  const toggleVersionExpanded = (id) => setExpandedVersions(p => ({ ...p, [id]: !p[id] }));

  const tabs = [
    { id: "overview",    label: "Vue d'ensemble" },
    { id: "designs",     label: `Mes Designs (${maquettes.length})` },
    { id: "projets",     label: `Mes Projets (${affectations.length})` },
    { id: "corrections", label: `Corrections${corrections.length > 0 ? ` (${corrections.length})` : ""}`, alert: corrections.length > 0 },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <p className="db-greeting">Bonjour,</p>
          <h1 className="db-name">{user?.nom || "Designer"} 👋</h1>
        </div>
        <button className="btn-create" onClick={() => setIsModalOpen(true)}>
          <Plus size={18}/> Nouveau Design
        </button>
      </div>

      {/* ── Notification Banner ── */}
      {nonLus > 0 && (
        <div className="banner-notif">
          <BellRing size={16} color="#92400E"/>
          <span>Vous avez <strong>{nonLus}</strong> nouvelle{nonLus > 1 ? "s" : ""} assignation{nonLus > 1 ? "s" : ""} non lue{nonLus > 1 ? "s" : ""}.</span>
        </div>
      )}

      {/* ── Banner corrections urgentes ── */}
      {corrections.length > 0 && (
        <div className="banner-corrections" onClick={() => setActiveTab("corrections")}>
          <div className="banner-pulse"/>
          <AlertTriangle size={16} color="#DC2626"/>
          <div style={{ flex: 1 }}>
            <span className="banner-corrections-text">
              {corrections.length} correction{corrections.length > 1 ? "s" : ""} client{corrections.length > 1 ? "s" : ""} en attente de traitement
            </span>
          </div>
          <span className="banner-corrections-link">Traiter <ArrowRight size={13} style={{ verticalAlign: "middle" }}/></span>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ "--accent": s.color, "--accent-bg": s.bg }}>
            <div className="stat-icon">{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "active" : ""} ${t.alert && activeTab !== t.id ? "alert" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.alert && activeTab !== t.id && <span className="tab-dot"/>}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: OVERVIEW ══════════════ */}
      {activeTab === "overview" && (
        <div className="overview-grid">
          <div className="panel">
            <div className="panel-head">
              <h2>Designs récents</h2>
              <button className="link-btn" onClick={() => setActiveTab("designs")}>Voir tout →</button>
            </div>
            {loadingMaquettes ? <Spinner/> : maquettes.length === 0
              ? <Empty icon={<Palette size={28} color="#6366F1"/>} text="Aucun design créé."/>
              : (
                <div className="recent-list">
                  {maquettes.slice(0, 4).map(maq => (
                    <div key={maq._id} className="recent-item" onClick={() => navigate(`/designer/editeur/${maq._id}`)}>
                      <div className="recent-thumb">
                        {maq.image_fond ? <img src={maq.image_fond} alt="thumb"/> : <ImageIcon size={20} color="#ccc"/>}
                      </div>
                      <div>
                        <div className="recent-title">{maq.nom}</div>
                        <div className="recent-sub">{maq.id_projet?.nom || "Sans projet"}</div>
                      </div>
                      <Eye size={15} color="#94A3B8" style={{ marginLeft: "auto" }}/>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Projets récents</h2>
              <button className="link-btn" onClick={() => setActiveTab("projets")}>Voir tout →</button>
            </div>
            {loadingAff ? <Spinner/> : affectations.length === 0
              ? <Empty icon={<LayoutGrid size={28} color="#0EA5E9"/>} text="Aucun projet assigné."/>
              : (
                <div className="recent-list">
                  {affectations.slice(0, 4).map(a => {
                    const p = a.id_projet;
                    const sc = getStatutBadge(p?.statut);
                    return (
                      <div key={a._id} className="recent-item">
                        <div className="avatar">{p?.id_client?.nom?.charAt(0) || "?"}</div>
                        <div>
                          <div className="recent-title">{p?.nom || "—"}</div>
                          <div className="recent-sub">{p?.id_client?.nom || "—"}</div>
                        </div>
                        <span className="badge" style={{ color: sc.color, background: sc.bg, marginLeft: "auto" }}>
                          {sc.icon} {p?.statut}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* ══════════════ TAB: DESIGNS ══════════════ */}
      {activeTab === "designs" && (
        <div>
          <div className="section-bar">
            <h2 className="section-title">Mes Designs</h2>
            <div className="view-toggle">
              <button className={viewMode === "grid" ? "vt-active" : ""} onClick={() => setViewMode("grid")}><LayoutGrid size={16}/></button>
              <button className={viewMode === "list" ? "vt-active" : ""} onClick={() => setViewMode("list")}><List size={16}/></button>
            </div>
          </div>

          {loadingMaquettes ? <Spinner/> : maquettes.length === 0
            ? <Empty icon={<Palette size={40} color="#6366F1"/>} text="Aucun design pour le moment." sub="Créez votre premier design avec le bouton + ci-dessus."/>
            : viewMode === "grid" ? (
              <div className="maq-grid">
                {maquettes.map(maq => (
                  <div key={maq._id} className="maq-card">
                    <div className="maq-thumb" onClick={() => navigate(`/designer/editeur/${maq._id}`)}>
                      {maq.image_fond
                        ? <img src={maq.image_fond} alt="Miniature"/>
                        : <div className="no-img"><ImageIcon size={36} color="#ccc"/></div>
                      }
                      <div className="maq-overlay"><Eye size={20} color="white"/></div>
                    </div>
                    <div className="maq-info">
                      <div>
                        <div className="maq-name">{maq.nom}</div>
                        <div className="maq-proj">{maq.id_projet?.nom || "Sans projet"}</div>
                      </div>
                      <div className="maq-actions">
                        <button className="icon-btn eye-c"  onClick={() => navigate(`/designer/editeur/${maq._id}`)} title="Voir"><Eye size={15}/></button>
                        <button className="icon-btn edit-c" onClick={() => openEditModal(maq)} title="Modifier"><Edit3 size={15}/></button>
                        <button className="icon-btn del-c"  onClick={() => deleteMaquette(maq._id)} title="Supprimer"><Trash2 size={15}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel">
                <table className="data-table">
                  <thead><tr><th>Design</th><th>Projet</th><th>Actions</th></tr></thead>
                  <tbody>
                    {maquettes.map(maq => (
                      <tr key={maq._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f0f2f5", flexShrink: 0 }}>
                              {maq.image_fond
                                ? <img src={maq.image_fond} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                                : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><ImageIcon size={18} color="#ccc"/></div>
                              }
                            </div>
                            <span style={{ fontWeight: 600 }}>{maq.nom}</span>
                          </div>
                        </td>
                        <td><span className="badge" style={{ color: "#6366F1", background: "rgba(99,102,241,0.1)" }}>{maq.id_projet?.nom || "Sans projet"}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="icon-btn eye-c"  onClick={() => navigate(`/designer/editeur/${maq._id}`)}><Eye size={15}/></button>
                            <button className="icon-btn edit-c" onClick={() => openEditModal(maq)}><Edit3 size={15}/></button>
                            <button className="icon-btn del-c"  onClick={() => deleteMaquette(maq._id)}><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          {maquettes.length > 0 && (
            <div className="journal-cta" onClick={() => navigate("/rapport")}>
              <div className="journal-icon"><Notebook size={22} color="#6366F1"/></div>
              <div>
                <div className="journal-title">Journal quotidien</div>
                <div className="journal-sub">Créer un journal quotidien de vos activités</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#6366F1", fontSize: 20 }}>→</span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: PROJETS ══════════════ */}
      {activeTab === "projets" && (
        <div className="panel">
          {loadingAff ? <Spinner/> : affectations.length === 0
            ? <Empty icon={<LayoutGrid size={40} color="#0EA5E9"/>} text="Aucun projet assigné." sub="L'administrateur vous assignera bientôt à un projet."/>
            : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Projet</th><th>Client</th><th>Date fin</th>
                      <th>Statut</th><th>Assigné le</th><th style={{ textAlign: "center" }}>Lu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affectations.map(a => {
                      const p  = a.id_projet;
                      const sc = getStatutBadge(p?.statut);
                      const uc = getUrgencyColor(p?.date_fin);
                      const isNew = !a.lu;
                      return (
                        <tr key={a._id} style={{ background: isNew ? "rgba(245,158,11,0.04)" : "" }}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {isNew && <div className="dot-notif"/>}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{p?.nom || "—"}</div>
                                {p?.description && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{p.description.slice(0, 55)}…</div>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="avatar">{p?.id_client?.nom?.charAt(0) || "?"}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.id_client?.nom || "—"}</div>
                                <div style={{ fontSize: 11, color: "#94A3B8" }}>{p?.id_client?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {p?.date_fin
                              ? <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: uc }}>
                                  <Calendar size={12}/>{new Date(p.date_fin).toLocaleDateString("fr-FR")}
                                </span>
                              : "—"}
                          </td>
                          <td>
                            <span className="badge" style={{ color: sc.color, background: sc.bg }}>
                              {sc.icon}{p?.statut || "—"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "#64748B" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Calendar size={11}/>{new Date(a.date_affectation).toLocaleDateString("fr-FR")}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {a.lu
                              ? <span className="badge" style={{ color: "#059669", background: "rgba(5,150,105,0.1)" }}><CheckCircle size={11}/> Lu</span>
                              : (
                                <button
                                  className="btn-mark-lu"
                                  onClick={() => handleMarquerLu(a._id)}
                                  disabled={marking === a._id}
                                  style={{ opacity: marking === a._id ? 0.7 : 1 }}
                                >
                                  <BellRing size={12}/> {marking === a._id ? "…" : "Marquer lu"}
                                </button>
                              )
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {/* ══════════════ TAB: CORRECTIONS — REDESIGNÉ ══════════════ */}
      {activeTab === "corrections" && (
        <div>
          {/* En-tête de section */}
          <div className="corrections-header">
            <div className="corrections-header-left">
              <div className="corrections-icon-wrap">
                <Wrench size={20} color="#DC2626"/>
              </div>
              <div>
                <h2 className="corrections-title">Corrections clients</h2>
                <p className="corrections-subtitle">
                  {corrections.length === 0
                    ? "Aucune correction en attente — tout est à jour ✅"
                    : `${corrections.length} correction${corrections.length > 1 ? "s" : ""} à traiter`
                  }
                </p>
              </div>
            </div>
          </div>

          {loadingCorrections ? <Spinner/> : corrections.length === 0 ? (
            <div className="corrections-empty">
              <div className="corrections-empty-icon">
                <CheckCircle size={40} color="#10B981"/>
              </div>
              <p className="corrections-empty-title">Tout est à jour !</p>
              <p className="corrections-empty-sub">Aucune correction client en attente de traitement.</p>
            </div>
          ) : (
            <div className="corrections-list">
              {Object.entries(groupCorrectionsByProjectAndVersion()).map(([projectId, projectData]) => {
                const isProjectExpanded = expandedProjects[projectId] !== false;
                const totalCorrections = Object.values(projectData.versions).reduce((acc, v) => acc + v.corrections.length, 0);

                return (
                  <div key={projectId} className="project-block">
                    {/* ── EN-TÊTE PROJET ── */}
                    <div
                      className={`project-header ${isProjectExpanded ? "open" : ""}`}
                      onClick={() => toggleProjectExpanded(projectId)}
                    >
                      <div className="project-header-left">
                        <div className="project-folder-icon">
                          {isProjectExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        </div>
                        <div>
                          <div className="project-name">{projectData.projectName}</div>
                          <div className="project-meta">
                            {Object.keys(projectData.versions).length} maquette{Object.keys(projectData.versions).length > 1 ? "s" : ""}
                            {" · "}
                            <span style={{ color: "#DC2626", fontWeight: 700 }}>
                              {totalCorrections} correction{totalCorrections > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="project-badge-wrap">
                        <span className="project-urgency-badge">Urgent</span>
                      </div>
                    </div>

                    {/* ── VERSIONS ── */}
                    {isProjectExpanded && (
                      <div className="versions-container">
                        {Object.entries(projectData.versions).map(([versionId, versionData]) => {
                          const isVersionExpanded = expandedVersions[versionId] !== false;

                          return (
                            <div key={versionId} className="version-block">
                              {/* ── EN-TÊTE VERSION ── */}
                              <div
                                className={`version-header ${isVersionExpanded ? "open" : ""}`}
                                onClick={() => toggleVersionExpanded(versionId)}
                              >
                                <div className="version-header-left">
                                  <FileText size={15} color="#F59E0B"/>
                                  <div>
                                    <div className="version-name">{versionData.maquetteName}</div>
                                    <div className="version-meta">{versionData.corrections.length} correction{versionData.corrections.length > 1 ? "s" : ""}</div>
                                  </div>
                                  <span className="version-pill">v{versionData.versionNum}</span>
                                </div>
                                <div className="version-header-right">
                                  {/* ✅ DOWNLOAD PDF - Téléchargement + Affichage simultané */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const firstCorrection = versionData.corrections[0];
                                      handleDownloadCorrection(firstCorrection._id, firstCorrection, versionData.maquetteName, versionData.versionNum);
                                    }}
                                    className="btn-download-pdf"
                                    disabled={downloading !== null}
                                    title="Télécharger et afficher le rapport de corrections (PDF)"
                                  >
                                    {downloading === versionData.corrections[0]?._id ? (
                                      <><Loader size={14} className="spin"/> Génération...</>
                                    ) : (
                                      <><Download size={14}/> Exporter PDF</>
                                    )}
                                  </button>
                                  <div className="version-chevron">
                                    {isVersionExpanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                                  </div>
                                </div>
                              </div>

                              {/* ── CARTES CORRECTIONS ── */}
                              {isVersionExpanded && (
                                <div className="corrections-cards">
                                  {versionData.corrections.map((c) => {
                                    const commentairesAvecContenu = (c.commentaires || []).filter(
                                      cm => cm.commentaire_admin || cm.commentaire_client
                                    );
                                    const client = c.client_id;
                                    const isMarkingThis = markingDone === c._id;

                                    return (
                                      <div key={c._id} className="correction-card">
                                        {/* Top bar colorée */}
                                        <div className="correction-card-topbar"/>

                                        {/* Infos client + date */}
                                        <div className="correction-card-meta">
                                          <div className="correction-client">
                                            <div className="correction-client-avatar">
                                              {client?.nom?.charAt(0) || "?"}
                                            </div>
                                            <div>
                                              <div className="correction-client-name">
                                                <User size={11}/> {client?.nom || "Client"}
                                              </div>
                                              {client?.email && (
                                                <div className="correction-client-email">{client.email}</div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="correction-date">
                                            <Calendar size={11}/>
                                            {new Date(c.date_validation).toLocaleDateString("fr-FR", {
                                              day: "2-digit", month: "short", year: "numeric"
                                            })}
                                          </div>
                                        </div>

                                        {/* Séparateur */}
                                        <div className="correction-divider"/>

                                        {/* Contenu des remarques */}
                                        {commentairesAvecContenu.length === 0 ? (
                                          <div className="correction-no-remarks">
                                            <MessageSquare size={14} color="#94A3B8"/>
                                            <span>Rejet global — contacter le client pour plus de détails</span>
                                          </div>
                                        ) : (
                                          <div className="correction-remarks">
                                            <div className="correction-remarks-label">
                                              <MessageSquare size={12}/>
                                              {commentairesAvecContenu.length} remarque{commentairesAvecContenu.length > 1 ? "s" : ""}
                                            </div>
                                            <div className="correction-remarks-list">
                                              {commentairesAvecContenu.map((cm) => (
                                                <div key={cm._id} className="remark-item">
                                                  <div className="remark-element">
                                                    ◆ {cm.label_element || cm.id_element}
                                                  </div>
                                                  <div className="remark-text">
                                                    {cm.commentaire_admin || cm.commentaire_client}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Actions */}
                                        <div className="correction-actions">
                                          <button
                                            className="btn-corriger"
                                            onClick={() => navigate(`/designer/editeur/${c.version_id?.id_maquette?._id}`)}
                                          >
                                            <Eye size={13}/> Ouvrir l'éditeur
                                          </button>
                                          <button
                                            className="btn-traite"
                                            onClick={() => handleMarquerLuCorrection(c._id)}
                                            disabled={isMarkingThis}
                                          >
                                            {isMarkingThis
                                              ? <><Loader size={13} className="spin"/> Envoi…</>
                                              : <><CheckCircle size={13}/> Marquer traité</>
                                            }
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ MODAL: CRÉATION ══════════════ */}
      {isModalOpen && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>Nouveau Design</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={18}/></button>
            </div>
            <form onSubmit={startDesign} className="modal-form">
              <input type="text" placeholder="Nom du design *" required className="inp" onChange={e => setFormData({ ...formData, nom: e.target.value })}/>
              <select required className="inp" onChange={e => setFormData({ ...formData, id_projet: e.target.value })}>
                <option value="">— Assigner à un projet accepté —</option>
                {projets.filter(p => projetsAcceptes.includes(p._id)).map(p => (
                  <option key={p._id} value={p._id}>{p.nom}</option>
                ))}
              </select>
              {projets.filter(p => projetsAcceptes.includes(p._id)).length === 0 && (
                <p style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600, margin: "4px 0 0" }}>
                  ℹ️ Aucun projet accepté disponible pour le moment.
                </p>
              )}
              <label className="upload-zone">
                <Upload size={22} color="#6366F1"/>
                <span>{formData.image_fond ? "Image prête ✅" : "Importer une image de fond"}</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }}/>
              </label>
              <button type="submit" className="btn-submit" disabled={isCreating}>
                {isCreating ? <><Loader size={16} className="spin"/> Chargement…</> : "Commencer 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: MODIFICATION ══════════════ */}
      {isEditModalOpen && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>Modifier les informations</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}><X size={18}/></button>
            </div>
            <form onSubmit={updateInfo} className="modal-form">
              <input type="text" value={editData.nom} required className="inp" onChange={e => setEditData({ ...editData, nom: e.target.value })}/>
              <textarea value={editData.description} placeholder="Description" className="inp" rows={3} onChange={e => setEditData({ ...editData, description: e.target.value })}/>
              <select value={editData.id_projet} required className="inp" onChange={e => setEditData({ ...editData, id_projet: e.target.value })}>
                <option value="">— Assigner à un projet accepté —</option>
                {projets.filter(p => projetsAcceptes.includes(p._id)).map(p => (
                  <option key={p._id} value={p._id}>{p.nom}</option>
                ))}
              </select>
              <button type="submit" className="btn-submit" disabled={isUpdating}>
                {isUpdating ? <><Loader size={16} className="spin"/> Sauvegarde…</> : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ STYLES ══════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .db-root { font-family: 'Plus Jakarta Sans', sans-serif; max-width: 1200px; margin: 0 auto; padding: 28px 24px 60px; color: #1E293B; min-height: 100vh; }
        .db-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; }
        .db-greeting { font-size: 13px; color: #94A3B8; font-weight: 500; margin: 0 0 2px; }
        .db-name { font-size: 26px; font-weight: 800; margin: 0; color: #0F172A; }
        .btn-create { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; border: none; border-radius: 12px; padding: 11px 22px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 15px rgba(99,102,241,0.4); transition: all .2s; white-space: nowrap; font-family: inherit; }
        .btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.45); }

        .banner-notif { display: flex; align-items: center; gap: 10px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); border-radius: 12px; padding: 12px 18px; margin-bottom: 16px; font-size: 13px; color: #92400E; font-weight: 600; }

        /* Banner corrections */
        .banner-corrections { display: flex; align-items: center; gap: 10px; background: #FEF2F2; border: 1.5px solid rgba(220,38,38,0.3); border-radius: 12px; padding: 13px 18px; margin-bottom: 24px; cursor: pointer; transition: all .2s; }
        .banner-corrections:hover { background: #FEE2E2; border-color: rgba(220,38,38,0.5); }
        .banner-pulse { width: 10px; height: 10px; border-radius: 50%; background: #DC2626; flex-shrink: 0; animation: pulse 1.5s ease-in-out infinite; }
        .banner-corrections-text { font-size: 13px; font-weight: 700; color: #991B1B; }
        .banner-corrections-link { font-size: 12px; font-weight: 700; color: #DC2626; white-space: nowrap; display: flex; align-items: center; gap: 4px; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: white; border-radius: 16px; padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); border: 1px solid #F1F5F9; transition: transform .2s; }
        .stat-card:hover { transform: translateY(-3px); }
        .stat-icon { width: 46px; height: 46px; border-radius: 12px; background: var(--accent-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-value { font-size: 26px; font-weight: 800; color: var(--accent); }
        .stat-label { font-size: 11px; color: #94A3B8; font-weight: 600; margin-top: 1px; }

        .tabs { display: flex; gap: 4px; background: white; padding: 5px; border-radius: 14px; border: 1px solid #E2E8F0; margin-bottom: 24px; width: fit-content; }
        .tab-btn { position: relative; padding: 9px 20px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; background: none; color: #64748B; transition: all .2s; font-family: inherit; }
        .tab-btn.active { background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; box-shadow: 0 3px 10px rgba(99,102,241,0.35); }
        .tab-btn.alert { color: #DC2626; }
        .tab-btn:hover:not(.active) { color: #374151; }
        .tab-dot { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: #DC2626; animation: pulse 1.5s ease-in-out infinite; }

        .panel { background: white; border-radius: 16px; padding: 22px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); border: 1px solid #F1F5F9; margin-bottom: 20px; }
        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .panel-head h2 { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0; }
        .link-btn { background: none; border: none; color: #6366F1; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 700px) { .overview-grid { grid-template-columns: 1fr; } }
        .recent-list { display: flex; flex-direction: column; gap: 10px; }
        .recent-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid #F1F5F9; cursor: pointer; transition: background .15s; }
        .recent-item:hover { background: #F8FAFC; }
        .recent-thumb { width: 42px; height: 42px; border-radius: 8px; background: #f0f2f5; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .recent-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .recent-title { font-size: 13px; font-weight: 700; color: #1E293B; }
        .recent-sub { font-size: 11px; color: #94A3B8; margin-top: 1px; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
        .badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; padding: 4px 11px; font-size: 11px; font-weight: 700; }
        .section-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .section-title { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0; }
        .view-toggle { display: flex; gap: 4px; background: white; border-radius: 10px; padding: 4px; border: 1px solid #E2E8F0; }
        .view-toggle button { border: none; background: none; padding: 6px 8px; border-radius: 8px; cursor: pointer; color: #94A3B8; display: flex; }
        .view-toggle .vt-active { background: #6366F1; color: white; }
        .maq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin-bottom: 20px; }
        .maq-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #F1F5F9; transition: all .25s; }
        .maq-card:hover { transform: translateY(-5px); box-shadow: 0 10px 28px rgba(0,0,0,0.1); }
        .maq-thumb { height: 165px; background: #f0f2f5; cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
        .maq-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .no-img { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .maq-overlay { position: absolute; inset: 0; background: rgba(99,102,241,0.55); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
        .maq-thumb:hover .maq-overlay { opacity: 1; }
        .maq-info { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
        .maq-name { font-size: 14px; font-weight: 700; color: #1E293B; }
        .maq-proj { font-size: 11px; color: #94A3B8; margin-top: 2px; }
        .maq-actions { display: flex; gap: 6px; }
        .icon-btn { border: none; cursor: pointer; padding: 7px; border-radius: 8px; transition: all .18s; display: flex; align-items: center; }
        .eye-c  { color: #2a9d8f; background: rgba(42,157,143,0.1); }
        .edit-c { color: #6366F1; background: rgba(99,102,241,0.1); }
        .del-c  { color: #e63946; background: rgba(230,57,70,0.1); }
        .icon-btn:hover { filter: brightness(1.1); transform: scale(1.08); }
        .table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { text-align: left; padding: 10px 14px; color: #94A3B8; font-weight: 700; font-size: 11px; border-bottom: 1px solid #F1F5F9; text-transform: uppercase; letter-spacing: .05em; }
        .data-table td { padding: 13px 14px; color: #374151; vertical-align: middle; }
        .dot-notif { width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; flex-shrink: 0; }
        .btn-mark-lu { display: inline-flex; align-items: center; gap: 5px; background: #F59E0B; color: white; border: none; border-radius: 20px; padding: 5px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .2s; }
        .btn-mark-lu:hover { background: #D97706; }
        .journal-cta { display: flex; align-items: center; gap: 14px; background: white; border: 1px dashed #C7D2FE; border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all .2s; margin-top: 4px; }
        .journal-cta:hover { background: rgba(99,102,241,0.04); border-color: #6366F1; }
        .journal-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .journal-title { font-size: 14px; font-weight: 700; color: #1E293B; }
        .journal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

        /* ─── CORRECTIONS REDESIGN ─── */
        .corrections-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .corrections-header-left { display: flex; align-items: center; gap: 14px; }
        .corrections-icon-wrap { width: 44px; height: 44px; border-radius: 12px; background: rgba(220,38,38,0.08); border: 1.5px solid rgba(220,38,38,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .corrections-title { font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 2px; }
        .corrections-subtitle { font-size: 13px; color: #64748B; margin: 0; }

        .corrections-empty { background: white; border-radius: 20px; padding: 60px 20px; text-align: center; border: 1px solid #F1F5F9; }
        .corrections-empty-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .corrections-empty-title { font-size: 16px; font-weight: 800; color: #1E293B; margin: 0 0 6px; }
        .corrections-empty-sub { font-size: 13px; color: #94A3B8; margin: 0; }

        .corrections-list { display: flex; flex-direction: column; gap: 16px; }

        /* Bloc projet */
        .project-block { background: white; border-radius: 18px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .project-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; cursor: pointer; background: white; transition: background .15s; border-bottom: 1px solid transparent; }
        .project-header:hover { background: #F8FAFC; }
        .project-header.open { border-bottom-color: #F1F5F9; background: linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.02)); }
        .project-header-left { display: flex; align-items: center; gap: 12px; }
        .project-folder-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(99,102,241,0.1); color: #6366F1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .project-name { font-size: 15px; font-weight: 800; color: #0F172A; }
        .project-meta { font-size: 12px; color: #94A3B8; margin-top: 2px; }
        .project-badge-wrap { flex-shrink: 0; }
        .project-urgency-badge { background: rgba(220,38,38,0.1); color: #DC2626; border: 1px solid rgba(220,38,38,0.2); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 800; letter-spacing: .04em; }

        /* Container versions */
        .versions-container { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 12px; background: #FAFBFF; }

        /* Bloc version */
        .version-block { border-radius: 12px; border: 1px solid #E8ECFF; overflow: hidden; background: white; }
        .version-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; transition: background .15s; border-bottom: 1px solid transparent; }
        .version-header:hover { background: #FFF9EC; }
        .version-header.open { border-bottom-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.04); }
        .version-header-left { display: flex; align-items: center; gap: 10px; }
        .version-name { font-size: 13px; font-weight: 700; color: #1E293B; }
        .version-meta { font-size: 11px; color: #94A3B8; margin-top: 1px; }
        .version-pill { background: rgba(245,158,11,0.12); color: #B45309; border-radius: 6px; padding: 3px 9px; font-size: 11px; font-weight: 800; flex-shrink: 0; }
        .version-header-right { display: flex; align-items: center; gap: 8px; }
        .version-chevron { color: #94A3B8; display: flex; }

        /* Bouton download amélioré */
        .btn-download-pdf { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .2s; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
        .btn-download-pdf:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); background: linear-gradient(135deg, #059669, #047857); }
        .btn-download-pdf:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Grille cartes corrections */
        .corrections-cards { padding: 12px 16px 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; background: rgba(245,158,11,0.02); }

        /* Carte correction individuelle */
        .correction-card { background: white; border: 1px solid #FEE2E2; border-radius: 14px; overflow: hidden; transition: all .2s; }
        .correction-card:hover { box-shadow: 0 8px 24px rgba(220,38,38,0.12); transform: translateY(-2px); }
        .correction-card-topbar { height: 4px; background: linear-gradient(90deg, #DC2626, #F87171); }
        .correction-card-meta { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 12px; }
        .correction-client { display: flex; align-items: center; gap: 10px; }
        .correction-client-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #DC2626, #F87171); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
        .correction-client-name { font-size: 13px; font-weight: 700; color: #1E293B; display: flex; align-items: center; gap: 5px; }
        .correction-client-email { font-size: 11px; color: #94A3B8; margin-top: 1px; }
        .correction-date { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94A3B8; font-weight: 600; }
        .correction-divider { height: 1px; background: #FEE2E2; margin: 0 16px; }
        .correction-no-remarks { display: flex; align-items: center; gap: 8px; padding: 14px 16px; font-size: 12px; color: #94A3B8; font-style: italic; }
        .correction-remarks { padding: 14px 16px; }
        .correction-remarks-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #D97706; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
        .correction-remarks-list { display: flex; flex-direction: column; gap: 8px; }
        .remark-item { background: #FFFBF0; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 12px; transition: all .15s; }
        .remark-item:hover { background: #FFFBEB; border-color: #FCD34D; }
        .remark-element { font-size: 11px; font-weight: 800; color: #D97706; margin-bottom: 4px; }
        .remark-text { font-size: 12px; color: #5F3E37; line-height: 1.5; }
        .correction-actions { display: flex; gap: 8px; padding: 12px 16px 14px; border-top: 1px solid #FEE2E2; }
        .btn-corriger { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; border: none; border-radius: 9px; padding: 9px 12px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .2s; }
        .btn-corriger:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
        .btn-traite { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: rgba(5,150,105,0.08); color: #059669; border: 1px solid rgba(5,150,105,0.25); border-radius: 9px; padding: 9px 12px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .2s; }
        .btn-traite:hover:not(:disabled) { background: rgba(5,150,105,0.15); border-color: rgba(5,150,105,0.4); }
        .btn-traite:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Modals */
        .overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: white; border-radius: 20px; width: 100%; max-width: 440px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); animation: popIn .25s ease; }
        @keyframes popIn { from { transform: scale(.94) translateY(12px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 22px 24px 0; }
        .modal-head h3 { font-size: 17px; font-weight: 800; margin: 0; color: #0F172A; }
        .modal-close { border: none; background: #F1F5F9; border-radius: 8px; padding: 7px; cursor: pointer; color: #64748B; display: flex; transition: background .15s; }
        .modal-close:hover { background: #E2E8F0; }
        .modal-form { display: flex; flex-direction: column; gap: 13px; padding: 20px 24px 24px; }
        .inp { width: 100%; padding: 12px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 14px; color: #1E293B; font-family: inherit; transition: border-color .2s; outline: none; box-sizing: border-box; resize: none; }
        .inp:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .upload-zone { display: flex; flex-direction: column; align-items: center; gap: 8px; border: 2px dashed #C7D2FE; border-radius: 12px; padding: 22px 16px; background: rgba(99,102,241,0.03); cursor: pointer; transition: border-color .2s; text-align: center; font-size: 13px; color: #6366F1; font-weight: 600; }
        .upload-zone:hover { border-color: #6366F1; background: rgba(99,102,241,0.06); }
        .btn-submit { display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; border: none; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 4px 15px rgba(99,102,241,0.4); transition: all .2s; }
        .btn-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  );
};

const Spinner = () => (
  <div style={{ textAlign: "center", padding: "40px 0" }}>
    <Loader className="spin" size={28} color="#6366F1"/>
  </div>
);

const Empty = ({ icon, text, sub }) => (
  <div style={{ textAlign: "center", padding: "40px 0" }}>
    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
      {icon}
    </div>
    <p style={{ fontWeight: 700, fontSize: 15, color: "#374151", margin: 0 }}>{text}</p>
    {sub && <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>{sub}</p>}
  </div>
);

export default DesignerDashboard;
