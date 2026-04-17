import jsPDF from "jspdf";

/**
 * Common Styles & Constants for Premium PDFs
 */
const COLORS = {
  primary: [7, 21, 43],    // #07152B (Deep Navy)
  secondary: [0, 102, 255], // #0066FF (Vibrant Blue)
  accent: [0, 168, 255],   // #00A8FF (Azure)
  success: [16, 185, 129], // #10B981 (Emerald)
  warning: [245, 158, 11], // #F59E0B (Amber)
  error: [220, 38, 38],   // #DC2626 (Red)
  background: [248, 250, 252], // #F8FAFC (Slate 50)
  textMain: [30, 41, 59],  // #1E293B (Slate 800)
  textMuted: [100, 116, 139], // #64748B (Slate 500)
  white: [255, 255, 255]
};

/**
 * Adds a premium header with gradient-like effects and titles
 */
const drawPremiumHeader = (doc, title, subtitle, date, logoText = "DevPortal.") => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Background Header Block
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 60, "F");
  
  // Decorative Accent Shapes
  doc.setFillColor(...COLORS.secondary);
  doc.circle(pageWidth - 20, 20, 35, "F");
  doc.setFillColor(0, 102, 255, 0.5);
  doc.circle(pageWidth - 35, 45, 15, "F");
  
  // Logo / Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text(logoText.split(".")[0], 15, 20);
  doc.setTextColor(...COLORS.secondary);
  doc.text(".", 15 + doc.getTextWidth(logoText.split(".")[0]), 20);
  
  // Main Title
  doc.setFontSize(28);
  doc.setTextColor(...COLORS.white);
  doc.text(title.toUpperCase(), 15, 40);
  
  // Subtitle & Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text(subtitle, 15, 52);
  
  // Date Badge (Right)
  doc.setFillColor(255, 255, 255, 0.1);
  doc.roundedRect(pageWidth - 65, 35, 50, 12, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text(`DATE: ${date}`, pageWidth - 40, 43, { align: "center" });
};

const drawFooter = (doc, pageNum, totalPages) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.text("Document généré par DevPortal B2B - Système de gestion de design", 15, pageHeight - 8);
  doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 30, pageHeight - 8);
};

/**
 * GENERATE CORRECTION REPORT PDF
 */
export const generateCorrectionPDF = (correction, maquetteName, versionNum, projectName, designerName) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  
  drawPremiumHeader(doc, "Rapport de Corrections", `Projet: ${projectName || 'Interne'} • v${versionNum}`, today);
  
  let y = 75;
  
  // --- PROJECT INFO CARD ---
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(15, y, pageWidth - 30, 35, 4, 4, "F");
  doc.setDrawColor(...COLORS.secondary);
  doc.setLineWidth(0.7);
  doc.line(15, y, 15, y + 35);
  
  // Icons Simulation (Circles)
  doc.setFillColor(...COLORS.secondary);
  doc.circle(25, y + 10, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMain);
  doc.text("DÉTAILS DU DESIGN", 32, y + 11);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Maquette: `, 25, y + 20);
  doc.setFont("helvetica", "bold");
  doc.text(maquetteName, 45, y + 20);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Designer: `, 25, y + 27);
  doc.setFont("helvetica", "bold");
  doc.text(designerName || "Non spécifié", 45, y + 27);
  
  // Customer Info (Right side of card)
  const client = correction.client_id || {};
  doc.setFillColor(...COLORS.primary);
  doc.circle(pageWidth - 75, y + 10, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.text("DEMANDEUR", pageWidth - 68, y + 11);
  doc.setFont("helvetica", "normal");
  doc.text(client.nom || "Client Principal", pageWidth - 75, y + 20);
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(client.email || "", pageWidth - 75, y + 27);
  
  y += 50;
  
  // --- CORRECTIONS LIST ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.error);
  doc.text("LISTE DES MODIFICATIONS REQUISES", 15, y);
  
  y += 10;
  
  const commentaires = (correction.commentaires || []).filter(cm => cm.commentaire_admin || cm.commentaire_client);
  
  if (commentaires.length === 0) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(15, y, pageWidth - 30, 20, 3, 3, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Remarque globale: Veuillez revoir l'ensemble de la version suite au rejet.", 22, y + 12);
  } else {
    commentaires.forEach((cm, index) => {
      // New page check
      if (y > pageHeight - 40) {
        doc.addPage();
        drawPremiumHeader(doc, "Rapport de Corrections", "Suite des corrections", today);
        y = 75;
      }
      
      const commentText = cm.commentaire_admin || cm.commentaire_client;
      const wrappedText = doc.splitTextToSize(commentText, pageWidth - 45);
      const rowHeight = (wrappedText.length * 5) + 15;
      
      // Card
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, pageWidth - 30, rowHeight, 3, 3, "FD");
      
      // Left indicator
      doc.setFillColor(...COLORS.warning);
      doc.rect(15, y, 4, rowHeight, "F");
      
      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textMain);
      doc.text(cm.label_element || cm.id_element || `Élément ${index + 1}`, 24, y + 8);
      
      // Detail Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textMain);
      doc.text(wrappedText, 24, y + 16);
      
      y += rowHeight + 5;
    });
  }
  
  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }
  
  return doc.output("blob");
};

/**
 * GENERATE DAILY RAPPORT PDF
 */
export const generateRapportPDF = (rapport, designerName, projetNom) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const reportDate = new Date(rapport.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const submissionDate = new Date(rapport.date_soumission || rapport.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  
  drawPremiumHeader(doc, "Journal d'Activité", `Projet: ${projetNom || 'Interne'} • Soumis le ${submissionDate}`, reportDate);
  
  let y = 75;
  
  // --- DESIGNER INFO ---
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(15, y, pageWidth - 30, 25, 4, 4, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255, 0.7);
  doc.text("DESIGNER EN CHARGE", 25, y + 10);
  
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text(designerName || "Designer", 25, y + 18);
  
  doc.setFillColor(...COLORS.secondary);
  doc.circle(pageWidth - 30, y + 12, 6, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.text((designerName || "D")[0].toUpperCase(), pageWidth - 32, y + 14);

  y += 40;
  
  // --- CONTENT SECTION HELPER ---
  const addSection = (title, items, color) => {
    if (y > pageHeight - 50) {
      doc.addPage();
      drawPremiumHeader(doc, "Journal d'Activité", "Suite du rapport", reportDate);
      y = 75;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(title.toUpperCase(), 15, y);
    y += 6;
    
    doc.setDrawColor(...color);
    doc.setLineWidth(1);
    doc.line(15, y, 35, y);
    y += 8;
    
    if (!items || items.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Aucune donnée saisie pour cette section.", 20, y);
      y += 12;
    } else {
      items.forEach(item => {
        const wrapped = doc.splitTextToSize(`• ${item}`, pageWidth - 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.textMain);
        doc.text(wrapped, 20, y);
        y += (wrapped.length * 5) + 2;
        
        if (y > pageHeight - 30) {
          doc.addPage();
          drawPremiumHeader(doc, "Journal d'Activité", "Suite du rapport", reportDate);
          y = 75;
        }
      });
      y += 8;
    }
  };
  
  addSection("Travail effectué", rapport.travail_effectué, COLORS.success);
  addSection("Tâches restantes", rapport.tâches_restantes, COLORS.secondary);
  addSection("Blocages et alertes", rapport.blocages, COLORS.error);
  
  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }
  
  return doc.output("blob");
};
