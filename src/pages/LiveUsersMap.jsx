import { useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  Marker,
  Circle,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { formatLebanonTime } from "../utils/dateTime";

import api from "../api/api";

const lebanonCenter = {
  lat: 33.8938,
  lng: 35.5018,
};

export default function LiveUsersMap() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const [usersRes, reportsRes] = await Promise.all([
        api.get("/location/live"),
        api.get("/admin/reports/all"),
      ]);

      setUsers(usersRes.data);
      setReports(reportsRes.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
      alert("Failed to load live users data");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getDangerColor = (severity) => {
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

  const getDangerRadius = (severity) => {
    switch (Number(severity)) {
      case 1:
        return 10;
      case 2:
        return 20;
      case 3:
        return 30;
      case 4:
        return 40;
      default:
        return 30;
    }
  };

  const distanceMeters = (lat1, lng1, lat2, lng2) => {
    const earthRadius = 6371000;
    const toRad = (v) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  };

  const getUserDangerReports = (user) => {
    return reports.filter((report) => {
      if (!report.latitude || !report.longitude) return false;

      const distance = distanceMeters(
        Number(user.latitude),
        Number(user.longitude),
        Number(report.latitude),
        Number(report.longitude)
      );

      return distance <= getDangerRadius(report.severity);
    });
  };

  const isUserInDanger = (user) => {
    return getUserDangerReports(user).length > 0;
  };

  const getUserStatus = (user) => {
  if (user.isOnline === false) return "Offline";
  if (isUserInDanger(user)) return "Danger";
  return "Safe";
};

  const getUserMarkerIcon = (user) => {
    const status = getUserStatus(user);

    if (status === "Danger") {
      return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
    }

    if (status === "Offline") {
      return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
    }

    return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch = `
        ${user.userName}
        ${user.userEmail}
        ${user.userRole}
      `
        .toLowerCase()
        .includes(keyword);

      const status = getUserStatus(user);

      const matchesFilter =
        selectedFilter === "All" || selectedFilter === status;

      return matchesSearch && matchesFilter;
    });
  }, [users, reports, search, selectedFilter]);

  const summary = useMemo(() => {
    const dangerUsers = users.filter((u) => getUserStatus(u) === "Danger").length;
    const safeUsers = users.filter((u) => getUserStatus(u) === "Safe").length;
    const offlineUsers = users.filter((u) => getUserStatus(u) === "Offline").length;

    return {
      total: users.length,
      danger: dangerUsers,
      safe: safeUsers,
      offline: offlineUsers,
    };
  }, [users, reports]);

  const formatDate = (date) => {
    if (!date) return "Not available";
return formatLebanonTime(date);  };

  if (!isLoaded) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOrbOne} />
        <div style={styles.bgOrbTwo} />
        <StateBox icon="🗺️" title="Loading map..." text="Preparing Google Maps." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOrbOne} />
        <div style={styles.bgOrbTwo} />
        <StateBox
          icon="📍"
          title="Loading live users..."
          text="Please wait while we fetch user locations."
        />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Live Location Intelligence</div>
          <h1 style={styles.title}>Live Users Monitoring</h1>
          <p style={styles.subtitle}>
            Track active users, offline users, and danger proximity in real time.
          </p>

          {lastRefresh && (
            <p style={styles.liveText}>
              <span style={styles.liveDot}></span>
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>

        <button style={styles.refreshButton} onClick={() => loadData()}>
          ↻ Refresh Live Data
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>🛰️</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Live Safety Radar</h2>
          <p style={styles.heroText}>
            Watch user positions, identify nearby risk zones, and react quickly when people are close to danger.
          </p>
        </div>

        <div style={styles.livePill}>
          <span style={styles.liveDotWhite} />
          Auto refresh 10s
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard title="Tracked Users" value={summary.total} color="#2563eb" icon="👥" />
        <SummaryCard title="Danger Nearby" value={summary.danger} color="#ef4444" icon="🚨" />
        <SummaryCard title="Safe Users" value={summary.safe} color="#22c55e" icon="✅" />
        <SummaryCard title="Offline / Old" value={summary.offline} color="#f97316" icon="🟠" />
      </div>

      <div style={styles.layout}>
        <div>
          <div style={styles.toolbar}>
            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>⌕</span>
              <input
                style={styles.searchInput}
                placeholder="Search user name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={styles.filterRow}>
              {["All", "Safe", "Danger", "Offline"].map((filter) => {
                const selected = selectedFilter === filter;
                const color =
                  filter === "Danger"
                    ? "#ef4444"
                    : filter === "Safe"
                    ? "#22c55e"
                    : filter === "Offline"
                    ? "#f97316"
                    : "#0f172a";

                return (
                  <button
                    key={filter}
                    style={{
                      ...styles.filterChip,
                      background: selected ? color : "#ffffff",
                      color: selected ? "#ffffff" : "#0f172a",
                      borderColor: selected ? color : "#e2e8f0",
                    }}
                    onClick={() => setSelectedFilter(filter)}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            <div style={styles.mapHint}>
              Showing <strong>{filteredUsers.length}</strong> user marker(s)
            </div>
          </div>

          <div style={styles.mapShell}>
            <div style={styles.mapTopOverlay}>
              <div style={styles.mapBadge}>Lebanon Live Map</div>
              <div style={styles.mapBadge}>{reports.length} danger zone(s)</div>
            </div>

            <GoogleMap
              mapContainerStyle={{
                width: "100%",
                height: "100%",
                borderRadius: "28px",
              }}
              center={lebanonCenter}
              zoom={8}
              options={{
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
              }}
            >
              {reports.map((report) => {
                if (!report.latitude || !report.longitude) return null;

                return (
                  <Circle
                    key={`danger-${report.id}`}
                    center={{
                      lat: Number(report.latitude),
                      lng: Number(report.longitude),
                    }}
                    radius={getDangerRadius(report.severity)}
                    options={{
                      fillColor: getDangerColor(report.severity),
                      fillOpacity: 0.2,
                      strokeColor: getDangerColor(report.severity),
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                    }}
                  />
                );
              })}

              {filteredUsers.map((user) => (
                <Marker
                  key={user.userId}
                  position={{
                    lat: Number(user.latitude),
                    lng: Number(user.longitude),
                  }}
                  icon={{
                    url: getUserMarkerIcon(user),
                  }}
                  onClick={() => setSelectedUser(user)}
                />
              ))}

              {selectedUser && (
                <InfoWindow
                  position={{
                    lat: Number(selectedUser.latitude),
                    lng: Number(selectedUser.longitude),
                  }}
                  onCloseClick={() => setSelectedUser(null)}
                >
                  <UserInfoWindow
                    user={selectedUser}
                    status={getUserStatus(selectedUser)}
                    dangerReports={getUserDangerReports(selectedUser)}
                    formatDate={formatDate}
                  />
                </InfoWindow>
              )}
            </GoogleMap>
          </div>

          <div style={styles.legend}>
            <Legend color="#22c55e" text="Safe user" />
            <Legend color="#ef4444" text="Danger nearby" />
            <Legend color="#f97316" text="Offline / old location" />
            <Legend color="#7c3aed" text="Danger zone" />
          </div>
        </div>

        <div style={styles.sidePanel}>
          <div style={styles.sideHeader}>
            <div>
              <h2 style={styles.sideTitle}>Users Status</h2>
              <p style={styles.sideSubtitle}>
                Click a user to inspect location and danger status.
              </p>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div style={styles.emptyBox}>No users found.</div>
          ) : (
            <div style={styles.usersList}>
              {filteredUsers.map((user) => {
                const status = getUserStatus(user);
                const dangerReports = getUserDangerReports(user);

                return (
                  <button
                    key={user.userId}
                    style={{
                      ...styles.userRow,
                      borderColor:
                        status === "Danger"
                          ? "rgba(239,68,68,.24)"
                          : status === "Offline"
                          ? "rgba(249,115,22,.24)"
                          : "rgba(34,197,94,.22)",
                    }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div
                      style={{
                        ...styles.avatar,
                        background:
                          status === "Danger"
                            ? "#fee2e2"
                            : status === "Offline"
                            ? "#ffedd5"
                            : "#dcfce7",
                        color:
                          status === "Danger"
                            ? "#991b1b"
                            : status === "Offline"
                            ? "#9a3412"
                            : "#166534",
                      }}
                    >
                      {(user.userName || "U").substring(0, 1).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.userTop}>
                        <strong>{user.userName || "Unknown User"}</strong>
                        <span
                          style={{
                            ...styles.userStatusBadge,
                            background:
                              status === "Danger"
                                ? "#fee2e2"
                                : status === "Offline"
                                ? "#ffedd5"
                                : "#dcfce7",
                            color:
                              status === "Danger"
                                ? "#991b1b"
                                : status === "Offline"
                                ? "#9a3412"
                                : "#166534",
                          }}
                        >
                          {status}
                        </span>
                      </div>

                      <span style={styles.userEmail}>{user.userEmail || "No email"}</span>

                      <small style={styles.userSmall}>
                        {dangerReports.length > 0
                          ? `${dangerReports.length} danger zone(s) nearby`
                          : "No nearby danger"}
                      </small>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserInfoWindow({ user, status, dangerReports, formatDate }) {
  return (
    <div style={styles.infoWindow}>
      <h3 style={styles.infoTitle}>{user.userName || "Unknown User"}</h3>

      <p>
        <strong>Email:</strong> {user.userEmail || "No email"}
      </p>

      <p>
        <strong>Role:</strong> {user.userRole || "User"}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        {status === "Danger"
          ? "⚠ Danger Nearby"
          : status === "Offline"
          ? "🟠 Offline / Old Location"
          : "✅ Safe"}
      </p>

      <p>
        <strong>Coordinates:</strong>{" "}
        {Number(user.latitude).toFixed(5)}, {Number(user.longitude).toFixed(5)}
      </p>

      <p>
        <strong>Updated:</strong> {formatDate(user.updatedAt)}
      </p>

      {dangerReports.length > 0 && (
        <div style={styles.dangerBox}>
          <strong>Nearby dangers:</strong>
          {dangerReports.slice(0, 3).map((report) => (
            <p key={report.id}>
              ⚠ {report.type} - Severity {report.severity}/4
            </p>
          ))}
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

function Legend({ color, text }) {
  return (
    <div style={styles.legendItem}>
      <span style={{ ...styles.legendDot, background: color }} />
      {text}
    </div>
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
    pointerEvents: "none",
  },

  bgOrbTwo: {
    position: "absolute",
    width: 240,
    height: 240,
    bottom: -120,
    left: -80,
    borderRadius: "999px",
    background: "rgba(34, 197, 94, 0.12)",
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
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.18)",
    whiteSpace: "nowrap",
  },

  liveText: {
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
    flexShrink: 0,
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

  liveDotWhite: {
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
    gridTemplateColumns: "repeat(4, minmax(165px, 1fr))",
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
    flexShrink: 0,
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

  layout: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(340px, 0.65fr)",
    gap: 22,
    alignItems: "start",
  },

  toolbar: {
    display: "grid",
    gap: 14,
    marginBottom: 18,
    padding: 16,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 36px rgba(15,23,42,0.06)",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    height: 50,
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

  filterRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  filterChip: {
    height: 42,
    padding: "0 14px",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontWeight: 900,
  },

  mapHint: {
    color: "#64748b",
    fontWeight: 800,
  },

  mapShell: {
    position: "relative",
    height: "calc(100vh - 430px)",
    minHeight: 560,
    padding: 10,
    borderRadius: 34,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 22px 44px rgba(15,23,42,0.10)",
  },

  mapTopOverlay: {
    position: "absolute",
    zIndex: 2,
    top: 22,
    left: 22,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  mapBadge: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,.94)",
    color: "#0f172a",
    fontWeight: 900,
    boxShadow: "0 10px 20px rgba(15,23,42,0.10)",
  },

  legend: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 16,
    background: "#ffffff",
    padding: "14px 16px",
    borderRadius: 20,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontWeight: 900,
    color: "#334155",
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },

  sidePanel: {
    position: "sticky",
    top: 24,
    maxHeight: "calc(100vh - 60px)",
    overflowY: "auto",
    padding: 20,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15,23,42,0.07)",
  },

  sideHeader: {
    marginBottom: 18,
  },

  sideTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 950,
    color: "#0f172a",
  },

  sideSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.5,
    fontWeight: 620,
  },

  emptyBox: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: 18,
    fontWeight: 800,
    border: "1px solid #e2e8f0",
  },

  usersList: {
    display: "grid",
    gap: 12,
  },

  userRow: {
    display: "flex",
    gap: 12,
    width: "100%",
    textAlign: "left",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: 13,
    borderRadius: 22,
    cursor: "pointer",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    flexShrink: 0,
  },

  userTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },

  userStatusBadge: {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 950,
  },

  userEmail: {
    display: "block",
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userSmall: {
    display: "block",
    marginTop: 5,
    color: "#475569",
    fontWeight: 800,
  },

  infoWindow: {
    minWidth: 260,
    maxWidth: 310,
    color: "#0f172a",
  },

  infoTitle: {
    margin: "0 0 8px",
    fontSize: 20,
    fontWeight: 950,
  },

  dangerBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    background: "#fee2e2",
    color: "#991b1b",
  },

  stateBox: {
    position: "relative",
    zIndex: 1,
    minHeight: 320,
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
