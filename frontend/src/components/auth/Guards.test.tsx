import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import type { Sesion } from "@/lib/auth";
import { RequireAuth } from "./RequireAuth";
import { RequireModulo } from "./RequireModulo";

const trabajador: Sesion = {
  id: 2,
  username: "vendedor",
  rol: "TRABAJADOR",
  principal: false,
  modulos: ["VENTA", "CAJA", "HISTORIAL"],
};

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderizar(ruta: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <AuthProvider>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route
                path="/cuentas"
                element={
                  <RequireModulo modulo="CUENTAS">
                    <p>Panel de cuentas</p>
                  </RequireModulo>
                }
              />
              <Route path="/venta" element={<p>Pantalla de venta</p>} />
            </Route>
            <Route path="/login" element={<p>Pantalla de login</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("guardias de sesión y permisos", () => {
  it("redirige al login cuando no hay sesión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respuesta({ message: "Sin sesión" }, 401)),
    );

    renderizar("/cuentas");

    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument();
  });

  it("muestra acceso denegado si el rol no tiene el módulo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(trabajador)));

    renderizar("/cuentas");

    expect(await screen.findByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.queryByText("Panel de cuentas")).toBeNull();
  });

  it("permite entrar al módulo autorizado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(trabajador)));

    renderizar("/venta");

    expect(await screen.findByText("Pantalla de venta")).toBeInTheDocument();
  });
});
