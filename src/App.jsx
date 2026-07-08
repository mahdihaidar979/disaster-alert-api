import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import MapPage from "./pages/Map";
import Broadcast from "./pages/Broadcast";
import EmergencyCenters from "./pages/EmergencyCenters";
import LiveUsersMap from "./pages/LiveUsersMap";
import AdminLogs from "./pages/AdminLogs";
import CommunityChat from "./pages/CommunityChat";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AdminLayout({ children }) {
  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    window.location.href = "/login";
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">DS</div>
          <div>
            <h2>Disaster Admin</h2>
            <p>Emergency Control Center</p>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink className="admin-link" to="/dashboard">Dashboard</NavLink>
          <NavLink className="admin-link" to="/reports">Reports</NavLink>
          <NavLink className="admin-link" to="/users">Users</NavLink>
          <NavLink className="admin-link" to="/map">Live Map</NavLink>
          <NavLink className="admin-link" to="/live-users">Live Users</NavLink>
          <NavLink className="admin-link" to="/emergency-centers">Emergency Centers</NavLink>
          <NavLink className="admin-link" to="/admin-logs">Admin Logs</NavLink>
          <NavLink className="admin-link admin-link-danger" to="/broadcast">Broadcast</NavLink>
          <NavLink className="admin-link" to="/communitychat">Community Chat</NavLink>
        

          <button className="admin-logout" onClick={logout}>
            Logout
          </button>
        </nav>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><AdminLayout><Reports /></AdminLayout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><AdminLayout><Users /></AdminLayout></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><AdminLayout><MapPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/live-users" element={<ProtectedRoute><AdminLayout><LiveUsersMap /></AdminLayout></ProtectedRoute>} />
        <Route path="/emergency-centers" element={<ProtectedRoute><AdminLayout><EmergencyCenters /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin-logs" element={<ProtectedRoute><AdminLayout><AdminLogs /></AdminLayout></ProtectedRoute>} />
        <Route path="/broadcast" element={<ProtectedRoute><AdminLayout><Broadcast /></AdminLayout></ProtectedRoute>} />
        <Route path="/communitychat" element={<ProtectedRoute><AdminLayout><CommunityChat /></AdminLayout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}