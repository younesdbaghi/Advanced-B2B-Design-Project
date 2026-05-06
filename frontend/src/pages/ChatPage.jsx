import React, { useState, useEffect, useContext, useRef } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import { socket } from "../socket";
import { Send, MessageSquare, Plus, Paperclip, Phone, Video, FileText, Download, X, MoreVertical, Edit2, Trash2 } from "lucide-react";

const ChatPage = () => {
  const { user } = useContext(AuthContext);
  
  // États
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs pour le temps réel
  const activeConvRef = useRef(null);
  const scrollRef = useRef();

  // 1. Initialisation et Socket
  useEffect(() => {
    socket.connect();
    socket.emit("setup", user.id);

    // Statut des utilisateurs (Boule verte/rouge)
    socket.on("user_status", (users) => {
      setOnlineUsers(users.map(id => String(id)));
    });

    // Réception d'un message en temps réel
    socket.on("message_received", (msg) => {
      const msgConvId = msg.id_conversation._id || msg.id_conversation;
      
      // Si la conversation est ouverte, on ajoute le message à l'écran
      if (activeConvRef.current && activeConvRef.current._id === msgConvId) {
        setMessages((prev) => [...prev, msg]);
        markAsRead(msgConvId);
      } 
      // Dans tous les cas, on rafraîchit la sidebar pour voir le dernier message et le badge
      fetchConversations();
    });

    // Synchronisation modification/suppression
    socket.on("message_updated", (updatedMsg) => {
      setMessages((prev) => 
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
      fetchConversations();
    });

    socket.on("typing", () => setIsTyping(true));
    socket.on("stop_typing", () => setIsTyping(false));

    return () => {
      socket.off("message_received");
      socket.off("user_status");
      socket.off("message_updated");
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [user.id]);

  // Chargement initial
  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, []);

  // Scroll automatique en bas
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 2. Fonctions API
  const fetchConversations = async () => {
    try {
      const { data } = await API.get("/chat/conversations");
      setConversations(data);
    } catch (e) { console.error("Erreur convs:", e); }
  };

  const fetchContacts = async () => {
    try {
      const { data } = await API.get("/chat/contacts");
      setContacts(data);
    } catch (e) { console.error("Erreur contacts:", e); }
  };

  const markAsRead = async (convId) => {
    try {
      await API.patch(`/chat/read/${convId}`);
      // Mise à jour locale immédiate des badges
      setConversations(prev => prev.map(c => c._id === convId ? { ...c, unreadCount: 0 } : c));
    } catch (e) { console.error(e); }
  };

  const selectConv = async (conv) => {
    setActiveConv(conv);
    activeConvRef.current = conv;
    socket.emit("join_chat", conv._id);
    markAsRead(conv._id);
    try {
      const { data } = await API.get(`/chat/messages/${conv._id}`);
      setMessages(data);
    } catch (e) { console.error(e); }
  };

  const startNewChat = async (targetId) => {
    try {
      const { data } = await API.post("/chat/privee", { targetId });
      setShowContacts(false);
      selectConv(data);
      fetchConversations();
    } catch (e) { console.error(e); }
  };

  // 3. Actions Messages (Send, Edit, Delete, Upload)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    socket.emit("stop_typing", activeConv._id);
    try {
      const { data } = await API.post("/chat/messages", { 
        id_conversation: activeConv._id, 
        texte: newMessage 
      });
      setMessages(prev => [...prev, data]);
      socket.emit("new_message", { ...data, id_conversation: activeConv });
      setNewMessage("");
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const type = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "file";
      try {
        const { data } = await API.post("/chat/messages", {
          id_conversation: activeConv._id,
          texte: `Fichier : ${file.name}`,
          type: type,
          fileUrl: reader.result,
          fileName: file.name
        });
        setMessages(prev => [...prev, data]);
        socket.emit("new_message", { ...data, id_conversation: activeConv });
        fetchConversations();
      } catch (err) { console.error(err); }
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = async (msgId, currentText) => {
    const newText = prompt("Modifier le message :", currentText);
    if (!newText || newText === currentText) return;
    try {
      const { data } = await API.put(`/chat/messages/${msgId}`, { texte: newText });
      setMessages(prev => prev.map(m => m._id === msgId ? data : m));
      socket.emit("update_message", data);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    try {
      const { data } = await API.delete(`/chat/messages/${msgId}`);
      setMessages(prev => prev.map(m => m._id === msgId ? data : m));
      socket.emit("update_message", data);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "white", borderRadius: 16, overflow: "hidden", border: "1px solid #E2E8F0" }}>
      
      {/* --- SIDEBAR --- */}
      <div style={{ width: 350, background: "#F8FAFC", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "25px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontWeight: 800 }}>{showContacts ? "Nouveau Message" : "Discussions"}</h3>
          <button onClick={() => setShowContacts(!showContacts)} style={{ background: "#2563EB", color: "white", border: "none", borderRadius: "50%", width: 35, height: 35, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showContacts ? <X size={18} /> : <Plus size={20} />}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {showContacts ? (
            contacts.map(u => (
              <div key={u._id} onClick={() => startNewChat(u._id)} style={{ padding: "15px 25px", cursor: "pointer", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 45, height: 45, borderRadius: "50%", background: "#E2E8F0", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{u.nom[0]}</div>
                  <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: onlineUsers.includes(String(u._id)) ? "#10B981" : "#EF4444", border: "2px solid white" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nom}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{u.rôle}</div>
                </div>
              </div>
            ))
          ) : (
            conversations.map(c => {
              const other = c.participants.find(p => p._id !== user.id);
              const unread = c.unreadCount || 0;
              const isOnline = onlineUsers.includes(String(other?._id));
              return (
                <div key={c._id} onClick={() => selectConv(c)} style={{ 
                    padding: "15px 25px", cursor: "pointer", background: activeConv?._id === c._id ? "#EFF6FF" : "white", 
                    borderLeft: unread > 0 ? "4px solid #2563EB" : "4px solid transparent", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 12 
                }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#2563EB", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{other?.nom?.[0]}</div>
                    <div style={{ position: "absolute", bottom: 2, right: 2, width: 13, height: 13, borderRadius: "50%", background: isOnline ? "#10B981" : "#EF4444", border: "2px solid white" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: unread > 0 ? 800 : 700, fontSize: 14 }}>{other?.nom}</div>
                    <div style={{ fontSize: 12, color: unread > 0 ? "#2563EB" : "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: unread > 0 ? 700 : 400 }}>{c.dernier_message?.texte || "Cliquer pour discuter"}</div>
                  </div>
                  {unread > 0 && <div style={{ background: "#2563EB", color: "white", borderRadius: "50%", minWidth: 22, height: 22, padding: "0 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold" }}>{unread}</div>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- CHAT MAIN --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "white" }}>
        {activeConv ? (
          <>
            {/* Header */}
            <div style={{ padding: "18px 30px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E2E8F0", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                    {activeConv.participants.find(p => p._id !== user.id)?.nom?.[0]}
                </div>
                <div style={{ fontWeight: 800 }}>{activeConv.participants.find(p => p._id !== user.id)?.nom}</div>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <Phone size={20} color="#64748B" style={{ cursor: "pointer" }} />
                <Video size={20} color="#64748B" style={{ cursor: "pointer" }} />
                <MoreVertical size={20} color="#64748B" style={{ cursor: "pointer" }} />
              </div>
            </div>

            {/* Zone Messages */}
            <div style={{ flex: 1, padding: "30px", overflowY: "auto", background: "#F1F5F9", display: "flex", flexDirection: "column", gap: 15 }}>
              {messages.map((m, i) => {
                const isMe = (m.id_expediteur._id || m.id_expediteur) === user.id;
                return (
                  <div key={m._id || i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                    <div style={{ 
                        background: isMe ? "#2563EB" : "white", color: isMe ? "white" : "#1E293B", 
                        padding: "12px 16px", borderRadius: 16, boxShadow: "0 2px 5px rgba(0,0,0,0.05)", fontSize: 14, position: "relative"
                    }}>
                        {m.supprime ? <i style={{ opacity: 0.6 }}>Ce message a été supprimé</i> : (
                            <>
                                {m.type === "text" && <div>{m.texte}</div>}
                                {m.type === "image" && <img src={m.fileUrl} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 5, height: "400px" }} alt="shared" />}
                                {m.type === "video" && <video src={m.fileUrl} controls style={{ maxWidth: "100%", borderRadius: 8, marginTop: 5 }} />}
                                {m.type === "file" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.05)", padding: "10px", borderRadius: 8, marginTop: 5 }}>
                                        <FileText size={20} />
                                        <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{m.fileName}</span>
                                        <a href={m.fileUrl} download={m.fileName} style={{ color: isMe ? "white" : "#2563EB" }}><Download size={18} /></a>
                                    </div>
                                )}
                            </>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
                            {m.modifie && !m.supprime && <small style={{ fontSize: 9, opacity: 0.6 }}>Modifié</small>}
                            <small style={{ fontSize: 9, opacity: 0.6 }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                            {isMe && <span style={{ fontSize: 10, color: m.lu ? "#38BDF8" : "white" }}>{m.lu ? "✓✓" : "✓"}</span>}
                        </div>
                    </div>
                    {/* Menu Edit/Delete */}
                    {isMe && !m.supprime && (
                        <div style={{ display: "flex", gap: 12, marginTop: 4, padding: "0 5px" }}>
                            <button onClick={() => handleEdit(m._id, m.texte)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Edit2 size={12} /> Modifier</button>
                            <button onClick={() => handleDelete(m._id)} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Trash2 size={12} /> Supprimer</button>
                        </div>
                    )}
                  </div>
                );
              })}
              {isTyping && <div style={{ fontSize: 12, color: "#64748B", fontStyle: "italic", marginLeft: 10 }}>Le correspondant écrit...</div>}
              <div ref={scrollRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} style={{ padding: "20px 30px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 15, alignItems: "center" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Paperclip size={22} color="#64748B" />
                <input type="file" style={{ display: "none" }} onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx,.zip" />
              </label>
              <input 
                value={newMessage} 
                onChange={(e) => { setNewMessage(e.target.value); socket.emit("typing", activeConv._id); }} 
                onBlur={() => socket.emit("stop_typing", activeConv._id)}
                placeholder="Tapez votre message ici..." 
                style={{ flex: 1, padding: "14px 20px", borderRadius: 30, border: "1px solid #E2E8F0", outline: "none", fontSize: 14 }} 
              />
              <button type="submit" style={{ background: "#2563EB", color: "white", border: "none", borderRadius: "50%", width: 45, height: 45, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)" }}>
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ margin: "auto", textAlign: "center", color: "#94A3B8" }}>
            <div style={{ background: "#F1F5F9", width: 100, height: 100, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <MessageSquare size={40} color="#CBD5E1" />
            </div>
            <h2 style={{ color: "#1E293B", marginBottom: 8 }}>Vos messages</h2>
            <p>Sélectionnez un contact pour commencer à discuter en temps réel.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;