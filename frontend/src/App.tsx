import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { NotFoundPage } from "@/components/NotFoundPage";
import { AppLayout } from "@/components/layout/AppLayout";

const DashboardPage = lazy(() => import("@/modules/dashboard/DashboardPage"));
const VentaPage = lazy(() => import("@/modules/venta/VentaPage"));
const InventarioPage = lazy(() => import("@/modules/inventario/InventarioPage"));
const ClientesPage = lazy(() => import("@/modules/clientes/ClientesPage"));
const CajaPage = lazy(() => import("@/modules/caja/CajaPage"));
const HistorialPage = lazy(() => import("@/modules/historial/HistorialPage"));
const CuentasPage = lazy(() => import("@/modules/cuentas/CuentasPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="venta" element={<VentaPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="caja" element={<CajaPage />} />
          <Route path="historial" element={<HistorialPage />} />
          <Route path="cuentas" element={<CuentasPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
