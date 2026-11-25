import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth() {
  const { sesion, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-ink-soft">
        Cargando…
      </div>
    );
  }

  if (!sesion) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }}
      />
    );
  }

  return <Outlet />;
}
