import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { formatLebanonTime } from "../utils/dateTime";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");

  const roles = ["All", "Admin", "User"];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/users/all");
      setUsers(response.data);
    } catch (error) {
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    const confirmDelete = window.confirm("Delete this user?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/users/${id}`);
      await loadUsers();
    } catch (e) {
      alert("Failed to delete user");
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.put(`/admin/users/${id}/role`, role, {
        headers: { "Content-Type": "application/json" },
      });

      await loadUsers();
    } catch (e) {
      alert("Failed to update role");
    }
  };

  const toggleBan = async (id) => {
    try {
      await api.put(`/admin/users/${id}/ban`);
      await loadUsers();
    } catch (e) {
      alert("Failed to update user status");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch = `${user.name} ${user.email} ${user.role}`
        .toLowerCase()
        .includes(keyword);

      const matchesRole = selectedRole === "All" || user.role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [users, search, selectedRole]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "Admin").length,
      normalUsers: users.filter((u) => u.role === "User").length,
      banned: users.filter((u) => u.isBanned ?? u.IsBanned ?? false).length,
      totalReports: users.reduce(
        (sum, user) => sum + Number(user.reportsCount ?? user.ReportsCount ?? 0),
        0
      ),
    };
  }, [users]);

  const formatDate = (date) => {
    if (!date) return "Not available";
return formatLebanonTime(date);  };

  const roleColor = (role) => {
    if (role === "Admin") return "#7c3aed";
    return "#2563eb";
  };

  const getInitials = (name) => {
    if (!name || !name.trim()) return "U";

    const parts = name.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const getUserStatus = (user) => {
    const isBanned = user.isBanned ?? user.IsBanned ?? false;
    const reportsCount = user.reportsCount ?? user.ReportsCount ?? 0;
    const reputation = user.reputation ?? user.Reputation ?? 0;

    if (isBanned) return "🚫 BANNED";
    if (reportsCount > 10 && reputation < 10) return "⚠️ Suspicious";
    return "✅ Active";
  };

  const getUserStatusColor = (user) => {
    const isBanned = user.isBanned ?? user.IsBanned ?? false;
    const reportsCount = user.reportsCount ?? user.ReportsCount ?? 0;
    const reputation = user.reputation ?? user.Reputation ?? 0;

    if (isBanned) return "#ef4444";
    if (reportsCount > 10 && reputation < 10) return "#f97316";
    return "#22c55e";
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbOne} />
      <div style={styles.bgOrbTwo} />

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Account Control Center</div>
          <h1 style={styles.title}>Users Management</h1>
          <p style={styles.subtitle}>
            Review users, promote admins, ban accounts, and manage activity.
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadUsers}>
          ↻ Refresh Users
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroIcon}>👥</div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.heroTitle}>Community Safety Accounts</h2>
          <p style={styles.heroText}>
            Monitor user activity, detect suspicious behavior, and protect the disaster response platform.
          </p>
        </div>

        <div style={styles.livePill}>
          <span style={styles.liveDotWhite} />
          {summary.total} Accounts
        </div>
      </div>

      <div style={styles.statsGrid}>
        <SummaryCard title="Total Users" value={summary.total} color="#2563eb" icon="👥" />
        <SummaryCard title="Admins" value={summary.admins} color="#7c3aed" icon="👑" />
        <SummaryCard title="Normal Users" value={summary.normalUsers} color="#22c55e" icon="🙂" />
        <SummaryCard title="Banned" value={summary.banned} color="#ef4444" icon="🚫" />
        <SummaryCard title="Total Reports" value={summary.totalReports} color="#f97316" icon="🧾" />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filterRow}>
          {roles.map((role) => {
            const selected = selectedRole === role;
            const color = role === "All" ? "#0f172a" : roleColor(role);

            return (
              <button
                key={role}
                style={{
                  ...styles.filterChip,
                  background: selected ? color : "#ffffff",
                  color: selected ? "#ffffff" : "#0f172a",
                  borderColor: selected ? color : "#e2e8f0",
                }}
                onClick={() => setSelectedRole(role)}
              >
                {role === "Admin" ? "👑" : role === "User" ? "🙂" : "📋"} {role}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <StateBox
          icon="⏳"
          title="Loading users..."
          text="Please wait while we fetch registered accounts."
        />
      ) : filteredUsers.length === 0 ? (
        <StateBox
          icon="👥"
          title="No users found"
          text="Try another search keyword or role filter."
        />
      ) : (
        <div style={styles.grid}>
          {filteredUsers.map((user) => {
            const isBanned = user.isBanned ?? user.IsBanned ?? false;
            const reportsCount = user.reportsCount ?? user.ReportsCount ?? 0;
            const reputation = user.reputation ?? user.Reputation ?? 0;
            const createdAt = user.createdAt ?? user.CreatedAt;
            const currentRole = user.role ?? user.Role;
            const userId = user.id ?? user.Id;
            const userName = user.name ?? user.Name ?? "Unknown User";
            const userEmail = user.email ?? user.Email ?? "No email";
            const statusColor = getUserStatusColor(user);
            const photoUrl = user.photoUrl ?? user.PhotoUrl;

const profileImageUrl = photoUrl
  ? photoUrl.startsWith("http")
    ? photoUrl
    : `${api.defaults.baseURL.replace("/api", "")}${photoUrl}`
  : null;

            return (
              <div
                key={userId}
                style={{
                  ...styles.userCard,
                  opacity: isBanned ? 0.78 : 1,
                  borderColor: isBanned ? "#fecaca" : "#e2e8f0",
                }}
              >
                <div style={styles.userHeader}>
                  <div
  style={{
    ...styles.avatar,
    overflow: "hidden",
    background: isBanned
      ? "linear-gradient(135deg, #ef4444, #991b1b)"
      : currentRole === "Admin"
      ? "linear-gradient(135deg, #7c3aed, #a855f7)"
      : "linear-gradient(135deg, #2563eb, #0ea5e9)",
  }}
>
  {profileImageUrl ? (
    <img
      src={profileImageUrl}
      alt={userName}
      style={styles.avatarImage}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    getInitials(userName)
  )}
</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.nameRow}>
                      <h3 style={styles.name}>{userName}</h3>

                      <span
                        style={{
                          ...styles.roleBadge,
                          background: `${roleColor(currentRole)}16`,
                          color: roleColor(currentRole),
                        }}
                      >
                        {currentRole}
                      </span>
                    </div>

                    <p style={styles.email}>{userEmail}</p>

                    <p
                      style={{
                        ...styles.userStatus,
                        color: statusColor,
                      }}
                    >
                      {getUserStatus(user)}
                    </p>
                  </div>
                </div>

                <div style={styles.infoGrid}>
                  <InfoBox label="User ID" value={`#${userId}`} />
                  <InfoBox label="Reputation" value={reputation} color="#22c55e" />
                  <InfoBox label="Reports" value={reportsCount} color="#f97316" />
                  <InfoBox label="Created" value={formatDate(createdAt)} wide />
                </div>

                <div style={styles.activityBox}>
                  <div>
                    <strong>Report Activity</strong>
                    <p>
                      {reportsCount > 0
                        ? `${userName} submitted ${reportsCount} report(s).`
                        : "No reports submitted yet."}
                    </p>
                  </div>

                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min(100, Number(reportsCount) * 10)}%`,
                        background: isBanned ? "#ef4444" : roleColor(currentRole),
                      }}
                    />
                  </div>
                </div>

                <div style={styles.userActions}>
                  {currentRole === "User" ? (
                    <button
                      style={styles.makeAdminBtn}
                      onClick={() => changeRole(userId, "Admin")}
                    >
                      Make Admin
                    </button>
                  ) : (
                    <button
                      style={styles.removeAdminBtn}
                      onClick={() => changeRole(userId, "User")}
                    >
                      Remove Admin
                    </button>
                  )}

                  <button
                    style={isBanned ? styles.unbanBtn : styles.banBtn}
                    onClick={() => toggleBan(userId)}
                  >
                    {isBanned ? "Unban User" : "Ban User"}
                  </button>

                  <button
                    style={styles.deleteUserBtn}
                    onClick={() => deleteUser(userId)}
                  >
                    Delete
                  </button>
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

function InfoBox({ label, value, wide = false, color = "#0f172a" }) {
  return (
    <div style={{ ...styles.infoBox, gridColumn: wide ? "1 / -1" : "auto" }}>
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
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
    background: "rgba(124, 58, 237, 0.11)",
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
    gridTemplateColumns: "repeat(5, minmax(145px, 1fr))",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 22,
  },

  userCard: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 18,
    borderRadius: 30,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 44px rgba(15,23,42,0.07)",
    transition: "0.2s ease",
  },

  userHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  avatar: {
    width: 66,
    height: 66,
    borderRadius: 24,
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    fontWeight: 950,
    flexShrink: 0,
    boxShadow: "0 16px 28px rgba(37, 99, 235, 0.22)",
  },

  avatarImage: {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
},

  nameRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  name: {
    margin: 0,
    fontSize: 21,
    fontWeight: 950,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  roleBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  email: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 700,
    wordBreak: "break-word",
  },

  userStatus: {
    margin: "6px 0 0",
    fontSize: 13,
    fontWeight: 900,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },

  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 13,
  },

  activityBox: {
    marginTop: "auto",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 20,
    padding: 16,
  },

  progressTrack: {
    height: 10,
    background: "#dbeafe",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  userActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },

  makeAdminBtn: {
    border: "none",
    background: "#22c55e",
    color: "white",
    padding: "11px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  removeAdminBtn: {
    border: "none",
    background: "#f97316",
    color: "white",
    padding: "11px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  banBtn: {
    border: "none",
    background: "#991b1b",
    color: "white",
    padding: "11px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  unbanBtn: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "11px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  deleteUserBtn: {
    border: "none",
    background: "#ef4444",
    color: "white",
    padding: "11px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
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
