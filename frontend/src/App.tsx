import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireModulo } from "@/components/auth/RequireModulo";
import { NotFoundPage } from "@/components/NotFoundPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { rutaInicial } from "@/lib/auth";

const LoginPage = lazy(() => import("@/modules/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/modules/dashboard/DashboardPage"));
const VentaPage = lazy(() => import("@/modules/venta/VentaPage"));
const InventarioPage = lazy(() => import("@/modules/inventario/InventarioPage"));
const ClientesPage = lazy(() => import("@/modules/clientes/ClientesPage"));
const CajaPage = lazy(() => import("@/modules/caja/CajaPage"));
const HistorialPage = lazy(() => import("@/modules/historial/HistorialPage"));
const CuentasPage = lazy(() => import("@/modules/cuentas/CuentasPage"));

function Inicio() {
  const { sesion } = useAuth();
  return <Navigate to={rutaInicial(sesion)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center text-sm text-ink-soft">
            Cargando…
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Inicio />} />
              <Route
                path="dashboard"
                element={
                  <RequireModulo modulo="DASHBOARD">
                    <DashboardPage />
                  </RequireModulo>
                }
              />
              <Route
                path="venta"
                element={
                  <RequireModulo modulo="VENTA">
                    <VentaPage />
                  </RequireModulo>
                }
              />
              <Route
                path="inventario"
                element={
                  <RequireModulo modulo="INVENTARIO">
                    <InventarioPage />
                  </RequireModulo>
                }
              />
              <Route
                path="envios"
                element={
                  <RequireModulo modulo="CLIENTES">
                    <ClientesPage />
                  </RequireModulo>
                }
              />
              <Route
                path="clientes"
                element={<Navigate to="/envios" replace />}
              />
              <Route
                path="caja"
                element={
                  <RequireModulo modulo="CAJA">
                    <CajaPage />
                  </RequireModulo>
                }
              />
              <Route
                path="historial"
                element={
                  <RequireModulo modulo="HISTORIAL">
                    <HistorialPage />
                  </RequireModulo>
                }
              />
              <Route
                path="cuentas"
                element={
                  <RequireModulo modulo="CUENTAS">
                    <CuentasPage />
                  </RequireModulo>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
