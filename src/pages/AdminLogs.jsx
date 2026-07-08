import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { formatLebanonTime } from "../utils/dateTime";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("All");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/logs");
      setLogs(response.data);
    } catch {
      alert("Failed to load admin logs");
    } finally {
      setLoading(false);
    }
  };

  const actions = useMemo(() => {
    const unique = [...new Set(logs.map((log) => log.action).filter(Boolean))];
    return ["All", ...unique];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch = `
        ${log.adminName}
        ${log.action}
        ${log.targetType}
        ${log.description}
        ${log.targetId}
      `
        .toLowerCase()
        .includes(keyword);

      const matchesAction =
        selectedAction === "All" || log.action === selectedAction;

      return matchesSearch && matchesAction;
    });
  }, [logs, search, selectedAction]);

  const summary = useMemo(() => {
    return {
      total: logs.length,
      reportActions: logs.filter((l) => l.targetType === "Report").length,
      userActions: logs.filter((l) => l.targetType === "User").length,
      broadcasts: logs.filter((l) => l.targetType === "Broadcast").length,
    };
  }, [logs]);

  const formatDate = (date) => {
    if (!date) return "Not available";
    return formatLebanonTime(date);
  };

  const getActionColor = (action) => {
    if (!action) return "#64748b";

    if (action.includes("Delete")) return "#ef4444";
    if (action.includes("Ban")) return "#991b1b";
    if (action.includes("Unban")) return "#22c55e";
    if (action.includes("Make Admin")) return "#7c3aed";
    if (action.includes("Remove Admin")) return "#f97316";
    if (action.includes("Verified") || action.includes("Verify")) return "#22c55e";
    if (action.includes("Rejected") || action.includes("Reject")) return "#ef4444";
    if (action.includes("Resolved") || action.includes("Resolve")) return "#2563eb";
    if (action.includes("Broadcast")) return "#dc2626";

    return "#2563eb";
  };

  const getActionIcon = (action) => {
    if (!action) return "📌";

    if (action.includes("Delete")) return "🗑️";
    if (action.includes("Ban")) return "🚫";
    if (action.includes("Unban")) return "✅";
    if (action.includes("Make Admin")) return "👑";
    if (action.includes("Remove Admin")) return "🔻";
    if (action.includes("Verified") || action.includes("Verify")) return "✅";
    if (action.includes("Rejected") || action.includes("Reject")) return "❌";
    if (action.includes("Resolved") || action.includes("Resolve")) return "🛡️";
    if (action.includes("Broadcast")) return "🚨";

    return "📌";
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>System Security</div>
          <h1 style={styles.title}>Admin Activity Logs</h1>
          <p style={styles.subtitle}>
            Track every admin action with a clean audit timeline.
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadLogs}>
          <span style={styles.refreshIcon}>↻</span>
          Refresh
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>🛡️</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Audit Control Center</h2>
          <p style={styles.heroText}>
            Monitor approvals, user actions, broadcasts, and security changes in one place.
          </p>
        </div>
        <div style={styles.livePill}>
          <span style={styles.liveDot} />
          Live Records
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard
          title="Total Logs"
          value={summary.total}
          color="#2563eb"
          icon="📜"
        />
        <SummaryCard
          title="Report Actions"
          value={summary.reportActions}
          color="#22c55e"
          icon="🧾"
        />
        <SummaryCard
          title="User Actions"
          value={summary.userActions}
          color="#7c3aed"
          icon="👥"
        />
        <SummaryCard
          title="Broadcasts"
          value={summary.broadcasts}
          color="#ef4444"
          icon="📣"
        />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            placeholder="Search admin, action, target, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          style={styles.selectInput}
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
        >
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Activity Timeline</h2>
          <p style={styles.sectionSubtitle}>
            Showing {filteredLogs.length} of {logs.length} logs
          </p>
        </div>
      </div>

      {loading ? (
        <StateBox icon="⏳" title="Loading admin logs..." text="Please wait while records are loaded." />
      ) : filteredLogs.length === 0 ? (
        <StateBox icon="📜" title="No logs found" text="Try another search or action filter." />
      ) : (
        <div style={styles.timelineCard}>
          {filteredLogs.map((log, index) => {
            const color = getActionColor(log.action);

            return (
              <div key={log.id} style={styles.logRow}>
                <div style={styles.timelineRail}>
                  <div
                    style={{
                      ...styles.iconBox,
                      background: `${color}18`,
                      color,
                      borderColor: `${color}26`,
                    }}
                  >
                    {getActionIcon(log.action)}
                  </div>
                  {index !== filteredLogs.length - 1 && (
                    <div style={styles.railLine} />
                  )}
                </div>

                <div style={styles.logContent}>
                  <div style={styles.rowTop}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={styles.actionTitle}>{log.action || "Admin Action"}</h3>
                      <p style={styles.description}>
                        {log.description || "No description available."}
                      </p>
                    </div>

                    <span
                      style={{
                        ...styles.targetBadge,
                        background: `${color}14`,
                        color,
                        borderColor: `${color}22`,
                      }}
                    >
                      {log.targetType || "Target"}
                    </span>
                  </div>

                  <div style={styles.metaGrid}>
                    <MetaPill icon="👤" text={`Admin: ${log.adminName || "Unknown"}`} />
                    <MetaPill icon="🎯" text={`Target ID: ${log.targetId ?? "N/A"}`} />
                    <MetaPill icon="🕒" text={formatDate(log.createdAt)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
        <strong style={{ ...styles.statValue, color }}>{value}</strong>
      </div>
    </div>
  );
}

function MetaPill({ icon, text }) {
  return (
    <span style={styles.metaPill}>
      <span>{icon}</span>
      {text}
    </span>
  );
}

function StateBox({ icon, title, text }) {
  return (
    <div style={styles.stateBox}>
      <div style={styles.stateIcon}>{icon}</div>
      <h2 style={styles.stateTitle}>{title}</h2>
      <p style={styles.stateText}>{text}</p>
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
    background: "rgba(37, 99, 235, 0.12)",
    filter: "blur(2px)",
    pointerEvents: "none",
  },

  bgOrbTwo: {
    position: "absolute",
    width: 240,
    height: 240,
    bottom: -120,
    left: -80,
    borderRadius: "999px",
    background: "rgba(56, 189, 248, 0.16)",
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
    background: "#dbeafe",
    color: "#2563eb",
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

  refreshButton: {
    height: 48,
    padding: "0 18px",
    border: 0,
    borderRadius: 18,
    background: "#0f172a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.18)",
  },

  refreshIcon: {
    fontSize: 18,
    lineHeight: 1,
  },

  heroCard: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: 22,
    borderRadius: 30,
    background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
    color: "white",
    marginBottom: 22,
    boxShadow: "0 24px 50px rgba(37, 99, 235, 0.22)",
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

  livePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 13px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "white",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.18)",
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
    fontSize: 25,
    fontWeight: 950,
    lineHeight: 1,
  },

  toolbar: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 14,
    borderRadius: 26,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
    marginBottom: 22,
  },

  searchWrap: {
    flex: 1,
    minWidth: 240,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    height: 48,
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  searchIcon: {
    color: "#2563eb",
    fontWeight: 900,
    fontSize: 18,
  },

  searchInput: {
    flex: 1,
    border: 0,
    outline: 0,
    background: "transparent",
    color: "#0f172a",
    fontWeight: 750,
    fontSize: 14,
  },

  selectInput: {
    height: 48,
    minWidth: 230,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 18,
    padding: "0 14px",
    color: "#0f172a",
    fontWeight: 850,
    outline: 0,
  },

  sectionHeader: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    margin: "4px 0 14px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 950,
    color: "#0f172a",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontWeight: 750,
  },

  timelineCard: {
    position: "relative",
    zIndex: 1,
    padding: 0,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
    overflow: "hidden",
  },

  logRow: {
    display: "flex",
    gap: 16,
    padding: "20px 20px 0",
  },

  timelineRail: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 20,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    flexShrink: 0,
    border: "1px solid transparent",
  },

  railLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    background: "#e2e8f0",
    marginTop: 10,
  },

  logContent: {
    flex: 1,
    paddingBottom: 20,
    borderBottom: "1px solid #eef2f7",
    minWidth: 0,
  },

  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },

  actionTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 950,
    color: "#0f172a",
  },

  description: {
    margin: "7px 0 0",
    color: "#475569",
    lineHeight: 1.55,
    fontWeight: 620,
  },

  targetBadge: {
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid transparent",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  metaGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 13,
  },

  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 850,
  },

  stateBox: {
    position: "relative",
    zIndex: 1,
    minHeight: 280,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 28,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
    color: "#64748b",
  },

  stateIcon: {
    fontSize: 54,
    marginBottom: 8,
  },

  stateTitle: {
    margin: 0,
    color: "#0f172a",
    fontWeight: 950,
  },

  stateText: {
    margin: "8px 0 0",
    fontWeight: 650,
  },
};
