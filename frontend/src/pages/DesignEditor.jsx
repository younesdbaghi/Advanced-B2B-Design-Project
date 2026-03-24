import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import debounce from "lodash.debounce";
import API from "../api";
import {
  ArrowLeft, Loader, Layers, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  Trash2, ZoomIn, ZoomOut, Grid as GridIcon, Eye, EyeOff, Lock, Unlock,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, LayoutTemplate,
  Type, Shapes, Image as ImageIcon, Smile, Palette, BarChart3, Layout,
  Compass, MousePointerClick, Package, Zap, Heading1, Heading2, Pilcrow,
  List, ListOrdered, Quote, SplitSquareHorizontal, Square, Circle, Triangle,
  Hexagon, Minus, Star, Cloud, Sun, Moon, Droplet, ArrowRight,
  ArrowUp, ArrowDown, MoveDiagonal, CornerUpRight, Video, Music, Map, Frame,
  CheckSquare, ToggleLeft, SlidersHorizontal, MessageSquare, AppWindow, DollarSign,
  Users, HelpCircle, Play, GitBranch, Plus, Check, Clock, RotateCcw
} from "lucide-react";

const GRID_SIZE = 20;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.1;

const SIDEBAR_MENU = [
  { id: "typography", label: "Typographie", icon: <Type size={18} />, layout: "list", items: [{ id: "text_h1", label: "Titre principal", icon: <Heading1 size={16} />, type: "text", variant: "h1" }, { id: "text_h2", label: "Sous-titre", icon: <Heading2 size={16} />, type: "text", variant: "h2" }, { id: "text_p", label: "Paragraphe", icon: <Pilcrow size={16} />, type: "text", variant: "p" }, { id: "text_ul", label: "Liste à puces", icon: <List size={16} />, type: "text", variant: "ul" }, { id: "text_ol", label: "Liste numérotée", icon: <ListOrdered size={16} />, type: "text", variant: "ol" }, { id: "text_quote", label: "Citation", icon: <Quote size={16} />, type: "text", variant: "quote" }] },
  { id: "shapes", label: "Formes", icon: <Shapes size={18} />, layout: "grid", items: [{ id: "shape_rect", label: "Rectangle", icon: <Square size={24} />, type: "shape", variant: "rect" }, { id: "shape_circle", label: "Cercle", icon: <Circle size={24} />, type: "shape", variant: "circle" }, { id: "shape_triangle", label: "Triangle", icon: <Triangle size={24} />, type: "shape", variant: "triangle" }, { id: "shape_ellipse", label: "Ellipse", icon: <Circle size={24} style={{ transform: "scaleY(0.6)" }} />, type: "shape", variant: "ellipse" }, { id: "shape_polygon", label: "Polygone", icon: <Hexagon size={24} />, type: "advanced_shape", variant: "polygon" }, { id: "shape_line", label: "Ligne", icon: <Minus size={24} strokeWidth={4} />, type: "shape", variant: "line" }, { id: "shape_star", label: "Étoile", icon: <Star size={24} />, type: "advanced_shape", variant: "star" }, { id: "shape_zap", label: "Éclair", icon: <Zap size={24} />, type: "advanced_shape", variant: "zap" }, { id: "shape_cloud", label: "Nuage", icon: <Cloud size={24} />, type: "advanced_shape", variant: "cloud" }, { id: "arrow_r", label: "Flèche Droite", icon: <ArrowRight size={24} />, type: "advanced_shape", variant: "arrow_r" }, { id: "arrow_double", label: "Double Flèche", icon: <MoveDiagonal size={24} />, type: "advanced_shape", variant: "arrow_double" }] },
  { id: "media", label: "Médias & Conteneurs", icon: <ImageIcon size={18} />, layout: "list", items: [{ id: "media_img", label: "Image (Upload)", icon: <ImageIcon size={16} />, type: "action_image" }, { id: "media_video", label: "Lecteur Vidéo", icon: <Video size={16} />, type: "complex", variant: "video" }, { id: "media_map", label: "Carte (Map)", icon: <Map size={16} />, type: "complex", variant: "map" }, { id: "cont_frame", label: "Frame / Section", icon: <Frame size={16} />, type: "shape", variant: "frame" }] },
  { id: "charts", label: "Graphiques", icon: <BarChart3 size={18} />, layout: "list", items: [{ id: "chart_bar", label: "Graphique Barres", icon: <BarChart3 size={16} />, type: "complex", variant: "chart_bar" }] },
  { id: "layouts", label: "Layouts & Navigation", icon: <Layout size={18} />, layout: "list", items: [{ id: "layout_hero", label: "Hero Section", icon: <LayoutTemplate size={16} />, type: "complex", variant: "hero" }, { id: "nav_menu", label: "Barre de menu", icon: <Minus size={16} />, type: "complex", variant: "nav_menu" }, { id: "nav_tabs", label: "Onglets (Tabs)", icon: <SplitSquareHorizontal size={16} />, type: "complex", variant: "tabs" }] },
  { id: "ui", label: "UI / Composants", icon: <MousePointerClick size={18} />, layout: "list", items: [{ id: "ui_btn", label: "Bouton d'action", icon: <MousePointerClick size={16} />, type: "complex", variant: "button" }, { id: "ui_input", label: "Champ de texte", icon: <Type size={16} />, type: "complex", variant: "input" }, { id: "ui_check", label: "Checkbox", icon: <CheckSquare size={16} />, type: "complex", variant: "checkbox" }, { id: "ui_toggle", label: "Switch Toggle", icon: <ToggleLeft size={16} />, type: "complex", variant: "toggle" }, { id: "ui_slider", label: "Slider / Jauge", icon: <SlidersHorizontal size={16} />, type: "complex", variant: "slider" }, { id: "ui_modal", label: "Fenêtre Modale", icon: <AppWindow size={16} />, type: "complex", variant: "modal" }] },
  { id: "blocks", label: "Blocs Prêts", icon: <Package size={18} />, layout: "list", items: [{ id: "block_card", label: "Carte Produit", icon: <Package size={16} />, type: "complex", variant: "card" }, { id: "block_profile", label: "Profil Utilisateur", icon: <Users size={16} />, type: "complex", variant: "profile" }, { id: "block_pricing", label: "Tableau de Prix", icon: <DollarSign size={16} />, type: "complex", variant: "pricing" }] }
];

const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;
const getObjectLabel = (obj) => {
  if (!obj) return "Objet";
  if (obj.customName) return obj.customName;
  if (obj.type === "i-text" || obj.type === "textbox") return `Texte: "${(obj.text || "").slice(0, 12)}…"`;
  if (obj.type === "rect") return obj.fill === "transparent" ? "Cadre" : "Rectangle";
  if (obj.type === "circle") return "Cercle";
  if (obj.type === "ellipse") return "Ellipse";
  if (obj.type === "triangle") return "Triangle";
  if (obj.type === "polygon") return "Forme Avancée";
  if (obj.type === "line") return "Ligne";
  if (obj.type === "image") return "Image";
  if (obj.type === "group") return "Composant UI";
  return obj.type || "Objet";
};

const PropertiesPanel = ({ selectedObject, canvas, onUpdate }) => {
  const [props, setProps] = useState({});
  useEffect(() => {
    if (!selectedObject) { setProps({}); return; }
    const o = selectedObject; const shadow = o.shadow || {};
    setProps({ left: Math.round(o.left||0), top: Math.round(o.top||0), width: Math.round((o.width||0)*(o.scaleX||1)), height: Math.round((o.height||0)*(o.scaleY||1)), fill: o.fill||"#000000", opacity: Math.round((o.opacity??1)*100), angle: Math.round(o.angle||0), fontSize: o.fontSize||24, fontFamily: o.fontFamily||"Inter", fontWeight: o.fontWeight||"normal", fontStyle: o.fontStyle||"normal", textAlign: o.textAlign||"left", stroke: o.stroke||"#000000", strokeWidth: o.strokeWidth||0, rx: o.rx||0, ry: o.ry||0, backgroundColor: o.backgroundColor||"", boxPaddingTop: o.boxPaddingTop||0, boxPaddingRight: o.boxPaddingRight||0, boxPaddingBottom: o.boxPaddingBottom||0, boxPaddingLeft: o.boxPaddingLeft||0, boxStroke: o.boxStroke||"#000000", boxStrokeWidth: o.boxStrokeWidth||0, shadowEnabled: !!o.shadow, shadowColor: shadow.color||"rgba(0,0,0,0.3)", shadowBlur: shadow.blur||10, shadowOffsetX: shadow.offsetX!==undefined?shadow.offsetX:5, shadowOffsetY: shadow.offsetY!==undefined?shadow.offsetY:5 });
  }, [selectedObject]);
  const apply = (key, value) => { if (!selectedObject||!canvas) return; const o = selectedObject; if (key==="width") o.set("scaleX",value/(o.width||1)); else if (key==="height") o.set("scaleY",value/(o.height||1)); else if (key==="opacity") o.set(key,value/100); else o.set(key,value); o.setCoords(); canvas.renderAll(); onUpdate?.(); setProps(p=>({...p,[key]:value})); };
  const applyPadding = (side, value) => { if (!selectedObject||!canvas) return; const o=selectedObject; const key=`boxPadding${side}`; o.set(key,value); o.set('padding',Math.max(o.boxPaddingTop||0,o.boxPaddingRight||0,o.boxPaddingBottom||0,o.boxPaddingLeft||0)); o.setCoords(); canvas.renderAll(); onUpdate?.(); setProps(p=>({...p,[key]:value})); };
  const applyShadow = (key, value) => { if (!selectedObject||!canvas) return; const newProps={...props,[key]:value}; setProps(newProps); if (!newProps.shadowEnabled) { selectedObject.set("shadow",null); } else { selectedObject.set("shadow",new fabric.Shadow({color:newProps.shadowColor||"rgba(0,0,0,0.3)",blur:newProps.shadowBlur||0,offsetX:newProps.shadowOffsetX||0,offsetY:newProps.shadowOffsetY||0})); } canvas.renderAll(); onUpdate?.(); };
  if (!selectedObject) return (<div className="props-empty"><div className="props-empty-icon"><LayoutTemplate size={32}/></div><p>Sélectionnez un élément sur l'espace de travail pour modifier ses propriétés</p></div>);
  const isText = ["i-text","textbox"].includes(selectedObject.type); const isLine = selectedObject.type==="line"; const isGroup = selectedObject.type==="group";

  // Valeurs sécurisées — jamais undefined (évite "uncontrolled → controlled")
  const v = {
    left:           props.left          ?? 0,
    top:            props.top           ?? 0,
    width:          props.width         ?? 0,
    height:         props.height        ?? 0,
    angle:          props.angle         ?? 0,
    opacity:        props.opacity       ?? 100,
    fontSize:       props.fontSize      ?? 24,
    fontFamily:     props.fontFamily    ?? "Inter",
    fontWeight:     props.fontWeight    ?? "normal",
    fontStyle:      props.fontStyle     ?? "normal",
    textAlign:      props.textAlign     ?? "left",
    fill:           props.fill          ?? "#000000",
    stroke:         props.stroke        ?? "#000000",
    strokeWidth:    props.strokeWidth   ?? 0,
    rx:             props.rx            ?? 0,
    backgroundColor: props.backgroundColor ?? "",
    boxPaddingTop:  props.boxPaddingTop  ?? 0,
    boxPaddingRight: props.boxPaddingRight ?? 0,
    boxPaddingBottom: props.boxPaddingBottom ?? 0,
    boxPaddingLeft: props.boxPaddingLeft ?? 0,
    boxStroke:      props.boxStroke     ?? "#000000",
    boxStrokeWidth: props.boxStrokeWidth ?? 0,
    shadowEnabled:  props.shadowEnabled ?? false,
    shadowColor:    props.shadowColor   ?? "rgba(0,0,0,0.3)",
    shadowBlur:     props.shadowBlur    ?? 10,
    shadowOffsetX:  props.shadowOffsetX ?? 5,
    shadowOffsetY:  props.shadowOffsetY ?? 5,
  };

  return (
    <div className="props-content fade-in">
      <section className="props-section"><h4 className="props-section-title">Dimensions & Position</h4><div className="props-grid-2"><PropField label="X" value={v.left} onChange={val=>apply("left",+val)} type="number"/><PropField label="Y" value={v.top} onChange={val=>apply("top",+val)} type="number"/><PropField label="L" value={v.width} onChange={val=>apply("width",+val)} type="number"/><PropField label="H" value={v.height} onChange={val=>apply("height",+val)} type="number"/><PropField label="Angle" value={v.angle} onChange={val=>apply("angle",+val)} type="number"/><PropField label="Opacité %" value={v.opacity} onChange={val=>apply("opacity",+val)} type="number" min="0" max="100"/></div></section>
      {isText && (<section className="props-section"><h4 className="props-section-title">Typographie</h4>
        <div className="props-row"><select value={v.fontFamily} onChange={e=>apply("fontFamily",e.target.value)} className="props-select w-full">{["Inter","Arial","Georgia","Courier New","Verdana","Trebuchet MS","Impact"].map(f=><option key={f} value={f}>{f}</option>)}</select></div>
        <div className="props-row"><label className="props-label">Taille</label><input type="number" value={v.fontSize} min="6" max="200" onChange={e=>apply("fontSize",+e.target.value)} className="props-input-sm"/></div>
        <div className="props-row"><div className="btn-group"><button className={`props-toggle ${v.fontWeight==="bold"?"active":""}`} onClick={()=>apply("fontWeight",v.fontWeight==="bold"?"normal":"bold")}><Bold size={14}/></button><button className={`props-toggle ${v.fontStyle==="italic"?"active":""}`} onClick={()=>apply("fontStyle",v.fontStyle==="italic"?"normal":"italic")}><Italic size={14}/></button></div><div className="btn-group">{[["left",<AlignLeft size={14}/>],["center",<AlignCenter size={14}/>],["right",<AlignRight size={14}/>]].map(([a,icon])=>(<button key={a} className={`props-toggle ${v.textAlign===a?"active":""}`} onClick={()=>apply("textAlign",a)}>{icon}</button>))}</div></div>
        <div className="props-row"><label className="props-label">Couleur du texte</label><div className="color-picker-wrapper color-picker-sm"><input type="color" value={v.fill.startsWith("#")?v.fill:"#000000"} onChange={e=>apply("fill",e.target.value)} className="props-color"/></div></div>
        <div className="props-row"><label className="props-label">Contour du texte</label><div style={{display:"flex",gap:8,alignItems:"center"}}><div className="color-picker-wrapper color-picker-sm"><input type="color" value={v.stroke.startsWith("#")?v.stroke:"#000000"} onChange={e=>apply("stroke",e.target.value)} className="props-color"/></div><input type="number" value={v.strokeWidth} min="0" max="10" onChange={e=>apply("strokeWidth",+e.target.value)} className="props-input-sm"/></div></div>
      </section>)}
      {isText && (<section className="props-section"><h4 className="props-section-title">Fond de la boîte de texte</h4>
        <div className="props-row"><label className="props-label">Activer le fond</label><input type="checkbox" checked={!!v.backgroundColor} onChange={e=>apply("backgroundColor",e.target.checked?"#e2e8f0":"")} className="custom-checkbox"/></div>
        {!!v.backgroundColor&&(<div className="fade-in">
          <div className="props-row"><label className="props-label">Couleur de fond</label><div className="color-picker-wrapper color-picker-sm"><input type="color" value={v.backgroundColor} onChange={e=>apply("backgroundColor",e.target.value)} className="props-color"/></div></div>
          <div className="props-row" style={{marginBottom:"4px"}}><label className="props-label" style={{fontSize:"11px",color:"var(--text-muted)"}}>Padding (Haut, Dr, Bas, Ga)</label></div>
          <div className="props-grid-4"><input type="number" value={v.boxPaddingTop} onChange={e=>applyPadding("Top",+e.target.value)} className="props-input-xs"/><input type="number" value={v.boxPaddingRight} onChange={e=>applyPadding("Right",+e.target.value)} className="props-input-xs"/><input type="number" value={v.boxPaddingBottom} onChange={e=>applyPadding("Bottom",+e.target.value)} className="props-input-xs"/><input type="number" value={v.boxPaddingLeft} onChange={e=>applyPadding("Left",+e.target.value)} className="props-input-xs"/></div>
          <div className="props-row"><label className="props-label">Bordure (Box)</label><div style={{display:"flex",gap:8,alignItems:"center"}}><div className="color-picker-wrapper color-picker-sm"><input type="color" value={v.boxStroke.startsWith("#")?v.boxStroke:"#000000"} onChange={e=>apply("boxStroke",e.target.value)} className="props-color"/></div><input type="number" value={v.boxStrokeWidth} min="0" max="50" onChange={e=>apply("boxStrokeWidth",+e.target.value)} className="props-input-sm"/></div></div>
          <div className="props-row"><label className="props-label">Rayon (Arrondi)</label><input type="number" value={v.rx} min="0" max="200" onChange={e=>{apply("rx",+e.target.value);apply("ry",+e.target.value);}} className="props-input-sm"/></div>
        </div>)}
      </section>)}
      {!isGroup&&!isText&&(<section className="props-section"><h4 className="props-section-title">Apparence</h4>
        {!isLine&&(<div className="props-row"><label className="props-label">Remplissage</label><div className="color-picker-wrapper"><input type="color" value={v.fill.startsWith("#")?v.fill:"#000000"} onChange={e=>apply("fill",e.target.value)} className="props-color"/><span className="color-hex">{v.fill.startsWith("#")?v.fill:"N/A"}</span></div></div>)}
        <div className="props-row"><label className="props-label">Contour</label><div style={{display:"flex",gap:8,alignItems:"center"}}><div className="color-picker-wrapper color-picker-sm"><input type="color" value={v.stroke.startsWith("#")?v.stroke:"#000000"} onChange={e=>apply("stroke",e.target.value)} className="props-color"/></div><input type="number" value={v.strokeWidth} min="0" max="50" onChange={e=>apply("strokeWidth",+e.target.value)} className="props-input-sm"/></div></div>
        {selectedObject.type==="rect"&&(<div className="props-row"><label className="props-label">Rayon (Arrondi)</label><input type="number" value={v.rx} min="0" max="200" onChange={e=>{apply("rx",+e.target.value);apply("ry",+e.target.value);}} className="props-input-sm"/></div>)}
      </section>)}
      <section className="props-section">
        <div className="props-row" style={{marginBottom:v.shadowEnabled?"12px":"0",borderBottom:"1px solid var(--border)",paddingBottom:"8px"}}><h4 className="props-section-title" style={{borderBottom:"none",marginBottom:0,paddingBottom:0}}>Ombre portée</h4><input type="checkbox" checked={v.shadowEnabled} onChange={e=>applyShadow("shadowEnabled",e.target.checked)} className="custom-checkbox"/></div>
        {v.shadowEnabled&&(<div className="fade-in">
          <div className="props-row"><label className="props-label">Couleur de l'ombre</label><div className="color-picker-wrapper color-picker-sm"><input type="color" value={v.shadowColor.startsWith("#")?v.shadowColor:"#000000"} onChange={e=>applyShadow("shadowColor",e.target.value)} className="props-color"/></div></div>
          <div className="props-row"><label className="props-label">Flou (Blur)</label><input type="number" value={v.shadowBlur} min="0" max="100" onChange={e=>applyShadow("shadowBlur",+e.target.value)} className="props-input-sm"/></div>
          <div className="props-grid-2"><PropField label="Décalage X" value={v.shadowOffsetX} onChange={val=>applyShadow("shadowOffsetX",+val)} type="number"/><PropField label="Décalage Y" value={v.shadowOffsetY} onChange={val=>applyShadow("shadowOffsetY",+val)} type="number"/></div>
        </div>)}
      </section>
    </div>
  );
};

const PropField = ({ label, value, onChange, type = "text", min, max }) => (<div className="prop-field"><span className="prop-field-label">{label}</span><input className="prop-field-input" type={type} value={value??""} min={min} max={max} onChange={e=>onChange(e.target.value)}/></div>);

const LayersPanel = ({ canvas, selectedObject, onSelectObject, refreshKey }) => {
  const [layers, setLayers] = useState([]);
  const refresh = useCallback(() => { if (!canvas) return; setLayers(canvas.getObjects().slice().reverse()); }, [canvas]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  const toggleVisibility = (obj) => { obj.set("visible",!obj.visible); canvas.renderAll(); refresh(); };
  const toggleLock = (obj) => { const locked=!obj.lockMovementX; obj.set({lockMovementX:locked,lockMovementY:locked,lockScalingX:locked,lockScalingY:locked,lockRotation:locked,selectable:!locked}); canvas.renderAll(); refresh(); };
  const deleteObj = (obj) => { canvas.remove(obj); canvas.renderAll(); };
  return (<div className="layers-panel fade-in"><div className="layers-order-btns"><button title="Premier plan" onClick={()=>{canvas?.bringObjectToFront(selectedObject);canvas?.renderAll();refresh();}} disabled={!selectedObject}><ChevronsUp size={16}/></button><button title="Avancer" onClick={()=>{canvas?.bringObjectForward(selectedObject);canvas?.renderAll();refresh();}} disabled={!selectedObject}><ChevronUp size={16}/></button><button title="Reculer" onClick={()=>{canvas?.sendObjectBackwards(selectedObject);canvas?.renderAll();refresh();}} disabled={!selectedObject}><ChevronDown size={16}/></button><button title="Arrière-plan" onClick={()=>{canvas?.sendObjectToBack(selectedObject);canvas?.renderAll();refresh();}} disabled={!selectedObject}><ChevronsDown size={16}/></button></div><div className="layers-list">{layers.length===0&&<div className="layers-empty">Aucun calque</div>}{layers.map((obj,i)=>(<div key={i} className={`layer-item ${obj===selectedObject?"selected":""}`} onClick={()=>{canvas.setActiveObject(obj);canvas.renderAll();onSelectObject(obj);}}><span className="layer-thumb" style={{background:obj.type==="line"?obj.stroke:(typeof obj.fill==="string"?obj.fill:"#e2e8f0")}}/><span className="layer-name">{getObjectLabel(obj)}</span><div className="layer-actions"><button onClick={e=>{e.stopPropagation();toggleVisibility(obj);}}>{obj.visible!==false?<Eye size={14}/>:<EyeOff size={14} color="#94a3b8"/>}</button><button onClick={e=>{e.stopPropagation();toggleLock(obj);}}>{obj.lockMovementX?<Lock size={14} color="#f59e0b"/>:<Unlock size={14}/>}</button><button onClick={e=>{e.stopPropagation();deleteObj(obj);}}><Trash2 size={14} className="icon-danger"/></button></div></div>))}</div></div>);
};

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
const DesignEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const gridLinesRef = useRef([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Détection robuste : gère "rôle" (accent) et "role" (sans accent)
  const userRole   = (user?.rôle || user?.role || "").toLowerCase();
  const isDesigner = userRole === "designer";
  const isClient   = userRole === "client";

  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [designData, setDesignData] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Chargement...");
  const [selectedObj, setSelectedObj] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [rightTab, setRightTab] = useState("props");
  const [layersKey, setLayersKey] = useState(0);
  const [openMenu, setOpenMenu] = useState("typography");
  const [currentVersionNum, setCurrentVersionNum] = useState(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [versionSuccess, setVersionSuccess] = useState(false);
  const [versions, setVersions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [deletingVersionId, setDeletingVersionId] = useState(null);

  // ── PATCH 2 : États validation client ──────────────────────────
  const [validating, setValidating]           = useState(false);
  const [validationDone, setValidationDone]   = useState(null);   // "validé" | null
  const [validationToast, setValidationToast] = useState(null);   // { type, msg }

  const dropdownRef = useRef(null);
  const maquetteIdRef = useRef(null);
  const currentVersionIdRef = useRef(null);
  const isSwitchingVersion = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const lockCanvasObjects = useCallback((canvas) => {
    canvas.selection = false; canvas.skipTargetFind = true;
    canvas.forEachObject((obj) => { obj.selectable=false; obj.evented=false; obj.hasControls=false; obj.hasBorders=false; obj.lockMovementX=true; obj.lockMovementY=true; obj.lockRotation=true; obj.lockScalingX=true; obj.lockScalingY=true; });
    canvas.renderAll();
  }, []);

  useEffect(() => {
    if (fabric.Textbox && !fabric.Textbox.prototype.__customRenderBgSet) {
      fabric.Textbox.prototype._renderBackground = function(ctx) {
        if (!this.backgroundColor && !this.boxStroke) return;
        const pTop=this.boxPaddingTop||0, pRight=this.boxPaddingRight||0, pBottom=this.boxPaddingBottom||0, pLeft=this.boxPaddingLeft||0;
        const w=this.width+pLeft+pRight, h=this.height+pTop+pBottom;
        const x=-this.width/2-pLeft, y=-this.height/2-pTop, rx=this.rx||0, ry=this.ry||0;
        ctx.beginPath(); ctx.moveTo(x+rx,y); ctx.lineTo(x+w-rx,y); ctx.quadraticCurveTo(x+w,y,x+w,y+ry); ctx.lineTo(x+w,y+h-ry); ctx.quadraticCurveTo(x+w,y+h,x+w-rx,y+h); ctx.lineTo(x+rx,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-ry); ctx.lineTo(x,y+ry); ctx.quadraticCurveTo(x,y,x+rx,y); ctx.closePath();
        if (this.backgroundColor) { ctx.fillStyle=this.backgroundColor; ctx.fill(); }
        if (this.boxStroke && this.boxStrokeWidth) { ctx.strokeStyle=this.boxStroke; ctx.lineWidth=this.boxStrokeWidth; ctx.stroke(); }
      };
      fabric.Textbox.prototype.__customRenderBgSet = true;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [resMaquette, resVersion] = await Promise.all([API.get(`/maquettes/${id}`), API.get(`/maquettes/${id}/latest-version`)]);
        if (isMounted) { setDesignData({ maquette: resMaquette.data, version: resVersion.data }); setCurrentVersionNum(resVersion.data.numéro_version); maquetteIdRef.current = resMaquette.data._id; currentVersionIdRef.current = resVersion.data._id; }
      } catch (err) { if (isMounted) setSaveStatus("Erreur de chargement des données"); }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id]);

  // ── Corrections transmises (designer) ────────────────────────
  const [corrections, setCorrections]         = useState([]);
  const [showCorrections, setShowCorrections] = useState(false);

  useEffect(() => {
    if (!isDesigner || !id) return;
    const fetchCorrections = async () => {
      try {
        const { data } = await API.get("/validations/corrections-designer");
        // Filtrer celles qui concernent cette maquette
        const filtered = Array.isArray(data)
          ? data.filter(c => c.version_id?.id_maquette?._id === id || c.version_id?.id_maquette === id)
          : [];
        setCorrections(filtered);
      } catch (_) {}
    };
    fetchCorrections();
  }, [id, isDesigner]);

  const fetchVersions = async () => {
    if (!maquetteIdRef.current) return;
    try { const { data } = await API.get(`/versions/maquette/${maquetteIdRef.current}`); setVersions(data); }
    catch (err) { console.error("Erreur chargement versions", err); }
  };

  useEffect(() => {
    if (!designData?.maquette?._id) return;
    setSaveStatus("Initialisation…");
    wrapperRef.current.innerHTML = "";
    const el = document.createElement("canvas"); wrapperRef.current.appendChild(el); canvasRef.current = el;
    const canvas = new fabric.Canvas(el, { width: 1000, height: 700, backgroundColor: "#ffffff", preserveObjectStacking: true });
    setFabricCanvas(canvas);
    const initCanvasState = async () => {
      try {
        if (designData.version?.contenu?.objects?.length) { const loadRes = canvas.loadFromJSON(designData.version.contenu); if (loadRes && typeof loadRes.then === "function") await loadRes; }
        canvas.renderAll(); setSaveStatus("À jour ☁️");
        if (!isDesigner) lockCanvasObjects(canvas);
      } catch { setSaveStatus("Erreur d'affichage"); }
    };
    initCanvasState();
    return () => { canvas.dispose(); setFabricCanvas(null); };
  }, [designData?.maquette?._id]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const updateSelection = (e) => { setSelectedObj(e.selected?.[0]||fabricCanvas.getActiveObject()); setLayersKey(k=>k+1); };
    fabricCanvas.on("selection:created", updateSelection); fabricCanvas.on("selection:updated", updateSelection); fabricCanvas.on("selection:cleared", ()=>setSelectedObj(null));
    fabricCanvas.on("object:modified", ()=>setLayersKey(k=>k+1)); fabricCanvas.on("object:added", ()=>setLayersKey(k=>k+1)); fabricCanvas.on("object:removed", ()=>setLayersKey(k=>k+1));
    fabricCanvas.on("object:moving", (e) => { if (!snapEnabled) return; e.target.set({left:snapToGrid(e.target.left,GRID_SIZE),top:snapToGrid(e.target.top,GRID_SIZE)}); });
    fabricCanvas.on("mouse:wheel", (opt) => { opt.e.preventDefault(); if (isDesigner) { let z=fabricCanvas.getZoom(); z=opt.e.deltaY>0?Math.max(ZOOM_MIN,z-ZOOM_STEP):Math.min(ZOOM_MAX,z+ZOOM_STEP); fabricCanvas.zoomToPoint({x:opt.e.offsetX,y:opt.e.offsetY},z); setZoom(Math.round(z*100)); } });
    return () => fabricCanvas.off();
  }, [fabricCanvas, snapEnabled]);

  useEffect(() => {
    if (!fabricCanvas) return;
    gridLinesRef.current.forEach(l=>fabricCanvas.remove(l)); gridLinesRef.current = [];
    if (!gridEnabled) { fabricCanvas.renderAll(); return; }
    const lines = [];
    for (let x=0; x<=fabricCanvas.width; x+=GRID_SIZE) lines.push(new fabric.Line([x,0,x,fabricCanvas.height],{stroke:"#e2e8f0",strokeWidth:1,selectable:false,evented:false,excludeFromExport:true}));
    for (let y=0; y<=fabricCanvas.height; y+=GRID_SIZE) lines.push(new fabric.Line([0,y,fabricCanvas.width,y],{stroke:"#e2e8f0",strokeWidth:1,selectable:false,evented:false,excludeFromExport:true}));
    lines.forEach(l=>{fabricCanvas.add(l);fabricCanvas.sendObjectToBack(l);}); gridLinesRef.current = lines; fabricCanvas.renderAll();
  }, [fabricCanvas, gridEnabled]);

  const triggerSave = async (c, vId) => {
    if (isSwitchingVersion.current) return; if (!vId||!isDesigner) return;
    setSaveStatus("Sauvegarde…");
    try { const json = c.toJSON(["excludeFromExport","isPlaceholder","placeholderLabel","customName","boxPaddingTop","boxPaddingRight","boxPaddingBottom","boxPaddingLeft","boxStroke","boxStrokeWidth","rx","ry"]); json.objects=(json.objects||[]).filter(o=>!o.excludeFromExport); await API.put(`/versions/${vId}`,{contenu:json}); setSaveStatus("À jour ☁️"); }
    catch { setSaveStatus("Erreur ❌"); }
  };

  const debouncedSave = useRef(debounce((c,v)=>triggerSave(c,v),1000)).current;

  useEffect(() => {
    if (!fabricCanvas||!designData?.version?._id||!isDesigner) return;
    const vId = designData.version._id;
    const handleChange = () => { if (isSwitchingVersion.current) return; debouncedSave(fabricCanvas,vId); };
    const handleRemove = () => { if (isSwitchingVersion.current) return; debouncedSave.cancel(); triggerSave(fabricCanvas,vId); };
    fabricCanvas.on("object:modified",handleChange); fabricCanvas.on("object:added",handleChange); fabricCanvas.on("object:removed",handleRemove);
    return () => { fabricCanvas.off("object:modified",handleChange); fabricCanvas.off("object:added",handleChange); fabricCanvas.off("object:removed",handleRemove); };
  }, [fabricCanvas, designData, debouncedSave, isDesigner]);

  useEffect(() => {
    const handler = (e) => {
      if (!isDesigner) return; const tag = document.activeElement?.tagName; if (tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
      if (e.key==="Delete"||e.key==="Backspace") { const obj=fabricCanvas?.getActiveObject(); if (obj&&!obj.isEditing) { fabricCanvas.remove(obj); setSelectedObj(null); } }
      if ((e.metaKey||e.ctrlKey)&&e.key==="d") { e.preventDefault(); const obj=fabricCanvas?.getActiveObject(); if (!obj) return; obj.clone(clone=>{clone.set({left:obj.left+20,top:obj.top+20});fabricCanvas.add(clone);fabricCanvas.setActiveObject(clone);fabricCanvas.renderAll();}); }
    };
    window.addEventListener("keydown",handler); return ()=>window.removeEventListener("keydown",handler);
  }, [fabricCanvas, isDesigner]);

  const handleNouvelleVersion = async () => {
    if (!fabricCanvas||!maquetteIdRef.current||creatingVersion||!isDesigner) return; setCreatingVersion(true);
    try { const json=fabricCanvas.toJSON(["excludeFromExport","isPlaceholder","placeholderLabel","customName","boxPaddingTop","boxPaddingRight","boxPaddingBottom","boxPaddingLeft","boxStroke","boxStrokeWidth","rx","ry"]); const {data}=await API.post("/versions",{contenu:json,id_maquette:maquetteIdRef.current,commentaire:"Nouvelle version manuelle"}); const newVersion=data.version; setCurrentVersionNum(newVersion.numéro_version); currentVersionIdRef.current=newVersion._id; setSaveStatus("À jour ☁️"); setDesignData(prev=>({...prev,version:newVersion})); setVersionSuccess(true); setTimeout(()=>setVersionSuccess(false),2000); await fetchVersions(); }
    catch { setSaveStatus("Erreur création version ❌"); } finally { setCreatingVersion(false); }
  };

  const handleLoadVersion = async (version) => {
    if (!fabricCanvas||loadingVersion) return; setDropdownOpen(false); setLoadingVersion(true); isSwitchingVersion.current=true; debouncedSave.cancel();
    try {
      const contenu = version.contenu;
      if (contenu?.objects?.length>0) { const loadRes=fabricCanvas.loadFromJSON(contenu); if (loadRes&&typeof loadRes.then==="function") await loadRes; fabricCanvas.renderAll(); }
      else { fabricCanvas.remove(...fabricCanvas.getObjects()); fabricCanvas.backgroundColor="#ffffff"; fabricCanvas.renderAll(); }
      if (!isDesigner) lockCanvasObjects(fabricCanvas);
      setCurrentVersionNum(version.numéro_version); currentVersionIdRef.current=version._id; setDesignData(prev=>({...prev,version})); setSaveStatus(`Version ${version.numéro_version} chargée`);
      setValidationDone(null); // reset validation state on version switch
    } catch (err) { console.error("Erreur chargement version",err); setSaveStatus("Erreur chargement version ❌"); }
    finally { setLoadingVersion(false); setTimeout(()=>{isSwitchingVersion.current=false;},300); }
  };

  const handleToggleDropdown = async () => { if (!dropdownOpen) await fetchVersions(); setDropdownOpen(prev=>!prev); };

  const handleReset = async () => {
    if (!fabricCanvas||!designData?.version||!isDesigner) return;
    if (!window.confirm("Voulez-vous annuler toutes vos modifications non sauvegardées pour revenir à l'état sauvegardé de cette version ?")) return;
    setSaveStatus("Réinitialisation..."); isSwitchingVersion.current=true; debouncedSave.cancel();
    try {
      const contenu=designData.version.contenu;
      if (contenu?.objects?.length>0) { const loadRes=fabricCanvas.loadFromJSON(contenu); if (loadRes&&typeof loadRes.then==="function") await loadRes; } else { fabricCanvas.remove(...fabricCanvas.getObjects()); fabricCanvas.backgroundColor="#ffffff"; }
      fabricCanvas.renderAll();
      try { const json=fabricCanvas.toJSON(["excludeFromExport","isPlaceholder","placeholderLabel","customName","boxPaddingTop","boxPaddingRight","boxPaddingBottom","boxPaddingLeft","boxStroke","boxStrokeWidth","rx","ry"]); json.objects=(json.objects||[]).filter(o=>!o.excludeFromExport); await API.put(`/versions/${designData?.version?._id}`,{contenu:json}); setSaveStatus("À jour ☁️"); } catch { setSaveStatus("Erreur ❌"); }
    } catch { setSaveStatus("Erreur réinitialisation ❌"); } finally { setTimeout(()=>{isSwitchingVersion.current=false;},300); }
  };

  const handleDeleteVersion = async (e, versionId) => {
    e.stopPropagation(); if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette version ?")) return;
    setDeletingVersionId(versionId);
    try { await API.delete(`/versions/${versionId}`); await fetchVersions(); if (versionId===currentVersionIdRef.current) { const {data:latestVersion}=await API.get(`/maquettes/${maquetteIdRef.current}/latest-version`); await handleLoadVersion(latestVersion); } }
    catch (err) { alert(err.response?.data?.message||"Erreur lors de la suppression de la version."); }
    finally { setDeletingVersionId(null); }
  };

  // ── PATCH 3 : handleValider — client valide la version courante ──
  const handleValider = async () => {
    // Double guard : impossible si déjà validé, en cours, ou données manquantes
    if (!designData || validating || validationDone === "validé") return;
    const maquetteId = designData.maquette?._id;
    const versionId  = currentVersionIdRef.current;
    const userId     = user?.id || user?._id;

    if (!maquetteId || !versionId) {
      setValidationToast({ type: "error", msg: "❌ Données manquantes, impossible de valider." });
      setTimeout(() => setValidationToast(null), 4000);
      return;
    }

    const ok = window.confirm(
      `Confirmer la validation de la version ${currentVersionNum} ?\n\n✅ Cette action est définitive.\nLe projet sera marqué comme "Validé".`
    );
    if (!ok) return;

    setValidating(true);
    try {
      await API.post("/validations", {
        maquette_id: maquetteId,
        version_id:  versionId,
        client_id:   userId,
        statut:      "validé",
      });
      setValidationDone("validé");
      setValidationToast({ type: "success", msg: `✅ Version ${currentVersionNum} validée ! Projet marqué Validé.` });
      setTimeout(() => setValidationToast(null), 5000);
    } catch (err) {
      console.error("Validation error:", err);
      setValidationToast({ type: "error", msg: `❌ ${err.response?.data?.message || "Erreur lors de la validation."}` });
      setTimeout(() => setValidationToast(null), 5000);
    } finally {
      setValidating(false);
    }
  };

  // ── États popup Rejeter ────────────────────────────────────────
  const [rejetModal, setRejetModal]           = useState(false);
  const [rejetElements, setRejetElements]     = useState([]); // [{ id_element, label_element, commentaire_client }]
  const [rejetSubmitting, setRejetSubmitting] = useState(false);

  // Ouvre le popup rejet en extrayant les éléments du canvas
  const openRejetModal = () => {
    if (!fabricCanvas) return;
    const objets = fabricCanvas.getObjects().filter(o => !o.excludeFromExport && o.visible !== false);

    const elements = objets.map((obj, i) => {
      // ── Miniature : render l'objet seul sur un petit canvas off-screen ──
      let thumbnail = "";
      try {
        const bounds  = obj.getBoundingRect(true);
        const THUMB_W = 80;
        const THUMB_H = 48;
        const scaleX  = THUMB_W  / Math.max(bounds.width,  1);
        const scaleY  = THUMB_H  / Math.max(bounds.height, 1);
        const scale   = Math.min(scaleX, scaleY, 1);
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width  = THUMB_W;
        tmpCanvas.height = THUMB_H;
        const ctx = tmpCanvas.getContext("2d");
        ctx.fillStyle = "#f0f2f5";
        ctx.fillRect(0, 0, THUMB_W, THUMB_H);
        const offX = (THUMB_W  - bounds.width  * scale) / 2 - bounds.left * scale;
        const offY = (THUMB_H  - bounds.height * scale) / 2 - bounds.top  * scale;
        ctx.save();
        ctx.translate(offX, offY);
        ctx.scale(scale, scale);
        obj.render(ctx);
        ctx.restore();
        thumbnail = tmpCanvas.toDataURL("image/png");
      } catch (_) {}

      // ── Couleur principale ──
      const couleur = (typeof obj.fill === "string" && obj.fill && obj.fill !== "transparent")
        ? obj.fill : (obj.stroke || "#94A3B8");

      // ── Contenu texte ──
      const texte = (obj.type === "i-text" || obj.type === "textbox")
        ? (obj.text || "").slice(0, 50) : "";

      // ── Icône selon type ──
      const typeIcon = { "i-text":"T", "textbox":"T", "rect":"▭", "circle":"◯", "ellipse":"◯", "triangle":"△", "line":"—", "image":"🖼", "group":"⊞" }[obj.type] || "◆";

      return {
        id_element:         obj.customName || obj.type + "_" + i,
        label_element:      obj.customName || getObjectLabel(obj),
        commentaire_client: "",
        _thumbnail: thumbnail,
        _couleur:   couleur,
        _texte:     texte,
        _typeIcon:  typeIcon,
        _type:      obj.type,
      };
    });

    setRejetElements(elements);
    setRejetModal(true);
  };

  const handleRejetSubmit = async () => {
    if (!designData || rejetSubmitting) return;
    const maquetteId = designData.maquette?._id;
    const versionId  = currentVersionIdRef.current;
    const userId     = user?.id || user?._id;
    if (!maquetteId || !versionId) return;

    setRejetSubmitting(true);
    try {
      await API.post("/validations", {
        maquette_id:   maquetteId,
        version_id:    versionId,
        client_id:     userId,
        statut:        "à corriger",
        commentaires:  rejetElements.map(({ id_element, label_element, commentaire_client }) =>
          ({ id_element, label_element, commentaire_client })
        ), // ✅ strip _thumbnail/_couleur/_texte — champs visuels uniquement
      });
      setRejetModal(false);
      setValidationDone("à corriger");
      setValidationToast({ type: "info", msg: "📨 Rejet envoyé à l'admin pour modération." });
      setTimeout(() => setValidationToast(null), 5000);
    } catch (err) {
      setValidationToast({ type: "error", msg: `❌ ${err.response?.data?.message || "Erreur."}` });
      setTimeout(() => setValidationToast(null), 5000);
    } finally {
      setRejetSubmitting(false);
    }
  };

  const formatDate = (dateStr) => { if (!dateStr) return ""; return new Date(dateStr).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); };

  const addElementToCanvas = (item, x=100, y=100) => {
    if (!fabricCanvas||!isDesigner) return; let obj;
    if (item.type==="text") { const tc={left:x,top:y,fill:"#0f172a",fontFamily:"Inter",width:300}; if (item.variant==="h1") obj=new fabric.Textbox("Grand Titre",{...tc,fontSize:48,fontWeight:"bold",width:400}); else if (item.variant==="h2") obj=new fabric.Textbox("Sous-titre",{...tc,fontSize:32,fontWeight:"600",fill:"#334155"}); else if (item.variant==="p") obj=new fabric.Textbox("Ceci est un paragraphe de texte standard. Éditez-le.",{...tc,fontSize:16}); else if (item.variant==="ul") obj=new fabric.Textbox("• Élément 1\n• Élément 2\n• Élément 3",{...tc,fontSize:18}); else if (item.variant==="ol") obj=new fabric.Textbox("1. Premier point\n2. Deuxième point",{...tc,fontSize:18}); else if (item.variant==="quote") obj=new fabric.Textbox('"Citation inspirante."',{...tc,fontSize:20,fontStyle:"italic",fill:"#64748b"}); }
    else if (item.type==="shape") { if (item.variant==="rect") obj=new fabric.Rect({left:x,top:y,fill:"#6366f1",width:120,height:120,rx:8,ry:8}); else if (item.variant==="circle") obj=new fabric.Circle({left:x,top:y,fill:"#ec4899",radius:60}); else if (item.variant==="triangle") obj=new fabric.Triangle({left:x,top:y,fill:"#10b981",width:120,height:120}); else if (item.variant==="ellipse") obj=new fabric.Ellipse({left:x,top:y,fill:"#f59e0b",rx:80,ry:50}); else if (item.variant==="line") obj=new fabric.Line([0,0,200,0],{stroke:"#334155",strokeWidth:4,left:x,top:y}); else if (item.variant==="frame") obj=new fabric.Rect({left:x,top:y,fill:"transparent",stroke:"#cbd5e1",strokeDashArray:[8,8],strokeWidth:2,width:300,height:200,rx:4,ry:4}); }
    else if (item.type==="advanced_shape") { if (item.variant==="polygon") obj=new fabric.Polygon([{x:25,y:0},{x:75,y:0},{x:100,y:43},{x:75,y:86},{x:25,y:86},{x:0,y:43}],{left:x,top:y,fill:"#8b5cf6"}); else if (item.variant==="star") obj=new fabric.Polygon([{x:50,y:0},{x:61,y:35},{x:98,y:35},{x:68,y:57},{x:79,y:91},{x:50,y:70},{x:21,y:91},{x:32,y:57},{x:2,y:35},{x:39,y:35}],{left:x,top:y,fill:"#f59e0b"}); else if (item.variant==="zap") obj=new fabric.Polygon([{x:40,y:0},{x:0,y:50},{x:30,y:50},{x:20,y:100},{x:60,y:40},{x:30,y:40}],{left:x,top:y,fill:"#eab308"}); else if (item.variant==="arrow_r") obj=new fabric.Polygon([{x:0,y:20},{x:50,y:20},{x:50,y:0},{x:80,y:30},{x:50,y:60},{x:50,y:40},{x:0,y:40}],{left:x,top:y,fill:"#ef4444"}); else if (item.variant==="arrow_double") obj=new fabric.Polygon([{x:30,y:20},{x:70,y:20},{x:70,y:0},{x:100,y:30},{x:70,y:60},{x:70,y:40},{x:30,y:40},{x:30,y:60},{x:0,y:30},{x:30,y:0}],{left:x,top:y,fill:"#ef4444"}); else if (item.variant==="cloud") obj=new fabric.Path("M 25 60 a 20 20 0 0 1 0 -40 a 25 25 0 0 1 50 0 a 20 20 0 0 1 0 40 Z",{left:x,top:y,fill:"#38bdf8"}); }
    else if (item.type==="complex") {
      let elements=[];
      if (item.variant==="button") { const bg=new fabric.Rect({width:140,height:45,rx:8,ry:8,fill:"#4f46e5",originX:"center",originY:"center"}); const txt=new fabric.Text("Bouton",{fontSize:16,fill:"#ffffff",fontFamily:"Inter",fontWeight:"600",originX:"center",originY:"center"}); elements=[bg,txt]; }
      else if (item.variant==="input") { const bg=new fabric.Rect({width:250,height:45,rx:6,ry:6,fill:"#ffffff",stroke:"#cbd5e1",strokeWidth:1,originX:"center",originY:"center"}); const txt=new fabric.Text("Tapez ici...",{fontSize:14,fill:"#94a3b8",fontFamily:"Inter",originX:"left",originY:"center",left:-110}); elements=[bg,txt]; }
      else if (item.variant==="toggle") { const bg=new fabric.Rect({width:50,height:26,rx:13,ry:13,fill:"#10b981",originX:"center",originY:"center"}); const circle=new fabric.Circle({radius:10,fill:"#ffffff",originX:"center",originY:"center",left:10}); elements=[bg,circle]; }
      else if (item.variant==="checkbox") { const bg=new fabric.Rect({width:24,height:24,rx:4,ry:4,fill:"#4f46e5",originX:"center",originY:"center"}); const check=new fabric.Text("✓",{fontSize:16,fill:"#ffffff",originX:"center",originY:"center",top:1}); const label=new fabric.Text("Option",{fontSize:14,fill:"#0f172a",fontFamily:"Inter",originX:"left",originY:"center",left:20}); elements=[bg,check,label]; }
      else if (item.variant==="slider") { const line=new fabric.Line([-75,0,75,0],{stroke:"#cbd5e1",strokeWidth:4}); const lineActive=new fabric.Line([-75,0,0,0],{stroke:"#4f46e5",strokeWidth:4}); const handle=new fabric.Circle({radius:10,fill:"#ffffff",stroke:"#4f46e5",strokeWidth:2,originX:"center",originY:"center"}); elements=[line,lineActive,handle]; }
      else if (item.variant==="video") { const bg=new fabric.Rect({width:320,height:180,fill:"#1e293b",rx:8,ry:8,originX:"center",originY:"center"}); const playBtn=new fabric.Circle({radius:30,fill:"rgba(255,255,255,0.2)",originX:"center",originY:"center"}); const playIcon=new fabric.Triangle({width:20,height:20,fill:"#ffffff",originX:"center",originY:"center",left:4,angle:90}); elements=[bg,playBtn,playIcon]; }
      else if (item.variant==="map") { const bg=new fabric.Rect({width:300,height:200,fill:"#e0f2fe",rx:8,ry:8,originX:"center",originY:"center"}); const pin=new fabric.Circle({radius:15,fill:"#ef4444",originX:"center",originY:"center",top:-10}); const shadow=new fabric.Ellipse({rx:10,ry:4,fill:"rgba(0,0,0,0.2)",originX:"center",originY:"center",top:10}); elements=[bg,shadow,pin]; }
      else if (item.variant==="card") { const bg=new fabric.Rect({width:240,height:320,fill:"#ffffff",rx:12,ry:12,stroke:"#e2e8f0",strokeWidth:1,originX:"center",originY:"center",shadow:new fabric.Shadow({color:"rgba(0,0,0,0.1)",blur:10,offsetY:4})}); const img=new fabric.Rect({width:240,height:140,fill:"#cbd5e1",originX:"center",originY:"top",top:-160,rx:12,ry:12}); const title=new fabric.Text("Produit",{fontSize:18,fontWeight:"bold",fill:"#0f172a",fontFamily:"Inter",originX:"left",originY:"top",left:-100,top:-5}); const price=new fabric.Text("29,99 €",{fontSize:16,fill:"#4f46e5",fontWeight:"600",fontFamily:"Inter",originX:"left",originY:"top",left:-100,top:25}); const btnBg=new fabric.Rect({width:200,height:40,fill:"#0f172a",rx:6,ry:6,originX:"center",originY:"bottom",top:140}); const btnTxt=new fabric.Text("Ajouter",{fontSize:14,fill:"#ffffff",fontWeight:"500",fontFamily:"Inter",originX:"center",originY:"bottom",top:130}); elements=[bg,img,title,price,btnBg,btnTxt]; }
      else if (item.variant==="profile") { const bg=new fabric.Rect({width:300,height:120,fill:"#ffffff",rx:12,ry:12,stroke:"#e2e8f0",strokeWidth:1,originX:"center",originY:"center"}); const avatar=new fabric.Circle({radius:35,fill:"#cbd5e1",originX:"center",originY:"center",left:-90}); const name=new fabric.Text("Marie D.",{fontSize:20,fontWeight:"bold",fill:"#0f172a",fontFamily:"Inter",originX:"left",originY:"center",left:-30,top:-15}); const role=new fabric.Text("Marketing",{fontSize:14,fill:"#64748b",fontFamily:"Inter",originX:"left",originY:"center",left:-30,top:15}); elements=[bg,avatar,name,role]; }
      else if (item.variant==="chart_bar") { const lineX=new fabric.Line([-100,80,100,80],{stroke:"#94a3b8",strokeWidth:2}); const lineY=new fabric.Line([-100,80,-100,-80],{stroke:"#94a3b8",strokeWidth:2}); const bar1=new fabric.Rect({width:30,height:80,fill:"#4f46e5",originY:"bottom",left:-70,top:80}); const bar2=new fabric.Rect({width:30,height:130,fill:"#3b82f6",originY:"bottom",left:-20,top:80}); const bar3=new fabric.Rect({width:30,height:50,fill:"#60a5fa",originY:"bottom",left:30,top:80}); elements=[lineX,lineY,bar1,bar2,bar3]; }
      else if (item.variant==="nav_menu") { const bg=new fabric.Rect({width:800,height:60,fill:"#ffffff",stroke:"#e2e8f0",strokeWidth:1,originX:"center",originY:"center"}); const logo=new fabric.Text("✨ Marque",{fontSize:20,fontWeight:"bold",fill:"#0f172a",fontFamily:"Inter",originX:"left",originY:"center",left:-360}); const links=new fabric.Text("Accueil    Produits    Contact",{fontSize:14,fill:"#64748b",fontFamily:"Inter",originX:"right",originY:"center",left:360}); elements=[bg,logo,links]; }
      else if (item.variant==="tabs") { const line=new fabric.Line([-150,20,150,20],{stroke:"#e2e8f0",strokeWidth:2}); const activeLine=new fabric.Line([-150,20,-50,20],{stroke:"#4f46e5",strokeWidth:2}); const t1=new fabric.Text("Général",{fontSize:14,fontWeight:"600",fill:"#4f46e5",fontFamily:"Inter",originX:"center",originY:"center",left:-100}); const t2=new fabric.Text("Sécurité",{fontSize:14,fill:"#64748b",fontFamily:"Inter",originX:"center",originY:"center",left:0}); const t3=new fabric.Text("Facturation",{fontSize:14,fill:"#64748b",fontFamily:"Inter",originX:"center",originY:"center",left:100}); elements=[line,activeLine,t1,t2,t3]; }
      else { const bg=new fabric.Rect({width:200,height:80,fill:"#f8fafc",stroke:"#94a3b8",strokeDashArray:[5,5],strokeWidth:2,rx:8,ry:8,originX:"center",originY:"center"}); const txt=new fabric.Text(item.label,{fontSize:14,fill:"#64748b",fontFamily:"Inter",fontWeight:"600",originX:"center",originY:"center"}); elements=[bg,txt]; }
      obj=new fabric.Group(elements,{left:x,top:y}); obj.customName=item.label;
    }
    if (obj) { fabricCanvas.add(obj); fabricCanvas.setActiveObject(obj); fabricCanvas.renderAll(); }
  };

  const handleDragStart = (e,item) => e.dataTransfer.setData("element-data",JSON.stringify(item));
  const handleCanvasDrop = (e) => { if (!isDesigner) return; e.preventDefault(); const dataStr=e.dataTransfer.getData("element-data"); if (!dataStr||!fabricCanvas) return; const item=JSON.parse(dataStr); const rect=wrapperRef.current.getBoundingClientRect(); const vpt=fabricCanvas.viewportTransform; const tx=(e.clientX-rect.left-vpt[4])/vpt[0]; const ty=(e.clientY-rect.top-vpt[5])/vpt[3]; addElementToCanvas(item,snapEnabled?snapToGrid(tx,GRID_SIZE):tx,snapEnabled?snapToGrid(ty,GRID_SIZE):ty); };
  const handleImportImage = (e) => { const file=e.target.files[0]; if (!file||!fabricCanvas||!isDesigner) return; const reader=new FileReader(); reader.onload=f=>{const imgEl=new Image(); imgEl.onload=()=>{const imgInstance=new fabric.Image(imgEl); imgInstance.scaleToWidth(300); imgInstance.set({left:100,top:100,rx:8,ry:8}); fabricCanvas.add(imgInstance); fabricCanvas.setActiveObject(imgInstance); fabricCanvas.renderAll();}; imgEl.src=f.target.result;}; reader.readAsDataURL(file); e.target.value=null; };
  const setZoomLevel = (z) => { if (!fabricCanvas) return; fabricCanvas.setZoom(z); setZoom(Math.round(z*100)); fabricCanvas.renderAll(); };

  return (
    <>
      <div className="editor-layout">
        <header className="editor-header">
          <div className="header-left">
            <button className="btn-icon" onClick={() => navigate(-1)} title="Retour"><ArrowLeft size={18} /></button>
            <div className="header-title">{designData?.maquette?.nom || "Projet sans nom"}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 20 }}>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button onClick={handleToggleDropdown} disabled={!fabricCanvas}
                  style={{ display:"inline-flex",alignItems:"center",gap:6,background:dropdownOpen?"rgba(37,99,235,0.15)":"rgba(37,99,235,0.1)",color:"#2563EB",border:"1px solid rgba(37,99,235,0.2)",borderRadius:8,padding:"5px 12px",cursor:!fabricCanvas?"not-allowed":"pointer",fontSize:13,fontWeight:600,transition:"background 0.15s",opacity:!fabricCanvas?0.5:1 }}>
                  <GitBranch size={13} /> v{currentVersionNum ?? "—"}
                  <ChevronDown size={13} style={{ transform:dropdownOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s" }} />
                </button>
                {dropdownOpen && (
                  <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"white",borderRadius:10,border:"1px solid #E2E8F0",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",minWidth:260,zIndex:9999,overflow:"hidden" }}>
                    <div style={{ padding:"10px 14px",borderBottom:"1px solid #F1F5F9",fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:6 }}><Clock size={11}/> Historique des versions</div>
                    <div style={{ maxHeight:280,overflowY:"auto" }}>
                      {versions.length===0 ? (<div style={{ padding:"16px 14px",color:"#94A3B8",fontSize:13,textAlign:"center" }}>Aucune version</div>) : (
                        versions.map(v => {
                          const isCurrent = v.numéro_version === currentVersionNum;
                          return (
                            <div key={v._id} onClick={() => { if (!isCurrent&&!loadingVersion) handleLoadVersion(v); }}
                              style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",textAlign:"left",background:isCurrent?"#F0F7FF":"white",cursor:isCurrent?"default":"pointer",borderBottom:"1px solid #F8FAFC",transition:"background 0.15s" }}
                              onMouseEnter={e=>{ if (!isCurrent) e.currentTarget.style.background="#F8FAFC"; }}
                              onMouseLeave={e=>{ if (!isCurrent) e.currentTarget.style.background="white"; }}
                            >
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <div style={{ width:30,height:30,borderRadius:8,background:isCurrent?"rgba(37,99,235,0.12)":"rgba(100,116,139,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:isCurrent?"#2563EB":"#94A3B8",flexShrink:0 }}><GitBranch size={14}/></div>
                                <div>
                                  <div style={{ fontSize:13,fontWeight:600,color:isCurrent?"#2563EB":"#1E293B" }}>Version {v.numéro_version}{isCurrent&&<span style={{ marginLeft:6,fontSize:10,background:"#2563EB",color:"white",borderRadius:10,padding:"1px 6px" }}>actuelle</span>}</div>
                                  <div style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>{formatDate(v.date_creation)}</div>
                                </div>
                              </div>
                              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                {!isCurrent&&<div style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748B",fontWeight:600 }}><Eye size={12}/> Charger</div>}
                                {isDesigner&&(
                                  <button onClick={e=>handleDeleteVersion(e,v._id)} disabled={deletingVersionId===v._id}
                                    style={{ background:"transparent",border:"none",color:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center",padding:"6px",borderRadius:"6px",cursor:"pointer",transition:"0.2s" }}
                                    onMouseEnter={e=>e.currentTarget.style.background="#FEE2E2"}
                                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                                  >{deletingVersionId===v._id?<Loader size={14} className="spin"/>:<Trash2 size={14}/>}</button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isDesigner && (
                <button onClick={handleNouvelleVersion} disabled={!fabricCanvas||creatingVersion}
                  style={{ display:"inline-flex",alignItems:"center",gap:6,background:versionSuccess?"#059669":"#2563EB",color:"white",border:"none",borderRadius:"50%",padding:"5px 0px 5px 6px",cursor:(!fabricCanvas||creatingVersion)?"not-allowed":"pointer",fontSize:0,fontWeight:600,opacity:(!fabricCanvas||creatingVersion)?0.6:1,transition:"background 0.3s" }}>
                  {creatingVersion?<Loader size={14} className="spin"/>:versionSuccess?<Check size={14}/>:<Plus size={14}/>}
                </button>
              )}
            </div>

            <span className="badge-status">
              {(saveStatus==="Sauvegarde…"||saveStatus==="Sauvegarde..."||loadingVersion)?<Loader size={12} className="spin"/>:null}
              {loadingVersion?"Chargement...":saveStatus}
            </span>
          </div>

          {isDesigner && (
            <div className="header-center">
              <div className="toolbar-group">
                <button className={`btn-tool ${gridEnabled?"active":""}`} onClick={()=>setGridEnabled(g=>!g)}><GridIcon size={16}/> <span className="hidden-sm">Grille</span></button>
                <button className={`btn-tool ${snapEnabled?"active":""}`} onClick={()=>setSnapEnabled(s=>!s)}><LayoutTemplate size={16}/> <span className="hidden-sm">Aimanter</span></button>
              </div>
              <div className="toolbar-group zoom-group">
                <button className="btn-tool-icon" onClick={()=>fabricCanvas&&setZoomLevel(Math.max(ZOOM_MIN,fabricCanvas.getZoom()-ZOOM_STEP))}><ZoomOut size={16}/></button>
                <span className="zoom-val" onClick={()=>setZoomLevel(1)}>{zoom}%</span>
                <button className="btn-tool-icon" onClick={()=>fabricCanvas&&setZoomLevel(Math.min(ZOOM_MAX,fabricCanvas.getZoom()+ZOOM_STEP))}><ZoomIn size={16}/></button>
              </div>
            </div>
          )}

          {/* ── Actions client : Rejeter + Valider ── */}
          <div className="header-right">

            {isClient && (
              <>
                {validationDone === "validé" ? (
                  <div className="validation-badge validation-badge--success">
                    <Check size={15}/> Version {currentVersionNum} validée
                  </div>
                ) : validationDone === "à corriger" ? (
                  <div className="validation-badge validation-badge--reject">
                    ⚠️ Rejet transmis à l'admin
                  </div>
                ) : (
                  <div className="client-actions-bar">
                    <button onClick={openRejetModal} disabled={!designData} className="btn-client-reject">
                      <span className="btn-client-reject__icon">✕</span>
                      Rejeter <span className="btn-version-tag">v{currentVersionNum}</span>
                    </button>
                    <button onClick={handleValider} disabled={validating || !designData} className="btn-client-validate">
                      {validating
                        ? <><Loader size={14} className="spin"/> Validation…</>
                        : <><Check size={15}/> Valider <span className="btn-version-tag btn-version-tag--light">v{currentVersionNum}</span></>
                      }
                    </button>
                  </div>
                )}
              </>
            )}

            {/* BOUTONS DESIGNER */}
            {isDesigner && (
              <>
                <button className="btn-tool" onClick={handleReset} title="Annuler les modifications en cours">
                  <RotateCcw size={16}/> <span className="hidden-sm">Réinitialiser</span>
                </button>
                <button className="btn-primary" onClick={()=>triggerSave(fabricCanvas,designData?.version?._id)}>
                  Enregistrer
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── PATCH 5 : Toast notification pour le client ── */}
        {validationToast && (
          <div style={{
            position:"fixed", top:24, right:24, zIndex:9999,
            display:"flex", alignItems:"center", gap:12,
            padding:"14px 22px", borderRadius:12,
            background: validationToast.type==="success"
              ? "linear-gradient(135deg,#059669,#047857)"
              : validationToast.type==="info"
              ? "linear-gradient(135deg,#2563EB,#1D4ED8)"
              : "linear-gradient(135deg,#DC2626,#B91C1C)",
            color:"white", fontWeight:700, fontSize:14,
            boxShadow:"0 10px 32px rgba(0,0,0,0.22)",
            maxWidth:380, lineHeight:1.4,
          }}>
            {validationToast.type==="success" ? <Check size={18}/> : validationToast.type==="info" ? <span>📨</span> : <span style={{fontSize:16}}>⚠️</span>}
            <span>{validationToast.msg}</span>
          </div>
        )}

        <div className="editor-body">
          {isDesigner && (
            <aside className="editor-sidebar">
              <div className="sidebar-header"><h3>Bibliothèque d'outils</h3></div>
              <div className="sidebar-scroll custom-scrollbar">
                {SIDEBAR_MENU.map(category => (
                  <div key={category.id} className="menu-group">
                    <button className={`menu-trigger ${openMenu===category.id?"active":""}`} onClick={()=>setOpenMenu(openMenu===category.id?"":category.id)}>
                      <div className="menu-trigger-left">{category.icon} <span>{category.label}</span></div>
                      {openMenu===category.id?<ChevronUp size={16} className="chevron"/>:<ChevronDown size={16} className="chevron"/>}
                    </button>
                    <div className={`menu-content ${openMenu===category.id?"open":""}`}>
                      <div className={category.layout==="grid"?"tool-grid":"tool-list"}>
                        {category.items.map(item => {
                          if (item.type==="action_image") return (<label key={item.id} className="tool-btn-list" title={item.label}><div className="icon-wrapper">{item.icon}</div> <span>{item.label}</span><input type="file" accept="image/*" hidden onChange={handleImportImage} disabled={!fabricCanvas}/></label>);
                          return (<button key={item.id} className={category.layout==="grid"?"tool-btn-box":"tool-btn-list"} draggable onDragStart={e=>handleDragStart(e,item)} onClick={()=>addElementToCanvas(item)} title={item.label} disabled={!fabricCanvas}><div className="icon-wrapper">{item.icon}</div><span>{item.label}</span></button>);
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <main className="editor-canvas-area" onDragOver={e=>e.preventDefault()} onDrop={handleCanvasDrop}>

            {/* ── Banner corrections client transmises au designer ── */}
            {isDesigner && corrections.length > 0 && (
              <div style={{ position:"absolute",top:16,left:"50%",transform:"translateX(-50%)",zIndex:100,width:"calc(100% - 40px)",maxWidth:720 }}>
                <div
                  onClick={()=>setShowCorrections(s=>!s)}
                  style={{ display:"flex",alignItems:"center",gap:10,background:"rgba(220,38,38,0.9)",borderRadius:10,padding:"10px 16px",cursor:"pointer",color:"white",fontWeight:700,fontSize:13,boxShadow:"0 4px 16px rgba(220,38,38,0.3)" }}
                >
                  <span style={{ width:8,height:8,borderRadius:"50%",background:"white",flexShrink:0,animation:"pulse 1.5s ease-in-out infinite" }}/>
                  ⚠️ {corrections.length} correction{corrections.length>1?"s":""} demandée{corrections.length>1?"s":""} — Cliquez pour voir les détails
                  <span style={{ marginLeft:"auto",fontSize:11,opacity:.85 }}>{showCorrections?"▲ Masquer":"▼ Voir"}</span>
                </div>
                {showCorrections && (
                  <div style={{ background:"white",border:"1px solid #E2E8F0",borderRadius:10,marginTop:6,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
                    {corrections.map((c, ci) => {
                      const projet = c.version_id?.id_maquette?.id_projet;
                      const vNum   = c.version_id?.numéro_version;
                      return (
                        <div key={c._id} style={{ padding:"14px 16px",borderBottom: ci < corrections.length-1 ? "1px solid #F1F5F9" : "none" }}>
                          {/* Infos */}
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                            <div style={{ fontSize:11,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em" }}>
                              {projet?.nom || "Projet"} · Version {vNum} · Client : {c.client_id?.nom || "—"}
                            </div>
                            <button
                              onClick={async e=>{e.stopPropagation(); try { await API.patch(`/validations/${c._id}/lu-designer`); setCorrections(prev=>prev.filter(x=>x._id!==c._id)); } catch(_){}}}
                              style={{ background:"rgba(99,102,241,0.1)",color:"#6366F1",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}
                            >
                              ✓ Marquer lu
                            </button>
                          </div>
                          {/* Commentaires des éléments */}
                          {(c.commentaires||[]).filter(cm => cm.commentaire_admin || cm.commentaire_client).map(cm => (
                            <div key={cm._id} style={{ background:"#FFF7F7",border:"1px solid #FEE2E2",borderRadius:8,padding:"8px 12px",marginBottom:6 }}>
                              <div style={{ fontSize:11,fontWeight:700,color:"#94A3B8",marginBottom:4 }}>
                                Élément : {cm.label_element || cm.id_element}
                              </div>
                              <div style={{ fontSize:13,color:"#1E293B",lineHeight:1.5 }}>
                                {cm.commentaire_admin || cm.commentaire_client}
                              </div>
                            </div>
                          ))}
                          {(c.commentaires||[]).filter(cm => cm.commentaire_admin || cm.commentaire_client).length === 0 && (
                            <div style={{ fontSize:13,color:"#DC2626",fontStyle:"italic" }}>Rejet général — aucune remarque spécifique.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!designData ? <div className="loader-container"><Loader size={48} className="spin text-primary"/><p>Chargement du studio...</p></div> : <div ref={wrapperRef} className="canvas-shadow"/>}
          </main>

          {isDesigner && (
            <aside className="editor-right-panel">
              <div className="right-tabs">
                <button className={`right-tab ${rightTab==="props"?"active":""}`} onClick={()=>setRightTab("props")}>Propriétés</button>
                <button className={`right-tab ${rightTab==="layers"?"active":""}`} onClick={()=>setRightTab("layers")}><Layers size={14}/> Calques</button>
              </div>
              <div className="right-panel-body custom-scrollbar">
                {rightTab==="props" ? <PropertiesPanel selectedObject={selectedObj} canvas={fabricCanvas} onUpdate={()=>{debouncedSave(fabricCanvas,designData?.version?._id);setLayersKey(k=>k+1);}}/> : <LayersPanel canvas={fabricCanvas} selectedObject={selectedObj} onSelectObject={setSelectedObj} refreshKey={layersKey}/>}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ══ POPUP REJET CLIENT ══════════════════════════════════════════════ */}
      {rejetModal && (
        <div onClick={()=>setRejetModal(false)} className="rejet-overlay">
          <div onClick={e=>e.stopPropagation()} className="rejet-modal">

            {/* ── Header ── */}
            <div className="rejet-modal__header">
              <div className="rejet-modal__header-left">
                <div className="rejet-modal__icon">✕</div>
                <div>
                  <h3 className="rejet-modal__title">Rejeter la version {currentVersionNum}</h3>
                  <p className="rejet-modal__subtitle">
                    Indiquez vos remarques pour chaque élément à corriger.<br/>
                    Les champs laissés vides ne seront pas transmis.
                  </p>
                </div>
              </div>
              <button onClick={()=>setRejetModal(false)} className="rejet-modal__close">✕</button>
            </div>

            {/* ── Compteur ── */}
            {rejetElements.length > 0 && (
              <div className="rejet-modal__counter">
                <span>{rejetElements.length} élément{rejetElements.length > 1 ? "s" : ""} sur le canvas</span>
                <span style={{ color:"#059669", fontWeight:600 }}>
                  {rejetElements.filter(e => e.commentaire_client.trim()).length} remarqué{rejetElements.filter(e => e.commentaire_client.trim()).length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* ── Liste éléments ── */}
            <div className="rejet-modal__body">
              {rejetElements.length === 0 ? (
                <div className="rejet-modal__empty">
                  <span style={{ fontSize:32 }}>🎨</span>
                  <p>Aucun élément détecté dans cette version.</p>
                </div>
              ) : rejetElements.map((el, i) => (
                <div key={el.id_element} className={`rejet-element ${el.commentaire_client.trim() ? "rejet-element--remarked" : ""}`}>

                  {/* Aperçu miniature + nom */}
                  <div className="rejet-element__preview">
                    <div className="rejet-element__thumb-wrap">
                      {el._thumbnail ? (
                        <img src={el._thumbnail} alt={el.label_element} className="rejet-element__thumb"/>
                      ) : (
                        <div className="rejet-element__thumb-fallback">{el._typeIcon || "◆"}</div>
                      )}
                      {el.commentaire_client.trim() && (
                        <span className="rejet-element__badge">✓</span>
                      )}
                    </div>
                    <div className="rejet-element__info">
                      <span className="rejet-element__name">{el.label_element}</span>
                      <span className="rejet-element__type">{el._type || "élément"}</span>
                    </div>
                  </div>

                  {/* Champ remarque */}
                  <div className="rejet-element__input-wrap">
                    <textarea
                      value={el.commentaire_client}
                      onChange={e => setRejetElements(prev => prev.map((item,idx) =>
                        idx===i ? { ...item, commentaire_client: e.target.value } : item
                      ))}
                      placeholder="Décrivez la correction souhaitée… (laisser vide = pas transmis)"
                      rows={2}
                      className="rejet-element__textarea"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            <div className="rejet-modal__footer">
              <div className="rejet-modal__footer-info">
                {rejetElements.filter(e => e.commentaire_client.trim()).length === 0
                  ? <span style={{ color:"#94A3B8" }}>Aucune remarque — rejet général</span>
                  : <span style={{ color:"#059669" }}>✓ {rejetElements.filter(e => e.commentaire_client.trim()).length} remarque{rejetElements.filter(e => e.commentaire_client.trim()).length > 1 ? "s" : ""} prête{rejetElements.filter(e => e.commentaire_client.trim()).length > 1 ? "s" : ""}</span>
                }
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setRejetModal(false)} className="rejet-modal__btn-cancel">Annuler</button>
                <button onClick={handleRejetSubmit} disabled={rejetSubmitting} className="rejet-modal__btn-submit">
                  {rejetSubmitting
                    ? <><Loader size={14} className="spin"/> Envoi en cours…</>
                    : <>✕ Justifier le rejet</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        :root{--bg-app:#f8fafc;--bg-canvas:#e2e8f0;--surface:#ffffff;--primary:#4f46e5;--primary-hover:#4338ca;--primary-light:#eef2ff;--text-main:#0f172a;--text-muted:#64748b;--border:#e2e8f0;--border-focus:#c7d2fe;--danger:#ef4444;--radius-md:8px;--shadow-sm:0 1px 2px 0 rgba(0,0,0,.05);--shadow-md:0 4px 6px -1px rgba(0,0,0,.1);--shadow-canvas:0 20px 25px -5px rgba(0,0,0,.1);}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',system-ui,sans-serif;background:var(--bg-app);color:var(--text-main);overflow:hidden;}
        .editor-layout{display:flex;flex-direction:column;height:100vh;width:100vw;position:fixed;inset:0;}
        .editor-header{height:60px;background:var(--surface);display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--border);box-shadow:var(--shadow-sm);z-index:10;position:relative;}
        .header-left,.header-center,.header-right{display:flex;align-items:center;gap:16px;}
        .header-center{position:absolute;left:50%;transform:translateX(-50%);}
        .btn-icon{background:none;border:none;color:var(--text-muted);padding:8px;border-radius:var(--radius-md);cursor:pointer;transition:.2s;}
        .btn-icon:hover{background:var(--bg-app);color:var(--text-main);}
        .header-title{font-weight:600;font-size:15px;}
        .badge-status{font-size:12px;color:var(--text-muted);background:var(--bg-app);padding:4px 10px;border-radius:20px;display:flex;align-items:center;gap:6px;}
        .toolbar-group{display:flex;align-items:center;background:var(--bg-app);padding:4px;border-radius:var(--radius-md);border:1px solid var(--border);}
        .btn-tool{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;background:none;border:none;color:var(--text-muted);padding:6px 12px;border-radius:6px;cursor:pointer;transition:.2s;}
        .btn-tool:hover{background:rgba(0,0,0,.03);color:var(--text-main);}
        .btn-tool.active{background:var(--surface);color:var(--primary);box-shadow:var(--shadow-sm);}
        .zoom-group{padding:4px 8px;}
        .btn-tool-icon{background:none;border:none;color:var(--text-muted);padding:4px;cursor:pointer;border-radius:4px;transition:.2s;}
        .btn-tool-icon:hover{color:var(--primary);background:var(--primary-light);}
        .zoom-val{font-size:13px;font-weight:600;width:44px;text-align:center;cursor:pointer;}
        .btn-primary{background:var(--primary);color:white;border:none;padding:8px 16px;font-size:14px;font-weight:500;border-radius:var(--radius-md);cursor:pointer;box-shadow:var(--shadow-sm);transition:.2s;}
        .btn-primary:hover{background:var(--primary-hover);transform:translateY(-1px);}
        .editor-body{display:flex;flex:1;overflow:hidden;}
        .editor-sidebar{width:300px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;z-index:5;box-shadow:2px 0 10px rgba(0,0,0,.02);}
        .sidebar-header{padding:20px;border-bottom:1px solid var(--border);}
        .sidebar-header h3{font-size:13px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;}
        .sidebar-scroll{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:4px;}
        .menu-group{border-bottom:1px solid transparent;}
        .menu-trigger{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px 16px;background:transparent;border:none;border-radius:var(--radius-md);cursor:pointer;font-size:14px;font-weight:500;color:var(--text-main);transition:.2s;}
        .menu-trigger:hover{background:var(--bg-app);}
        .menu-trigger.active{background:var(--primary-light);color:var(--primary);}
        .menu-trigger-left{display:flex;align-items:center;gap:12px;}
        .chevron{transition:.2s;color:var(--text-muted);}
        .menu-trigger.active .chevron{color:var(--primary);}
        .menu-content{max-height:0;overflow:hidden;opacity:0;transition:all .3s ease-in-out;}
        .menu-content.open{max-height:800px;opacity:1;padding:8px 8px 16px 8px;}
        .tool-list{display:flex;flex-direction:column;gap:6px;}
        .tool-btn-list{display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);font-size:13px;font-weight:500;color:var(--text-main);cursor:grab;transition:.2s;}
        .tool-btn-list:hover:not(:disabled){border-color:var(--primary);color:var(--primary);transform:translateX(2px);box-shadow:var(--shadow-sm);}
        .tool-btn-list .icon-wrapper{color:var(--text-muted);transition:.2s;}
        .tool-btn-list:hover:not(:disabled) .icon-wrapper{color:var(--primary);}
        .tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .tool-btn-box{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px 8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);cursor:grab;transition:.2s;text-align:center;}
        .tool-btn-box span{font-size:11px;font-weight:500;color:var(--text-muted);}
        .tool-btn-box .icon-wrapper{color:var(--text-main);transition:.2s;}
        .tool-btn-box:hover:not(:disabled){border-color:var(--primary);transform:translateY(-2px);box-shadow:var(--shadow-md);}
        .tool-btn-box:hover:not(:disabled) span,.tool-btn-box:hover:not(:disabled) .icon-wrapper{color:var(--primary);}
        .editor-canvas-area{flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;padding:40px;background:var(--bg-canvas);background-image:radial-gradient(var(--border) 1px,transparent 1px);background-size:20px 20px;position:relative;}
        .canvas-shadow{box-shadow:var(--shadow-canvas);border-radius:4px;overflow:hidden;background:white;}
        .loader-container{display:flex;flex-direction:column;align-items:center;gap:16px;color:var(--text-muted);font-weight:500;}
        .editor-right-panel{width:300px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;z-index:5;}
        .right-tabs{display:flex;border-bottom:1px solid var(--border);background:var(--bg-app);padding:4px 4px 0;gap:4px;}
        .right-tab{flex:1;padding:12px 8px;font-size:13px;font-weight:500;color:var(--text-muted);background:none;border:none;cursor:pointer;border-radius:var(--radius-md) var(--radius-md) 0 0;transition:.2s;display:flex;justify-content:center;gap:6px;}
        .right-tab.active{color:var(--primary);background:var(--surface);font-weight:600;box-shadow:0 -2px 5px rgba(0,0,0,.02);}
        .right-panel-body{flex:1;overflow-y:auto;padding:16px;}
        .props-empty{text-align:center;color:var(--text-muted);padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:16px;}
        .props-section{margin-bottom:24px;}
        .props-section-title{font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:6px;}
        .props-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;}
        .props-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;}
        .prop-field{display:flex;flex-direction:column;}
        .prop-field-label{font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;display:block;}
        .prop-field-input{border:1px solid var(--border);background:var(--bg-app);border-radius:6px;padding:8px 10px;font-size:13px;width:100%;outline:none;}
        .prop-field-input:focus{border-color:var(--primary);background:white;box-shadow:0 0 0 2px var(--primary-light);}
        .props-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .props-label{font-size:13px;font-weight:500;}
        .color-picker-wrapper{display:flex;align-items:center;gap:8px;border:1px solid var(--border);padding:4px 8px;border-radius:6px;background:white;}
        .props-color{border:none;width:24px;height:24px;cursor:pointer;border-radius:4px;padding:0;}
        .color-hex{font-size:12px;color:var(--text-muted);font-family:monospace;}
        .props-input-sm{width:60px;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;text-align:center;background:var(--bg-app);outline:none;}
        .props-input-sm:focus{border-color:var(--primary);background:white;}
        .props-input-xs{width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 4px;font-size:12px;text-align:center;background:var(--bg-app);outline:none;}
        .props-input-xs:focus{border-color:var(--primary);background:white;}
        .props-select{width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-app);font-size:13px;}
        .btn-group{display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;}
        .props-toggle{flex:1;background:var(--bg-app);border:none;border-right:1px solid var(--border);padding:8px 10px;cursor:pointer;display:flex;justify-content:center;color:var(--text-muted);}
        .props-toggle:last-child{border:none;}
        .props-toggle.active{background:white;color:var(--primary);box-shadow:inset 0 2px 0 var(--primary);}
        .custom-checkbox{accent-color:var(--primary);width:16px;height:16px;cursor:pointer;}
        .layers-panel{display:flex;flex-direction:column;gap:8px;}
        .layers-empty{text-align:center;color:var(--text-muted);padding:20px;font-size:13px;}
        .layers-list{display:flex;flex-direction:column;gap:4px;}
        .layers-order-btns{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px;}
        .layers-order-btns button{padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-app);cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;}
        .layers-order-btns button:hover:not(:disabled){color:var(--primary);background:white;border-color:var(--border-focus);}
        .layers-order-btns button:disabled{opacity:.4;cursor:not-allowed;}
        .layer-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--radius-md);cursor:pointer;font-size:13px;font-weight:500;transition:.2s;border:1px solid transparent;}
        .layer-item:hover{background:var(--bg-app);}
        .layer-item.selected{background:var(--primary-light);color:var(--primary);border-color:var(--border-focus);}
        .layer-thumb{width:20px;height:20px;border-radius:4px;border:1px solid rgba(0,0,0,.1);flex-shrink:0;}
        .layer-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .layer-actions{display:flex;gap:4px;opacity:0;}
        .layer-item:hover .layer-actions,.layer-item.selected .layer-actions{opacity:1;}
        .layer-actions button{background:white;border:1px solid var(--border);padding:4px;border-radius:4px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;}
        .layer-actions button:hover{border-color:var(--border-focus);color:var(--primary);}
        .icon-danger{color:var(--danger)!important;}
        .fade-in{animation:fadeIn .3s ease;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .spin{animation:spin 1s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .custom-scrollbar::-webkit-scrollbar{width:5px;height:5px;}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent;}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px;}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8;}
        .hidden-sm{display:inline;}
        @media(max-width:1200px){.hidden-sm{display:none;}}

        /* ── Boutons client Valider / Rejeter ── */
        .client-actions-bar{display:flex;align-items:center;gap:8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:5px;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
        .btn-client-reject{display:inline-flex;align-items:center;gap:7px;background:white;color:#DC2626;border:1.5px solid #FECACA;border-radius:9px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;font-family:inherit;}
        .btn-client-reject:hover:not(:disabled){background:#FEF2F2;border-color:#FCA5A5;transform:translateY(-1px);box-shadow:0 3px 10px rgba(220,38,38,0.15);}
        .btn-client-reject:disabled{opacity:0.5;cursor:not-allowed;}
        .btn-client-reject__icon{font-size:11px;width:18px;height:18px;border-radius:50%;background:#FEE2E2;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}
        .btn-client-validate{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#059669,#047857);color:white;border:none;border-radius:9px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;box-shadow:0 3px 12px rgba(5,150,105,0.35);font-family:inherit;}
        .btn-client-validate:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(5,150,105,0.4);}
        .btn-client-validate:disabled{opacity:0.65;cursor:not-allowed;transform:none;}
        .btn-version-tag{background:rgba(0,0,0,0.12);border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;margin-left:2px;}
        .btn-version-tag--light{background:rgba(255,255,255,0.25);}
        .validation-badge{display:inline-flex;align-items:center;gap:8px;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:700;user-select:none;}
        .validation-badge--success{background:rgba(5,150,105,0.1);color:#059669;border:1.5px solid rgba(5,150,105,0.3);}
        .validation-badge--reject{background:rgba(220,38,38,0.08);color:#DC2626;border:1.5px solid rgba(220,38,38,0.2);}

        /* ── Popup Rejet ── */
        .rejet-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(6px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease;}
        .rejet-modal{background:white;border-radius:20px;width:100%;max-width:600px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 70px rgba(0,0,0,0.28);animation:popIn .25s ease;}
        @keyframes popIn{from{opacity:0;transform:scale(.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .rejet-modal__header{padding:22px 24px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #F1F5F9;background:linear-gradient(to bottom,#FFF5F5,white);flex-shrink:0;}
        .rejet-modal__header-left{display:flex;align-items:flex-start;gap:14px;}
        .rejet-modal__icon{width:40px;height:40px;border-radius:12px;background:rgba(220,38,38,0.1);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#DC2626;flex-shrink:0;}
        .rejet-modal__title{font-size:17px;font-weight:800;color:#0F172A;margin:0 0 4px;}
        .rejet-modal__subtitle{font-size:12px;color:#94A3B8;margin:0;line-height:1.5;}
        .rejet-modal__close{background:#F1F5F9;border:none;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748B;font-size:14px;flex-shrink:0;transition:background .15s;}
        .rejet-modal__close:hover{background:#E2E8F0;color:#374151;}
        .rejet-modal__counter{display:flex;justify-content:space-between;align-items:center;padding:8px 24px;background:#F8FAFC;border-bottom:1px solid #F1F5F9;font-size:12px;color:#64748B;font-weight:600;flex-shrink:0;}
        .rejet-modal__body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px;}
        .rejet-modal__empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 0;color:#94A3B8;font-size:13px;}
        .rejet-element{border-radius:12px;border:1.5px solid #E2E8F0;overflow:hidden;transition:border-color .2s,box-shadow .2s;background:white;}
        .rejet-element--remarked{border-color:#BBF7D0;box-shadow:0 2px 8px rgba(5,150,105,0.1);}
        .rejet-element__preview{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#FAFBFF;border-bottom:1px solid #F1F5F9;}
        .rejet-element__thumb-wrap{position:relative;flex-shrink:0;}
        .rejet-element__thumb{width:80px;height:48px;border-radius:6px;object-fit:contain;border:1px solid #E2E8F0;background:#f0f2f5;display:block;}
        .rejet-element__thumb-fallback{width:80px;height:48px;border-radius:6px;background:#F1F5F9;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid #E2E8F0;}
        .rejet-element__badge{position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#059669;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;}
        .rejet-element__info{display:flex;flex-direction:column;gap:2px;}
        .rejet-element__name{font-size:13px;font-weight:700;color:#1E293B;}
        .rejet-element__type{font-size:11px;color:#94A3B8;text-transform:capitalize;}
        .rejet-element__input-wrap{padding:10px 14px;background:white;}
        .rejet-element__textarea{width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;resize:none;outline:none;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;color:#1E293B;line-height:1.5;}
        .rejet-element__textarea:focus{border-color:#DC2626;box-shadow:0 0 0 3px rgba(220,38,38,0.08);}
        .rejet-element__textarea::placeholder{color:#CBD5E1;}
        .rejet-modal__footer{padding:14px 24px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;background:#FAFBFF;flex-shrink:0;gap:12px;}
        .rejet-modal__footer-info{font-size:12px;font-weight:600;}
        .rejet-modal__btn-cancel{background:#F1F5F9;color:#64748B;border:none;border-radius:9px;padding:10px 20px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;transition:background .15s;}
        .rejet-modal__btn-cancel:hover{background:#E2E8F0;}
        .rejet-modal__btn-submit{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#DC2626,#B91C1C);color:white;border:none;border-radius:9px;padding:11px 24px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(220,38,38,0.3);transition:all .18s;}
        .rejet-modal__btn-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(220,38,38,0.4);}
        .rejet-modal__btn-submit:disabled{opacity:0.7;cursor:not-allowed;transform:none;}
      `}</style>
    </>
  );
};

export default DesignEditor;
