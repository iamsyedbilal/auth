import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
