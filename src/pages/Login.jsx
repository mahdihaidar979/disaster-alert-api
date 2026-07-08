import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/Auth/login", {
        email: email.trim(),
        password: password.trim(),
      });

      const data = response.data;

      if (data.role !== "Admin") {
        alert("Access denied. Admin only.");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminName", data.name || "Admin");
      localStorage.setItem("adminEmail", data.email || email);

      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />
      <div style={styles.bgOrbThree} />

      <div style={styles.shell}>
        <div style={styles.leftPanel}>
          <div style={styles.brandRow}>
            <div style={styles.logo}>DS</div>
            <div>
              <strong style={styles.brandTitle}>Disaster System</strong>
              <span style={styles.brandSubtitle}>Admin Web Control</span>
            </div>
          </div>

          <div style={styles.heroContent}>
            <span style={styles.eyebrow}>Emergency Control Center</span>

            <h1 style={styles.heroTitle}>
              Manage disaster response with confidence.
            </h1>

            <p style={styles.heroText}>
              Monitor reports, users, emergency centers, live maps, and urgent broadcasts from one secure dashboard.
            </p>

            <div style={styles.featureGrid}>
              <Feature icon="🧾" title="Reports" text="Review and verify disaster reports." />
              <Feature icon="🗺️" title="Live Map" text="Track locations and danger zones." />
              <Feature icon="🚨" title="Broadcast" text="Send urgent user alerts." />
              <Feature icon="👥" title="Users" text="Manage users and safety data." />
            </div>
          </div>

          <div style={styles.leftFooter}>
            <span style={styles.liveDot} />
            Secure admin access only
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.mobileLogo}>DS</div>

          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Admin Login</h2>
            <p style={styles.cardSubtitle}>
              Sign in to access the disaster management dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>✉️</span>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>

            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: 84 }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" disabled={loading} style={styles.loginButton}>
              {loading ? "Logging in..." : "Login to Dashboard"}
            </button>
          </form>

          <div style={styles.securityBox}>
            <div style={styles.securityIcon}>🛡️</div>
            <div>
              <strong>Protected Admin Area</strong>
              <p>Only admin accounts can access the dashboard.</p>
            </div>
          </div>

          <div style={styles.footer}>
            <span>Disaster System</span>
            <strong>Admin Panel</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureIcon}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 28,
    background: "linear-gradient(180deg, #f5f7fb 0%, #eef4ff 100%)",
    overflow: "hidden",
    boxSizing: "border-box",
  },

  bgOrbOne: {
    position: "absolute",
    width: 320,
    height: 320,
    top: -120,
    right: -90,
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.14)",
    pointerEvents: "none",
  },

  bgOrbTwo: {
    position: "absolute",
    width: 260,
    height: 260,
    bottom: -120,
    left: -80,
    borderRadius: "999px",
    background: "rgba(56, 189, 248, 0.16)",
    pointerEvents: "none",
  },

  bgOrbThree: {
    position: "absolute",
    width: 160,
    height: 160,
    top: "22%",
    left: "8%",
    borderRadius: "999px",
    background: "rgba(239, 68, 68, 0.08)",
    pointerEvents: "none",
  },

  shell: {
    position: "relative",
    zIndex: 1,
    width: "min(1120px, 100%)",
    minHeight: 680,
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    borderRadius: 38,
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(15, 23, 42, 0.18)",
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(226,232,240,0.95)",
    backdropFilter: "blur(18px)",
  },

  leftPanel: {
    position: "relative",
    padding: 34,
    color: "white",
    background:
      "radial-gradient(circle at top right, rgba(56,189,248,.26), transparent 34%), linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  logo: {
    width: 60,
    height: 60,
    borderRadius: 22,
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    display: "grid",
    placeItems: "center",
    color: "white",
    fontWeight: 950,
    fontSize: 23,
    boxShadow: "0 18px 35px rgba(37, 99, 235, 0.35)",
    border: "1px solid rgba(255,255,255,0.18)",
  },

  brandTitle: {
    display: "block",
    fontSize: 18,
    fontWeight: 950,
  },

  brandSubtitle: {
    display: "block",
    color: "rgba(255,255,255,.66)",
    fontWeight: 700,
    marginTop: 3,
  },

  heroContent: {
    maxWidth: 570,
  },

  eyebrow: {
    display: "inline-flex",
    padding: "8px 13px",
    borderRadius: 999,
    background: "rgba(255,255,255,.12)",
    border: "1px solid rgba(255,255,255,.16)",
    color: "#dbeafe",
    fontWeight: 900,
    fontSize: 13,
  },

  heroTitle: {
    margin: "20px 0 12px",
    fontSize: 44,
    lineHeight: 1.08,
    letterSpacing: "-1.2px",
    fontWeight: 950,
  },

  heroText: {
    margin: 0,
    color: "rgba(255,255,255,.72)",
    fontSize: 16,
    lineHeight: 1.65,
    fontWeight: 650,
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
    marginTop: 28,
  },

  featureCard: {
    display: "flex",
    gap: 12,
    padding: 14,
    borderRadius: 22,
    background: "rgba(255,255,255,.10)",
    border: "1px solid rgba(255,255,255,.14)",
  },

  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    background: "rgba(255,255,255,.12)",
    display: "grid",
    placeItems: "center",
    fontSize: 21,
    flexShrink: 0,
  },

  leftFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "rgba(255,255,255,.72)",
    fontWeight: 850,
  },

  liveDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 5px rgba(34,197,94,.18)",
  },

  card: {
    padding: 42,
    background: "rgba(255,255,255,.96)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  mobileLogo: {
    width: 70,
    height: 70,
    borderRadius: 24,
    background: "linear-gradient(135deg, #0f172a, #2563eb)",
    display: "grid",
    placeItems: "center",
    color: "white",
    fontWeight: 950,
    fontSize: 24,
    marginBottom: 24,
    boxShadow: "0 18px 35px rgba(37, 99, 235, 0.25)",
  },

  cardHeader: {
    marginBottom: 28,
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 31,
    fontWeight: 950,
    letterSpacing: "-0.8px",
  },

  cardSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.55,
    fontWeight: 650,
  },

  label: {
    display: "block",
    color: "#334155",
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 8,
    marginTop: 16,
  },

  inputWrap: {
    position: "relative",
    height: 54,
    display: "flex",
    alignItems: "center",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    marginBottom: 4,
  },

  inputIcon: {
    position: "absolute",
    left: 15,
    fontSize: 17,
  },

  input: {
    width: "100%",
    height: "100%",
    border: 0,
    outline: 0,
    background: "transparent",
    borderRadius: 20,
    padding: "0 16px 0 48px",
    color: "#0f172a",
    fontWeight: 750,
    fontSize: 14,
    boxSizing: "border-box",
  },

  eyeButton: {
    position: "absolute",
    right: 8,
    top: 8,
    height: 38,
    padding: "0 14px",
    border: 0,
    borderRadius: 14,
    background: "#e2e8f0",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  loginButton: {
    width: "100%",
    height: 54,
    marginTop: 20,
    border: 0,
    borderRadius: 20,
    background: "#0f172a",
    color: "white",
    fontSize: 15,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.20)",
  },

  securityBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 24,
    padding: 15,
    borderRadius: 22,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
  },

  securityIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    background: "#dbeafe",
    color: "#2563eb",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    flexShrink: 0,
  },

  footer: {
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 750,
  },
};
