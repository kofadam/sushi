import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { LoadingSpinner } from "./components/UI";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import PollsPage from "./pages/PollsPage";
import TasksPage from "./pages/TasksPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import SpecialDaysPage from "./pages/SpecialDaysPage";
import ReportsPage from "./pages/ReportsPage";
import HandoffPage from "./pages/HandoffPage";

function ProtectedRoute({ children, perm }) {
  const { user, loading, hasPerm } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (perm && !hasPerm(perm)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/polls"
        element={
          <ProtectedRoute>
            <PollsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute perm="manage_users">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute perm="manage_roles">
            <RolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/special-days"
        element={
          <ProtectedRoute perm="manage_schedule">
            <SpecialDaysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute perm="manage_schedule">
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/handoff"
        element={
          <ProtectedRoute>
            <HandoffPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
