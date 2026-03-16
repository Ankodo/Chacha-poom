import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import Landing from "@/pages/Landing";
import Console from "@/pages/Console";
import Protocols from "@/pages/Console/Protocols";
import Servers from "@/pages/Console/Servers";
import Purchase from "@/pages/Purchase";
import Subscription from "@/pages/Subscription";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/purchase" element={<Purchase />} />
      <Route path="/sub/:token" element={<Subscription />} />
      <Route
        path="/console"
        element={
          <ProtectedRoute>
            <ConsoleLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Console />} />
        <Route path="protocols" element={<Protocols />} />
        <Route path="servers" element={<Servers />} />
      </Route>
    </Routes>
  );
}
