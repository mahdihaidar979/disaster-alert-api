import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import * as signalR from "@microsoft/signalr";
import { formatLebanonTime } from "../utils/dateTime";

const channels = [
  { value: "general", label: "General", icon: "💬", color: "#2563eb" },
  { value: "emergencies", label: "Emergencies", icon: "🚨", color: "#ef4444" },
  { value: "need_help_chat", label: "Need Help", icon: "🆘", color: "#f97316" },
  { value: "supplies", label: "Supplies", icon: "📦", color: "#22c55e" },
  { value: "shelters", label: "Shelters", icon: "🏠", color: "#7c3aed" },
];

export default function CommunityChat() {
  const [messages, setMessages] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("general");
  const [search, setSearch] = useState("");
  const [warningText, setWarningText] = useState("");
  const [normalMessage, setNormalMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingWarning, setSendingWarning] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    loadMessages(selectedChannel);
  }, [selectedChannel]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${api.defaults.baseURL.replace("/api", "")}/hubs/chat`, {
        accessTokenFactory: () => localStorage.getItem("adminToken") || "",
      })
      .withAutomaticReconnect()
      .build();

    connection.start().then(() => setLiveConnected(true)).catch(() => setLiveConnected(false));

    connection.on("ReceiveChatMessage", (message) => {
      const normalized = normalizeMessage(message);
      if (normalized.channel !== selectedChannel) return;
      setMessages((prev) => prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized]);
    });

    connection.on("ChatMessageDeleted", (id) => {
      setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(id)));
      setSelectedMessage((prev) => (prev && Number(prev.id) === Number(id) ? null : prev));
    });

    connection.on("ChatMessagePinned", (message) => {
      const normalized = normalizeMessage(message);
      setMessages((prev) => prev.map((m) => (m.id === normalized.id ? normalized : m)));
      setSelectedMessage((prev) => (prev && prev.id === normalized.id ? normalized : prev));
    });

    connection.onreconnected(() => setLiveConnected(true));
    connection.onclose(() => setLiveConnected(false));

    return () => connection.stop();
  }, [selectedChannel]);

  const normalizeMessage = (msg) => ({
    id: msg.id ?? msg.Id,
    userId: msg.userId ?? msg.UserId,
    userName: msg.userName ?? msg.UserName ?? "User",
    message: msg.message ?? msg.Message ?? "",
    channel: msg.channel ?? msg.Channel ?? "general",
    createdAt: msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString(),
    isDeleted: msg.isDeleted ?? msg.IsDeleted ?? false,
    isPinned: msg.isPinned ?? msg.IsPinned ?? false,
    isAdminMessage: msg.isAdminMessage ?? msg.IsAdminMessage ?? false,
  });

  const selectedChannelData = channels.find((c) => c.value === selectedChannel) || channels[0];

  const loadMessages = async (channel = selectedChannel) => {
    try {
      setLoading(true);
      const res = await api.get(`/Chat/messages?channel=${channel}`);
      setMessages(res.data.map((m) => normalizeMessage(m)));
    } catch (e) {
      alert(e.response?.data || "Failed to load chat messages");
    } finally {
      setLoading(false);
    }
  };

  const sendAdminWarning = async (e) => {
    e.preventDefault();
    if (!warningText.trim()) return alert("Warning message is required");
    if (warningText.trim().length > 500) return alert("Message is too long");
    try {
      setSendingWarning(true);
      await api.post("/Chat/admin-warning", { message: warningText.trim(), channel: selectedChannel });
      setWarningText("");
      await loadMessages(selectedChannel);
    } catch (e) {
      alert(e.response?.data || "Failed to send admin warning");
    } finally {
      setSendingWarning(false);
    }
  };

  const sendNormalMessage = async (e) => {
    e.preventDefault();
    if (!normalMessage.trim()) return alert("Message is required");
    if (normalMessage.trim().length > 500) return alert("Message is too long");
    try {
      setSendingMessage(true);
      await api.post("/Chat/send", { message: normalMessage.trim(), channel: selectedChannel });
      setNormalMessage("");
      await loadMessages(selectedChannel);
    } catch (e) {
      alert(e.response?.data || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message from chat?")) return;
    try {
      await api.delete(`/Chat/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setSelectedMessage((prev) => (prev && prev.id === messageId ? null : prev));
    } catch (e) {
      alert(e.response?.data || "Failed to delete message");
    }
  };

  const togglePin = async (messageId) => {
    try {
      const res = await api.put(`/Chat/${messageId}/pin`);
      const updated = normalizeMessage(res.data);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMessage((prev) => (prev && prev.id === updated.id ? updated : prev));
    } catch (e) {
      alert(e.response?.data || "Failed to pin/unpin message");
    }
  };

  const filteredMessages = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let data = messages.filter((m) => !m.isDeleted);
    if (keyword) {
      data = data.filter((m) => `${m.userName} ${m.message} ${m.channel} ${m.userId}`.toLowerCase().includes(keyword));
    }
    return [...data].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(String(a.createdAt).endsWith("Z") ? a.createdAt : `${a.createdAt}Z`) -
        new Date(String(b.createdAt).endsWith("Z") ? b.createdAt : `${b.createdAt}Z`);
    });
  }, [messages, search]);

  const summary = useMemo(() => {
    const visible = messages.filter((m) => !m.isDeleted);
    return {
      total: visible.length,
      pinned: visible.filter((m) => m.isPinned).length,
      admin: visible.filter((m) => m.isAdminMessage).length,
      users: new Set(visible.map((m) => m.userId)).size,
    };
  }, [messages]);

  const suspiciousMessages = useMemo(() => {
    const badWords = ["fake", "spam", "kill", "attack", "hate", "scam", "bomb", "weapon", "threat"];
    return messages.filter((m) => badWords.some((word) => m.message.toLowerCase().includes(word)));
  }, [messages]);

  const formatTime = (date) => {
    if (!date) return "";

    return formatLebanonTime(date);
  };
  const getInitial = (name) => name?.trim() ? name.trim().substring(0, 1).toUpperCase() : "U";

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Community Moderation</div>
          <h1 style={styles.title}>Admin Chat Control</h1>
          <p style={styles.subtitle}>Monitor, pin, delete, and send official warnings across community chat channels.</p>
        </div>
        <button style={styles.refreshButton} onClick={() => loadMessages()}>↻ Refresh Chat</button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>🛡️</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Community Moderation Center</h2>
          <p style={styles.heroText}>Control emergency discussions, highlight official instructions, and remove unsafe messages.</p>
        </div>
        <div style={styles.livePill}>
          <span style={{ ...styles.liveDot, background: liveConnected ? "#22c55e" : "#f97316" }} />
          {liveConnected ? "Live Connected" : "Connecting"}
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard title="Messages" value={summary.total} color="#2563eb" icon="💬" />
        <SummaryCard title="Pinned" value={summary.pinned} color="#f97316" icon="📌" />
        <SummaryCard title="Admin Posts" value={summary.admin} color="#7c3aed" icon="🛡️" />
        <SummaryCard title="Active Users" value={summary.users} color="#22c55e" icon="👥" />
        <SummaryCard title="Flagged" value={suspiciousMessages.length} color="#ef4444" icon="⚠️" />
      </div>

      <div style={styles.layout}>
        <aside style={styles.sidePanel}>
          <h2 style={styles.sectionTitle}>Channels</h2>
          <p style={styles.sectionSubtitle}>Choose the channel you want to moderate.</p>
          <div style={styles.channels}>
            {channels.map((channel) => {
              const selected = selectedChannel === channel.value;
              return (
                <button key={channel.value} onClick={() => { setSelectedChannel(channel.value); setSelectedMessage(null); }} style={{ ...styles.channelButton, background: selected ? channel.color : "#ffffff", color: selected ? "#ffffff" : "#0f172a", borderColor: selected ? channel.color : "#e2e8f0", boxShadow: selected ? `0 16px 30px ${channel.color}22` : "none" }}>
                  <span>{channel.icon}</span>{channel.label}
                </button>
              );
            })}
          </div>
          <div style={styles.warningCard}>
            <strong>Moderation Rules</strong>
            <p>Delete misinformation, pin official instructions, and use admin warnings only for important safety updates.</p>
          </div>
        </aside>

        <main style={styles.chatPanel}>
          <div style={styles.chatTop}>
            <div>
              <h2 style={styles.sectionTitle}>{selectedChannelData.icon} {selectedChannelData.label}</h2>
              <p style={styles.sectionSubtitle}>Showing {filteredMessages.length} visible message(s)</p>
            </div>
            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>⌕</span>
              <input style={styles.searchInput} placeholder="Search messages, users, or ids..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <form style={styles.adminWarningForm} onSubmit={sendAdminWarning}>
            <div><strong>Official Admin Warning</strong><p>Send a pinned emergency instruction to this channel.</p></div>
            <div style={styles.warningInputRow}>
              <input style={styles.warningInput} value={warningText} maxLength={500} onChange={(e) => setWarningText(e.target.value)} placeholder="Example: Avoid this area and follow official instructions..." />
              <button style={styles.warningButton} disabled={sendingWarning}>{sendingWarning ? "Sending..." : "Send Warning"}</button>
            </div>
          </form>

          <div style={styles.messagesBox}>
            {loading ? <StateBox icon="⏳" title="Loading messages..." text="Please wait." /> : filteredMessages.length === 0 ? <StateBox icon="💬" title="No messages found" text="Try another channel or search." /> : filteredMessages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              const color = msg.isAdminMessage ? "#0f172a" : selectedChannelData.color;
              return (
                <button key={msg.id} style={{ ...styles.messageCard, borderColor: isSelected ? color : msg.isPinned ? "#f97316" : "#e2e8f0", background: msg.isPinned ? "#fffbeb" : "#f8fafc" }} onClick={() => setSelectedMessage(msg)}>
                  <div style={{ ...styles.avatar, background: msg.isAdminMessage ? "linear-gradient(135deg, #0f172a, #2563eb)" : `${color}16`, color: msg.isAdminMessage ? "#ffffff" : color }}>{msg.isAdminMessage ? "A" : getInitial(msg.userName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.messageHeader}><strong>{msg.isAdminMessage ? "🛡️ " : ""}{msg.userName || "Unknown"}</strong><span>{formatTime(msg.createdAt)}</span></div>
                    <p style={styles.messageText}>{msg.message}</p>
                    <div style={styles.badgesRow}>
                      <span style={{ ...styles.badge, background: `${selectedChannelData.color}16`, color: selectedChannelData.color }}>{selectedChannelData.label}</span>
                      {msg.isPinned && <span style={{ ...styles.badge, background: "#ffedd5", color: "#c2410c" }}>📌 Pinned</span>}
                      {msg.isAdminMessage && <span style={{ ...styles.badge, background: "#dbeafe", color: "#1d4ed8" }}>Official</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <form style={styles.sendBox} onSubmit={sendNormalMessage}>
            <input style={styles.sendInput} value={normalMessage} maxLength={500} onChange={(e) => setNormalMessage(e.target.value)} placeholder={`Send normal admin message to ${selectedChannelData.label}...`} />
            <button style={styles.sendButton} disabled={sendingMessage}>{sendingMessage ? "Sending..." : "Send"}</button>
          </form>
        </main>

        <aside style={styles.controlPanel}>
          <h2 style={styles.sectionTitle}>Message Control</h2>
          <p style={styles.sectionSubtitle}>Select a message to moderate it.</p>
          {!selectedMessage ? <StateBox icon="👆" title="No message selected" text="Click any message to show controls." /> : (
            <div style={styles.selectedCard}>
              <div style={styles.selectedHeader}>
                <div style={{ ...styles.avatar, background: selectedMessage.isAdminMessage ? "linear-gradient(135deg, #0f172a, #2563eb)" : `${selectedChannelData.color}16`, color: selectedMessage.isAdminMessage ? "#ffffff" : selectedChannelData.color }}>{selectedMessage.isAdminMessage ? "A" : getInitial(selectedMessage.userName)}</div>
                <div><strong>{selectedMessage.userName}</strong><span>User ID: {selectedMessage.userId}</span></div>
              </div>
              <div style={styles.selectedMessageBox}>{selectedMessage.message}</div>
              <InfoLine label="Channel" value={selectedChannelData.label} />
              <InfoLine label="Created" value={formatTime(selectedMessage.createdAt)} />
              <InfoLine label="Pinned" value={selectedMessage.isPinned ? "Yes" : "No"} />
              <InfoLine label="Official" value={selectedMessage.isAdminMessage ? "Yes" : "No"} />
              <div style={styles.controlButtons}>
                <button style={styles.pinButton} onClick={() => togglePin(selectedMessage.id)}>{selectedMessage.isPinned ? "Unpin Message" : "Pin Message"}</button>
                <button style={styles.deleteButton} onClick={() => deleteMessage(selectedMessage.id)}>Delete Message</button>
              </div>
            </div>
          )}
          <div style={styles.flaggedBox}>
            <strong>Flagged Messages</strong>
            {suspiciousMessages.length === 0 ? <p>No suspicious words found in this channel.</p> : <div style={styles.flaggedList}>{suspiciousMessages.slice(0, 5).map((m) => <button key={m.id} style={styles.flaggedItem} onClick={() => setSelectedMessage(m)}>⚠️ {m.userName}: {m.message}</button>)}</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, color, icon }) {
  return <div style={{ ...styles.statCard, boxShadow: `0 18px 34px ${color}18` }}><div style={{ ...styles.statIcon, background: `${color}14`, color }}>{icon}</div><div><span style={styles.statTitle}>{title}</span><strong style={{ ...styles.statValue, color }}>{value}</strong></div></div>;
}

function InfoLine({ label, value }) {
  return <div style={styles.infoLine}><span>{label}</span><strong>{value}</strong></div>;
}

function StateBox({ icon, title, text }) {
  return <div style={styles.stateBox}><div style={styles.stateIcon}>{icon}</div><h3 style={styles.stateTitle}>{title}</h3><p style={styles.stateText}>{text}</p></div>;
}

const styles = {
  page:{position:"relative",minHeight:"100vh",padding:"28px",background:"linear-gradient(180deg,#f5f7fb 0%,#eef4ff 100%)",overflow:"hidden"},
  bgOrbOne:{position:"absolute",width:280,height:280,top:-110,right:-70,borderRadius:"999px",background:"rgba(37,99,235,.12)",pointerEvents:"none"},
  bgOrbTwo:{position:"absolute",width:240,height:240,bottom:-120,left:-80,borderRadius:"999px",background:"rgba(239,68,68,.10)",pointerEvents:"none"},
  header:{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",gap:20,alignItems:"center",marginBottom:22},
  eyebrow:{display:"inline-flex",padding:"7px 12px",borderRadius:999,background:"#dbeafe",color:"#2563eb",fontWeight:900,fontSize:12,marginBottom:10},
  title:{margin:0,fontSize:34,color:"#0f172a",fontWeight:950,letterSpacing:"-.8px"},
  subtitle:{margin:"8px 0 0",color:"#64748b",fontSize:15,fontWeight:650,lineHeight:1.5},
  refreshButton:{height:48,padding:"0 18px",border:0,borderRadius:18,background:"#0f172a",color:"white",fontWeight:900,cursor:"pointer",boxShadow:"0 16px 30px rgba(15,23,42,.18)",whiteSpace:"nowrap"},
  heroCard:{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:18,padding:22,borderRadius:30,background:"linear-gradient(135deg,#0f172a 0%,#2563eb 100%)",color:"white",marginBottom:22,boxShadow:"0 24px 50px rgba(37,99,235,.22)"},
  heroIcon:{width:68,height:68,borderRadius:24,display:"grid",placeItems:"center",background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.18)",fontSize:34,flexShrink:0},
  heroTitle:{margin:0,fontSize:23,fontWeight:950},
  heroText:{margin:"6px 0 0",color:"rgba(255,255,255,.72)",fontWeight:650,lineHeight:1.45},
  livePill:{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 13px",borderRadius:999,background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.18)",color:"white",fontWeight:900,fontSize:12,whiteSpace:"nowrap"},
  liveDot:{width:8,height:8,borderRadius:"50%",boxShadow:"0 0 0 4px rgba(34,197,94,.18)"},
  statsGrid:{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(5,minmax(145px,1fr))",gap:14,marginBottom:22},
  statCard:{display:"flex",alignItems:"center",gap:14,padding:18,borderRadius:26,background:"rgba(255,255,255,.92)",border:"1px solid rgba(226,232,240,.9)",backdropFilter:"blur(14px)"},
  statIcon:{width:52,height:52,borderRadius:19,display:"grid",placeItems:"center",fontSize:25,flexShrink:0},
  statTitle:{display:"block",color:"#64748b",fontWeight:850,fontSize:13,marginBottom:3},
  statValue:{display:"block",fontSize:25,fontWeight:950,lineHeight:1},
  layout:{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"260px minmax(0,1fr) 330px",gap:22,alignItems:"start"},
  sidePanel:{padding:22,borderRadius:30,background:"rgba(255,255,255,.94)",border:"1px solid #e2e8f0",boxShadow:"0 20px 44px rgba(15,23,42,.07)"},
  chatPanel:{padding:22,borderRadius:30,background:"rgba(255,255,255,.94)",border:"1px solid #e2e8f0",boxShadow:"0 20px 44px rgba(15,23,42,.07)"},
  controlPanel:{padding:22,borderRadius:30,background:"rgba(255,255,255,.94)",border:"1px solid #e2e8f0",boxShadow:"0 20px 44px rgba(15,23,42,.07)"},
  sectionTitle:{margin:0,fontSize:22,fontWeight:950,color:"#0f172a"},
  sectionSubtitle:{margin:"8px 0 18px",color:"#64748b",lineHeight:1.5,fontWeight:620},
  channels:{display:"grid",gap:10},
  channelButton:{height:50,borderRadius:18,border:"1px solid #e2e8f0",cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",gap:10,padding:"0 14px"},
  warningCard:{marginTop:18,padding:16,borderRadius:22,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#334155"},
  chatTop:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:18},
  searchBox:{minWidth:260,display:"flex",alignItems:"center",gap:10,padding:"0 14px",height:50,borderRadius:18,background:"#f8fafc",border:"1px solid #e2e8f0"},
  searchIcon:{color:"#2563eb",fontWeight:900,fontSize:18},
  searchInput:{flex:1,border:0,outline:0,background:"transparent",color:"#0f172a",fontWeight:750,fontSize:14},
  adminWarningForm:{padding:16,borderRadius:22,background:"#fff7ed",border:"1px solid #fed7aa",marginBottom:16},
  warningInputRow:{display:"flex",gap:10,marginTop:12},
  warningInput:{flex:1,height:48,border:"1px solid #fed7aa",background:"#fff",borderRadius:16,padding:"0 14px",outline:0,fontWeight:750},
  warningButton:{height:48,border:0,borderRadius:16,background:"#f97316",color:"white",fontWeight:900,padding:"0 14px",cursor:"pointer"},
  messagesBox:{height:"calc(100vh - 620px)",minHeight:320,overflowY:"auto",display:"grid",alignContent:"start",gap:12,paddingRight:6},
  messageCard:{width:"100%",textAlign:"left",display:"flex",gap:12,padding:14,borderRadius:22,border:"1px solid #e2e8f0",cursor:"pointer"},
  avatar:{width:48,height:48,borderRadius:18,display:"grid",placeItems:"center",fontWeight:950,flexShrink:0},
  messageHeader:{display:"flex",justifyContent:"space-between",gap:12,color:"#0f172a"},
  messageText:{margin:"8px 0 10px",color:"#334155",lineHeight:1.5,fontWeight:620},
  badgesRow:{display:"flex",flexWrap:"wrap",gap:6},
  badge:{display:"inline-flex",padding:"5px 9px",borderRadius:999,fontSize:12,fontWeight:950},
  sendBox:{display:"flex",gap:10,marginTop:16},
  sendInput:{flex:1,height:52,border:"1px solid #e2e8f0",background:"#f8fafc",borderRadius:18,padding:"0 15px",outline:0,color:"#0f172a",fontWeight:750},
  sendButton:{height:52,padding:"0 18px",border:0,borderRadius:18,background:"#0f172a",color:"white",fontWeight:900,cursor:"pointer"},
  selectedCard:{display:"grid",gap:12},
  selectedHeader:{display:"flex",gap:12,alignItems:"center"},
  selectedMessageBox:{padding:14,borderRadius:18,background:"#f8fafc",border:"1px solid #e2e8f0",color:"#334155",lineHeight:1.5,fontWeight:650},
  infoLine:{display:"flex",justifyContent:"space-between",gap:10,padding:12,borderRadius:16,background:"#f8fafc",border:"1px solid #e2e8f0",color:"#64748b"},
  controlButtons:{display:"grid",gap:10,marginTop:4},
  pinButton:{height:46,border:0,borderRadius:16,background:"#f97316",color:"white",fontWeight:900,cursor:"pointer"},
  deleteButton:{height:46,border:0,borderRadius:16,background:"#ef4444",color:"white",fontWeight:900,cursor:"pointer"},
  flaggedBox:{marginTop:18,padding:16,borderRadius:22,background:"#fef2f2",border:"1px solid #fecaca",color:"#7f1d1d"},
  flaggedList:{display:"grid",gap:8,marginTop:10},
  flaggedItem:{textAlign:"left",border:0,borderRadius:12,background:"#fff",color:"#7f1d1d",padding:10,fontWeight:750,cursor:"pointer"},
  stateBox:{minHeight:230,display:"grid",placeItems:"center",textAlign:"center",color:"#64748b",padding:16},
  stateIcon:{fontSize:46,marginBottom:8},
  stateTitle:{margin:0,color:"#0f172a",fontWeight:950},
  stateText:{margin:"8px 0 0",fontWeight:650},
};
