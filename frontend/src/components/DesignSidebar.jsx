import React, { useState, useCallback } from 'react';
import { 
  Type, Square, Circle, Triangle, Image as ImageIcon, 
  Smile, Star, Table, Palette, PenTool, Eraser,
  ChevronDown, ChevronRight 
} from 'lucide-react';

const DesignSidebar = ({
  openMenu,
  setOpenMenu,
  activeDrawingTool,
  setActiveDrawingTool,
  spawnToolElement,
  setShowEmojiPicker,
  setShowStickerPicker,
  isSidebarOpen,
  drawingColor,
  setDrawingColor,
  drawingWidth,
  setDrawingWidth,
  isDesigner
}) => {
  const [expandedSections, setExpandedSections] = useState({
    typography: true,
    shapes: false,
    elements: false,
    drawing: false
  });

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  if (!isDesigner) return null;

  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        {/* Typography Section */}
        <div className="sidebar-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('typography')}
          >
            {expandedSections.typography ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Type size={16} />
            <span>Typographie</span>
          </button>
          {expandedSections.typography && (
            <div className="section-content">
              <button 
                className={`sidebar-btn ${openMenu === "typography" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("text");
                  setOpenMenu("typography");
                }}
              >
                <Type size={16} />
                <span>Ajouter Texte</span>
              </button>
            </div>
          )}
        </div>

        {/* Shapes Section */}
        <div className="sidebar-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('shapes')}
          >
            {expandedSections.shapes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Square size={16} />
            <span>Formes</span>
          </button>
          {expandedSections.shapes && (
            <div className="section-content">
              <button 
                className={`sidebar-btn ${openMenu === "shapes" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("rect");
                  setOpenMenu("shapes");
                }}
              >
                <Square size={16} />
                <span>Rectangle</span>
              </button>
              <button 
                className={`sidebar-btn ${openMenu === "shapes" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("circle");
                  setOpenMenu("shapes");
                }}
              >
                <Circle size={16} />
                <span>Cercle</span>
              </button>
              <button 
                className={`sidebar-btn ${openMenu === "shapes" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("triangle");
                  setOpenMenu("shapes");
                }}
              >
                <Triangle size={16} />
                <span>Triangle</span>
              </button>
            </div>
          )}
        </div>

        {/* Elements Section */}
        <div className="sidebar-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('elements')}
          >
            {expandedSections.elements ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Star size={16} />
            <span>Éléments</span>
          </button>
          {expandedSections.elements && (
            <div className="section-content">
              <button 
                className={`sidebar-btn ${openMenu === "elements" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("image");
                  setOpenMenu("elements");
                }}
              >
                <ImageIcon size={16} />
                <span>Image</span>
              </button>
              <button 
                className={`sidebar-btn ${openMenu === "elements" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("emoji");
                  setOpenMenu("elements");
                }}
              >
                <Smile size={16} />
                <span>Emoji</span>
              </button>
              <button 
                className={`sidebar-btn ${openMenu === "elements" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("sticker");
                  setOpenMenu("elements");
                }}
              >
                <Star size={16} />
                <span>Sticker</span>
              </button>
              <button 
                className={`sidebar-btn ${openMenu === "elements" ? "active" : ""}`}
                onClick={() => {
                  spawnToolElement("table");
                  setOpenMenu("elements");
                }}
              >
                <Table size={16} />
                <span>Tableau</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawing Tools Section */}
        <div className="sidebar-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('drawing')}
          >
            {expandedSections.drawing ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <PenTool size={16} />
            <span>Dessin</span>
          </button>
          {expandedSections.drawing && (
            <div className="section-content">
              <button 
                className={`sidebar-btn ${activeDrawingTool === "pen" ? "active" : ""}`}
                onClick={() => setActiveDrawingTool("pen")}
              >
                <PenTool size={16} />
                <span>Stylo</span>
              </button>
              <button 
                className={`sidebar-btn ${activeDrawingTool === "marker" ? "active" : ""}`}
                onClick={() => setActiveDrawingTool("marker")}
              >
                <PenTool size={16} />
                <span>Marqueur</span>
              </button>
              <button 
                className={`sidebar-btn ${activeDrawingTool === "highlighter" ? "active" : ""}`}
                onClick={() => setActiveDrawingTool("highlighter")}
              >
                <PenTool size={16} />
                <span>Surligneur</span>
              </button>
              <button 
                className={`sidebar-btn ${activeDrawingTool === "eraser" ? "active" : ""}`}
                onClick={() => setActiveDrawingTool("eraser")}
              >
                <Eraser size={16} />
                <span>Gomme</span>
              </button>
              
              {/* Drawing Controls */}
              <div className="drawing-controls">
                <div className="control-group">
                  <label>Couleur</label>
                  <input 
                    type="color" 
                    value={drawingColor}
                    onChange={(e) => setDrawingColor(e.target.value)}
                    className="color-input"
                  />
                </div>
                <div className="control-group">
                  <label>Épaisseur</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={drawingWidth}
                    onChange={(e) => setDrawingWidth(Number(e.target.value))}
                    className="range-input"
                  />
                  <span className="range-value">{drawingWidth}px</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          width: 280px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
          overflow: hidden;
        }
        
        .sidebar.closed {
          width: 60px;
        }
        
        .sidebar-content {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
        }
        
        .sidebar-section {
          margin-bottom: 16px;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text);
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .section-header:hover {
          background: var(--surface-2);
        }
        
        .section-content {
          margin-left: 24px;
          margin-top: 8px;
        }
        
        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-2);
          font-size: 13px;
          transition: all 0.2s ease;
          margin-bottom: 4px;
        }
        
        .sidebar-btn:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        
        .sidebar-btn.active {
          background: var(--primary-bg);
          color: var(--primary);
        }
        
        .drawing-controls {
          margin-top: 12px;
          padding: 12px;
          background: var(--surface-2);
          border-radius: 8px;
        }
        
        .control-group {
          margin-bottom: 12px;
        }
        
        .control-group label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-2);
          margin-bottom: 6px;
        }
        
        .color-input {
          width: 100%;
          height: 32px;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
        }
        
        .range-input {
          width: 100%;
          margin-bottom: 4px;
        }
        
        .range-value {
          font-size: 11px;
          color: var(--text-2);
        }
      `}</style>
    </div>
  );
};

export default DesignSidebar;
