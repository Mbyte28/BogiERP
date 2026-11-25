import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import type { Sesion } from "@/lib/auth";
import LoginPage from "./LoginPage";

const sesion: Sesion = {
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

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/venta" element={<p>Pantalla de venta</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("inicia sesión y envía al trabajador a su primer módulo", async () => {
    const peticiones = vi.fn(async (entrada: string | URL | Request) => {
      const url = String(entrada);
      if (url.includes("/auth/me")) {
        return respuesta({ message: "Sin sesión" }, 401);
      }
      if (url.includes("/auth/login")) {
        return respuesta(sesion);
      }
      throw new Error(`Ruta inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", peticiones);

    renderizar();

    fireEvent.change(await screen.findByLabelText("Usuario"), {
      target: { value: "vendedor" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Pantalla de venta")).toBeInTheDocument();
    expect(peticiones).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("muestra el error del servidor cuando las credenciales son incorrectas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (entrada: string | URL | Request) => {
        const url = String(entrada);
        if (url.includes("/auth/me")) {
          return respuesta({ message: "Sin sesión" }, 401);
        }
        return respuesta({ message: "Usuario o contraseña incorrectos" }, 401);
      }),
    );

    renderizar();

    fireEvent.change(await screen.findByLabelText("Usuario"), {
      target: { value: "vendedor" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "mala" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Usuario o contraseña incorrectos")).toBeInTheDocument();
  });
});
