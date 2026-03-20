import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_PATHS = ["/", "/join"];

export default function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-0">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-0 border-yes" />
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith("/join/")
  );

  if (!user && !isPublic) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
