import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { startSignalR } from "../services/signalr";
import { formatLebanonTime } from "../utils/dateTime";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveMessage, setLiveMessage] = useState("");

  const adminName = localStorage.getItem("adminName") || "Admin";

  useEffect(() => {
    loadDashboard();

    startSignalR({
      onReportSubmitted: (newReport) => {
        const normalized = normalizeReport(newReport);

        setReports((prev) => {
          const exists = prev.some((r) => getId(r) === getId(normalized));
          if (exists) return prev;
          return [normalized, ...prev];
        });

        setLiveMessage("New report received live");
      },

      onReportStatusUpdated: (updatedReport) => {
        const updated = normalizeReport(updatedReport);

        setReports((prev) =>
          prev.map((r) =>
            getId(r) === getId(updated)
              ? {
                  ...r,
                  status: updated.status ?? r.status,
                }
              : r
          )
        );

        setLiveMessage("Report status updated live");
      },

      onReceiveAlert: (alert) => {
        const normalized = normalizeReport({
          ...alert,
          status: "Verified",
          votesCount: 0,
          userName: "Live Alert",
        });

        setReports((prev) => {
          const exists = prev.some((r) => getId(r) === getId(normalized));
          if (exists) return prev;
          return [normalized, ...prev];
        });

        setLiveMessage("Verified alert received live");
      },
    });
  }, []);

  const normalizeReport = (report) => {
    return {
      id: report.id ?? report.Id,
      type: report.type ?? report.Type,
      description: report.description ?? report.Description,
      severity: report.severity ?? report.Severity,
      score: report.score ?? report.Score ?? 0,
      status: report.status ?? report.Status,
      createdAt: report.createdAt ?? report.CreatedAt ?? new Date().toISOString(),
      userId: report.userId ?? report.UserId,
      userName: report.userName ?? report.UserName,
      latitude: report.latitude ?? report.Latitude ?? 0,
      longitude: report.longitude ?? report.Longitude ?? 0,
      imageUrl: report.imageUrl ?? report.ImageUrl,
      votesCount: report.votesCount ?? report.VotesCount ?? 0,
    };
  };

  const getId = (report) => report.id ?? report.Id;

  const buildStatsFromReports = (reportList, usersCount) => {
    const totalReports = reportList.length;
    const pendingReports = reportList.filter((r) => r.status === "Pending").length;
    const verifiedReports = reportList.filter((r) => r.status === "Verified").length;
    const rejectedReports = reportList.filter((r) => r.status === "Rejected").length;
    const resolvedReports = reportList.filter((r) => r.status === "Resolved").length;

    return {
      totalReports,
      pendingReports,
      verifiedReports,
      rejectedReports,
      resolvedReports,
      usersCount,
      severity: {
        low: reportList.filter((r) => Number(r.severity) === 1).length,
        medium: reportList.filter((r) => Number(r.severity) === 2).length,
        high: reportList.filter((r) => Number(r.severity) === 3).length,
        critical: reportList.filter((r) => Number(r.severity) === 4).length,
      },
    };
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [statsRes, reportsRes, usersRes] = await Promise.all([
        api.get("/admin/dashboard/stats"),
        api.get("/admin/reports/all"),
        api.get("/admin/users/all"),
      ]);

      const normalizedReports = reportsRes.data.map((r) => normalizeReport(r));

      setStats(statsRes.data);
      setReports(normalizedReports);
      setUsers(usersRes.data);
    } catch (error) {
      alert("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const computedStats = useMemo(() => {
    if (!stats) return null;
    return buildStatsFromReports(reports, users.length || stats.usersCount || 0);
  }, [reports, users, stats]);

  const recentReports = useMemo(() => {
    return [...reports].slice(0, 6);
  }, [reports]);

  const criticalReports = useMemo(() => {
    return reports.filter((r) => Number(r.severity) === 4).length;
  }, [reports]);

  const pendingPercentage = useMemo(() => {
    if (!computedStats || computedStats.totalReports === 0) return 0;
    return Math.round(
      (computedStats.pendingReports / computedStats.totalReports) * 100
    );
  }, [computedStats]);

  const verifiedPercentage = useMemo(() => {
    if (!computedStats || computedStats.totalReports === 0) return 0;
    return Math.round(
      (computedStats.verifiedReports / computedStats.totalReports) * 100
    );
  }, [computedStats]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#f97316";
      case "Verified":
        return "#22c55e";
      case "Rejected":
        return "#ef4444";
      case "Resolved":
        return "#2563eb";
      default:
        return "#64748b";
    }
  };

  const getSeverityColor = (severity) => {
    switch (Number(severity)) {
      case 1:
        return "#2563eb";
      case 2:
        return "#f97316";
      case 3:
        return "#ef4444";
      case 4:
        return "#7c3aed";
      default:
        return "#64748b";
    }
  };

  const getSeverityText = (severity) => {
    switch (Number(severity)) {
      case 1:
        return "Low";
      case 2:
        return "Medium";
      case 3:
        return "High";
      case 4:
        return "Critical";
      default:
        return "Unknown";
    }
  };

  const getReportIcon = (type) => {
    const value = (type || "").toLowerCase();

    if (value.includes("fire")) return "🔥";
    if (value.includes("flood")) return "🌊";
    if (value.includes("earthquake")) return "⛰️";
    if (value.includes("accident")) return "🚗";
    if (value.includes("sos")) return "🆘";

    return "⚠️";
  };

  const formatDate = (date) => {
    if (!date) return "Not available";
return formatLebanonTime(date);  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOrbOne} />
        <div style={styles.bgOrbTwo} />
        <StateBox
          icon="⏳"
          title="Loading dashboard..."
          text="Please wait while we fetch admin data."
        />
      </div>
    );
  }

  if (!computedStats) {
    return (
      <div style={styles.page}>
        <StateBox
          icon="📊"
          title="Dashboard unavailable"
          text="Could not load dashboard statistics."
        >
          <button style={styles.primaryButton} onClick={loadDashboard}>
            Retry
          </button>
        </StateBox>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Disaster Admin Center</div>
          <h1 style={styles.title}>Welcome back, {adminName}</h1>
          <p style={styles.subtitle}>
            Monitor disaster reports, users, severity levels, and emergency activity.
          </p>

          {liveMessage && (
            <p style={styles.liveMessage}>
              <span style={styles.liveDot}></span>
              {liveMessage}
            </p>
          )}
        </div>

        <button style={styles.primaryButton} onClick={loadDashboard}>
          ↻ Refresh Dashboard
        </button>
      </div>

      <div style={styles.hero}>
        <div style={styles.heroIcon}>🛡️</div>

        <div style={{ flex: 1 }}>
          <span style={styles.heroBadge}>Emergency Control Center</span>
          <h2 style={styles.heroTitle}>Disaster System Admin Panel</h2>
          <p style={styles.heroText}>
            Review pending reports quickly, verify real disasters, and keep users informed in real time.
          </p>
        </div>

        <div style={styles.heroStats}>
          <MiniHeroStat value={computedStats.totalReports} label="Total Reports" />
          <MiniHeroStat value={`${pendingPercentage}%`} label="Pending Ratio" />
          <MiniHeroStat value={`${verifiedPercentage}%`} label="Verified" />
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard title="Total Reports" value={computedStats.totalReports} color="#2563eb" icon="📊" />
        <StatCard title="Pending Reports" value={computedStats.pendingReports} color="#f97316" icon="⏳" />
        <StatCard title="Verified Reports" value={computedStats.verifiedReports} color="#22c55e" icon="✅" />
        <StatCard title="Rejected Reports" value={computedStats.rejectedReports} color="#ef4444" icon="❌" />
        <StatCard title="Resolved Reports" value={computedStats.resolvedReports} color="#0ea5e9" icon="🛡️" />
        <StatCard title="Registered Users" value={computedStats.usersCount} color="#7c3aed" icon="👥" />
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.card}>
          <SectionHeader
            title="Severity Overview"
            subtitle="Distribution of report severity."
          />

          <div style={styles.severityList}>
            <SeverityBar
              label="Low"
              value={computedStats.severity?.low ?? 0}
              total={computedStats.totalReports}
              color="#2563eb"
            />
            <SeverityBar
              label="Medium"
              value={computedStats.severity?.medium ?? 0}
              total={computedStats.totalReports}
              color="#f97316"
            />
            <SeverityBar
              label="High"
              value={computedStats.severity?.high ?? 0}
              total={computedStats.totalReports}
              color="#ef4444"
            />
            <SeverityBar
              label="Critical"
              value={computedStats.severity?.critical ?? 0}
              total={computedStats.totalReports}
              color="#7c3aed"
            />
          </div>
        </div>

        <div style={styles.card}>
          <SectionHeader
            title="Risk Summary"
            subtitle="Important operational indicators."
          />

          <div style={styles.riskGrid}>
            <RiskBox title="Critical" value={criticalReports} color="#7c3aed" icon="🚨" />
            <RiskBox title="Pending" value={computedStats.pendingReports} color="#f97316" icon="⏳" />
            <RiskBox title="Users" value={users.length} color="#2563eb" icon="👥" />
            <RiskBox title="Resolved" value={computedStats.resolvedReports} color="#22c55e" icon="✅" />
          </div>
        </div>
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.card}>
          <SectionHeader
            title="Recent Reports"
            subtitle="Latest submitted disaster reports."
            action={<a href="/reports" style={styles.viewLink}>View all</a>}
          />

          {recentReports.length === 0 ? (
            <div style={styles.empty}>No reports available.</div>
          ) : (
            <div style={styles.reportList}>
              {recentReports.map((report) => (
                <div key={getId(report)} style={styles.reportItem}>
                  <div
                    style={{
                      ...styles.reportIcon,
                      background: `${getSeverityColor(report.severity)}18`,
                      borderColor: `${getSeverityColor(report.severity)}22`,
                    }}
                  >
                    <span>{getReportIcon(report.type)}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.reportTitleRow}>
                      <strong style={styles.reportTitle}>
                        {report.type || "Unknown"}
                      </strong>

                      <span
                        style={{
                          ...styles.statusBadge,
                          background: `${getStatusColor(report.status)}16`,
                          color: getStatusColor(report.status),
                        }}
                      >
                        {report.status}
                      </span>
                    </div>

                    <p style={styles.reportDescription}>
                      {report.description || "No description provided"}
                    </p>

                    <div style={styles.reportMeta}>
                      <span
                        style={{
                          color: getSeverityColor(report.severity),
                          fontWeight: 950,
                        }}
                      >
                        {getSeverityText(report.severity)}
                      </span>
                      <span>By {report.userName || "Unknown"}</span>
                      <span>{formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <SectionHeader
            title="Quick Actions"
            subtitle="Common admin tasks."
          />

          <div style={styles.quickActions}>
            <QuickAction href="/reports" icon="📝" title="Review Reports" text="Verify, reject, resolve, or delete reports." />
            <QuickAction href="/map" icon="🗺️" title="Open Live Map" text="View disasters by location and severity." />
            <QuickAction href="/broadcast" icon="🚨" title="Send Broadcast" text="Notify all users with emergency instructions." danger />
            <QuickAction href="/users" icon="👥" title="View Users" text="Check users, reputation, and report counts." />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniHeroStat({ value, label }) {
  return (
    <div style={styles.miniHeroStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div style={{ ...styles.statCard, boxShadow: `0 18px 34px ${color}18` }}>
      <div style={styles.statTop}>
        <span style={styles.statTitle}>{title}</span>
        <div style={{ ...styles.statIcon, background: `${color}14`, color }}>
          {icon}
        </div>
      </div>
      <strong style={{ ...styles.statValue, color }}>{value ?? 0}</strong>
    </div>
  );
}

function SeverityBar({ label, value, total, color }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div style={styles.barTop}>
        <span>{label}</span>
        <strong>
          {value} ({percent}%)
        </strong>
      </div>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${percent}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function RiskBox({ title, value, color, icon }) {
  return (
    <div style={{ ...styles.riskBox, borderColor: `${color}30` }}>
      <div style={{ ...styles.riskIcon, background: `${color}14`, color }}>
        {icon}
      </div>
      <span style={{ color }}>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.sectionSubtitle}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function QuickAction({ href, icon, title, text, danger }) {
  return (
    <a href={href} style={danger ? styles.quickActionDanger : styles.quickAction}>
      <span style={styles.quickActionIcon}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </a>
  );
}

function StateBox({ icon, title, text, children }) {
  return (
    <div style={styles.stateBox}>
      <div style={styles.stateIcon}>{icon}</div>
      <h2 style={styles.stateTitle}>{title}</h2>
      <p style={styles.stateText}>{text}</p>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
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

  primaryButton: {
    height: 48,
    padding: "0 18px",
    border: 0,
    borderRadius: 18,
    background: "#0f172a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.18)",
    whiteSpace: "nowrap",
  },

  liveMessage: {
    margin: "12px 0 0",
    color: "#16a34a",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.14)",
  },

  hero: {
    position: "relative",
    zIndex: 1,
    background:
      "radial-gradient(circle at top right, rgba(14,165,233,.28), transparent 32%), linear-gradient(135deg, #0f172a, #1e3a8a)",
    color: "white",
    borderRadius: 30,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 22,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
  },

  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.14)",
    border: "1px solid rgba(255,255,255,.18)",
    fontSize: 38,
    flexShrink: 0,
  },

  heroBadge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,.12)",
    color: "#dbeafe",
    fontWeight: 900,
    fontSize: 13,
  },

  heroTitle: {
    margin: "15px 0 8px",
    fontSize: 32,
    letterSpacing: "-0.04em",
    fontWeight: 950,
  },

  heroText: {
    margin: 0,
    maxWidth: 680,
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontWeight: 620,
  },

  heroStats: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  miniHeroStat: {
    minWidth: 116,
    padding: "16px 14px",
    borderRadius: 22,
    background: "rgba(255,255,255,.12)",
    border: "1px solid rgba(255,255,255,.16)",
    textAlign: "center",
  },

  statsGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(145px, 1fr))",
    gap: 14,
    marginTop: 22,
  },

  statCard: {
    padding: 18,
    borderRadius: 26,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(226,232,240,0.9)",
    backdropFilter: "blur(14px)",
  },

  statTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  statTitle: {
    color: "#64748b",
    fontWeight: 850,
    fontSize: 13,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    flexShrink: 0,
  },

  statValue: {
    display: "block",
    fontSize: 29,
    fontWeight: 950,
    lineHeight: 1,
  },

  contentGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, .8fr)",
    gap: 22,
    marginTop: 22,
  },

  card: {
    padding: 22,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
  },

  sectionHeader: {
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
    margin: "7px 0 0",
    color: "#64748b",
    lineHeight: 1.45,
    fontWeight: 620,
  },

  severityList: {
    display: "grid",
    gap: 18,
  },

  barTop: {
    display: "flex",
    justifyContent: "space-between",
    color: "#334155",
    fontWeight: 850,
    marginBottom: 8,
  },

  barTrack: {
    height: 12,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 999,
  },

  riskGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 14,
  },

  riskBox: {
    border: "1px solid",
    borderRadius: 22,
    padding: 17,
    background: "#f8fafc",
  },

  riskIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    marginBottom: 11,
  },

  reportList: {
    display: "grid",
    gap: 12,
  },

  reportItem: {
    display: "flex",
    gap: 14,
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 22,
    background: "#f8fafc",
    alignItems: "flex-start",
  },

  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    flexShrink: 0,
    border: "1px solid transparent",
  },

  reportTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  reportTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 950,
  },

  reportDescription: {
    margin: "6px 0 0",
    color: "#64748b",
    lineHeight: 1.45,
    fontWeight: 620,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  reportMeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 12,
    marginTop: 9,
    fontWeight: 750,
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  viewLink: {
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  empty: {
    padding: 28,
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: 20,
    fontWeight: 800,
  },

  quickActions: {
    display: "grid",
    gap: 12,
  },

  quickAction: {
    display: "flex",
    gap: 14,
    textDecoration: "none",
    color: "#0f172a",
    padding: 16,
    borderRadius: 22,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  quickActionDanger: {
    display: "flex",
    gap: 14,
    textDecoration: "none",
    color: "#7f1d1d",
    padding: 16,
    borderRadius: 22,
    background: "#fef2f2",
    border: "1px solid #fecaca",
  },

  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    fontSize: 21,
    flexShrink: 0,
  },

  stateBox: {
    position: "relative",
    zIndex: 1,
    minHeight: 360,
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
