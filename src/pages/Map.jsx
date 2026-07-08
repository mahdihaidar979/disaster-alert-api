import { useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Circle,
  useJsApiLoader,
} from "@react-google-maps/api";
import api from "../api/api";
import { startSignalR } from "../services/signalr";
import { useLocation } from "react-router-dom";
import { formatLebanonTime } from "../utils/dateTime";

const centerLebanon = {
  lat: 33.8938,
  lng: 35.5018,
};

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [liveMessage, setLiveMessage] = useState("");

  const [safetyCheckIns, setSafetyCheckIns] = useState([]);
  const [selectedSafety, setSelectedSafety] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const location = useLocation();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const statuses = ["All", "Pending", "Verified", "Rejected", "Resolved"];

  useEffect(() => {
    loadReports();
    loadSafetyCheckIns();

    startSignalR({
      onReportSubmitted: (newReport) => {
        const normalized = normalizeReport(newReport);

        setReports((prev) => {
          const exists = prev.some((r) => getId(r) === getId(normalized));
          if (exists) return prev;
          return [normalized, ...prev];
        });

        setLiveMessage("New report marker added live");
      },
      
      onNewPendingReport: (newReport) => {
  const normalized = normalizeReport(newReport);

  setReports((prev) => {
    const exists = prev.some((r) => getId(r) === getId(normalized));
    if (exists) return prev;
    return [normalized, ...prev];
  });

  setLiveMessage("New pending report marker added live");
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

        setSelectedReport((prev) => {
          if (!prev) return prev;

          return getId(prev) === getId(updated)
            ? {
                ...prev,
                status: updated.status ?? prev.status,
              }
            : prev;
        });

        setLiveMessage("Report marker updated live");
      },

      onReceiveAlert: (alert) => {
        const normalized = normalizeReport({
          ...alert,
          status: "Verified",
          userName: "Live Alert",
          votesCount: 0,
        });

        setReports((prev) => {
          const exists = prev.some((r) => getId(r) === getId(normalized));
          if (exists) return prev;
          return [normalized, ...prev];
        });

        setLiveMessage("Verified alert marker received live");
      },

      onSafetyCheckInReceived: (checkIn) => {
        setSafetyCheckIns((prev) => {
          const exists = prev.some((x) => x.id === checkIn.id);
          if (exists) return prev;
          return [checkIn, ...prev];
        });

        setLiveMessage("Safety check-in received live");
      },
    });
  }, []);

  useEffect(() => {
    if (!mapRef) return;

    const params = new URLSearchParams(location.search);
    const lat = params.get("focusLat");
    const lng = params.get("focusLng");

    if (!lat || !lng) return;

    mapRef.panTo({
      lat: Number(lat),
      lng: Number(lng),
    });

    mapRef.setZoom(16);
  }, [mapRef, location.search]);

  useEffect(() => {
    const handler = (event) => {
      const { lat, lng } = event.detail;

      if (!mapRef) return;

      mapRef.panTo({
        lat: Number(lat),
        lng: Number(lng),
      });

      mapRef.setZoom(16);
    };

    window.addEventListener("focusSafetyLocation", handler);

    return () => {
      window.removeEventListener("focusSafetyLocation", handler);
    };
  }, [mapRef]);

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

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/reports/all");
      setReports(res.data.map((r) => normalizeReport(r)));
    } catch (err) {
      alert("Failed to load reports map");
    } finally {
      setLoading(false);
    }
  };

  const loadSafetyCheckIns = async () => {
    try {
      const res = await api.get("/SafetyCheckIns/all");
      setSafetyCheckIns(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredReports = useMemo(() => {
    if (selectedStatus === "All") return reports;
    return reports.filter((r) => r.status === selectedStatus);
  }, [reports, selectedStatus]);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === "Pending").length,
      verified: reports.filter((r) => r.status === "Verified").length,
      rejected: reports.filter((r) => r.status === "Rejected").length,
      resolved: reports.filter((r) => r.status === "Resolved").length,
      critical: reports.filter((r) => Number(r.severity) === 4).length,
      safe: safetyCheckIns.filter((x) => x.status === "Safe").length,
      needHelp: safetyCheckIns.filter((x) => x.status === "NeedHelp").length,
    };
  }, [reports, safetyCheckIns]);

  const getMarkerIcon = (severity) => {
    if (!window.google) return null;

    const color =
      Number(severity) === 1
        ? "blue"
        : Number(severity) === 2
        ? "orange"
        : Number(severity) === 3
        ? "red"
        : Number(severity) === 4
        ? "purple"
        : "gray";

    return {
      url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
    };
  };

  const getSafetyMarker = (status) => {
    if (!window.google) return null;

    return {
      url:
        status === "NeedHelp"
          ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
          : "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
    };
  };

  const getSafetyCircleColor = (status) => {
    return status === "NeedHelp" ? "#ef4444" : "#22c55e";
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = api.defaults.baseURL.replace("/api", "");
    return `${baseUrl}${imageUrl}`;
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/reports/${id}/status`, { status });

      setReports((prev) =>
        prev.map((r) => (getId(r) === id ? { ...r, status } : r))
      );

      setSelectedReport((prev) =>
        prev && getId(prev) === id ? { ...prev, status } : null
      );

      setLiveMessage(`Report #${id} changed to ${status}`);
    } catch {
      alert("Failed to update report");
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm("Delete this report?")) return;

    try {
      await api.delete(`/admin/reports/${id}`);

      setReports((prev) => prev.filter((r) => getId(r) !== id));
      setSelectedReport(null);
      setLiveMessage(`Report #${id} deleted`);
    } catch {
      alert("Failed to delete report");
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

  const refreshAll = () => {
    loadReports();
    loadSafetyCheckIns();
  };

  if (!isLoaded) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOrbOne} />
        <div style={styles.bgOrbTwo} />
        <StateBox icon="🗺️" title="Loading Google Map..." text="Preparing the live disaster map." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOrbOne} />
        <div style={styles.bgOrbTwo} />
        <StateBox icon="📍" title="Loading reports..." text="Fetching reports and safety check-ins." />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Live Disaster Intelligence</div>
          <h1 style={styles.title}>Live Reports Map</h1>
          <p style={styles.subtitle}>
            View disaster reports, safety check-ins, severity, and status in real time.
          </p>

          {liveMessage && (
            <p style={styles.liveMessage}>
              <span style={styles.liveDot}></span>
              {liveMessage}
            </p>
          )}
        </div>

        <button style={styles.refreshButton} onClick={refreshAll}>
          ↻ Refresh Map
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>🗺️</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Operational Map Center</h2>
          <p style={styles.heroText}>
            Monitor disaster markers, safety check-ins, and urgent help requests across Lebanon.
          </p>
        </div>

        <div style={styles.livePill}>
          <span style={styles.liveDotWhite} />
          Live SignalR
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard title="Total" value={summary.total} color="#2563eb" icon="📊" />
        <SummaryCard title="Pending" value={summary.pending} color="#f97316" icon="⏳" />
        <SummaryCard title="Verified" value={summary.verified} color="#22c55e" icon="✅" />
        <SummaryCard title="Rejected" value={summary.rejected} color="#ef4444" icon="❌" />
        <SummaryCard title="Resolved" value={summary.resolved} color="#0ea5e9" icon="🛡️" />
        <SummaryCard title="Critical" value={summary.critical} color="#7c3aed" icon="🚨" />
        <SummaryCard title="Safe" value={summary.safe} color="#22c55e" icon="🙂" />
        <SummaryCard title="Need Help" value={summary.needHelp} color="#ef4444" icon="🆘" />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filterRow}>
          {statuses.map((status) => {
            const selected = selectedStatus === status;
            const color = status === "All" ? "#0f172a" : getStatusColor(status);

            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                style={{
                  ...styles.filterChip,
                  background: selected ? color : "#ffffff",
                  color: selected ? "#ffffff" : "#0f172a",
                  borderColor: selected ? color : "#e2e8f0",
                }}
              >
                {status}
              </button>
            );
          })}
        </div>

        <div style={styles.mapHint}>
          Showing <strong>{filteredReports.length}</strong> report marker(s) +{" "}
          <strong>{safetyCheckIns.length}</strong> safety marker(s)
        </div>
      </div>

      <div style={styles.mapShell}>
        <div style={styles.mapOverlayTop}>
          <span style={styles.mapBadge}>Lebanon Live Map</span>
          <span style={styles.mapBadge}>{filteredReports.length} Reports</span>
          <span style={styles.mapBadge}>{safetyCheckIns.length} Check-ins</span>
        </div>

        <GoogleMap
          mapContainerStyle={styles.map}
          center={centerLebanon}
          zoom={8}
          onLoad={(map) => setMapRef(map)}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
          }}
        >
          {safetyCheckIns.map((item) => {
            if (!item.latitude || !item.longitude) return null;

            return (
              <Circle
                key={`circle_${item.id}`}
                center={{
                  lat: Number(item.latitude),
                  lng: Number(item.longitude),
                }}
                radius={item.status === "NeedHelp" ? 250 : 120}
                options={{
                  fillColor: getSafetyCircleColor(item.status),
                  fillOpacity: 0.15,
                  strokeColor: getSafetyCircleColor(item.status),
                  strokeOpacity: 0.7,
                  strokeWeight: 2,
                }}
              />
            );
          })}

          {safetyCheckIns.map((item) => {
            if (!item.latitude || !item.longitude) return null;

            return (
              <Marker
                key={`safety_${item.id}`}
                position={{
                  lat: Number(item.latitude),
                  lng: Number(item.longitude),
                }}
                icon={getSafetyMarker(item.status)}
                onClick={() => setSelectedSafety(item)}
              />
            );
          })}

          {filteredReports.map((report) => {
            if (!report.latitude || !report.longitude) return null;

            return (
              <Marker
                key={getId(report)}
                position={{
                  lat: Number(report.latitude),
                  lng: Number(report.longitude),
                }}
                icon={getMarkerIcon(report.severity)}
                onClick={() => setSelectedReport(report)}
              />
            );
          })}

          {selectedReport && (
            <InfoWindow
              position={{
                lat: Number(selectedReport.latitude),
                lng: Number(selectedReport.longitude),
              }}
              onCloseClick={() => setSelectedReport(null)}
            >
              <div style={styles.infoWindow}>
                <div style={styles.infoHeader}>
                  <h3 style={styles.infoTitle}>{selectedReport.type}</h3>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background: `${getStatusColor(selectedReport.status)}16`,
                      color: getStatusColor(selectedReport.status),
                    }}
                  >
                    {selectedReport.status}
                  </span>
                </div>

                {getImageUrl(selectedReport.imageUrl) && (
                  <img
                    src={getImageUrl(selectedReport.imageUrl)}
                    alt="Report"
                    style={styles.infoImage}
                  />
                )}

                <p style={styles.infoDescription}>
                  {selectedReport.description || "No description"}
                </p>

                <div style={styles.infoGrid}>
                  <InfoBox label="Severity">
                    <span
                      style={{
                        color: getSeverityColor(selectedReport.severity),
                        fontWeight: 900,
                      }}
                    >
                      {getSeverityText(selectedReport.severity)} (
                      {selectedReport.severity}/4)
                    </span>
                  </InfoBox>

                  <InfoBox label="User">
                    {selectedReport.userName || "Unknown"}
                  </InfoBox>

                  <InfoBox label="Votes">
                    {selectedReport.votesCount ?? 0}
                  </InfoBox>

                  <InfoBox label="Location">
                    {Number(selectedReport.latitude).toFixed(4)},{" "}
                    {Number(selectedReport.longitude).toFixed(4)}
                  </InfoBox>
                </div>

                <div style={styles.actions}>
                  {selectedReport.status !== "Verified" && (
                    <button
                      style={{ ...styles.actionButton, background: "#22c55e" }}
                      onClick={() => updateStatus(getId(selectedReport), "Verified")}
                    >
                      Verify
                    </button>
                  )}

                  {selectedReport.status !== "Rejected" && (
                    <button
                      style={{ ...styles.actionButton, background: "#ef4444" }}
                      onClick={() => updateStatus(getId(selectedReport), "Rejected")}
                    >
                      Reject
                    </button>
                  )}

                  {selectedReport.status !== "Resolved" && (
                    <button
                      style={{ ...styles.actionButton, background: "#2563eb" }}
                      onClick={() => updateStatus(getId(selectedReport), "Resolved")}
                    >
                      Resolve
                    </button>
                  )}

                  <button
                    style={{ ...styles.actionButton, background: "#0f172a" }}
                    onClick={() => deleteReport(getId(selectedReport))}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}

          {selectedSafety && (
            <InfoWindow
              position={{
                lat: Number(selectedSafety.latitude),
                lng: Number(selectedSafety.longitude),
              }}
              onCloseClick={() => setSelectedSafety(null)}
            >
              <div style={styles.safetyInfoWindow}>
                <h3
                  style={{
                    ...styles.safetyTitle,
                    color:
                      selectedSafety.status === "NeedHelp"
                        ? "#ef4444"
                        : "#22c55e",
                  }}
                >
                  {selectedSafety.status === "NeedHelp"
                    ? "🚨 NEED HELP"
                    : "✅ SAFE"}
                </h3>

                <div style={styles.infoGrid}>
                  <InfoBox label="User">
                    {selectedSafety.userName || "Unknown"}
                  </InfoBox>

                  <InfoBox label="User ID">
                    {selectedSafety.userId ?? "Unknown"}
                  </InfoBox>

                  <InfoBox label="Time">
                    {selectedSafety.createdAt
                      ? new Date(selectedSafety.createdAt).toLocaleString()
                      : "Unknown"}
                  </InfoBox>

                  <InfoBox label="Location">
                    {Number(selectedSafety.latitude).toFixed(4)},{" "}
                    {Number(selectedSafety.longitude).toFixed(4)}
                  </InfoBox>
                </div>

                <p style={styles.infoDescription}>
                  <strong>Message:</strong>{" "}
                  {selectedSafety.message || "No message"}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div style={styles.legend}>
        <Legend color="#2563eb" text="Low" />
        <Legend color="#f97316" text="Medium" />
        <Legend color="#ef4444" text="High / Need Help" />
        <Legend color="#7c3aed" text="Critical" />
        <Legend color="#22c55e" text="Safe User" />
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
        <strong style={{ ...styles.statValue, color }}>{value}</strong>
      </div>
    </div>
  );
}

function InfoBox({ label, children }) {
  return (
    <div style={styles.infoBox}>
      <span>{label}</span>
      <strong>{children}</strong>
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
    background: "rgba(239, 68, 68, 0.10)",
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
    gridTemplateColumns: "repeat(8, minmax(120px, 1fr))",
    gap: 14,
    marginBottom: 22,
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 24,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(226,232,240,0.9)",
    backdropFilter: "blur(14px)",
  },

  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    flexShrink: 0,
  },

  statTitle: {
    display: "block",
    color: "#64748b",
    fontWeight: 850,
    fontSize: 12,
    marginBottom: 4,
  },

  statValue: {
    display: "block",
    fontSize: 23,
    fontWeight: 950,
    lineHeight: 1,
  },

  toolbar: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 18,
    padding: 16,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 36px rgba(15,23,42,0.06)",
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
    zIndex: 1,
    height: "calc(100vh - 430px)",
    minHeight: 560,
    padding: 10,
    borderRadius: 34,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 22px 44px rgba(15,23,42,0.10)",
  },

  map: {
    width: "100%",
    height: "100%",
    borderRadius: "28px",
  },

  mapOverlayTop: {
    position: "absolute",
    top: 22,
    left: 22,
    zIndex: 2,
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

  infoWindow: {
    width: 320,
    color: "#0f172a",
  },

  safetyInfoWindow: {
    width: 320,
    color: "#0f172a",
  },

  safetyTitle: {
    margin: "0 0 12px",
    fontSize: 20,
    fontWeight: 950,
  },

  infoHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  infoTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 950,
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
  },

  infoImage: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 16,
    marginBottom: 12,
  },

  infoDescription: {
    color: "#475569",
    lineHeight: 1.5,
    fontWeight: 620,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 10,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },

  actionButton: {
    color: "#fff",
    border: "none",
    padding: "9px 11px",
    borderRadius: 11,
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  },

  legend: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginTop: "16px",
    background: "#ffffff",
    padding: "14px 16px",
    borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontWeight: "900",
    color: "#334155",
  },

  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
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
