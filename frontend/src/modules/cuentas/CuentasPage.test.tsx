import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Rol, Usuario } from "@/lib/auth";
import CuentasPage from "./CuentasPage";

const roles: Rol[] = [
  {
    id: 1,
    nombre: "PRINCIPAL",
    esSistema: true,
    esPrincipal: true,
    modulos: ["DASHBOARD", "CUENTAS"],
  },
  {
    id: 2,
    nombre: "TRABAJADOR",
    esSistema: true,
    esPrincipal: false,
    modulos: ["VENTA", "CAJA", "HISTORIAL"],
  },
];

const usuarios: Usuario[] = [
  {
    id: 1,
    username: "admin",
    rol: "PRINCIPAL",
    principal: true,
    activo: true,
    creadoEn: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    username: "vendedor",
    rol: "TRABAJADOR",
    principal: false,
    activo: true,
    creadoEn: "2026-01-02T00:00:00Z",
  },
];

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <CuentasPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CuentasPage", () => {
  it("lista usuarios y roles con sus permisos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (entrada: string | URL | Request) => {
        const url = String(entrada);
        if (url.includes("/usuarios")) return respuesta(usuarios);
        return respuesta(roles);
      }),
    );

    renderizar();

    expect(await screen.findByText("vendedor")).toBeInTheDocument();
    expect(screen.getAllByText("TRABAJADOR").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Principal").length).toBeGreaterThan(0);

    const editor = screen
      .getByRole("button", { name: "Guardar permisos" })
      .closest("li") as HTMLElement;
    expect(within(editor).getByLabelText("Registrar venta")).toBeChecked();
    expect(within(editor).getByLabelText("Caja")).toBeChecked();
  });

  it("guardar permisos envía los módulos seleccionados al backend", async () => {
    const peticiones = vi.fn(
      async (entrada: string | URL | Request, _init?: RequestInit) => {
        const url = String(entrada);
        if (url.includes("/usuarios")) return respuesta(usuarios);
        if (url.includes("/modulos")) {
          return respuesta({ ...roles[1], modulos: ["CLIENTES", "CAJA", "HISTORIAL"] });
        }
        return respuesta(roles);
      },
    );
    vi.stubGlobal("fetch", peticiones);

    renderizar();

    await screen.findByText("vendedor");
    const botonGuardar = screen.getByRole("button", { name: "Guardar permisos" });
    const editor = botonGuardar.closest("li") as HTMLElement;
    fireEvent.click(within(editor).getByLabelText("Registrar venta"));
    fireEvent.click(within(editor).getByLabelText("Clientes"));
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(([url, opciones]) =>
        String(url).includes("/roles/2/modulos") && opciones?.method === "PUT",
      );
      expect(llamada).toBeDefined();
      const modulos = JSON.parse(String(llamada?.[1]?.body)).modulos as string[];
      expect(modulos).toContain("CLIENTES");
      expect(modulos).not.toContain("VENTA");
    });
  });
});
