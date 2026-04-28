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
  Users, Play, GitBranch, Plus, Check, Clock, RotateCcw, Settings, Edit2, Save, X, AlertCircle, Volume2,
  RefreshCw, Images, MousePointer2, PenTool, Eraser, Highlighter, PanelLeftClose, PanelLeft, PaintBucket, Smile, Table,
  PieChart, LineChart, Activity, BarChartHorizontal
} from "lucide-react";

const GRID_SIZE = 20;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.1;
const REJET_ELEMENTS_PER_PAGE = 6;
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

// â”€â”€â”€ TOAST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ToastNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`modern-toast modern-toast--${type}`}>
      <div className="modern-toast__icon">
        {type === "success" && <Check size={18} />}
        {(type === "info" || type === "warning") && <AlertCircle size={18} />}
      </div>
      <p className="modern-toast__message">{message}</p>
      <button className="modern-toast__close" onClick={onClose}><X size={14} /></button>
    </div>
  );
};

// â”€â”€â”€ SIDEBAR MENU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SIDEBAR_MENU = [
  {
    id: "typography", label: "Typographie", icon: <Type size={16} />, layout: "list",
    items: [
      { id: "text_h1", label: "Titre principal", icon: <Heading1 size={15} />, type: "text", variant: "h1" },
      { id: "text_h2", label: "Sous-titre", icon: <Heading2 size={15} />, type: "text", variant: "h2" },
      { id: "text_p", label: "Paragraphe", icon: <Pilcrow size={15} />, type: "text", variant: "p" },
      { id: "text_ul", label: "Liste à puces", icon: <List size={15} />, type: "text", variant: "ul" },
      { id: "text_ol", label: "Liste numérotée", icon: <ListOrdered size={15} />, type: "text", variant: "ol" },
      { id: "text_quote", label: "Citation", icon: <Quote size={15} />, type: "text", variant: "quote" },
    ]
  },
  {
    id: "shapes", label: "Formes", icon: <Shapes size={16} />, layout: "grid",
    items: [
      { id: "shape_rect", label: "Rectangle", icon: <Square size={22} />, type: "shape", variant: "rect" },
      { id: "shape_circle", label: "Cercle", icon: <Circle size={22} />, type: "shape", variant: "circle" },
      { id: "shape_triangle", label: "Triangle", icon: <Triangle size={22} />, type: "shape", variant: "triangle" },
      { id: "shape_ellipse", label: "Ellipse", icon: <Circle size={22} style={{ transform: "scaleY(0.6)" }} />, type: "shape", variant: "ellipse" },
      { id: "shape_polygon", label: "Polygone", icon: <Hexagon size={22} />, type: "advanced_shape", variant: "polygon" },
      { id: "shape_line", label: "Ligne", icon: <Minus size={22} strokeWidth={4} />, type: "shape", variant: "line" },
      { id: "shape_star", label: "Étoile", icon: <Star size={22} />, type: "advanced_shape", variant: "star" },
      { id: "shape_zap", label: "Éclair", icon: <Zap size={22} />, type: "advanced_shape", variant: "zap" },
      { id: "shape_cloud", label: "Nuage", icon: <Cloud size={22} />, type: "advanced_shape", variant: "cloud" },
      { id: "arrow_r", label: "Flèche", icon: <ArrowRight size={22} />, type: "advanced_shape", variant: "arrow_r" },
      { id: "arrow_double", label: "Double Flèche", icon: <MoveDiagonal size={22} />, type: "advanced_shape", variant: "arrow_double" },
    ]
  },
  {
    id: "media", label: "Médias & Conteneurs", icon: <ImageIcon size={16} />, layout: "list",
    items: [
      { id: "media_img", label: "Image (Upload)", icon: <ImageIcon size={15} />, type: "action_image" },
      { id: "media_video", label: "Lecteur Vidéo", icon: <Video size={15} />, type: "complex", variant: "video" },
      { id: "media_map", label: "Carte (Map)", icon: <Map size={15} />, type: "complex", variant: "map" },
    ]
  },
  {
    id: "charts", label: "Graphiques", icon: <BarChart3 size={16} />, layout: "grid",
    items: [
      { id: "chart_bar", label: "Barres", icon: <BarChart3 size={22} />, type: "complex", variant: "chart_bar" },
      { id: "chart_bar_horiz", label: "Horizontales", icon: <BarChartHorizontal size={22} />, type: "complex", variant: "chart_bar_horiz" },
      { id: "chart_bar_stacked", label: "Empilées", icon: <Layers size={22} />, type: "complex", variant: "chart_bar_stacked" },
      { id: "chart_pie", label: "Circulaire", icon: <PieChart size={22} />, type: "complex", variant: "chart_pie" },
      { id: "chart_donut", label: "Anneau", icon: <Circle size={22} strokeWidth={4} />, type: "complex", variant: "chart_donut" },
      { id: "chart_line", label: "Courbes", icon: <LineChart size={22} />, type: "complex", variant: "chart_line" },
      { id: "chart_area", label: "Aires", icon: <Activity size={22} />, type: "complex", variant: "chart_area" },
    ]
  },
  {
    id: "layouts", label: "Layouts & Navigation", icon: <Layout size={16} />, layout: "list",
    items: [
      { id: "layout_hero", label: "Hero Section", icon: <LayoutTemplate size={15} />, type: "complex", variant: "hero" },
      { id: "nav_menu", label: "Barre de menu", icon: <Minus size={15} />, type: "complex", variant: "nav_menu" },
      { id: "nav_tabs", label: "Onglets (Tabs)", icon: <SplitSquareHorizontal size={15} />, type: "complex", variant: "tabs" },
    ]
  },
  {
    id: "ui", label: "UI / Composants", icon: <MousePointerClick size={16} />, layout: "list",
    items: [
      { id: "ui_btn", label: "Bouton d'action", icon: <MousePointerClick size={15} />, type: "complex", variant: "button", interactive: true },
      { id: "ui_input", label: "Champ de texte", icon: <Type size={15} />, type: "complex", variant: "input", interactive: true },
      { id: "ui_check", label: "Checkbox", icon: <CheckSquare size={15} />, type: "complex", variant: "checkbox", interactive: true },
      { id: "ui_toggle", label: "Switch Toggle", icon: <ToggleLeft size={15} />, type: "complex", variant: "toggle", interactive: true },
      { id: "ui_slider", label: "Slider / Jauge", icon: <SlidersHorizontal size={15} />, type: "complex", variant: "slider", interactive: true },
      { id: "ui_modal", label: "Fenêtre Modale", icon: <AppWindow size={15} />, type: "complex", variant: "modal", interactive: true },
    ]
  },
  {
    id: "blocks", label: "Blocs Prêts", icon: <Package size={16} />, layout: "list",
    items: [] // Static section - items are rendered directly in JSX
  },
  {
    id: "templates", label: "Modèles de pages", icon: <AppWindow size={16} />, layout: "list",
    items: [
      { id: "tpl_home", label: "Page d'accueil", icon: <Layout size={15} />, type: "complex", variant: "tpl_home" },
      { id: "tpl_about", label: "Page À Propos", icon: <Users size={15} />, type: "complex", variant: "tpl_about" },
      { id: "tpl_cart", label: "Panier (Cart)", icon: <Package size={15} />, type: "complex", variant: "tpl_cart" },
      { id: "tpl_login", label: "Connexion (Login)", icon: <Lock size={15} />, type: "complex", variant: "tpl_login" },
    ]
  },
];

const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;

const getCanvasPointer = (canvas, evt) => {
  if (!canvas || !evt) return null;
  const nativeEvent = evt.e || evt;

  if (typeof canvas.getScenePoint === "function") {
    return canvas.getScenePoint(nativeEvent);
  }
  if (typeof canvas.getPointer === "function") {
    return canvas.getPointer(nativeEvent);
  }

  return null;
};

const LOCAL_VIDEO_DB_NAME = "design-editor-local-media";
const LOCAL_VIDEO_STORE_NAME = "videos";
const LOCAL_VIDEO_SOURCE_PREFIX = "localvideo:";

const openLocalVideoDb = () => new Promise((resolve, reject) => {
  try {
    const request = window.indexedDB.open(LOCAL_VIDEO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_VIDEO_STORE_NAME)) {
        db.createObjectStore(LOCAL_VIDEO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  } catch (error) {
    reject(error);
  }
});

const saveLocalVideoAsset = async (assetId, file) => {
  const db = await openLocalVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOCAL_VIDEO_STORE_NAME, "readwrite");
    tx.objectStore(LOCAL_VIDEO_STORE_NAME).put(file, assetId);
    tx.oncomplete = () => {
      db.close();
      resolve(assetId);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("IndexedDB write failed"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("IndexedDB transaction aborted"));
    };
  });
};

const loadLocalVideoAsset = async (assetId) => {
  const db = await openLocalVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOCAL_VIDEO_STORE_NAME, "readonly");
    const request = tx.objectStore(LOCAL_VIDEO_STORE_NAME).get(assetId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("IndexedDB read failed"));
    };
  });
};

const createLocalVideoAssetId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `video-${crypto.randomUUID()}`;
  }
  return `video-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const makeLocalVideoSource = (assetId) => `${LOCAL_VIDEO_SOURCE_PREFIX}${assetId}`;
const getLocalVideoAssetId = (source) => {
  const value = typeof source === "string" ? source.trim() : "";
  return value.startsWith(LOCAL_VIDEO_SOURCE_PREFIX) ? value.slice(LOCAL_VIDEO_SOURCE_PREFIX.length) : "";
};

const parseYouTubeVideoId = (source) => {
  const value = typeof source === "string" ? source.trim() : "";
  if (!value) return "";

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      return (url.pathname.split("/").filter(Boolean)[0] || "").trim();
    }

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) return watchId.trim();

      const segments = url.pathname.split("/").filter(Boolean);
      const markerIndex = segments.findIndex((segment) =>
        ["embed", "shorts", "live", "v"].includes(segment.toLowerCase())
      );
      if (markerIndex !== -1 && segments[markerIndex + 1]) {
        return segments[markerIndex + 1].trim();
      }
    }
  } catch {
    return "";
  }

  return "";
};

const getYouTubeEmbedUrl = (source) => {
  const videoId = parseYouTubeVideoId(source);
  if (!videoId) return "";
  return `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1&playsinline=1&autoplay=0&mute=0`;
};

const getVideoSourceKind = (source) => {
  const value = typeof source === "string" ? source.trim() : "";
  if (!value) return "empty";
  if (getLocalVideoAssetId(value)) return "direct";
  if (value.startsWith("blob:")) return "direct";
  if (value.startsWith("data:")) return value.startsWith("data:video/") ? "direct" : "unsupported";
  if (parseYouTubeVideoId(value)) return "youtube";
  if (/^https?:\/\//i.test(value) && /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(value)) return "direct";
  return "unsupported";
};

const getVideoSourceIssue = (source) => {
  const sourceKind = getVideoSourceKind(source);
  if (sourceKind === "empty" || sourceKind === "direct" || sourceKind === "youtube") return "";
  return "Utilisez un lien YouTube/Shorts ou une URL directe vers un fichier vidéo (.mp4, .webm, .ogg, .mov).";
};

const getVersionNumberValue = (version) =>
  version?.["numéro_version"] ?? version?.numero_version ?? version?.["numéro_version"] ?? null;

let reviveVideos = (canvas) => {
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
      videoEl.playsInline = true;
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
            angle: o.angle || 0,
            objectCaching: false
          });

          if (videoEl.videoWidth) {
            vImg.scaleToWidth(o.width * o.scaleX || 320);
          } else {
            vImg.set({ scaleX: o.scaleX || 1, scaleY: o.scaleY || 1 });
          }

          vImg.customName = "Lecteur Vidéo";
          vImg.customVariant = "video"; // Ensure interactivity works
          if (o.componentData) vImg.componentData = JSON.parse(JSON.stringify(o.componentData)); // Preserve component data
          vImg.videoSrc = videoEl.src;
          const idx = canvas.getObjects().indexOf(o);
          try {
            canvas.remove(o);
            // Restore interactivity on the new image element
            if (window.restoreInteractivityRef) {
               window.restoreInteractivityRef(vImg);
            }
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
          o.set('objectCaching', false);
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
      videoEl.addEventListener('error', () => {
        clearTimeout(timeout);
        console.error("Video loading failed:", {
          src: o.videoSrc,
          error: videoEl.error,
          networkState: videoEl.networkState,
          readyState: videoEl.readyState
        });
        
        // Restore placeholder since video failed (e.g. dead blob URL on refresh)
        const bg = new fabric.Rect({ width: o.width || 320, height: o.height || 200, fill: "#0f172a", rx: 12, ry: 12, originX: "center", originY: "center" });
        const playCircle = new fabric.Circle({ radius: 30, fill: "rgba(255,255,255,0.2)", originX: "center", originY: "center" });
        const playBtn = new fabric.IText("â–¶", { fontSize: 22, fill: "#ffffff", fontFamily: "Inter", originX: "center", originY: "center" });
        const label = new fabric.IText("Vidéo (Introuvable)", { fontSize: 12, fill: "#ef4444", fontFamily: "Inter", originX: "center", originY: "center", top: 70 });
        
        const group = new fabric.Group([bg, playCircle, playBtn, label], {
          left: o.left,
          top: o.top,
          originX: o.originX || "left",
          originY: o.originY || "top",
          scaleX: o.scaleX || 1,
          scaleY: o.scaleY || 1,
          angle: o.angle || 0,
          customName: "Lecteur Vidéo",
          customVariant: "video",
          componentData: o.componentData ? JSON.parse(JSON.stringify(o.componentData)) : { variant: "video" }
        });
        
        const idx = canvas.getObjects().indexOf(o);
        if (idx !== -1) {
          canvas.remove(o);
          if (window.restoreInteractivityRef) window.restoreInteractivityRef(group);
          canvas.add(group);
          if (typeof group.moveTo === "function") group.moveTo(idx);
          if (canvas.getActiveObject() === o) canvas.setActiveObject(group);
          canvas.renderAll();
        }
      });
    }
  });
};

const syncCanvasSelection = (canvas, previousObject, nextObject) => {
  if (!canvas || !nextObject) return;
  const activeObject = canvas.getActiveObject();
  const shouldSelect = activeObject === previousObject || activeObject === nextObject;
  if (!shouldSelect) return;

  canvas.discardActiveObject();
  canvas.setActiveObject(nextObject);
  canvas.fire("selection:updated", {
    selected: [nextObject],
    deselected: previousObject ? [previousObject] : [],
    target: nextObject
  });
  canvas.requestRenderAll();
};

const createMissingVideoPlaceholder = (
  sourceObject,
  labelText = "Vidéo (Introuvable)",
  labelColor = "#ef4444"
) => {
  const bg = new fabric.Rect({
    width: sourceObject.width || 320,
    height: sourceObject.height || 200,
    fill: "#0f172a",
    rx: 12,
    ry: 12,
    originX: "center",
    originY: "center"
  });
  const playCircle = new fabric.Circle({
    radius: 30,
    fill: "rgba(255,255,255,0.2)",
    originX: "center",
    originY: "center"
  });
  const playBtn = new fabric.IText("â–¶", {
    fontSize: 22,
    fill: "#ffffff",
    fontFamily: "Inter",
    originX: "center",
    originY: "center"
  });
  const label = new fabric.IText(labelText, {
    fontSize: 12,
    fill: labelColor,
    fontFamily: "Inter",
    originX: "center",
    originY: "center",
    top: 70
  });

  const group = new fabric.Group([bg, playCircle, playBtn, label], {
    left: sourceObject.left,
    top: sourceObject.top,
    originX: sourceObject.originX || "left",
    originY: sourceObject.originY || "top",
    scaleX: sourceObject.scaleX || 1,
    scaleY: sourceObject.scaleY || 1,
    angle: sourceObject.angle || 0,
    opacity: sourceObject.opacity ?? 1,
    visible: sourceObject.visible !== false,
    customName: "Lecteur Vidéo",
    customVariant: "video",
    componentData: sourceObject.componentData
      ? JSON.parse(JSON.stringify(sourceObject.componentData))
      : { variant: "video" }
  });

  group.videoSrc = sourceObject.videoSrc || "";
  return group;
};

const ensureVideoPlaceholder = (canvas, sourceObject, labelText = "Vidéo", labelColor = "#38bdf8") => {
  if (!canvas || !sourceObject) return sourceObject;

  if (sourceObject.type === "group") {
    const objects = sourceObject.getObjects?.() || [];
    const labelObject = objects.find((obj) => (obj.type === "text" || obj.type === "i-text") && obj.text);
    if (labelObject && labelObject.text !== labelText) {
      labelObject.set({ text: labelText, fill: labelColor });
      sourceObject.dirty = true;
    }
    sourceObject.videoSrc = sourceObject.videoSrc || "";
    return sourceObject;
  }

  const placeholder = createMissingVideoPlaceholder(sourceObject, labelText, labelColor);
  return replaceCanvasObject(canvas, sourceObject, placeholder);
};

const replaceCanvasObject = (canvas, previousObject, nextObject) => {
  if (!canvas || !previousObject || !nextObject) return nextObject;

  const index = canvas.getObjects().indexOf(previousObject);
  canvas.remove(previousObject);
  if (window.restoreInteractivityRef) window.restoreInteractivityRef(nextObject);
  canvas.add(nextObject);

  if (index !== -1 && typeof nextObject.moveTo === "function") {
    nextObject.moveTo(index);
  } else if (index !== -1 && typeof canvas.moveTo === "function") {
    canvas.moveTo(nextObject, index);
  }

  syncCanvasSelection(canvas, previousObject, nextObject);
  return nextObject;
};

const startVideoRenderLoop = (canvas, videoObject) => {
  if (videoObject.__videoRenderLoopActive) return;
  videoObject.__videoRenderLoopActive = true;

  const render = () => {
    if (!canvas || !videoObject || !canvas.getObjects().includes(videoObject)) {
      if (videoObject) videoObject.__videoRenderLoopActive = false;
      return;
    }

    const liveVideo = videoObject.liveVideoElement;
    const liveSurface = videoObject.liveVideoCanvas;
    const liveCtx = videoObject.liveVideoCtx;
    if (liveVideo && liveSurface && liveCtx && liveVideo.readyState >= 2) {
      try {
        liveCtx.clearRect(0, 0, liveSurface.width, liveSurface.height);
        liveCtx.drawImage(liveVideo, 0, 0, liveSurface.width, liveSurface.height);
        videoObject.dirty = true;
      } catch {
        // Ignore transient draw errors while the browser is still decoding frames.
      }
    }

    canvas.renderAll();
    fabric.util.requestAnimFrame(render);
  };

  fabric.util.requestAnimFrame(render);
};

const hydrateVideoObject = (canvas, sourceObject) => {
  if (!canvas || !sourceObject || sourceObject.customName !== "Lecteur Vidéo") {
    return Promise.resolve(null);
  }

  const source = typeof sourceObject.videoSrc === "string" ? sourceObject.videoSrc.trim() : "";
  if (!source) {
    console.error("Invalid video source:", sourceObject.videoSrc);
    return Promise.resolve(null);
  }

  const sourceKind = getVideoSourceKind(source);
  if (sourceKind === "youtube") {
    const nextObject = ensureVideoPlaceholder(canvas, sourceObject, "YouTube", "#f97316");
    canvas.requestRenderAll();
    return Promise.resolve(nextObject);
  }

  if (sourceKind === "direct") {
    const nextObject = ensureVideoPlaceholder(canvas, sourceObject, "Vidéo", "#38bdf8");
    canvas.requestRenderAll();
    return Promise.resolve(nextObject);
  }

  const sourceIssue = getVideoSourceIssue(source);
  if (sourceIssue) {
    const nextObject = ensureVideoPlaceholder(canvas, sourceObject, "Lien vidéo non supporté", "#f59e0b");
    console.warn("Unsupported video source:", { src: source, issue: sourceIssue });
    canvas.requestRenderAll();
    return Promise.resolve(nextObject);
  }

  const currentLiveVideo = sourceObject.liveVideoElement;
  if (currentLiveVideo?.src === source) {
    currentLiveVideo.play?.().catch(() => {});
    startVideoRenderLoop(canvas, sourceObject);
    return Promise.resolve(sourceObject);
  }

  return new Promise((resolve) => {
    const videoEl = document.createElement("video");
    if (!source.startsWith("data:") && !source.startsWith("blob:")) {
      videoEl.crossOrigin = "anonymous";
    }

    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = "auto";

    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      videoEl.removeEventListener("loadedmetadata", onReady);
      videoEl.removeEventListener("loadeddata", onReady);
      videoEl.removeEventListener("canplay", onReady);
      videoEl.removeEventListener("error", onError);
    };

    const finalize = (resultObject) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(resultObject);
    };

    const onReady = () => {
      if (settled) return;

      const baseWidth = videoEl.videoWidth || sourceObject.width || 320;
      const baseHeight = videoEl.videoHeight || sourceObject.height || 180;
      const displayedWidth = typeof sourceObject.getScaledWidth === "function"
        ? sourceObject.getScaledWidth()
        : (sourceObject.width || 320) * (sourceObject.scaleX || 1);
      const displayedHeight = typeof sourceObject.getScaledHeight === "function"
        ? sourceObject.getScaledHeight()
        : (sourceObject.height || 180) * (sourceObject.scaleY || 1);
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = Math.max(1, Math.round(baseWidth));
      frameCanvas.height = Math.max(1, Math.round(baseHeight));
      const frameCtx = frameCanvas.getContext("2d");

      if (!frameCtx) {
        onError();
        return;
      }

      try {
        frameCtx.drawImage(videoEl, 0, 0, frameCanvas.width, frameCanvas.height);
      } catch {
        // First frame may not be drawable yet on some browsers; the render loop will retry.
      }

      let liveObject = sourceObject;

      if (sourceObject.type === "group" || typeof sourceObject.setElement !== "function") {
        liveObject = new fabric.Image(frameCanvas, {
          left: sourceObject.left,
          top: sourceObject.top,
          originX: sourceObject.originX || "left",
          originY: sourceObject.originY || "top",
          width: frameCanvas.width,
          height: frameCanvas.height,
          angle: sourceObject.angle || 0,
          opacity: sourceObject.opacity ?? 1,
          visible: sourceObject.visible !== false,
          objectCaching: false
        });

        liveObject.set({
          scaleX: baseWidth ? displayedWidth / baseWidth : sourceObject.scaleX || 1,
          scaleY: baseHeight ? displayedHeight / baseHeight : sourceObject.scaleY || 1,
          flipX: sourceObject.flipX || false,
          flipY: sourceObject.flipY || false,
          shadow: sourceObject.shadow || null,
          selectable: sourceObject.selectable !== false,
          evented: sourceObject.evented !== false,
          lockMovementX: sourceObject.lockMovementX || false,
          lockMovementY: sourceObject.lockMovementY || false,
          lockScalingX: sourceObject.lockScalingX || false,
          lockScalingY: sourceObject.lockScalingY || false,
          lockRotation: sourceObject.lockRotation || false
        });

        liveObject.customName = "Lecteur Vidéo";
        liveObject.customVariant = "video";
        liveObject.videoSrc = source;
        liveObject.excludeFromExport = sourceObject.excludeFromExport;
        if (sourceObject.componentData) {
          liveObject.componentData = JSON.parse(JSON.stringify(sourceObject.componentData));
        }

        liveObject = replaceCanvasObject(canvas, sourceObject, liveObject);
      } else {
        sourceObject.setElement(frameCanvas);
        sourceObject.set({
          width: frameCanvas.width,
          height: frameCanvas.height,
          objectCaching: false,
          dirty: true
        });
        sourceObject.videoSrc = source;
      }

      liveObject.liveVideoElement = videoEl;
      liveObject.liveVideoCanvas = frameCanvas;
      liveObject.liveVideoCtx = frameCtx;
      liveObject.liveVideoSource = source;

      videoEl.play().catch(() => {});
      startVideoRenderLoop(canvas, liveObject);
      canvas.requestRenderAll();
      finalize(liveObject);
    };

    const onError = () => {
      console.error("Video loading failed:", {
        src: source,
        error: videoEl.error,
        networkState: videoEl.networkState,
        readyState: videoEl.readyState
      });

      const placeholder = createMissingVideoPlaceholder(sourceObject);
      const nextObject = sourceObject.type === "group"
        ? sourceObject
        : replaceCanvasObject(canvas, sourceObject, placeholder);

      canvas.requestRenderAll();
      finalize(nextObject);
    };

    const timeout = setTimeout(() => {
      if (!settled) {
        console.error("Video loading timeout:", source);
        onError();
      }
    }, 10000);

    videoEl.addEventListener("loadedmetadata", onReady);
    videoEl.addEventListener("loadeddata", onReady);
    videoEl.addEventListener("canplay", onReady);
    videoEl.addEventListener("error", onError);
    videoEl.src = source;
    videoEl.load();
  });
};

const reviveVideosSafe = (canvas) => {
  if (!canvas) return Promise.resolve([]);
  return Promise.all(
    canvas
      .getObjects()
      .filter((obj) => obj.customName === "Lecteur Vidéo" && obj.videoSrc)
      .map((obj) => hydrateVideoObject(canvas, obj))
  );
};

reviveVideos = reviveVideosSafe;

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
  
  // On récupère les valeurs soit à la racine de l'objet, soit dans componentData
  const lat = group.mapLat ?? group.componentData?.mapLat ?? DEFAULT_MAP_LAT;
  const lng = group.mapLng ?? group.componentData?.mapLng ?? DEFAULT_MAP_LNG;
  const zoom = Math.min(18, Math.max(1, Number(group.mapZoom ?? group.componentData?.mapZoom) || DEFAULT_MAP_ZOOM));
  
  const w = Math.max(1, Math.round(mapRect.width || 1));
  const h = Math.max(1, Math.round(mapRect.height || 1));
  const baseUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&maptype=mapnik`;
  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;
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
  if (obj.type === "i-text" || obj.type === "textbox") return `Texte: "${(obj.text || "").slice(0, 12)}â€¦"`;
  if (obj.type === "rect") return obj.fill === "transparent" ? "Cadre" : "Rectangle";
  if (obj.type === "circle") return "Cercle";
  if (obj.type === "ellipse") return "Ellipse";
  if (obj.type === "triangle") return "Triangle";
  if (obj.type === "polygon") return "Forme Avancée";
  if (obj.type === "line") return "Ligne";
  if (obj.type === "image") return obj.customName || "Image";
  if (obj.type === "group") {
    if (obj.customVariant === "button") return "Bouton";
    if (obj.customVariant === "checkbox") return "Checkbox";
    if (obj.customVariant === "toggle") return "Switch";
    if (obj.customVariant === "slider") return "Slider";
    if (obj.customVariant === "input") return "Champ de texte";
    if (obj.customVariant === "modal") return "Modal";
    if (obj.customVariant === "profile") return "Profil Utilisateur";
    if (obj.customVariant === "pricing") return "Tableau de Prix";
    if (obj.customVariant === "card") return "Carte Produit";
    if (obj.customVariant === "nav_menu") return "Menu NavBar";
    if (obj.customVariant === "hero") return "Section Hero";
    if (obj.customVariant === "tabs") return "Onglets de Navigation";
    return "Composant UI";
  }
  return obj.type || "Objet";
};





// â”€â”€â”€ MODERN MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ModernModal = ({ isOpen, onClose, title, content, onAction = null }) => {
  if (!isOpen) return null;
  return (
    <div className="modern-modal-overlay" onClick={onClose}>
      <div className="modern-modal" onClick={e => e.stopPropagation()}>
        <div className="modern-modal__header">
          <h3>{title || "Notification"}</h3>
          <button className="modern-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modern-modal__body"><p>{content || "Action effectuée avec succès !"}</p></div>
        <div className="modern-modal__footer">
          <button className="modern-modal__btn modern-modal__btn--secondary" onClick={onClose}>Fermer</button>
          <button className="modern-modal__btn modern-modal__btn--primary" onClick={onAction || onClose}>Confirmer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ IMAGE HISTORY PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ImageHistoryPanel = ({ imageHistory, onReplaceImage, onSelectImage, canvas }) => {
  const fileInputRef = useRef(null);
  const [replacingId, setReplacingId] = useState(null);

  const handleReplaceClick = (imgEntry) => {
    setReplacingId(imgEntry.id);
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !replacingId) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      if (typeof f.target?.result === "string") {
        onReplaceImage(replacingId, f.target.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = null;
    setReplacingId(null);
  };

  if (imageHistory.length === 0) {
    return (
      <div className="img-history-empty">
        <Images size={28} />
        <p>Aucune image importée</p>
        <span>Importez une image depuis la barre latérale</span>
      </div>
    );
  }

  return (
    <div className="img-history-panel">
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      {imageHistory.map((img) => (
        <div key={img.id} className="img-history-item" onClick={() => onSelectImage(img.id)}>
          <div className="img-history-thumb-wrap">
            <img src={img.src} alt={img.name} className="img-history-thumb" />
          </div>
          <div className="img-history-info">
            <span className="img-history-name">{img.name}</span>
            <span className="img-history-meta">{img.width}×{img.height}px</span>
          </div>
          <div className="img-history-actions">
            <button
              className="img-history-btn"
              title="Remplacer l'image"
              onClick={(e) => { e.stopPropagation(); handleReplaceClick(img); }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// â”€â”€â”€ BUTTON EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ButtonEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [text, setText] = useState("Bouton");
  const [color, setColor] = useState("#6366f1");
  const [textColor, setTextColor] = useState("#ffffff");
  const [size, setSize] = useState("medium");
  const [borderRadius, setBorderRadius] = useState(10);
  const [actionType, setActionType] = useState("modal");

  useEffect(() => {
    if (isOpen && component) {
      setText(component.buttonText || "Bouton");
      setColor(component.buttonColor || "#6366f1");
      setTextColor(component.buttonTextColor || "#ffffff");
      setSize(component.buttonSize || "medium");
      setBorderRadius(component.borderRadius ?? 10);
      setActionType(component.actionType || "modal");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  const sizeMap = { small: { width: 110, height: 38, fontSize: 12 }, medium: { width: 150, height: 46, fontSize: 15 }, large: { width: 190, height: 56, fontSize: 18 } };
  const dims = sizeMap[size];

  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header">
          <h3>âœï¸ Modifier le bouton</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Texte</label><input type="text" value={text} onChange={e => setText(e.target.value)} /></div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Couleur de fond</label><div className="color-picker-wrap"><input type="color" value={color} onChange={e => setColor(e.target.value)} /><span>{color}</span></div></div>
            <div className="editor-field"><label>Couleur du texte</label><div className="color-picker-wrap"><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /><span>{textColor}</span></div></div>
          </div>
          <div className="editor-field"><label>Taille — {dims.width}×{dims.height}px</label>
            <div className="size-selector">
              {["small", "medium", "large"].map(s => (
                <button key={s} className={`size-btn ${size === s ? "active" : ""}`} onClick={() => setSize(s)}>{s === "small" ? "Petit" : s === "medium" ? "Moyen" : "Grand"}</button>
              ))}
            </div>
          </div>
          <div className="editor-field"><label>Arrondi â€” {borderRadius}px</label><input type="range" value={borderRadius} onChange={e => setBorderRadius(+e.target.value)} min="0" max="50" className="range-input" /></div>
          <div className="editor-field"><label>Action au clic</label>
            <select value={actionType} onChange={e => setActionType(e.target.value)}>
              <option value="modal">Ouvrir une fenêtre modale</option>
              <option value="toast">Afficher une notification</option>
            </select>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ buttonText: text, buttonColor: color, buttonTextColor: textColor, buttonSize: size, borderRadius, actionType }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ INPUT EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const InputEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [placeholder, setPlaceholder] = useState("Entrez du texte...");
  const [width, setWidth] = useState(280);
  const [height, setHeight] = useState(44);
  const [borderColor, setBorderColor] = useState("#e2e8f0");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#0f172a");

  useEffect(() => {
    if (isOpen && component) {
      setPlaceholder(component.placeholder || "Entrez du texte...");
      setWidth(component.inputWidth || 280);
      setHeight(component.inputHeight || 44);
      setBorderColor(component.borderColor || "#e2e8f0");
      setBgColor(component.bgColor || "#ffffff");
      setTextColor(component.textColor || "#0f172a");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier le champ de texte</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Placeholder</label><input type="text" value={placeholder} onChange={e => setPlaceholder(e.target.value)} /></div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Largeur (px)</label><input type="number" value={width} onChange={e => setWidth(+e.target.value)} min="100" max="600" /></div>
            <div className="editor-field"><label>Hauteur (px)</label><input type="number" value={height} onChange={e => setHeight(+e.target.value)} min="30" max="100" /></div>
          </div>
          <div className="editor-row-3">
            <div className="editor-field"><label>Fond</label><div className="color-picker-wrap"><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} /><span>{bgColor}</span></div></div>
            <div className="editor-field"><label>Bordure</label><div className="color-picker-wrap"><input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} /><span>{borderColor}</span></div></div>
            <div className="editor-field"><label>Texte</label><div className="color-picker-wrap"><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /><span>{textColor}</span></div></div>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ placeholder, inputWidth: width, inputHeight: height, borderColor, bgColor, textColor }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ PROFILE EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ProfileEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [name, setName] = useState("Marie Dupont");
  const [role, setRole] = useState("Chef de projet");
  const [email, setEmail] = useState("marie@exemple.com");
  const [avatarColor, setAvatarColor] = useState("#6366f1");
  const [layout, setLayout] = useState("horizontal");

  useEffect(() => {
    if (isOpen && component) {
      setName(component.profileName || "Marie Dupont");
      setRole(component.profileRole || "Chef de projet");
      setEmail(component.profileEmail || "marie@exemple.com");
      setAvatarColor(component.avatarColor || "#6366f1");
      setLayout(component.profileLayout || "horizontal");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier le profil</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Nom complet</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="editor-field"><label>Rôle / Titre</label><input type="text" value={role} onChange={e => setRole(e.target.value)} /></div>
          <div className="editor-field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="editor-field"><label>Couleur de l'avatar</label><div className="color-picker-wrap"><input type="color" value={avatarColor} onChange={e => setAvatarColor(e.target.value)} /><span>{avatarColor}</span></div></div>
          <div className="editor-field"><label>Disposition</label>
            <div className="size-selector">
              {["horizontal", "vertical", "compact"].map(l => (
                <button key={l} className={`size-btn ${layout === l ? "active" : ""}`} onClick={() => setLayout(l)}>{l.charAt(0).toUpperCase() + l.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ profileName: name, profileRole: role, profileEmail: email, avatarColor, profileLayout: layout }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ PRICING EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PricingEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [rows, setRows] = useState([
    { name: "Basique", price: "0€", features: ["Fonctionnalité 1", "Fonctionnalité 2"], color: "#6b7280", popular: false },
    { name: "Pro", price: "29€", features: ["Fonctionnalité 1", "Fonctionnalité 2", "Fonctionnalité 3"], color: "#6366f1", popular: true },
    { name: "Premium", price: "99€", features: ["Toutes les fonctionnalités", "Support prioritaire", "API dédiée"], color: "#10b981", popular: false },
  ]);

  useEffect(() => {
    if (isOpen && component?.pricingRows) setRows(component.pricingRows);
  }, [isOpen, component]);

  if (!isOpen) return null;
  const updateRow = (i, field, val) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const addRow = () => setRows(r => [...r, { name: "Nouveau plan", price: "0€", features: ["Nouvelle fonctionnalité"], color: "#9ca3af", popular: false }]);
  const removeRow = i => setRows(r => r.filter((_, idx) => idx !== i));
  const addFeature = ri => setRows(r => r.map((row, i) => i === ri ? { ...row, features: [...row.features, "Nouvelle fonctionnalité"] } : row));
  const removeFeature = (ri, fi) => setRows(r => r.map((row, i) => i === ri ? { ...row, features: row.features.filter((_, j) => j !== fi) } : row));
  const updateFeature = (ri, fi, val) => setRows(r => r.map((row, i) => i === ri ? { ...row, features: row.features.map((f, j) => j === fi ? val : f) } : row));

  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal pricing-editor" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Tableau de prix</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          {rows.map((row, idx) => (
            <div key={idx} className="pricing-row-editor">
              <div className="pricing-row-header">
                <h4>Plan {idx + 1}</h4>
                <button className="btn-icon-danger" onClick={() => removeRow(idx)}><Trash2 size={14} /></button>
              </div>
              <div className="editor-row-2">
                <div className="editor-field"><label>Nom</label><input type="text" value={row.name} onChange={e => updateRow(idx, "name", e.target.value)} /></div>
                <div className="editor-field"><label>Prix</label><input type="text" value={row.price} onChange={e => updateRow(idx, "price", e.target.value)} /></div>
              </div>
              <div className="editor-row-2">
                <div className="editor-field"><label>Couleur</label><div className="color-picker-wrap"><input type="color" value={row.color} onChange={e => updateRow(idx, "color", e.target.value)} /><span>{row.color}</span></div></div>
                <div className="editor-field"><label>Populaire</label><label className="toggle-wrap"><input type="checkbox" checked={row.popular} onChange={e => updateRow(idx, "popular", e.target.checked)} /><span className="toggle-slider-ui" /></label></div>
              </div>
              <div className="editor-field"><label>Fonctionnalités</label>
                {row.features.map((f, fi) => (
                  <div key={fi} className="feature-item">
                    <input type="text" value={f} onChange={e => updateFeature(idx, fi, e.target.value)} />
                    <button className="btn-icon-sm" onClick={() => removeFeature(idx, fi)}><X size={12} /></button>
                  </div>
                ))}
                <button className="btn-add-feature" onClick={() => addFeature(idx)}>+ Ajouter une fonctionnalité</button>
              </div>
            </div>
          ))}
          <button className="btn-add-row" onClick={addRow}>+ Ajouter un plan</button>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ pricingRows: rows }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ CARD EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CardEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [title, setTitle] = useState("Produit Premium");
  const [description, setDescription] = useState("Description courte du produit");
  const [price, setPrice] = useState("29€");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [rating, setRating] = useState(5);
  const [reviews, setReviews] = useState("128");

  useEffect(() => {
    if (isOpen && component) {
      setTitle(component.productTitle || "Produit Premium");
      setDescription(component.productDesc || "Description courte du produit");
      setPrice(component.productPrice || "29€");
      setPrimaryColor(component.productColor || "#6366f1");
      setRating(component.productRating || 5);
      setReviews(component.productReviews || "128");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  const stars = "â˜…".repeat(Math.floor(rating)) + "â˜†".repeat(5 - Math.floor(rating));

  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier la carte produit</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Titre produit</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="editor-field"><label>Description</label><textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="editor-textarea" /></div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Prix</label><input type="text" value={price} onChange={e => setPrice(e.target.value)} /></div>
            <div className="editor-field"><label>Couleur principale</label><div className="color-picker-wrap"><input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} /><span>{primaryColor}</span></div></div>
          </div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Note (1-5)</label><input type="number" value={rating} onChange={e => setRating(Math.min(5, Math.max(1, +e.target.value)))} min="1" max="5" step="0.5" /></div>
            <div className="editor-field"><label>Avis</label><input type="text" value={reviews} onChange={e => setReviews(e.target.value)} /></div>
          </div>
          <div className="editor-field"><label>Aperçu étoiles</label><div style={{ fontSize: 14, letterSpacing: 2, color: "#f59e0b" }}>{stars}</div></div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ productTitle: title, productDesc: description, productPrice: price, productColor: primaryColor, productRating: rating, productReviews: reviews }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ SLIDER EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SliderEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [value, setValue] = useState(50);
  const [unit, setUnit] = useState("%");
  const [color, setColor] = useState("#6366f1");

  useEffect(() => {
    if (isOpen && component) {
      setMin(component.min ?? 0);
      setMax(component.max ?? 100);
      setValue(component.sliderValue ?? 50);
      setUnit(component.unit || "%");
      setColor(component.sliderColor || "#6366f1");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Configurer le Slider</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-row-2">
            <div className="editor-field"><label>Minimum</label><input type="number" value={min} onChange={e => setMin(+e.target.value)} /></div>
            <div className="editor-field"><label>Maximum</label><input type="number" value={max} onChange={e => setMax(+e.target.value)} /></div>
          </div>
          <div className="editor-field"><label>Valeur par défaut â€” {value}{unit}</label><input type="range" value={value} onChange={e => setValue(+e.target.value)} min={min} max={max} className="range-input" /></div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Unité</label><input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="%, €, pxâ€¦" /></div>
            <div className="editor-field"><label>Couleur</label><div className="color-picker-wrap"><input type="color" value={color} onChange={e => setColor(e.target.value)} /><span>{color}</span></div></div>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ min, max, sliderValue: value, unit, sliderColor: color }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ MODAL EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ModalEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [title, setTitle] = useState("Fenêtre modale");
  const [content, setContent] = useState("Contenu de la modal.");

  useEffect(() => {
    if (isOpen && component) {
      setTitle(component.modalTitle || "Fenêtre modale");
      setContent(component.modalContent || "Contenu de la modal.");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier la Modale</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Titre de la pop-up</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="editor-field"><label>Contenu</label><textarea rows={3} value={content} onChange={e => setContent(e.target.value)} className="editor-textarea" /></div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ modalTitle: title, modalContent: content }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ NAV MENU EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NavMenuEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [logoTxt, setLogoTxt] = useState("â—ˆ Logo");
  const [nav1, setNav1] = useState("Accueil");
  const [nav2, setNav2] = useState("À propos");
  const [nav3, setNav3] = useState("Contact");
  const [btnTxt, setBtnTxt] = useState("Connexion");
  const [color, setColor] = useState("#6366f1");

  useEffect(() => {
    if (isOpen && component) {
      setLogoTxt(component.navLogo || "â—ˆ Logo");
      setNav1(component.nav1 || "Accueil");
      setNav2(component.nav2 || "À propos");
      setNav3(component.nav3 || "Contact");
      setBtnTxt(component.navBtn || "Connexion");
      setColor(component.navColor || "#6366f1");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier Nav Menu</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-row-2">
            <div className="editor-field"><label>Texte Logo</label><input type="text" value={logoTxt} onChange={e => setLogoTxt(e.target.value)} /></div>
            <div className="editor-field"><label>Couleur d'accent</label><div className="color-picker-wrap"><input type="color" value={color} onChange={e => setColor(e.target.value)} /><span>{color}</span></div></div>
          </div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Lien 1</label><input type="text" value={nav1} onChange={e => setNav1(e.target.value)} /></div>
            <div className="editor-field"><label>Lien 2</label><input type="text" value={nav2} onChange={e => setNav2(e.target.value)} /></div>
          </div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Lien 3</label><input type="text" value={nav3} onChange={e => setNav3(e.target.value)} /></div>
            <div className="editor-field"><label>Texte du bouton</label><input type="text" value={btnTxt} onChange={e => setBtnTxt(e.target.value)} /></div>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ navLogo: logoTxt, nav1, nav2, nav3, navBtn: btnTxt, navColor: color }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ HERO EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HeroEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [title, setTitle] = useState("Titre Principal");
  const [subtitle, setSubtitle] = useState("Sous-titre descriptif accrocheur pour présenter votre produit");
  const [btnTxt, setBtnTxt] = useState("Commencer");
  const [badgeTxt, setBadgeTxt] = useState("âœ¨ NOUVEAU DESIGN");
  const [btnOutlineTxt, setBtnOutlineTxt] = useState("En savoir plus");
  const [bgColor, setBgColor] = useState("#4f46e5");

  useEffect(() => {
    if (isOpen && component) {
      setTitle(component.heroTitle || "Titre Principal");
      setSubtitle(component.heroSub || "Sous-titre descriptif accrocheur pour présenter votre produit");
      setBtnTxt(component.heroBtn || "Commencer");
      setBadgeTxt(component.heroBadge || "âœ¨ NOUVEAU DESIGN");
      setBtnOutlineTxt(component.heroBtnOutline || "En savoir plus");
      setBgColor(component.heroBg || "#4f46e5");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier Section Hero</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-row-2">
            <div className="editor-field"><label>Texte du Badge</label><input type="text" value={badgeTxt} onChange={e => setBadgeTxt(e.target.value)} /></div>
            <div className="editor-field"><label>Couleur principale</label><div className="color-picker-wrap"><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} /><span>{bgColor}</span></div></div>
          </div>
          <div className="editor-field"><label>Titre principal</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="editor-field"><label>Sous-titre</label><textarea rows={2} value={subtitle} onChange={e => setSubtitle(e.target.value)} className="editor-textarea" /></div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Bouton Action</label><input type="text" value={btnTxt} onChange={e => setBtnTxt(e.target.value)} /></div>
            <div className="editor-field"><label>Bouton Secondaire</label><input type="text" value={btnOutlineTxt} onChange={e => setBtnOutlineTxt(e.target.value)} /></div>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ heroTitle: title, heroSub: subtitle, heroBtn: btnTxt, heroBadge: badgeTxt, heroBtnOutline: btnOutlineTxt, heroBg: bgColor }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};


// â”€â”€â”€ TABS EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TabsEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [tab1, setTab1] = useState("Général");
  const [tab2, setTab2] = useState("Sécurité");
  const [tab3, setTab3] = useState("Avancé");

  useEffect(() => {
    if (isOpen && component) {
      setTab1(component.tab1 || "Général");
      setTab2(component.tab2 || "Sécurité");
      setTab3(component.tab3 || "Avancé");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Modifier les Onglets</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Onglet Actif (Sélectionné)</label><input type="text" value={tab1} onChange={e => setTab1(e.target.value)} /></div>
          <div className="editor-field"><label>Onglet 2</label><input type="text" value={tab2} onChange={e => setTab2(e.target.value)} /></div>
          <div className="editor-field"><label>Onglet 3</label><input type="text" value={tab3} onChange={e => setTab3(e.target.value)} /></div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ tab1, tab2, tab3 }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ EMOJI PICKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EmojiPickerModal = ({ isOpen, onClose, onSelect }) => {
  const categories = [
    { name: "Sourires & Visages", emojis: ["ðŸ˜€","ðŸ˜‚","ðŸ¥°","ðŸ˜Ž","ðŸ¤©","ðŸ¤”","ðŸ˜´","ðŸ¥³","ðŸ¤¯","ðŸ¤¬","ðŸ˜±","ðŸ‘½","ðŸ¤–","ðŸ’©","ðŸ‘¾","ðŸ‘»"] },
    { name: "Gestes & Corps", emojis: ["ðŸ‘","ðŸ‘Ž","ðŸ‘","ðŸ¤","âœŒï¸","ðŸ¤ž","ðŸ’ª","ðŸ‘€","ðŸ§ ","ðŸ”¥","â¤ï¸","ðŸ’”","âœ¨","ðŸ’…","ðŸ™"] },
    { name: "Objets & Fun", emojis: ["ðŸ’»","ðŸ“±","ðŸ’¡","ðŸŽ‰","ðŸŽˆ","ðŸŽ","ðŸ†","ðŸš€","ðŸŽ¨","ðŸŽµ","ðŸ“¸","ðŸ”","ðŸ•","â˜•","ðŸ¹"] },
    { name: "Symboles", emojis: ["âœ…","âŒ","ðŸ’¯","âš ï¸","âœ”ï¸","ðŸ””","ðŸš©","ðŸ’¬","ðŸ’­","â“","â•","ðŸ“","ðŸ›‘","âš¡","â­"] }
  ];

  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="component-editor-modal" style={{ maxWidth: 400, padding: 16 }} onClick={e => e.stopPropagation()}>
        <div className="component-editor-header">
          <h3 style={{ margin: 0, fontSize: 16 }}>Sélectionner un Emoji</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 15, paddingRight: 5 }}>
          {categories.map(cat => (
            <div key={cat.name} style={{ marginBottom: 15 }}>
              <h4 style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>{cat.name}</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
                {cat.emojis.map((emoji, idx) => (
                  <button key={idx} onClick={() => { onSelect(emoji); onClose(); }} style={{ fontSize: 24, padding: 4, background: "transparent", border: "none", cursor: "pointer", borderRadius: 4, display: "flex", justifyContent: "center" }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ STICKER PICKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STICKERS_LIBRARY = [
  { name: "Bulle de BD", width: 100, height: 100, path: "M 0 0 C 40 -20 100 -20 140 0 C 160 20 160 60 140 80 C 100 100 40 100 0 80 C -20 60 -20 20 0 0 Z", fill: "#3ecf8e" },
  { name: "Étoile", width: 40, height: 40, path: "M 12 2 L 15.09 8.26 L 22 9.27 L 17 14.14 L 18.18 21.02 L 12 17.77 L 5.82 21.02 L 7 14.14 L 2 9.27 L 8.91 8.26 Z", fill: "#fde047" },
  { name: "Punaise", width: 24, height: 24, path: "M 16 10 C 16 6.686 13.314 4 10 4 C 6.686 4 4 6.686 4 10 L 2 16 L 10 16 L 10 22 L 12 22 L 12 16 L 18 16 L 16 10 Z", fill: "#ef4444" },
  { name: "Tag Jaune", width: 100, height: 50, path: "M 0 0 L 80 0 L 100 25 L 80 50 L 0 50 Z", fill: "#eab308" },
  { name: "Badge Nouveau", width: 100, height: 100, path: "M 50 0 L 65 15 L 85 10 L 90 30 L 105 40 L 90 55 L 95 75 L 75 75 L 60 90 L 45 75 L 25 80 L 30 60 L 15 50 L 30 35 L 20 15 L 40 20 Z", fill: "#6366f1" }
];

const StickerPickerModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="component-editor-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="component-editor-modal" style={{ maxWidth: 450, padding: 16 }} onClick={e => e.stopPropagation()}>
        <div className="component-editor-header">
          <h3 style={{ margin: 0, fontSize: 16 }}>Stickers</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 15, maxHeight: 300, overflowY: "auto" }}>
          {STICKERS_LIBRARY.map((s, idx) => (
            <button key={idx} onClick={() => { onSelect(s); onClose(); }} className="sticker-btn" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg viewBox={`0 0 ${s.width} ${s.height}`} style={{ width: 40, height: 40, overflow: "visible" }}><path d={s.path} fill={s.fill} /></svg>
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ TABLE EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TableEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [tableData, setTableData] = useState([
    ["En-tête 1", "En-tête 2", "En-tête 3"],
    ["Valeur A1", "Valeur B1", "Valeur C1"],
    ["Valeur A2", "Valeur B2", "Valeur C2"]
  ]);
  const [headerBg, setHeaderBg] = useState("#f1f5f9");
  const [rowBg, setRowBg] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#cbd5e1");

  useEffect(() => {
    if (isOpen && component) {
      setRows(component.rows || 3);
      setCols(component.cols || 3);
      setTableData(component.tableData || [["En-tête 1", "En-tête 2", "En-tête 3"], ["Valeur A1", "Valeur B1", "Valeur C1"], ["Valeur A2", "Valeur B2", "Valeur C2"]]);
      setHeaderBg(component.headerBg || "#f1f5f9");
      setRowBg(component.rowBg || "#ffffff");
      setStrokeColor(component.strokeColor || "#cbd5e1");
    }
  }, [isOpen, component]);

  if (!isOpen) return null;

  const handleDataChange = (r, c, val) => {
    const newData = [...tableData];
    if (!newData[r]) newData[r] = [];
    newData[r][c] = val;
    setTableData(newData);
  };

  const handleRowsChange = (newR) => {
    if (newR < 1) newR = 1;
    const newData = [...tableData];
    while (newData.length < newR) newData.push(new Array(cols).fill(""));
    while (newData.length > newR) newData.pop();
    setRows(newR); setTableData(newData);
  };
  const handleColsChange = (newC) => {
    if (newC < 1) newC = 1;
    const newData = tableData.map(row => {
      const arr = [...row];
      while (arr.length < newC) arr.push("");
      while (arr.length > newC) arr.pop();
      return arr;
    });
    setCols(newC); setTableData(newData);
  };

  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Éditer le Tableau</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-row-2">
            <div className="editor-field"><label>Lignes</label><input type="number" value={rows} onChange={e => handleRowsChange(+e.target.value)} min="1" max="12" /></div>
            <div className="editor-field"><label>Colonnes</label><input type="number" value={cols} onChange={e => handleColsChange(+e.target.value)} min="1" max="8" /></div>
          </div>
          <div className="editor-row-3">
            <div className="editor-field"><label>Couleur En-tête</label><div className="color-picker-wrap"><input type="color" value={headerBg} onChange={e => setHeaderBg(e.target.value)} /><span>{headerBg}</span></div></div>
            <div className="editor-field"><label>Couleur Cellules</label><div className="color-picker-wrap"><input type="color" value={rowBg} onChange={e => setRowBg(e.target.value)} /><span>{rowBg}</span></div></div>
            <div className="editor-field"><label>Couleur Bordures</label><div className="color-picker-wrap"><input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} /><span>{strokeColor}</span></div></div>
          </div>
          <div className="editor-field">
            <label>Contenu des Cellules</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowX: "auto" }}>
              {tableData.map((rowArr, rowIndex) => (
                <div key={rowIndex} style={{ display: "flex", gap: 4, minWidth: "max-content" }}>
                  {rowArr.map((cellTxt, colIndex) => (
                    <input 
                      key={colIndex} 
                      type="text" 
                      value={cellTxt || ""} 
                      onChange={e => handleDataChange(rowIndex, colIndex, e.target.value)}
                      style={{ width: 120, padding: 6, fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 4, background: rowIndex === 0 ? "rgba(0,0,0,0.02)" : "white", fontWeight: rowIndex === 0 ? "bold" : "normal" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave({ rows, cols, tableData, headerBg, rowBg, strokeColor }); onClose(); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};


// â”€â”€â”€ CHART EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ChartEditorModal = ({ isOpen, onClose, component, onSave }) => {
  const [chartTitle, setChartTitle] = useState("Analyse");
  const [chartColor, setChartColor] = useState("#6366f1");
  const [secondColor, setSecondColor] = useState("#8b5cf6");
  const [labels, setLabels] = useState("Lun,Mar,Mer,Jeu,Ven");
  const [values, setValues] = useState("30,80,50,100,60");

  useEffect(() => {
    if (isOpen && component) {
      setChartTitle(component.chartTitle || "Analyse");
      setChartColor(component.chartColor || "#6366f1");
      setSecondColor(component.secondColor || "#8b5cf6");
      if (component.chartLabels) setLabels(component.chartLabels.join(","));
      if (component.chartValues) setValues(component.chartValues.join(","));
    }
  }, [isOpen, component]);

  if (!isOpen) return null;

  return (
    <div className="component-editor-overlay" onClick={onClose}>
      <div className="component-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="component-editor-header"><h3>âœï¸ Éditer le Graphique</h3><button onClick={onClose}><X size={18} /></button></div>
        <div className="component-editor-body">
          <div className="editor-field"><label>Titre</label><input type="text" value={chartTitle} onChange={e => setChartTitle(e.target.value)} /></div>
          <div className="editor-row-2">
            <div className="editor-field"><label>Couleur principale</label><div className="color-picker-wrap"><input type="color" value={chartColor} onChange={e => setChartColor(e.target.value)} /><span>{chartColor}</span></div></div>
            <div className="editor-field"><label>Couleur secondaire</label><div className="color-picker-wrap"><input type="color" value={secondColor} onChange={e => setSecondColor(e.target.value)} /><span>{secondColor}</span></div></div>
          </div>
          <div className="editor-field"><label>Labels (séparés par des virgules)</label><input type="text" value={labels} onChange={e => setLabels(e.target.value)} /></div>
          <div className="editor-field"><label>Valeurs (séparées par des virgules)</label><input type="text" value={values} onChange={e => setValues(e.target.value)} /></div>
        </div>
        <div className="component-editor-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { 
            const arrLabels = labels.split(",").map(s => s.trim());
            const arrValues = values.split(",").map(v => parseFloat(v.trim()) || 0);
            onSave({ chartTitle, chartColor, secondColor, chartLabels: arrLabels, chartValues: arrValues }); 
            onClose(); 
          }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};


const updateButtonOnCanvas = (group, data) => {
  const sizeMap = { small: { w: 110, h: 38, f: 12 }, medium: { w: 150, h: 46, f: 15 }, large: { w: 190, h: 56, f: 18 } };
  const dims = sizeMap[data.buttonSize] || sizeMap.medium;
  if (group._objects[0]) group._objects[0].set({ width: dims.w, height: dims.h, fill: data.buttonColor, rx: data.borderRadius, ry: data.borderRadius });
  if (group._objects[1]) group._objects[1].set({ text: data.buttonText, fontSize: dims.f, fill: data.buttonTextColor });
};

const updateInputOnCanvas = (group, data) => {
  if (group._objects[0]) group._objects[0].set({ width: data.inputWidth, height: data.inputHeight, fill: data.bgColor, stroke: data.borderColor });
  if (group._objects[2]) group._objects[2].set({ text: data.placeholder });
};

const updateProfileOnCanvas = (group, data) => {
  const avatar = group._objects.find(o => o.type === "circle");
  const texts = group._objects.filter(o => o.type === "i-text" || o.type === "text");
  if (avatar) avatar.set({ fill: data.avatarColor });
  if (texts[0]) texts[0].set({ text: data.profileName });
  if (texts[1]) texts[1].set({ text: data.profileRole });
};

const updatePricingOnCanvas = (group, data) => {
  if (!data.pricingRows) return;
  const toRemove = group._objects.slice(1);
  toRemove.forEach(o => group.remove(o));
  const startX = -175;
  data.pricingRows.forEach((row, idx) => {
    const x = startX + idx * 200;
    group.add(new fabric.Rect({ width: 185, height: 295, fill: row.color + "12", stroke: row.color, strokeWidth: 2, rx: 14, ry: 14, left: x, top: 0, originX: "center", originY: "center" }));
    group.add(new fabric.IText(row.name, { fontSize: 16, fontWeight: "800", fill: row.color, left: x, top: -130, originX: "center" }));
    group.add(new fabric.IText(row.price, { fontSize: 28, fontWeight: "900", fill: row.color, left: x, top: -102, originX: "center" }));
  });
};

const updateSliderOnCanvas = (group, data) => {
  const pct = (data.sliderValue - data.min) / (data.max - data.min);
  const newX = -75 + pct * 150;
  if (group._objects[1]) group._objects[1].set({ x2: newX, stroke: data.sliderColor });
  if (group._objects[2]) group._objects[2].set({ left: newX, stroke: data.sliderColor });
  if (group._objects[3]) group._objects[3].set({ text: `${data.sliderValue}${data.unit}`, fill: data.sliderColor });
};

const updateCardOnCanvas = (group, data) => {
  if (group._objects[3]) group._objects[3].set({ text: data.productTitle });
  if (group._objects[6]) group._objects[6].set({ text: data.productPrice, fill: data.productColor });
  if (group._objects[7]) group._objects[7].set({ fill: data.productColor });
};

const updateNavMenuOnCanvas = (group, data) => {
  if (group._objects[1]) group._objects[1].set({ text: data.navLogo, fill: data.navColor });
  if (group._objects[6]) group._objects[6].set({ fill: data.navColor });
};

const updateHeroOnCanvas = (group, data) => {
  if (group._objects[0]) group._objects[0].set({ fill: data.heroBg });
  if (group._objects[5]) group._objects[5].set({ text: data.heroTitle });
};

const updateTabsOnCanvas = (group, data) => {
  if (group._objects[2]) group._objects[2].set({ text: data.tab1 });
  if (group._objects[3]) group._objects[3].set({ text: data.tab2 });
};

const updateTableOnCanvas = (group, data) => {
  if (!data.tableData) return;
  const oldObjs = [...group._objects];
  oldObjs.forEach(o => group.remove(o));
  const cellW = 120, cellH = 50;
  for (let i = 0; i < data.rows; i++) {
    for (let j = 0; j < data.cols; j++) {
      const x = - (data.cols * cellW) / 2 + j * cellW;
      const y = - (data.rows * cellH) / 2 + i * cellH;
      group.add(new fabric.Rect({ left: x, top: y, width: cellW, height: cellH, fill: i === 0 ? data.headerBg : data.rowBg, stroke: data.strokeColor }));
      group.add(new fabric.IText(data.tableData[i]?.[j] || "", { left: x + 10, top: y + 15, fontSize: 14, fontFamily: "Inter" }));
    }
  }
};



const updateModalOnCanvas = (group, data) => {
  const titleText = group._objects?.find((o) => (o.type === "text" || o.type === "i-text") && /fenêtre modale|modal/i.test(o.text || ""));
  const bodyText = group._objects?.find((o) => (o.type === "text" || o.type === "i-text") && (o.text || "") !== titleText?.text);
  if (titleText) titleText.set({ text: data.modalTitle || "Fenêtre modale" });
  if (bodyText) bodyText.set({ text: data.modalContent || "Contenu de la modal." });
};



// --- CHART GENERATION HELPER ---
const generateChartObjects = (variant, data) => {
  const bg = new fabric.Rect({ width: 300, height: 200, fill: "#ffffff", rx: 12, ry: 12, stroke: "#f1f5f9", strokeWidth: 1, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 10, offsetY: 4 }) });
  const title = new fabric.IText(data.chartTitle || "Analyse", { fontSize: 13, fontWeight: "700", fill: "#475569", fontFamily: "Inter", originX: "center", originY: "center", top: -80 });
  const objs = [bg, title];
  
  const labels = data.chartLabels || ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  const values = data.chartValues || [30, 80, 50, 100, 60];
  const color1 = data.chartColor || "#6366f1";
  const color2 = data.secondColor || "#8b5cf6";
  const color3 = "#f59e0b"; // third color
  const colors = [color1, color2, color3, "#ec4899", "#10b981", "#3b82f6"];
  
  const maxVal = Math.max(...values, 1);
  const chartW = 240;
  const chartH = 120;
  const startX = -chartW/2;
  const startY = chartH/2;
  
  if (variant === "chart_bar") {
    const barW = Math.min(30, (chartW / values.length) * 0.6);
    const spacing = chartW / values.length;
    values.forEach((v, i) => {
      const h = Math.max(2, (v / maxVal) * chartH);
      const x = startX + i * spacing + spacing/2;
      objs.push(new fabric.Rect({ width: barW, height: h, fill: colors[i%colors.length], rx: 4, ry: 4, left: x, top: startY + 15, originX: "center", originY: "bottom" }));
      objs.push(new fabric.IText(labels[i]||"", { fontSize: 10, fill: "#94a3b8", fontFamily: "Inter", left: x, top: startY + 25, originX: "center", originY: "center" }));
    });
  } else if (variant === "chart_bar_horiz") {
    const barH = Math.min(15, (chartH / values.length) * 0.6);
    const spacing = chartH / values.length;
    values.forEach((v, i) => {
      const w = Math.max(2, (v / maxVal) * chartW);
      const y = -chartH/2 + i * spacing + spacing/2 + 10;
      objs.push(new fabric.Rect({ width: w, height: barH, fill: colors[i%colors.length], rx: 4, ry: 4, left: startX + 20, top: y, originX: "left", originY: "center" }));
      objs.push(new fabric.IText(labels[i]||"", { fontSize: 10, fill: "#94a3b8", fontFamily: "Inter", left: startX + 15, top: y, originX: "right", originY: "center" }));
    });
  } else if (variant === "chart_bar_stacked") {
    const barW = Math.min(30, (chartW / values.length) * 0.6);
    const spacing = chartW / values.length;
    values.forEach((v, i) => {
      const h = Math.max(2, (v / maxVal) * chartH);
      const h1 = h * 0.6;
      const h2 = h * 0.4;
      const x = startX + i * spacing + spacing/2;
      objs.push(new fabric.Rect({ width: barW, height: h2, fill: color2, rx: 4, ry: 4, left: x, top: startY + 15 - h1 + 4, originX: "center", originY: "bottom" }));
      objs.push(new fabric.Rect({ width: barW, height: h1, fill: color1, rx: 4, ry: 4, left: x, top: startY + 15, originX: "center", originY: "bottom" }));
      objs.push(new fabric.IText(labels[i]||"", { fontSize: 10, fill: "#94a3b8", fontFamily: "Inter", left: x, top: startY + 25, originX: "center", originY: "center" }));
    });
  } else if (variant === "chart_pie" || variant === "chart_donut") {
    const total = values.reduce((a,b)=>a+b, 0) || 1;
    let currentAngle = -90;
    const isPie = variant === "chart_pie";
    const r = isPie ? 40 : 50;
    const strokeW = isPie ? 80 : 35;
    const circ = 2 * Math.PI * r;
    
    values.forEach((v, i) => {
      const slicePct = v / total;
      const drawLen = slicePct * circ;
      objs.push(new fabric.Circle({
        radius: r, fill: "transparent", stroke: colors[i%colors.length],
        strokeWidth: strokeW, strokeDashArray: [drawLen + 1, circ - drawLen],
        originX: "center", originY: "center", left: 0, top: 15, angle: currentAngle,
      }));
      currentAngle += slicePct * 360;
    });
    
    const legendStartX = -90;
    const legSpacing = 180 / Math.max(1, values.length);
    values.forEach((v, i) => {
      objs.push(new fabric.Circle({ radius: 4, fill: colors[i%colors.length], left: legendStartX + i * legSpacing, top: startY+20, originX: "center", originY: "center" }));
      objs.push(new fabric.IText(labels[i]||"", { fontSize: 9, fill: "#64748b", fontFamily: "Inter", left: legendStartX + i * legSpacing + 8, top: startY+20, originX: "left", originY: "center" }));
    });
  } else if (variant === "chart_line" || variant === "chart_area") {
    const spacing = chartW / Math.max(1, values.length - 1);
    
    if (variant === "chart_area") {
       const areaSteps = values.length * 4;
       const stepSpacing = chartW / (areaSteps - 1);
       for(let i=0; i<areaSteps; i++) {
         const t = i / (areaSteps - 1);
         const idx = t * (values.length - 1);
         const idx0 = Math.floor(idx);
         const idx1 = Math.min(idx0 + 1, values.length - 1);
         const v = values[idx0] + (values[idx1] - values[idx0]) * (idx - idx0);
         const h = (v / maxVal) * chartH;
         objs.push(new fabric.Rect({ width: stepSpacing*1.5, height: h, fill: color1, opacity: 0.3, left: startX + i * stepSpacing, top: startY + 15, originX: "center", originY: "bottom" }));
       }
    }
    
    values.forEach((v, i) => {
      const x = startX + i * spacing;
      const y = startY + 15 - ((v / maxVal) * chartH);
      if (i > 0) {
        const prevH = (values[i-1] / maxVal) * chartH;
        objs.push(new fabric.Line([startX + (i-1)*spacing, startY + 15 - prevH, x, y], { stroke: color1, strokeWidth: 3, originX: "center", originY: "center" }));
      }
    });

    values.forEach((v, i) => {
      const x = startX + i * spacing;
      const y = startY + 15 - ((v / maxVal) * chartH);
      objs.push(new fabric.Circle({ radius: 4, fill: color2, left: x, top: y, originX: "center", originY: "center" }));
      objs.push(new fabric.IText(labels[i]||"", { fontSize: 10, fill: "#94a3b8", fontFamily: "Inter", left: x, top: startY + 25, originX: "center", originY: "center" }));
    });
  }

  return objs;
};

const updateChartOnCanvas = (group, data) => {
  const oldObjs = [...group._objects];
  oldObjs.forEach(o => group.remove(o));
  const newObjs = generateChartObjects(group.customVariant, data);
  newObjs.forEach(o => group.add(o));
  group.setCoords();
};



// â”€â”€â”€ PROPERTIES PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PropertiesPanel = ({
  selectedObject, canvas, onUpdate,
  imageHistory, onReplaceImage, onSelectImageFromHistory, refreshKey, restoreInteractivity,
  setShowComponentEditor, setEditorVariant, setEditorData
}) => {
  const [props, setProps] = useState({});

  useEffect(() => {
    if (!selectedObject) { setProps({}); setEditorVariant(null); setEditorData(null); return; }
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
        mapAddress: o.mapAddress || "",
        mapType: o.mapType || "m",
        showMarker: o.showMarker !== false
      };
    }

    setProps({
      left: Math.round(o.left || 0), top: Math.round(o.top || 0),
      width: Math.round((o.width || 0) * (o.scaleX || 1)), height: Math.round((o.height || 0) * (o.scaleY || 1)),
      fill: (typeof o.fill === "string" && o.fill) ? o.fill : "#000000",
      opacity: Math.round((o.opacity ?? 1) * 100),
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
      // Fusion des deux versions : support images ET composants complexes
      imageShape: o.customImageShape || "rect",
      ...cardProps,
      ...profileProps,
      ...pricingProps,
      ...videoProps,
      ...mapProps,
    });

    if (o.customVariant && o.componentData) {
      setEditorVariant(o.customVariant);
      setEditorData({ ...o.componentData, variant: o.customVariant });
    } else {
      setEditorVariant(null);
      setEditorData(null);
    }
  }, [selectedObject, refreshKey]);

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

  const applyImageShape = (shapeType) => {
    if (!selectedObject || !canvas || selectedObject.type !== "image") return;
    const w = selectedObject.width;
    const h = selectedObject.height;

    let clipPath = null;
    if (shapeType === "circle") {
      const radius = Math.min(w, h) / 2;
      clipPath = new fabric.Circle({ radius, originX: "center", originY: "center" });
    } else if (shapeType === "rounded") {
      clipPath = new fabric.Rect({ width: w, height: h, rx: Math.min(w, h) * 0.2, ry: Math.min(w, h) * 0.2, originX: "center", originY: "center" });
    } else if (shapeType === "triangle") {
      clipPath = new fabric.Triangle({ width: w, height: h, originX: "center", originY: "center" });
    }

    selectedObject.customImageShape = shapeType;
    selectedObject.set("clipPath", clipPath);
    canvas.renderAll(); onUpdate?.();
    setProps(p => ({ ...p, imageShape: shapeType }));
  };

  const applyPadding = (side, value) => {
    if (!selectedObject || !canvas) return;
    const o = selectedObject;
    const key = `boxPadding${side}`;
    o.set(key, value);
    o.set("padding", Math.max(o.boxPaddingTop || 0, o.boxPaddingRight || 0, o.boxPaddingBottom || 0, o.boxPaddingLeft || 0));
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

// --- LOGIQUE DE SAUVEGARDE ET MISE À JOUR DES COMPOSANTS (FUSIONNÉE) ---


const handleUngroup = () => {
  if (!selectedObject || !canvas || selectedObject.type !== "group") return;
  const items = [...selectedObject.getObjects()];
  const transforms = items.map(child => fabric.util.qrDecompose(child.calcTransformMatrix()));
  
  canvas.remove(selectedObject);
  items.forEach((child, i) => {
      const opt = transforms[i];
      child.set({
          left: opt.translateX, top: opt.translateY,
          scaleX: opt.scaleX, scaleY: opt.scaleY,
          angle: opt.angle, skewX: opt.skewX, skewY: opt.skewY,
          group: null,
          editable: true,
          selectable: true,
          evented: true,
      });
      child.setCoords();
      canvas.add(child);
      restoreInteractivity?.(child);
  });
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  onUpdate?.();
};

// --- Fonctions utilitaires de origin (Cartes, Profils, Maps, Vidéos) ---

const applyGroupText = (index, key, value) => {
  if (!selectedObject || !canvas || selectedObject.type !== "group") return;
  const objs = selectedObject.getObjects();
  if (objs[index]) {
    objs[index].set("text", value);
    canvas.renderAll();
    onUpdate?.();
    setProps(p => ({ ...p, [key]: value }));
  }
};

const applyGroupBgFill = (index, key, value) => {
  if (!selectedObject || !canvas || selectedObject.type !== "group") return;
  const objs = selectedObject.getObjects();
  if (objs[index]) {
    objs[index].set("fill", value);
    selectedObject.dirty = true;
    canvas.renderAll();
    onUpdate?.();
    setProps((p) => ({ ...p, [key]: value }));
  }
};

const applyMapField = (key, raw) => {
  if (!selectedObject || !canvas || selectedObject.customName !== "Carte (Map)") return;
  if (key === "mapAddress" || key === "mapType") {
    selectedObject[key] = raw;
    setProps((p) => ({ ...p, [key]: raw }));
    canvas.fire("object:modified", { target: selectedObject });
    canvas.requestRenderAll();
    onUpdate?.();
    return;
  }
  if (key === "showMarker") {
    selectedObject[key] = !!raw;
    setProps((p) => ({ ...p, [key]: !!raw }));
    canvas.fire("object:modified", { target: selectedObject });
    canvas.requestRenderAll();
    onUpdate?.();
    return;
  }
  let num = key === "mapZoom" ? Math.min(20, Math.max(1, parseInt(raw, 10))) : parseFloat(String(raw).replace(",", "."));
  if (Number.isNaN(num)) return;
  selectedObject[key] = num;
  setProps((p) => ({ ...p, [key]: num }));
  canvas.fire("object:modified", { target: selectedObject });
  canvas.requestRenderAll();
  onUpdate?.();
};

const refreshMapPreview = () => {
  if (!selectedObject || !canvas || selectedObject.customName !== "Carte (Map)") return;
  loadOsmMapIntoGroup(selectedObject, canvas);
  canvas.fire("object:modified", { target: selectedObject });
  canvas.requestRenderAll();
  onUpdate?.();
};

const handleCardImageUpload = (e) => {
  const file = e.target.files[0];
  if (!file || !selectedObject || !canvas || selectedObject.customName !== "Carte Produit") return;
  const imageSlot = selectedObject.getObjects()[1];
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = imageSlot.width; patternCanvas.height = imageSlot.height;
      const ctx = patternCanvas.getContext("2d");
      const scale = Math.max(imageSlot.width / img.width, imageSlot.height / img.height);
      ctx.drawImage(img, (imageSlot.width - img.width * scale) / 2, (imageSlot.height - img.height * scale) / 2, img.width * scale, img.height * scale);
      imageSlot.set("fill", new fabric.Pattern({ source: patternCanvas, repeat: "no-repeat" }));
      canvas.renderAll(); onUpdate?.();
      setProps(p => ({ ...p, cardImageName: file.name }));
    };
    if (typeof ev.target?.result === "string") img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

const handleProfileImageUpload = (e) => {
  const file = e.target.files[0];
  if (!file || !selectedObject || !canvas || selectedObject.customName !== "Profil Utilisateur") return;
  const avatarSlot = selectedObject.getObjects()[1];
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const size = avatarSlot.radius * 2;
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = size; patternCanvas.height = size;
      const ctx = patternCanvas.getContext("2d");
      ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.clip();
      const scale = Math.max(size / img.width, size / img.height);
      ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
      avatarSlot.set("fill", new fabric.Pattern({ source: patternCanvas, repeat: "no-repeat" }));
      canvas.renderAll(); onUpdate?.();
      setProps(p => ({ ...p, profileImageName: file.name }));
    };
    if (typeof ev.target?.result === "string") img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

const applyVideoSrc = (val) => {
  if (!selectedObject || !canvas || selectedObject.customName !== "Lecteur Vidéo") return;
  const nextSrc = normalizeVideoSrc(val);
  setProps(p => ({ ...p, videoSrc: nextSrc }));
  const sourceIssue = getVideoSourceIssue(nextSrc);
  if (sourceIssue) return;
  selectedObject.videoSrc = nextSrc;
  onUpdate?.();
  if (nextSrc) reviveVideos(canvas);
  else canvas.renderAll();
};

const handleVideoUpload = (e) => {
  const file = e.target.files[0];
  if (!file || !selectedObject || !canvas || selectedObject.customName !== "Lecteur Vidéo") return;
  const targetVideoObject = selectedObject;
  const assetId = targetVideoObject.videoAssetId || createLocalVideoAssetId();
  saveLocalVideoAsset(assetId, file)
    .then(() => {
      const localSource = makeLocalVideoSource(assetId);
      targetVideoObject.videoAssetId = assetId;
      targetVideoObject.videoSrc = localSource;
      setResolvedVideoSources((prev) => {
        const previousUrl = prev[localSource];
        if (previousUrl) {
          try { URL.revokeObjectURL(previousUrl); } catch {}
        }
        const objectUrl = URL.createObjectURL(file);
        localVideoUrlCacheRef.current[localSource] = objectUrl;
        return { ...prev, [localSource]: objectUrl };
      });
      setProps(p => ({ ...p, videoSrc: localSource }));
      onUpdate?.();
      reviveVideos(canvas);
      e.target.value = "";
    })
    .catch(() => {
      showToast("Impossible de sauvegarder cette vidéo locale dans le navigateur.", "error");
      e.target.value = "";
    });
};
// --- HELPERS DE MISE À JOUR VISUELLE (HEAD) ---

  if (!selectedObject) return (
    <div className="props-empty">
      <div className="props-empty-icon"><LayoutTemplate size={28} /></div>
      <p>Sélectionnez un élément pour modifier ses propriétés</p>
    </div>
  );

  const isText = ["i-text", "textbox"].includes(selectedObject.type);
  const isLine = selectedObject.type === "line";
  const isGroup = selectedObject.type === "group";
  const isInteractiveComponent = isGroup && selectedObject.customVariant && (["button", "slider", "modal", "input", "nav_menu", "hero", "tabs", "table", "profile", "pricing", "card"].includes(selectedObject.customVariant) || selectedObject.customVariant.startsWith("chart_"));

  const v = {
    left: props.left ?? 0, top: props.top ?? 0, width: props.width ?? 0, height: props.height ?? 0,
    angle: props.angle ?? 0, opacity: props.opacity ?? 100, fontSize: props.fontSize ?? 24,
    fontFamily: props.fontFamily ?? "Inter", fontWeight: props.fontWeight ?? "normal",
    fontStyle: props.fontStyle ?? "normal", textAlign: props.textAlign ?? "left",
    fill: (typeof props.fill === "string" && props.fill.startsWith("#")) ? props.fill : "#000000",
    stroke: (typeof props.stroke === "string" && props.stroke.startsWith("#")) ? props.stroke : "#000000",
    strokeWidth: props.strokeWidth ?? 0, rx: props.rx ?? 0,
    backgroundColor: props.backgroundColor ?? "",
    boxPaddingTop: props.boxPaddingTop ?? 0, boxPaddingRight: props.boxPaddingRight ?? 0,
    boxPaddingBottom: props.boxPaddingBottom ?? 0, boxPaddingLeft: props.boxPaddingLeft ?? 0,
    boxStroke: (typeof props.boxStroke === "string" && props.boxStroke.startsWith("#")) ? props.boxStroke : "#000000",
    boxStrokeWidth: props.boxStrokeWidth ?? 0,
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
    mapAddress: props.mapAddress ?? "",
    mapType: props.mapType ?? "m",
    showMarker: props.showMarker ?? true,
    pricingTitle: props.pricingTitle ?? "", pricingPrice: props.pricingPrice ?? "", pricingButton: props.pricingButton ?? "",
    videoSrc: props.videoSrc ?? "",
  };

  return (
    <>
      <div className="props-content fade-in">
        {isInteractiveComponent && (
          <section className="props-section">
            <button className="btn-edit-component" onClick={() => setShowComponentEditor(true)}>
              <Edit2 size={14} /> Modifier le composant
            </button>
          </section>
        )}

        {isGroup && (
          <section className="props-section">
            <button className="btn-edit-component" onClick={handleUngroup} style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', marginTop: isInteractiveComponent ? '10px' : '0' }}>
              <Unlock size={14} /> Dégrouper les éléments
            </button>
          </section>
        )}

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
          <h4 className="props-section-title">Carte Interactive</h4>
          <div className="props-grid-1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PropField label="Rechercher lieu/adresse" value={v.mapAddress} onChange={val => applyMapField("mapAddress", val)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <PropField label="Latitude" type="number" value={v.mapLat} onChange={val => applyMapField("mapLat", val)} />
              <PropField label="Longitude" type="number" value={v.mapLng} onChange={val => applyMapField("mapLng", val)} />
            </div>
            <PropField label="Zoom (1â€“20)" type="number" value={v.mapZoom} onChange={val => applyMapField("mapZoom", val)} min="1" max="20" />
            
            <div className="props-row" style={{ marginTop: 4, marginBottom: 0 }}>
              <label className="props-label">Vue par défaut</label>
              <select value={v.mapType || "m"} onChange={e => applyMapField("mapType", e.target.value)} className="props-select" style={{ width: 120 }}>
                <option value="m">Plan</option>
                <option value="k">Satellite</option>
              </select>
            </div>
            
            <div className="props-row" style={{ marginTop: 0, marginBottom: 0 }}>
              <label className="props-label" style={{ fontSize: 11 }}>Afficher le marqueur</label>
              <input type="checkbox" checked={v.showMarker ?? true} onChange={e => applyMapField("showMarker", e.target.checked)} className="custom-checkbox" />
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, margin: 0, marginTop: 4 }}>
               Cliquez une fois sur la carte pour la sélectionner, puis interagissez avec pour vous déplacer ou zoomer.
            </p>
          </div>
        </section>
      )}

      {isVideoObject(selectedObject) && (
        <section className="props-section">
          <h4 className="props-section-title">Vidéo</h4>
          <PropField label="Lien vidéo (YouTube, MP4, WebM)" value={v.videoSrc && !v.videoSrc.startsWith("blob:") && !v.videoSrc.startsWith("data:video/") && !v.videoSrc.startsWith("localvideo:") ? v.videoSrc : ""} onChange={val => applyVideoSrc(val)} />
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "8px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", fontWeight: "600" }}>
              Tester une vidéo locale
              <input type="file" accept="video/mp4,video/webm" style={{ display: "none" }} onChange={handleVideoUpload} />
            </label>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", lineHeight: "1.35" }}>
              Cliquez une fois sur le bloc vidéo pour le sélectionner, puis utilisez les contrôles lecture, pause et volume.
            </div>
            {getVideoSourceIssue(v.videoSrc) && !v.videoSrc.startsWith("blob:") && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#b45309", lineHeight: "1.35" }}>
                {getVideoSourceIssue(v.videoSrc)}
              </div>
            )}
            {v.videoSrc && v.videoSrc.startsWith("localvideo:") && <div style={{ marginTop: 8, fontSize: 11, color: "#0f766e", lineHeight: "1.2" }}>Vidéo locale enregistrée dans ce navigateur.<br />(Elle reste disponible après actualisation de la page.)</div>}
          </div>
        </section>
      )}

      {isText && (
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
            <div className="props-row"><label className="props-label">Couleur du texte</label><div className="color-row"><input type="color" value={v.fill} onChange={e => apply("fill", e.target.value)} className="props-color" /><span className="color-hex">{v.fill}</span></div></div>
            <div className="props-row"><label className="props-label">Contour texte</label><div className="color-row"><input type="color" value={v.stroke} onChange={e => apply("stroke", e.target.value)} className="props-color" /><input type="number" value={v.strokeWidth} min="0" max="10" onChange={e => apply("strokeWidth", +e.target.value)} className="props-input-sm" /></div></div>
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
                <div className="props-row"><label className="props-label">Bordure</label><div className="color-row"><input type="color" value={v.boxStroke} onChange={e => apply("boxStroke", e.target.value)} className="props-color" /><input type="number" value={v.boxStrokeWidth} min="0" max="50" onChange={e => apply("boxStrokeWidth", +e.target.value)} className="props-input-sm" /></div></div>
                <div className="props-row"><label className="props-label">Arrondi</label><input type="number" value={v.rx} min="0" max="200" onChange={e => { apply("rx", +e.target.value); apply("ry", +e.target.value); }} className="props-input-sm" /></div>
              </div>
            )}
          </section>
        )}

        {!isGroup && !isText && (
          <section className="props-section">
            <h4 className="props-section-title">Apparence</h4>
            {!isLine && <div className="props-row"><label className="props-label">Remplissage</label><div className="color-row"><input type="color" value={v.fill} onChange={e => apply("fill", e.target.value)} className="props-color" /><span className="color-hex">{v.fill}</span></div></div>}
            <div className="props-row"><label className="props-label">Contour</label><div className="color-row"><input type="color" value={v.stroke} onChange={e => apply("stroke", e.target.value)} className="props-color" /><input type="number" value={v.strokeWidth} min="0" max="50" onChange={e => apply("strokeWidth", +e.target.value)} className="props-input-sm" /></div></div>
            {selectedObject.type === "rect" && <div className="props-row"><label className="props-label">Arrondi</label><input type="number" value={v.rx} min="0" max="200" onChange={e => { apply("rx", +e.target.value); apply("ry", +e.target.value); }} className="props-input-sm" /></div>}
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

        {selectedObject.type === "image" && (
          <>
            <section className="props-section fade-in">
              <h4 className="props-section-title">Forme de l'image</h4>
              <div className="btn-group" style={{ marginBottom: "16px" }}>
                <button className={`props-toggle ${props.imageShape === "rect" || !props.imageShape ? "active" : ""}`} onClick={() => applyImageShape("rect")}>Carré</button>
                <button className={`props-toggle ${props.imageShape === "rounded" ? "active" : ""}`} onClick={() => applyImageShape("rounded")}>Arrondi</button>
                <button className={`props-toggle ${props.imageShape === "circle" ? "active" : ""}`} onClick={() => applyImageShape("circle")}>Cercle</button>
                <button className={`props-toggle ${props.imageShape === "triangle" ? "active" : ""}`} onClick={() => applyImageShape("triangle")}>Triangle</button>
              </div>
            </section>

            <section className="props-section fade-in">
              <h4 className="props-section-title">Historique des images</h4>
              <ImageHistoryPanel
                imageHistory={imageHistory}
                onReplaceImage={onReplaceImage}
                onSelectImage={onSelectImageFromHistory}
                canvas={canvas}
              />
            </section>
          </>
        )}
      </div>

    </>
  );
};

const PropField = (props) => {
  const { label, value, onChange, type = "text", min = undefined, max = undefined } = props;
  return (
    <div className="prop-field">
      <span className="prop-field-label">{label}</span>
      <input className="prop-field-input" type={type} value={value ?? ""} min={min} max={max} onChange={e => onChange(e.target.value)} />
    </div>
  );
};

// â”€â”€â”€ LAYERS PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ MAIN COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FABRIC_CUSTOM_PROPS = [
  "excludeFromExport", "isPlaceholder", "placeholderLabel", "customName", 
  "boxPaddingTop", "boxPaddingRight", "boxPaddingBottom", "boxPaddingLeft", 
  "boxStroke", "boxStrokeWidth", "rx", "ry", "componentData", "customVariant", 
  "imageHistoryId", "videoSrc", "videoAssetId", "mapLat", "mapLng", "mapZoom",
  "editable", "customType", "templateType"
];

const customFabricReviver = (o, object) => {
  FABRIC_CUSTOM_PROPS.forEach(key => {
    if (o[key] !== undefined) object[key] = o[key];
  });
};

const DesignEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const canvasHostRef = useRef(null);
  const canvasRef = useRef(null);
  const gridLinesRef = useRef([]);
  const videoOverlayRafRef = useRef(null);
  const videoOverlaySignatureRef = useRef("");
  const mapOverlayRafRef = useRef(null);
  const mapOverlaySignatureRef = useRef("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (user?.["role"] || user?.["rôle"] || "").toLowerCase();
  const isDesigner = userRole === "designer";
  const isClient = userRole === "client";

  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [designData, setDesignData] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Chargement...");
  const [selectedObj, setSelectedObj] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState([]); // Multiple selection
  const [showComponentEditor, setShowComponentEditor] = useState(false);
  const [editorVariant, setEditorVariant] = useState(null);
  const [editorData, setEditorData] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
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
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationDone, setValidationDone] = useState(null);
  
  // Text formatting toolbar state
  const [textToolbarVisible, setTextToolbarVisible] = useState(false);
  const [textToolbarPosition, setTextToolbarPosition] = useState({ x: 0, y: 0 });
  
  // Professional features state
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [showCorrections, setShowCorrections] = useState(false);
  const [rejetModal, setRejetModal] = useState(false);
  const [rejetElements, setRejetElements] = useState([]);
  const [rejetGeneralComment, setRejetGeneralComment] = useState("");
  const [rejetPage, setRejetPage] = useState(1);
  const [rejetSubmitting, setRejetSubmitting] = useState(false);

  // FIX: Use a ref for clipboard to avoid stale closure in keyboard handler
  const clipboardRef = useRef(null);

  // Tool pickers state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Image history state
  const [imageHistory, setImageHistory] = useState([]);
  // FIX: Map from imageId -> fabricCanvas image object reference
  const imageObjMapRef = useRef({});



  // Tools & Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Collapsed by default
  const [activeDrawingTool, setActiveDrawingTool] = useState(null); // 'pen', 'marker', 'highlighter', 'eraser'\n  const [activeBottomTool, setActiveBottomTool] = useState(null); // 'pen', 'marker', 'highlighter', 'eraser'
  const [drawingColor, setDrawingColor] = useState("#ef4444");
  const [drawingWidth, setDrawingWidth] = useState(3);
  const [videoOverlayItems, setVideoOverlayItems] = useState([]);
  const [mapOverlayItems, setMapOverlayItems] = useState([]);
  const [resolvedVideoSources, setResolvedVideoSources] = useState({});
  const [selectedVideoUi, setSelectedVideoUi] = useState({ playing: true, muted: true, volume: 100 });

  const dropdownRef = useRef(null);
  const maquetteIdRef = useRef(null);
  const currentVersionIdRef = useRef(null);
  const isSwitchingVersion = useRef(false);
  const fabricCanvasRef = useRef(null);
  const htmlVideoRefs = useRef({});
  const localVideoUrlCacheRef = useRef({});

  const showToast = (message, type = "success") => setToast({ message, type });
  const showModal = (title, content) => setActiveModal({ title, content });
  const activeCanvasObject = fabricCanvas?.getActiveObject?.() || null;
  const selectVideoObject = useCallback((targetObject) => {
    if (!fabricCanvas || !targetObject) return;
    setSelectedObj(targetObject);
    setSelectedVideoUi((prev) => ({
      playing: true,
      muted: false,
      volume: prev.volume > 0 ? prev.volume : 100
    }));
    fabricCanvas.discardActiveObject();
    fabricCanvas.setActiveObject(targetObject);
    fabricCanvas.fire("selection:updated", {
      selected: [targetObject],
      deselected: [],
      target: targetObject
    });
    fabricCanvas.requestRenderAll();
    const overlayItem = videoOverlayItems.find((item) => item.objectRef === targetObject);
    if (overlayItem) {
      requestAnimationFrame(() => {
        const htmlVideo = htmlVideoRefs.current[overlayItem.key];
        if (!htmlVideo) return;
        htmlVideo.muted = false;
        if (!htmlVideo.volume || htmlVideo.volume <= 0) htmlVideo.volume = 1;
        htmlVideo.play().catch(() => {});
        setSelectedVideoUi({
          playing: !htmlVideo.paused,
          muted: htmlVideo.muted,
          volume: Math.round((htmlVideo.volume ?? 1) * 100)
        });
      });
    }
  }, [fabricCanvas, videoOverlayItems]);
  const effectiveSelectedObject = activeCanvasObject || selectedObj;
  const selectedVideoOverlayItem = videoOverlayItems.find((item) => item.objectRef === effectiveSelectedObject) || null;
  const selectedHtmlVideo = selectedVideoOverlayItem ? htmlVideoRefs.current[selectedVideoOverlayItem.key] : null;
  const syncSelectedVideoUi = useCallback(() => {
    if (!selectedHtmlVideo) return;
    setSelectedVideoUi({
      playing: !selectedHtmlVideo.paused,
      muted: selectedHtmlVideo.muted,
      volume: Math.round((selectedHtmlVideo.volume ?? 1) * 100)
    });
  }, [selectedHtmlVideo]);
  const toggleSelectedVideoPlayback = useCallback(() => {
    if (!selectedHtmlVideo) return;
    if (selectedHtmlVideo.paused) selectedHtmlVideo.play().catch(() => {});
    else selectedHtmlVideo.pause();
    syncSelectedVideoUi();
  }, [selectedHtmlVideo, syncSelectedVideoUi]);
  const toggleSelectedVideoMute = useCallback(() => {
    if (!selectedHtmlVideo) return;
    selectedHtmlVideo.muted = !selectedHtmlVideo.muted;
    syncSelectedVideoUi();
  }, [selectedHtmlVideo, syncSelectedVideoUi]);
  const setSelectedVideoVolume = useCallback((nextVolume) => {
    if (!selectedHtmlVideo) return;
    const normalized = Math.max(0, Math.min(1, Number(nextVolume) / 100));
    selectedHtmlVideo.volume = normalized;
    selectedHtmlVideo.muted = normalized === 0;
    syncSelectedVideoUi();
  }, [selectedHtmlVideo, syncSelectedVideoUi]);

  // Keep fabricCanvasRef in sync
  useEffect(() => { fabricCanvasRef.current = fabricCanvas; }, [fabricCanvas]);

  const buildVideoOverlayItems = useCallback(() => {
    if (!fabricCanvas) return [];

    const activeObject = fabricCanvas.getActiveObject?.() || null;
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoomX = Math.abs(vpt[0] || 1);
    const zoomY = Math.abs(vpt[3] || 1);
    const canvasWidth = fabricCanvas.getWidth?.() || 1000;
    const canvasHeight = fabricCanvas.getHeight?.() || 700;

    return fabricCanvas.getObjects().flatMap((obj, index) => {
      const source = typeof obj.videoSrc === "string" ? obj.videoSrc.trim() : "";
      if (obj.customName !== "Lecteur Vidéo" || !source || obj.visible === false) return [];

      const sourceKind = getVideoSourceKind(source);
      if (sourceKind === "empty" || sourceKind === "unsupported") return [];

      const centerScene = typeof obj.getCenterPoint === "function"
        ? obj.getCenterPoint()
        : new fabric.Point(obj.left || 0, obj.top || 0);
      const centerViewport = centerScene.transform(vpt);
      const sceneWidth = typeof obj.getScaledWidth === "function"
        ? obj.getScaledWidth()
        : (obj.width || 320) * (obj.scaleX || 1);
      const sceneHeight = typeof obj.getScaledHeight === "function"
        ? obj.getScaledHeight()
        : (obj.height || 180) * (obj.scaleY || 1);

      const width = Math.max(1, sceneWidth * zoomX);
      const height = Math.max(1, sceneHeight * zoomY);
      const left = centerViewport.x - width / 2;
      const top = centerViewport.y - height / 2;

      if (left > canvasWidth || top > canvasHeight || left + width < 0 || top + height < 0) {
        return [];
      }

      return [{
        key: obj.__uid ? `video-${obj.__uid}` : `video-${index}-${source}`,
        objectRef: obj,
        source,
        sourceKind,
        embedSrc: sourceKind === "youtube" ? getYouTubeEmbedUrl(source) : "",
        resolvedSrc: sourceKind === "direct"
          ? (resolvedVideoSources[source] || (getLocalVideoAssetId(source) ? "" : source))
          : "",
        left,
        top,
        width,
        height,
        angle: obj.angle || 0,
        opacity: obj.opacity ?? 1,
        isSelected: obj === activeObject || obj === selectedObj,
        zIndex: index + 1
      }];
    });
  }, [fabricCanvas, selectedObj, resolvedVideoSources]);

  useEffect(() => {
    if (!fabricCanvas) {
      videoOverlaySignatureRef.current = "";
      setVideoOverlayItems([]);
      return;
    }

    const updateOverlays = () => {
      const nextItems = buildVideoOverlayItems();
      const nextSignature = JSON.stringify(
        nextItems.map((item) => ({
          key: item.key,
          source: item.source,
          sourceKind: item.sourceKind,
          left: Math.round(item.left * 10) / 10,
          top: Math.round(item.top * 10) / 10,
          width: Math.round(item.width * 10) / 10,
          height: Math.round(item.height * 10) / 10,
          angle: Math.round(item.angle * 10) / 10,
          opacity: Math.round(item.opacity * 100) / 100,
          isSelected: item.isSelected
        }))
      );

      if (nextSignature !== videoOverlaySignatureRef.current) {
        videoOverlaySignatureRef.current = nextSignature;
        setVideoOverlayItems(nextItems);
      }
    };

    const scheduleOverlayUpdate = () => {
      if (videoOverlayRafRef.current) cancelAnimationFrame(videoOverlayRafRef.current);
      videoOverlayRafRef.current = requestAnimationFrame(() => {
        videoOverlayRafRef.current = null;
        updateOverlays();
      });
    };

    const canvasEvents = [
      "after:render",
      "object:added",
      "object:removed",
      "object:modified",
      "selection:created",
      "selection:updated",
      "selection:cleared"
    ];

    scheduleOverlayUpdate();
    canvasEvents.forEach((eventName) => fabricCanvas.on(eventName, scheduleOverlayUpdate));
    window.addEventListener("resize", scheduleOverlayUpdate);

    return () => {
      if (videoOverlayRafRef.current) {
        cancelAnimationFrame(videoOverlayRafRef.current);
        videoOverlayRafRef.current = null;
      }
      canvasEvents.forEach((eventName) => fabricCanvas.off(eventName, scheduleOverlayUpdate));
      window.removeEventListener("resize", scheduleOverlayUpdate);
    };
  }, [fabricCanvas, buildVideoOverlayItems]);

  const buildMapOverlayItems = useCallback(() => {
    if (!fabricCanvas) return [];

    const activeObject = fabricCanvas.getActiveObject?.() || null;
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoomX = Math.abs(vpt[0] || 1);
    const zoomY = Math.abs(vpt[3] || 1);
    const canvasWidth = fabricCanvas.getWidth?.() || 1000;
    const canvasHeight = fabricCanvas.getHeight?.() || 700;

    return fabricCanvas.getObjects().flatMap((obj, index) => {
      if (obj.customName !== "Carte (Map)" || obj.visible === false) return [];

      const centerScene = typeof obj.getCenterPoint === "function"
        ? obj.getCenterPoint()
        : new fabric.Point(obj.left || 0, obj.top || 0);
      const centerViewport = centerScene.transform(vpt);
      const sceneWidth = typeof obj.getScaledWidth === "function"
        ? obj.getScaledWidth()
        : (obj.width || 320) * (obj.scaleX || 1);
      const sceneHeight = typeof obj.getScaledHeight === "function"
        ? obj.getScaledHeight()
        : (obj.height || 180) * (obj.scaleY || 1);

      const width = Math.max(1, sceneWidth * zoomX);
      const height = Math.max(1, sceneHeight * zoomY);
      const left = centerViewport.x - width / 2;
      const top = centerViewport.y - height / 2;

      if (left > canvasWidth || top > canvasHeight || left + width < 0 || top + height < 0) {
        return [];
      }

      const lat = obj.mapLat ?? obj.componentData?.mapLat ?? DEFAULT_MAP_LAT;
      const lng = obj.mapLng ?? obj.componentData?.mapLng ?? DEFAULT_MAP_LNG;
      const zoom = Math.min(20, Math.max(1, Number(obj.mapZoom ?? obj.componentData?.mapZoom) || DEFAULT_MAP_ZOOM));
      const mapAddress = obj.mapAddress ?? obj.componentData?.mapAddress ?? "";
      const mapType = obj.mapType ?? obj.componentData?.mapType ?? "m";
      const showMarker = obj.showMarker ?? obj.componentData?.showMarker ?? true;

      const queryParams = [];
      if (mapAddress) {
        queryParams.push(`q=${encodeURIComponent(mapAddress)}`);
      } else {
        if (showMarker) {
          queryParams.push(`q=${lat},${lng}`);
        } else {
          queryParams.push(`loc:${lat}+${lng}`);
        }
      }
      
      const queryStr = queryParams.length > 0 ? queryParams.join("&") : `q=${lat},${lng}`;
      const iframeSrc = `https://maps.google.com/maps?${queryStr}&t=${mapType}&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

      return [{
        key: obj.__uid ? `map-${obj.__uid}` : `map-${index}`,
        objectRef: obj,
        iframeSrc,
        left,
        top,
        width,
        height,
        angle: obj.angle || 0,
        opacity: obj.opacity ?? 1,
        isSelected: obj === activeObject || obj === selectedObj,
        zIndex: index + 1
      }];
    });
  }, [fabricCanvas, selectedObj]);

  useEffect(() => {
    if (!fabricCanvas) {
      mapOverlaySignatureRef.current = "";
      setMapOverlayItems([]);
      return;
    }

    const updateOverlays = () => {
      const nextItems = buildMapOverlayItems();
      const nextSignature = JSON.stringify(
        nextItems.map((item) => ({
          key: item.key,
          iframeSrc: item.iframeSrc,
          left: Math.round(item.left * 10) / 10,
          top: Math.round(item.top * 10) / 10,
          width: Math.round(item.width * 10) / 10,
          height: Math.round(item.height * 10) / 10,
          angle: Math.round(item.angle * 10) / 10,
          opacity: Math.round(item.opacity * 100) / 100,
          isSelected: item.isSelected
        }))
      );

      if (nextSignature !== mapOverlaySignatureRef.current) {
        mapOverlaySignatureRef.current = nextSignature;
        setMapOverlayItems(nextItems);
      }
    };

    const scheduleOverlayUpdate = () => {
      if (mapOverlayRafRef.current) cancelAnimationFrame(mapOverlayRafRef.current);
      mapOverlayRafRef.current = requestAnimationFrame(() => {
        mapOverlayRafRef.current = null;
        updateOverlays();
      });
    };

    const canvasEvents = [
      "after:render", "object:added", "object:removed", "object:modified",
      "selection:created", "selection:updated", "selection:cleared"
    ];

    scheduleOverlayUpdate();
    canvasEvents.forEach((eventName) => fabricCanvas.on(eventName, scheduleOverlayUpdate));
    window.addEventListener("resize", scheduleOverlayUpdate);

    return () => {
      if (mapOverlayRafRef.current) {
        cancelAnimationFrame(mapOverlayRafRef.current);
        mapOverlayRafRef.current = null;
      }
      canvasEvents.forEach((eventName) => fabricCanvas.off(eventName, scheduleOverlayUpdate));
      window.removeEventListener("resize", scheduleOverlayUpdate);
    };
  }, [fabricCanvas, buildMapOverlayItems]);

  useEffect(() => {
    const localSources = [...new Set(
      videoOverlayItems
        .map((item) => item.source)
        .filter((source) => !!getLocalVideoAssetId(source))
    )];

    if (localSources.length === 0) {
      setResolvedVideoSources((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (getLocalVideoAssetId(key)) delete next[key];
        });
        return next;
      });
      return;
    }

    let isCancelled = false;
    Promise.all(localSources.map(async (source) => {
      const assetId = getLocalVideoAssetId(source);
      if (!assetId) return [source, ""];
      if (localVideoUrlCacheRef.current[source]) return [source, localVideoUrlCacheRef.current[source]];
      try {
        const file = await loadLocalVideoAsset(assetId);
        if (!file) return [source, ""];
        const objectUrl = URL.createObjectURL(file);
        localVideoUrlCacheRef.current[source] = objectUrl;
        return [source, objectUrl];
      } catch {
        return [source, ""];
      }
    })).then((entries) => {
      if (isCancelled) return;
      setResolvedVideoSources((prev) => {
        const next = { ...prev };
        entries.forEach(([source, resolved]) => {
          next[source] = resolved;
        });
        return next;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [videoOverlayItems]);

  useEffect(() => {
    return () => {
      Object.values(localVideoUrlCacheRef.current).forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      localVideoUrlCacheRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!selectedObj || selectedObj.customName !== "Lecteur Vidéo") return;
    const selectedOverlay = videoOverlayItems.find((item) => item.objectRef === selectedObj);
    if (!selectedOverlay || selectedOverlay.sourceKind !== "direct") return;
    const htmlVideo = htmlVideoRefs.current[selectedOverlay.key];
    if (!htmlVideo) return;
    setSelectedVideoUi({
      playing: !htmlVideo.paused,
      muted: htmlVideo.muted,
      volume: Math.round((htmlVideo.volume ?? 1) * 100)
    });
  }, [selectedObj, videoOverlayItems]);

  useEffect(() => {
    if (!selectedHtmlVideo) return;
    selectedHtmlVideo.muted = selectedVideoUi.muted;
    selectedHtmlVideo.volume = Math.max(0, Math.min(1, selectedVideoUi.volume / 100));
  }, [selectedHtmlVideo, selectedVideoUi]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const lockCanvasObjects = useCallback((canvas) => {
    canvas.selection = false; canvas.skipTargetFind = true;
    canvas.forEachObject(obj => {
      obj.selectable = false; obj.evented = false; obj.hasControls = false;
      obj.hasBorders = false; obj.lockMovementX = true; obj.lockMovementY = true;
      obj.lockRotation = true; obj.lockScalingX = true; obj.lockScalingY = true;
    });
    canvas.renderAll();
  }, []);

  // Custom textbox background rendering
  useEffect(() => {
    if (fabric.Textbox && !fabric.Textbox.prototype.__customRenderBgSet) {
      fabric.Textbox.prototype._renderBackground = function (ctx) {
        if (!this.backgroundColor && !this.boxStroke) return;
        const pTop = this.boxPaddingTop || 0, pRight = this.boxPaddingRight || 0, pBottom = this.boxPaddingBottom || 0, pLeft = this.boxPaddingLeft || 0;
        const w = this.width + pLeft + pRight, h = this.height + pTop + pBottom;
        const x = -this.width / 2 - pLeft, y = -this.height / 2 - pTop, rx = this.rx || 0, ry = this.ry || 0;
        ctx.beginPath();
        ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
        ctx.lineTo(x + w, y + h - ry); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
        ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ry);
        ctx.lineTo(x, y + ry); ctx.quadraticCurveTo(x, y, x + rx, y); ctx.closePath();
        if (this.backgroundColor) { ctx.fillStyle = this.backgroundColor; ctx.fill(); }
        if (this.boxStroke && this.boxStrokeWidth) { ctx.strokeStyle = this.boxStroke; ctx.lineWidth = this.boxStrokeWidth; ctx.stroke(); }
      };
      fabric.Textbox.prototype.__customRenderBgSet = true;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const savedVersionId = localStorage.getItem(`lastVersion_${id}`);
        const versionReq = savedVersionId 
          ? API.get(`/versions/${savedVersionId}`).catch(() => API.get(`/maquettes/${id}/latest-version`))
          : API.get(`/maquettes/${id}/latest-version`);

        const [resMaquette, resVersion] = await Promise.all([API.get(`/maquettes/${id}`), versionReq]);
        if (isMounted) {
          const vData = resVersion.data.version || resVersion.data;
          setDesignData({ maquette: resMaquette.data, version: vData });
          setCurrentVersionNum(getVersionNumberValue(vData));
          maquetteIdRef.current = resMaquette.data._id;
          currentVersionIdRef.current = vData._id;
          localStorage.setItem(`lastVersion_${id}`, vData._id);
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
      const filtered = Array.isArray(data) ? data.filter(c => c.version_id?._id === versionId) : [];
      setCorrections(filtered);
    } catch (_) { }
  }, [id, isDesigner]);

  useEffect(() => {
    if (!isDesigner || !id) return;
    if (currentVersionIdRef.current) fetchCorrectionsForVersion(currentVersionIdRef.current);
  }, [id, isDesigner, fetchCorrectionsForVersion]);

  const markCorrectionAsRead = useCallback(async (correctionId) => {
    if (!correctionId) return;
    try {
      if (API?.patch) {
        await API.patch(`/validations/corrections/${correctionId}/read`);
      } else if (API?.put) {
        await API.put(`/validations/corrections/${correctionId}/read`);
      }
    } catch (_) {
      // Fallback local si l'endpoint n'existe pas encore côté backend
    } finally {
      setCorrections((prev) => prev.filter((c) => c._id !== correctionId));
    }
  }, []);

  const fetchVersions = async () => {
    if (!maquetteIdRef.current) return;
    try { const { data } = await API.get(`/versions/maquette/${maquetteIdRef.current}`); setVersions(data); }
    catch (err) { console.error("Erreur chargement versions", err); }
  };

  // Interactive component handlers
  const handleButtonClick = useCallback((group, componentData) => {
    if (componentData.actionType === "modal") {
      showModal(componentData.buttonText || "Notification", `${componentData.buttonText || "Bouton"} cliqué avec succès !`);
    } else {
      showToast(`${componentData.buttonText || "Bouton"} cliqué !`, "success");
    }
  }, []);

  const handleModalOpen = useCallback((group, componentData) => {
    showModal(componentData.modalTitle || "Fenêtre modale", componentData.modalContent || "Contenu de la fenêtre modale.");
  }, []);

  const updateSliderFromEvent = useCallback((e, group) => {
    const pointer = getCanvasPointer(group.canvas, e);
    if (!pointer) return;
    const groupLeft = group.left;
    const minX = -75 + groupLeft, maxX = 75 + groupLeft;
    const valueX = Math.min(maxX, Math.max(minX, pointer.x));
    const pct = (valueX - minX) / (maxX - minX);
    const val = group.componentData.min + pct * (group.componentData.max - group.componentData.min);
    const rounded = Math.round(val);
    group.componentData.sliderValue = rounded;
    const pctNew = (rounded - group.componentData.min) / (group.componentData.max - group.componentData.min);
    const newX = -75 + pctNew * 150;
    const lineActive = group._objects?.[1];
    const handle = group._objects?.[2];
    const valueText = group._objects?.[3];
    if (lineActive) lineActive.set({ x2: newX });
    if (handle) handle.set({ left: newX });
    if (valueText) valueText.set({ text: `${rounded}${group.componentData.unit || ""}` });
    group.canvas?.renderAll();
  }, []);

  const restoreInteractivity = useCallback((obj) => {
    // Make ALL elements editable, not just ones with customVariant
    if (!obj) return;
    
    // Enable text editing for ALL text elements
    if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
      obj.on("mousedblclick", () => {
        if (fabricCanvas) {
          fabricCanvas.setActiveObject(obj);
          obj.enterEditing();
          obj.selectAll();
          fabricCanvas.renderAll();
        }
      });
    }
    
    // Enable color editing for all elements with fill
    obj.on("selected", () => {
      if (fabricCanvas && obj.fill) {
        // Update color picker when element is selected
        const colorInput = document.querySelector('input[type="color"]');
        if (colorInput instanceof HTMLInputElement && typeof obj.fill === 'string') {
          colorInput.value = obj.fill;
        }
      }
    });
    
    // Handle template pages
    if (obj.componentData && obj.componentData.templateType) {
      // Make template elements editable
      obj.on("mousedown", () => {
        if (fabricCanvas) {
          fabricCanvas.setActiveObject(obj);
          fabricCanvas.renderAll();
        }
      });
      return;
    }
    
    // Existing interactions for components
    if (obj.customVariant === "video" || obj.customName === "Lecteur Vidéo") {
      // Allow selecting video
      obj.on("mousedown", () => {
        if (fabricCanvas) {
          fabricCanvas.setActiveObject(obj);
          fabricCanvas.renderAll();
        }
      });
    } else if (obj.customVariant === "map" || obj.customName === "Carte (Map)") {
      // Allow selecting map
      obj.on("mousedown", () => {
        if (fabricCanvas) {
          fabricCanvas.setActiveObject(obj);
          fabricCanvas.renderAll();
        }
      });
    } else if (obj.customVariant === "button") {
      obj.on("mousedblclick", () => handleButtonClick(obj, obj.componentData));
    } else if (obj.customVariant === "checkbox") {
      obj.on("mousedblclick", () => {
        const newChecked = !obj.componentData.checked;
        obj.componentData.checked = newChecked;
        const t = obj._objects[0], ck = obj._objects[1];
        if (t) t.set({ fill: newChecked ? "#6366f1" : "#e2e8f0" });
        if (ck) ck.set({ visible: newChecked });
        obj.set("dirty", true);
        obj.canvas?.renderAll();
        showToast(`Checkbox ${newChecked ? "cochée" : "décochée"}`, "info");
      });
    } else if (obj.customVariant === "toggle") {
      obj.on("mousedblclick", () => {
        const on = !obj.componentData.toggled;
        obj.componentData.toggled = on;
        const tk = obj._objects[0], kn = obj._objects[1], lb = obj._objects[2];
        if (tk) tk.set({ fill: on ? "#10b981" : "#e2e8f0" });
        if (kn) kn.set({ left: on ? 12 : -12 });
        if (lb) lb.set({ text: on ? "ON " : "OFF", fill: on ? "#10b981" : "#64748b" });
        obj.set("dirty", true);
        obj.canvas?.renderAll();
        showToast(`Switch ${on ? "activé" : "désactivé"}`, "info");
      });
    } else if (obj.customVariant === "slider") {
      let isDragging = false;
      obj.on("mousedown", (e) => { isDragging = true; updateSliderFromEvent(e, obj); });
      obj.on("mouseup", () => { isDragging = false; });
      obj.on("mousemove", (e) => { if (isDragging) updateSliderFromEvent(e, obj); });
    } else if (obj.customVariant === "modal") {
      obj.on("mousedblclick", () => handleModalOpen(obj, obj.componentData));
    } else if (obj.customVariant && obj.customVariant.startsWith("chart_")) {
      // Handle chart components
      obj.on("mousedown", () => {
        if (fabricCanvas) {
          fabricCanvas.setActiveObject(obj);
          fabricCanvas.renderAll();
        }
      });
      
      // Make individual chart elements editable
      if (obj._objects) {
        obj._objects.forEach((chartObj) => {
          if (chartObj.type === "text" || chartObj.type === "i-text" || chartObj.type === "textbox") {
            chartObj.on("mousedblclick", () => {
              if (fabricCanvas) {
                fabricCanvas.discardActiveObject();
                fabricCanvas.setActiveObject(chartObj);
                chartObj.enterEditing();
                chartObj.selectAll();
                fabricCanvas.renderAll();
              }
            });
          }
        });
      }
    }
  }, [handleButtonClick, handleModalOpen, updateSliderFromEvent]);

  // Init canvas
  useEffect(() => {
    if (!designData?.maquette?._id || !canvasHostRef.current) return;
    setSaveStatus("Initialisationâ€¦");
    canvasHostRef.current.innerHTML = "";
    const el = document.createElement("canvas");
    canvasHostRef.current.appendChild(el);
    canvasRef.current = el;
    const canvas = new fabric.Canvas(el, { width: 1000, height: 700, backgroundColor: "#ffffff", preserveObjectStacking: true });
    setFabricCanvas(canvas);
    
    // Store reference to restoreInteractivity for reviveVideos to use
    window.restoreInteractivityRef = restoreInteractivity;

    const init = async () => {
      isSwitchingVersion.current = true;
      debouncedSave.cancel();
      try {
        if (designData.version?.contenu?.objects?.length) {
          // Prevent fabric crash when loading old blob URLs from local session history
          const safeContenuStr = JSON.stringify(designData.version.contenu)
            .replace(/"(?:blob|file):[^"]+"/g, '"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="');
          const safeContenu = JSON.parse(safeContenuStr);
          
          const loadRes = canvas.loadFromJSON(safeContenu, customFabricReviver);
          if (loadRes && typeof loadRes.then === "function") await loadRes;
          canvas.getObjects().forEach(restoreInteractivity);
          reviveVideos(canvas);
          reviveMaps(canvas);
        }
        
        // Ensure viewport is centered after loading or restore from save
        if (designData.version?.contenu?.viewportTransform) {
          canvas.setViewportTransform(designData.version.contenu.viewportTransform);
          setZoom(Math.round(canvas.getZoom() * 100));
        } else {
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          canvas.setZoom(1);
          setZoom(100);
        }
        
        canvas.renderAll();
        
        setSaveStatus("À jour");
        if (!isDesigner) lockCanvasObjects(canvas);
        if (currentVersionIdRef.current) await fetchCorrectionsForVersion(currentVersionIdRef.current);
      } catch { setSaveStatus("Erreur d'affichage"); }
      finally {
        setTimeout(() => { isSwitchingVersion.current = false; }, 300);
      }
    };
    init();
    return () => { canvas.dispose(); setFabricCanvas(null); };
  }, [designData?.maquette?._id, restoreInteractivity, isDesigner]);

  // Canvas event listeners
  useEffect(() => {
    if (!fabricCanvas) return;
    const updateSelection = (e) => { 
      const selected = e.selected?.[0] || fabricCanvas.getActiveObject();
      setSelectedObj(selected); 
      setLayersKey(k => k + 1);

      if (selected && selected.customVariant && selected.componentData) {
        setEditorVariant(selected.customVariant);
        setEditorData({ ...selected.componentData, variant: selected.customVariant });
      } else {
        setEditorVariant(null);
        setEditorData(null);
      }
      
      // Show/hide text toolbar based on selection
      if (selected) {
        showTextToolbar(selected);
      } else {
        hideTextToolbar();
      }
    };
    
    // Global text editing handler for all text objects
    const handleTextDoubleClick = (e) => {
      if (!fabricCanvas || !e.target) return;
      
      const target = e.target;
      
      // Check if the target is part of a chart component
      let chartGroup = null;
      if (target.group && target.group.customVariant && target.group.customVariant.startsWith("chart_")) {
        chartGroup = target.group;
      } else if (target.customVariant && target.customVariant.startsWith("chart_")) {
        chartGroup = target;
      }
      
      // If it's a chart component, open the chart editor
      if (chartGroup) {
        e.preventDefault();
        e.stopPropagation();
        
        setSelectedObj(chartGroup);
        setEditorVariant(chartGroup.customVariant);
        setEditorData(chartGroup.componentData || {});
        setShowComponentEditor(true);
        return;
      }
      
      // Check if it's a text object
      if (target.type === "text" || target.type === "i-text" || target.type === "textbox") {
        // Prevent default behavior
        e.preventDefault();
        e.stopPropagation();
        
        // Set as active object
        fabricCanvas.setActiveObject(target);
        
        // Enter editing mode
        target.enterEditing();
        target.selectAll();
        fabricCanvas.renderAll();
      }
    };
    
    fabricCanvas.on("selection:created", updateSelection);
    fabricCanvas.on("selection:updated", updateSelection);
    fabricCanvas.on("selection:cleared", () => {
      setSelectedObj(null);
      hideTextToolbar();
      setLayersKey(k => k + 1);
    });
    fabricCanvas.on("object:modified", () => setLayersKey(k => k + 1));
    fabricCanvas.on("object:added", () => setLayersKey(k => k + 1));
    fabricCanvas.on("object:removed", () => setLayersKey(k => k + 1));

    // Add global double-click handler for text editing
    fabricCanvas.on("mouse:dblclick", handleTextDoubleClick);

    fabricCanvas.on("object:moving", (e) => {
      if (!snapEnabled) return;
      e.target.set({ left: snapToGrid(e.target.left, GRID_SIZE), top: snapToGrid(e.target.top, GRID_SIZE) });
    });

    fabricCanvas.on("mouse:over", (e) => { if (e.target) fabricCanvas.setCursor("pointer"); });
    fabricCanvas.on("mouse:out", (e) => { if (e.target) fabricCanvas.setCursor("default"); });

    fabricCanvas.on("mouse:wheel", (opt) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
      if (isDesigner) {
        let z = fabricCanvas.getZoom();
        const delta = opt.e.deltaY || opt.e.detail || opt.e.wheelDelta;
        z = delta > 0 ? z * 0.95 : z * 1.05;
        z = Math.min(Math.max(ZOOM_MIN, z), ZOOM_MAX);
        fabricCanvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), z);
        setZoom(Math.round(z * 100));
      }
    });

    return () => {
      fabricCanvas.off("selection:created", updateSelection);
      fabricCanvas.off("selection:updated", updateSelection);
      fabricCanvas.off("selection:cleared");
      fabricCanvas.off("object:modified");
      fabricCanvas.off("object:added");
      fabricCanvas.off("object:removed");
      fabricCanvas.off("mouse:dblclick", handleTextDoubleClick);
      fabricCanvas.off("object:moving");
      fabricCanvas.off("mouse:over");
      fabricCanvas.off("mouse:out");
      fabricCanvas.off("mouse:wheel");
    };
  }, [fabricCanvas, snapEnabled, isDesigner]);

  // Drawing Mode Hook
  useEffect(() => {
    if (!fabricCanvas || !isDesigner) return;
    if (activeDrawingTool && activeDrawingTool !== "eraser") {
      fabricCanvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fabricCanvas);
      if (activeDrawingTool === "highlighter") {
        brush.color = drawingColor + "66"; // Translucent
        brush.width = Math.max(16, drawingWidth * 4); 
      } else if (activeDrawingTool === "marker") {
        brush.color = drawingColor;
        brush.width = Math.max(8, drawingWidth * 2);
      } else { // pen
        brush.color = drawingColor;
        brush.width = drawingWidth;
      }
      fabricCanvas.freeDrawingBrush = brush;
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  }, [fabricCanvas, activeDrawingTool, drawingColor, drawingWidth, isDesigner]);

  // Instant elements spawn (Outils)
  const spawnToolElement = (type) => {
    if (!fabricCanvas) return;
    const center = fabricCanvas.getVpCenter();
    
    if (type === "emoji") {
      setShowEmojiPicker(true);
    } else if (type === "sticker") {
      setShowStickerPicker(true);
    } else if (type === "table") {
      const cellW = 120, cellH = 50;
      const objs = [];
      for(let i=0; i<3; i++){
        for(let j=0; j<3; j++){
          const bg = new fabric.Rect({ left: j*cellW - (cellW*1.5), top: i*cellH - (cellH*1.5), width: cellW, height: cellH, fill: i===0?"#f1f5f9":"white", stroke: "#cbd5e1" });
          const txt = new fabric.IText(i===0?`En-tête ${j+1}`:`Valeur ${j+1}`, { left: j*cellW - (cellW*1.5) + 16, top: i*cellH - (cellH*1.5) + 16, fontSize: 14, fill: i===0?"#0f172a":"#475569", fontWeight: i===0?"bold":"normal", fontFamily: "Inter" });
          objs.push(bg, txt);
        }
      }
      const group = new fabric.Group(objs, { left: center.x, top: center.y, originX: "center", originY: "center", customVariant: "table", componentData: { rows: 3, cols: 3, tableData: [["En-tête 1", "En-tête 2", "En-tête 3"], ["Valeur A1", "Valeur B1", "Valeur C1"], ["Valeur A2", "Valeur B2", "Valeur C2"]], headerBg: "#f1f5f9", rowBg: "#ffffff", strokeColor: "#cbd5e1" } });
      restoreInteractivity(group);
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
      if (!isSidebarOpen) setOpenMenu("");
    } else if (type === "media_video") {
      // Lecteur Vidéo
      const bg = new fabric.Rect({ width: 320, height: 200, fill: "#0f172a", rx: 12, ry: 12, originX: "center", originY: "center" });
      const playCircle = new fabric.Circle({ radius: 30, fill: "rgba(255,255,255,0.2)", originX: "center", originY: "center" });
      const playBtn = new fabric.IText("â–¶", { fontSize: 22, fill: "#ffffff", fontFamily: "Inter", originX: "center", originY: "center" });
      const label = new fabric.IText("Vidéo", { fontSize: 12, fill: "#94a3b8", fontFamily: "Inter", originX: "center", originY: "center", top: 70 });
      
      const videoGroup = new fabric.Group([bg, playCircle, playBtn, label], { 
        left: x, 
        top: y, 
        originX: "center", 
        originY: "center",
        customName: "Lecteur Vidéo",
        customVariant: "video",
        componentData: { variant: "video" },
        videoSrc: "",
        videoAssetId: ""
      });
      restoreInteractivity(videoGroup);
      fabricCanvas.add(videoGroup);
      fabricCanvas.setActiveObject(videoGroup);
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
      if (!isSidebarOpen) setOpenMenu("");
    } else if (type === "media_map") {
      // Carte (Map)
      const bg = new fabric.Rect({ width: 400, height: 300, fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 2, rx: 8, ry: 8, originX: "center", originY: "center" });
      const mapPin = new fabric.Path("M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", {
        fill: "#ef4444",
        scaleX: 2,
        scaleY: 2,
        originX: "center",
        originY: "center"
      });
      const mapLabel = new fabric.IText("Localisation", { fontSize: 14, fill: "#475569", fontFamily: "Inter", originX: "center", originY: "center", top: 40 });
      
      const mapGroup = new fabric.Group([bg, mapPin, mapLabel], { 
        left: x, 
        top: y, 
        originX: "center", 
        originY: "center",
        customName: "Carte (Map)",
        customVariant: "map",
        componentData: { variant: "map" },
        mapLat: DEFAULT_MAP_LAT,
        mapLng: DEFAULT_MAP_LNG,
        mapZoom: DEFAULT_MAP_ZOOM,
        mapAddress: "",
        mapType: "m",
        showMarker: true
      });
      restoreInteractivity(mapGroup);
      fabricCanvas.add(mapGroup);
      fabricCanvas.setActiveObject(mapGroup);
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
      if (!isSidebarOpen) setOpenMenu("");
    } else if (type === "cont_frame") {
      // Frame / Section
      const frame = new fabric.Rect({ 
        width: 600, 
        height: 400, 
        fill: "transparent", 
        stroke: "#cbd5e1", 
        strokeWidth: 2, 
        strokeDashArray: [8, 4],
        rx: 8, 
        ry: 8, 
        originX: "center", 
        originY: "center" 
      });
      const frameLabel = new fabric.IText("Frame / Section", { 
        fontSize: 12, 
        fill: "#94a3b8", 
        fontFamily: "Inter", 
        originX: "center", 
        originY: "top",
        top: -200 - 20
      });
      
      const frameGroup = new fabric.Group([frame, frameLabel], { 
        left: center.x, 
        top: center.y, 
        originX: "center", 
        originY: "center",
        customVariant: "frame",
        componentData: { variant: "frame" }
      });
      restoreInteractivity(frameGroup);
      fabricCanvas.add(frameGroup);
      fabricCanvas.setActiveObject(frameGroup);
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
      if (!isSidebarOpen) setOpenMenu("");
    }
  };

  const spawnRealEmoji = (emoji) => {
    if (!fabricCanvas) return;
    const center = fabricCanvas.getVpCenter();
    const text = new fabric.IText(emoji, { left: center.x, top: center.y, originX: "center", originY: "center", fontSize: 64 });
    restoreInteractivity(text);
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
    if (!isSidebarOpen) setOpenMenu("");
  };

  const spawnRealSticker = (s) => {
    if (!fabricCanvas) return;
    const center = fabricCanvas.getVpCenter();
    const star = new fabric.Path(s.path, {
      left: center.x, top: center.y, originX: "center", originY: "center", fill: s.fill, scaleX: 80 / (s.width||100), scaleY: 80 / (s.height||100)
    });
    restoreInteractivity(star);
    fabricCanvas.add(star);
    fabricCanvas.setActiveObject(star);
    fabricCanvas.renderAll();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
    if (!isSidebarOpen) setOpenMenu("");
  };

  // Grid

  // â”€â”€â”€ AUTO-CONTINUATION LISTE À PUCES & NUMÉROTÉE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      if (previousLine.startsWith("â€¢ ")) prefix = "â€¢ ";
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

  // Auto-save
  const triggerSave = async (c, vId) => {
    if (isSwitchingVersion.current || !vId || !isDesigner) return;
    setSaveStatus("Sauvegarde...");
    try {
      const json = c.toJSON(FABRIC_CUSTOM_PROPS);
      
      // Prevent massive base64 media saving that crashes API/DB
      if (json.objects) {
        json.objects.forEach(obj => {
          if (obj.customName === "Lecteur Vidéo" && obj.type === "image" && obj.src && obj.src.startsWith("data:")) {
            obj.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
          }
          if ((obj.customName === "Carte (Map)" || obj.customVariant === "map") && obj.objects) {
            obj.objects.forEach(child => {
              if (child.type === "rect" && child.fill && typeof child.fill === "object" && child.fill.type === "pattern") {
                child.fill = "#dbeafe";
              }
            });
          }
        });
      }
      
      json.objects = (json.objects || []).filter(o => !o.excludeFromExport);
      json.viewportTransform = c.viewportTransform;
      await API.put(`/versions/${vId}`, { contenu: json });
      setSaveStatus("À jour");
    } catch { setSaveStatus("Erreur âŒ"); }
  };

  const debouncedSave = useRef(debounce((c, v) => triggerSave(c, v), 1000)).current;

  useEffect(() => {
    if (!fabricCanvas || !designData?.version?._id || !isDesigner) return;
    const vId = designData.version._id;
    const handleChange = () => { if (!isSwitchingVersion.current) debouncedSave(fabricCanvas, vId); };
    const handleRemove = () => { if (!isSwitchingVersion.current) debouncedSave(fabricCanvas, vId); };
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

  // Eraser Hook
  useEffect(() => {
    if (!fabricCanvas || !isDesigner) return;

    let isErasing = false;
    const handleDown = (e) => {
      if (activeDrawingTool === "eraser") {
        isErasing = true;
        if (e.target) {
          fabricCanvas.remove(e.target);
          fabricCanvas.renderAll();
          debouncedSave(fabricCanvas, currentVersionIdRef.current);
        }
      }
    };
    const handleMove = (e) => {
      if (activeDrawingTool === "eraser" && isErasing) {
        const pointer = getCanvasPointer(fabricCanvas, e);
        const objs = fabricCanvas.getObjects();
        const hit = objs.find(o => o.containsPoint(pointer));
        if (hit) {
          fabricCanvas.remove(hit);
          fabricCanvas.renderAll();
          debouncedSave(fabricCanvas, currentVersionIdRef.current);
        }
      }
    };
    const handleUp = () => { isErasing = false; };

    fabricCanvas.on('mouse:down', handleDown);
    fabricCanvas.on('mouse:move', handleMove);
    fabricCanvas.on('mouse:up', handleUp);

    return () => {
      fabricCanvas.off('mouse:down', handleDown);
      fabricCanvas.off('mouse:move', handleMove);
      fabricCanvas.off('mouse:up', handleUp);
    };
  }, [fabricCanvas, activeDrawingTool, isDesigner, debouncedSave]);

  // FIX: Keyboard shortcuts using refs to avoid stale closures
  useEffect(() => {
    const handler = (e) => {
      if (!isDesigner) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObjects = canvas.getActiveObjects() || [];
        if (activeObjects.length > 0) {
          // Si l'un des objets est en cours d'édition de texte (ex: Focus dans un Textbox), on ne supprime pas !
          if (activeObjects.some(obj => obj.isEditing)) return;

          activeObjects.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          setSelectedObj(null);
        }
      }

      // Copy (Ctrl+C / Cmd+C)
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        const obj = canvas.getActiveObject();
        if (obj && !obj.isEditing) {
          obj.clone(["customName", "customVariant", "componentData", "imageHistoryId"]).then((cloned) => {
            // Preserve custom properties explicitly to be safe
            if (obj.customName) cloned.customName = obj.customName;
            if (obj.customVariant) cloned.customVariant = obj.customVariant;
            if (obj.componentData) cloned.componentData = JSON.parse(JSON.stringify(obj.componentData));
            if (obj.imageHistoryId) cloned.imageHistoryId = obj.imageHistoryId;
            clipboardRef.current = cloned;
            showToast("Élément copié", "info");
          });
        }
        e.preventDefault();
      }

      // Paste (Ctrl+V / Cmd+V)
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        if (clipboardRef.current) {
          clipboardRef.current.clone(["customName", "customVariant", "componentData", "imageHistoryId"]).then((cloned) => {
            cloned.set({
              left: (clipboardRef.current.left || 0) + 30,
              top: (clipboardRef.current.top || 0) + 30,
              evented: true,
              selectable: true,
            });
            // Preserve custom properties on paste
            if (clipboardRef.current.customName) cloned.customName = clipboardRef.current.customName;
            if (clipboardRef.current.customVariant) cloned.customVariant = clipboardRef.current.customVariant;
            if (clipboardRef.current.componentData) cloned.componentData = JSON.parse(JSON.stringify(clipboardRef.current.componentData));
            if (clipboardRef.current.imageHistoryId) cloned.imageHistoryId = clipboardRef.current.imageHistoryId;
            if (cloned.customVariant) restoreInteractivity(cloned);
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
            showToast("Élément collé", "success");
          });
        }
        e.preventDefault();
      }

      // Duplicate (Ctrl+D / Cmd+D)
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        const obj = canvas.getActiveObject();
        if (!obj) return;
        obj.clone(["customName", "customVariant", "componentData", "imageHistoryId"]).then(clone => {
          clone.set({ left: obj.left + 20, top: obj.top + 20 });
          if (obj.customName) clone.customName = obj.customName;
          if (obj.customVariant) clone.customVariant = obj.customVariant;
          if (obj.componentData) clone.componentData = JSON.parse(JSON.stringify(obj.componentData));
          if (obj.imageHistoryId) clone.imageHistoryId = obj.imageHistoryId;
          if (clone.customVariant) restoreInteractivity(clone);
          canvas.add(clone);
          canvas.setActiveObject(clone);
          canvas.renderAll();
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDesigner, restoreInteractivity]);

  // Version management
  const handleNouvelleVersion = async () => {
    if (!fabricCanvas || !maquetteIdRef.current || creatingVersion || !isDesigner) return;
    setCreatingVersion(true);
    try {
      const json = fabricCanvas.toJSON(FABRIC_CUSTOM_PROPS);
      
      // Prevent massive base64 media saving that crashes API/DB
      if (json.objects) {
        json.objects.forEach(obj => {
          if (obj.customName === "Lecteur Vidéo" && obj.type === "image" && obj.src && obj.src.startsWith("data:")) {
            obj.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
          }
          if ((obj.customName === "Carte (Map)" || obj.customVariant === "map") && obj.objects) {
            obj.objects.forEach(child => {
              if (child.type === "rect" && child.fill && typeof child.fill === "object" && child.fill.type === "pattern") {
                child.fill = "#dbeafe";
              }
            });
          }
        });
      }
      
      const { data } = await API.post("/versions", { contenu: json, id_maquette: maquetteIdRef.current, commentaire: "Nouvelle version manuelle" });
      const newVersion = data.version;
      setCurrentVersionNum(getVersionNumberValue(newVersion));
      currentVersionIdRef.current = newVersion._id;
      setSaveStatus("À jour");
      setDesignData(prev => ({ ...prev, version: newVersion }));
      localStorage.setItem(`lastVersion_${maquetteIdRef.current}`, newVersion._id);
      setVersionSuccess(true);
      setTimeout(() => setVersionSuccess(false), 2000);
      await fetchVersions();
      showToast("Version créée avec succès !", "success");
    } catch { setSaveStatus("Erreur création version âŒ"); showToast("Erreur lors de la création", "error"); }
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
        // Prevent fabric crash when loading old blob URLs from local session history deeply nested in any property
        const safeContenuStr = JSON.stringify(contenu)
          .replace(/"(?:blob|file):[^"]+"/g, '"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="');
        const safeContenu = JSON.parse(safeContenuStr);
        
        const loadRes = fabricCanvas.loadFromJSON(safeContenu, customFabricReviver);
        if (loadRes && typeof loadRes.then === "function") await loadRes;
        
        fabricCanvas.getObjects().forEach(restoreInteractivity);
        reviveVideos(fabricCanvas);
        reviveMaps(fabricCanvas);
        
        if (contenu.viewportTransform) {
          fabricCanvas.setViewportTransform(contenu.viewportTransform);
          setZoom(Math.round(fabricCanvas.getZoom() * 100));
        } else {
          fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          fabricCanvas.setZoom(1);
          setZoom(100);
        }
        
        fabricCanvas.renderAll();
      } else {
        fabricCanvas.remove(...fabricCanvas.getObjects());
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        fabricCanvas.setZoom(1);
        setZoom(100);
        fabricCanvas.renderAll();
      }
      if (!isDesigner) lockCanvasObjects(fabricCanvas);
      setCurrentVersionNum(getVersionNumberValue(version));
      currentVersionIdRef.current = version._id;
      setDesignData(prev => ({ ...prev, version: { ...version, contenu } }));
      localStorage.setItem(`lastVersion_${maquetteIdRef.current}`, version._id);
      setSaveStatus("À jour");
      setValidationDone(null); setShowCorrections(false);
      await fetchCorrectionsForVersion(version._id);
      showToast(`Version ${getVersionNumberValue(version)} chargée`, "success");
    } catch (err) {
      console.error("Erreur chargement version", err);
      setSaveStatus("Erreur chargement version"); showToast("Erreur lors du chargement", "error");
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
      const originalContenu = designData.version.contenu;
      
      // Restaurer le contenu initial sur le backend
      if (originalContenu) {
        await API.put(`/versions/${designData.version._id}`, { contenu: originalContenu });
      } else {
        await API.put(`/versions/${designData.version._id}`, { contenu: { objects: [] } });
      }

      // Recharger correctement la version initiale
      await handleLoadVersion({ ...designData.version, contenu: originalContenu });
      
      setSaveStatus("À jour"); 
      showToast("Réinitialisation effectuée", "success");
    } catch (err) { 
      console.error(err);
      setSaveStatus("Erreur âŒ"); 
      showToast("Erreur lors de la réinitialisation", "error"); 
    }
    finally { setTimeout(() => { isSwitchingVersion.current = false; }, 300); }
  };

  const handleDeleteVersion = async (e, versionId) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer définitivement cette version ?")) return;
    setDeletingVersionId(versionId);
    try {
      await API.delete(`/versions/${versionId}`);
      await fetchVersions();
      if (versionId === currentVersionIdRef.current) {
        try {
          const { data: latestVersion } = await API.get(`/maquettes/${maquetteIdRef.current}/latest-version`);
          await handleLoadVersion(latestVersion);
        } catch (err) { console.error("Erreur chargement dernière version :", err); }
      }
      showToast("Version supprimée", "success");
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    } finally { setDeletingVersionId(null); }
  };

  const handleValider = async () => {
    if (!designData || validating || validationDone === "validé") return;
    const maquetteId = designData.maquette?._id;
    const versionId = currentVersionIdRef.current;
    const userId = user?.id || user?._id;
    if (!maquetteId || !versionId) return;
    if (!window.confirm(`Confirmer la validation de la version ${currentVersionNum} ?\n\nCette action est définitive.`)) return;
    setValidating(true);
    try {
      await API.post("/validations", { maquette_id: maquetteId, version_id: versionId, client_id: userId, statut: "validé" });
      setValidationDone("validé"); showToast(`Version ${currentVersionNum} validée !`, "success");
    } catch (err) {
      showToast("Erreur lors de la validation", "error");
    } finally { setValidating(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // â”€â”€ Image History Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const addImageToHistory = (src, name, width, height) => {
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry = { id, src, name, width, height };
    setImageHistory(prev => [entry, ...prev]);
    return id;
  };

  // FIX: Replace an image on canvas by its history ID
  const handleReplaceImage = useCallback((historyId, newSrc, newName) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const imgEl = new Image();
    imgEl.onload = () => {
      // Update history entry
      setImageHistory(prev => prev.map(entry =>
        entry.id === historyId
          ? { ...entry, src: newSrc, name: newName, width: imgEl.naturalWidth, height: imgEl.naturalHeight }
          : entry
      ));

      // Find the canvas object with this historyId
      const canvasObj = canvas.getObjects().find(o => o.imageHistoryId === historyId);
      if (canvasObj) {
        const oldScaleX = canvasObj.scaleX;
        const oldScaleY = canvasObj.scaleY;
        const oldLeft = canvasObj.left;
        const oldTop = canvasObj.top;
        const oldAngle = canvasObj.angle;

        // Replace element with new image
        fabric.Image.fromURL(newSrc).then((newImg) => {
          newImg.set({
            left: oldLeft,
            top: oldTop,
            scaleX: oldScaleX,
            scaleY: oldScaleY,
            angle: oldAngle,
          });
          newImg.imageHistoryId = historyId;
          newImg.customName = newName;
          restoreInteractivity(newImg);
          canvas.remove(canvasObj);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.renderAll();
          showToast("Image remplacée avec succès", "success");
        });
      } else {
        showToast("Image mise à jour dans l'historique", "info");
      }
    };
    imgEl.src = newSrc;
  }, []);

  // FIX: Select/highlight an image on canvas from history
  const handleSelectImageFromHistory = useCallback((historyId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const historyEntry = imageHistory.find(h => h.id === historyId);
    if (!historyEntry) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === "image") {
      // Replace the selected image with the chosen history image
      const oldScaleX = activeObj.scaleX;
      const oldScaleY = activeObj.scaleY;
      const oldLeft = activeObj.left;
      const oldTop = activeObj.top;
      const oldAngle = activeObj.angle;

      fabric.Image.fromURL(historyEntry.src).then((newImg) => {
        newImg.set({ left: oldLeft, top: oldTop, angle: oldAngle, scaleX: oldScaleX, scaleY: oldScaleY });
        newImg.imageHistoryId = historyId;
        newImg.customName = historyEntry.name;
        restoreInteractivity(newImg);
        canvas.remove(activeObj);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
        showToast("Image remplacée", "success");
      });
    } else {
      // Add the image to the canvas
      fabric.Image.fromURL(historyEntry.src).then((newImg) => {
        newImg.scaleToWidth(300);
        newImg.set({ left: 150, top: 150, rx: 8, ry: 8 });
        newImg.imageHistoryId = historyId;
        newImg.customName = historyEntry.name;
        restoreInteractivity(newImg);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
        showToast("Image ajoutée", "success");
      });
    }
  }, [imageHistory]);

  // â”€â”€ Add element to canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addElementToCanvas = (item, x = 120, y = 120) => {
    if (!fabricCanvas || !isDesigner) return;
    let obj;

    if (item.type === "text") {
      const tc = { left: x, top: y, fill: "#0f172a", fontFamily: "Inter", width: 300 };
      if (item.variant === "h1") obj = new fabric.Textbox("Grand Titre", { ...tc, fontSize: 48, fontWeight: "bold", width: 420 });
      else if (item.variant === "h2") obj = new fabric.Textbox("Sous-titre", { ...tc, fontSize: 32, fontWeight: "600", fill: "#334155" });
      else if (item.variant === "p") obj = new fabric.Textbox("ceci est un paragraphe de texte standard.", { ...tc, fontSize: 16 });
      else if (item.variant === "ul") obj = new fabric.Textbox("â€¢ Élément 1\nâ€¢ Élément 2\nâ€¢ Élément 3", { ...tc, fontSize: 17 });
      else if (item.variant === "ol") obj = new fabric.Textbox("1. Premier point\n2. Deuxième point", { ...tc, fontSize: 17 });
      else if (item.variant === "quote") obj = new fabric.Textbox('"Citation inspirante."', { ...tc, fontSize: 20, fontStyle: "italic", fill: "#64748b" });
    } else if (item.type === "shape") {
      if (item.variant === "rect") obj = new fabric.Rect({ left: x, top: y, fill: "#6366f1", width: 130, height: 130, rx: 10, ry: 10 });
      else if (item.variant === "circle") obj = new fabric.Circle({ left: x, top: y, fill: "#ec4899", radius: 65 });
      else if (item.variant === "triangle") obj = new fabric.Triangle({ left: x, top: y, fill: "#10b981", width: 130, height: 130 });
      else if (item.variant === "ellipse") obj = new fabric.Ellipse({ left: x, top: y, fill: "#f59e0b", rx: 90, ry: 55 });
      else if (item.variant === "line") obj = new fabric.Line([0, 0, 220, 0], { stroke: "#334155", strokeWidth: 4, left: x, top: y });
      else if (item.variant === "frame") obj = new fabric.Rect({ left: x, top: y, fill: "transparent", stroke: "#cbd5e1", strokeDashArray: [8, 8], strokeWidth: 2, width: 320, height: 220, rx: 4, ry: 4 });
    } else if (item.type === "advanced_shape") {
      if (item.variant === "polygon") obj = new fabric.Polygon([{ x: 25, y: 0 }, { x: 75, y: 0 }, { x: 100, y: 43 }, { x: 75, y: 86 }, { x: 25, y: 86 }, { x: 0, y: 43 }], { left: x, top: y, fill: "#8b5cf6" });
      else if (item.variant === "star") obj = new fabric.Polygon([{ x: 50, y: 0 }, { x: 61, y: 35 }, { x: 98, y: 35 }, { x: 68, y: 57 }, { x: 79, y: 91 }, { x: 50, y: 70 }, { x: 21, y: 91 }, { x: 32, y: 57 }, { x: 2, y: 35 }, { x: 39, y: 35 }], { left: x, top: y, fill: "#f59e0b" });
      else if (item.variant === "zap") obj = new fabric.Polygon([{ x: 40, y: 0 }, { x: 0, y: 50 }, { x: 30, y: 50 }, { x: 20, y: 100 }, { x: 60, y: 40 }, { x: 30, y: 40 }], { left: x, top: y, fill: "#eab308" });
      else if (item.variant === "arrow_r") obj = new fabric.Polygon([{ x: 0, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 0 }, { x: 80, y: 30 }, { x: 50, y: 60 }, { x: 50, y: 40 }, { x: 0, y: 40 }], { left: x, top: y, fill: "#ef4444" });
      else if (item.variant === "arrow_double") obj = new fabric.Polygon([{ x: 30, y: 20 }, { x: 70, y: 20 }, { x: 70, y: 0 }, { x: 100, y: 30 }, { x: 70, y: 60 }, { x: 70, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 0, y: 30 }, { x: 30, y: 0 }], { left: x, top: y, fill: "#ef4444" });
      else if (item.variant === "cloud") obj = new fabric.Path("M 25 60 a 20 20 0 0 1 0 -40 a 25 25 0 0 1 50 0 a 20 20 0 0 1 0 40 Z", { left: x, top: y, fill: "#38bdf8" });
    } else if (item.type === "complex") {
      obj = buildComplexComponent(item, x, y);
    }

    if (obj) {
      restoreInteractivity(obj);
      fabricCanvas.add(obj);
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.renderAll();
    }
  };

  // â”€â”€ Complex component factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€ Template Component Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const buildTemplateElements = (item, x, y) => {
    let elements = [];
    let componentData = {};
    
    switch (item.variant) {
      case "tpl_home": {
        // Page d'accueil : Header + Hero + Features + Footer
        const bg = new fabric.Rect({ width: 1000, height: 900, fill: "#f8fafc", originX: "center", originY: "center", editable: true, customType: "background", customName: "Fond de page" });
        // Menu
        const navBg = new fabric.Rect({ width: 1000, height: 80, fill: "white", left: 0, top: -410, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 10, offsetY: 4 }), editable: true, customType: "navbar", customName: "Barre de navigation" });
        const logo = new fabric.IText("âš¡ STUDIO", { fontSize: 24, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", left: -420, top: -410, originX: "left", originY: "center", editable: true, customType: "logo", customName: "Logo" });
        const navLinks = new fabric.IText("Produit        Solutions        Prix        Ressources", { fontSize: 14, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 0, top: -410, originX: "center", originY: "center", editable: true, customType: "navLinks", customName: "Liens de navigation" });
        const ctaBtn = new fabric.Rect({ width: 140, height: 44, fill: "#0f172a", rx: 8, ry: 8, left: 420, top: -410, originX: "right", originY: "center", editable: true, customType: "button", customName: "Bouton CTA navigation" });
        const ctaTxt = new fabric.IText("Essayer gratis", { fontSize: 14, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 350, top: -410, originX: "center", originY: "center", editable: true, customType: "buttonText", customName: "Texte bouton CTA" });
        // Hero
        const heroH1 = new fabric.IText("Créez le web\nde demain, aujourd'hui.", { fontSize: 56, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", textAlign: "center", left: 0, top: -220, originX: "center", originY: "center", lineHeight: 1.1, editable: true, customType: "heading", customName: "Titre principal" });
        const heroSub = new fabric.IText("Notre outil vous aide à construire, designer et collaborer en temps réel.\nDes millions d'équipes nous font déjà confiance.", { fontSize: 18, fill: "#64748b", fontFamily: "Inter", textAlign: "center", left: 0, top: -110, originX: "center", originY: "center", lineHeight: 1.5, editable: true, customType: "subtext", customName: "Sous-titre hero" });
        const heroBtnBg = new fabric.Rect({ width: 220, height: 56, fill: "#6366f1", rx: 28, ry: 28, left: 0, top: -30, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.4)", blur: 16, offsetY: 8 }), editable: true, customType: "heroButton", customName: "Bouton principal" });
        const heroBtnTxt = new fabric.IText("Démarrer mon essai", { fontSize: 16, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 0, top: -30, originX: "center", originY: "center", editable: true, customType: "heroButtonText", customName: "Texte bouton principal" });
        // Image Placeholder (Abstract)
        const imgPlaceholder = new fabric.Rect({ width: 800, height: 350, fill: "#e2e8f0", rx: 24, ry: 24, left: 0, top: 220, originX: "center", originY: "center", editable: true, customType: "imagePlaceholder", customName: "Image placeholder" });
        const imgIcon = new fabric.IText("ðŸ–¼ Illustration", { fontSize: 24, fontWeight: "700", fill: "#94a3b8", fontFamily: "Inter", left: 0, top: 220, originX: "center", originY: "center", editable: true, customType: "imageText", customName: "Texte image" });
        
        elements = [bg, navBg, logo, navLinks, ctaBtn, ctaTxt, heroH1, heroSub, heroBtnBg, heroBtnTxt, imgPlaceholder, imgIcon];
        componentData = { variant: "tpl_home", editable: true, templateType: "homepage" };
        break;
      }
      
      case "tpl_login": {
        // Splitted screen login page
        const bg = new fabric.Rect({ width: 1000, height: 600, fill: "white", originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.1)", blur: 30, offsetY: 15 }), editable: true, customType: "background", customName: "Fond de page" });
        const leftPanel = new fabric.Rect({ width: 500, height: 600, fill: "#6366f1", left: -250, top: 0, originX: "center", originY: "center", editable: true, customType: "leftPanel", customName: "Panneau gauche" });
        const leftH1 = new fabric.IText("Heureux de\nvous revoir.", { fontSize: 48, fontWeight: "900", fill: "white", fontFamily: "Inter", left: -420, top: -40, originX: "left", originY: "center", lineHeight: 1.2, editable: true, customType: "welcomeHeading", customName: "Titre bienvenue" });
        const leftP = new fabric.IText("Connectez-vous pour continuer\nvotre expérience exclusive.", { fontSize: 16, fill: "rgba(255,255,255,0.8)", fontFamily: "Inter", left: -420, top: 60, originX: "left", originY: "center", lineHeight: 1.5, editable: true, customType: "welcomeSubtext", customName: "Sous-titre bienvenue" });
        
        // Right Form
        const logo = new fabric.IText("ðŸ”’ Espace Client", { fontSize: 20, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 250, top: -200, originX: "center", originY: "center", editable: true, customType: "formLogo", customName: "Logo formulaire" });
        const title = new fabric.IText("Se connecter", { fontSize: 32, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 250, top: -140, originX: "center", originY: "center", editable: true, customType: "formTitle", customName: "Titre formulaire" });
        
        // Email Input
        const l1 = new fabric.IText("Email", { fontSize: 13, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 80, top: -80, originX: "left", originY: "center", editable: true, customType: "emailLabel", customName: "Label email" });
        const i1Bg = new fabric.Rect({ width: 340, height: 50, fill: "white", rx: 8, ry: 8, stroke: "#cbd5e1", strokeWidth: 1, left: 250, top: -40, originX: "center", originY: "center", editable: true, customType: "emailInput", customName: "Champ email" });
        const i1Txt = new fabric.IText("votre@email.com", { fontSize: 14, fill: "#94a3b8", fontFamily: "Inter", left: 100, top: -40, originX: "left", originY: "center", editable: true, customType: "emailPlaceholder", customName: "Placeholder email" });
        
        // Password Input
        const l2 = new fabric.IText("Mot de passe", { fontSize: 13, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 80, top: 30, originX: "left", originY: "center", editable: true, customType: "passwordLabel", customName: "Label mot de passe" });
        const i2Bg = new fabric.Rect({ width: 340, height: 50, fill: "white", rx: 8, ry: 8, stroke: "#cbd5e1", strokeWidth: 1, left: 250, top: 70, originX: "center", originY: "center", editable: true, customType: "passwordInput", customName: "Champ mot de passe" });
        const i2Txt = new fabric.IText("â€¢â€¢â€¢â€¢â€¢â€¢â€¢", { fontSize: 14, fill: "#94a3b8", fontFamily: "Inter", left: 100, top: 70, originX: "left", originY: "center", editable: true, customType: "passwordPlaceholder", customName: "Placeholder mot de passe" });
        
        // Submit
        const btnBg = new fabric.Rect({ width: 340, height: 50, fill: "#0f172a", rx: 8, ry: 8, left: 250, top: 160, originX: "center", originY: "center", editable: true, customType: "submitButton", customName: "Bouton connexion" });
        const btnTxt = new fabric.IText("Connexion", { fontSize: 15, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 250, top: 160, originX: "center", originY: "center", editable: true, customType: "submitText", customName: "Texte bouton connexion" });
        
        const forgot = new fabric.IText("Mot de passe oublié ?", { fontSize: 13, fontWeight: "600", fill: "#6366f1", fontFamily: "Inter", left: 250, top: 220, originX: "center", originY: "center", editable: true, customType: "forgotLink", customName: "Lien mot de passe oublié" });

        elements = [bg, leftPanel, leftH1, leftP, logo, title, l1, i1Bg, i1Txt, l2, i2Bg, i2Txt, btnBg, btnTxt, forgot];
        componentData = { variant: "tpl_login", editable: true, templateType: "login" };
        break;
      }
      
      case "tpl_about": {
        // Page À Propos avec équipe et valeurs
        const bg = new fabric.Rect({ width: 1000, height: 800, fill: "#f8fafc", originX: "center", originY: "center", editable: true, customType: "background", customName: "Fond de page" });
        
        // Header
        const headerBg = new fabric.Rect({ width: 1000, height: 80, fill: "white", left: 0, top: -360, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 10, offsetY: 4 }), editable: true, customType: "header", customName: "Header" });
        const logo = new fabric.IText("ðŸ¢ ENTREPRISE", { fontSize: 24, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", left: -420, top: -360, originX: "left", originY: "center", editable: true, customType: "logo", customName: "Logo entreprise" });
        const navLinks = new fabric.IText("Accueil        À Propos        Contact", { fontSize: 14, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 0, top: -360, originX: "center", originY: "center", editable: true, customType: "navLinks", customName: "Navigation" });
        
        // Hero Section
        const heroH1 = new fabric.IText("Notre Histoire", { fontSize: 48, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", textAlign: "center", left: 0, top: -200, originX: "center", originY: "center", editable: true, customType: "heroHeading", customName: "Titre histoire" });
        const heroSub = new fabric.IText("Depuis 2010, nous transformons les idées en expériences numériques exceptionnelles.", { fontSize: 18, fill: "#64748b", fontFamily: "Inter", textAlign: "center", left: 0, top: -120, originX: "center", originY: "center", lineHeight: 1.5, editable: true, customType: "heroSubtext", customName: "Sous-titre histoire" });
        
        // Mission Section
        const missionBg = new fabric.Rect({ width: 900, height: 200, fill: "white", rx: 16, ry: 16, left: 0, top: 20, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.04)", blur: 12, offsetY: 4 }), editable: true, customType: "missionBox", customName: "Boîte mission" });
        const missionTitle = new fabric.IText("Notre Mission", { fontSize: 24, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: -380, top: 20, originX: "left", originY: "center", editable: true, customType: "missionTitle", customName: "Titre mission" });
        const missionText = new fabric.IText("Innover continuellement pour offrir des solutions web qui dépassent les attentes de nos clients.", { fontSize: 16, fill: "#475569", fontFamily: "Inter", left: -380, top: 60, originX: "left", originY: "center", lineHeight: 1.6, editable: true, customType: "missionText", customName: "Texte mission" });
        
        // Values Section
        const valuesTitle = new fabric.IText("Nos Valeurs", { fontSize: 24, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: -380, top: 160, originX: "left", originY: "center", editable: true, customType: "valuesTitle", customName: "Titre valeurs" });
        
        // Value cards
        const value1Bg = new fabric.Rect({ width: 250, height: 120, fill: "#f1f5f9", rx: 12, ry: 12, left: -280, top: 280, originX: "center", originY: "center", editable: true, customType: "value1Bg", customName: "Fond valeur 1" });
        const value1Icon = new fabric.IText("ðŸ’¡", { fontSize: 32, left: -280, top: 250, originX: "center", originY: "center", editable: true, customType: "value1Icon", customName: "Icône valeur 1" });
        const value1Title = new fabric.IText("Innovation", { fontSize: 18, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: -280, top: 310, originX: "center", originY: "center", editable: true, customType: "value1Title", customName: "Titre valeur 1" });
        
        const value2Bg = new fabric.Rect({ width: 250, height: 120, fill: "#e0f2fe", rx: 12, ry: 12, left: 0, top: 280, originX: "center", originY: "center", editable: true, customType: "value2Bg", customName: "Fond valeur 2" });
        const value2Icon = new fabric.IText("ðŸ¤", { fontSize: 32, left: 0, top: 250, originX: "center", originY: "center", editable: true, customType: "value2Icon", customName: "Icône valeur 2" });
        const value2Title = new fabric.IText("Confiance", { fontSize: 18, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: 0, top: 310, originX: "center", originY: "center", editable: true, customType: "value2Title", customName: "Titre valeur 2" });
        
        const value3Bg = new fabric.Rect({ width: 250, height: 120, fill: "#fef3c7", rx: 12, ry: 12, left: 280, top: 280, originX: "center", originY: "center", editable: true, customType: "value3Bg", customName: "Fond valeur 3" });
        const value3Icon = new fabric.IText("â­", { fontSize: 32, left: 280, top: 250, originX: "center", originY: "center", editable: true, customType: "value3Icon", customName: "Icône valeur 3" });
        const value3Title = new fabric.IText("Excellence", { fontSize: 18, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: 280, top: 310, originX: "center", originY: "center", editable: true, customType: "value3Title", customName: "Titre valeur 3" });
        
        // CTA Button
        const ctaBg = new fabric.Rect({ width: 200, height: 56, fill: "#6366f1", rx: 28, ry: 28, left: 0, top: 380, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.4)", blur: 16, offsetY: 8 }), editable: true, customType: "ctaButton", customName: "Bouton CTA" });
        const ctaText = new fabric.IText("Nous Contacter", { fontSize: 16, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 0, top: 380, originX: "center", originY: "center", editable: true, customType: "ctaText", customName: "Texte bouton CTA" });

        elements = [bg, headerBg, logo, navLinks, heroH1, heroSub, missionBg, missionTitle, missionText, valuesTitle, value1Bg, value1Icon, value1Title, value2Bg, value2Icon, value2Title, value3Bg, value3Icon, value3Title, ctaBg, ctaText];
        componentData = { variant: "tpl_about", editable: true, templateType: "about" };
        break;
      }
      
      case "tpl_cart": {
        const bg = new fabric.Rect({ width: 900, height: 700, fill: "#f8fafc", originX: "center", originY: "center", editable: true, customType: "background", customName: "Fond panier" });
        const h1 = new fabric.IText("Votre Panier", { fontSize: 36, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: -400, top: -300, originX: "left", originY: "center", editable: true, customType: "cartTitle", customName: "Titre panier" });
        
        // Items list background
        const listBg = new fabric.Rect({ width: 560, height: 440, fill: "white", rx: 16, ry: 16, stroke: "#e2e8f0", strokeWidth: 1, left: -120, top: -20, originX: "center", originY: "center", editable: true, customType: "itemsList", customName: "Liste articles" });
        
        // Summary background
        const sumBg = new fabric.Rect({ width: 280, height: 350, fill: "white", rx: 16, ry: 16, stroke: "#e2e8f0", strokeWidth: 1, left: 320, top: -65, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.04)", blur: 12, offsetX: 0, offsetY: 4 }), editable: true, customType: "summaryBox", customName: "Boîte résumé" });
        
        elements = [bg, h1, listBg, sumBg];

        // 3 products
        for(let i=0; i<3; i++) {
          let y = -160 + (i * 140);
          elements.push(new fabric.Rect({ width: 100, height: 100, fill: "#f1f5f9", rx: 12, ry: 12, left: -360, top: y, originX: "center", originY: "center", editable: true, customType: `productImage${i+1}`, customName: `Image produit ${i+1}` }));
          elements.push(new fabric.IText("ðŸ“¦", { fontSize: 32, left: -360, top: y, originX: "center", originY: "center", editable: true, customType: `productIcon${i+1}`, customName: `Icône produit ${i+1}` }));
          elements.push(new fabric.IText(`Produit Premium ${i+1}`, { fontSize: 16, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: -280, top: y - 20, originX: "left", originY: "center", editable: true, customType: `productName${i+1}`, customName: `Nom produit ${i+1}` }));
          elements.push(new fabric.IText("Couleur : Noir â€¢ Taille : M", { fontSize: 13, fill: "#64748b", fontFamily: "Inter", left: -280, top: y + 5, originX: "left", originY: "center", editable: true, customType: `productDetails${i+1}`, customName: `Détails produit ${i+1}` }));
          elements.push(new fabric.IText("Quantité : 1", { fontSize: 13, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: -280, top: y + 30, originX: "left", originY: "center", editable: true, customType: `productQuantity${i+1}`, customName: `Quantité produit ${i+1}` }));
          elements.push(new fabric.IText("99,00 €", { fontSize: 18, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 100, top: y, originX: "center", originY: "center", editable: true, customType: `productPrice${i+1}`, customName: `Prix produit ${i+1}` }));
          if(i < 2) elements.push(new fabric.Line([-380, y + 70, 140, y + 70], { stroke: "#e2e8f0", strokeWidth: 1 }));
        }

        // Summary details
        elements.push(new fabric.IText("Résumé", { fontSize: 20, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 200, top: -200, originX: "left", originY: "center", editable: true, customType: "summaryTitle", customName: "Titre résumé" }));
        elements.push(new fabric.IText("Sous-total", { fontSize: 14, fill: "#475569", fontFamily: "Inter", left: 200, top: -140, originX: "left", originY: "center", editable: true, customType: "subtotalLabel", customName: "Label sous-total" }));
        elements.push(new fabric.IText("297,00 €", { fontSize: 14, fontWeight: "600", fill: "#0f172a", fontFamily: "Inter", left: 440, top: -140, originX: "right", originY: "center", editable: true, customType: "subtotalAmount", customName: "Montant sous-total" }));
        
        elements.push(new fabric.IText("Livraison", { fontSize: 14, fill: "#475569", fontFamily: "Inter", left: 200, top: -100, originX: "left", originY: "center", editable: true, customType: "shippingLabel", customName: "Label livraison" }));
        elements.push(new fabric.IText("Gratuite", { fontSize: 14, fontWeight: "600", fill: "#10b981", fontFamily: "Inter", left: 440, top: -100, originX: "right", originY: "center", editable: true, customType: "shippingAmount", customName: "Montant livraison" }));

        elements.push(new fabric.Line([200, -70, 440, -70], { stroke: "#e2e8f0", strokeWidth: 1 }));

        elements.push(new fabric.IText("Total TTC", { fontSize: 16, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 200, top: -30, originX: "left", originY: "center", editable: true, customType: "totalLabel", customName: "Label total" }));
        elements.push(new fabric.IText("297,00 €", { fontSize: 24, fontWeight: "900", fill: "#6366f1", fontFamily: "Inter", left: 440, top: -30, originX: "right", originY: "center", editable: true, customType: "totalAmount", customName: "Montant total" }));

        elements.push(new fabric.Rect({ width: 240, height: 50, fill: "#0f172a", rx: 8, ry: 8, left: 320, top: 50, originX: "center", originY: "center", editable: true, customType: "payButton", customName: "Bouton payer" }));
        elements.push(new fabric.IText("Payer maintenant", { fontSize: 15, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 320, top: 50, originX: "center", originY: "center", editable: true, customType: "payButtonText", customName: "Texte bouton payer" }));

        componentData = { variant: "tpl_cart", editable: true, templateType: "cart" };
        break;
      }
      
      default: return null;
    }

    return { elements, componentData };
  };

  // --- LOGIQUE DE SAUVEGARDE ET MISE À JOUR DES COMPOSANTS (FUSIONNÉE) ---
  const handleComponentSave = (updatedData) => {
    if (!selectedObj || !fabricCanvas) return;

    // Fusion des données dans l'objet canvas
    selectedObj.componentData = { ...(selectedObj.componentData || {}), ...updatedData };

    const variant = selectedObj.customVariant;
    if (variant === "button") updateButtonOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "input") updateInputOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "profile") updateProfileOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "pricing") updatePricingOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "slider") updateSliderOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "card") updateCardOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "modal") updateModalOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "nav_menu") updateNavMenuOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "hero") updateHeroOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "tabs") updateTabsOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant === "table") updateTableOnCanvas(selectedObj, selectedObj.componentData);
    else if (variant.startsWith("chart_")) updateChartOnCanvas(selectedObj, selectedObj.componentData);

    fabricCanvas.renderAll();
    debouncedSave(fabricCanvas, designData?.version?._id);
    setLayersKey(k => k + 1);

    setEditorData({ ...selectedObj.componentData, variant });
    setShowComponentEditor(false);
  };

  const buildComplexComponent = (item, x, y) => {
    let elements = [];
    let componentData = {};
    let interactivity = null;

    switch (item.variant) {
      case "video": {
        const bg = new fabric.Rect({ width: 320, height: 200, fill: "#0f172a", rx: 12, ry: 12, originX: "center", originY: "center" });
        const playCircle = new fabric.Circle({ radius: 30, fill: "rgba(255,255,255,0.2)", originX: "center", originY: "center" });
        const playBtn = new fabric.IText("â–¶", { fontSize: 22, fill: "#ffffff", fontFamily: "Inter", originX: "center", originY: "center" });
        const label = new fabric.IText("Vidéo", { fontSize: 12, fill: "#94a3b8", fontFamily: "Inter", originX: "center", originY: "center", top: 70 });
        elements = [bg, playCircle, playBtn, label];
        componentData = { variant: "video" };
        break;
      }
      case "map": {
        const bg = new fabric.Rect({ width: 400, height: 300, fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 2, rx: 8, ry: 8, originX: "center", originY: "center" });
        const mapPin = new fabric.Path("M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", {
          fill: "#ef4444",
          scaleX: 2,
          scaleY: 2,
          originX: "center",
          originY: "center"
        });
        const mapLabel = new fabric.IText("Localisation", { fontSize: 14, fill: "#475569", fontFamily: "Inter", originX: "center", originY: "center", top: 40 });
        elements = [bg, mapPin, mapLabel];
        componentData = { variant: "map" };
        break;
      }
      case "frame": {
        const frame = new fabric.Rect({ 
          width: 600, 
          height: 400, 
          fill: "transparent", 
          stroke: "#cbd5e1", 
          strokeWidth: 2, 
          strokeDashArray: [8, 4],
          rx: 8, 
          ry: 8, 
          originX: "center", 
          originY: "center" 
        });
        const frameLabel = new fabric.IText("Frame / Section", { 
          fontSize: 12, 
          fill: "#94a3b8", 
          fontFamily: "Inter", 
          originX: "center", 
          originY: "top",
          top: -200 - 20
        });
        elements = [frame, frameLabel];
        componentData = { variant: "frame" };
        break;
      }
      case "button": {
        const bg = new fabric.Rect({ width: 160, height: 48, rx: 24, ry: 24, fill: "#6366f1", shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.4)", blur: 14, offsetX: 0, offsetY: 4 }), originX: "center", originY: "center" });
        const txt = new fabric.IText("Bouton principal", { fontSize: 14, fill: "#ffffff", fontFamily: "Inter", fontWeight: "600", originX: "center", originY: "center", top: 1, charSpacing: 10 });
        elements = [bg, txt];
        componentData = { buttonText: "Bouton principal", buttonColor: "#6366f1", buttonTextColor: "#ffffff", buttonSize: "medium", borderRadius: 24, actionType: "modal" };
        interactivity = (grp) => grp.on("mousedblclick", () => handleButtonClick(grp, grp.componentData));
        break;
      }
      case "input": {
        const bg = new fabric.Rect({ width: 280, height: 48, rx: 12, ry: 12, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1.5, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.02)", blur: 8, offsetX: 0, offsetY: 2 }), originX: "center", originY: "center" });
        const icon = new fabric.IText("âœ‰", { fontSize: 16, fill: "#94a3b8", fontFamily: "Inter", originX: "left", originY: "center", left: -124, top: 2 });
        const placeholder = new fabric.IText("votre@email.com", { fontSize: 14, fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "center", left: -100, top: 1 });
        const cursor = new fabric.Rect({ width: 1.5, height: 18, fill: "#6366f1", originX: "left", originY: "center", left: -10, top: 0, opacity: 0 });
        elements = [bg, icon, placeholder, cursor];
        componentData = { placeholder: "votre@email.com", inputWidth: 280, inputHeight: 48, borderColor: "#e2e8f0", bgColor: "#ffffff", textColor: "#0f172a" };
        break;
      }
      case "checkbox": {
        const track = new fabric.Rect({ width: 24, height: 24, rx: 6, ry: 6, fill: "#f1f5f9", stroke: "#cbd5e1", strokeWidth: 1.5, originX: "center", originY: "center" });
        const checkIcon = new fabric.IText("âœ“", { fontSize: 14, fill: "#ffffff", fontFamily: "Inter", fontWeight: "900", originX: "center", originY: "center", top: 1, visible: false });
        const labelText = new fabric.IText("Accepter les conditions", { fontSize: 14, fill: "#334155", fontFamily: "Inter", fontWeight: "500", originX: "left", originY: "center", left: 20, top: 0 });
        elements = [track, checkIcon, labelText];
        componentData = { checked: false, label: "Accepter les conditions", checkboxColor: "#6366f1" };
        interactivity = (grp) => grp.on("mousedblclick", () => {
          const newChecked = !grp.componentData.checked;
          grp.componentData.checked = newChecked;
          const t = grp._objects[0], ck = grp._objects[1];
          if (t) { t.set({ fill: newChecked ? "#6366f1" : "#f1f5f9", stroke: newChecked ? "" : "#cbd5e1", strokeWidth: newChecked ? 0 : 1.5 }); t.set("shadow", newChecked ? new fabric.Shadow({ color: "rgba(99,102,241,0.25)", blur: 6, offsetX: 0, offsetY: 2 }) : null); }
          if (ck) ck.set({ visible: newChecked });
          grp.set("dirty", true);
          grp.canvas?.renderAll();
          showToast(`Checkbox ${newChecked ? "cochée" : "décochée"}`, "info");
        });
        break;
      }
      case "toggle": {
        const track = new fabric.Rect({ width: 56, height: 32, rx: 16, ry: 16, fill: "#e2e8f0", originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 2, offsetX: 0, offsetY: 1 }) });
        const knob = new fabric.Circle({ radius: 12, fill: "#ffffff", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.15)", blur: 4, offsetX: 0, offsetY: 2 }), originX: "center", originY: "center", left: -12 });
        const offLabel = new fabric.IText("OFF", { fontSize: 12, fill: "#64748b", fontFamily: "Inter", fontWeight: "600", originX: "left", originY: "center", left: 38 });
        elements = [track, knob, offLabel];
        componentData = { toggled: false };
        interactivity = (grp) => grp.on("mousedblclick", () => {
          const on = !grp.componentData.toggled;
          grp.componentData.toggled = on;
          const tk = grp._objects[0], kn = grp._objects[1], lb = grp._objects[2];
          if (tk) tk.set({ fill: on ? "#10b981" : "#e2e8f0" });
          if (kn) kn.set({ left: on ? 12 : -12 });
          if (lb) lb.set({ text: on ? "ON " : "OFF", fill: on ? "#10b981" : "#64748b" });
          grp.set("dirty", true);
          grp.canvas?.renderAll();
          showToast(`Switch ${on ? "activé" : "désactivé"}`, "info");
        });
        break;
      }
      case "slider": {
        const trackBg = new fabric.Rect({ width: 220, height: 8, rx: 4, ry: 4, fill: "#e2e8f0", originX: "center", originY: "center" });
        const trackFill = new fabric.Rect({ width: 110, height: 8, rx: 4, ry: 4, fill: "#6366f1", originX: "left", originY: "center", left: -110 });
        const knob = new fabric.Circle({ radius: 12, fill: "#ffffff", shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.35)", blur: 8, offsetX: 0, offsetY: 3 }), originX: "center", originY: "center", left: 0 });
        const valLabel = new fabric.IText("50%", { fontSize: 13, fill: "#6366f1", fontFamily: "Inter", fontWeight: "700", originX: "center", originY: "top", top: 22 });
        const minLabel = new fabric.IText("0", { fontSize: 11, fill: "#94a3b8", fontFamily: "Inter", fontStyle: "italic", originX: "left", originY: "top", left: -110, top: 22 });
        const maxLabel = new fabric.IText("100", { fontSize: 11, fill: "#94a3b8", fontFamily: "Inter", fontStyle: "italic", originX: "right", originY: "top", left: 110, top: 22 });
        elements = [trackBg, trackFill, knob, valLabel, minLabel, maxLabel];
        componentData = { sliderValue: 50, min: 0, max: 100, unit: "%", sliderColor: "#6366f1" };
        interactivity = (grp) => {
          let isDragging = false;
          grp.on("mousedown", (e) => { isDragging = true; updateSliderFromEvent(e, grp); });
          grp.on("mouseup", () => { isDragging = false; });
          grp.on("mousemove", (e) => { if (isDragging) updateSliderFromEvent(e, grp); });
        };
        break;
      }
      case "modal": {
        const bg = new fabric.Rect({ width: 200, height: 50, fill: "#ffffff", rx: 12, ry: 12, stroke: "#6366f1", strokeWidth: 1.5, shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.15)", blur: 12, offsetX: 0, offsetY: 4 }), originX: "center", originY: "center" });
        const txt = new fabric.IText("Ouvrir la pop-up", { fontSize: 14, fill: "#6366f1", fontFamily: "Inter", fontWeight: "600", originX: "center", originY: "center" });
        elements = [bg, txt];
        componentData = { modalTitle: "Fenêtre modale", modalContent: "Contenu de la modal." };
        interactivity = (grp) => grp.on("mousedown", () => handleModalOpen(grp, grp.componentData));
        break;
      }
      case "card": {
        const cardBg = new fabric.Rect({ width: 280, height: 380, fill: "#ffffff", rx: 16, ry: 16, stroke: "#f8fafc", strokeWidth: 1, shadow: new fabric.Shadow({ color: "rgba(15,23,42,0.08)", blur: 24, offsetX: 0, offsetY: 12 }), originX: "center", originY: "center" });
        const imgZone = new fabric.Rect({ width: 256, height: 160, fill: "#f1f5f9", rx: 10, ry: 10, originX: "center", originY: "top", left: 0, top: -178 });
        const imgIcon = new fabric.IText("ðŸ–¼", { fontSize: 40, fontFamily: "Inter", originX: "center", originY: "center", left: 0, top: -98, fill: "#94a3b8" });
        const titleTxt = new fabric.IText("Produit Premium", { fontSize: 18, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", originX: "center", originY: "center", left: 0, top: 10 });
        const descTxt = new fabric.IText("Une description moderne et accrocheuse\npour ce produit exceptionnel.", { fontSize: 12, fill: "#64748b", fontFamily: "Inter", textAlign: "center", originX: "center", originY: "center", left: 0, top: 40 });
        const starRow = new fabric.IText("â˜…â˜…â˜…â˜…â˜…  (128)", { fontSize: 13, fill: "#f59e0b", fontFamily: "Inter", originX: "center", originY: "center", left: 0, top: 76 });
        const priceTxt = new fabric.IText("29€", { fontSize: 24, fontWeight: "900", fill: "#6366f1", fontFamily: "Inter", originX: "center", originY: "center", left: 0, top: 110 });
        const btnBg = new fabric.Rect({ width: 240, height: 44, rx: 8, ry: 8, fill: "#6366f1", originX: "center", originY: "center", left: 0, top: 156 });
        const btnTxt = new fabric.IText("Ajouter au panier", { fontSize: 13, fill: "#ffffff", fontFamily: "Inter", fontWeight: "700", originX: "center", originY: "center", left: 0, top: 156 });
        elements = [cardBg, imgZone, imgIcon, titleTxt, descTxt, starRow, priceTxt, btnBg, btnTxt];
        componentData = { productTitle: "Produit Premium", productDesc: "Une description moderne et accrocheuse\npour ce produit exceptionnel.", productPrice: "29€", productColor: "#6366f1", productRating: 5, productReviews: "128" };
        break;
      }
      case "profile": {
        const bgRect = new fabric.Rect({ width: 340, height: 130, fill: "#ffffff", rx: 18, ry: 18, stroke: "#f1f5f9", strokeWidth: 1, shadow: new fabric.Shadow({ color: "rgba(15,23,42,0.06)", blur: 20, offsetX: 0, offsetY: 8 }), originX: "center", originY: "center" });
        const avatarCircle = new fabric.Circle({ radius: 36, fill: "#eef2ff", originX: "center", originY: "center", left: -110 });
        const initials = new fabric.IText("MD", { fontSize: 18, fontWeight: "800", fill: "#6366f1", fontFamily: "Inter", originX: "center", originY: "center", left: -110, top: 0 });
        const nameTxt = new fabric.IText("Marie Dupont", { fontSize: 16, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", originX: "left", originY: "center", left: -54, top: -20 });
        const roleTxt = new fabric.IText("Directrice Design", { fontSize: 13, fill: "#6366f1", fontWeight: "600", fontFamily: "Inter", originX: "left", originY: "center", left: -54, top: 4 });
        const emailTxt = new fabric.IText("marie.dupont@exemple.com", { fontSize: 11, fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "center", left: -54, top: 26 });
        elements = [bgRect, avatarCircle, initials, nameTxt, roleTxt, emailTxt];
        componentData = { profileName: "Marie Dupont", profileRole: "Directrice Design", profileEmail: "marie.dupont@exemple.com", avatarColor: "#eef2ff", profileLayout: "horizontal" };
        break;
      }
      case "pricing": {
        const bgRect = new fabric.Rect({ width: 720, height: 380, fill: "#ffffff", rx: 24, ry: 24, stroke: "#e2e8f0", strokeWidth: 1, shadow: new fabric.Shadow({ color: "rgba(15,23,42,0.1)", blur: 30, offsetX: 0, offsetY: 12 }), originX: "center", originY: "center" });
        elements = [bgRect];
        componentData = {
          pricingRows: [
            { name: "Basique", price: "0€", features: ["5 projets", "1 utilisateur", "Support email"], color: "#64748b", popular: false },
            { name: "Pro", price: "29€", features: ["Projets illimités", "5 utilisateurs", "Support prioritaire", "Analytics avancés"], color: "#6366f1", popular: true },
            { name: "Premium", price: "99€", features: ["Tout en Pro", "Utilisateurs illimités", "API dédiée", "SLA garanti"], color: "#10b981", popular: false },
          ],
        };
        const startX = -220, colWidth = 220;
        componentData.pricingRows.forEach((row, idx) => {
          const cx = startX + idx * colWidth;
          const colBg = new fabric.Rect({ width: 200, height: 340, fill: row.popular ? row.color + "08" : "#ffffff", stroke: row.color, strokeWidth: row.popular ? 2 : 0, rx: 16, ry: 16, left: cx, top: 0, originX: "center", originY: "center", shadow: row.popular ? new fabric.Shadow({ color: "rgba(99,102,241,0.1)", blur: 16, offsetY: 6 }) : null });
          const titleT = new fabric.IText(row.name, { fontSize: 18, fontWeight: "800", fill: row.popular ? row.color : "#334155", fontFamily: "Inter", left: cx, top: -130, originX: "center" });
          const priceT = new fabric.IText(row.price, { fontSize: 32, fontWeight: "900", fill: row.popular ? row.color : "#0f172a", fontFamily: "Inter", left: cx, top: -90, originX: "center" });
          const priceMo = new fabric.IText("/mois", { fontSize: 11, fill: "#64748b", fontFamily: "Inter", left: cx, top: -66, originX: "center" });
          elements.push(colBg, titleT, priceT, priceMo);
          if (row.popular) {
            elements.push(new fabric.IText(" LE PLUS POPULAIRE ", { fontSize: 9, fontWeight: "800", fill: "white", fontFamily: "Inter", left: cx, top: -150, originX: "center", backgroundColor: row.color, padding: 6 }));
          }
          row.features.forEach((f, fi) => {
            elements.push(new fabric.IText("âœ”", { fontSize: 11, fill: row.color, fontFamily: "Inter", left: cx - 74, top: -30 + fi * 28, originX: "center" }));
            elements.push(new fabric.IText(f, { fontSize: 13, fill: "#475569", fontFamily: "Inter", left: cx - 60, top: -30 + fi * 28, originX: "left" }));
          });
          const btnBgColor = row.popular ? row.color : "#f1f5f9";
          const btnTxtColor = row.popular ? "white" : row.color;
          elements.push(
            new fabric.Rect({ width: 160, height: 40, rx: 8, ry: 8, fill: btnBgColor, left: cx, top: 136, originX: "center", originY: "center" }),
            new fabric.IText(row.popular ? "S'inscrire" : "Choisir", { fontSize: 13, fontWeight: "700", fill: btnTxtColor, fontFamily: "Inter", left: cx, top: 136, originX: "center", originY: "center" })
          );
        });
        break;
      }
      case "nav_menu": {
        const bg = new fabric.Rect({ width: 720, height: 76, fill: "rgba(255, 255, 255, 0.95)", stroke: "#f1f5f9", strokeWidth: 1.5, rx: 24, ry: 24, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.08)", blur: 32, offsetX: 0, offsetY: 16 }) });
        const logo = new fabric.IText("â—ˆ Logo", { fontSize: 22, fontWeight: "900", fill: "#6366f1", fontFamily: "Inter", originX: "left", originY: "center", left: -320 });
        const nav1 = new fabric.IText("Accueil", { fontSize: 14, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", originX: "left", originY: "center", left: -60 });
        const navUnderline = new fabric.Rect({ width: 20, height: 3, rx: 1.5, ry: 1.5, fill: "#6366f1", originX: "center", originY: "center", left: -35, top: 12 });
        const nav2 = new fabric.IText("À propos", { fontSize: 14, fontWeight: "500", fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "center", left: 20 });
        const nav3 = new fabric.IText("Contact", { fontSize: 14, fontWeight: "500", fill: "#64748b", fontFamily: "Inter", originX: "left", originY: "center", left: 110 });
        const ctaBg = new fabric.Rect({ width: 130, height: 44, rx: 12, ry: 12, fill: "#6366f1", originX: "right", originY: "center", left: 320, shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.3)", blur: 12, offsetX: 0, offsetY: 4 }) });
        const ctaTxt = new fabric.IText("Connexion", { fontSize: 13, fontWeight: "700", fill: "white", fontFamily: "Inter", originX: "right", originY: "center", left: 308 });
        elements = [bg, logo, nav1, navUnderline, nav2, nav3, ctaBg, ctaTxt];
        componentData = { navLogo: "â—ˆ Logo", nav1: "Accueil", nav2: "À propos", nav3: "Contact", navBtn: "Connexion", navColor: "#6366f1", variant: "nav_menu" };
        interactivity = (grp) => {
          grp.on("mousedown", () => {
            // Basic interaction demonstration on click
            const ctaBackground = grp._objects[6];
            const ctaText = grp._objects[7];
            ctaBackground.set({ opacity: 0.8, scaleX: 0.95, scaleY: 0.95 });
            ctaText.set({ scaleX: 0.95, scaleY: 0.95 });
            grp.canvas?.renderAll();
            setTimeout(() => {
              ctaBackground.set({ opacity: 1, scaleX: 1, scaleY: 1 });
              ctaText.set({ scaleX: 1, scaleY: 1 });
              grp.canvas?.renderAll();
            }, 150);
            showToast("Menu de navigation cliqué", "info");
          });
        };
        break;
      }
      case "hero": {
        const bg = new fabric.Rect({ width: 800, height: 480, fill: "#4f46e5", rx: 32, ry: 32, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(79,70,229,0.3)", blur: 40, offsetX: 0, offsetY: 20 }) });
        const dec1 = new fabric.Circle({ radius: 150, fill: "rgba(255,255,255,0.05)", left: -250, top: -150, originX: "center", originY: "center" });
        const dec2 = new fabric.Circle({ radius: 100, fill: "rgba(255,255,255,0.08)", left: 300, top: 150, originX: "center", originY: "center" });
        const badgeBg = new fabric.Rect({ width: 160, height: 32, rx: 16, ry: 16, fill: "rgba(255,255,255,0.15)", originX: "center", originY: "center", top: -110 });
        const badgeTxt = new fabric.IText("âœ¨ NOUVEAU DESIGN", { fontSize: 10, fontWeight: "800", fill: "#ffffff", fontFamily: "Inter", originX: "center", originY: "center", top: -110 });
        const h1 = new fabric.IText("Titre Principal", { fontSize: 56, fontWeight: "900", fill: "#ffffff", fontFamily: "Inter", originX: "center", originY: "center", top: -30, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.1)", blur: 10, offsetY: 4 }) });
        const sub = new fabric.IText("Sous-titre génial descriptif accrocheur pour présenter\nvotre produit révolutionnaire avec style.", { fontSize: 18, fill: "rgba(255,255,255,0.85)", fontFamily: "Inter", textAlign: "center", originX: "center", originY: "center", top: 40, lineHeight: 1.5 });
        const btn = new fabric.Rect({ width: 180, height: 56, rx: 28, ry: 28, fill: "#ffffff", originX: "center", originY: "center", left: -100, top: 130, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.2)", blur: 14, offsetY: 6 }) });
        const btnTxt = new fabric.IText("Commencer", { fontSize: 15, fontWeight: "800", fill: "#4f46e5", fontFamily: "Inter", originX: "center", originY: "center", left: -100, top: 130 });
        const btnOutline = new fabric.Rect({ width: 180, height: 56, rx: 28, ry: 28, fill: "transparent", stroke: "rgba(255,255,255,0.5)", strokeWidth: 2, originX: "center", originY: "center", left: 100, top: 130 });
        const btnOutlineTxt = new fabric.IText("En savoir plus", { fontSize: 15, fontWeight: "700", fill: "#ffffff", fontFamily: "Inter", originX: "center", originY: "center", left: 100, top: 130 });
        elements = [bg, dec1, dec2, badgeBg, badgeTxt, h1, sub, btn, btnTxt, btnOutline, btnOutlineTxt];
        componentData = { heroTitle: "Titre Principal", heroSub: "Sous-titre génial descriptif accrocheur pour présenter\nvotre produit révolutionnaire avec style.", heroBtn: "Commencer", heroBg: "#4f46e5", variant: "hero" };
        interactivity = (grp) => {
          grp.on("mousedown", () => {
            showToast("Hero section cliquée", "success");
          });
        };
        break;
      }
      case "tabs": {
        const bg = new fabric.Rect({ width: 440, height: 56, fill: "#f1f5f9", rx: 16, ry: 16, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 10, offsetY: 4 }) });
        const tab1Bg = new fabric.Rect({ width: 132, height: 44, fill: "#ffffff", rx: 12, ry: 12, left: -140, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(15,23,42,0.12)", blur: 12, offsetY: 4 }) });
        const tab1 = new fabric.IText("Général", { fontSize: 14, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", originX: "center", originY: "center", left: -140 });
        const tab2 = new fabric.IText("Sécurité", { fontSize: 14, fontWeight: "600", fill: "#64748b", fontFamily: "Inter", originX: "center", originY: "center", left: 0 });
        const tab3 = new fabric.IText("Avancé", { fontSize: 14, fontWeight: "600", fill: "#64748b", fontFamily: "Inter", originX: "center", originY: "center", left: 140 });
        elements = [bg, tab1Bg, tab1, tab2, tab3];
        componentData = { tab1: "Général", tab2: "Sécurité", tab3: "Avancé", activeTab: 1, variant: "tabs" };
        interactivity = (grp) => {
          grp.on("mousedown", (e) => {
            const pointer = getCanvasPointer(grp.canvas, e);
            if (!pointer) return;
            const clickX = pointer.x - grp.left;
            let newActive = 1;
            if (clickX > -70 && clickX < 70) newActive = 2;
            else if (clickX >= 70) newActive = 3;
            else newActive = 1;

            grp.componentData.activeTab = newActive;

            const t1Bg = grp._objects[1], t1 = grp._objects[2], t2 = grp._objects[3], t3 = grp._objects[4];

            if (t1Bg) {
              const targetLeft = newActive === 1 ? -140 : newActive === 2 ? 0 : 140;
              t1Bg.set({ left: targetLeft });
            }

            if (t1) t1.set({ fill: newActive === 1 ? "#0f172a" : "#64748b", fontWeight: newActive === 1 ? "700" : "600" });
            if (t2) t2.set({ fill: newActive === 2 ? "#0f172a" : "#64748b", fontWeight: newActive === 2 ? "700" : "600" });
            if (t3) t3.set({ fill: newActive === 3 ? "#0f172a" : "#64748b", fontWeight: newActive === 3 ? "700" : "600" });

            grp.canvas?.renderAll();
          });
        };
        break;
      }
      case "chart_bar":
      case "chart_bar_horiz":
      case "chart_bar_stacked":
      case "chart_pie":
      case "chart_donut":
      case "chart_line":
      case "chart_area": {
        componentData = { 
          chartTitle: "Titre du Graphique", 
          chartColor: "#6366f1", 
          secondColor: "#8b5cf6", 
          chartLabels: ["Lun", "Mar", "Mer", "Jeu", "Ven"], 
          chartValues: [30, 80, 50, 100, 60],
          variant: item.variant 
        };
        elements = generateChartObjects(item.variant, componentData);
        break;
      }
      
      // â”€â”€â”€ TEMPLATES COMPLETS â”€â”€â”€
      case "tpl_home": {
        // Page d'accueil : Header + Hero + Features + Footer
        const bg = new fabric.Rect({ width: 1000, height: 900, fill: "#f8fafc", originX: "center", originY: "center", editable: true, customType: "background" });
        // Menu
        const navBg = new fabric.Rect({ width: 1000, height: 80, fill: "white", left: 0, top: -410, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 10, offsetY: 4 }), editable: true, customType: "navbar" });
        const logo = new fabric.IText("âš¡ STUDIO", { fontSize: 24, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", left: -420, top: -410, originX: "left", originY: "center", editable: true, customType: "logo" });
        const navLinks = new fabric.IText("Produit        Solutions        Prix        Ressources", { fontSize: 14, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 0, top: -410, originX: "center", originY: "center", editable: true, customType: "navLinks" });
        const ctaBtn = new fabric.Rect({ width: 140, height: 44, fill: "#0f172a", rx: 8, ry: 8, left: 420, top: -410, originX: "right", originY: "center", editable: true, customType: "button" });
        const ctaTxt = new fabric.IText("Essayer gratis", { fontSize: 14, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 350, top: -410, originX: "center", originY: "center", editable: true, customType: "buttonText" });
        // Hero
        const heroH1 = new fabric.IText("Créez le web\nde demain, aujourd'hui.", { fontSize: 56, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", textAlign: "center", left: 0, top: -220, originX: "center", originY: "center", lineHeight: 1.1, editable: true, customType: "heading" });
        const heroSub = new fabric.IText("Notre outil vous aide à construire, designer et collaborer en temps réel.\nDes millions d'équipes nous font déjà confiance.", { fontSize: 18, fill: "#64748b", fontFamily: "Inter", textAlign: "center", left: 0, top: -110, originX: "center", originY: "center", lineHeight: 1.5, editable: true, customType: "subtext" });
        const heroBtnBg = new fabric.Rect({ width: 220, height: 56, fill: "#6366f1", rx: 28, ry: 28, left: 0, top: -30, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.4)", blur: 16, offsetY: 8 }), editable: true, customType: "heroButton" });
        const heroBtnTxt = new fabric.IText("Démarrer mon essai", { fontSize: 16, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 0, top: -30, originX: "center", originY: "center", editable: true, customType: "heroButtonText" });
        // Image Placeholder (Abstract)
        const imgPlaceholder = new fabric.Rect({ width: 800, height: 350, fill: "#e2e8f0", rx: 24, ry: 24, left: 0, top: 220, originX: "center", originY: "center", editable: true, customType: "imagePlaceholder" });
        const imgIcon = new fabric.IText("ðŸ–¼ Illustration", { fontSize: 24, fontWeight: "700", fill: "#94a3b8", fontFamily: "Inter", left: 0, top: 220, originX: "center", originY: "center", editable: true, customType: "imageText" });
        
        elements = [bg, navBg, logo, navLinks, ctaBtn, ctaTxt, heroH1, heroSub, heroBtnBg, heroBtnTxt, imgPlaceholder, imgIcon];
        componentData = { variant: "tpl_home", editable: true, templateType: "homepage" };
        break;
      }

      case "tpl_login": {
        // Splitted screen login page
        const bg = new fabric.Rect({ width: 1000, height: 600, fill: "white", originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.1)", blur: 30, offsetY: 15 }), editable: true, customType: "background" });
        const leftPanel = new fabric.Rect({ width: 500, height: 600, fill: "#6366f1", left: -250, top: 0, originX: "center", originY: "center", editable: true, customType: "leftPanel" });
        const leftH1 = new fabric.IText("Heureux de\nvous revoir.", { fontSize: 48, fontWeight: "900", fill: "white", fontFamily: "Inter", left: -420, top: -40, originX: "left", originY: "center", lineHeight: 1.2, editable: true, customType: "welcomeHeading" });
        const leftP = new fabric.IText("Connectez-vous pour continuer\nvotre expérience exclusive.", { fontSize: 16, fill: "rgba(255,255,255,0.8)", fontFamily: "Inter", left: -420, top: 60, originX: "left", originY: "center", lineHeight: 1.5, editable: true, customType: "welcomeSubtext" });
        
        // Right Form
        const logo = new fabric.IText("ðŸ”’ Espace Client", { fontSize: 20, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 250, top: -200, originX: "center", originY: "center", editable: true, customType: "formLogo" });
        const title = new fabric.IText("Se connecter", { fontSize: 32, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 250, top: -140, originX: "center", originY: "center", editable: true, customType: "formTitle" });
        
        // Email Input
        const l1 = new fabric.IText("Email", { fontSize: 13, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 80, top: -80, originX: "left", originY: "center", editable: true, customType: "emailLabel" });
        const i1Bg = new fabric.Rect({ width: 340, height: 50, fill: "white", rx: 8, ry: 8, stroke: "#cbd5e1", strokeWidth: 1, left: 250, top: -40, originX: "center", originY: "center", editable: true, customType: "emailInput" });
        const i1Txt = new fabric.IText("votre@email.com", { fontSize: 14, fill: "#94a3b8", fontFamily: "Inter", left: 100, top: -40, originX: "left", originY: "center", editable: true, customType: "emailPlaceholder" });
        
        // Password Input
        const l2 = new fabric.IText("Mot de passe", { fontSize: 13, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 80, top: 30, originX: "left", originY: "center", editable: true, customType: "passwordLabel" });
        const i2Bg = new fabric.Rect({ width: 340, height: 50, fill: "white", rx: 8, ry: 8, stroke: "#cbd5e1", strokeWidth: 1, left: 250, top: 70, originX: "center", originY: "center", editable: true, customType: "passwordInput" });
        const i2Txt = new fabric.IText("â€¢â€¢â€¢â€¢â€¢â€¢â€¢", { fontSize: 14, fill: "#94a3b8", fontFamily: "Inter", left: 100, top: 70, originX: "left", originY: "center", editable: true, customType: "passwordPlaceholder" });
        
        // Submit
        const btnBg = new fabric.Rect({ width: 340, height: 50, fill: "#0f172a", rx: 8, ry: 8, left: 250, top: 160, originX: "center", originY: "center", editable: true, customType: "submitButton" });
        const btnTxt = new fabric.IText("Connexion", { fontSize: 15, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 250, top: 160, originX: "center", originY: "center", editable: true, customType: "submitText" });
        
        const forgot = new fabric.IText("Mot de passe oublié ?", { fontSize: 13, fontWeight: "600", fill: "#6366f1", fontFamily: "Inter", left: 250, top: 220, originX: "center", originY: "center", editable: true, customType: "forgotLink" });

        elements = [bg, leftPanel, leftH1, leftP, logo, title, l1, i1Bg, i1Txt, l2, i2Bg, i2Txt, btnBg, btnTxt, forgot];
        componentData = { variant: "tpl_login", editable: true, templateType: "login" };
        break;
      }

      case "tpl_cart": {
        const bg = new fabric.Rect({ width: 900, height: 700, fill: "#f8fafc", originX: "center", originY: "center", editable: true, customType: "background" });
        const h1 = new fabric.IText("Votre Panier", { fontSize: 36, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: -400, top: -300, originX: "left", originY: "center", editable: true, customType: "cartTitle" });
        
        // Items list background
        const listBg = new fabric.Rect({ width: 560, height: 440, fill: "white", rx: 16, ry: 16, stroke: "#e2e8f0", strokeWidth: 1, left: -120, top: -20, originX: "center", originY: "center", editable: true, customType: "itemsList" });
        
        // Summary background
        const sumBg = new fabric.Rect({ width: 280, height: 350, fill: "white", rx: 16, ry: 16, stroke: "#e2e8f0", strokeWidth: 1, left: 320, top: -65, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.04)", blur: 12, offsetX: 0, offsetY: 4 }), editable: true, customType: "summaryBox" });
        
        elements = [bg, h1, listBg, sumBg];

        // 3 products
        for(let i=0; i<3; i++) {
          let y = -160 + (i * 140);
          elements.push(new fabric.Rect({ width: 100, height: 100, fill: "#f1f5f9", rx: 12, ry: 12, left: -360, top: y, originX: "center", originY: "center", editable: true, customType: `productImage${i+1}` }));
          elements.push(new fabric.IText("ðŸ“¦", { fontSize: 32, left: -360, top: y, originX: "center", originY: "center", editable: true, customType: `productIcon${i+1}` }));
          elements.push(new fabric.IText(`Produit Premium ${i+1}`, { fontSize: 16, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: -280, top: y - 20, originX: "left", originY: "center", editable: true, customType: `productName${i+1}` }));
          elements.push(new fabric.IText("Couleur : Noir â€¢ Taille : M", { fontSize: 13, fill: "#64748b", fontFamily: "Inter", left: -280, top: y + 5, originX: "left", originY: "center", editable: true, customType: `productDetails${i+1}` }));
          elements.push(new fabric.IText("Quantité : 1", { fontSize: 13, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: -280, top: y + 30, originX: "left", originY: "center", editable: true, customType: `productQuantity${i+1}` }));
          elements.push(new fabric.IText("99,00 €", { fontSize: 18, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 100, top: y, originX: "center", originY: "center", editable: true, customType: `productPrice${i+1}` }));
          if(i < 2) elements.push(new fabric.Line([-380, y + 70, 140, y + 70], { stroke: "#e2e8f0", strokeWidth: 1 }));
        }

        // Summary details
        elements.push(new fabric.IText("Résumé", { fontSize: 20, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 200, top: -200, originX: "left", originY: "center", editable: true, customType: "summaryTitle" }));
        elements.push(new fabric.IText("Sous-total", { fontSize: 14, fill: "#475569", fontFamily: "Inter", left: 200, top: -140, originX: "left", originY: "center", editable: true, customType: "subtotalLabel" }));
        elements.push(new fabric.IText("297,00 €", { fontSize: 14, fontWeight: "600", fill: "#0f172a", fontFamily: "Inter", left: 440, top: -140, originX: "right", originY: "center", editable: true, customType: "subtotalAmount" }));
        
        elements.push(new fabric.IText("Livraison", { fontSize: 14, fill: "#475569", fontFamily: "Inter", left: 200, top: -100, originX: "left", originY: "center", editable: true, customType: "shippingLabel" }));
        elements.push(new fabric.IText("Gratuite", { fontSize: 14, fontWeight: "600", fill: "#10b981", fontFamily: "Inter", left: 440, top: -100, originX: "right", originY: "center", editable: true, customType: "shippingAmount" }));

        elements.push(new fabric.Line([200, -70, 440, -70], { stroke: "#e2e8f0", strokeWidth: 1 }));

        elements.push(new fabric.IText("Total TTC", { fontSize: 16, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: 200, top: -30, originX: "left", originY: "center", editable: true, customType: "totalLabel" }));
        elements.push(new fabric.IText("297,00 €", { fontSize: 24, fontWeight: "900", fill: "#6366f1", fontFamily: "Inter", left: 440, top: -30, originX: "right", originY: "center", editable: true, customType: "totalAmount" }));

        elements.push(new fabric.Rect({ width: 240, height: 50, fill: "#0f172a", rx: 8, ry: 8, left: 320, top: 50, originX: "center", originY: "center", editable: true, customType: "payButton" }));
        elements.push(new fabric.IText("Payer maintenant", { fontSize: 15, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 320, top: 50, originX: "center", originY: "center", editable: true, customType: "payButtonText" }));

        componentData = { variant: "tpl_cart", editable: true, templateType: "cart" };
        break;
      }

      case "tpl_about": {
        // Page À Propos avec équipe et valeurs
        const bg = new fabric.Rect({ width: 1000, height: 800, fill: "#f8fafc", originX: "center", originY: "center", editable: true, customType: "background" });
        
        // Header
        const headerBg = new fabric.Rect({ width: 1000, height: 80, fill: "white", left: 0, top: -360, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.05)", blur: 10, offsetY: 4 }), editable: true, customType: "header" });
        const logo = new fabric.IText("ðŸ¢ ENTREPRISE", { fontSize: 24, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", left: -420, top: -360, originX: "left", originY: "center", editable: true, customType: "logo" });
        const navLinks = new fabric.IText("Accueil        À Propos        Contact", { fontSize: 14, fontWeight: "600", fill: "#475569", fontFamily: "Inter", left: 0, top: -360, originX: "center", originY: "center", editable: true, customType: "navLinks" });
        
        // Hero Section
        const heroH1 = new fabric.IText("Notre Histoire", { fontSize: 48, fontWeight: "900", fill: "#0f172a", fontFamily: "Inter", textAlign: "center", left: 0, top: -200, originX: "center", originY: "center", editable: true, customType: "heroHeading" });
        const heroSub = new fabric.IText("Depuis 2010, nous transformons les idées en expériences numériques exceptionnelles.", { fontSize: 18, fill: "#64748b", fontFamily: "Inter", textAlign: "center", left: 0, top: -120, originX: "center", originY: "center", lineHeight: 1.5, editable: true, customType: "heroSubtext" });
        
        // Mission Section
        const missionBg = new fabric.Rect({ width: 900, height: 200, fill: "white", rx: 16, ry: 16, left: 0, top: 20, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.04)", blur: 12, offsetY: 4 }), editable: true, customType: "missionBox" });
        const missionTitle = new fabric.IText("Notre Mission", { fontSize: 24, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: -380, top: 20, originX: "left", originY: "center", editable: true, customType: "missionTitle" });
        const missionText = new fabric.IText("Innover continuellement pour offrir des solutions web qui dépassent les attentes de nos clients.", { fontSize: 16, fill: "#475569", fontFamily: "Inter", left: -380, top: 60, originX: "left", originY: "center", lineHeight: 1.6, editable: true, customType: "missionText" });
        
        // Values Section
        const valuesTitle = new fabric.IText("Nos Valeurs", { fontSize: 24, fontWeight: "800", fill: "#0f172a", fontFamily: "Inter", left: -380, top: 160, originX: "left", originY: "center", editable: true, customType: "valuesTitle" });
        
        // Value cards
        const value1Bg = new fabric.Rect({ width: 250, height: 120, fill: "#f1f5f9", rx: 12, ry: 12, left: -280, top: 280, originX: "center", originY: "center", editable: true, customType: "value1Bg" });
        const value1Icon = new fabric.IText("ðŸ’¡", { fontSize: 32, left: -280, top: 250, originX: "center", originY: "center", editable: true, customType: "value1Icon" });
        const value1Title = new fabric.IText("Innovation", { fontSize: 18, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: -280, top: 310, originX: "center", originY: "center", editable: true, customType: "value1Title" });
        
        const value2Bg = new fabric.Rect({ width: 250, height: 120, fill: "#e0f2fe", rx: 12, ry: 12, left: 0, top: 280, originX: "center", originY: "center", editable: true, customType: "value2Bg" });
        const value2Icon = new fabric.IText("ðŸ¤", { fontSize: 32, left: 0, top: 250, originX: "center", originY: "center", editable: true, customType: "value2Icon" });
        const value2Title = new fabric.IText("Confiance", { fontSize: 18, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: 0, top: 310, originX: "center", originY: "center", editable: true, customType: "value2Title" });
        
        const value3Bg = new fabric.Rect({ width: 250, height: 120, fill: "#fef3c7", rx: 12, ry: 12, left: 280, top: 280, originX: "center", originY: "center", editable: true, customType: "value3Bg" });
        const value3Icon = new fabric.IText("â­", { fontSize: 32, left: 280, top: 250, originX: "center", originY: "center", editable: true, customType: "value3Icon" });
        const value3Title = new fabric.IText("Excellence", { fontSize: 18, fontWeight: "700", fill: "#0f172a", fontFamily: "Inter", left: 280, top: 310, originX: "center", originY: "center", editable: true, customType: "value3Title" });
        
        // CTA Button
        const ctaBg = new fabric.Rect({ width: 200, height: 56, fill: "#6366f1", rx: 28, ry: 28, left: 0, top: 380, originX: "center", originY: "center", shadow: new fabric.Shadow({ color: "rgba(99,102,241,0.4)", blur: 16, offsetY: 8 }), editable: true, customType: "ctaButton" });
        const ctaText = new fabric.IText("Nous Contacter", { fontSize: 16, fontWeight: "700", fill: "white", fontFamily: "Inter", left: 0, top: 380, originX: "center", originY: "center", editable: true, customType: "ctaText" });

        elements = [bg, headerBg, logo, navLinks, heroH1, heroSub, missionBg, missionTitle, missionText, valuesTitle, value1Bg, value1Icon, value1Title, value2Bg, value2Icon, value2Title, value3Bg, value3Icon, value3Title, ctaBg, ctaText];
        componentData = { variant: "tpl_about", editable: true, templateType: "about" };
        break;
      }

      default: return null;
    }

    if (elements.length === 0) return null;
    
    // Special handling for video and map components
    let groupProps = { left: x, top: y, originX: "center", originY: "center" };
    let customName = item.label;
    
    if (item.variant === "video") {
      customName = "Lecteur Vidéo";
      groupProps = {
        ...groupProps,
        customName: "Lecteur Vidéo",
        customVariant: "video",
        videoSrc: "",
        videoAssetId: ""
      };
    } else if (item.variant === "map") {
      customName = "Carte (Map)";
      groupProps = {
        ...groupProps,
        customName: "Carte (Map)",
        customVariant: "map",
        mapLat: DEFAULT_MAP_LAT,
        mapLng: DEFAULT_MAP_LNG,
        mapZoom: DEFAULT_MAP_ZOOM,
        mapAddress: "",
        mapType: "m",
        showMarker: true
      };
    }
    
    const group = new fabric.Group(elements, groupProps);
    group.customName = customName;
    group.customVariant = item.variant;
    group.componentData = componentData;
    
    // Copy special properties to group for video/map
    if (item.variant === "video") {
      group.videoSrc = "";
      group.videoAssetId = "";
    } else if (item.variant === "map") {
      group.mapLat = DEFAULT_MAP_LAT;
      group.mapLng = DEFAULT_MAP_LNG;
      group.mapZoom = DEFAULT_MAP_ZOOM;
      group.mapAddress = "";
      group.mapType = "m";
      group.showMarker = true;
    }
    
    // Add interactivity for template groups
    if (componentData.templateType || item.variant.startsWith("chart_")) {
      interactivity = (grp) => {
        // Make individual elements within the group editable
        grp._objects.forEach((obj, index) => {
          if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
            obj.on("mousedblclick", () => {
              if (fabricCanvas) {
                // Select the individual text object for editing
                fabricCanvas.discardActiveObject();
                fabricCanvas.setActiveObject(obj);
                obj.enterEditing();
                obj.selectAll();
                fabricCanvas.renderAll();
              }
            });
          }
          
          obj.on("selected", () => {
            if (fabricCanvas && obj.fill) {
              // Update color picker when element is selected
              const colorInput = document.querySelector('input[type="color"]');
              if (colorInput instanceof HTMLInputElement && typeof obj.fill === 'string') {
                colorInput.value = obj.fill;
              }
            }
          });
        });
        
        // Make the whole group selectable
        grp.on("mousedown", () => {
          if (fabricCanvas) {
            fabricCanvas.setActiveObject(grp);
            fabricCanvas.renderAll();
          }
        });
      };
    }
    
    if (interactivity) interactivity(group);
    return group;
  };

  // â”€â”€ Drag & drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSidebarClick = (item) => { addElementToCanvas(item); };
  const handleDragStart = (e, item) => { e.dataTransfer.setData("element-data", JSON.stringify(item)); };
  const handleDragEnd = () => {};

  const handleCanvasDrop = (e) => {
    if (!isDesigner || !fabricCanvas) return;
    e.preventDefault();
    const rect = wrapperRef.current.getBoundingClientRect();
    const vpt = fabricCanvas.viewportTransform;
    const tx = (e.clientX - rect.left - vpt[4]) / vpt[0];
    const ty = (e.clientY - rect.top - vpt[5]) / vpt[3];

    // Check for file drop (image replacement)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        // Attempt to find the target under the mouse
        const isTargetMatch = (obj) => {
          if (!obj.containsPoint) return false;
          // fabric provides point transform logic, or we can use simpler check:
          const pointer = getCanvasPointer(fabricCanvas, e);
          return obj.containsPoint(pointer);
        };
        const targets = fabricCanvas.getObjects().filter(o => o.type === "image" && isTargetMatch(o));
        const target = targets.length > 0 ? targets[targets.length - 1] : null;

        const reader = new FileReader();
        reader.onload = f => {
          const newSrc = typeof f.target?.result === "string" ? f.target.result : "";
          const imgEl = new Image();
          imgEl.onload = () => {
            const historyId = addImageToHistory(newSrc, file.name, imgEl.naturalWidth, imgEl.naturalHeight);
            if (target && target.type === "image") {
              const oldScaleX = target.scaleX, oldScaleY = target.scaleY, oldLeft = target.left, oldTop = target.top, oldAngle = target.angle;
              fabric.Image.fromURL(newSrc).then((newImg) => {
                newImg.set({ left: oldLeft, top: oldTop, angle: oldAngle, scaleX: oldScaleX, scaleY: oldScaleY });
                newImg.imageHistoryId = historyId;
                newImg.customName = file.name;
                restoreInteractivity(newImg);
                fabricCanvas.remove(target);
                fabricCanvas.add(newImg);
                fabricCanvas.setActiveObject(newImg);
                fabricCanvas.renderAll();
                showToast("Image remplacée par glisser-déposer", "success");
              });
            } else {
              const imgInstance = new fabric.Image(imgEl);
              imgInstance.scaleToWidth(300);
              imgInstance.set({ left: snapEnabled ? snapToGrid(tx, GRID_SIZE) : tx, top: snapEnabled ? snapToGrid(ty, GRID_SIZE) : ty, rx: 8, ry: 8 });
              imgInstance.imageHistoryId = historyId;
              imgInstance.customName = file.name;
              restoreInteractivity(imgInstance);
              fabricCanvas.add(imgInstance);
              fabricCanvas.setActiveObject(imgInstance);
              fabricCanvas.renderAll();
              showToast("Image ajoutée au canevas", "success");
            }
          };
          imgEl.src = newSrc;
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    const dataStr = e.dataTransfer.getData("element-data");
    if (!dataStr) return;
    const item = JSON.parse(dataStr);
    addElementToCanvas(item, snapEnabled ? snapToGrid(tx, GRID_SIZE) : tx, snapEnabled ? snapToGrid(ty, GRID_SIZE) : ty);
  };

  // FIX: Image import with history tracking
  const handleImportImage = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas || !isDesigner) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const imgEl = document.createElement("img");
      if (typeof f.target?.result !== "string") return;
      imgEl.src = f.target.result;
      imgEl.onload = () => {
        const imgInstance = new fabric.Image(imgEl, {
          left: 120,
          top: 120,
          scaleX: 200 / imgEl.width,
          scaleY: 200 / imgEl.height,
        });
        restoreInteractivity(imgInstance);
        fabricCanvas.add(imgInstance);
        fabricCanvas.setActiveObject(imgInstance);
        fabricCanvas.renderAll();
        
        // Add to image history
        const historyId = typeof f.target?.result === "string"
          ? addImageToHistory(f.target.result, file.name, imgEl.width, imgEl.height)
          : null;
        imgInstance.imageHistoryId = historyId;
        
        debouncedSave(fabricCanvas, currentVersionIdRef.current);
        showToast("Image importée avec succès", "success");
      };
      if (typeof f.target?.result !== "string") return;
      imgEl.src = f.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // Professional design functions
  const handleMultiSelection = (e) => {
    if (!fabricCanvas || !isDesigner) return;
    
    if (e.shiftKey && e.target) {
      // Shift+click for multi-selection
      const currentSelection = fabricCanvas.getActiveObjects() || [];
      const isSelected = currentSelection.includes(e.target);
      
      if (isSelected) {
        // Remove from selection
        const newSelection = currentSelection.filter(obj => obj !== e.target);
        fabricCanvas.discardActiveObject();
        if (newSelection.length > 0) {
          fabricCanvas.setActiveObject(new fabric.ActiveSelection(newSelection, {
            canvas: fabricCanvas
          }));
        }
      } else {
        // Add to selection
        const newSelection = [...currentSelection, e.target];
        fabricCanvas.discardActiveObject();
        fabricCanvas.setActiveObject(new fabric.ActiveSelection(newSelection, {
          canvas: fabricCanvas
        }));
      }
      
      fabricCanvas.renderAll();
      updateSelectedObjects();
    }
  };

  const updateSelectedObjects = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects() || [];
    setSelectedObjects(activeObjects);
    setSelectedObj(activeObjects.length === 1 ? activeObjects[0] : null);
  };

  const createSelectionBox = (pointer) => {
    if (!fabricCanvas) return;
    
    const selectionBox = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: 'rgba(99, 102, 241, 0.1)',
      stroke: '#6366f1',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true
    });
    
    setSelectionBox(selectionBox);
    fabricCanvas.add(selectionBox);
    setIsMultiSelecting(true);
  };

  const updateSelectionBox = (pointer) => {
    if (!selectionBox || !fabricCanvas) return;
    
    const startX = selectionBox.left;
    const startY = selectionBox.top;
    const width = pointer.x - startX;
    const height = pointer.y - startY;
    
    selectionBox.set({
      width: Math.abs(width),
      height: Math.abs(height),
      left: width < 0 ? pointer.x : startX,
      top: height < 0 ? pointer.y : startY
    });
    
    fabricCanvas.renderAll();
  };

  const finalizeSelectionBox = () => {
    if (!selectionBox || !fabricCanvas) return;
    
    // Get objects within selection box
    const boxBounds = selectionBox.getBoundingRect();
    const objectsInSelection = fabricCanvas.getObjects().filter(obj => {
      if (obj === selectionBox || obj.excludeFromExport) return false;
      const objBounds = obj.getBoundingRect();
      return (
        objBounds.left < boxBounds.left + boxBounds.width &&
        objBounds.left + objBounds.width > boxBounds.left &&
        objBounds.top < boxBounds.top + boxBounds.height &&
        objBounds.top + objBounds.height > boxBounds.top
      );
    });
    
    // Remove selection box
    fabricCanvas.remove(selectionBox);
    setSelectionBox(null);
    setIsMultiSelecting(false);
    
    // Set active selection
    if (objectsInSelection.length > 0) {
      fabricCanvas.discardActiveObject();
      fabricCanvas.setActiveObject(new fabric.ActiveSelection(objectsInSelection, {
        canvas: fabricCanvas
      }));
      fabricCanvas.renderAll();
      updateSelectedObjects();
    }
  };

  const alignObjects = (alignment) => {
    if (!fabricCanvas || selectedObjects.length < 2) return;
    
    const activeSelection = fabricCanvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;
    
    const bounds = activeSelection.getBoundingRect();
    
    selectedObjects.forEach(obj => {
      switch (alignment) {
        case 'left':
          obj.set({ left: bounds.left });
          break;
        case 'center':
          obj.set({ left: bounds.left + bounds.width / 2 - obj.width * obj.scaleX / 2 });
          break;
        case 'right':
          obj.set({ left: bounds.left + bounds.width - obj.width * obj.scaleX });
          break;
        case 'top':
          obj.set({ top: bounds.top });
          break;
        case 'middle':
          obj.set({ top: bounds.top + bounds.height / 2 - obj.height * obj.scaleY / 2 });
          break;
        case 'bottom':
          obj.set({ top: bounds.top + bounds.height - obj.height * obj.scaleY });
          break;
      }
      obj.setCoords();
    });
    
    fabricCanvas.renderAll();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
  };

  const distributeObjects = (distribution) => {
    if (!fabricCanvas || selectedObjects.length < 3) return;
    
    const sortedObjects = [...selectedObjects].sort((a, b) => {
      return distribution === 'horizontal' ? a.left - b.left : a.top - b.top;
    });
    
    if (distribution === 'horizontal') {
      const totalWidth = sortedObjects[sortedObjects.length - 1].left - sortedObjects[0].left;
      const spacing = totalWidth / (sortedObjects.length - 1);
      
      sortedObjects.forEach((obj, index) => {
        obj.set({ left: sortedObjects[0].left + spacing * index });
        obj.setCoords();
      });
    } else {
      const totalHeight = sortedObjects[sortedObjects.length - 1].top - sortedObjects[0].top;
      const spacing = totalHeight / (sortedObjects.length - 1);
      
      sortedObjects.forEach((obj, index) => {
        obj.set({ top: sortedObjects[0].top + spacing * index });
        obj.setCoords();
      });
    }
    
    fabricCanvas.renderAll();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
  };

  const groupObjects = () => {
    if (!fabricCanvas || selectedObjects.length < 2) return;
    
    const activeSelection = fabricCanvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;
    
    const group = new fabric.Group(selectedObjects, {
      canvas: fabricCanvas
    });
    
    fabricCanvas.remove(...selectedObjects);
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();
    
    updateSelectedObjects();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
  };

  const ungroupObjects = () => {
    if (!fabricCanvas || !selectedObj || selectedObj.type !== 'group') return;
    
    const group = selectedObj;
    const items = [...group.getObjects()];
    const transforms = items.map(child => fabric.util.qrDecompose(child.calcTransformMatrix()));
    
    fabricCanvas.remove(group);
    
    items.forEach((child, i) => {
      const opt = transforms[i];
      child.set({
          left: opt.translateX, top: opt.translateY,
          scaleX: opt.scaleX, scaleY: opt.scaleY,
          angle: opt.angle, skewX: opt.skewX, skewY: opt.skewY,
          group: null,
          editable: true,
          selectable: true,
          evented: true,
      });
      child.setCoords();
      fabricCanvas.add(child);
      restoreInteractivity(child);
    });
    
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    
    updateSelectedObjects();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
  };

  const duplicateObjects = () => {
    if (!fabricCanvas) return;
    
    const objectsToDuplicate = selectedObjects.length > 0 ? selectedObjects : (selectedObj ? [selectedObj] : []);
    if (objectsToDuplicate.length === 0) return;
    
    const duplicatedObjects = objectsToDuplicate.map(obj => {
      return fabric.util.object.clone(obj, (cloned) => {
        cloned.set({
          left: cloned.left + 20,
          top: cloned.top + 20
        });
        cloned.setCoords();
      });
    });
    
    duplicatedObjects.forEach(obj => fabricCanvas.add(obj));
    
    if (duplicatedObjects.length > 1) {
      fabricCanvas.setActiveObject(new fabric.ActiveSelection(duplicatedObjects, {
        canvas: fabricCanvas
      }));
    } else {
      fabricCanvas.setActiveObject(duplicatedObjects[0]);
    }
    
    fabricCanvas.renderAll();
    updateSelectedObjects();
    debouncedSave(fabricCanvas, currentVersionIdRef.current);
  };
  const showTextToolbar = (obj) => {
    if (!obj || !fabricCanvas) return;
    
    // Check if it's a text object
    if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
      const canvasRect = fabricCanvas.getElement().getBoundingClientRect();
      const objCenter = obj.getCenterPoint();
      const toolbarX = canvasRect.left + (objCenter.x * fabricCanvas.getZoom()) - 120; // Center toolbar above text
      const toolbarY = canvasRect.top + (objCenter.y * fabricCanvas.getZoom()) - 50;
      
      setTextToolbarPosition({ x: toolbarX, y: toolbarY });
      setTextToolbarVisible(true);
    } else {
      setTextToolbarVisible(false);
    }
  };

  const hideTextToolbar = () => {
    setTextToolbarVisible(false);
  };

  const applyTextFormat = (format) => {
    if (!selectedObj || !fabricCanvas) return;
    
    if (selectedObj.type === 'text' || selectedObj.type === 'i-text' || selectedObj.type === 'textbox') {
      switch (format) {
        case 'bold':
          const currentWeight = selectedObj.fontWeight || 'normal';
          selectedObj.set({ fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' });
          break;
        case 'italic':
          const currentStyle = selectedObj.fontStyle || 'normal';
          selectedObj.set({ fontStyle: currentStyle === 'italic' ? 'normal' : 'italic' });
          break;
        case 'underline':
          const currentDecoration = selectedObj.underline || false;
          selectedObj.set({ underline: !currentDecoration });
          break;
        case 'strikethrough':
          const currentStrike = selectedObj.linethrough || false;
          selectedObj.set({ linethrough: !currentStrike });
          break;
        case 'align-left':
          selectedObj.set({ textAlign: 'left' });
          break;
        case 'align-center':
          selectedObj.set({ textAlign: 'center' });
          break;
        case 'align-right':
          selectedObj.set({ textAlign: 'right' });
          break;
        case 'align-justify':
          selectedObj.set({ textAlign: 'justify' });
          break;
      }
      
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  };

  const changeTextColor = (color) => {
    if (!selectedObj || !fabricCanvas) return;
    
    if (selectedObj.type === 'text' || selectedObj.type === 'i-text' || selectedObj.type === 'textbox') {
      selectedObj.set({ fill: color });
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  };

  const changeTextBackgroundColor = (color) => {
    if (!selectedObj || !fabricCanvas) return;
    
    if (selectedObj.type === 'text' || selectedObj.type === 'i-text' || selectedObj.type === 'textbox') {
      selectedObj.set({ backgroundColor: color === 'transparent' ? 'transparent' : color });
      fabricCanvas.renderAll();
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  };

  const setZoomLevel = (z) => { if (!fabricCanvas) return; fabricCanvas.setZoom(z); setZoom(Math.round(z * 100)); fabricCanvas.renderAll(); };

  // â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getCurrentRejetElements = () => {
    if (!fabricCanvas) return [];
    // Filter out deleted, hidden, and excluded elements more strictly
    const objets = fabricCanvas.getObjects().filter(o => {
      // Make sure object exists and is not deleted
      if (!o || o.excludeFromExport || o.visible === false) return false;
      // Additional check: make sure object is actually on the canvas
      return fabricCanvas.contains(o);
    });
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
      const typeIcon = { "i-text": "T", textbox: "T", rect: "â–­", circle: "â—¯", ellipse: "â—¯", triangle: "â–³", line: "â€”", image: "ðŸ–¼", group: "âŠž" }[obj.type] || "â—†";
      const objectIdentifier = [
        obj.id,
        obj.__uid,
        obj.customId,
        obj.name,
        obj.customName,
        obj.type,
        i,
        Math.round(obj.left || 0),
        Math.round(obj.top || 0),
      ].filter((value) => value !== undefined && value !== null && value !== "").join("_");
      return {
        id_element: obj.customName || obj.type + "_" + i,
        label_element: obj.customName || getObjectLabel(obj),
        commentaire_client: "",
        _thumbnail: thumbnail,
        _couleur: couleur,
        _texte: "",
        _typeIcon: typeIcon,
        _type: obj.type,
        _uiId: objectIdentifier || `${obj.type}_${i}`,
      };
    });
    return elements;
  };

  // Add useEffect to refresh rejection elements when canvas changes
  useEffect(() => {
    if (rejetModal && fabricCanvas) {
      const freshElements = getCurrentRejetElements();
      setRejetElements((prev) => {
        const previousById = new globalThis.Map(prev.map((item) => [item._uiId, item]));
        return freshElements.map((item) => {
          const previousItem = previousById.get(item._uiId);
          return previousItem
            ? { ...item, commentaire_client: previousItem.commentaire_client || "" }
            : item;
        });
      });
    }
  }, [rejetModal, fabricCanvas]);

  useEffect(() => {
    if (!rejetModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !rejetSubmitting) {
        setRejetModal(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rejetModal, rejetSubmitting]);

  useEffect(() => {
    if (!rejetModal) return;
    const totalPages = Math.max(1, Math.ceil(rejetElements.length / REJET_ELEMENTS_PER_PAGE));
    setRejetPage((prev) => Math.min(prev, totalPages));
  }, [rejetElements.length, rejetModal]);

  const closeRejetModal = () => {
    if (rejetSubmitting) return;
    setRejetModal(false);
  };

  const updateRejetElementComment = (uiId, commentaire) => {
    setRejetElements((prev) =>
      prev.map((item) => (item._uiId === uiId ? { ...item, commentaire_client: commentaire } : item))
    );
  };

  const openRejetModal = () => {
    const freshElements = getCurrentRejetElements();
    setRejetElements(freshElements);
    setRejetGeneralComment("");
    setRejetPage(1);
    setRejetModal(true);
  };

  const handleRejetSubmit = async () => {
    if (!designData || rejetSubmitting) return;
    const maquetteId = designData.maquette?._id;
    const versionId = currentVersionIdRef.current;
    const userId = user?.id || user?._id;
    if (!maquetteId || !versionId) return;
    setRejetSubmitting(true);
    try {
      const commentaires = rejetElements
        .filter(({ commentaire_client }) => commentaire_client && commentaire_client.trim())
        .map(({ id_element, label_element, commentaire_client, _thumbnail }) => ({
          id_element,
          label_element,
          commentaire_client: commentaire_client.trim(),
          thumbnail: _thumbnail || "",
        }));

      const generalComment = rejetGeneralComment.trim();
      if (generalComment) {
        commentaires.unshift({
          id_element: "version_globale",
          label_element: "Version complete",
          commentaire_client: generalComment,
          thumbnail: "",
        });
      }

      if (commentaires.length === 0) {
        commentaires.push({
          id_element: "version_globale",
          label_element: "Version complete",
          commentaire_client: "Version a corriger",
          thumbnail: "",
        });
      }
      await API.post("/validations", {
        maquette_id: maquetteId, version_id: versionId, client_id: userId, statut: "à corriger",
        commentaires,
      });
      setRejetModal(false);
      setValidationDone("à corriger");
      showToast("Rejet transmis avec succès", "info");
    } catch (err) {
      showToast("Erreur lors de l'envoi", "error");
    } finally { setRejetSubmitting(false); }
  };

  return (
    <>
      <div className="editor-layout">
        <header className="editor-header">
          <div className="header-left">
            <button className="btn-back" onClick={() => navigate(-1)} title="Retour"><ArrowLeft size={16} /></button>
            <div className="header-divider" />
            <div className="header-title">{designData?.maquette?.nom || "Projet sans nom"}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button onClick={handleToggleDropdown} disabled={!fabricCanvas} className="version-btn">
                  <GitBranch size={12} />
                  <span>v{currentVersionNum ?? "â€”"}</span>
                  <ChevronDown size={11} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {dropdownOpen && (
                  <div className="version-dropdown">
                    <div className="version-dropdown__header"><Clock size={11} /> Historique</div>
                    <div className="version-dropdown__list">
                      {versions.length === 0
                        ? <div className="version-dropdown__empty">Aucune version</div>
                        : versions.map(v => {
                          const isCurrent = getVersionNumberValue(v) === currentVersionNum;
                          return (
                            <div key={v._id} className={`version-item ${isCurrent ? "version-item--current" : ""}`} onClick={() => { if (!isCurrent && !loadingVersion) handleLoadVersion(v); }}>
                              <div className="version-item__icon"><GitBranch size={13} /></div>
                              <div className="version-item__info">
                                <span className="version-item__name">Version {getVersionNumberValue(v)}{isCurrent && <span className="version-item__badge">actuelle</span>}</span>
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
              {(saveStatus === "Sauvegarde..." || loadingVersion) && <Loader size={11} className="spin" />}
              {loadingVersion ? "Chargement..." : saveStatus}
            </div>
          </div>

          {isDesigner && (
            <div className="header-center">
              <div className="toolbar-pill">
                <button className={`toolbar-btn ${gridEnabled ? "active" : ""}`} onClick={() => setGridEnabled(g => !g)}><GridIcon size={14} /><span>Grille</span></button>
                <div className="toolbar-sep" />
                <button className={`toolbar-btn ${snapEnabled ? "active" : ""}`} onClick={() => setSnapEnabled(s => !s)}><LayoutTemplate size={14} /><span>Aimanter</span></button>
              </div>
              <div className="toolbar-pill zoom-pill">
                <button className="toolbar-btn-icon" onClick={() => fabricCanvas && setZoomLevel(Math.max(ZOOM_MIN, fabricCanvas.getZoom() - ZOOM_STEP))}><ZoomOut size={14} /></button>
                <span className="zoom-val" onClick={() => setZoomLevel(1)}>{zoom}%</span>
                <button className="toolbar-btn-icon" onClick={() => fabricCanvas && setZoomLevel(Math.min(ZOOM_MAX, fabricCanvas.getZoom() + ZOOM_STEP))}><ZoomIn size={14} /></button>
              </div>
            </div>
          )}

          <div className="header-right">
            {isClient && (
              <>
                {validationDone === "validé" ? (
                  <div className="status-pill status-pill--success"><Check size={13} /> Version {currentVersionNum} validée</div>
                ) : validationDone === "à corriger" ? (
                  <div className="status-pill status-pill--warn"><AlertCircle size={13} /> Rejet transmis</div>
                ) : (
                  <div className="client-actions">
                    <button onClick={openRejetModal} disabled={!designData} className="btn-reject">
                      <X size={13} /> Rejeter <span className="ver-tag">v{currentVersionNum}</span>
                    </button>
                    <button onClick={handleValider} disabled={validating || !designData} className="btn-validate">
                      {validating ? <><Loader size={13} className="spin" /> Validation...</> : <><Check size={13} /> Valider <span className="ver-tag ver-tag--light">v{currentVersionNum}</span></>}
                    </button>
                  </div>
                )}
              </>
            )}
            {isDesigner && (
              <>
                <button className="btn-ghost" onClick={handleReset} title="Réinitialiser"><RotateCcw size={14} /><span>Réinitialiser</span></button>
                <button className="btn-primary" onClick={() => triggerSave(fabricCanvas, designData?.version?._id)}>Enregistrer</button>
              </>
            )}
          </div>
        </header>

        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="editor-body">
          {isDesigner && (
            <aside className={`editor-sidebar ${!isSidebarOpen ? "collapsed" : ""}`}>
              <div className="sidebar-header">
                {isSidebarOpen ? <span>Bibliothèque</span> : ""}
                <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(s => !s)} title={isSidebarOpen ? "Fermer panneau" : "Ouvrir panneau"}>
                  {isSidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={16} />}
                </button>
              </div>
              <div className="sidebar-scroll custom-scrollbar">
                {SIDEBAR_MENU.map(category => (
                  <div key={category.id} className="menu-group">
                    <button 
                      className={`menu-trigger ${openMenu === category.id ? "active" : ""}`} 
                      onClick={() => {
                        setOpenMenu(openMenu === category.id ? "" : category.id);
                        if (!isSidebarOpen) setIsSidebarOpen(true);
                      }}
                      title={!isSidebarOpen ? category.label : ""}
                    >
                      <div className="menu-trigger-left">{category.icon}{isSidebarOpen && <span>{category.label}</span>}</div>
                      {isSidebarOpen && <ChevronDown size={13} className={`chevron ${openMenu === category.id ? "open" : ""}`} />}
                    </button>
                    {isSidebarOpen && (
                      <div className={`menu-content ${openMenu === category.id ? "open" : ""}`}>
                        <div className={category.layout === "grid" ? "tool-grid" : "tool-list"}>
                          {category.id === "blocks" ? (
                            <>
                              <button
                                className="tool-btn-list"
                                draggable={true}
                                onDragStart={e => handleDragStart(e, { id: "block_card", label: "Carte Produit", icon: <Package size={15} />, type: "complex", variant: "card" })}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleSidebarClick({ id: "block_card", label: "Carte Produit", icon: <Package size={15} />, type: "complex", variant: "card" })}
                                title="Clic: ajouter | Glisser-déposer"
                                disabled={!fabricCanvas}
                              >
                                <div className="icon-wrap"><Package size={15} /></div>
                                <span>Carte Produit</span>
                              </button>
                              <button
                                className="tool-btn-list"
                                draggable={true}
                                onDragStart={e => handleDragStart(e, { id: "block_profile", label: "Profil Utilisateur", icon: <Users size={15} />, type: "complex", variant: "profile" })}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleSidebarClick({ id: "block_profile", label: "Profil Utilisateur", icon: <Users size={15} />, type: "complex", variant: "profile" })}
                                title="Clic: ajouter | Glisser-déposer"
                                disabled={!fabricCanvas}
                              >
                                <div className="icon-wrap"><Users size={15} /></div>
                                <span>Profil Utilisateur</span>
                              </button>
                              <button
                                className="tool-btn-list"
                                draggable={true}
                                onDragStart={e => handleDragStart(e, { id: "block_pricing", label: "Tableau de Prix", icon: <DollarSign size={15} />, type: "complex", variant: "pricing" })}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleSidebarClick({ id: "block_pricing", label: "Tableau de Prix", icon: <DollarSign size={15} />, type: "complex", variant: "pricing" })}
                                title="Clic: ajouter | Glisser-déposer"
                                disabled={!fabricCanvas}
                              >
                                <div className="icon-wrap"><DollarSign size={15} /></div>
                                <span>Tableau de Prix</span>
                              </button>
                            </>
                          ) : (
                            category.items.map(item => {
                              if (item.type === "action_image") return (
                                <label key={item.id} className="tool-btn-list" title={item.label} style={{ cursor: "pointer" }}>
                                  <div className="icon-wrap">{item.icon}</div>
                                  <span>{item.label}</span>
                                  <input type="file" accept="image/*" hidden onChange={handleImportImage} disabled={!fabricCanvas} />
                                </label>
                              );
                              return (
                                <button
                                  key={item.id}
                                  className={category.layout === "grid" ? "tool-btn-box" : "tool-btn-list"}
                                  draggable={true}
                                  onDragStart={e => handleDragStart(e, item)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => handleSidebarClick(item)}
                                  title="Clic: ajouter | Glisser-déposer"
                                  disabled={!fabricCanvas}
                                >
                                  <div className="icon-wrap">{item.icon}</div>
                                  <span>{item.label}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* â”€â”€ DRAWING TOOLS SECTION â”€â”€ */}
                <div className="menu-group tools-menu-group" style={{ position: "relative" }}>
                  <button 
                    className={`menu-trigger ${openMenu === "outils" ? "active" : ""}`} 
                    onClick={() => {
                       setOpenMenu(openMenu === "outils" ? "" : "outils");
                       if (openMenu !== "outils" && !activeDrawingTool) setActiveDrawingTool("pen");
                    }}
                    title={!isSidebarOpen ? "Outils de dessin" : ""}
                  >
                    <div className="menu-trigger-left">
                      <PenTool size={16} />{isSidebarOpen && <span>Outils</span>}
                    </div>
                    {isSidebarOpen && <ChevronDown size={13} className={`chevron ${openMenu === "outils" ? "open" : ""}`} />}
                  </button>
                  
                  {/* Popover when Sidebar is Collapsed */}
                  {!isSidebarOpen && openMenu === "outils" && (
                    <div className="drawing-tools-popover">
                      <button className="drawing-popover-close" onClick={() => { setOpenMenu(""); setActiveDrawingTool(null); }}><X size={12} /></button>
                      <button className={`draw-tool ${!activeDrawingTool ? "active" : ""}`} aria-label="Select" onClick={() => setActiveDrawingTool(null)}><MousePointer2 size={18} /></button>
                      
                      <button className={`draw-tool draw-tool-color ${activeDrawingTool === "pen" ? "active" : ""}`} onClick={() => setActiveDrawingTool("pen")} title="Stylo">
                        <div className="tool-icon-wrap">
                          <PenTool size={18} />
                          <div className="tool-color-indicator" style={{ background: drawingColor }} />
                        </div>
                      </button>
                      <button className={`draw-tool draw-tool-color ${activeDrawingTool === "marker" ? "active" : ""}`} onClick={() => setActiveDrawingTool("marker")} title="Marqueur">
                        <div className="tool-icon-wrap">
                          <Minus size={18} strokeWidth={4} />
                          <div className="tool-color-indicator" style={{ background: drawingColor }} />
                        </div>
                      </button>
                      <button className={`draw-tool draw-tool-color ${activeDrawingTool === "highlighter" ? "active" : ""}`} onClick={() => setActiveDrawingTool("highlighter")} title="Surligneur">
                        <div className="tool-icon-wrap">
                          <Highlighter size={18} />
                          <div className="tool-color-indicator" style={{ background: drawingColor }} />
                        </div>
                      </button>
                      <button className={`draw-tool ${activeDrawingTool === "eraser" ? "active" : ""}`} onClick={() => setActiveDrawingTool("eraser")} title="Gomme"><Eraser size={18} /></button>
                      
                      <div className="draw-sep" />
                      
                      <div className="draw-quick-tools" style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                        <button className="draw-tool draw-tool-sm" onClick={() => spawnToolElement("table")} title="Tableau"><Table size={16} /></button>
                        <button className="draw-tool draw-tool-sm" onClick={() => spawnToolElement("sticker")} title="Sticker"><Star size={16} /></button>
                        <button className="draw-tool draw-tool-sm" onClick={() => spawnToolElement("emoji")} title="Emoji"><Smile size={16} /></button>
                      </div>

                      <div className="draw-sep" />
                      
                      <div className="draw-color-pickers">
                        {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#0f172a", "#ffffff"].map(c => (
                          <button key={c} className={`draw-color-swatch ${drawingColor === c ? "active" : ""}`} style={{ background: c }} onClick={() => setDrawingColor(c)} />
                        ))}
                      </div>
                      
                      <div className="draw-sep" />
                      
                      <div className="draw-width-wrap">
                        <input type="range" min="1" max="20" value={drawingWidth} onChange={(e) => setDrawingWidth(Number(e.target.value))} className="draw-range range-input" />
                      </div>
                    </div>
                  )}

                  {/* Inline Panel when Sidebar is Expanded */}
                  {isSidebarOpen && openMenu === "outils" && (
                     <div className="inline-tools-panel">
                        <div className="tools-row-inline">
                          <button className={`draw-tool-sm ${!activeDrawingTool ? "active" : ""}`} aria-label="Select" onClick={() => setActiveDrawingTool(null)}><MousePointer2 size={15} /></button>
                          <button className={`draw-tool-sm ${activeDrawingTool === "pen" ? "active" : ""}`} onClick={() => setActiveDrawingTool("pen")} title="Stylo"><PenTool size={15} /></button>
                          <button className={`draw-tool-sm ${activeDrawingTool === "marker" ? "active" : ""}`} onClick={() => setActiveDrawingTool("marker")} title="Marqueur"><Minus size={15} strokeWidth={4} /></button>
                          <button className={`draw-tool-sm ${activeDrawingTool === "highlighter" ? "active" : ""}`} onClick={() => setActiveDrawingTool("highlighter")} title="Surligneur"><Highlighter size={15} /></button>
                          <button className={`draw-tool-sm ${activeDrawingTool === "eraser" ? "active" : ""}`} onClick={() => setActiveDrawingTool("eraser")} title="Gomme"><Eraser size={15} /></button>
                        </div>
                        <div className="tools-row-inline" style={{ marginTop: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>Couleur</span>
                          <div className="color-picker-wrap" style={{ flex: 1, padding: "4px 8px" }}>
                            <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} />
                            <span>{drawingColor}</span>
                          </div>
                        </div>
                        <div className="tools-row-inline" style={{ marginTop: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>Insérer</span>
                          <div style={{ display: "flex", gap: 6 }}>
                             <button className="draw-tool-sm" onClick={() => spawnToolElement("table")} title="Tableau"><Table size={15} /></button>
                             <button className="draw-tool-sm" onClick={() => spawnToolElement("sticker")} title="Sticker"><Star size={15} /></button>
                             <button className="draw-tool-sm" onClick={() => spawnToolElement("emoji")} title="Emoji"><Smile size={15} /></button>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>Épaisseur ({drawingWidth}px)</span>
                          <input type="range" min="1" max="20" value={drawingWidth} onChange={(e) => setDrawingWidth(Number(e.target.value))} className="w-full range-input" />
                        </div>
                     </div>
                  )}
                </div>
              </div>
            </aside>
          )}

          <main className="editor-canvas-area" onDragOver={e => e.preventDefault()} onDrop={handleCanvasDrop}>
            {isDesigner && corrections.length > 0 && (
              <div className="corrections-banner-wrap">
                <div className="corrections-banner" onClick={() => setShowCorrections(s => !s)}>
                  <span className="corrections-pulse" />
                  <span>Corrections</span>
                  <span className="corrections-toggle">{showCorrections ? "Hide" : "View"}</span>
                </div>
                {showCorrections && (
                  <div className="corrections-list">
                    {corrections.map((c, i) => (
                      <div key={i} className="correction-item">
                        <div className="correction-item__meta">
                          <span>{c.element_nom || "Element"} - {c.type_correction}</span>
                          <button className="btn-mark-read" onClick={() => markCorrectionAsRead(c._id)}>Mark as read</button>
                        </div>
                        <div className="correction-comment">
                          <div className="correction-comment__label">{c.label_element || c.id_element}</div>
                          <div className="correction-comment__text">{c.commentaire_admin || c.commentaire_client}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text Formatting Toolbar - Simplified Version */}
            {textToolbarVisible && (
              <div 
                className="text-formatting-toolbar" 
                style={{ 
                  position: 'fixed', 
                  left: textToolbarPosition.x + 'px', 
                  top: textToolbarPosition.y + 'px',
                  zIndex: 1000,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  gap: '2px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {/* Text Formatting */}
                <button 
                  onClick={() => applyTextFormat('bold')}
                  className="toolbar-btn-icon"
                  title="Gras"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.fontWeight === 'bold' ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.fontWeight === 'bold' ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Bold size={12} />
                </button>
                <button 
                  onClick={() => applyTextFormat('italic')}
                  className="toolbar-btn-icon"
                  title="Italique"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.fontStyle === 'italic' ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.fontStyle === 'italic' ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Italic size={12} />
                </button>
                <button 
                  onClick={() => applyTextFormat('underline')}
                  className="toolbar-btn-icon"
                  title="Souligner"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.underline ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.underline ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Type size={12} style={{ textDecoration: 'underline' }} />
                </button>
                <button 
                  onClick={() => applyTextFormat('strikethrough')}
                  className="toolbar-btn-icon"
                  title="Barrer"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.linethrough ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.linethrough ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Type size={12} style={{ textDecoration: 'line-through' }} />
                </button>

                {/* Separator */}
                <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />

                {/* Alignment */}
                <button 
                  onClick={() => applyTextFormat('align-left')}
                  className="toolbar-btn-icon"
                  title="Aligner à gauche"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.textAlign === 'left' ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.textAlign === 'left' ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <AlignLeft size={12} />
                </button>
                <button 
                  onClick={() => applyTextFormat('align-center')}
                  className="toolbar-btn-icon"
                  title="Centrer"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.textAlign === 'center' ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.textAlign === 'center' ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <AlignCenter size={12} />
                </button>
                <button 
                  onClick={() => applyTextFormat('align-right')}
                  className="toolbar-btn-icon"
                  title="Aligner à droite"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.textAlign === 'right' ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.textAlign === 'right' ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <AlignRight size={12} />
                </button>
                <button 
                  onClick={() => applyTextFormat('align-justify')}
                  className="toolbar-btn-icon"
                  title="Justifier"
                  style={{ 
                    padding: '6px', 
                    border: 'none', 
                    background: selectedObj?.textAlign === 'justify' ? '#6366f1' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    color: selectedObj?.textAlign === 'justify' ? 'white' : '#334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <AlignLeft size={12} style={{ transform: 'scaleX(1.3)' }} />
                </button>
              </div>
            )}
            {!designData
              ? <div className="loader-screen"><Loader size={40} className="spin" /><p>Chargement du studioâ€¦</p></div>
              : (
                <div ref={wrapperRef} className="canvas-shadow">
                  <div ref={canvasHostRef} className="canvas-host" />
                  <div className="video-overlay-layer">
                    {videoOverlayItems.map((item) => (
                      <div key={item.key}>
                        <div
                          className={`video-overlay-card ${item.isSelected ? "video-overlay-card--selected" : ""}`}
                          style={{
                            left: `${item.left}px`,
                            top: `${item.top}px`,
                            width: `${item.width}px`,
                            height: `${item.height}px`,
                            opacity: item.opacity,
                            zIndex: item.zIndex,
                            transform: item.angle ? `rotate(${item.angle}deg)` : "none",
                            pointerEvents: "none"
                          }}
                        >
                          {item.sourceKind === "youtube" ? (
                            <iframe
                              className="video-overlay-player"
                              src={item.embedSrc}
                              title="YouTube video preview"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{ pointerEvents: item.isSelected ? "auto" : "none" }}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                            />
                          ) : (
                            <video
                              ref={(node) => {
                                if (node) htmlVideoRefs.current[item.key] = node;
                                else delete htmlVideoRefs.current[item.key];
                              }}
                              className="video-overlay-player"
                              src={item.resolvedSrc}
                              autoPlay
                              loop
                              playsInline
                              preload="metadata"
                              controls={item.isSelected}
                              muted={selectedVideoOverlayItem?.key !== item.key ? true : selectedVideoUi.muted}
                              style={{ pointerEvents: item.isSelected ? "auto" : "none" }}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                              onLoadedMetadata={syncSelectedVideoUi}
                              onPlay={syncSelectedVideoUi}
                              onPause={syncSelectedVideoUi}
                              onVolumeChange={syncSelectedVideoUi}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          className="video-overlay-select"
                          style={{
                            left: `${item.left}px`,
                            top: `${item.top}px`,
                            width: `${item.width}px`,
                            height: `${item.height}px`,
                            zIndex: item.zIndex + 1,
                            transform: item.angle ? `rotate(${item.angle}deg)` : "none",
                            pointerEvents: item.isSelected ? "none" : "auto"
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onMouseUp={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            selectVideoObject(item.objectRef);
                          }}
                        >
                          {!item.isSelected && (
                            <span className="video-overlay-mask">
                              <Play size={18} />
                            </span>
                          )}
                        </button>
                        {item.isSelected && item.sourceKind === "direct" && (
                          <div
                            className="video-control-bar"
                            style={{
                              left: `${item.left + item.width / 2}px`,
                              top: `${Math.max(item.top + 12, item.top + item.height - 54)}px`,
                              zIndex: item.zIndex + 2,
                              transform: "translateX(-50%)"
                            }}
                            onMouseDown={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <button
                              type="button"
                              className="video-control-btn"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleSelectedVideoPlayback();
                              }}
                            >
                              {selectedVideoUi.playing ? "Pause" : "Play"}
                            </button>
                            <button
                              type="button"
                              className="video-control-btn"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleSelectedVideoMute();
                              }}
                            >
                              {selectedVideoUi.muted ? "Unmute" : "Mute"}
                            </button>
                            <div
                              className="video-control-volume"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Volume2 size={14} />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={selectedVideoUi.volume}
                                onMouseDown={(event) => event.stopPropagation()}
                                onInput={(event) => {
                                  event.stopPropagation();
                                  setSelectedVideoVolume(event.target.value);
                                }}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  setSelectedVideoVolume(event.target.value);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="map-overlay-layer" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'visible' }}>
                    {mapOverlayItems.map((item) => (
                      <div key={item.key} className={item.isSelected ? "video-overlay-card--selected" : "video-overlay-card"} style={{
                        position: 'absolute',
                        left: `${item.left}px`, top: `${item.top}px`, width: `${item.width}px`, height: `${item.height}px`,
                        opacity: item.opacity, zIndex: item.zIndex,
                        transform: item.angle ? `rotate(${item.angle}deg)` : "none",
                        pointerEvents: 'none'
                      }}>
                        <iframe
                          width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0"
                          src={item.iframeSrc}
                          style={{ pointerEvents: item.isSelected ? 'auto' : 'none', background: "#e2e8f0", border: 'none' }}
                        />
                        {!item.isSelected && (
                          <div 
                            style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'auto', cursor: 'pointer' }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              fabricCanvas.setActiveObject(item.objectRef); 
                              fabricCanvas.requestRenderAll(); 
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          </main>

          {isDesigner && (
            <aside className="editor-right-panel">
              {/* FIX: Added Images tab */}
              <div className="right-tabs">
                <button className={`right-tab ${rightTab === "props" ? "active" : ""}`} onClick={() => setRightTab("props")}>Propriétés</button>
                <button className={`right-tab ${rightTab === "layers" ? "active" : ""}`} onClick={() => setRightTab("layers")}><Layers size={13} /> Calques</button>
                <button className={`right-tab ${rightTab === "images" ? "active" : ""}`} onClick={() => setRightTab("images")}><Images size={13} /></button>
              </div>
              <div className="right-panel-body custom-scrollbar">
                {rightTab === "props" && (
                  <PropertiesPanel
                    selectedObject={selectedObj}
                    canvas={fabricCanvas}
                    onUpdate={() => { debouncedSave(fabricCanvas, designData?.version?._id); setLayersKey(k => k + 1); }}
                    imageHistory={imageHistory}
                    onReplaceImage={handleReplaceImage}
                    onSelectImageFromHistory={handleSelectImageFromHistory}
                    refreshKey={layersKey}
                    restoreInteractivity={restoreInteractivity}
                    setShowComponentEditor={setShowComponentEditor}
                    setEditorVariant={setEditorVariant}
                    setEditorData={setEditorData}
                  />
                )}
                
                {editorVariant === "button" && (
                  <ButtonEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "input" && (
                  <InputEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "profile" && (
                  <ProfileEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "pricing" && (
                  <PricingEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "slider" && (
                  <SliderEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "modal" && (
                  <ModalEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "card" && (
                  <CardEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "nav_menu" && (
                  <NavMenuEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "hero" && (
                  <HeroEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "tabs" && (
                  <TabsEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant === "table" && (
                  <TableEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {editorVariant && editorVariant.startsWith("chart_") && (
                  <ChartEditorModal isOpen={showComponentEditor} onClose={() => setShowComponentEditor(false)} component={editorData} onSave={handleComponentSave} />
                )}
                {rightTab === "layers" && (
                  <LayersPanel canvas={fabricCanvas} selectedObject={selectedObj} onSelectObject={setSelectedObj} refreshKey={layersKey} />
                )}
                {rightTab === "images" && (
                  <ImageHistoryPanel
                    imageHistory={imageHistory}
                    onReplaceImage={handleReplaceImage}
                    onSelectImage={handleSelectImageFromHistory}
                    canvas={fabricCanvas}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      <ModernModal isOpen={!!activeModal} onClose={() => setActiveModal(null)} title={activeModal?.title} content={activeModal?.content} />

      <EmojiPickerModal isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelect={spawnRealEmoji} />
      <StickerPickerModal isOpen={showStickerPicker} onClose={() => setShowStickerPicker(false)} onSelect={spawnRealSticker} />

      {rejetModal && (() => {
        const elementCommentsCount = rejetElements.filter((e) => e.commentaire_client && e.commentaire_client.trim()).length;
        const hasGeneralComment = Boolean(rejetGeneralComment.trim());
        const totalCommentsCount = elementCommentsCount + (hasGeneralComment ? 1 : 0);
        const totalPages = Math.max(1, Math.ceil(rejetElements.length / REJET_ELEMENTS_PER_PAGE));
        const currentPage = Math.min(rejetPage, totalPages);
        const pageStart = (currentPage - 1) * REJET_ELEMENTS_PER_PAGE;
        const paginatedRejetElements = rejetElements.slice(pageStart, pageStart + REJET_ELEMENTS_PER_PAGE);
        return (
        <div className="rejet-overlay" onClick={closeRejetModal}>
          <div className="rejet-modal" onClick={e => e.stopPropagation()}>
            <div className="rejet-modal__header">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div className="rejet-modal__icon-wrap">!</div>
                <div className="rejet-modal__hero">
                  <div className="rejet-modal__hero-top">
                    <span className="rejet-modal__eyebrow">Client review</span>
                    <span className="rejet-modal__version-chip">Version {currentVersionNum}</span>
                  </div>
                  <h3 className="rejet-modal__title">Rejeter la version {currentVersionNum}</h3>
                  <p className="rejet-modal__subtitle">Ajoutez une remarque generale et, si besoin, des commentaires precis sur chaque element.</p>
                  <div className="rejet-modal__hero-stats">
                    <div className="rejet-stat-pill">
                      <span className="rejet-stat-pill__label">Elements</span>
                      <strong>{rejetElements.length}</strong>
                    </div>
                    <div className="rejet-stat-pill rejet-stat-pill--success">
                      <span className="rejet-stat-pill__label">Commentaires</span>
                      <strong>{totalCommentsCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={closeRejetModal} className="rejet-modal__close" type="button">×</button>
            </div>
            <div className="rejet-modal__counter">
              <span>{rejetElements.length} element{rejetElements.length > 1 ? "s" : ""} analyses</span>
              <div className="rejet-modal__counter-right">
                <div className="rejet-progress">
                  <span
                    className="rejet-progress__bar"
                    style={{ width: `${rejetElements.length ? Math.min(100, Math.round((elementCommentsCount / rejetElements.length) * 100)) : 0}%` }}
                  />
                </div>
                <span className="rejet-modal__counter-ok">{totalCommentsCount} remarque{totalCommentsCount > 1 ? "s" : ""} prete{totalCommentsCount > 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="rejet-modal__body">
              <section className="rejet-section rejet-section--general">
                <div className="rejet-section__title-wrap">
                  <span className="rejet-section__badge">General</span>
                  <h4 className="rejet-section__title">Pourquoi cette version doit etre corrigee ?</h4>
                </div>
                <textarea
                  value={rejetGeneralComment}
                  onChange={(e) => setRejetGeneralComment(e.target.value)}
                  placeholder="Expliquez le probleme global: ton visuel, coherence, respect du brief, priorites..."
                  rows={4}
                  className="rejet-el__textarea rejet-el__textarea--general"
                />
              </section>

              <section className="rejet-section">
                <div className="rejet-section__title-wrap">
                  <span className="rejet-section__badge">Elements</span>
                  <h4 className="rejet-section__title">Commentaires par element</h4>
                  {rejetElements.length > 0 && (
                    <span className="rejet-section__meta">
                      Page {currentPage}/{totalPages} - elements {pageStart + 1} a {Math.min(pageStart + REJET_ELEMENTS_PER_PAGE, rejetElements.length)}
                    </span>
                  )}
                </div>

                {rejetElements.length === 0 ? (
                  <div className="rejet-modal__empty"><span>!</span><p>Aucun element detecte sur le design.</p></div>
                ) : (
                  <div className="rejet-grid">
                    {paginatedRejetElements.map((el) => (
                      <div key={el._uiId} className={`rejet-el ${el.commentaire_client && el.commentaire_client.trim() ? "rejet-el--active" : ""}`}>
                        <div className="rejet-el__head">
                          <div className="rejet-el__thumb-wrap">
                            {el._thumbnail ? <img src={el._thumbnail} alt={el.label_element} className="rejet-el__thumb" /> : <div className="rejet-el__thumb-fb">{el._typeIcon || "?"}</div>}
                            {el.commentaire_client && el.commentaire_client.trim() && <span className="rejet-el__check">!</span>}
                          </div>
                          <div className="rejet-el__info">
                            <span className="rejet-el__name">{el.label_element}</span>
                            <span className="rejet-el__type">{el._type || "element"}</span>
                          </div>
                          <div className={`rejet-el__status ${el.commentaire_client && el.commentaire_client.trim() ? "is-complete" : ""}`}>
                            {el.commentaire_client && el.commentaire_client.trim() ? "Commente" : "En attente"}
                          </div>
                        </div>
                        <div className="rejet-el__body">
                          <textarea
                            value={el.commentaire_client || ""}
                            onChange={(e) => updateRejetElementComment(el._uiId, e.target.value)}
                            placeholder="Decrivez la correction souhaitee pour cet element..."
                            rows={4}
                            className="rejet-el__textarea"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rejetElements.length > REJET_ELEMENTS_PER_PAGE && (
                  <div className="rejet-pagination">
                    <button
                      type="button"
                      className="rejet-pagination__btn"
                      onClick={() => setRejetPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Precedent
                    </button>
                    <div className="rejet-pagination__pages">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            className={`rejet-pagination__page ${pageNumber === currentPage ? "is-active" : ""}`}
                            onClick={() => setRejetPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="rejet-pagination__btn"
                      onClick={() => setRejetPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </section>
            </div>
            <div className="rejet-modal__footer">
              <div className="rejet-modal__footer-info">
                {totalCommentsCount === 0
                  ? <span style={{ color: "var(--muted)" }}>Aucune remarque ecrite: un rejet general sera envoye.</span>
                  : <span style={{ color: "#059669" }}>{totalCommentsCount} remarque{totalCommentsCount > 1 ? "s" : ""} prete{totalCommentsCount > 1 ? "s" : ""} a envoyer</span>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={closeRejetModal} disabled={rejetSubmitting} className="btn-cancel" type="button">Annuler</button>
                <button onClick={handleRejetSubmit} disabled={rejetSubmitting} className="btn-submit-rejet" type="button">
                  {rejetSubmitting ? <><Loader size={13} className="spin" /> Envoi...</> : <>Justifier le rejet</>}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()};

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        :root {
          --font: 'Inter', system-ui, -apple-system, sans-serif;
          --bg: #f8fafc;
          --canvas-bg: #f1f5f9;
          --surface: #ffffff;
          --surface-2: #f8fafc;
          --surface-3: #f1f5f9;
          --border: #e2e8f0;
          --border-2: #cbd5e1;
          --text: #0f172a;
          --text-2: #334155;
          --muted: #64748b;
          --primary: #6366f1;
          --primary-dark: #4f46e5;
          --primary-bg: #eef2ff;
          --primary-border: #c7d2fe;
          --danger: #ef4444;
          --danger-bg: #fef2f2;
          --danger-border: #fee2e2;
          --success: #10b981;
          --success-bg: #ecfdf5;
          --warn: #f59e0b;
          --warn-bg: #fffbeb;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          --r: 8px;
          --r-lg: 12px;
          --sidebar-w: 260px;
          --panel-w: 280px;
          --header-h: 60px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font); background: var(--bg); color: var(--text); overflow: hidden; -webkit-font-smoothing: antialiased; }

        .editor-layout { display: flex; flex-direction: column; height: 100vh; width: 100vw; position: fixed; inset: 0; }
        .editor-body { display: flex; flex: 1; overflow: hidden; }

        .editor-header {
          height: var(--header-h); background: var(--surface); display: flex; align-items: center;
          justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow-sm); z-index: 20; position: relative; gap: 12px;
        }
        .header-left, .header-right { display: flex; align-items: center; gap: 12px; }
        .header-center { position: absolute; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; align-items: center; }
        .btn-back { width: 36px; height: 36px; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface); color: var(--text-2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
        .btn-back:hover { background: var(--surface-2); color: var(--text); border-color: var(--border-2); transform: scale(1.02); }
        .header-divider { width: 1px; height: 24px; background: var(--border); }
        .header-title { font-size: 15px; font-weight: 600; color: var(--text); white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }

        .version-btn { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: var(--r); background: var(--primary-bg); color: var(--primary); border: 1px solid var(--primary-border); cursor: pointer; transition: all 0.2s ease; }
        .version-btn:hover:not(:disabled) { background: #e0e7ff; transform: translateY(-1px); }
        .version-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-new-version { width: 32px; height: 32px; border-radius: var(--r); background: var(--primary); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
        .btn-new-version:hover:not(:disabled) { background: var(--primary-dark); transform: scale(1.05); }
        .btn-new-version:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-badge { font-size: 11px; font-weight: 500; color: var(--muted); background: var(--surface-2); border: 1px solid var(--border); padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 6px; white-space: nowrap; }

        .version-dropdown { position: absolute; top: calc(100% + 8px); left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-xl); min-width: 280px; z-index: 9999; overflow: hidden; animation: dropIn 0.2s ease; }
        @keyframes dropIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .version-dropdown__header { padding: 10px 16px; border-bottom: 1px solid var(--border); font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
        .version-dropdown__list { max-height: 320px; overflow-y: auto; }
        .version-dropdown__empty { padding: 20px; text-align: center; font-size: 13px; color: var(--muted); }
        .version-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--surface-2); cursor: pointer; transition: background 0.15s; }
        .version-item:hover:not(.version-item--current) { background: var(--surface-2); }
        .version-item--current { background: var(--primary-bg); cursor: default; }
        .version-item__icon { width: 32px; height: 32px; border-radius: 8px; background: var(--surface-3); display: flex; align-items: center; justify-content: center; color: var(--muted); flex-shrink: 0; }
        .version-item--current .version-item__icon { background: var(--primary-bg); color: var(--primary); }
        .version-item__info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .version-item__name { font-size: 13px; font-weight: 600; color: var(--text); }
        .version-item--current .version-item__name { color: var(--primary); }
        .version-item__badge { margin-left: 8px; font-size: 9px; background: var(--primary); color: white; border-radius: 10px; padding: 2px 8px; }
        .version-item__date { font-size: 10px; color: var(--muted); }
        .version-item__load { font-size: 11px; font-weight: 500; color: var(--text-2); display: flex; align-items: center; gap: 4px; }
        .version-item__delete { width: 28px; height: 28px; border-radius: 6px; background: transparent; border: none; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .version-item__delete:hover { background: var(--danger-bg); transform: scale(1.05); }

        .toolbar-pill { display: flex; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; height: 38px; box-shadow: var(--shadow-sm); }
        .toolbar-btn { display: flex; align-items: center; gap: 6px; padding: 0 14px; height: 100%; font-size: 12px; font-weight: 500; background: none; border: none; color: var(--text-2); cursor: pointer; transition: all 0.2s; }
        .toolbar-btn:hover { background: var(--surface-2); color: var(--text); }
        .toolbar-btn.active { background: var(--primary-bg); color: var(--primary); font-weight: 600; }
        .toolbar-sep { width: 1px; height: 20px; background: var(--border); }
        .zoom-pill { padding: 0 4px; gap: 0; }
        .toolbar-btn-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--text-2); cursor: pointer; border-radius: 6px; transition: all 0.2s; }
        .toolbar-btn-icon:hover { background: var(--surface-2); color: var(--text); }
        .zoom-val { font-size: 12px; font-weight: 600; width: 48px; text-align: center; cursor: pointer; color: var(--text); }

        .btn-ghost { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; background: var(--surface); border: 1px solid var(--border); color: var(--text-2); padding: 7px 14px; border-radius: var(--r); cursor: pointer; transition: all 0.2s; font-family: var(--font); }
        .btn-ghost:hover { background: var(--surface-2); border-color: var(--border-2); color: var(--text); transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; padding: 8px 18px; font-size: 13px; font-weight: 600; border-radius: var(--r); cursor: pointer; transition: all 0.2s; font-family: var(--font); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        .client-actions { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: 20px; border: 1px solid rgba(226,232,240,0.9); background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.92)); box-shadow: 0 14px 34px rgba(15,23,42,0.08); backdrop-filter: blur(10px); }
        .btn-reject, .btn-validate { position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 44px; padding: 0 18px; font-size: 12px; font-weight: 800; letter-spacing: 0.01em; cursor: pointer; transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease, color 0.22s ease; font-family: var(--font); overflow: hidden; }
        .btn-reject::before, .btn-validate::before { content: ""; position: absolute; inset: 1px; border-radius: inherit; z-index: -1; opacity: 0.95; transition: opacity 0.22s ease; }
        .btn-reject { color: #b91c1c; border: 1px solid rgba(248,113,113,0.28); border-radius: 16px; background: rgba(255,255,255,0.86); box-shadow: 0 10px 24px rgba(248,113,113,0.12); }
        .btn-reject::before { background: linear-gradient(180deg, rgba(255,245,245,0.98), rgba(255,255,255,0.96)); }
        .btn-reject:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(239,68,68,0.36); box-shadow: 0 18px 30px rgba(239,68,68,0.16); }
        .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .btn-validate { color: white; border: 1px solid rgba(16,185,129,0.15); border-radius: 16px; background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 16px 28px rgba(16,185,129,0.28); }
        .btn-validate::before { background: linear-gradient(135deg, rgba(52,211,153,0.35), rgba(5,150,105,0.15)); opacity: 1; }
        .btn-validate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 22px 34px rgba(16,185,129,0.36); filter: saturate(1.04); }
        .btn-validate:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-reject svg, .btn-validate svg { flex-shrink: 0; }
        .btn-reject:focus-visible, .btn-validate:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(255,255,255,0.9), 0 0 0 7px rgba(99,102,241,0.18); }
        .ver-tag { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 24px; padding: 0 9px; margin-left: 2px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 0.03em; border: 1px solid rgba(148,163,184,0.16); background: rgba(15,23,42,0.06); color: inherit; }
        .ver-tag--light { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.18); color: white; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; border-radius: var(--r); padding: 8px 16px; font-size: 12px; font-weight: 700; }
        .status-pill--success { background: var(--success-bg); color: #059669; border: 1px solid rgba(5,150,105,0.2); }
        .status-pill--warn { background: var(--warn-bg); color: #d97706; border: 1px solid rgba(217,119,6,0.2); }

        .modern-toast { position: fixed; top: 80px; right: 20px; z-index: 10000; display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-radius: var(--r-lg); color: var(--text); font-weight: 500; font-size: 13px; box-shadow: var(--shadow-xl); border-left: 4px solid; animation: slideInRight 0.3s ease; background: rgba(255,255,255,0.97); backdrop-filter: blur(8px); }
        .modern-toast--success { border-left-color: var(--success); }
        .modern-toast--info { border-left-color: var(--primary); }
        .modern-toast--error { border-left-color: var(--danger); }
        .modern-toast--warning { border-left-color: var(--warn); }
        .modern-toast__icon { display: flex; align-items: center; }
        .modern-toast--success .modern-toast__icon { color: var(--success); }
        .modern-toast--info .modern-toast__icon { color: var(--primary); }
        .modern-toast__message { margin: 0; flex: 1; }
        .modern-toast__close { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 4px; border-radius: 4px; transition: all 0.2s; }
        .modern-toast__close:hover { background: var(--surface-2); color: var(--text); }
        @keyframes slideInRight { from { opacity:0; transform:translateX(80px); } to { opacity:1; transform:translateX(0); } }

        .modern-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
        .modern-modal { background: var(--surface); border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; box-shadow: var(--shadow-xl); animation: scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1); }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .modern-modal__header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .modern-modal__header h3 { font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
        .modern-modal__close { background: var(--surface-2); border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-2); transition: all 0.2s; }
        .modern-modal__close:hover { background: var(--surface-3); transform: rotate(90deg); }
        .modern-modal__body { padding: 24px; font-size: 14px; line-height: 1.6; color: var(--text-2); }
        .modern-modal__footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
        .modern-modal__btn { padding: 8px 20px; border-radius: var(--r); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: var(--font); }
        .modern-modal__btn--primary { background: var(--primary); color: white; border: none; }
        .modern-modal__btn--primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
        .modern-modal__btn--secondary { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-2); }
        .modern-modal__btn--secondary:hover { background: var(--surface-3); }

        .editor-sidebar { width: var(--sidebar-w); background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; transition: width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .editor-sidebar.collapsed { width: 68px; }
        .sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
        .editor-sidebar.collapsed .sidebar-header { justify-content: center; padding: 14px 0; }
        .sidebar-toggle-btn { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--muted); transition: all 0.2s; }
        .sidebar-toggle-btn:hover { background: var(--surface-3); color: var(--text); border-color: var(--border-2); transform: scale(1.05); }
        .sidebar-scroll { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 4px; overflow-x: hidden; }
        .editor-sidebar.collapsed .sidebar-scroll { padding: 12px 6px; }
        .menu-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 12px; background: transparent; border: none; border-radius: var(--r); cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text); transition: all 0.2s; font-family: var(--font); }
        .menu-trigger:hover { background: var(--surface-2); }
        .menu-trigger.active { background: var(--primary-bg); color: var(--primary); }
        .editor-sidebar.collapsed .menu-trigger { padding: 14px 0; justify-content: center; }
        .menu-trigger-left { display: flex; align-items: center; gap: 10px; }
        .editor-sidebar.collapsed .menu-trigger-left { gap: 0; }
        .editor-sidebar.collapsed .menu-trigger-left span { display: none; }
        .chevron { color: var(--muted); transition: transform 0.2s; flex-shrink: 0; }
        .chevron.open { transform: rotate(180deg); }
        .menu-content { max-height: 0; overflow: hidden; opacity: 0; transition: all 0.25s ease; }
        .menu-content.open { max-height: 800px; opacity: 1; padding: 8px 4px 12px; }
        .editor-sidebar.collapsed .menu-content { display: none; }
        .editor-sidebar.collapsed .menu-content.tools-content { display: block; overflow: visible; padding: 0; }
        .tool-list { display: flex; flex-direction: column; gap: 4px; }
        .tool-btn-list { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); font-size: 12px; font-weight: 500; color: var(--text-2); cursor: pointer; transition: all 0.2s; font-family: var(--font); user-select: none; }
        .tool-btn-list:hover:not(:disabled) { border-color: var(--primary-border); color: var(--primary); background: var(--primary-bg); transform: translateX(2px); }
        .icon-wrap { color: var(--muted); transition: all 0.2s; flex-shrink: 0; }
        .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tool-btn-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); cursor: pointer; transition: all 0.2s; text-align: center; font-family: var(--font); user-select: none; }
        .tool-btn-box span { font-size: 11px; font-weight: 500; color: var(--muted); }
        .tool-btn-box .icon-wrap { color: var(--text-2); }
        .tool-btn-box:hover:not(:disabled) { border-color: var(--primary-border); background: var(--primary-bg); transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .tool-btn-box:hover:not(:disabled) span, .tool-btn-box:hover:not(:disabled) .icon-wrap { color: var(--primary); }

        /* Drawing popover styles */
        .drawing-tools-popover { position: absolute; left: 80px; top: -50px; background: var(--surface); padding: 12px; border-radius: var(--r-lg); box-shadow: var(--shadow-xl); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; z-index: 1000; animation: scaleInLeft 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes scaleInLeft { from { opacity: 0; transform: scale(0.9) translateX(-10px); } to { opacity: 1; transform: scale(1) translateX(0); } }
        .drawing-popover-close { position: absolute; top: 8px; right: 8px; background: transparent; border: none; cursor: pointer; color: var(--muted); }
        .drawing-popover-close:hover { color: var(--danger); }
        .draw-tool { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: var(--surface-2); border: 1px solid transparent; border-radius: 12px; cursor: pointer; color: var(--text-2); transition: all 0.2s; }
        .draw-tool:hover { background: var(--surface-3); transform: translateY(-2px); }
        .draw-tool.active { background: var(--primary-bg); border-color: var(--primary-border); color: var(--primary); box-shadow: var(--shadow-sm); }
        .tool-icon-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .tool-color-indicator { width: 16px; height: 4px; border-radius: 2px; }
        .draw-sep { height: 1px; width: 100%; background: var(--border); }
        .draw-color-pickers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .draw-color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; box-shadow: var(--shadow-sm); transition: transform 0.2s; }
        .draw-color-swatch:hover { transform: scale(1.1); }
        .draw-color-swatch.active { border-color: var(--surface); box-shadow: 0 0 0 2px var(--primary); transform: scale(1.15); }
        .draw-range { width: 100%; height: 6px; border-radius: 3px; background: var(--surface-3); outline: none; -webkit-appearance: none; accent-color: var(--primary); margin: 8px 0; }
        
        .inline-tools-panel { padding: 12px 8px; background: var(--surface-2); border-radius: var(--r); border: 1px solid var(--border); margin-top: 8px; }
        .tools-row-inline { display: flex; align-items: center; gap: 8px; justify-content: space-between; }
        .draw-tool-sm { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; color: var(--text-2); transition: all 0.2s; }
        .draw-tool-sm:hover { background: var(--surface-2); transform: translateY(-1px); }
        .draw-tool-sm.active { background: var(--primary-bg); border-color: var(--primary-border); color: var(--primary); }

        .editor-canvas-area { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 40px; background: var(--canvas-bg); background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px); background-size: 24px 24px; position: relative; }
        .canvas-shadow { position: relative; box-shadow: var(--shadow-xl); border-radius: 12px; overflow: visible; background: white; transition: box-shadow 0.3s; isolation: isolate; }
        .canvas-shadow:hover { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .canvas-host { position: relative; z-index: 1; overflow: hidden; border-radius: 12px; }
        .canvas-host canvas { display: block; }
        .video-overlay-layer { position: absolute; inset: 0; z-index: 3; pointer-events: none; overflow: visible; }
        .video-overlay-card { position: absolute; overflow: hidden; border-radius: 14px; background: #020617; box-shadow: 0 12px 32px rgba(15,23,42,0.18); transform-origin: center center; }
        .video-overlay-card--selected { box-shadow: 0 0 0 2px rgba(99,102,241,0.45), 0 16px 36px rgba(15,23,42,0.22); }
        .video-overlay-player { width: 100%; height: 100%; display: block; border: 0; background: #020617; }
        .video-overlay-select { position: absolute; border: none; background: transparent; padding: 0; margin: 0; pointer-events: auto; cursor: pointer; border-radius: 14px; transform-origin: center center; }
        .video-overlay-mask { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.26)); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.9); pointer-events: none; border-radius: 14px; }
        .video-control-bar { position: absolute; display: flex; align-items: center; gap: 8px; background: rgba(15,23,42,0.92); color: white; border-radius: 999px; padding: 8px 12px; pointer-events: auto; box-shadow: 0 12px 24px rgba(15,23,42,0.22); }
        .video-control-btn { border: none; background: rgba(255,255,255,0.12); color: white; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .video-control-btn:hover { background: rgba(255,255,255,0.2); }
        .video-control-volume { display: flex; align-items: center; gap: 6px; min-width: 120px; }
        .video-control-volume input { width: 100%; accent-color: #6366f1; }
        .loader-screen { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--muted); font-size: 14px; font-weight: 500; }

        .corrections-banner-wrap { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100; width: calc(100% - 48px); max-width: 720px; }
        .corrections-banner { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg,#dc2626,#b91c1c); border-radius: var(--r-lg); padding: 12px 20px; cursor: pointer; color: white; font-weight: 700; font-size: 12px; box-shadow: 0 4px 16px rgba(220,38,38,0.4); transition: transform 0.2s; }
        .corrections-banner:hover { transform: translateY(-2px); }
        .corrections-pulse { width: 8px; height: 8px; border-radius: 50%; background: white; flex-shrink: 0; animation: pulse 1.5s ease-in-out infinite; }
        .corrections-toggle { margin-left: auto; font-size: 10px; opacity: 0.9; }
        .corrections-list { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); margin-top: 8px; overflow: hidden; box-shadow: var(--shadow-lg); }
        .correction-item { padding: 16px 20px; border-bottom: 1px solid var(--surface-2); }
        .correction-item:last-child { border-bottom: none; }
        .correction-item__meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .btn-mark-read { background: var(--primary-bg); color: var(--primary); border: none; border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: var(--font); transition: all 0.2s; }
        .btn-mark-read:hover { background: var(--primary-border); transform: scale(1.02); }
        .correction-comment { background: #fff7f7; border: 1px solid var(--danger-border); border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; }
        .correction-comment__label { font-size: 10px; font-weight: 700; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; }
        .correction-comment__text { font-size: 13px; color: var(--text); line-height: 1.5; }

        .editor-right-panel { width: var(--panel-w); background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
        .right-tabs { display: flex; background: var(--surface-2); border-bottom: 1px solid var(--border); padding: 6px 8px 0; gap: 4px; }
        .right-tab { flex: 1; padding: 10px 8px; font-size: 11px; font-weight: 600; color: var(--muted); background: none; border: none; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; font-family: var(--font); }
        .right-tab.active { color: var(--primary); background: var(--surface); font-weight: 700; }
        .right-panel-body { flex: 1; overflow-y: auto; padding: 16px; }

        .props-empty { text-align: center; color: var(--muted); padding: 48px 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; font-size: 13px; line-height: 1.5; }
        .props-empty-icon { width: 64px; height: 64px; border-radius: var(--r-lg); background: var(--surface-2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--muted); }
        .props-section { margin-bottom: 24px; }
        .props-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .props-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 0; }
        .props-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 12px; }
        .prop-field { display: flex; flex-direction: column; gap: 4px; }
        .prop-field-label { font-size: 10px; font-weight: 600; color: var(--muted); }
        .prop-field-input { border: 1px solid var(--border); background: var(--surface-2); border-radius: 6px; padding: 7px 9px; font-size: 12px; font-family: monospace; width: 100%; outline: none; transition: all 0.2s; }
        .prop-field-input:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 3px var(--primary-bg); }
        .props-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .props-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
        .color-row { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; background: var(--surface-2); }
        .props-color { border: none; width: 24px; height: 24px; cursor: pointer; border-radius: 4px; padding: 0; background: none; }
        .color-hex { font-size: 11px; color: var(--muted); font-family: monospace; }
        .props-input-sm { width: 60px; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 12px; text-align: center; background: var(--surface-2); outline: none; font-family: monospace; }
        .props-input-sm:focus { border-color: var(--primary); background: white; }
        .props-input-xs { width: 100%; border: 1px solid var(--border); border-radius: 5px; padding: 6px 4px; font-size: 11px; text-align: center; background: var(--surface-2); outline: none; font-family: monospace; }
        .props-select { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2); font-size: 12px; font-family: var(--font); }
        .btn-group { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .props-toggle { flex: 1; background: var(--surface-2); border: none; border-right: 1px solid var(--border); padding: 8px 10px; cursor: pointer; display: flex; justify-content: center; color: var(--muted); transition: all 0.2s; }
        .props-toggle:last-child { border: none; }
        .props-toggle.active { background: white; color: var(--primary); }
        .custom-checkbox { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
        .btn-edit-component { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px; background: var(--primary-bg); border: 1px solid var(--primary-border); border-radius: var(--r); color: var(--primary); font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s; font-family: var(--font); }
        .btn-edit-component:hover { background: #e0e7ff; transform: translateY(-1px); }

        .layers-panel { display: flex; flex-direction: column; gap: 12px; }
        .layers-order-btns { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
        .layers-order-btns button { padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); cursor: pointer; color: var(--muted); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .layers-order-btns button:hover:not(:disabled) { color: var(--primary); background: var(--primary-bg); border-color: var(--primary-border); transform: scale(1.02); }
        .layer-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: var(--r); cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s; border: 1px solid transparent; }
        .layer-item:hover { background: var(--surface-2); transform: translateX(2px); }
        .layer-item.selected { background: var(--primary-bg); color: var(--primary); border-color: var(--primary-border); }
        .layer-thumb { width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; }
        .layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .layer-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
        .layer-item:hover .layer-actions, .layer-item.selected .layer-actions { opacity: 1; }
        .layer-actions button { background: var(--surface); border: 1px solid var(--border); padding: 5px; border-radius: 4px; cursor: pointer; color: var(--muted); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .layer-actions button:hover { border-color: var(--primary-border); color: var(--primary); transform: scale(1.05); }
        .icon-danger { color: var(--danger) !important; }

        /* â”€â”€ Image History Panel â”€â”€ */
        .img-history-empty { text-align: center; color: var(--muted); padding: 40px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; }
        .img-history-empty span { font-size: 11px; color: var(--border-2); }
        .img-history-panel { display: flex; flex-direction: column; gap: 8px; }
        .img-history-item { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: var(--r); cursor: pointer; transition: all 0.2s; background: var(--surface); }
        .img-history-item:hover { border-color: var(--primary-border); background: var(--primary-bg); transform: translateX(2px); }
        .img-history-thumb-wrap { flex-shrink: 0; width: 52px; height: 40px; border-radius: 6px; overflow: hidden; background: var(--surface-3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; }
        .img-history-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-history-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .img-history-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .img-history-meta { font-size: 10px; color: var(--muted); }
        .img-history-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .img-history-btn { width: 28px; height: 28px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--muted); transition: all 0.2s; }
        .img-history-btn:hover { background: var(--primary-bg); border-color: var(--primary-border); color: var(--primary); transform: scale(1.05); }

        .component-editor-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); z-index: 10002; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
        .component-editor-modal { background: var(--surface); border-radius: 20px; width: 100%; max-width: 540px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-xl); animation: scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1); }
        .component-editor-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to right, var(--primary-bg), var(--surface)); }
        .component-editor-header h3 { font-size: 17px; font-weight: 700; color: var(--text); margin: 0; }
        .component-editor-header button { background: var(--surface-2); border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-2); transition: all 0.2s; }
        .component-editor-header button:hover { background: var(--surface-3); transform: rotate(90deg); }
        .component-editor-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; }
        .editor-field { display: flex; flex-direction: column; gap: 6px; }
        .editor-field label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .editor-field input[type="text"], .editor-field input[type="number"], .editor-field input[type="email"], .editor-field select, .editor-field textarea { padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--r); font-size: 13px; font-family: var(--font); background: var(--surface-2); transition: all 0.2s; color: var(--text); width: 100%; resize: vertical; }
        .editor-field input:focus, .editor-field select:focus, .editor-field textarea:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 3px var(--primary-bg); }
        .editor-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .editor-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .color-picker-wrap { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border: 1.5px solid var(--border); border-radius: var(--r); background: var(--surface-2); transition: border-color 0.2s; }
        .color-picker-wrap:focus-within { border-color: var(--primary); }
        .color-picker-wrap input[type="color"] { width: 32px; height: 28px; border: none; padding: 0; cursor: pointer; border-radius: 6px; background: none; }
        .color-picker-wrap span { font-size: 12px; color: var(--muted); font-family: monospace; }
        .size-selector { display: flex; gap: 8px; }
        .size-btn { flex: 1; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: var(--r); font-size: 12px; font-weight: 600; background: var(--surface-2); color: var(--text-2); cursor: pointer; transition: all 0.2s; font-family: var(--font); text-align: center; }
        .size-btn.active { border-color: var(--primary); background: var(--primary-bg); color: var(--primary); }
        .size-btn:hover:not(.active) { border-color: var(--border-2); background: var(--surface-3); }
        .range-input { width: 100%; height: 6px; accent-color: var(--primary); cursor: pointer; }
        .toggle-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .toggle-wrap input[type="checkbox"] { display: none; }
        .toggle-slider-ui { display: inline-block; width: 40px; height: 22px; background: #e2e8f0; border-radius: 11px; position: relative; transition: background 0.2s; cursor: pointer; }
        .toggle-slider-ui::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .toggle-wrap input:checked + .toggle-slider-ui { background: var(--primary); }
        .toggle-wrap input:checked + .toggle-slider-ui::after { transform: translateX(18px); }
        .component-editor-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
        .btn-cancel { background: var(--surface-2); border: 1px solid var(--border); padding: 9px 20px; border-radius: var(--r); font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font); transition: all 0.2s; color: var(--text-2); }
        .btn-cancel:hover { background: var(--surface-3); transform: translateY(-1px); }
        .btn-save { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; padding: 9px 24px; border-radius: var(--r); font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font); transition: all 0.2s; }
        .btn-save:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }

        .pricing-editor { max-width: 680px; }
        .pricing-row-editor { background: var(--surface-2); border-radius: var(--r-lg); padding: 18px; margin-bottom: 16px; border: 1px solid var(--border); }
        .pricing-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .pricing-row-header h4 { font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }
        .btn-icon-danger { background: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: 6px; padding: 5px 10px; cursor: pointer; color: var(--danger); transition: all 0.2s; }
        .btn-icon-danger:hover { background: var(--danger-border); transform: scale(1.02); }
        .feature-item { display: flex; gap: 10px; margin-bottom: 8px; align-items: center; }
        .feature-item input { flex: 1; }
        .btn-icon-sm { background: var(--surface-3); border: 1px solid var(--border); border-radius: 5px; padding: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .btn-icon-sm:hover { background: var(--surface); transform: scale(1.02); }
        .btn-add-feature { background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r); padding: 8px 14px; font-size: 11px; font-weight: 500; cursor: pointer; width: 100%; text-align: center; margin-top: 8px; transition: all 0.2s; color: var(--primary); }
        .btn-add-feature:hover { background: var(--primary-bg); border-color: var(--primary-border); transform: translateY(-1px); }
        .btn-add-row { background: var(--primary-bg); border: 1px solid var(--primary-border); border-radius: var(--r); padding: 12px; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 12px; transition: all 0.2s; color: var(--primary); font-family: var(--font); }
        .btn-add-row:hover { background: #e0e7ff; transform: translateY(-1px); }

        .rejet-overlay { position: fixed; inset: 0; background:
          radial-gradient(circle at top, rgba(239,68,68,0.16), transparent 28%),
          linear-gradient(180deg, rgba(15,23,42,0.84), rgba(15,23,42,0.92));
          backdrop-filter: blur(18px) saturate(140%); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 18px; animation: fadeIn 0.3s ease; }
        .rejet-modal { position: relative; background:
          linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%);
          border-radius: 24px; width: 100%; max-width: 760px; max-height: 88vh; overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 40px 90px rgba(2,6,23,0.35), 0 0 0 1px rgba(255,255,255,0.45);
          animation: slideUp 0.42s cubic-bezier(0.16,1,0.3,1); border: 1px solid rgba(255,255,255,0.4); }
        .rejet-modal::before { content: ""; position: absolute; inset: 0; pointer-events: none; background:
          radial-gradient(circle at top right, rgba(220,38,38,0.12), transparent 22%),
          radial-gradient(circle at top left, rgba(99,102,241,0.08), transparent 18%); }
        .rejet-modal__header { padding: 20px 22px 14px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(226,232,240,0.9); background: linear-gradient(135deg, rgba(254,242,242,0.95), rgba(255,255,255,0.82)); flex-shrink: 0; position: relative; }
        .rejet-modal__hero { display: flex; flex-direction: column; gap: 8px; }
        .rejet-modal__hero-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rejet-modal__eyebrow { display: inline-flex; align-items: center; padding: 5px 10px; border-radius: 999px; background: rgba(15,23,42,0.06); color: #b91c1c; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .rejet-modal__version-chip { display: inline-flex; align-items: center; padding: 5px 10px; border-radius: 999px; background: white; border: 1px solid rgba(248,113,113,0.22); color: var(--text); font-size: 12px; font-weight: 700; box-shadow: 0 8px 20px rgba(15,23,42,0.06); }
        .rejet-modal__hero-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rejet-stat-pill { min-width: 96px; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,0.84); border: 1px solid rgba(226,232,240,0.95); display: flex; flex-direction: column; gap: 2px; box-shadow: 0 8px 18px rgba(15,23,42,0.05); }
        .rejet-stat-pill--success { background: linear-gradient(180deg, rgba(236,253,245,0.95), rgba(255,255,255,0.95)); border-color: rgba(16,185,129,0.18); }
        .rejet-stat-pill strong { font-size: 14px; line-height: 1; color: var(--text); }
        .rejet-stat-pill__label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .rejet-modal__icon-wrap { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg,#ef4444,#b91c1c); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: white; flex-shrink: 0; box-shadow: 0 14px 24px rgba(220,38,38,0.28); }
        .rejet-modal__title { font-size: 20px; font-weight: 900; color: var(--text); margin: 0; letter-spacing: -0.04em; }
        .rejet-modal__subtitle { max-width: 560px; font-size: 13px; color: var(--text-2); margin: 0; line-height: 1.55; font-weight: 500; }
        .rejet-modal__close { background: rgba(255,255,255,0.74); border: 1px solid rgba(148,163,184,0.18); border-radius: 12px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-2); font-size: 17px; flex-shrink: 0; transition: all 0.22s ease; box-shadow: 0 8px 18px rgba(15,23,42,0.08); }
        .rejet-modal__close:hover { background: white; color: #b91c1c; transform: translateY(-1px) scale(1.04); }
        .rejet-modal__counter { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 22px; background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(248,250,252,0.94)); border-bottom: 1px solid rgba(226,232,240,0.9); font-size: 11px; color: var(--text-2); font-weight: 700; flex-shrink: 0; }
        .rejet-modal__counter-right { display: flex; align-items: center; gap: 14px; min-width: 280px; justify-content: flex-end; }
        .rejet-modal__counter-ok { color: #059669; font-weight: 800; white-space: nowrap; }
        .rejet-progress { position: relative; width: 140px; height: 8px; border-radius: 999px; overflow: hidden; background: rgba(226,232,240,0.95); box-shadow: inset 0 1px 2px rgba(15,23,42,0.08); }
        .rejet-progress__bar { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: linear-gradient(90deg, #f97316, #ef4444 40%, #10b981 100%); box-shadow: 0 0 18px rgba(16,185,129,0.35); transition: width 0.28s ease; }
        .rejet-modal__body { flex: 1; overflow-y: auto; padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 14px; background:
          radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(248,250,252,0.95) 60%),
          linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); }
        .rejet-modal__footer { padding: 14px 20px; border-top: 1px solid rgba(226,232,240,0.92); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.82); backdrop-filter: blur(12px); flex-shrink: 0; gap: 12px; }
        .rejet-modal__footer-info { font-size: 13px; font-weight: 600; }
        .rejet-modal__empty { text-align: center; color: var(--muted); padding: 34px 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 18px; border: 1px dashed rgba(148,163,184,0.35); background: rgba(255,255,255,0.72); }
        .rejet-section { display: flex; flex-direction: column; gap: 12px; }
        .rejet-section--general { padding: 14px; border: 1px solid rgba(248,113,113,0.18); border-radius: 18px; background: linear-gradient(180deg, rgba(255,247,247,0.96) 0%, rgba(255,255,255,0.98) 100%); box-shadow: 0 14px 28px rgba(15,23,42,0.04); }
        .rejet-section__title-wrap { display: flex; flex-direction: column; gap: 7px; }
        .rejet-section__badge { display: inline-flex; align-items: center; width: fit-content; padding: 5px 11px; border-radius: 999px; background: rgba(220,38,38,0.08); color: #b91c1c; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .rejet-section__title { margin: 0; font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.02em; }
        .rejet-section__meta { font-size: 12px; color: var(--muted); font-weight: 600; }
        .rejet-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .rejet-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 4px; }
        .rejet-pagination__pages { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
        .rejet-pagination__btn, .rejet-pagination__page { border: 1px solid rgba(203,213,225,0.9); background: rgba(255,255,255,0.92); color: var(--text); border-radius: 12px; padding: 9px 13px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.22s ease; box-shadow: 0 8px 18px rgba(15,23,42,0.05); }
        .rejet-pagination__btn:hover:not(:disabled), .rejet-pagination__page:hover { border-color: rgba(239,68,68,0.4); color: #b91c1c; background: rgba(254,242,242,0.96); transform: translateY(-1px); }
        .rejet-pagination__btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
        .rejet-pagination__page.is-active { border-color: transparent; background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; box-shadow: 0 12px 24px rgba(220,38,38,0.28); }
        .rejet-el { border-radius: 18px; border: 1px solid rgba(226,232,240,0.95); overflow: hidden; transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96)); box-shadow: 0 10px 18px rgba(15,23,42,0.05); }
        .rejet-el:hover { transform: translateY(-3px); box-shadow: 0 18px 34px rgba(15,23,42,0.08); border-color: rgba(248,113,113,0.3); }
        .rejet-el--active { border-color: rgba(16,185,129,0.26); box-shadow: 0 18px 34px rgba(16,185,129,0.12); }
        .rejet-el__head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.85)); border-bottom: 1px solid rgba(226,232,240,0.8); }
        .rejet-el__thumb-wrap { position: relative; flex-shrink: 0; }
        .rejet-el__thumb { width: 64px; height: 42px; border-radius: 9px; object-fit: contain; border: 1px solid rgba(203,213,225,0.85); background: linear-gradient(180deg, #f8fafc, #eef2f7); display: block; }
        .rejet-el__thumb-fb { width: 64px; height: 42px; border-radius: 9px; background: linear-gradient(135deg, #eff6ff, #f8fafc); display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid rgba(203,213,225,0.85); color: #475569; }
        .rejet-el__check { position: absolute; top: -5px; right: -5px; width: 20px; height: 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 999px; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: white; box-shadow: 0 8px 18px rgba(16,185,129,0.24); }
        .rejet-el__info { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
        .rejet-el__name { font-size: 12px; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rejet-el__type { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
        .rejet-el__status { padding: 5px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; color: #92400e; background: rgba(251,191,36,0.16); border: 1px solid rgba(251,191,36,0.25); white-space: nowrap; }
        .rejet-el__status.is-complete { color: #047857; background: rgba(16,185,129,0.14); border-color: rgba(16,185,129,0.24); }
        .rejet-el__body { padding: 12px 14px 14px; background: transparent; border-top: 1px solid rgba(226,232,240,0.65); }
        .rejet-el__textarea { width: 100%; padding: 12px 13px; border: 1.5px solid rgba(203,213,225,0.95); border-radius: 12px; font-size: 12px; font-family: var(--font); resize: vertical; outline: none; box-sizing: border-box; transition: all 0.22s ease; color: var(--text); line-height: 1.55; background: rgba(255,255,255,0.96); min-height: 82px; box-shadow: inset 0 1px 2px rgba(15,23,42,0.04); }
        .rejet-el__textarea--general { min-height: 96px; background: rgba(255,255,255,0.98); }
        .rejet-el__textarea:focus { border-color: rgba(239,68,68,0.46); box-shadow: 0 0 0 4px rgba(254,226,226,0.95), 0 12px 28px rgba(239,68,68,0.08); background: white; transform: translateY(-1px); }
        .rejet-el__textarea::placeholder { color: #94a3b8; opacity: 0.95; font-style: normal; }
        .btn-submit-rejet { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg,#ef4444,#b91c1c); color: white; border: none; border-radius: 14px; padding: 11px 18px; font-weight: 800; font-size: 12px; cursor: pointer; font-family: var(--font); box-shadow: 0 14px 28px rgba(220,38,38,0.24); transition: all 0.22s ease; }
        .btn-submit-rejet:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 20px 32px rgba(220,38,38,0.32); filter: saturate(1.04); }
        .btn-submit-rejet:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-cancel { background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border); border-radius: var(--r); padding: 8px 16px; font-weight: 600; font-size: 12px; cursor: pointer; font-family: var(--font); transition: all 0.2s; }
        .btn-cancel:hover { background: var(--surface-3); color: var(--text); }

        @media (max-width: 820px) {
          .rejet-overlay { padding: 14px; }
          .rejet-modal { max-width: 100%; max-height: 95vh; border-radius: 22px; }
          .rejet-modal__header, .rejet-modal__body, .rejet-modal__counter { padding-left: 16px; padding-right: 16px; }
          .rejet-modal__header { padding-top: 18px; }
          .rejet-modal__counter { flex-direction: column; align-items: stretch; }
          .rejet-modal__counter-right { min-width: 0; justify-content: space-between; }
          .rejet-progress { width: 100%; }
          .rejet-modal__footer { flex-direction: column; align-items: stretch; }
          .rejet-modal__hero-top, .rejet-modal__hero-stats { gap: 8px; }
          .rejet-stat-pill { flex: 1; min-width: 0; }
          .rejet-grid { grid-template-columns: 1fr; }
          .rejet-pagination { flex-direction: column; align-items: stretch; }
          .rejet-pagination__btn { width: 100%; }
        }

        .canvas-container { cursor: default !important; }
        .canvas-container canvas { cursor: default !important; }

        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted); }
        .w-full { width: 100%; }
        .editor-textarea { width: 100%; min-height: 60px; }\n\n        /* Bottom Toolbar Styles */\n        .bottom-toolbar { position: fixed; bottom: 0; left: 0; right: 0; height: 48px; background: var(--surface); border-top: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px; gap: 24px; z-index: 100; }\n        .bottom-toolbar__section { display: flex; align-items: center; }\n        .tool-group { display: flex; align-items: center; gap: 4px; }\n        .bottom-toolbar .toolbar-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; color: var(--text-2); }\n        .bottom-toolbar .toolbar-btn:hover { background: var(--surface-2); color: var(--text); }\n        .bottom-toolbar .toolbar-btn.active { background: var(--primary-bg); color: var(--primary); }
      `}</style>
    </>
  );
};

export default DesignEditor;


