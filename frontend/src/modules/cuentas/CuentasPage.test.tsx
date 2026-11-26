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

    fireEvent.click(screen.getByRole("button", { name: "Ver permisos de TRABAJADOR" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Ver permisos de TRABAJADOR" }));
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

  it("abre un modal vertical y permite mostrar la contraseña", async () => {
    const peticiones = vi.fn(
      async (entrada: string | URL | Request, init?: RequestInit) => {
        const url = String(entrada);
        if (url.includes("/usuarios") && init?.method === "POST") {
          return respuesta({ id: 3, username: "nuevo", rol: "TRABAJADOR" }, 201);
        }
        if (url.includes("/usuarios")) return respuesta(usuarios);
        return respuesta(roles);
      },
    );
    vi.stubGlobal("fetch", peticiones);
    renderizar();

    await screen.findByText("vendedor");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));

    const modal = await screen.findByRole("dialog", { name: "Nuevo usuario" });
    const clave = within(modal).getByLabelText("Contraseña");
    expect(clave).toHaveAttribute("type", "password");

    fireEvent.click(within(modal).getByRole("button", { name: "Mostrar contraseña" }));
    expect(clave).toHaveAttribute("type", "text");
    fireEvent.click(within(modal).getByRole("button", { name: "Ocultar contraseña" }));
    expect(clave).toHaveAttribute("type", "password");

    fireEvent.change(within(modal).getByLabelText("Usuario"), { target: { value: "nuevo" } });
    fireEvent.change(clave, { target: { value: "Clave123" } });
    fireEvent.change(within(modal).getByLabelText("Rol"), { target: { value: "2" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, opciones]) => String(url).includes("/usuarios") && opciones?.method === "POST",
      );
      expect(llamada).toBeDefined();
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        username: "nuevo",
        password: "Clave123",
        rolId: 2,
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Nuevo usuario" })).not.toBeInTheDocument(),
    );
  });

  it("colapsa cada rol de forma independiente", async () => {
    const otroRol: Rol = {
      id: 3,
      nombre: "Supervisor",
      esSistema: false,
      esPrincipal: false,
      modulos: ["INVENTARIO"],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (entrada: string | URL | Request) => {
        const url = String(entrada);
        if (url.includes("/usuarios")) return respuesta(usuarios);
        return respuesta([...roles, otroRol]);
      }),
    );
    renderizar();

    expect(await screen.findByText("Supervisor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar permisos" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver permisos de TRABAJADOR" }));
    const editor = screen.getByRole("button", { name: "Guardar permisos" }).closest("li") as HTMLElement;
    expect(within(editor).getByLabelText("Registrar venta")).toBeChecked();
    expect(screen.getAllByRole("button", { name: "Guardar permisos" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Ver permisos de Supervisor" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver permisos de Supervisor" }));
    expect(screen.getAllByRole("button", { name: "Guardar permisos" })).toHaveLength(2);
  });

  it("impide crear más de seis roles sin contar el principal", async () => {
    const muchosRoles: Rol[] = Array.from({ length: 6 }, (_, indice) => ({
      id: indice + 2,
      nombre: `Rol ${indice + 1}`,
      esSistema: false,
      esPrincipal: false,
      modulos: [],
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (entrada: string | URL | Request) => {
        const url = String(entrada);
        if (url.includes("/usuarios")) return respuesta(usuarios);
        return respuesta([roles[0], ...muchosRoles]);
      }),
    );
    renderizar();

    expect(await screen.findByText("Rol 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear rol" })).toBeDisabled();
    expect(screen.getByText(/Máximo 6 roles alcanzado/)).toBeInTheDocument();
  });
});
