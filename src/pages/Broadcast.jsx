import { useMemo, useState } from "react";
import api from "../api/api";

export default function Broadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Emergency");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const previewTitle = title.trim() || "Emergency Alert";
  const previewMessage =
    message.trim() ||
    "Write an announcement to notify users about danger, safety instructions, or important updates.";

  const messageStats = useMemo(() => {
    const words = message.trim()
      ? message.trim().split(/\s+/).filter(Boolean).length
      : 0;

    return {
      characters: message.length,
      words,
    };
  }, [message]);

  const templates = [
    {
      title: "Weather Warning",
      message:
        "Heavy rain is expected in your area. Avoid low roads, riversides, and flooded zones. Stay safe and follow official instructions.",
      priority: "Warning",
      icon: "🌧️",
    },
    {
      title: "Evacuation Notice",
      message:
        "A dangerous situation has been reported nearby. Please move to a safer location immediately and avoid the affected area.",
      priority: "Critical",
      icon: "🚨",
    },
    {
      title: "Road Safety Alert",
      message:
        "Some roads may be unsafe due to active disaster reports. Use alternative routes and avoid unnecessary travel.",
      priority: "Emergency",
      icon: "🛣️",
    },
  ];

  const sendBroadcast = async (e) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      alert("Please enter title and message");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await api.post("/admin/broadcast", {
        title: title.trim(),
        message: message.trim(),
      });

      setResult(response.data);
      setTitle("");
      setMessage("");
      setPriority("Emergency");
    } catch (error) {
      console.log("BROADCAST ERROR:", error);
      console.log("ERROR RESPONSE:", error.response);

      const data = error.response?.data;

      let errorMessage = "Failed to send broadcast";

      if (typeof data === "string") {
        errorMessage = data;
      } else if (data?.message) {
        errorMessage = data.message;
      } else if (data?.title) {
        errorMessage = data.title;
      } else if (data) {
        errorMessage = JSON.stringify(data);
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.message);
    setPriority(template.priority);
    setResult(null);
  };

  const clearForm = () => {
    setTitle("");
    setMessage("");
    setPriority("Emergency");
    setResult(null);
  };

  const getPriorityColor = (value) => {
    switch (value) {
      case "Critical":
        return "#7c3aed";
      case "Warning":
        return "#f97316";
      case "Emergency":
        return "#ef4444";
      default:
        return "#2563eb";
    }
  };

  const getPriorityIcon = (value) => {
    switch (value) {
      case "Critical":
        return "⚠️";
      case "Warning":
        return "🟠";
      case "Emergency":
        return "🚨";
      default:
        return "📢";
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Emergency Communication</div>
          <h1 style={styles.title}>Admin Broadcast</h1>
          <p style={styles.subtitle}>
            Send urgent announcements to all users through in-app notifications and push alerts.
          </p>
        </div>

        <button style={styles.clearButton} onClick={clearForm}>
          Clear Form
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>📢</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Broadcast Control Center</h2>
          <p style={styles.heroText}>
            Create fast, clear, and high-priority messages for the entire disaster response network.
          </p>
        </div>

        <div
          style={{
            ...styles.priorityPill,
            background: `${getPriorityColor(priority)}22`,
            color: getPriorityColor(priority),
            borderColor: `${getPriorityColor(priority)}33`,
          }}
        >
          {getPriorityIcon(priority)} {priority}
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard title="Target" value="All Users" color="#2563eb" icon="👥" />
        <SummaryCard title="Delivery" value="Push + App" color="#22c55e" icon="📲" />
        <SummaryCard title="Priority" value={priority} color={getPriorityColor(priority)} icon="🚨" />
        <SummaryCard title="Words" value={messageStats.words} color="#f97316" icon="✍️" />
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Create Broadcast</h2>
              <p style={styles.sectionSubtitle}>
                Keep the message short, clear, and actionable.
              </p>
            </div>
          </div>

          <form onSubmit={sendBroadcast}>
            <label style={styles.label}>Broadcast Priority</label>
            <div style={styles.priorityGrid}>
              {["Emergency", "Warning", "Critical"].map((item) => {
                const selected = priority === item;
                const color = getPriorityColor(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPriority(item)}
                    style={{
                      ...styles.priorityButton,
                      background: selected ? color : "#ffffff",
                      color: selected ? "#ffffff" : "#0f172a",
                      borderColor: selected ? color : "#e2e8f0",
                      boxShadow: selected
                        ? `0 16px 30px ${color}22`
                        : "0 10px 22px rgba(15,23,42,0.04)",
                    }}
                  >
                    <span>{getPriorityIcon(item)}</span>
                    {item}
                  </button>
                );
              })}
            </div>

            <label style={styles.label}>Notification Title</label>
            <input
              style={styles.input}
              placeholder="Example: Heavy Rain Warning"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setResult(null);
              }}
            />

            <label style={styles.label}>Message</label>
            <textarea
              style={styles.textarea}
              placeholder="Example: Heavy rain is expected in Baalbek. Avoid low roads and stay safe."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setResult(null);
              }}
            />

            <div style={styles.formMeta}>
              <span>{messageStats.characters} characters</span>
              <span>{messageStats.words} words</span>
            </div>

            <div style={styles.actions}>
              <button style={styles.sendButton} type="submit" disabled={loading}>
                {loading ? "Sending Broadcast..." : "Send Broadcast"}
              </button>

              <button
                type="button"
                style={styles.resetButton}
                onClick={clearForm}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </form>

          {result && (
            <div style={styles.successBox}>
              <div style={styles.successIcon}>✅</div>
              <div>
                <h3 style={styles.successTitle}>Broadcast Sent Successfully</h3>
                <p style={styles.successText}>{result.message}</p>
                <div style={styles.successStats}>
                  <span>Users notified in app: {result.usersCount}</span>
                  <span>Push tokens sent: {result.pushTokensCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.sideColumn}>
          <div style={styles.previewCard}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Live Preview</h2>
                <p style={styles.sectionSubtitle}>
                  This is how your broadcast will appear.
                </p>
              </div>
            </div>

            <div style={styles.phonePreview}>
              <div style={styles.phoneTop} />

              <div style={styles.notificationCard}>
                <div
                  style={{
                    ...styles.notificationIcon,
                    background: `${getPriorityColor(priority)}18`,
                    color: getPriorityColor(priority),
                  }}
                >
                  {getPriorityIcon(priority)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.notificationHeader}>
                    <strong>{previewTitle}</strong>
                    <span>now</span>
                  </div>

                  <p style={styles.previewMessage}>{previewMessage}</p>

                  <span
                    style={{
                      ...styles.previewBadge,
                      background: `${getPriorityColor(priority)}16`,
                      color: getPriorityColor(priority),
                    }}
                  >
                    {priority}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.templateCard}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Quick Templates</h2>
                <p style={styles.sectionSubtitle}>
                  Use a ready message and edit it before sending.
                </p>
              </div>
            </div>

            <div style={styles.templateList}>
              {templates.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  style={styles.templateButton}
                  onClick={() => applyTemplate(template)}
                >
                  <div style={styles.templateIcon}>{template.icon}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={styles.templateTitle}>{template.title}</strong>
                    <p style={styles.templateText}>{template.message}</p>
                  </div>

                  <span
                    style={{
                      ...styles.templateBadge,
                      background: `${getPriorityColor(template.priority)}16`,
                      color: getPriorityColor(template.priority),
                    }}
                  >
                    {template.priority}
                  </span>
                </button>
              ))}
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, color, icon }) {
  return (
    <div style={{ ...styles.statCard, boxShadow: `0 18px 34px ${color}18` }}>
      <div style={{ ...styles.statIcon, background: `${color}14`, color }}>
        {icon}
      </div>
      <div>
        <span style={styles.statTitle}>{title}</span>
        <strong
          style={{
            ...styles.statValue,
            color,
            fontSize: typeof value === "string" ? 21 : 27,
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

function Rule({ text }) {
  return (
    <div style={styles.rule}>
      <span style={styles.ruleIcon}>✓</span>
      <p style={styles.ruleText}>{text}</p>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    padding: "28px",
    background: "linear-gradient(180deg, #f5f7fb 0%, #eef4ff 100%)",
    overflow: "hidden",
  },

  bgOrbOne: {
    position: "absolute",
    width: 280,
    height: 280,
    top: -110,
    right: -70,
    borderRadius: "999px",
    background: "rgba(239, 68, 68, 0.10)",
    pointerEvents: "none",
  },

  bgOrbTwo: {
    position: "absolute",
    width: 240,
    height: 240,
    bottom: -120,
    left: -80,
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.13)",
    pointerEvents: "none",
  },

  header: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "center",
    marginBottom: 22,
  },

  eyebrow: {
    display: "inline-flex",
    padding: "7px 12px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: 900,
    fontSize: 12,
    marginBottom: 10,
  },

  title: {
    margin: 0,
    fontSize: 34,
    color: "#0f172a",
    fontWeight: 950,
    letterSpacing: "-0.8px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 15,
    fontWeight: 650,
    lineHeight: 1.5,
  },

  clearButton: {
    height: 48,
    padding: "0 18px",
    border: 0,
    borderRadius: 18,
    background: "#ef4444",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(239, 68, 68, 0.20)",
  },

  heroCard: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: 22,
    borderRadius: 30,
    background: "linear-gradient(135deg, #0f172a 0%, #dc2626 100%)",
    color: "white",
    marginBottom: 22,
    boxShadow: "0 24px 50px rgba(220, 38, 38, 0.20)",
  },

  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: 34,
  },

  heroTitle: {
    margin: 0,
    fontSize: 23,
    fontWeight: 950,
  },

  heroText: {
    margin: "6px 0 0",
    color: "rgba(255,255,255,0.72)",
    fontWeight: 650,
    lineHeight: 1.45,
  },

  priorityPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 13px",
    borderRadius: 999,
    border: "1px solid transparent",
    background: "white",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  statsGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 22,
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 26,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(226,232,240,0.9)",
    backdropFilter: "blur(14px)",
  },

  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    display: "grid",
    placeItems: "center",
    fontSize: 25,
  },

  statTitle: {
    display: "block",
    color: "#64748b",
    fontWeight: 850,
    fontSize: 13,
    marginBottom: 3,
  },

  statValue: {
    display: "block",
    fontWeight: 950,
    lineHeight: 1.1,
  },

  layout: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, .92fr)",
    gap: 22,
    alignItems: "start",
  },

  formCard: {
    padding: 22,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
  },

  sideColumn: {
    display: "grid",
    gap: 18,
  },

  previewCard: {
    padding: 22,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
  },

  templateCard: {
    padding: 22,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
  },

  

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
    marginBottom: 18,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 950,
    color: "#0f172a",
  },

  sectionSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.5,
    fontWeight: 620,
  },

  label: {
    display: "block",
    fontWeight: 900,
    color: "#334155",
    marginBottom: 9,
    marginTop: 18,
  },

  priorityGrid: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  priorityButton: {
    height: 44,
    padding: "0 14px",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  input: {
    width: "100%",
    minHeight: 50,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 18,
    padding: "0 15px",
    color: "#0f172a",
    fontWeight: 750,
    outline: 0,
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    minHeight: 160,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 20,
    padding: 15,
    color: "#0f172a",
    fontWeight: 700,
    lineHeight: 1.55,
    outline: 0,
    resize: "vertical",
    boxSizing: "border-box",
  },

  formMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
    marginTop: 10,
  },

  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 22,
  },

  sendButton: {
    minHeight: 50,
    padding: "0 18px",
    border: 0,
    borderRadius: 18,
    background: "#dc2626",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(220, 38, 38, 0.22)",
  },

  resetButton: {
    minHeight: 50,
    padding: "0 18px",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 950,
    cursor: "pointer",
  },

  successBox: {
    display: "flex",
    gap: 16,
    marginTop: 24,
    padding: 18,
    borderRadius: 22,
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
  },

  successIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background: "#bbf7d0",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    flexShrink: 0,
  },

  successTitle: {
    margin: 0,
    fontWeight: 950,
  },

  successText: {
    margin: "5px 0 0",
    fontWeight: 650,
  },

  successStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    fontWeight: 900,
  },

  phonePreview: {
    marginTop: 14,
    background: "linear-gradient(180deg, #0f172a, #1e293b)",
    borderRadius: 34,
    padding: 18,
    minHeight: 320,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
  },

  phoneTop: {
    width: 84,
    height: 7,
    borderRadius: 999,
    background: "#475569",
    margin: "0 auto 24px",
  },

  notificationCard: {
    display: "flex",
    gap: 14,
    background: "rgba(255,255,255,.95)",
    borderRadius: 22,
    padding: 16,
    boxShadow: "0 18px 40px rgba(0,0,0,.25)",
  },

  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    flexShrink: 0,
  },

  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#0f172a",
    fontSize: 14,
  },

  previewMessage: {
    color: "#475569",
    lineHeight: 1.45,
    fontWeight: 620,
    margin: "8px 0 12px",
  },

  previewBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
  },

  templateList: {
    display: "grid",
    gap: 12,
    marginTop: 18,
  },

  templateButton: {
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: 15,
    borderRadius: 22,
    cursor: "pointer",
    color: "#0f172a",
  },

  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    fontSize: 22,
    flexShrink: 0,
  },

  templateTitle: {
    display: "block",
    fontWeight: 950,
    marginBottom: 5,
  },

  templateText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.4,
    fontWeight: 620,
    fontSize: 13,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  templateBadge: {
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  rules: {
    display: "grid",
    gap: 12,
    marginTop: 18,
  },

  rule: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: 13,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  ruleIcon: {
    width: 23,
    height: 23,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#dcfce7",
    color: "#16a34a",
    fontWeight: 950,
    flexShrink: 0,
  },

  ruleText: {
    margin: 0,
    color: "#334155",
    fontWeight: 700,
    lineHeight: 1.4,
  },
};
