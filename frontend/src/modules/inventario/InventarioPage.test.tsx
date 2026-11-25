import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Categoria, Merma, Producto, ProductoPage } from "@/lib/inventario";
import InventarioPage from "./InventarioPage";

const categorias: Categoria[] = [
  { id: 3, nombre: "Carnes", icono: "beef", productos: 1 },
  { id: 4, nombre: "Lácteos", icono: "milk", productos: 1 },
];

const productos: Producto[] = [
  {
    id: 1,
    nombre: "Leche entera",
    categoriaId: 4,
    categoriaNombre: "Lácteos",
    categoriaIcono: "milk",
    imagen: null,
    tipoVenta: "UNIDAD",
    precioVenta: "5.50",
    costoActual: null,
    stock: "12",
    fechaVencimiento: "2026-11-28",
    activo: true,
    sinCosto: true,
    diasVencimiento: 3,
    creadoEn: "2026-11-20T10:00:00Z",
  },
  {
    id: 2,
    nombre: "Pollo fresco",
    categoriaId: 3,
    categoriaNombre: "Carnes",
    categoriaIcono: "beef",
    imagen: null,
    tipoVenta: "KILO",
    precioVenta: "12.00",
    costoActual: "9.00",
    stock: "4.500",
    fechaVencimiento: null,
    activo: true,
    sinCosto: false,
    diasVencimiento: null,
    creadoEn: "2026-11-21T10:00:00Z",
  },
];

const pagina: ProductoPage = { items: productos, total: 2, page: 0, size: 25 };

const mermas: Merma[] = [
  {
    id: 10,
    productoId: 1,
    productoNombre: "Leche entera",
    cantidad: "2",
    costoUnitario: null,
    total: "0.00",
    motivo: "VENCIMIENTO",
    creadoEn: "2026-11-24T10:00:00Z",
    usuarioId: 1,
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
      <InventarioPage />
    </QueryClientProvider>,
  );
}

function simularApi(peticiones = vi.fn()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      peticiones(String(entrada), init);
      const url = String(entrada);
      const metodo = init?.method ?? "GET";

      if (url.includes("/categorias") && metodo === "POST") {
        return respuesta({ id: 5, nombre: "Panadería", icono: "package", productos: 0 }, 201);
      }
      if (url.includes("/categorias")) return respuesta(categorias);

      if (url.includes("/productos") && metodo === "POST") {
        return respuesta({ ...productos[0], id: 3, nombre: "Nueva gaseosa" }, 201);
      }
      if (url.includes("/productos") && metodo === "PATCH") {
        return respuesta(productos[0]);
      }
      if (url.includes("/productos")) return respuesta(pagina);

      if (url.includes("/mermas") && metodo === "POST") {
        return respuesta({ ...mermas[0], id: 11, cantidad: "1" }, 201);
      }
      if (url.includes("/mermas")) return respuesta(mermas);

      return respuesta(null, 404);
    }),
  );
  return peticiones;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InventarioPage", () => {
  it("muestra productos, categorías, tipo de venta y alertas", async () => {
    simularApi();
    renderizar();

    expect(await screen.findAllByText("Leche entera")).not.toHaveLength(0);
    expect(screen.getAllByText("Pollo fresco").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin costo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vence en 3 d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kilo").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Lácteos" })).toBeInTheDocument();
    expect(screen.getAllByText(/VENCIMIENTO/).length).toBeGreaterThan(0);
  });

  it("filtra por búsqueda y categoría enviando los parámetros al backend", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "leche" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Carnes" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(([url]) =>
        url.includes("/productos?q=leche&categoriaId=3"),
      );
      expect(llamada).toBeDefined();
    });
  });

  it("crea un producto con los datos del formulario", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));

    const dialogo = await screen.findByRole("dialog", { name: "Producto" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "Nueva gaseosa" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Categoría"), {
      target: { value: "4" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Tipo de venta"), {
      target: { value: "UNIDAD" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Precio de venta"), {
      target: { value: "7.50" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Stock (unidades)"), {
      target: { value: "20" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear producto" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/productos") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      const cuerpo = JSON.parse(String(llamada?.[1]?.body));
      expect(cuerpo.nombre).toBe("Nueva gaseosa");
      expect(cuerpo.categoriaId).toBe(4);
      expect(cuerpo.precioVenta).toBe(7.5);
      expect(cuerpo.stock).toBe(20);
      expect(cuerpo.costoActual).toBeNull();
    });
  });

  it("registra una merma desde las acciones del producto", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Registrar merma de Leche entera" })[0],
    );

    const dialogo = await screen.findByRole("dialog", { name: "Registrar merma" });
    fireEvent.change(within(dialogo).getByLabelText("Cantidad (unidades)"), {
      target: { value: "1" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Motivo"), {
      target: { value: "ROTURA" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar merma" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/mermas") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      const cuerpo = JSON.parse(String(llamada?.[1]?.body));
      expect(cuerpo.productoId).toBe(1);
      expect(cuerpo.cantidad).toBe(1);
      expect(cuerpo.motivo).toBe("ROTURA");
    });
  });

  it("agrega una categoría desde el panel de gestión", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Gestionar categorías" }));

    const dialogo = await screen.findByRole("dialog", { name: "Gestionar categorías" });
    fireEvent.change(within(dialogo).getByLabelText("Nueva categoría"), {
      target: { value: "Panadería" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar categoría" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/categorias") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      expect(JSON.parse(String(llamada?.[1]?.body)).nombre).toBe("Panadería");
    });
  });
});
