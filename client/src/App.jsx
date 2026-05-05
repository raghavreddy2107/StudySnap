// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewSummary from './pages/NewSummary.jsx';
import SummaryDetail from './pages/SummaryDetail.jsx';
import Profile from './pages/Profile.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Layout from './components/Layout.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-paper flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><NewSummary /></ProtectedRoute>} />
        <Route path="/summary/:id" element={<ProtectedRoute><SummaryDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
