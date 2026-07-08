import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const emptyForm = {
  name: "",
  type: "Hospital",
  phone: "",
  address: "",
  isAvailable: true,
  latitude: "",
  longitude: "",
};

export default function EmergencyCenters() {
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedType, setSelectedType] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const types = ["All", "Hospital", "FireDepartment", "Police"];

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      setLoading(true);
      const res = await api.get("/EmergencyCenters");
      setCenters(res.data);
    } catch {
      alert("Failed to load emergency centers");
    } finally {
      setLoading(false);
    }
  };

  const filteredCenters = useMemo(() => {
    return centers.filter((center) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch = `
        ${center.name}
        ${center.type}
        ${center.phone}
        ${center.address}
      `.toLowerCase().includes(keyword);

      const matchesType =
        selectedType === "All" || center.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [centers, search, selectedType]);

  const summary = useMemo(() => {
    return {
      total: centers.length,
      available: centers.filter((c) => c.isAvailable).length,
      unavailable: centers.filter((c) => !c.isAvailable).length,
      hospitals: centers.filter((c) => c.type === "Hospital").length,
      police: centers.filter((c) => c.type === "Police").length,
      fire: centers.filter((c) => c.type === "FireDepartment").length,
    };
  }, [centers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submitCenter = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Name is required");
      return;
    }

    if (!form.latitude || !form.longitude) {
      alert("Latitude and longitude are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      phone: form.phone.trim(),
      address: form.address.trim(),
      isAvailable: form.isAvailable,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    };

    try {
      if (editingId) {
        await api.put(`/EmergencyCenters/${editingId}`, payload);
      } else {
        await api.post("/EmergencyCenters", payload);
      }

      resetForm();
      await loadCenters();
    } catch (error) {
      alert(error.response?.data || "Failed to save emergency center");
    }
  };

  const startEdit = (center) => {
    setEditingId(center.id);

    setForm({
      name: center.name || "",
      type: center.type || "Hospital",
      phone: center.phone || "",
      address: center.address || "",
      isAvailable: center.isAvailable ?? true,
      latitude: center.latitude || "",
      longitude: center.longitude || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCenter = async (id) => {
    if (!window.confirm("Delete this emergency center?")) return;

    try {
      await api.delete(`/EmergencyCenters/${id}`);
      await loadCenters();
    } catch {
      alert("Failed to delete emergency center");
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Hospital":
        return "#ef4444";
      case "Police":
        return "#2563eb";
      case "FireDepartment":
        return "#f97316";
      default:
        return "#64748b";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Hospital":
        return "🏥";
      case "Police":
        return "👮";
      case "FireDepartment":
        return "🚒";
      default:
        return "📍";
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Emergency Response Network</div>
          <h1 style={styles.title}>Emergency Centers</h1>
          <p style={styles.subtitle}>
            Manage hospitals, police stations, and fire departments with accurate map locations.
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadCenters}>
          ↻ Refresh Centers
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>🏥</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Response Centers Control</h2>
          <p style={styles.heroText}>
            Keep emergency locations updated so users can find nearby help faster during disasters.
          </p>
        </div>

        <div style={styles.availabilityPill}>
          <span style={styles.liveDot} />
          {summary.available} Available
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard title="Total Centers" value={summary.total} color="#2563eb" icon="📍" />
        <SummaryCard title="Available" value={summary.available} color="#22c55e" icon="✅" />
        <SummaryCard title="Unavailable" value={summary.unavailable} color="#ef4444" icon="⛔" />
        <SummaryCard title="Hospitals" value={summary.hospitals} color="#ef4444" icon="🏥" />
        <SummaryCard title="Police" value={summary.police} color="#2563eb" icon="👮" />
        <SummaryCard title="Fire" value={summary.fire} color="#f97316" icon="🚒" />
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {editingId ? "Edit Emergency Center" : "Add Emergency Center"}
              </h2>
              <p style={styles.sectionSubtitle}>
                Add accurate coordinates so the center appears correctly on the map.
              </p>
            </div>

            {editingId && (
              <button style={styles.cancelButton} type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={submitCenter}>
            <label style={styles.label}>Center Name</label>
            <input
              style={styles.input}
              name="name"
              placeholder="Example: Baalbek Government Hospital"
              value={form.name}
              onChange={handleChange}
            />

            <label style={styles.label}>Type</label>
            <div style={styles.typeSelectGrid}>
              {["Hospital", "FireDepartment", "Police"].map((type) => {
                const selected = form.type === type;
                const color = getTypeColor(type);

                return (
                  <button
                    key={type}
                    type="button"
                    style={{
                      ...styles.typeButton,
                      background: selected ? color : "#ffffff",
                      color: selected ? "#ffffff" : "#0f172a",
                      borderColor: selected ? color : "#e2e8f0",
                      boxShadow: selected ? `0 16px 28px ${color}22` : "none",
                    }}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        type,
                      }))
                    }
                  >
                    <span>{getTypeIcon(type)}</span>
                    {type === "FireDepartment" ? "Fire" : type}
                  </button>
                );
              })}
            </div>

            <label style={styles.label}>Phone</label>
            <input
              style={styles.input}
              name="phone"
              placeholder="Example: 08-000000"
              value={form.phone}
              onChange={handleChange}
            />

            <label style={styles.label}>Address</label>
            <textarea
              style={styles.textarea}
              name="address"
              placeholder="Center address..."
              value={form.address}
              onChange={handleChange}
            />

            <div style={styles.twoColumns}>
              <div>
                <label style={styles.label}>Latitude</label>
                <input
                  style={styles.input}
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="Example: 34.0058"
                  value={form.latitude}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={styles.label}>Longitude</label>
                <input
                  style={styles.input}
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="Example: 36.2181"
                  value={form.longitude}
                  onChange={handleChange}
                />
              </div>
            </div>

            <label style={styles.checkRow}>
              <input
                type="checkbox"
                name="isAvailable"
                checked={form.isAvailable}
                onChange={handleChange}
              />
              <span>Available now</span>
            </label>

            <button style={styles.submitButton} type="submit">
              {editingId ? "Save Changes" : "Add Center"}
            </button>
          </form>
        </div>

        <div style={styles.listCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Centers List</h2>
              <p style={styles.sectionSubtitle}>
                Search and filter emergency response locations.
              </p>
            </div>
          </div>

          <div style={styles.toolbar}>
            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>⌕</span>
              <input
                style={styles.searchInput}
                placeholder="Search by name, phone, address, or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.filterRow}>
            {types.map((type) => {
              const selected = selectedType === type;
              const color = type === "All" ? "#0f172a" : getTypeColor(type);

              return (
                <button
                  key={type}
                  style={{
                    ...styles.filterChip,
                    background: selected ? color : "#ffffff",
                    color: selected ? "#ffffff" : "#0f172a",
                    borderColor: selected ? color : "#e2e8f0",
                  }}
                  onClick={() => setSelectedType(type)}
                >
                  {type === "All" ? "📋" : getTypeIcon(type)}
                  {type === "FireDepartment" ? "Fire" : type}
                </button>
              );
            })}
          </div>

          {loading ? (
            <StateBox icon="⏳" title="Loading centers..." text="Please wait." />
          ) : filteredCenters.length === 0 ? (
            <StateBox icon="📍" title="No emergency centers found" text="Try changing the search or filter." />
          ) : (
            <div style={styles.centersList}>
              {filteredCenters.map((center) => (
                <div key={center.id} style={styles.centerCard}>
                  <div style={styles.centerHeader}>
                    <div
                      style={{
                        ...styles.centerIcon,
                        background: `${getTypeColor(center.type)}18`,
                        color: getTypeColor(center.type),
                        borderColor: `${getTypeColor(center.type)}22`,
                      }}
                    >
                      {getTypeIcon(center.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={styles.centerName}>{center.name}</h3>
                      <p style={styles.centerAddress}>
                        {center.address || "No address"}
                      </p>
                    </div>

                    <span
                      style={{
                        ...styles.availabilityBadge,
                        background: center.isAvailable ? "#dcfce7" : "#fee2e2",
                        color: center.isAvailable ? "#166534" : "#991b1b",
                      }}
                    >
                      {center.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <div style={styles.centerMeta}>
                    <InfoBox label="Type" value={center.type} color={getTypeColor(center.type)} />
                    <InfoBox label="Phone" value={center.phone || "N/A"} />
                    <InfoBox
                      label="Latitude"
                      value={Number(center.latitude ?? 0).toFixed(5)}
                    />
                    <InfoBox
                      label="Longitude"
                      value={Number(center.longitude ?? 0).toFixed(5)}
                    />
                  </div>

                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.actionBtn, background: "#2563eb" }}
                      onClick={() => startEdit(center)}
                    >
                      Edit
                    </button>

                    <button
                      style={{ ...styles.actionBtn, background: "#ef4444" }}
                      onClick={() => deleteCenter(center.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

function InfoBox({ label, value, color = "#0f172a" }) {
  return (
    <div style={styles.infoBox}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={{ ...styles.infoValue, color }}>{value}</strong>
    </div>
  );
}

function StateBox({ icon, title, text }) {
  return (
    <div style={styles.emptyBox}>
      <div style={styles.emptyIcon}>{icon}</div>
      <h3 style={styles.emptyTitle}>{title}</h3>
      <p style={styles.emptyText}>{text}</p>
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
    background: "rgba(249, 115, 22, 0.12)",
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

  availabilityPill: {
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
    gridTemplateColumns: "repeat(6, minmax(140px, 1fr))",
    gap: 14,
    marginBottom: 22,
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: 17,
    borderRadius: 26,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(226,232,240,0.9)",
    backdropFilter: "blur(14px)",
  },

  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
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
    gridTemplateColumns: "minmax(360px, 0.75fr) minmax(0, 1.25fr)",
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

  listCard: {
    padding: 22,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.07)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
    alignItems: "flex-start",
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
    lineHeight: 1.5,
    fontWeight: 620,
  },

  cancelButton: {
    border: 0,
    background: "#ef4444",
    color: "white",
    fontWeight: 900,
    borderRadius: 16,
    height: 42,
    padding: "0 14px",
    cursor: "pointer",
  },

  label: {
    display: "block",
    marginTop: 14,
    marginBottom: 8,
    color: "#334155",
    fontWeight: 900,
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
    minHeight: 105,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 18,
    padding: 15,
    color: "#0f172a",
    fontWeight: 700,
    lineHeight: 1.5,
    outline: 0,
    resize: "vertical",
    boxSizing: "border-box",
  },

  typeSelectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },

  typeButton: {
    minHeight: 46,
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "16px 0 18px",
    fontWeight: 900,
    color: "#334155",
  },

  submitButton: {
    width: "100%",
    minHeight: 52,
    border: 0,
    borderRadius: 18,
    background: "#0f172a",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.18)",
  },

  toolbar: {
    marginBottom: 14,
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
    marginBottom: 16,
  },

  filterChip: {
    height: 42,
    padding: "0 14px",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },

  emptyBox: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 28,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 22,
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: 46,
    marginBottom: 8,
  },

  emptyTitle: {
    margin: 0,
    color: "#0f172a",
    fontWeight: 950,
  },

  emptyText: {
    margin: "6px 0 0",
    fontWeight: 650,
  },

  centersList: {
    display: "grid",
    gap: 14,
  },

  centerCard: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 12px 24px rgba(15,23,42,0.04)",
  },

  centerHeader: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
  },

  centerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 23,
    flexShrink: 0,
    border: "1px solid transparent",
  },

  centerName: {
    margin: 0,
    fontSize: 19,
    fontWeight: 950,
    color: "#0f172a",
  },

  centerAddress: {
    margin: "6px 0 0",
    color: "#64748b",
    lineHeight: 1.5,
    fontWeight: 620,
  },

  availabilityBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  centerMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },

  infoBox: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 12,
  },

  infoLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 850,
    marginBottom: 4,
  },

  infoValue: {
    display: "block",
    fontWeight: 950,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
  },

  actionBtn: {
    border: "none",
    color: "#ffffff",
    padding: "10px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
};
