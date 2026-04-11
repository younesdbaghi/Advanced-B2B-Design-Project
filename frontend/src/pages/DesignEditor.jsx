import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import debounce from "lodash.debounce";
import API from "../api";
import {
  ArrowLeft, Loader, Layers, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  Trash2, ZoomIn, ZoomOut, Grid as GridIcon, Eye, EyeOff, Lock, Unlock,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, LayoutTemplate,
  Type, Shapes, Image as ImageIcon, Palette, BarChart3, Layout,
  MousePointerClick, Package, Zap, Heading1, Heading2, Pilcrow,
  List, ListOrdered, Quote, SplitSquareHorizontal, Square, Circle, Triangle,
  Hexagon, Minus, Star, Cloud, ArrowRight,
  MoveDiagonal, Video, Map, Frame,
  CheckSquare, ToggleLeft, SlidersHorizontal, AppWindow, DollarSign,
  Users, Play, GitBranch, Plus, Check, Clock, RotateCcw
} from "lucide-react";

const GRID_SIZE = 20;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.1;
const VIDEO_OBJECT_NAMES = new Set(["Lecteur Vidéo", "Lecture Video"]);
const isVideoObject = (obj) => VIDEO_OBJECT_NAMES.has(obj?.customName);
const extractYouTubeId = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.replace("www.", "");
    if (host === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
};
const normalizeVideoSrc = (rawUrl) => {
  const url = (rawUrl || "").trim();
  const ytId = extractYouTubeId(url);
  if (!ytId) return url;
  // Store canonical watch URL so Shorts/share links stay stable in saved data.
  return `https://www.youtube.com/watch?v=${ytId}`;
};

const SIDEBAR_MENU = [
  { id: "typography", label: "Typographie", icon: <Type size={16} />, layout: "list", items: [{ id: "text_h1", label: "Titre principal", icon: <Heading1 size={15} />, type: "text", variant: "h1" }, { id: "text_h2", label: "Sous-titre", icon: <Heading2 size={15} />, type: "text", variant: "h2" }, { id: "text_p", label: "Paragraphe", icon: <Pilcrow size={15} />, type: "text", variant: "p" }, { id: "text_ul", label: "Liste à puces", icon: <List size={15} />, type: "text", variant: "ul" }, { id: "text_ol", label: "Liste numérotée", icon: <ListOrdered size={15} />, type: "text", variant: "ol" }, { id: "text_quote", label: "Citation", icon: <Quote size={15} />, type: "text", variant: "quote" }] },
  { id: "shapes", label: "Formes", icon: <Shapes size={16} />, layout: "grid", items: [{ id: "shape_rect", label: "Rectangle", icon: <Square size={22} />, type: "shape", variant: "rect" }, { id: "shape_circle", label: "Cercle", icon: <Circle size={22} />, type: "shape", variant: "circle" }, { id: "shape_triangle", label: "Triangle", icon: <Triangle size={22} />, type: "shape", variant: "triangle" }, { id: "shape_ellipse", label: "Ellipse", icon: <Circle size={22} style={{ transform: "scaleY(0.6)" }} />, type: "shape", variant: "ellipse" }, { id: "shape_polygon", label: "Polygone", icon: <Hexagon size={22} />, type: "advanced_shape", variant: "polygon" }, { id: "shape_line", label: "Ligne", icon: <Minus size={22} strokeWidth={4} />, type: "shape", variant: "line" }, { id: "shape_star", label: "Étoile", icon: <Star size={22} />, type: "advanced_shape", variant: "star" }, { id: "shape_zap", label: "Éclair", icon: <Zap size={22} />, type: "advanced_shape", variant: "zap" }, { id: "shape_cloud", label: "Nuage", icon: <Cloud size={22} />, type: "advanced_shape", variant: "cloud" }, { id: "arrow_r", label: "Flèche", icon: <ArrowRight size={22} />, type: "advanced_shape", variant: "arrow_r" }, { id: "arrow_double", label: "Double Flèche", icon: <MoveDiagonal size={22} />, type: "advanced_shape", variant: "arrow_double" }] },
  { id: "media", label: "Médias & Conteneurs", icon: <ImageIcon size={16} />, layout: "list", items: [{ id: "media_img", label: "Image (Upload)", icon: <ImageIcon size={15} />, type: "action_image" }, { id: "media_video", label: "Lecteur Vidéo", icon: <Video size={15} />, type: "complex", variant: "video" }, { id: "media_map", label: "Carte (Map)", icon: <Map size={15} />, type: "complex", variant: "map" }, { id: "cont_frame", label: "Frame / Section", icon: <Frame size={15} />, type: "shape", variant: "frame" }] },
  { id: "charts", label: "Graphiques", icon: <BarChart3 size={16} />, layout: "list", items: [{ id: "chart_bar", label: "Graphique Barres", icon: <BarChart3 size={15} />, type: "complex", variant: "chart_bar" }] },
  { id: "layouts", label: "Layouts & Navigation", icon: <Layout size={16} />, layout: "list", items: [{ id: "layout_hero", label: "Hero Section", icon: <LayoutTemplate size={15} />, type: "complex", variant: "hero" }, { id: "nav_menu", label: "Barre de menu", icon: <Minus size={15} />, type: "complex", variant: "nav_menu" }, { id: "nav_tabs", label: "Onglets (Tabs)", icon: <SplitSquareHorizontal size={15} />, type: "complex", variant: "tabs" }] },
  { id: "ui", label: "UI / Composants", icon: <MousePointerClick size={16} />, layout: "list", items: [{ id: "ui_btn", label: "Bouton d'action", icon: <MousePointerClick size={15} />, type: "complex", variant: "button" }, { id: "ui_input", label: "Champ de texte", icon: <Type size={15} />, type: "complex", variant: "input" }, { id: "ui_check", label: "Checkbox", icon: <CheckSquare size={15} />, type: "complex", variant: "checkbox" }, { id: "ui_toggle", label: "Switch Toggle", icon: <ToggleLeft size={15} />, type: "complex", variant: "toggle" }, { id: "ui_slider", label: "Slider / Jauge", icon: <SlidersHorizontal size={15} />, type: "complex", variant: "slider" }, { id: "ui_modal", label: "Fenêtre Modale", icon: <AppWindow size={15} />, type: "complex", variant: "modal" }] },
  { id: "blocks", label: "Blocs Prêts", icon: <Package size={16} />, layout: "list", items: [{ id: "block_card", label: "Carte Produit", icon: <Package size={15} />, type: "complex", variant: "card" }, { id: "block_profile", label: "Profil Utilisateur", icon: <Users size={15} />, type: "complex", variant: "profile" }, { id: "block_pricing", label: "Tableau de Prix", icon: <DollarSign size={15} />, type: "complex", variant: "pricing" }] }
];

const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;

const reviveVideos = (canvas) => {
  if (!canvas) return;
  canvas.getObjects().forEach(o => {
    if (isVideoObject(o) && o.videoSrc) {
      if (o.getElement && o.getElement()?.tagName === "VIDEO") return;

      // Validate video source
      if (!o.videoSrc || (typeof o.videoSrc === 'string' && !o.videoSrc.trim())) {
        console.error("Invalid video source:", o.videoSrc);
        return;
      }

      const ytId = extractYouTubeId(o.videoSrc);
      if (ytId) {
        const thumb = new Image();
        thumb.crossOrigin = "anonymous";
        thumb.onload = () => {
          const vImg = new fabric.Image(thumb, {
            left: o.left, top: o.top,
            originX: o.originX || "left", originY: o.originY || "top",
            width: o.width || 320,
            height: o.height || 180,
            angle: o.angle || 0
          });
          vImg.set({ scaleX: o.scaleX || 1, scaleY: o.scaleY || 1 });
          vImg.customName = "Lecteur Vidéo";
          vImg.videoSrc = o.videoSrc;
          const idx = canvas.getObjects().indexOf(o);
          try {
            canvas.remove(o);
            canvas.add(vImg);
            if (idx !== -1 && typeof vImg.moveTo === "function") vImg.moveTo(idx);
            else if (idx !== -1 && typeof canvas.moveTo === "function") canvas.moveTo(vImg, idx);
            if (canvas.getActiveObject() === o) {
              canvas.discardActiveObject();
              canvas.setActiveObject(vImg);
            }
            canvas.renderAll();
          } catch (e) { console.error(e); }
        };
        thumb.onerror = () => {
          console.warn("YouTube thumbnail load failed for:", o.videoSrc);
        };
        thumb.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        return;
      }

      const videoEl = document.createElement('video');
      if (!o.videoSrc.startsWith("data:") && !o.videoSrc.startsWith("blob:")) {
        videoEl.crossOrigin = "anonymous";
      }
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.src = o.videoSrc;

      // Add timeout for video loading
      const timeout = setTimeout(() => {
        if (!isReady) {
          console.error("Video loading timeout:", o.videoSrc);
        }
      }, 10000); // 10 second timeout

      let isReady = false;
      const onReady = () => {
        if (isReady) return;
        isReady = true;
        clearTimeout(timeout);
        if (o.type === "group" || typeof o.setElement !== "function") {
          const vImg = new fabric.Image(videoEl, {
            left: o.left, top: o.top,
            originX: o.originX || "left", originY: o.originY || "top",
            width: videoEl.videoWidth || o.width || 320,
            height: videoEl.videoHeight || o.height || 180,
            angle: o.angle || 0
          });

          if (videoEl.videoWidth) {
            vImg.scaleToWidth(o.width * o.scaleX || 320);
          } else {
            vImg.set({ scaleX: o.scaleX || 1, scaleY: o.scaleY || 1 });
          }

          vImg.customName = "Lecteur Vidéo";
          vImg.videoSrc = videoEl.src;
          const idx = canvas.getObjects().indexOf(o);
          try {
            canvas.remove(o);
            canvas.add(vImg);
            if (idx !== -1 && typeof vImg.moveTo === "function") {
              vImg.moveTo(idx);
            } else if (idx !== -1 && typeof canvas.moveTo === "function") {
              canvas.moveTo(vImg, idx);
            }
          } catch (e) { console.error(e); }

          if (canvas.getActiveObject() === o) {
            canvas.discardActiveObject();
            canvas.setActiveObject(vImg);
          }
          videoEl.play().catch(() => { });
          const render = () => {
            if (canvas.getObjects().includes(vImg)) { canvas.renderAll(); fabric.util.requestAnimFrame(render); }
          };
          fabric.util.requestAnimFrame(render);
        } else {
          o.setElement(videoEl);
          videoEl.play().catch(() => { });
          const render = () => {
            if (canvas.getObjects().includes(o)) { canvas.renderAll(); fabric.util.requestAnimFrame(render); }
          };
          fabric.util.requestAnimFrame(render);
        }
      };

      videoEl.addEventListener('loadedmetadata', onReady);
      videoEl.addEventListener('loadeddata', onReady);
      videoEl.addEventListener('canplay', onReady);
      videoEl.addEventListener('error', (e) => {
        clearTimeout(timeout);
        console.error("Video loading failed:", {
          src: o.videoSrc,
          error: videoEl.error,
          networkState: videoEl.networkState,
          readyState: videoEl.readyState
        });
      });
    }
  });
};

const DEFAULT_MAP_LAT = 48.8566;
const DEFAULT_MAP_LNG = 2.3522;
const DEFAULT_MAP_ZOOM = 14;

const findMapRectLayer = (group) => {
  const objs = group.getObjects?.() || [];
  if (objs[1]?.type === "rect") return objs[1];
  if (objs[0]?.type === "rect") return objs[0];
  return null;
};

const loadOsmMapIntoGroup = (group, canvas) => {
  if (!group || group.type !== "group" || group.customName !== "Carte (Map)" || !canvas) return;
  const mapRect = findMapRectLayer(group);
  if (!mapRect) return;
  const lat = group.mapLat != null ? Number(group.mapLat) : DEFAULT_MAP_LAT;
  const lng = group.mapLng != null ? Number(group.mapLng) : DEFAULT_MAP_LNG;
  const zoom = Math.min(18, Math.max(1, Number(group.mapZoom) || DEFAULT_MAP_ZOOM));
  const w = Math.max(1, Math.round(mapRect.width || 1));
  const h = Math.max(1, Math.round(mapRect.height || 1));
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&maptype=mapnik`;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      mapRect.set("fill", new fabric.Pattern({ source: c, repeat: "no-repeat" }));
      group.dirty = true;
      canvas.renderAll();
    } catch {
      mapRect.set("fill", "#dbeafe");
      canvas.renderAll();
    }
  };
  img.onerror = () => {
    mapRect.set("fill", "#dbeafe");
    canvas.renderAll();
  };
  img.src = url;
};

const reviveMaps = (canvas) => {
  if (!canvas) return;
  canvas.getObjects().forEach((o) => {
    if (o.type === "group" && o.customName === "Carte (Map)") loadOsmMapIntoGroup(o, canvas);
  });
};

const hexForColorInput = (fill) => {
  if (typeof fill !== "string" || !fill.startsWith("#")) return "#ffffff";
  if (fill.length === 7) return fill.toLowerCase();
  if (fill.length === 4) {
    const r = fill[1], g = fill[2], b = fill[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#ffffff";
};

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

// ─── PROPERTIES PANEL ────────────────────────────────────────────────────────
const PropertiesPanel = ({ selectedObject, canvas, onUpdate }) => {
  const [props, setProps] = useState({});

  useEffect(() => {
    if (!selectedObject) { setProps({}); return; }
    const o = selectedObject;
    const shadow = o.shadow || {};

    let cardProps = {};
    if (o.type === "group" && o.customName === "Carte Produit") {
      const objs = o.getObjects();
      cardProps = {
        cardTitle: objs[2]?.text || "",
        cardPrice: objs[3]?.text || "",
        cardButton: objs[5]?.text || "",
        cardImageName: objs[1]?.cardImageName || "",
        cardBgColor: hexForColorInput(objs[0]?.fill),
      };
    }

    let profileProps = {};
    if (o.type === "group" && o.customName === "Profil Utilisateur") {
      const objs = o.getObjects();
      profileProps = {
        profileName: objs[2]?.text || "",
        profileRole: objs[3]?.text || "",
        profileImageName: objs[1]?.profileImageName || "",
        profileBgColor: hexForColorInput(objs[0]?.fill),
      };
    }

    let pricingProps = {};
    if (o.type === "group" && o.customName === "Tableau de Prix") {
      const objs = o.getObjects();
      pricingProps = { pricingTitle: objs[1]?.text || "", pricingPrice: objs[2]?.text || "", pricingButton: objs[7]?.text || "" };
    }

    let videoProps = {};
    if (isVideoObject(o)) {
      videoProps = { videoSrc: o.videoSrc || "" };
    }

    let mapProps = {};
    if (o.type === "group" && o.customName === "Carte (Map)") {
      mapProps = {
        mapLat: o.mapLat != null ? Number(o.mapLat) : DEFAULT_MAP_LAT,
        mapLng: o.mapLng != null ? Number(o.mapLng) : DEFAULT_MAP_LNG,
        mapZoom: o.mapZoom != null ? Number(o.mapZoom) : DEFAULT_MAP_ZOOM,
      };
    }

    setProps({
      left: Math.round(o.left || 0), top: Math.round(o.top || 0),
      width: Math.round((o.width || 0) * (o.scaleX || 1)), height: Math.round((o.height || 0) * (o.scaleY || 1)),
      fill: o.fill || "#000000", opacity: Math.round((o.opacity ?? 1) * 100),
      angle: Math.round(o.angle || 0), fontSize: o.fontSize || 24,
      fontFamily: o.fontFamily || "Inter", fontWeight: o.fontWeight || "normal",
      fontStyle: o.fontStyle || "normal", textAlign: o.textAlign || "left",
      stroke: o.stroke || "#000000", strokeWidth: o.strokeWidth || 0,
      rx: o.rx || 0, ry: o.ry || 0, backgroundColor: o.backgroundColor || "",
      boxPaddingTop: o.boxPaddingTop || 0, boxPaddingRight: o.boxPaddingRight || 0,
      boxPaddingBottom: o.boxPaddingBottom || 0, boxPaddingLeft: o.boxPaddingLeft || 0,
      boxStroke: o.boxStroke || "#000000", boxStrokeWidth: o.boxStrokeWidth || 0,
      shadowEnabled: !!o.shadow, shadowColor: shadow.color || "rgba(0,0,0,0.3)",
      shadowBlur: shadow.blur || 10,
      shadowOffsetX: shadow.offsetX !== undefined ? shadow.offsetX : 5,
      shadowOffsetY: shadow.offsetY !== undefined ? shadow.offsetY : 5,
      ...cardProps,
      ...profileProps,
      ...pricingProps,
      ...videoProps,
      ...mapProps,
    });
  }, [selectedObject]);

  const apply = (key, value) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    if (key === "width") o.set("scaleX", value / (o.width || 1));
    else if (key === "height") o.set("scaleY", value / (o.height || 1));
    else if (key === "opacity") o.set(key, value / 100);
    else o.set(key, value);
    o.setCoords(); canvas.renderAll(); onUpdate?.();
    setProps(p => ({ ...p, [key]: value }));
  };

  const applyPadding = (side, value) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    const key = `boxPadding${side}`;
    o.set(key, value);
    o.set('padding', Math.max(o.boxPaddingTop || 0, o.boxPaddingRight || 0, o.boxPaddingBottom || 0, o.boxPaddingLeft || 0));
    o.setCoords(); canvas.renderAll(); onUpdate?.();
    setProps(p => ({ ...p, [key]: value }));
  };

  const applyShadow = (key, value) => {
    if (!selectedObject || !canvas) return;
    const newProps = { ...props, [key]: value };
    setProps(newProps);
    if (!newProps.shadowEnabled) {
      selectedObject.set("shadow", null);
    } else {
      selectedObject.set("shadow", new fabric.Shadow({
        color: newProps.shadowColor || "rgba(0,0,0,0.3)",
        blur: newProps.shadowBlur || 0,
        offsetX: newProps.shadowOffsetX || 0,
        offsetY: newProps.shadowOffsetY || 0,
      }));
    }
    canvas.renderAll(); onUpdate?.();
  };

  const applyGroupText = (index, key, value) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    if (o.type === "group") {
      const objs = o.getObjects();
      if (objs[index]) {
        objs[index].set("text", value);
        canvas.renderAll();
        onUpdate?.();
        setProps(p => ({ ...p, [key]: value }));
      }
    }
  };

  const applyGroupBgFill = (index, key, value) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    if (o.type !== "group") return;
    const objs = o.getObjects();
    const bg = objs[index];
    if (!bg) return;
    bg.set("fill", value);
    o.dirty = true;
    canvas.renderAll();
    onUpdate?.();
    setProps((p) => ({ ...p, [key]: value }));
  };

  const applyMapField = (key, raw) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    if (o.customName !== "Carte (Map)") return;
    let num;
    if (key === "mapZoom") {
      num = Math.min(18, Math.max(1, parseInt(raw, 10) || DEFAULT_MAP_ZOOM));
    } else {
      num = parseFloat(String(raw).replace(",", "."));
    }
    if (Number.isNaN(num)) return;
    o[key] = num;
    setProps((p) => ({ ...p, [key]: num }));
    onUpdate?.();
  };

  const refreshMapPreview = () => {
    if (!selectedObject || !canvas) return;
    if (selectedObject.customName !== "Carte (Map)") return;
    loadOsmMapIntoGroup(selectedObject, canvas);
    onUpdate?.();
  };

  const handleCardImageUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file || !selectedObject || !canvas) return;

    const o = selectedObject;
    if (o.type !== "group" || o.customName !== "Carte Produit") return;

    const slots = o.getObjects();
    const imageSlot = slots[1];
    if (!imageSlot || imageSlot.type !== "rect") return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result;
      if (typeof src !== "string") return;

      const img = new Image();
      img.onload = () => {
        const targetW = Math.max(1, Math.round(imageSlot.width || 240));
        const targetH = Math.max(1, Math.round(imageSlot.height || 140));
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = targetW;
        patternCanvas.height = targetH;

        const ctx = patternCanvas.getContext("2d");
        if (!ctx) return;

        // "cover" crop so card images always fill the slot cleanly.
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (targetW - drawW) / 2;
        const offsetY = (targetH - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        imageSlot.set("fill", new fabric.Pattern({ source: patternCanvas, repeat: "no-repeat" }));
        imageSlot.set("stroke", "#cbd5e1");
        imageSlot.cardImageName = file.name;
        o.dirty = true;
        canvas.renderAll();
        onUpdate?.();
        setProps((p) => ({ ...p, cardImageName: file.name }));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file || !selectedObject || !canvas) return;

    const o = selectedObject;
    if (o.type !== "group" || o.customName !== "Profil Utilisateur") return;

    const slots = o.getObjects();
    const avatarSlot = slots[1];
    if (!avatarSlot || avatarSlot.type !== "circle") return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result;
      if (typeof src !== "string") return;

      const img = new Image();
      img.onload = () => {
        const targetSize = Math.max(1, Math.round((avatarSlot.radius || 35) * 2));
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = targetSize;
        patternCanvas.height = targetSize;

        const ctx = patternCanvas.getContext("2d");
        if (!ctx) return;

        // Cover crop then clip to a circle for a clean avatar.
        const scale = Math.max(targetSize / img.width, targetSize / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (targetSize - drawW) / 2;
        const offsetY = (targetSize - drawH) / 2;

        ctx.beginPath();
        ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        avatarSlot.set("fill", new fabric.Pattern({ source: patternCanvas, repeat: "no-repeat" }));
        avatarSlot.set("stroke", "#e2e8f0");
        avatarSlot.set("strokeWidth", 1);
        avatarSlot.profileImageName = file.name;
        o.dirty = true;
        canvas.renderAll();
        onUpdate?.();
        setProps((p) => ({ ...p, profileImageName: file.name }));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const applyVideoSrc = (value) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    if (!isVideoObject(o)) return;
    const nextSrc = normalizeVideoSrc(value);
    o.videoSrc = nextSrc;
    setProps((p) => ({ ...p, videoSrc: nextSrc }));
    onUpdate?.();
    if (nextSrc) reviveVideos(canvas);
    else canvas.renderAll();
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedObject || !canvas) return;

    try {
      const blobUrl = URL.createObjectURL(file);
      const o = selectedObject;
      if (isVideoObject(o)) {
        o.videoSrc = blobUrl;
        setProps(p => ({ ...p, videoSrc: blobUrl }));
        onUpdate?.();
        reviveVideos(canvas);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'importation de la vidéo.");
    }
  };

  if (!selectedObject) return (
    <div className="props-empty">
      <div className="props-empty-icon"><LayoutTemplate size={28} /></div>
      <p>Sélectionnez un élément pour modifier ses propriétés</p>
    </div>
  );

  const isText = ["i-text", "textbox"].includes(selectedObject.type);
  const isLine = selectedObject.type === "line";
  const isGroup = selectedObject.type === "group";

  const v = {
    left: props.left ?? 0, top: props.top ?? 0, width: props.width ?? 0, height: props.height ?? 0,
    angle: props.angle ?? 0, opacity: props.opacity ?? 100, fontSize: props.fontSize ?? 24,
    fontFamily: props.fontFamily ?? "Inter", fontWeight: props.fontWeight ?? "normal",
    fontStyle: props.fontStyle ?? "normal", textAlign: props.textAlign ?? "left",
    fill: props.fill ?? "#000000", stroke: props.stroke ?? "#000000", strokeWidth: props.strokeWidth ?? 0,
    rx: props.rx ?? 0, backgroundColor: props.backgroundColor ?? "",
    boxPaddingTop: props.boxPaddingTop ?? 0, boxPaddingRight: props.boxPaddingRight ?? 0,
    boxPaddingBottom: props.boxPaddingBottom ?? 0, boxPaddingLeft: props.boxPaddingLeft ?? 0,
    boxStroke: props.boxStroke ?? "#000000", boxStrokeWidth: props.boxStrokeWidth ?? 0,
    shadowEnabled: props.shadowEnabled ?? false, shadowColor: props.shadowColor ?? "rgba(0,0,0,0.3)",
    shadowBlur: props.shadowBlur ?? 10, shadowOffsetX: props.shadowOffsetX ?? 5, shadowOffsetY: props.shadowOffsetY ?? 5,
    cardTitle: props.cardTitle ?? "", cardPrice: props.cardPrice ?? "", cardButton: props.cardButton ?? "",
    cardImageName: props.cardImageName ?? "",
    cardBgColor: props.cardBgColor ?? "#ffffff",
    profileName: props.profileName ?? "", profileRole: props.profileRole ?? "",
    profileImageName: props.profileImageName ?? "",
    profileBgColor: props.profileBgColor ?? "#ffffff",
    mapLat: props.mapLat ?? DEFAULT_MAP_LAT,
    mapLng: props.mapLng ?? DEFAULT_MAP_LNG,
    mapZoom: props.mapZoom ?? DEFAULT_MAP_ZOOM,
    pricingTitle: props.pricingTitle ?? "", pricingPrice: props.pricingPrice ?? "", pricingButton: props.pricingButton ?? "",
    videoSrc: props.videoSrc ?? "",
  };

  return (
    <div className="props-content fade-in">
      <section className="props-section">
        <h4 className="props-section-title">Dimensions & Position</h4>
        <div className="props-grid-2">
          <PropField label="X" value={v.left} onChange={val => apply("left", +val)} type="number" />
          <PropField label="Y" value={v.top} onChange={val => apply("top", +val)} type="number" />
          <PropField label="Largeur" value={v.width} onChange={val => apply("width", +val)} type="number" />
          <PropField label="Hauteur" value={v.height} onChange={val => apply("height", +val)} type="number" />
          <PropField label="Angle °" value={v.angle} onChange={val => apply("angle", +val)} type="number" />
          <PropField label="Opacité %" value={v.opacity} onChange={val => apply("opacity", +val)} type="number" min="0" max="100" />
        </div>
      </section>

      {isGroup && selectedObject.customName === "Carte Produit" && (
        <section className="props-section">
          <h4 className="props-section-title">Contenu Carte Produit</h4>
          <div className="props-grid-1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PropField label="Couleur de fond" type="color" value={v.cardBgColor} onChange={val => applyGroupBgFill(0, "cardBgColor", val)} />
            <label style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "8px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", fontWeight: "600" }}>
              Uploader image produit
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleCardImageUpload} />
            </label>
            {v.cardImageName && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Image active: {v.cardImageName}</div>
            )}
            <PropField label="Titre" value={v.cardTitle} onChange={val => applyGroupText(2, "cardTitle", val)} />
            <PropField label="Prix" value={v.cardPrice} onChange={val => applyGroupText(3, "cardPrice", val)} />
            <PropField label="Texte Bouton" value={v.cardButton} onChange={val => applyGroupText(5, "cardButton", val)} />
          </div>
        </section>
      )}

      {isGroup && selectedObject.customName === "Profil Utilisateur" && (
        <section className="props-section">
          <h4 className="props-section-title">Contenu Profil</h4>
          <div className="props-grid-1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PropField label="Couleur de fond" type="color" value={v.profileBgColor} onChange={val => applyGroupBgFill(0, "profileBgColor", val)} />
            <label style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "8px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", fontWeight: "600" }}>
              Uploader photo profil
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleProfileImageUpload} />
            </label>
            {v.profileImageName && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Photo active: {v.profileImageName}</div>
            )}
            <PropField label="Nom" value={v.profileName} onChange={val => applyGroupText(2, "profileName", val)} />
            <PropField label="Rôle" value={v.profileRole} onChange={val => applyGroupText(3, "profileRole", val)} />
          </div>
        </section>
      )}

      {isGroup && selectedObject.customName === "Tableau de Prix" && (
        <section className="props-section">
          <h4 className="props-section-title">Contenu Prix</h4>
          <div className="props-grid-1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PropField label="Offre" value={v.pricingTitle} onChange={val => applyGroupText(1, "pricingTitle", val)} />
            <PropField label="Prix" value={v.pricingPrice} onChange={val => applyGroupText(2, "pricingPrice", val)} />
            <PropField label="Texte Bouton" value={v.pricingButton} onChange={val => applyGroupText(7, "pricingButton", val)} />
          </div>
        </section>
      )}

      {isGroup && selectedObject.customName === "Carte (Map)" && (
        <section className="props-section">
          <h4 className="props-section-title">Carte (OpenStreetMap)</h4>
          <div className="props-grid-1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PropField label="Latitude" type="number" value={v.mapLat} onChange={val => applyMapField("mapLat", val)} />
            <PropField label="Longitude" type="number" value={v.mapLng} onChange={val => applyMapField("mapLng", val)} />
            <PropField label="Zoom (1–18)" type="number" value={v.mapZoom} onChange={val => applyMapField("mapZoom", val)} min="1" max="18" />
            <button type="button" className="version-btn" style={{ width: "100%", justifyContent: "center" }} onClick={refreshMapPreview}>
              Actualiser la carte
            </button>
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, margin: 0 }}>
              Aperçu statique (OpenStreetMap). Cliquez sur « Actualiser » après modification des coordonnées.
            </p>
          </div>
        </section>
      )}

      {isVideoObject(selectedObject) && (
        <section className="props-section">
          <h4 className="props-section-title">Vidéo</h4>
          <PropField label="Lien externe (YouTube, MP4)" value={v.videoSrc && !v.videoSrc.startsWith("blob:") ? v.videoSrc : ""} onChange={val => applyVideoSrc(val)} />
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "8px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", fontWeight: "600" }}>
              Tester une vidéo locale
              <input type="file" accept="video/mp4,video/webm" style={{ display: "none" }} onChange={handleVideoUpload} />
            </label>
            {v.videoSrc && v.videoSrc.startsWith("blob:") && <div style={{ marginTop: 8, fontSize: 11, color: "var(--warning)", lineHeight: "1.2" }}>⚠️ Vidéo locale active.<br />(Visualisation temporaire, utilisez un lien externe pour la sauvegarde complète).</div>}
          </div>
        </section>
      )}

      {isText && (
        <section className="props-section">
          <h4 className="props-section-title">Typographie</h4>
          <div className="props-row">
            <select value={v.fontFamily} onChange={e => apply("fontFamily", e.target.value)} className="props-select w-full">
              {["Inter", "Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS", "Impact"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="props-row">
            <label className="props-label">Taille</label>
            <input type="number" value={v.fontSize} min="6" max="200" onChange={e => apply("fontSize", +e.target.value)} className="props-input-sm" />
          </div>
          <div className="props-row">
            <div className="btn-group">
              <button className={`props-toggle ${v.fontWeight === "bold" ? "active" : ""}`} onClick={() => apply("fontWeight", v.fontWeight === "bold" ? "normal" : "bold")}><Bold size={13} /></button>
              <button className={`props-toggle ${v.fontStyle === "italic" ? "active" : ""}`} onClick={() => apply("fontStyle", v.fontStyle === "italic" ? "normal" : "italic")}><Italic size={13} /></button>
            </div>
            <div className="btn-group">
              {[["left", <AlignLeft size={13} />], ["center", <AlignCenter size={13} />], ["right", <AlignRight size={13} />]].map(([a, icon]) => (
                <button key={a} className={`props-toggle ${v.textAlign === a ? "active" : ""}`} onClick={() => apply("textAlign", a)}>{icon}</button>
              ))}
            </div>
          </div>
          <div className="props-row"><label className="props-label">Couleur du texte</label><div className="color-row"><input type="color" value={v.fill.startsWith("#") ? v.fill : "#000000"} onChange={e => apply("fill", e.target.value)} className="props-color" /><span className="color-hex">{v.fill.startsWith("#") ? v.fill : "—"}</span></div></div>
          <div className="props-row"><label className="props-label">Contour texte</label><div className="color-row"><input type="color" value={v.stroke.startsWith("#") ? v.stroke : "#000000"} onChange={e => apply("stroke", e.target.value)} className="props-color" /><input type="number" value={v.strokeWidth} min="0" max="10" onChange={e => apply("strokeWidth", +e.target.value)} className="props-input-sm" /></div></div>
        </section>
      )}

      {isText && (
        <section className="props-section">
          <h4 className="props-section-title">Fond de la boîte</h4>
          <div className="props-row">
            <label className="props-label">Activer</label>
            <input type="checkbox" checked={!!v.backgroundColor} onChange={e => apply("backgroundColor", e.target.checked ? "#e2e8f0" : "")} className="custom-checkbox" />
          </div>
          {!!v.backgroundColor && (
            <div className="fade-in">
              <div className="props-row"><label className="props-label">Couleur de fond</label><div className="color-row"><input type="color" value={v.backgroundColor} onChange={e => apply("backgroundColor", e.target.value)} className="props-color" /><span className="color-hex">{v.backgroundColor}</span></div></div>
              <div className="props-row" style={{ marginBottom: 4 }}><label className="props-label" style={{ fontSize: 11 }}>Padding (H, Dr, B, G)</label></div>
              <div className="props-grid-4">
                <input type="number" value={v.boxPaddingTop} onChange={e => applyPadding("Top", +e.target.value)} className="props-input-xs" />
                <input type="number" value={v.boxPaddingRight} onChange={e => applyPadding("Right", +e.target.value)} className="props-input-xs" />
                <input type="number" value={v.boxPaddingBottom} onChange={e => applyPadding("Bottom", +e.target.value)} className="props-input-xs" />
                <input type="number" value={v.boxPaddingLeft} onChange={e => applyPadding("Left", +e.target.value)} className="props-input-xs" />
              </div>
              <div className="props-row"><label className="props-label">Bordure</label><div className="color-row"><input type="color" value={v.boxStroke.startsWith("#") ? v.boxStroke : "#000000"} onChange={e => apply("boxStroke", e.target.value)} className="props-color" /><input type="number" value={v.boxStrokeWidth} min="0" max="50" onChange={e => apply("boxStrokeWidth", +e.target.value)} className="props-input-sm" /></div></div>
              <div className="props-row"><label className="props-label">Arrondi</label><input type="number" value={v.rx} min="0" max="200" onChange={e => { apply("rx", +e.target.value); apply("ry", +e.target.value); }} className="props-input-sm" /></div>
            </div>
          )}
        </section>
      )}

      {!isGroup && !isText && (
        <section className="props-section">
          <h4 className="props-section-title">Apparence</h4>
          {!isLine && (<div className="props-row"><label className="props-label">Remplissage</label><div className="color-row"><input type="color" value={v.fill.startsWith("#") ? v.fill : "#000000"} onChange={e => apply("fill", e.target.value)} className="props-color" /><span className="color-hex">{v.fill.startsWith("#") ? v.fill : "—"}</span></div></div>)}
          <div className="props-row"><label className="props-label">Contour</label><div className="color-row"><input type="color" value={v.stroke.startsWith("#") ? v.stroke : "#000000"} onChange={e => apply("stroke", e.target.value)} className="props-color" /><input type="number" value={v.strokeWidth} min="0" max="50" onChange={e => apply("strokeWidth", +e.target.value)} className="props-input-sm" /></div></div>
          {selectedObject.type === "rect" && (<div className="props-row"><label className="props-label">Arrondi</label><input type="number" value={v.rx} min="0" max="200" onChange={e => { apply("rx", +e.target.value); apply("ry", +e.target.value); }} className="props-input-sm" /></div>)}
        </section>
      )}

      <section className="props-section">
        <div className="props-row" style={{ marginBottom: v.shadowEnabled ? 12 : 0 }}>
          <h4 className="props-section-title" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>Ombre portée</h4>
          <input type="checkbox" checked={v.shadowEnabled} onChange={e => applyShadow("shadowEnabled", e.target.checked)} className="custom-checkbox" />
        </div>
        {v.shadowEnabled && (
          <div className="fade-in">
            <div className="props-row"><label className="props-label">Couleur</label><div className="color-row"><input type="color" value={v.shadowColor.startsWith("#") ? v.shadowColor : "#000000"} onChange={e => applyShadow("shadowColor", e.target.value)} className="props-color" /></div></div>
            <div className="props-row"><label className="props-label">Flou</label><input type="number" value={v.shadowBlur} min="0" max="100" onChange={e => applyShadow("shadowBlur", +e.target.value)} className="props-input-sm" /></div>
            <div className="props-grid-2">
              <PropField label="Décalage X" value={v.shadowOffsetX} onChange={val => applyShadow("shadowOffsetX", +val)} type="number" />
              <PropField label="Décalage Y" value={v.shadowOffsetY} onChange={val => applyShadow("shadowOffsetY", +val)} type="number" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const PropField = ({ label, value, onChange, type = "text", min, max }) => (
  <div className="prop-field">
    <span className="prop-field-label">{label}</span>
    <input className="prop-field-input" type={type} value={value ?? ""} min={min} max={max} onChange={e => onChange(e.target.value)} />
  </div>
);

// ─── LAYERS PANEL ─────────────────────────────────────────────────────────────
const LayersPanel = ({ canvas, selectedObject, onSelectObject, refreshKey }) => {
  const [layers, setLayers] = useState([]);
  const refresh = useCallback(() => { if (!canvas) return; setLayers(canvas.getObjects().slice().reverse()); }, [canvas]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const toggleVisibility = (obj) => { obj.set("visible", !obj.visible); canvas.renderAll(); refresh(); };
  const toggleLock = (obj) => {
    const locked = !obj.lockMovementX;
    obj.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, selectable: !locked });
    canvas.renderAll(); refresh();
  };
  const deleteObj = (obj) => { canvas.remove(obj); canvas.renderAll(); };

  return (
    <div className="layers-panel fade-in">
      <div className="layers-order-btns">
        <button title="Premier plan" onClick={() => { canvas?.bringObjectToFront(selectedObject); canvas?.renderAll(); refresh(); }} disabled={!selectedObject}><ChevronsUp size={14} /></button>
        <button title="Avancer" onClick={() => { canvas?.bringObjectForward(selectedObject); canvas?.renderAll(); refresh(); }} disabled={!selectedObject}><ChevronUp size={14} /></button>
        <button title="Reculer" onClick={() => { canvas?.sendObjectBackwards(selectedObject); canvas?.renderAll(); refresh(); }} disabled={!selectedObject}><ChevronDown size={14} /></button>
        <button title="Arrière-plan" onClick={() => { canvas?.sendObjectToBack(selectedObject); canvas?.renderAll(); refresh(); }} disabled={!selectedObject}><ChevronsDown size={14} /></button>
      </div>
      <div className="layers-list">
        {layers.length === 0 && <div className="layers-empty">Aucun calque</div>}
        {layers.map((obj, i) => (
          <div key={i} className={`layer-item ${obj === selectedObject ? "selected" : ""}`} onClick={() => { canvas.setActiveObject(obj); canvas.renderAll(); onSelectObject(obj); }}>
            <span className="layer-thumb" style={{ background: obj.type === "line" ? obj.stroke : (typeof obj.fill === "string" ? obj.fill : "#e2e8f0") }} />
            <span className="layer-name">{getObjectLabel(obj)}</span>
            <div className="layer-actions">
              <button onClick={e => { e.stopPropagation(); toggleVisibility(obj); }}>{obj.visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}</button>
              <button onClick={e => { e.stopPropagation(); toggleLock(obj); }}>{obj.lockMovementX ? <Lock size={13} /> : <Unlock size={13} />}</button>
              <button onClick={e => { e.stopPropagation(); deleteObj(obj); }}><Trash2 size={13} className="icon-danger" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
const DesignEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const gridLinesRef = useRef([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (user?.rôle || user?.role || "").toLowerCase();
  const isDesigner = userRole === "designer";
  const isClient = userRole === "client";

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

  const [validating, setValidating] = useState(false);
  const [validationDone, setValidationDone] = useState(null);
  const [validationToast, setValidationToast] = useState(null);

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
    canvas.forEachObject((obj) => {
      obj.selectable = false; obj.evented = false; obj.hasControls = false;
      obj.hasBorders = false; obj.lockMovementX = true; obj.lockMovementY = true;
      obj.lockRotation = true; obj.lockScalingX = true; obj.lockScalingY = true;
    });
    canvas.renderAll();
  }, []);

  useEffect(() => {
    if (fabric.Textbox && !fabric.Textbox.prototype.__customRenderBgSet) {
      fabric.Textbox.prototype._renderBackground = function (ctx) {
        if (!this.backgroundColor && !this.boxStroke) return;
        const pTop = this.boxPaddingTop || 0, pRight = this.boxPaddingRight || 0, pBottom = this.boxPaddingBottom || 0, pLeft = this.boxPaddingLeft || 0;
        const w = this.width + pLeft + pRight, h = this.height + pTop + pBottom;
        const x = -this.width / 2 - pLeft, y = -this.height / 2 - pTop, rx = this.rx || 0, ry = this.ry || 0;
        ctx.beginPath(); ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ry); ctx.lineTo(x + w, y + h - ry); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h); ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ry); ctx.lineTo(x, y + ry); ctx.quadraticCurveTo(x, y, x + rx, y); ctx.closePath();
        if (this.backgroundColor) { ctx.fillStyle = this.backgroundColor; ctx.fill(); }
        if (this.boxStroke && this.boxStrokeWidth) { ctx.strokeStyle = this.boxStroke; ctx.lineWidth = this.boxStrokeWidth; ctx.stroke(); }
      };
      fabric.Textbox.prototype.__customRenderBgSet = true;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [resMaquette, resVersion] = await Promise.all([API.get(`/maquettes/${id}`), API.get(`/maquettes/${id}/latest-version`)]);
        if (isMounted) {
          setDesignData({ maquette: resMaquette.data, version: resVersion.data });
          setCurrentVersionNum(resVersion.data.numéro_version);
          maquetteIdRef.current = resMaquette.data._id;
          currentVersionIdRef.current = resVersion.data._id;
        }
      } catch { if (isMounted) setSaveStatus("Erreur de chargement"); }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id]);

  const fetchCorrectionsForVersion = useCallback(async (versionId) => {
    if (!isDesigner || !id || !versionId) return;
    try {
      const { data } = await API.get("/validations/corrections-designer");
      const filtered = Array.isArray(data)
        ? data.filter(c => c.version_id?._id === versionId)
        : [];
      setCorrections(filtered);
    } catch (_) { }
  }, [id, isDesigner]);

  const [corrections, setCorrections] = useState([]);
  const [showCorrections, setShowCorrections] = useState(false);

  useEffect(() => {
    if (!isDesigner || !id) return;
    if (currentVersionIdRef.current) {
      fetchCorrectionsForVersion(currentVersionIdRef.current);
    }
  }, [id, isDesigner, fetchCorrectionsForVersion]);

  const fetchVersions = async () => {
    if (!maquetteIdRef.current) return;
    try { const { data } = await API.get(`/versions/maquette/${maquetteIdRef.current}`); setVersions(data); }
    catch (err) { console.error("Erreur chargement versions", err); }
  };

  useEffect(() => {
    if (!designData?.maquette?._id) return;
    setSaveStatus("Initialisation…");
    wrapperRef.current.innerHTML = "";
    const el = document.createElement("canvas");
    wrapperRef.current.appendChild(el);
    canvasRef.current = el;
    const canvas = new fabric.Canvas(el, { width: 1000, height: 700, backgroundColor: "#ffffff", preserveObjectStacking: true });
    setFabricCanvas(canvas);

    const initCanvasState = async () => {
      try {
        if (designData.version?.contenu?.objects?.length) {
          const loadRes = canvas.loadFromJSON(designData.version.contenu);
          if (loadRes && typeof loadRes.then === "function") await loadRes;
          reviveVideos(canvas);
          reviveMaps(canvas);
        }
        canvas.renderAll(); setSaveStatus("À jour ☁️");
        if (!isDesigner) lockCanvasObjects(canvas);
        if (currentVersionIdRef.current) {
          await fetchCorrectionsForVersion(currentVersionIdRef.current);
        }
      } catch { setSaveStatus("Erreur d'affichage"); }
    };
    initCanvasState();
    return () => { canvas.dispose(); setFabricCanvas(null); };
  }, [designData?.maquette?._id]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const updateSelection = (e) => { setSelectedObj(e.selected?.[0] || fabricCanvas.getActiveObject()); setLayersKey(k => k + 1); };
    fabricCanvas.on("selection:created", updateSelection);
    fabricCanvas.on("selection:updated", updateSelection);
    fabricCanvas.on("selection:cleared", () => setSelectedObj(null));
    fabricCanvas.on("object:modified", () => setLayersKey(k => k + 1));
    fabricCanvas.on("object:added", () => setLayersKey(k => k + 1));
    fabricCanvas.on("object:removed", () => setLayersKey(k => k + 1));
    fabricCanvas.on("object:moving", (e) => {
      if (!snapEnabled) return;
      e.target.set({ left: snapToGrid(e.target.left, GRID_SIZE), top: snapToGrid(e.target.top, GRID_SIZE) });
    });
    fabricCanvas.on("mouse:wheel", (opt) => {
      opt.e.preventDefault();
      if (isDesigner) {
        let z = fabricCanvas.getZoom();
        z = opt.e.deltaY > 0 ? Math.max(ZOOM_MIN, z - ZOOM_STEP) : Math.min(ZOOM_MAX, z + ZOOM_STEP);
        fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, z);
        setZoom(Math.round(z * 100));
      }
    });
    return () => fabricCanvas.off();
  }, [fabricCanvas, snapEnabled]);

  // ─── AUTO-CONTINUATION LISTE À PUCES & NUMÉROTÉE ──────────────────────────
  useEffect(() => {
    if (!fabricCanvas) return;

    // Use keyup so that Fabric and the browser have already processed the Enter key
    const handleKeyUp = (e) => {
      if (e.key !== "Enter") return;

      const obj = fabricCanvas.getActiveObject();
      // Must be editing and have access to the internal hidden text input
      if (!obj || !obj.isEditing || obj.type !== "textbox" || !obj.hiddenTextarea) return;

      const cursor = obj.hiddenTextarea.selectionStart;
      const text = obj.hiddenTextarea.value;

      // The character right before the cursor should now be the new line \n
      if (cursor === 0 || text[cursor - 1] !== '\n') return;

      // Find what the previous line started with
      const textBeforeNewline = text.substring(0, cursor - 1);
      const lastNewline = textBeforeNewline.lastIndexOf("\n");
      const previousLine = textBeforeNewline.substring(lastNewline + 1);

      let prefix = null;
      if (previousLine.startsWith("• ")) prefix = "• ";
      else {
        const olMatch = previousLine.match(/^(\d+)\.\s/);
        if (olMatch) prefix = `${parseInt(olMatch[1], 10) + 1}. `;
      }

      if (prefix) {
        // Inject the prefix directly into the hidden textarea
        const newText = text.substring(0, cursor) + prefix + text.substring(cursor);
        obj.hiddenTextarea.value = newText;

        // Move the cursor after the injected prefix
        const newCursor = cursor + prefix.length;
        obj.hiddenTextarea.selectionStart = newCursor;
        obj.hiddenTextarea.selectionEnd = newCursor;

        // Fire a native 'input' event. This forces Fabric.js to detect the change exactly
        // as if the user had typed the prefix manually, updating all its internal states smoothly!
        obj.hiddenTextarea.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        fabricCanvas.renderAll();
      }
    };

    document.addEventListener("keyup", handleKeyUp);
    return () => document.removeEventListener("keyup", handleKeyUp);
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;
    gridLinesRef.current.forEach(l => fabricCanvas.remove(l));
    gridLinesRef.current = [];
    if (!gridEnabled) { fabricCanvas.renderAll(); return; }
    const lines = [];
    for (let x = 0; x <= fabricCanvas.width; x += GRID_SIZE)
      lines.push(new fabric.Line([x, 0, x, fabricCanvas.height], { stroke: "#e2e8f0", strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true }));
    for (let y = 0; y <= fabricCanvas.height; y += GRID_SIZE)
      lines.push(new fabric.Line([0, y, fabricCanvas.width, y], { stroke: "#e2e8f0", strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true }));
    lines.forEach(l => { fabricCanvas.add(l); fabricCanvas.sendObjectToBack(l); });
    gridLinesRef.current = lines; fabricCanvas.renderAll();
  }, [fabricCanvas, gridEnabled]);

  const triggerSave = async (c, vId) => {
    if (isSwitchingVersion.current) return;
    if (!vId || !isDesigner) return;
    setSaveStatus("Sauvegarde…");
    try {
      const json = c.toJSON(["excludeFromExport", "isPlaceholder", "placeholderLabel", "customName", "boxPaddingTop", "boxPaddingRight", "boxPaddingBottom", "boxPaddingLeft", "boxStroke", "boxStrokeWidth", "rx", "ry", "videoSrc", "mapLat", "mapLng", "mapZoom"]);
      json.objects = (json.objects || []).filter(o => !o.excludeFromExport);
      await API.put(`/versions/${vId}`, { contenu: json });
      setSaveStatus("À jour ☁️");
    } catch { setSaveStatus("Erreur ❌"); }
  };

  const debouncedSave = useRef(debounce((c, v) => triggerSave(c, v), 1000)).current;

  useEffect(() => {
    if (!fabricCanvas || !designData?.version?._id || !isDesigner) return;
    const vId = designData.version._id;
    const handleChange = () => { if (isSwitchingVersion.current) return; debouncedSave(fabricCanvas, vId); };
    const handleRemove = () => { if (isSwitchingVersion.current) return; debouncedSave.cancel(); triggerSave(fabricCanvas, vId); };
    fabricCanvas.on("object:modified", handleChange);
    fabricCanvas.on("object:added", handleChange);
    fabricCanvas.on("object:removed", handleRemove);
    fabricCanvas.on("text:changed", handleChange);
    fabricCanvas.on("editing:exited", handleChange);
    return () => {
      fabricCanvas.off("object:modified", handleChange);
      fabricCanvas.off("object:added", handleChange);
      fabricCanvas.off("object:removed", handleRemove);
      fabricCanvas.off("text:changed", handleChange);
      fabricCanvas.off("editing:exited", handleChange);
    };
  }, [fabricCanvas, designData, debouncedSave, isDesigner]);

  useEffect(() => {
    const handler = (e) => {
      if (!isDesigner) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObjects = fabricCanvas?.getActiveObjects() || [];
        if (activeObjects.length > 0) {
          // Si l'un des objets est en cours d'édition de texte (ex: Focus dans un Textbox), on ne supprime pas !
          if (activeObjects.some(obj => obj.isEditing)) return;

          activeObjects.forEach(obj => fabricCanvas.remove(obj));
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          setSelectedObj(null);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        const obj = fabricCanvas?.getActiveObject();
        if (!obj) return;
        obj.clone(clone => { clone.set({ left: obj.left + 20, top: obj.top + 20 }); fabricCanvas.add(clone); fabricCanvas.setActiveObject(clone); fabricCanvas.renderAll(); });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fabricCanvas, isDesigner]);

  const handleNouvelleVersion = async () => {
    if (!fabricCanvas || !maquetteIdRef.current || creatingVersion || !isDesigner) return;
    setCreatingVersion(true);
    try {
      const json = fabricCanvas.toJSON(["excludeFromExport", "isPlaceholder", "placeholderLabel", "customName", "boxPaddingTop", "boxPaddingRight", "boxPaddingBottom", "boxPaddingLeft", "boxStroke", "boxStrokeWidth", "rx", "ry", "videoSrc", "mapLat", "mapLng", "mapZoom"]);
      const { data } = await API.post("/versions", { contenu: json, id_maquette: maquetteIdRef.current, commentaire: "Nouvelle version manuelle" });
      const newVersion = data.version;
      setCurrentVersionNum(newVersion.numéro_version);
      currentVersionIdRef.current = newVersion._id;
      setSaveStatus("À jour ☁️");
      setDesignData(prev => ({ ...prev, version: newVersion }));
      setVersionSuccess(true);
      setTimeout(() => setVersionSuccess(false), 2000);
      await fetchVersions();
    } catch { setSaveStatus("Erreur création version ❌"); }
    finally { setCreatingVersion(false); }
  };

  const handleLoadVersion = async (version) => {
    if (!fabricCanvas || loadingVersion) return;
    setDropdownOpen(false); setLoadingVersion(true);
    isSwitchingVersion.current = true; debouncedSave.cancel();
    try {
      let contenu = version.contenu;
      if (!contenu || !contenu.objects) {
        const { data: fullVersion } = await API.get(`/versions/${version._id}`);
        contenu = fullVersion.contenu || fullVersion?.version?.contenu;
      }
      if (contenu?.objects?.length > 0) {
        const loadRes = fabricCanvas.loadFromJSON(contenu);
        if (loadRes && typeof loadRes.then === "function") await loadRes;
        reviveVideos(fabricCanvas);
        reviveMaps(fabricCanvas);
        fabricCanvas.renderAll();
      } else {
        fabricCanvas.remove(...fabricCanvas.getObjects());
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.renderAll();
      }
      if (!isDesigner) lockCanvasObjects(fabricCanvas);
      setCurrentVersionNum(version.numéro_version);
      currentVersionIdRef.current = version._id;
      setDesignData(prev => ({ ...prev, version: { ...version, contenu } }));
      setSaveStatus(`Version ${version.numéro_version} chargée`);
      setValidationDone(null);
      setShowCorrections(false);
      await fetchCorrectionsForVersion(version._id);
    } catch (err) {
      console.error("Erreur chargement version", err);
      setSaveStatus("Erreur chargement version ❌");
    } finally {
      setLoadingVersion(false);
      setTimeout(() => { isSwitchingVersion.current = false; }, 300);
    }
  };

  const handleToggleDropdown = async () => { if (!dropdownOpen) await fetchVersions(); setDropdownOpen(prev => !prev); };

  const handleReset = async () => {
    if (!fabricCanvas || !designData?.version || !isDesigner) return;
    if (!window.confirm("Annuler toutes les modifications non sauvegardées ?")) return;
    setSaveStatus("Réinitialisation..."); isSwitchingVersion.current = true; debouncedSave.cancel();
    try {
      const contenu = designData.version.contenu;
      if (contenu?.objects?.length > 0) {
        const loadRes = fabricCanvas.loadFromJSON(contenu);
        if (loadRes && typeof loadRes.then === "function") await loadRes;
        reviveVideos(fabricCanvas);
        reviveMaps(fabricCanvas);
      } else { fabricCanvas.remove(...fabricCanvas.getObjects()); fabricCanvas.backgroundColor = "#ffffff"; }
      fabricCanvas.renderAll();
      try {
        const json = fabricCanvas.toJSON(["excludeFromExport", "isPlaceholder", "placeholderLabel", "customName", "boxPaddingTop", "boxPaddingRight", "boxPaddingBottom", "boxPaddingLeft", "boxStroke", "boxStrokeWidth", "rx", "ry", "videoSrc", "mapLat", "mapLng", "mapZoom"]);
        json.objects = (json.objects || []).filter(o => !o.excludeFromExport);
        await API.put(`/versions/${designData?.version?._id}`, { contenu: json });
        setSaveStatus("À jour ☁️");
      } catch { setSaveStatus("Erreur ❌"); }
    } catch { setSaveStatus("Erreur réinitialisation ❌"); }
    finally { setTimeout(() => { isSwitchingVersion.current = false; }, 300); }
  };

  // ✅ CORRECTION SUPPRESSION VERSION
  const handleDeleteVersion = async (e, versionId) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer définitivement cette version ?")) return;
    setDeletingVersionId(versionId);
    try {
      const response = await API.delete(`/versions/${versionId}`);

      // Recharger la liste des versions
      await fetchVersions();

      // Si la version supprimée était la version courante, charger la dernière version disponible
      if (versionId === currentVersionIdRef.current) {
        try {
          const { data: latestVersion } = await API.get(`/maquettes/${maquetteIdRef.current}/latest-version`);
          await handleLoadVersion(latestVersion);
        } catch (err) {
          console.error("Erreur chargement dernière version :", err);
          setSaveStatus("Erreur lors du chargement de la dernière version ❌");
        }
      }

      setValidationToast({ type: "success", msg: "✅ Version supprimée avec succès" });
      setTimeout(() => setValidationToast(null), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Erreur lors de la suppression.";
      console.error("Erreur suppression version :", err);
      setValidationToast({ type: "error", msg: `❌ ${errorMsg}` });
      setTimeout(() => setValidationToast(null), 4000);
    } finally {
      setDeletingVersionId(null);
    }
  };

  const handleValider = async () => {
    if (!designData || validating || validationDone === "validé") return;
    const maquetteId = designData.maquette?._id;
    const versionId = currentVersionIdRef.current;
    const userId = user?.id || user?._id;
    if (!maquetteId || !versionId) {
      setValidationToast({ type: "error", msg: "❌ Données manquantes, impossible de valider." });
      setTimeout(() => setValidationToast(null), 4000); return;
    }
    if (!window.confirm(`Confirmer la validation de la version ${currentVersionNum} ?\n\nCette action est définitive.`)) return;
    setValidating(true);
    try {
      await API.post("/validations", { maquette_id: maquetteId, version_id: versionId, client_id: userId, statut: "validé" });
      setValidationDone("validé");
      setValidationToast({ type: "success", msg: `✅ Version ${currentVersionNum} validée !` });
      setTimeout(() => setValidationToast(null), 5000);
    } catch (err) {
      setValidationToast({ type: "error", msg: `❌ ${err.response?.data?.message || "Erreur lors de la validation."}` });
      setTimeout(() => setValidationToast(null), 5000);
    } finally { setValidating(false); }
  };

  const [rejetModal, setRejetModal] = useState(false);
  const [rejetElements, setRejetElements] = useState([]);
  const [rejetSubmitting, setRejetSubmitting] = useState(false);

  const openRejetModal = () => {
    if (!fabricCanvas) return;
    const objets = fabricCanvas.getObjects().filter(o => !o.excludeFromExport && o.visible !== false);
    const elements = objets.map((obj, i) => {
      let thumbnail = "";
      try {
        const bounds = obj.getBoundingRect(true);
        const THUMB_W = 80, THUMB_H = 48;
        const scaleX = THUMB_W / Math.max(bounds.width, 1), scaleY = THUMB_H / Math.max(bounds.height, 1);
        const scale = Math.min(scaleX, scaleY, 1);
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = THUMB_W; tmpCanvas.height = THUMB_H;
        const ctx = tmpCanvas.getContext("2d");
        ctx.fillStyle = "#f0f2f5"; ctx.fillRect(0, 0, THUMB_W, THUMB_H);
        const offX = (THUMB_W - bounds.width * scale) / 2 - bounds.left * scale;
        const offY = (THUMB_H - bounds.height * scale) / 2 - bounds.top * scale;
        ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale);
        obj.render(ctx); ctx.restore();
        thumbnail = tmpCanvas.toDataURL("image/png");
      } catch (_) { }
      const couleur = (typeof obj.fill === "string" && obj.fill && obj.fill !== "transparent") ? obj.fill : (obj.stroke || "#94A3B8");
      const texte = (obj.type === "i-text" || obj.type === "textbox") ? (obj.text || "").slice(0, 50) : "";
      const typeIcon = { "i-text": "T", "textbox": "T", "rect": "▭", "circle": "◯", "ellipse": "◯", "triangle": "△", "line": "—", "image": "🖼", "group": "⊞" }[obj.type] || "◆";
      return { id_element: obj.customName || obj.type + "_" + i, label_element: obj.customName || getObjectLabel(obj), commentaire_client: "", _thumbnail: thumbnail, _couleur: couleur, _texte: texte, _typeIcon: typeIcon, _type: obj.type };
    });
    setRejetElements(elements); setRejetModal(true);
  };

  const handleRejetSubmit = async () => {
    if (!designData || rejetSubmitting) return;
    const maquetteId = designData.maquette?._id;
    const versionId = currentVersionIdRef.current;
    const userId = user?.id || user?._id;
    if (!maquetteId || !versionId) return;
    setRejetSubmitting(true);
    try {
      await API.post("/validations", {
        maquette_id: maquetteId, version_id: versionId, client_id: userId, statut: "à corriger",
        commentaires: rejetElements.map(({ id_element, label_element, commentaire_client, _thumbnail }) => ({ id_element, label_element, commentaire_client, thumbnail: _thumbnail || "" })),
      });
      setRejetModal(false); setValidationDone("à corriger");
      setValidationToast({ type: "info", msg: "📨 Rejet transmis à l'admin." });
      setTimeout(() => setValidationToast(null), 5000);
    } catch (err) {
      setValidationToast({ type: "error", msg: `❌ ${err.response?.data?.message || "Erreur."}` });
      setTimeout(() => setValidationToast(null), 5000);
    } finally { setRejetSubmitting(false); }
  };

  const formatDate = (dateStr) => { if (!dateStr) return ""; return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

  const addElementToCanvas = (item, x = 100, y = 100) => {
    if (!fabricCanvas || !isDesigner) return;
    let obj;
    if (item.type === "text") {
      const tc = { left: x, top: y, fill: "#0f172a", fontFamily: "Inter", width: 300 };
      if (item.variant === "h1") obj = new fabric.Textbox("Grand Titre", { ...tc, fontSize: 48, fontWeight: "bold", width: 400 });
      else if (item.variant === "h2") obj = new fabric.Textbox("Sous-titre", { ...tc, fontSize: 32, fontWeight: "600", fill: "#334155" });
      else if (item.variant === "p") obj = new fabric.Textbox("Ceci est un paragraphe de texte standard.", { ...tc, fontSize: 16 });
      else if (item.variant === "ul") obj = new fabric.Textbox("• Élément 1\n• Élément 2\n• Élément 3", { ...tc, fontSize: 18 });
      else if (item.variant === "ol") obj = new fabric.Textbox("1. Premier point\n2. Deuxième point", { ...tc, fontSize: 18 });
      else if (item.variant === "quote") obj = new fabric.Textbox('"Citation inspirante."', { ...tc, fontSize: 20, fontStyle: "italic", fill: "#64748b" });
    } else if (item.type === "shape") {
      if (item.variant === "rect") obj = new fabric.Rect({ left: x, top: y, fill: "#6366f1", width: 120, height: 120, rx: 8, ry: 8 });
      else if (item.variant === "circle") obj = new fabric.Circle({ left: x, top: y, fill: "#ec4899", radius: 60 });
      else if (item.variant === "triangle") obj = new fabric.Triangle({ left: x, top: y, fill: "#10b981", width: 120, height: 120 });
      else if (item.variant === "ellipse") obj = new fabric.Ellipse({ left: x, top: y, fill: "#f59e0b", rx: 80, ry: 50 });
      else if (item.variant === "line") obj = new fabric.Line([0, 0, 200, 0], { stroke: "#334155", strokeWidth: 4, left: x, top: y });
      else if (item.variant === "frame") obj = new fabric.Rect({ left: x, top: y, fill: "transparent", stroke: "#cbd5e1", strokeDashArray: [8, 8], strokeWidth: 2, width: 300, height: 200, rx: 4, ry: 4 });
    } else if (item.type === "advanced_shape") {
      if (item.variant === "polygon") obj = new fabric.Polygon([{ x: 25, y: 0 }, { x: 75, y: 0 }, { x: 100, y: 43 }, { x: 75, y: 86 }, { x: 25, y: 86 }, { x: 0, y: 43 }], { left: x, top: y, fill: "#8b5cf6" });
      else if (item.variant === "star") obj = new fabric.Polygon([{ x: 50, y: 0 }, { x: 61, y: 35 }, { x: 98, y: 35 }, { x: 68, y: 57 }, { x: 79, y: 91 }, { x: 50, y: 70 }, { x: 21, y: 91 }, { x: 32, y: 57 }, { x: 2, y: 35 }, { x: 39, y: 35 }], { left: x, top: y, fill: "#f59e0b" });
      else if (item.variant === "zap") obj = new fabric.Polygon([{ x: 40, y: 0 }, { x: 0, y: 50 }, { x: 30, y: 50 }, { x: 20, y: 100 }, { x: 60, y: 40 }, { x: 30, y: 40 }], { left: x, top: y, fill: "#eab308" });
      else if (item.variant === "arrow_r") obj = new fabric.Polygon([{ x: 0, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 0 }, { x: 80, y: 30 }, { x: 50, y: 60 }, { x: 50, y: 40 }, { x: 0, y: 40 }], { left: x, top: y, fill: "#ef4444" });
      else if (item.variant === "arrow_double") obj = new fabric.Polygon([{ x: 30, y: 20 }, { x: 70, y: 20 }, { x: 70, y: 0 }, { x: 100, y: 30 }, { x: 70, y: 60 }, { x: 70, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 0, y: 30 }, { x: 30, y: 0 }], { left: x, top: y, fill: "#ef4444" });
      else if (item.variant === "cloud") obj = new fabric.Path("M 25 60 a 20 20 0 0 1 0 -40 a 25 25 0 0 1 50 0 a 20 20 0 0 1 0 40 Z", { left: x, top: y, fill: "#38bdf8" });
    } else if (item.type === "complex") {
      let elements = [];
      if (item.variant === "button") { const bg = new fabric.Rect({ width: 140, height: 45, rx: 8, ry: 8, fill: "#4f46e5", originX: "center", originY: "center" }); const txt = new fabric.Text("Bouton", { fontSize: 16, fill: "#ffffff", fontFamily: "Inter", fontWeight: "600", originX: "center", originY: "center" }); elements = [bg, txt]; }
      else if (item.variant === "input") { const bg = new fabric.Rect({ width: 250, height: 45, rx: 6, ry: 6, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1, originX: "center", originY: "center" }); const txt = new fabric.Text("Tapez ici...", { fontSize: 14, fill: "#94a3b8", fontFamily: "Inter", originX: "left", originY: "center", left: -110 }); elements = [bg, txt]; }
      else if (item.variant === "toggle") { const bg = new fabric.Rect({ width: 50, height: 26, rx: 13, ry: 13, fill: "#10b981", originX: "center", originY: "center" }); const circle = new fabric.Circle({ radius: 10, fill: "#ffffff", originX: "center", originY: "center", left: 10 }); elements = [bg, circle]; }
      else if (item.variant === "checkbox") { const bg = new fabric.Rect({ width: 24, height: 24, rx: 4, ry: 4, fill: "#4f46e5", originX: "center", originY: "center" }); const check = new fabric.Text("✓", { fontSize: 16, fill: "#ffffff", originX: "center", originY: "center", top: 1 }); const label = new fabric.Text("Option", { fontSize: 14, fill: "#0f172a", fontFamily: "Inter", originX: "left", originY: "center", left: 20 }); elements = [bg, check, label]; }
      else if (item.variant === "slider") { const line = new fabric.Line([-75, 0, 75, 0], { stroke: "#cbd5e1", strokeWidth: 4 }); const lineActive = new fabric.Line([-75, 0, 0, 0], { stroke: "#4f46e5", strokeWidth: 4 }); const handle = new fabric.Circle({ radius: 10, fill: "#ffffff", stroke: "#4f46e5", strokeWidth: 2, originX: "center", originY: "center" }); elements = [line, lineActive, handle]; }
      else if (item.variant === "video") {
        const bg = new fabric.Rect({ width: 320, height: 180, fill: "#1e293b", rx: 8, ry: 8, originX: "center", originY: "center" });
        const playBtn = new fabric.Circle({ radius: 30, fill: "rgba(255,255,255,0.2)", originX: "center", originY: "center" });
        const playIcon = new fabric.Triangle({ width: 20, height: 20, fill: "#ffffff", originX: "center", originY: "center", left: 4, angle: 90 });
        const txt = new fabric.Text("Sélectionnez puis uploader via la barre droite", { fontSize: 13, fill: "#e2e8f0", fontFamily: "Inter", originX: "center", originY: "center", top: 60 });
        elements = [bg, playBtn, playIcon, txt];
      }
      else if (item.variant === "map") {
        const mw = 300;
        const mh = 200;
        const frame = new fabric.Rect({ width: mw, height: mh, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1, rx: 8, ry: 8, originX: "center", originY: "center" });
        const mapArea = new fabric.Rect({ width: mw - 8, height: mh - 8, fill: "#dbeafe", rx: 6, ry: 6, originX: "center", originY: "center", top: 0, left: 0, stroke: "#bae6fd", strokeWidth: 1 });
        const shadow = new fabric.Ellipse({ rx: 10, ry: 4, fill: "rgba(0,0,0,0.2)", originX: "center", originY: "center", top: 58 });
        const pin = new fabric.Circle({ radius: 12, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2, originX: "center", originY: "center", top: -22 });
        elements = [frame, mapArea, shadow, pin];
      }
      else if (item.variant === "card") { const bg = new fabric.Rect({ width: 240, height: 320, fill: "#ffffff", rx: 12, ry: 12, stroke: "#e2e8f0", strokeWidth: 1, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.1)", blur: 10, offsetY: 4 }) }); const img = new fabric.Rect({ width: 240, height: 140, fill: "#cbd5e1", originX: "center", originY: "top", top: -160, rx: 12, ry: 12 }); const title = new fabric.Text("Produit", { fontSize: 18, fontWeight: "bold", fill: "#0f172a", fontFamily: "Inter", originX: "left", originY: "top", left: -100, top: -5 }); const price = new fabric.Text("29,99 €", { fontSize: 16, fill: "#4f46e5", fontWeight: "600", fontFamily: "Inter", originX: "left", originY: "top", left: -100, top: 25 }); const btnBg = new fabric.Rect({ width: 200, height: 40, fill: "#0f172a", rx: 6, ry: 6, originX: "center", originY: "bottom", top: 140 }); const btnTxt = new fabric.Text("Ajouter", { fontSize: 14, fill: "#ffffff", fontWeight: "500", fontFamily: "Inter", originX: "center", originY: "bottom", top: 130 }); elements = [bg, img, title, price, btnBg, btnTxt]; }
      else if (item.variant === "profile") { const bg = new fabric.Rect({ width: 300, height: 120, fill: "#ffffff", rx: 12, ry: 12, stroke: "#e2e8f0", strokeWidth: 1, originX: "center", originY: "center" }); const avatar = new fabric.Circle({ radius: 35, fill: "#cbd5e1", originX: "center", originY: "center", left: -90 }); const name = new fabric.Text("Marie D.", { fontSize: 20, fontWeight: "bold", fill: "#0f172a", fontFamily: "Inter", originX: "left", originY: "center", left: -30, top: -15 }); const role = new fabric.Text("Marketing", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "center", left: -30, top: 15 }); elements = [bg, avatar, name, role]; }
      else if (item.variant === "chart_bar") { const lineX = new fabric.Line([-100, 80, 100, 80], { stroke: "#94a3b8", strokeWidth: 2 }); const lineY = new fabric.Line([-100, 80, -100, -80], { stroke: "#94a3b8", strokeWidth: 2 }); const bar1 = new fabric.Rect({ width: 30, height: 80, fill: "#4f46e5", originY: "bottom", left: -70, top: 80 }); const bar2 = new fabric.Rect({ width: 30, height: 130, fill: "#3b82f6", originY: "bottom", left: -20, top: 80 }); const bar3 = new fabric.Rect({ width: 30, height: 50, fill: "#60a5fa", originY: "bottom", left: 30, top: 80 }); elements = [lineX, lineY, bar1, bar2, bar3]; }
      else if (item.variant === "nav_menu") { const bg = new fabric.Rect({ width: 800, height: 60, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1, originX: "center", originY: "center" }); const logo = new fabric.Text("✨ Marque", { fontSize: 20, fontWeight: "bold", fill: "#0f172a", fontFamily: "Inter", originX: "left", originY: "center", left: -360 }); const links = new fabric.Text("Accueil    Produits    Contact", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "right", originY: "center", left: 360 }); elements = [bg, logo, links]; }
      else if (item.variant === "tabs") { const line = new fabric.Line([-150, 20, 150, 20], { stroke: "#e2e8f0", strokeWidth: 2 }); const activeLine = new fabric.Line([-150, 20, -50, 20], { stroke: "#4f46e5", strokeWidth: 2 }); const t1 = new fabric.Text("Général", { fontSize: 14, fontWeight: "600", fill: "#4f46e5", fontFamily: "Inter", originX: "center", originY: "center", left: -100 }); const t2 = new fabric.Text("Sécurité", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "center", originY: "center", left: 0 }); const t3 = new fabric.Text("Facturation", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "center", originY: "center", left: 100 }); elements = [line, activeLine, t1, t2, t3]; }
      else if (item.variant === "pricing") { const bg = new fabric.Rect({ width: 260, height: 350, fill: "#ffffff", rx: 12, ry: 12, stroke: "#e2e8f0", strokeWidth: 1, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.1)", blur: 10, offsetY: 4 }) }); const title = new fabric.Text("Basique", { fontSize: 20, fontWeight: "bold", fill: "#0f172a", fontFamily: "Inter", originX: "center", originY: "top", top: -140 }); const price = new fabric.Text("9€ / mois", { fontSize: 28, fontWeight: "bold", fill: "#4f46e5", fontFamily: "Inter", originX: "center", originY: "top", top: -100 }); const feat1 = new fabric.Text("✓ Option 1", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "top", left: -100, top: -40 }); const feat2 = new fabric.Text("✓ Option 2", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "top", left: -100, top: -10 }); const feat3 = new fabric.Text("✓ Option 3", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "top", left: -100, top: 20 }); const btnBg = new fabric.Rect({ width: 200, height: 40, fill: "#4f46e5", rx: 6, ry: 6, originX: "center", originY: "bottom", top: 140 }); const btnTxt = new fabric.Text("Choisir", { fontSize: 14, fill: "#ffffff", fontWeight: "600", fontFamily: "Inter", originX: "center", originY: "bottom", top: 130 }); elements = [bg, title, price, feat1, feat2, feat3, btnBg, btnTxt]; }
      else { const bg = new fabric.Rect({ width: 200, height: 80, fill: "#f8fafc", stroke: "#94a3b8", strokeDashArray: [5, 5], strokeWidth: 2, rx: 8, ry: 8, originX: "center", originY: "center" }); const txt = new fabric.Text(item.label, { fontSize: 14, fill: "#64748b", fontFamily: "Inter", fontWeight: "600", originX: "center", originY: "center" }); elements = [bg, txt]; }
      obj = new fabric.Group(elements, { left: x, top: y });
      obj.customName = item.label;
      if (item.type === "complex" && item.variant === "map") {
        obj.mapLat = DEFAULT_MAP_LAT;
        obj.mapLng = DEFAULT_MAP_LNG;
        obj.mapZoom = DEFAULT_MAP_ZOOM;
      }
    }
    if (obj) {
      fabricCanvas.add(obj);
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.renderAll();
      if (item.type === "complex" && item.variant === "map") loadOsmMapIntoGroup(obj, fabricCanvas);
    }
  };

  const handleDragStart = (e, item) => e.dataTransfer.setData("element-data", JSON.stringify(item));
  const handleCanvasDrop = (e) => {
    if (!isDesigner) return; e.preventDefault();
    const dataStr = e.dataTransfer.getData("element-data");
    if (!dataStr || !fabricCanvas) return;
    const item = JSON.parse(dataStr);
    const rect = wrapperRef.current.getBoundingClientRect();
    const vpt = fabricCanvas.viewportTransform;
    const tx = (e.clientX - rect.left - vpt[4]) / vpt[0];
    const ty = (e.clientY - rect.top - vpt[5]) / vpt[3];
    addElementToCanvas(item, snapEnabled ? snapToGrid(tx, GRID_SIZE) : tx, snapEnabled ? snapToGrid(ty, GRID_SIZE) : ty);
  };

  const handleImportImage = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas || !isDesigner) return;
    const reader = new FileReader();
    reader.onload = f => {
      const imgEl = new Image();
      imgEl.onload = () => {
        const imgInstance = new fabric.Image(imgEl);
        imgInstance.scaleToWidth(300);
        imgInstance.set({ left: 100, top: 100, rx: 8, ry: 8 });
        fabricCanvas.add(imgInstance); fabricCanvas.setActiveObject(imgInstance); fabricCanvas.renderAll();
      };
      imgEl.src = f.target.result;
    };
    reader.readAsDataURL(file); e.target.value = null;
  };

  const setZoomLevel = (z) => { if (!fabricCanvas) return; fabricCanvas.setZoom(z); setZoom(Math.round(z * 100)); fabricCanvas.renderAll(); };

  return (
    <>
      <div className="editor-layout">
        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <header className="editor-header">
          <div className="header-left">
            <button className="btn-back" onClick={() => navigate(-1)} title="Retour">
              <ArrowLeft size={16} />
            </button>
            <div className="header-divider" />
            <div className="header-title">{designData?.maquette?.nom || "Projet sans nom"}</div>

            {/* Version picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button onClick={handleToggleDropdown} disabled={!fabricCanvas} className="version-btn">
                  <GitBranch size={12} />
                  <span>v{currentVersionNum ?? "—"}</span>
                  <ChevronDown size={11} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                {dropdownOpen && (
                  <div className="version-dropdown">
                    <div className="version-dropdown__header">
                      <Clock size={11} /> Historique
                    </div>
                    <div className="version-dropdown__list">
                      {versions.length === 0
                        ? <div className="version-dropdown__empty">Aucune version</div>
                        : versions.map(v => {
                          const isCurrent = v.numéro_version === currentVersionNum;
                          return (
                            <div key={v._id} className={`version-item ${isCurrent ? "version-item--current" : ""}`}
                              onClick={() => { if (!isCurrent && !loadingVersion) handleLoadVersion(v); }}>
                              <div className="version-item__icon"><GitBranch size={13} /></div>
                              <div className="version-item__info">
                                <span className="version-item__name">
                                  Version {v.numéro_version}
                                  {isCurrent && <span className="version-item__badge">actuelle</span>}
                                </span>
                                <span className="version-item__date">{formatDate(v.date_creation)}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {!isCurrent && <span className="version-item__load"><Eye size={11} /> Charger</span>}
                                {isDesigner && (
                                  <button className="version-item__delete" onClick={e => handleDeleteVersion(e, v._id)} disabled={deletingVersionId === v._id}>
                                    {deletingVersionId === v._id ? <Loader size={12} className="spin" /> : <Trash2 size={12} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {isDesigner && (
                <button onClick={handleNouvelleVersion} disabled={!fabricCanvas || creatingVersion} className="btn-new-version" title="Nouvelle version">
                  {creatingVersion ? <Loader size={13} className="spin" /> : versionSuccess ? <Check size={13} /> : <Plus size={13} />}
                </button>
              )}
            </div>

            <div className="save-badge">
              {(saveStatus === "Sauvegarde…" || loadingVersion) && <Loader size={11} className="spin" />}
              {loadingVersion ? "Chargement…" : saveStatus}
            </div>
          </div>

          {/* Toolbar designer */}
          {isDesigner && (
            <div className="header-center">
              <div className="toolbar-pill">
                <button className={`toolbar-btn ${gridEnabled ? "active" : ""}`} onClick={() => setGridEnabled(g => !g)}>
                  <GridIcon size={14} /><span>Grille</span>
                </button>
                <div className="toolbar-sep" />
                <button className={`toolbar-btn ${snapEnabled ? "active" : ""}`} onClick={() => setSnapEnabled(s => !s)}>
                  <LayoutTemplate size={14} /><span>Aimanter</span>
                </button>
              </div>
              <div className="toolbar-pill zoom-pill">
                <button className="toolbar-btn-icon" onClick={() => fabricCanvas && setZoomLevel(Math.max(ZOOM_MIN, fabricCanvas.getZoom() - ZOOM_STEP))}><ZoomOut size={14} /></button>
                <span className="zoom-val" onClick={() => setZoomLevel(1)}>{zoom}%</span>
                <button className="toolbar-btn-icon" onClick={() => fabricCanvas && setZoomLevel(Math.min(ZOOM_MAX, fabricCanvas.getZoom() + ZOOM_STEP))}><ZoomIn size={14} /></button>
              </div>
            </div>
          )}

          {/* Actions droite */}
          <div className="header-right">
            {isClient && (
              <>
                {validationDone === "validé" ? (
                  <div className="status-pill status-pill--success"><Check size={13} /> Version {currentVersionNum} validée</div>
                ) : validationDone === "à corriger" ? (
                  <div className="status-pill status-pill--warn">⚠️ Rejet transmis</div>
                ) : (
                  <div className="client-actions">
                    <button onClick={openRejetModal} disabled={!designData} className="btn-reject">
                      <span className="btn-reject__x">✕</span>
                      Rejeter <span className="ver-tag">v{currentVersionNum}</span>
                    </button>
                    <button onClick={handleValider} disabled={validating || !designData} className="btn-validate">
                      {validating ? <><Loader size={13} className="spin" /> Validation…</> : <><Check size={13} /> Valider <span className="ver-tag ver-tag--light">v{currentVersionNum}</span></>}
                    </button>
                  </div>
                )}
              </>
            )}
            {isDesigner && (
              <>
                <button className="btn-ghost" onClick={handleReset} title="Réinitialiser">
                  <RotateCcw size={14} /><span>Réinitialiser</span>
                </button>
                <button className="btn-primary" onClick={() => triggerSave(fabricCanvas, designData?.version?._id)}>
                  Enregistrer
                </button>
              </>
            )}
          </div>
        </header>

        {/* Toast */}
        {validationToast && (
          <div className={`toast toast--${validationToast.type}`}>
            {validationToast.type === "success" ? <Check size={16} /> : validationToast.type === "info" ? <span>📨</span> : <span>⚠️</span>}
            {validationToast.msg}
          </div>
        )}

        <div className="editor-body">
          {/* ── Sidebar gauche (designer) ── */}
          {isDesigner && (
            <aside className="editor-sidebar">
              <div className="sidebar-header">
                <span>Bibliothèque</span>
              </div>
              <div className="sidebar-scroll custom-scrollbar">
                {SIDEBAR_MENU.map(category => (
                  <div key={category.id} className="menu-group">
                    <button className={`menu-trigger ${openMenu === category.id ? "active" : ""}`} onClick={() => setOpenMenu(openMenu === category.id ? "" : category.id)}>
                      <div className="menu-trigger-left">{category.icon}<span>{category.label}</span></div>
                      <ChevronDown size={13} className={`chevron ${openMenu === category.id ? "open" : ""}`} />
                    </button>
                    <div className={`menu-content ${openMenu === category.id ? "open" : ""}`}>
                      <div className={category.layout === "grid" ? "tool-grid" : "tool-list"}>
                        {category.items.map(item => {
                          if (item.type === "action_image") return (
                            <label key={item.id} className="tool-btn-list" title={item.label}>
                              <div className="icon-wrap">{item.icon}</div>
                              <span>{item.label}</span>
                              <input type="file" accept="image/*" hidden onChange={handleImportImage} disabled={!fabricCanvas} />
                            </label>
                          );
                          return (
                            <button key={item.id} className={category.layout === "grid" ? "tool-btn-box" : "tool-btn-list"}
                              draggable onDragStart={e => handleDragStart(e, item)} onClick={() => addElementToCanvas(item)}
                              title={item.label} disabled={!fabricCanvas}>
                              <div className="icon-wrap">{item.icon}</div>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* ── Canvas ── */}
          <main className="editor-canvas-area" onDragOver={e => e.preventDefault()} onDrop={handleCanvasDrop}>

            {/* Banner corrections (designer, version courante uniquement) */}
            {isDesigner && corrections.length > 0 && (
              <div className="corrections-banner-wrap">
                <div className="corrections-banner" onClick={() => setShowCorrections(s => !s)}>
                  <span className="corrections-pulse" />
                  <span>⚠️ {corrections.length} correction{corrections.length > 1 ? "s" : ""} pour cette version</span>
                  <span className="corrections-toggle">{showCorrections ? "▲ Masquer" : "▼ Voir"}</span>
                </div>
                {showCorrections && (
                  <div className="corrections-list">
                    {corrections.map((c, ci) => {
                      const projet = c.version_id?.id_maquette?.id_projet;
                      const vNum = c.version_id?.numéro_version;
                      return (
                        <div key={c._id} className="correction-item">
                          <div className="correction-item__meta">
                            <span>{projet?.nom || "Projet"} · v{vNum} · {c.client_id?.nom || "—"}</span>
                            <button className="btn-mark-read" onClick={async e => {
                              e.stopPropagation();
                              try { await API.patch(`/validations/${c._id}/lu-designer`); setCorrections(prev => prev.filter(x => x._id !== c._id)); } catch (_) { }
                            }}>✓ Marquer corrigé</button>
                          </div>
                          {(c.commentaires || []).filter(cm => cm.commentaire_admin || cm.commentaire_client).map(cm => (
                            <div key={cm._id} className="correction-comment">
                              <div className="correction-comment__label">{cm.label_element || cm.id_element}</div>
                              <div className="correction-comment__text">{cm.commentaire_admin || cm.commentaire_client}</div>
                            </div>
                          ))}
                          {(c.commentaires || []).filter(cm => cm.commentaire_admin || cm.commentaire_client).length === 0 && (
                            <div className="correction-comment__empty">Rejet général — aucune remarque spécifique.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!designData
              ? <div className="loader-screen"><Loader size={40} className="spin" /><p>Chargement du studio…</p></div>
              : <div ref={wrapperRef} className="canvas-shadow" />
            }
          </main>

          {/* ── Panneau droit (designer) ── */}
          {isDesigner && (
            <aside className="editor-right-panel">
              <div className="right-tabs">
                <button className={`right-tab ${rightTab === "props" ? "active" : ""}`} onClick={() => setRightTab("props")}>Propriétés</button>
                <button className={`right-tab ${rightTab === "layers" ? "active" : ""}`} onClick={() => setRightTab("layers")}>
                  <Layers size={13} /> Calques
                </button>
              </div>
              <div className="right-panel-body custom-scrollbar">
                {rightTab === "props"
                  ? <PropertiesPanel selectedObject={selectedObj} canvas={fabricCanvas} onUpdate={() => { debouncedSave(fabricCanvas, designData?.version?._id); setLayersKey(k => k + 1); }} />
                  : <LayersPanel canvas={fabricCanvas} selectedObject={selectedObj} onSelectObject={setSelectedObj} refreshKey={layersKey} />
                }
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ══ POPUP REJET CLIENT ══════════════════════════════════════════════ */}
      {rejetModal && (
        <div className="rejet-overlay" onClick={() => setRejetModal(false)}>
          <div className="rejet-modal" onClick={e => e.stopPropagation()}>
            <div className="rejet-modal__header">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div className="rejet-modal__icon-wrap">✕</div>
                <div>
                  <h3 className="rejet-modal__title">Rejeter la version {currentVersionNum}</h3>
                  <p className="rejet-modal__subtitle">Indiquez vos remarques. Les champs vides ne seront pas transmis.</p>
                </div>
              </div>
              <button onClick={() => setRejetModal(false)} className="rejet-modal__close">✕</button>
            </div>

            {rejetElements.length > 0 && (
              <div className="rejet-modal__counter">
                <span>{rejetElements.length} élément{rejetElements.length > 1 ? "s" : ""}</span>
                <span className="rejet-modal__counter-ok">
                  {rejetElements.filter(e => e.commentaire_client.trim()).length} remarqué{rejetElements.filter(e => e.commentaire_client.trim()).length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            <div className="rejet-modal__body">
              {rejetElements.length === 0
                ? <div className="rejet-modal__empty"><span>🎨</span><p>Aucun élément détecté.</p></div>
                : rejetElements.map((el, i) => (
                  <div key={el.id_element} className={`rejet-el ${el.commentaire_client.trim() ? "rejet-el--active" : ""}`}>
                    <div className="rejet-el__head">
                      <div className="rejet-el__thumb-wrap">
                        {el._thumbnail
                          ? <img src={el._thumbnail} alt={el.label_element} className="rejet-el__thumb" />
                          : <div className="rejet-el__thumb-fb">{el._typeIcon || "◆"}</div>
                        }
                        {el.commentaire_client.trim() && <span className="rejet-el__check">✓</span>}
                      </div>
                      <div className="rejet-el__info">
                        <span className="rejet-el__name">{el.label_element}</span>
                        <span className="rejet-el__type">{el._type || "élément"}</span>
                      </div>
                    </div>
                    <div className="rejet-el__body">
                      <textarea
                        value={el.commentaire_client}
                        onChange={e => setRejetElements(prev => prev.map((item, idx) => idx === i ? { ...item, commentaire_client: e.target.value } : item))}
                        placeholder="Décrivez la correction souhaitée… (vide = non transmis)"
                        rows={2}
                        className="rejet-el__textarea"
                      />
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="rejet-modal__footer">
              <div className="rejet-modal__footer-info">
                {rejetElements.filter(e => e.commentaire_client.trim()).length === 0
                  ? <span style={{ color: "var(--muted)" }}>Aucune remarque — rejet général</span>
                  : <span style={{ color: "#059669" }}>✓ {rejetElements.filter(e => e.commentaire_client.trim()).length} remarque{rejetElements.filter(e => e.commentaire_client.trim()).length > 1 ? "s" : ""} prête{rejetElements.filter(e => e.commentaire_client.trim()).length > 1 ? "s" : ""}</span>
                }
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setRejetModal(false)} className="btn-cancel">Annuler</button>
                <button onClick={handleRejetSubmit} disabled={rejetSubmitting} className="btn-submit-rejet">
                  {rejetSubmitting ? <><Loader size={13} className="spin" /> Envoi…</> : <>✕ Justifier le rejet</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --font: 'DM Sans', system-ui, sans-serif;
          --font-mono: 'DM Mono', monospace;
          --bg: #f4f5f7;
          --canvas-bg: #e8eaed;
          --surface: #ffffff;
          --surface-2: #f8f9fa;
          --surface-3: #f1f3f5;
          --border: #e3e6ea;
          --border-2: #d0d5dd;
          --text: #111827;
          --text-2: #4b5563;
          --muted: #9ca3af;
          --primary: #5b6af0;
          --primary-dark: #4755e6;
          --primary-bg: #eef0fd;
          --primary-border: #c7cbf9;
          --danger: #ef4444;
          --danger-bg: #fef2f2;
          --danger-border: #fecaca;
          --success: #10b981;
          --success-bg: #ecfdf5;
          --warn-bg: #fffbeb;
          --warn-text: #d97706;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
          --shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
          --shadow-lg: 0 12px 32px rgba(0,0,0,.12), 0 4px 8px rgba(0,0,0,.06);
          --r: 8px;
          --r-lg: 12px;
          --sidebar-w: 256px;
          --panel-w: 268px;
          --header-h: 56px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font); background: var(--bg); color: var(--text); overflow: hidden; -webkit-font-smoothing: antialiased; }

        /* ── Layout ── */
        .editor-layout { display: flex; flex-direction: column; height: 100vh; width: 100vw; position: fixed; inset: 0; }
        .editor-body { display: flex; flex: 1; overflow: hidden; }

        /* ── Header ── */
        .editor-header {
          height: var(--header-h); background: var(--surface); display: flex; align-items: center;
          justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow-sm); z-index: 20; position: relative; gap: 12px;
        }
        .header-left, .header-right { display: flex; align-items: center; gap: 10px; }
        .header-center { position: absolute; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; }

        .btn-back {
          width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--r);
          background: var(--surface-2); color: var(--text-2); cursor: pointer; display: flex;
          align-items: center; justify-content: center; transition: .15s;
        }
        .btn-back:hover { background: var(--surface-3); color: var(--text); border-color: var(--border-2); }

        .header-divider { width: 1px; height: 20px; background: var(--border); }
        .header-title { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }

        /* Version button */
        .version-btn {
          display: inline-flex; align-items: center; gap: 5px; font-family: var(--font);
          font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: var(--r);
          background: var(--primary-bg); color: var(--primary); border: 1px solid var(--primary-border);
          cursor: pointer; transition: .15s;
        }
        .version-btn:hover:not(:disabled) { background: #e5e7fb; }
        .version-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-new-version {
          width: 28px; height: 28px; border-radius: 50%; background: var(--primary); color: white;
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .15s;
        }
        .btn-new-version:hover:not(:disabled) { background: var(--primary-dark); transform: scale(1.08); }
        .btn-new-version:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Save badge */
        .save-badge {
          font-size: 11px; font-weight: 500; color: var(--muted); background: var(--surface-2);
          border: 1px solid var(--border); padding: 3px 9px; border-radius: 20px;
          display: flex; align-items: center; gap: 5px; white-space: nowrap;
        }

        /* Version dropdown */
        .version-dropdown {
          position: absolute; top: calc(100% + 8px); left: 0;
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
          box-shadow: var(--shadow-lg); min-width: 272px; z-index: 9999; overflow: hidden;
          animation: dropIn .15s ease;
        }
        @keyframes dropIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .version-dropdown__header {
          padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 10px;
          font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em;
          display: flex; align-items: center; gap: 5px;
        }
        .version-dropdown__list { max-height: 280px; overflow-y: auto; }
        .version-dropdown__empty { padding: 16px; text-align: center; font-size: 13px; color: var(--muted); }

        .version-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 14px;
          border-bottom: 1px solid var(--surface-2); cursor: pointer; transition: background .1s;
        }
        .version-item:hover:not(.version-item--current) { background: var(--surface-2); }
        .version-item--current { background: var(--primary-bg); cursor: default; }
        .version-item__icon {
          width: 30px; height: 30px; border-radius: 8px; background: var(--surface-3);
          display: flex; align-items: center; justify-content: center; color: var(--muted); flex-shrink: 0;
        }
        .version-item--current .version-item__icon { background: var(--primary-bg); color: var(--primary); }
        .version-item__info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .version-item__name { font-size: 13px; font-weight: 600; color: var(--text); }
        .version-item--current .version-item__name { color: var(--primary); }
        .version-item__badge { margin-left: 6px; font-size: 10px; background: var(--primary); color: white; border-radius: 10px; padding: 1px 7px; }
        .version-item__date { font-size: 11px; color: var(--muted); }
        .version-item__load { font-size: 11px; font-weight: 600; color: var(--text-2); display: flex; align-items: center; gap: 4px; }
        .version-item__delete {
          width: 26px; height: 26px; border-radius: 6px; background: transparent;
          border: none; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .15s;
        }
        .version-item__delete:hover { background: var(--danger-bg); }

        /* Toolbar */
        .toolbar-pill {
          display: flex; align-items: center; background: var(--surface-2); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden; height: 34px;
        }
        .toolbar-btn {
          display: flex; align-items: center; gap: 5px; padding: 0 12px; height: 100%;
          font-size: 12px; font-weight: 500; background: none; border: none; color: var(--text-2); cursor: pointer; transition: .15s;
        }
        .toolbar-btn:hover { background: var(--surface-3); color: var(--text); }
        .toolbar-btn.active { background: var(--surface); color: var(--primary); font-weight: 600; }
        .toolbar-sep { width: 1px; height: 18px; background: var(--border); }
        .zoom-pill { padding: 0 4px; gap: 0; }
        .toolbar-btn-icon {
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; color: var(--text-2); cursor: pointer; border-radius: 6px; transition: .15s;
        }
        .toolbar-btn-icon:hover { background: var(--surface-3); color: var(--text); }
        .zoom-val { font-size: 12px; font-weight: 600; width: 44px; text-align: center; cursor: pointer; color: var(--text); font-family: var(--font-mono); }

        /* Header buttons */
        .btn-ghost {
          display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 500;
          background: none; border: 1px solid var(--border); color: var(--text-2); padding: 6px 12px;
          border-radius: var(--r); cursor: pointer; transition: .15s; font-family: var(--font);
        }
        .btn-ghost:hover { background: var(--surface-2); border-color: var(--border-2); color: var(--text); }
        .btn-primary {
          background: var(--primary); color: white; border: none; padding: 7px 16px;
          font-size: 13px; font-weight: 600; border-radius: var(--r); cursor: pointer;
          transition: .15s; font-family: var(--font); letter-spacing: -.01em;
        }
        .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(91,106,240,.3); }

        /* Client actions */
        .client-actions {
          display: flex; align-items: center; gap: 6px; background: var(--surface-2);
          border: 1px solid var(--border); border-radius: var(--r-lg); padding: 4px;
        }
        .btn-reject {
          display: inline-flex; align-items: center; gap: 6px; background: var(--surface);
          color: var(--danger); border: 1px solid var(--danger-border); border-radius: var(--r);
          padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: .15s; font-family: var(--font);
        }
        .btn-reject:hover:not(:disabled) { background: var(--danger-bg); transform: translateY(-1px); }
        .btn-reject:disabled { opacity: .5; cursor: not-allowed; }
        .btn-reject__x { width: 16px; height: 16px; border-radius: 50%; background: var(--danger-bg); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
        .btn-validate {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #059669, #047857); color: white; border: none;
          border-radius: var(--r); padding: 7px 16px; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: .15s; box-shadow: 0 2px 8px rgba(5,150,105,.25); font-family: var(--font);
        }
        .btn-validate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(5,150,105,.35); }
        .btn-validate:disabled { opacity: .65; cursor: not-allowed; transform: none; }
        .ver-tag { background: rgba(0,0,0,.1); border-radius: 4px; padding: 1px 5px; font-size: 10px; margin-left: 2px; }
        .ver-tag--light { background: rgba(255,255,255,.25); }

        /* Status pills */
        .status-pill { display: inline-flex; align-items: center; gap: 6px; border-radius: var(--r); padding: 7px 14px; font-size: 12px; font-weight: 700; }
        .status-pill--success { background: var(--success-bg); color: #059669; border: 1px solid rgba(5,150,105,.2); }
        .status-pill--warn { background: var(--warn-bg); color: var(--warn-text); border: 1px solid rgba(217,119,6,.2); }

        /* Toast */
        .toast {
          position: fixed; top: 20px; right: 20px; z-index: 9999;
          display: flex; align-items: center; gap: 10px; padding: 12px 20px;
          border-radius: var(--r-lg); color: white; font-weight: 600; font-size: 13px;
          box-shadow: var(--shadow-lg); max-width: 360px; animation: slideIn .25s ease;
        }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .toast--success { background: linear-gradient(135deg,#059669,#047857); }
        .toast--info { background: linear-gradient(135deg,#3b82f6,#2563eb); }
        .toast--error { background: linear-gradient(135deg,#ef4444,#dc2626); }

        /* ── Sidebar ── */
        .editor-sidebar {
          width: var(--sidebar-w); background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;
        }
        .sidebar-header {
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--muted);
        }
        .sidebar-scroll { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }

        .menu-trigger {
          display: flex; align-items: center; justify-content: space-between; width: 100%;
          padding: 9px 10px; background: transparent; border: none; border-radius: var(--r);
          cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text); transition: .15s; font-family: var(--font);
        }
        .menu-trigger:hover { background: var(--surface-2); }
        .menu-trigger.active { background: var(--primary-bg); color: var(--primary); }
        .menu-trigger-left { display: flex; align-items: center; gap: 8px; }
        .chevron { color: var(--muted); transition: transform .2s; flex-shrink: 0; }
        .chevron.open { transform: rotate(180deg); }
        .menu-trigger.active .chevron { color: var(--primary); }

        .menu-content { max-height: 0; overflow: hidden; opacity: 0; transition: all .25s ease-in-out; }
        .menu-content.open { max-height: 700px; opacity: 1; padding: 6px 4px 12px; }

        .tool-list { display: flex; flex-direction: column; gap: 3px; }
        .tool-btn-list {
          display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
          font-size: 12px; font-weight: 500; color: var(--text-2); cursor: grab; transition: .15s; font-family: var(--font);
        }
        .tool-btn-list:hover:not(:disabled) { border-color: var(--primary-border); color: var(--primary); background: var(--primary-bg); }
        .icon-wrap { color: var(--muted); transition: .15s; flex-shrink: 0; }
        .tool-btn-list:hover:not(:disabled) .icon-wrap { color: var(--primary); }

        .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .tool-btn-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 7px; padding: 14px 6px; background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r); cursor: grab; transition: .15s; text-align: center; font-family: var(--font);
        }
        .tool-btn-box span { font-size: 10px; font-weight: 500; color: var(--muted); }
        .tool-btn-box .icon-wrap { color: var(--text-2); }
        .tool-btn-box:hover:not(:disabled) { border-color: var(--primary-border); background: var(--primary-bg); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
        .tool-btn-box:hover:not(:disabled) span, .tool-btn-box:hover:not(:disabled) .icon-wrap { color: var(--primary); }

        /* ── Canvas ── */
        .editor-canvas-area {
          flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 40px;
          background: var(--canvas-bg); background-image: radial-gradient(circle, #c8cdd4 1px, transparent 1px);
          background-size: 22px 22px; position: relative;
        }
        .canvas-shadow { box-shadow: 0 8px 40px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08); border-radius: 4px; overflow: hidden; background: white; }
        .loader-screen { display: flex; flex-direction: column; align-items: center; gap: 14px; color: var(--muted); font-size: 14px; font-weight: 500; }

        /* Corrections banner */
        .corrections-banner-wrap { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; width: calc(100% - 48px); max-width: 700px; }
        .corrections-banner {
          display: flex; align-items: center; gap: 10px; background: #dc2626;
          border-radius: var(--r-lg); padding: 10px 16px; cursor: pointer; color: white;
          font-weight: 700; font-size: 12px; box-shadow: 0 4px 16px rgba(220,38,38,.3);
        }
        .corrections-pulse { width: 7px; height: 7px; border-radius: 50%; background: white; flex-shrink: 0; animation: pulse 1.5s ease-in-out infinite; }
        .corrections-toggle { margin-left: auto; font-size: 10px; opacity: .85; }
        .corrections-list {
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
          margin-top: 6px; overflow: hidden; box-shadow: var(--shadow-lg);
        }
        .correction-item { padding: 14px 16px; border-bottom: 1px solid var(--surface-2); }
        .correction-item:last-child { border-bottom: none; }
        .correction-item__meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
        .btn-mark-read { background: var(--primary-bg); color: var(--primary); border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: var(--font); }
        .correction-comment { background: #fff7f7; border: 1px solid var(--danger-border); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; }
        .correction-comment:last-child { margin-bottom: 0; }
        .correction-comment__label { font-size: 10px; font-weight: 700; color: var(--muted); margin-bottom: 4px; }
        .correction-comment__text { font-size: 13px; color: var(--text); line-height: 1.5; }
        .correction-comment__empty { font-size: 13px; color: var(--danger); font-style: italic; }

        /* ── Right panel ── */
        .editor-right-panel {
          width: var(--panel-w); background: var(--surface); border-left: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;
        }
        .right-tabs { display: flex; background: var(--surface-2); border-bottom: 1px solid var(--border); padding: 4px 4px 0; gap: 3px; }
        .right-tab {
          flex: 1; padding: 9px 8px; font-size: 12px; font-weight: 500; color: var(--muted);
          background: none; border: none; cursor: pointer; border-radius: 6px 6px 0 0;
          transition: .15s; display: flex; align-items: center; justify-content: center; gap: 5px; font-family: var(--font);
        }
        .right-tab.active { color: var(--primary); background: var(--surface); font-weight: 600; }
        .right-panel-body { flex: 1; overflow-y: auto; padding: 14px; }

        /* Props panel */
        .props-empty { text-align: center; color: var(--muted); padding: 36px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 12px; line-height: 1.5; }
        .props-empty-icon { width: 52px; height: 52px; border-radius: var(--r-lg); background: var(--surface-2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--muted); }
        .props-section { margin-bottom: 20px; }
        .props-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px; }
        .props-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 0; }
        .props-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-bottom: 10px; }
        .prop-field { display: flex; flex-direction: column; gap: 3px; }
        .prop-field-label { font-size: 10px; font-weight: 600; color: var(--muted); }
        .prop-field-input { border: 1px solid var(--border); background: var(--surface-2); border-radius: 6px; padding: 6px 8px; font-size: 12px; font-family: var(--font-mono); width: 100%; outline: none; transition: .15s; }
        .prop-field-input:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 2px var(--primary-bg); }
        .props-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .props-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
        .color-row { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border); padding: 3px 7px; border-radius: 6px; background: var(--surface-2); }
        .props-color { border: none; width: 22px; height: 22px; cursor: pointer; border-radius: 4px; padding: 0; background: none; }
        .color-hex { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }
        .props-input-sm { width: 56px; border: 1px solid var(--border); border-radius: 6px; padding: 5px 7px; font-size: 12px; text-align: center; background: var(--surface-2); outline: none; font-family: var(--font-mono); transition: .15s; }
        .props-input-sm:focus { border-color: var(--primary); background: white; }
        .props-input-xs { width: 100%; border: 1px solid var(--border); border-radius: 5px; padding: 5px 3px; font-size: 11px; text-align: center; background: var(--surface-2); outline: none; font-family: var(--font-mono); }
        .props-select { width: 100%; padding: 7px 9px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2); font-size: 12px; font-family: var(--font); }
        .btn-group { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .props-toggle { flex: 1; background: var(--surface-2); border: none; border-right: 1px solid var(--border); padding: 7px 9px; cursor: pointer; display: flex; justify-content: center; color: var(--muted); transition: .15s; }
        .props-toggle:last-child { border: none; }
        .props-toggle.active { background: white; color: var(--primary); }
        .props-toggle:hover:not(.active) { background: var(--surface-3); }
        .custom-checkbox { accent-color: var(--primary); width: 15px; height: 15px; cursor: pointer; }

        /* Layers */
        .layers-panel { display: flex; flex-direction: column; gap: 8px; }
        .layers-empty { text-align: center; color: var(--muted); padding: 20px; font-size: 12px; }
        .layers-list { display: flex; flex-direction: column; gap: 2px; }
        .layers-order-btns { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
        .layers-order-btns button { padding: 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); cursor: pointer; color: var(--muted); display: flex; align-items: center; justify-content: center; transition: .15s; }
        .layers-order-btns button:hover:not(:disabled) { color: var(--primary); background: var(--primary-bg); border-color: var(--primary-border); }
        .layers-order-btns button:disabled { opacity: .35; cursor: not-allowed; }
        .layer-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--r); cursor: pointer; font-size: 12px; font-weight: 500; transition: .15s; border: 1px solid transparent; }
        .layer-item:hover { background: var(--surface-2); }
        .layer-item.selected { background: var(--primary-bg); color: var(--primary); border-color: var(--primary-border); }
        .layer-thumb { width: 18px; height: 18px; border-radius: 3px; border: 1px solid rgba(0,0,0,.1); flex-shrink: 0; }
        .layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .layer-actions { display: flex; gap: 3px; opacity: 0; }
        .layer-item:hover .layer-actions, .layer-item.selected .layer-actions { opacity: 1; }
        .layer-actions button { background: var(--surface); border: 1px solid var(--border); padding: 4px; border-radius: 4px; cursor: pointer; color: var(--muted); display: flex; align-items: center; justify-content: center; transition: .15s; }
        .layer-actions button:hover { border-color: var(--primary-border); color: var(--primary); }
        .icon-danger { color: var(--danger) !important; }

        /* ── Rejet modal ── */
        .rejet-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(8px);
          z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn .2s ease;
        }
        .rejet-modal {
          background: var(--surface); border-radius: 18px; width: 100%; max-width: 580px;
          max-height: 88vh; overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 32px 72px rgba(0,0,0,.25), 0 8px 24px rgba(0,0,0,.12); animation: popIn .22s ease;
        }
        @keyframes popIn { from { opacity:0; transform:scale(.96) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .rejet-modal__header {
          padding: 20px 22px 16px; display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 1px solid var(--border); background: linear-gradient(to bottom,#fff7f7,white); flex-shrink: 0;
        }
        .rejet-modal__icon-wrap {
          width: 38px; height: 38px; border-radius: var(--r-lg); background: var(--danger-bg);
          display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;
          color: var(--danger); flex-shrink: 0;
        }
        .rejet-modal__title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 3px; }
        .rejet-modal__subtitle { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.5; }
        .rejet-modal__close {
          background: var(--surface-2); border: none; border-radius: 7px; width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-2);
          font-size: 13px; flex-shrink: 0; transition: .15s;
        }
        .rejet-modal__close:hover { background: var(--surface-3); }
        .rejet-modal__counter {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 22px; background: var(--surface-2); border-bottom: 1px solid var(--border);
          font-size: 11px; color: var(--muted); font-weight: 700; flex-shrink: 0;
        }
        .rejet-modal__counter-ok { color: #059669; font-weight: 700; }
        .rejet-modal__body { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
        .rejet-modal__empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 0; color: var(--muted); font-size: 13px; }
        .rejet-modal__footer {
          padding: 14px 22px; border-top: 1px solid var(--border); display: flex;
          justify-content: space-between; align-items: center; background: var(--surface-2); flex-shrink: 0; gap: 12px;
        }
        .rejet-modal__footer-info { font-size: 11px; font-weight: 600; }

        .rejet-el { border-radius: var(--r-lg); border: 1.5px solid var(--border); overflow: hidden; transition: border-color .2s, box-shadow .2s; }
        .rejet-el--active { border-color: #bbf7d0; box-shadow: 0 2px 8px rgba(5,150,105,.1); }
        .rejet-el__head { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: var(--surface-2); border-bottom: 1px solid var(--border); }
        .rejet-el__thumb-wrap { position: relative; flex-shrink: 0; }
        .rejet-el__thumb { width: 72px; height: 44px; border-radius: 5px; object-fit: contain; border: 1px solid var(--border); background: #f0f2f5; display: block; }
        .rejet-el__thumb-fb { width: 72px; height: 44px; border-radius: 5px; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1px solid var(--border); }
        .rejet-el__check { position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; background: #059669; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800; color: white; }
        .rejet-el__info { display: flex; flex-direction: column; gap: 2px; }
        .rejet-el__name { font-size: 12px; font-weight: 700; color: var(--text); }
        .rejet-el__type { font-size: 10px; color: var(--muted); text-transform: capitalize; }
        .rejet-el__body { padding: 9px 12px; background: white; }
        .rejet-el__textarea {
          width: 100%; padding: 8px 10px; border: 1.5px solid var(--border); border-radius: var(--r);
          font-size: 12px; font-family: var(--font); resize: none; outline: none; box-sizing: border-box;
          transition: border-color .2s, box-shadow .2s; color: var(--text); line-height: 1.5; background: var(--surface-2);
        }
        .rejet-el__textarea:focus { border-color: var(--danger); box-shadow: 0 0 0 3px rgba(239,68,68,.08); background: white; }
        .rejet-el__textarea::placeholder { color: var(--muted); }

        .btn-cancel { background: var(--surface-3); color: var(--text-2); border: none; border-radius: var(--r); padding: 9px 18px; font-weight: 600; font-size: 12px; cursor: pointer; font-family: var(--font); transition: .15s; }
        .btn-cancel:hover { background: var(--border); }
        .btn-submit-rejet {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none;
          border-radius: var(--r); padding: 10px 20px; font-weight: 700; font-size: 12px;
          cursor: pointer; font-family: var(--font); box-shadow: 0 3px 10px rgba(220,38,38,.25); transition: .18s;
        }
        .btn-submit-rejet:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(220,38,38,.35); }
        .btn-submit-rejet:disabled { opacity: .7; cursor: not-allowed; transform: none; }

        /* ── Utilities ── */
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted); }
      `}</style>
    </>
  );
};

export default DesignEditor;