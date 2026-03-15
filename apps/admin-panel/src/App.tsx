import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

// Lazy-loaded page components
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Nodes = lazy(() => import("@/pages/Nodes"));
const NodeDetail = lazy(() => import("@/pages/NodeDetail"));
const Users = lazy(() => import("@/pages/Users"));
const Inbounds = lazy(() => import("@/pages/Inbounds"));
const Plans = lazy(() => import("@/pages/Plans"));
const Settings = lazy(() => import("@/pages/Settings"));
const Login = lazy(() => import("@/pages/Login"));

function useAuth(): { isAuthenticated: boolean } {
  // TODO: Replace with real auth logic (e.g. check token in localStorage/store)
  const token = localStorage.getItem("auth_token");
  return { isAuthenticated: !!token };
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/nodes" element={<Nodes />} />
              <Route path="/nodes/:id" element={<NodeDetail />} />
              <Route path="/users" element={<Users />} />
              <Route path="/inbounds" element={<Inbounds />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
