import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import api from "../api/api";
import { startSignalR } from "../services/signalr";

const centerLebanon = {
  lat: 33.8938,
  lng: 35.5018,
};

const emptyCreateForm = {
  type: "",
  description: "",
  severity: "4",
  latitude: "",
  longitude: "",
  image: null,
};

function formatLebanonTime(date) {
  if (!date) return "Not available";

  const text = String(date);
  const utcText = /Z$|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`;
  const parsedDate = new Date(utcText);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleString("en-GB", {
    timeZone: "Asia/Beirut",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [search, setSearch] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creatingReport, setCreatingReport] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const statuses = ["All", "Pending", "Verified", "Rejected", "Resolved"];

  useEffect(() => {
    loadReports(selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
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
                  status: updated.status ?? updated.Status ?? r.status,
                }
              : r
          )
        );

        setSelectedReport((prev) => {
          if (!prev) return prev;

          return getId(prev) === getId(updated)
            ? {
                ...prev,
                status: updated.status ?? updated.Status ?? prev.status,
              }
            : prev;
        });

        setLiveMessage("Report status updated live");
      },

      onReportDeleted: (deleted) => {
        const deletedId =
          deleted.reportId ??
          deleted.ReportId ??
          deleted.id ??
          deleted.Id;

        setReports((prev) =>
          prev.filter((r) => getId(r) !== deletedId)
        );

        setSelectedReport((prev) =>
          prev && getId(prev) === deletedId ? null : prev
        );

        setLiveMessage(`Report #${deletedId} deleted live`);
      },

      onReceiveAlert: (alert) => {
        const normalized = normalizeReport({
          ...alert,
          status: "Verified",
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
      status: report.status ?? report.Status,
      createdAt: report.createdAt ?? report.CreatedAt ?? new Date().toISOString(),
      userId: report.userId ?? report.UserId,
      userName: report.userName ?? report.UserName,
      latitude: report.latitude ?? report.Latitude ?? 0,
      longitude: report.longitude ?? report.Longitude ?? 0,
      imageUrl: report.imageUrl ?? report.ImageUrl,
      locationName: report.locationName ?? report.LocationName,
      aiConfidence: report.aiConfidence ?? report.AiConfidence ?? 0,
      aiPrediction: report.aiPrediction ?? report.AiPrediction ?? "Unknown",
      aiReason: report.aiReason ?? report.AiReason ?? "",
    };
  };

  const getId = (report) => report.id ?? report.Id;

  const loadReports = async (status = selectedStatus) => {
    try {
      setLoading(true);

      const url =
        status === "All"
          ? "/admin/reports/all"
          : `/admin/reports/status/${status}`;

      const response = await api.get(url);
      setReports(response.data.map((r) => normalizeReport(r)));
    } catch (error) {
      alert("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return reports;

    return reports.filter((report) => {
      const text = `
        ${report.type}
        ${report.description}
        ${report.status}
        ${report.userName}
        ${report.severity}
      `.toLowerCase();

      return text.includes(keyword);
    });
  }, [reports, search]);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === "Pending").length,
      verified: reports.filter((r) => r.status === "Verified").length,
      rejected: reports.filter((r) => r.status === "Rejected").length,
      resolved: reports.filter((r) => r.status === "Resolved").length,
      critical: reports.filter((r) => Number(r.severity) === 4).length,
    };
  }, [reports]);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;

    const baseUrl = api.defaults.baseURL.replace("/api", "");
    return `${baseUrl}${imageUrl}`;
  };

  const updateCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const openMapPicker = () => {
    const lat = Number(createForm.latitude);
    const lng = Number(createForm.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
      setPickedLocation({ lat, lng });
    } else {
      setPickedLocation(centerLebanon);
    }

    setMapPickerOpen(true);
  };

  const handleMapClick = (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    const location = { lat, lng };
    setPickedLocation(location);
    setCreateForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const usePickedLocation = () => {
    if (!pickedLocation) return;

    setCreateForm((prev) => ({
      ...prev,
      latitude: pickedLocation.lat.toFixed(6),
      longitude: pickedLocation.lng.toFixed(6),
    }));
    setMapPickerOpen(false);
  };

  const createVerifiedReport = async (e) => {
    e.preventDefault();

    const latitude = Number(createForm.latitude);
    const longitude = Number(createForm.longitude);
    const severity = Number(createForm.severity);

    if (!createForm.type.trim()) {
      alert("Report type is required");
      return;
    }

    if (Number.isNaN(severity) || severity < 1 || severity > 4) {
      alert("Severity must be between 1 and 4");
      return;
    }

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      alert("Please pick a valid location from the map");
      return;
    }

    const formData = new FormData();
    formData.append("Type", createForm.type.trim());
    formData.append("Description", createForm.description.trim());
    formData.append("Severity", severity.toString());
    formData.append("Latitude", latitude.toString());
    formData.append("Longitude", longitude.toString());

    if (createForm.image) {
      formData.append("Image", createForm.image);
    }

    try {
      setCreatingReport(true);

      const response = await api.post("/admin/reports/create-verified", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newReport = normalizeReport(response.data.report ?? response.data);

      setReports((prev) => {
        const exists = prev.some((r) => getId(r) === getId(newReport));
        if (exists) return prev;
        return [newReport, ...prev];
      });

      setCreateForm(emptyCreateForm);
      setPickedLocation(null);
      setLiveMessage("Admin verified report created successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create verified report");
    } finally {
      setCreatingReport(false);
    }
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
    } catch (error) {
      alert("Failed to update report status");
    }
  };

  const deleteReport = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/admin/reports/${id}`);

      setReports((prev) => prev.filter((r) => getId(r) !== id));
      setSelectedReport(null);
      setLiveMessage(`Report #${id} deleted`);
    } catch (error) {
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

  const getReportIcon = (type) => {
    const value = (type || "").toLowerCase();

    if (value.includes("fire")) return "🔥";
    if (value.includes("flood")) return "🌊";
    if (value.includes("earthquake")) return "⛰️";
    if (value.includes("accident")) return "🚗";
    if (value.includes("sos")) return "🆘";

    return "⚠️";
  };

  const formatDate = (date) => formatLebanonTime(date);

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Disaster Verification Center</div>
          <h1 style={styles.title}>Reports Management</h1>
          <p style={styles.subtitle}>
            Review, verify, reject, resolve, and delete disaster reports.
          </p>

          {liveMessage && (
            <p style={styles.liveMessage}>
              <span style={styles.liveDot}></span>
              {liveMessage}
            </p>
          )}
        </div>

        <button style={styles.refreshButton} onClick={() => loadReports()}>
          ↻ Refresh Reports
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>🧾</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Report Review Control</h2>
          <p style={styles.heroText}>
            Prioritize critical reports, inspect AI signals, and take quick action from one modern dashboard.
          </p>
        </div>

        <div style={styles.livePill}>
          <span style={styles.liveDotWhite} />
          SignalR Live
        </div>
      </div>

      <form style={styles.createCard} onSubmit={createVerifiedReport}>
        <div style={styles.createHeader}>
          <div>
            <div style={styles.eyebrow}>Admin Direct Report</div>
            <h2 style={styles.createTitle}>Create Verified Report</h2>
            <p style={styles.createSubtitle}>
              Send an official verified report directly to the app and live map.
            </p>
          </div>
          <span style={styles.verifiedPill}>Verified immediately</span>
        </div>

        <div style={styles.createGrid}>
          <label style={styles.fieldGroup}>
            <span>Report Type</span>
            <select
              style={styles.input}
              value={createForm.type}
              onChange={(e) => updateCreateField("type", e.target.value)}
            >
              <option value="">Choose type</option>
              <option value="Fire">Fire</option>
              <option value="Flood">Flood</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Accident">Accident</option>
              <option value="Storm">Storm</option>
              <option value="SOS">SOS</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label style={styles.fieldGroup}>
            <span>Severity</span>
            <select
              style={styles.input}
              value={createForm.severity}
              onChange={(e) => updateCreateField("severity", e.target.value)}
            >
              <option value="1">Low (1/4)</option>
              <option value="2">Medium (2/4)</option>
              <option value="3">High (3/4)</option>
              <option value="4">Critical (4/4)</option>
            </select>
          </label>

          <label style={styles.fieldGroup}>
            <span>Latitude</span>
            <input
              style={styles.input}
              value={createForm.latitude}
              onChange={(e) => updateCreateField("latitude", e.target.value)}
              placeholder="Pick from map"
            />
          </label>

          <label style={styles.fieldGroup}>
            <span>Longitude</span>
            <input
              style={styles.input}
              value={createForm.longitude}
              onChange={(e) => updateCreateField("longitude", e.target.value)}
              placeholder="Pick from map"
            />
          </label>
        </div>

        <label style={styles.fieldGroup}>
          <span>Description</span>
          <textarea
            style={{ ...styles.input, ...styles.textarea }}
            value={createForm.description}
            onChange={(e) => updateCreateField("description", e.target.value)}
            placeholder="Write the official disaster report details..."
          />
        </label>

        <div style={styles.createFooter}>
          <label style={styles.fileButton}>
            📷 Attach image
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => updateCreateField("image", e.target.files?.[0] ?? null)}
            />
          </label>

          <span style={styles.fileName}>
            {createForm.image ? createForm.image.name : "No image selected"}
          </span>

          <button type="button" style={styles.mapPickerButton} onClick={openMapPicker}>
            🗺️ Open Map
          </button>

          <button type="submit" style={styles.createButton} disabled={creatingReport}>
            {creatingReport ? "Creating..." : "Create Verified Report"}
          </button>
        </div>
      </form>

      <div style={styles.statsGrid}>
        <SummaryCard title="Total" value={summary.total} color="#2563eb" icon="📊" />
        <SummaryCard title="Pending" value={summary.pending} color="#f97316" icon="⏳" />
        <SummaryCard title="Verified" value={summary.verified} color="#22c55e" icon="✅" />
        <SummaryCard title="Rejected" value={summary.rejected} color="#ef4444" icon="❌" />
        <SummaryCard title="Resolved" value={summary.resolved} color="#0ea5e9" icon="🛡️" />
        <SummaryCard title="Critical" value={summary.critical} color="#7c3aed" icon="🚨" />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            placeholder="Search by type, user, description, status, or severity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filterRow}>
          {statuses.map((status) => {
            const selected = selectedStatus === status;
            const color = status === "All" ? "#0f172a" : getStatusColor(status);

            return (
              <button
                key={status}
                style={{
                  ...styles.filterChip,
                  background: selected ? color : "#ffffff",
                  color: selected ? "#ffffff" : "#0f172a",
                  borderColor: selected ? color : "#e2e8f0",
                }}
                onClick={() => setSelectedStatus(status)}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <StateBox
          icon="⏳"
          title="Loading reports..."
          text="Please wait while we fetch report data."
        />
      ) : filteredReports.length === 0 ? (
        <StateBox
          icon="📝"
          title="No reports found"
          text="Try another search keyword or status filter."
        />
      ) : (
        <div style={styles.grid}>
          {filteredReports.map((report) => {
            const image = getImageUrl(report.imageUrl);
            const severityColor = getSeverityColor(report.severity);
            const statusColor = getStatusColor(report.status);

            return (
              <div key={getId(report)} style={styles.reportCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.titleBlock}>
                    <div
                      style={{
                        ...styles.reportIcon,
                        background: `${severityColor}18`,
                        color: severityColor,
                        borderColor: `${severityColor}22`,
                      }}
                    >
                      {getReportIcon(report.type)}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h3 style={styles.reportTitle}>
                        {report.type || "Unknown Report"}
                      </h3>
                      <p style={styles.reportUser}>
                        By {report.userName || "Unknown user"} • #{getId(report)}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background: `${statusColor}16`,
                      color: statusColor,
                    }}
                  >
                    {report.status}
                  </span>
                </div>

                {image ? (
                  <img src={image} alt="Report" style={styles.image} />
                ) : (
                  <div style={styles.noImage}>
                    <span>🖼️</span>
                    No image attached
                  </div>
                )}

                <p style={styles.description}>
                  {report.description || "No description provided."}
                </p>

                <div style={styles.detailsGrid}>
                  <InfoItem
                    label="Severity"
                    value={`${getSeverityText(report.severity)} (${report.severity}/4)`}
                    color={severityColor}
                  />
                  <InfoItem label="Created" value={formatDate(report.createdAt)} />
                  <InfoItem
                    label="AI Confidence"
                    value={`${Number(report.aiConfidence ?? 0).toFixed(0)}% ${
                      report.aiConfidence >= 80
                        ? "🟢"
                        : report.aiConfidence >= 60
                        ? "🟡"
                        : "🔴"
                    }`}
                  />
                  <InfoItem
                    label="AI Prediction"
                    value={report.aiPrediction || "Unknown"}
                  />
                </div>

                <div style={styles.locationBox}>
                  <strong>📍 Location</strong>
                  <span>
                    {report.locationName || "Unknown location"}
                  </span>
                </div>

                {report.aiReason && (
                  <div style={styles.aiBox}>
                    <strong>AI Reason</strong>
                    <span>{report.aiReason}</span>
                  </div>
                )}

                <div style={styles.actions}>
                  {report.status !== "Verified" && (
                    <button
                      style={{ ...styles.actionButton, background: "#22c55e" }}
                      onClick={() => updateStatus(getId(report), "Verified")}
                    >
                      Verify
                    </button>
                  )}

                  {report.status !== "Rejected" && (
                    <button
                      style={{ ...styles.actionButton, background: "#ef4444" }}
                      onClick={() => updateStatus(getId(report), "Rejected")}
                    >
                      Reject
                    </button>
                  )}

                  {report.status !== "Resolved" && (
                    <button
                      style={{ ...styles.actionButton, background: "#2563eb" }}
                      onClick={() => updateStatus(getId(report), "Resolved")}
                    >
                      Resolve
                    </button>
                  )}

                  <button
                    style={{ ...styles.actionButton, background: "#0f172a" }}
                    onClick={() => setSelectedReport(report)}
                  >
                    Details
                  </button>
                </div>

                <button
                  style={styles.deleteButton}
                  onClick={() => deleteReport(getId(report))}
                >
                  Delete Report
                </button>
              </div>
            );
          })}
        </div>
      )}

      {mapPickerOpen && (
        <MapPickerModal
          isLoaded={isMapLoaded}
          pickedLocation={pickedLocation}
          onMapClick={handleMapClick}
          onUseLocation={usePickedLocation}
          onClose={() => setMapPickerOpen(false)}
        />
      )}

      {selectedReport && (
        <ReportModal
          report={selectedReport}
          image={getImageUrl(selectedReport.imageUrl)}
          onClose={() => setSelectedReport(null)}
          onVerify={() => updateStatus(getId(selectedReport), "Verified")}
          onReject={() => updateStatus(getId(selectedReport), "Rejected")}
          onResolve={() => updateStatus(getId(selectedReport), "Resolved")}
          onDelete={() => deleteReport(getId(selectedReport))}
          getStatusColor={getStatusColor}
          getSeverityText={getSeverityText}
          getSeverityColor={getSeverityColor}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

function MapPickerModal({ isLoaded, pickedLocation, onMapClick, onUseLocation, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.mapPickerModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Pick Report Location</h2>
            <p style={styles.modalSubtitle}>Click anywhere on the map to choose the disaster location.</p>
          </div>

          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.mapPickerBox}>
          {!isLoaded ? (
            <StateBox icon="🗺️" title="Loading map..." text="Preparing location picker." />
          ) : (
            <GoogleMap
              mapContainerStyle={styles.mapPicker}
              center={pickedLocation || centerLebanon}
              zoom={pickedLocation ? 14 : 8}
              onClick={onMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
              }}
            >
              {pickedLocation && <Marker position={pickedLocation} />}
            </GoogleMap>
          )}
        </div>

        <div style={styles.pickedLocationBox}>
          <strong>Selected location:</strong>
          <span>
            {pickedLocation
              ? `${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}`
              : "No location selected yet"}
          </span>
        </div>

        <div style={styles.modalActions}>
          <button
            style={{ ...styles.actionButton, background: "#22c55e" }}
            onClick={onUseLocation}
            disabled={!pickedLocation}
          >
            Use This Location
          </button>
          <button style={{ ...styles.actionButton, background: "#0f172a" }} onClick={onClose}>
            Cancel
          </button>
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
        <strong style={{ ...styles.statValue, color }}>{value}</strong>
      </div>
    </div>
  );
}

function InfoItem({ label, value, color = "#0f172a" }) {
  return (
    <div style={styles.infoItem}>
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function ReportModal({
  report,
  image,
  onClose,
  onVerify,
  onReject,
  onResolve,
  onDelete,
  getStatusColor,
  getSeverityText,
  getSeverityColor,
  formatDate,
}) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{report.type}</h2>
            <p style={styles.modalSubtitle}>Report #{report.id}</p>
          </div>

          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        {image ? (
          <img src={image} alt="Report" style={styles.modalImage} />
        ) : (
          <div style={styles.modalNoImage}>No image attached</div>
        )}

        <div style={styles.modalStatusRow}>
          <span
            style={{
              ...styles.statusBadge,
              background: `${getStatusColor(report.status)}16`,
              color: getStatusColor(report.status),
            }}
          >
            {report.status}
          </span>

          <span
            style={{
              ...styles.statusBadge,
              background: `${getSeverityColor(report.severity)}16`,
              color: getSeverityColor(report.severity),
            }}
          >
            {getSeverityText(report.severity)} severity
          </span>
        </div>

        <div style={styles.modalDetails}>
          <Detail label="Description" value={report.description || "No description"} />
          <Detail label="User" value={report.userName || "Unknown"} />
          <Detail label="Latitude" value={report.latitude} />
          <Detail label="Longitude" value={report.longitude} />
          <Detail label="Created At" value={formatDate(report.createdAt)} />
          <Detail
            label="AI Confidence"
            value={`${Number(report.aiConfidence ?? 0).toFixed(0)}% ${
              report.aiConfidence >= 80
                ? "🟢"
                : report.aiConfidence >= 60
                ? "🟡"
                : "🔴"
            }`}
          />
          <Detail
            label="AI Prediction"
            value={report.aiPrediction || "Unknown"}
          />
          <Detail
            label="AI Reason"
            value={report.aiReason || "No AI reason available"}
          />
        </div>

        <div style={styles.modalActions}>
          <button
            style={{ ...styles.actionButton, background: "#22c55e" }}
            onClick={onVerify}
          >
            Verify
          </button>
          <button
            style={{ ...styles.actionButton, background: "#ef4444" }}
            onClick={onReject}
          >
            Reject
          </button>
          <button
            style={{ ...styles.actionButton, background: "#2563eb" }}
            onClick={onResolve}
          >
            Resolve
          </button>
          <button
            style={{ ...styles.actionButton, background: "#0f172a" }}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span>{label}</span>
      <strong>{value}</strong>
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

  createCard: {
    position: "relative",
    zIndex: 1,
    padding: 22,
    borderRadius: 30,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15,23,42,0.07)",
    marginBottom: 22,
  },

  createHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 18,
  },

  createTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 950,
    color: "#0f172a",
  },

  createSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontWeight: 650,
  },

  verifiedPill: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  createGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },

  fieldGroup: {
    display: "grid",
    gap: 8,
    color: "#334155",
    fontWeight: 900,
    fontSize: 13,
  },

  input: {
    width: "100%",
    minHeight: 46,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "0 13px",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 750,
    outline: "none",
    boxSizing: "border-box",
  },

  textarea: {
    minHeight: 92,
    padding: 13,
    resize: "vertical",
    fontFamily: "inherit",
  },

  createFooter: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },

  fileButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 14px",
    borderRadius: 15,
    background: "#eff6ff",
    color: "#2563eb",
    fontWeight: 950,
    cursor: "pointer",
    border: "1px solid #bfdbfe",
  },

  fileName: {
    color: "#64748b",
    fontWeight: 800,
    maxWidth: 250,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mapPickerButton: {
    border: "none",
    minHeight: 44,
    padding: "0 15px",
    borderRadius: 15,
    background: "#0ea5e9",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
  },

  createButton: {
    border: "none",
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 15,
    background: "#22c55e",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(34,197,94,0.20)",
  },

  mapPickerModal: {
    width: "min(980px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: 30,
    padding: 24,
    boxShadow: "0 30px 90px rgba(0,0,0,.35)",
  },

  mapPickerBox: {
    height: 520,
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  mapPicker: {
    width: "100%",
    height: "100%",
  },

  pickedLocationBox: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 13,
    borderRadius: 16,
    background: "#eff6ff",
    color: "#1e3a8a",
    border: "1px solid #bfdbfe",
    fontWeight: 800,
    marginTop: 14,
  },

  statsGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(145px, 1fr))",
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

  toolbar: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "center",
    marginBottom: 22,
    padding: 16,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 36px rgba(15,23,42,0.06)",
  },

  searchBox: {
    flex: 1,
    minWidth: 260,
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

  grid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 22,
  },

  reportCard: {
    display: "flex",
    flexDirection: "column",
    padding: 18,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15,23,42,0.07)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },

  titleBlock: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },

  reportIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    fontWeight: 900,
    flexShrink: 0,
    border: "1px solid transparent",
  },

  reportTitle: {
    margin: 0,
    fontSize: 21,
    fontWeight: 950,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  reportUser: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },

  statusBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  image: {
    width: "100%",
    height: 210,
    objectFit: "cover",
    borderRadius: 22,
    marginBottom: 14,
  },

  noImage: {
    width: "100%",
    height: 150,
    borderRadius: 22,
    background: "#f1f5f9",
    color: "#64748b",
    display: "grid",
    placeItems: "center",
    fontWeight: 850,
    marginBottom: 14,
    border: "1px solid #e2e8f0",
  },

  description: {
    color: "#334155",
    lineHeight: 1.6,
    minHeight: 52,
    margin: "0 0 14px",
    fontWeight: 620,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
    marginBottom: 14,
  },

  infoItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 12,
    minWidth: 0,
  },

  locationBox: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#475569",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    fontWeight: 700,
  },

  aiBox: {
    display: "grid",
    gap: 5,
    color: "#475569",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    fontWeight: 700,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: "auto",
  },

  actionButton: {
    border: "none",
    color: "white",
    padding: "10px 13px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  deleteButton: {
    width: "100%",
    marginTop: 12,
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: 13,
    borderRadius: 16,
    fontWeight: 950,
    cursor: "pointer",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.72)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 100,
  },

  modal: {
    width: "min(780px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: 30,
    padding: 24,
    boxShadow: "0 30px 90px rgba(0,0,0,.35)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 950,
    color: "#0f172a",
  },

  modalSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontWeight: 700,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: "#f1f5f9",
    fontSize: 28,
    cursor: "pointer",
  },

  modalImage: {
    width: "100%",
    height: 310,
    objectFit: "cover",
    borderRadius: 22,
    marginBottom: 16,
  },

  modalNoImage: {
    height: 180,
    display: "grid",
    placeItems: "center",
    background: "#f1f5f9",
    color: "#64748b",
    borderRadius: 22,
    marginBottom: 16,
    fontWeight: 900,
  },

  modalStatusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },

  modalDetails: {
    display: "grid",
    gap: 10,
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    padding: 13,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
  },

  modalActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },

  stateBox: {
    position: "relative",
    zIndex: 1,
    minHeight: 300,
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
