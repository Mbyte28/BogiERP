import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { CajaActual } from "@/lib/caja";
import type { PaginaCatalogo, VentaResponse } from "@/lib/venta";
import VentaPage from "./VentaPage";

const cajaAbierta: CajaActual = {
  abierta: true,
  caja: {
    cajaId: 1,
    abiertaEn: "2026-11-25T10:00:00Z",
    cerradaEn: null,
    abierta: true,
    totalVentas: 0,
    totalDinero: "0.00",
    totalEfectivo: "0.00",
    totalTransferencia: "0.00",
    totalUnidades: "0",
    totalKilos: "0",
    totalLineas: 0,
    ganancia: "0.00",
    itemsSinCosto: 0,
    productos: [],
  },
};

const catalogo: PaginaCatalogo = {
  items: [
    {
      id: 1,
      nombre: "Leche entera",
      categoriaNombre: "Lácteos",
      categoriaIcono: "milk",
      imagen: null,
      tipoVenta: "UNIDAD",
      precioVenta: "5.50",
      stock: "10",
      sinCosto: true,
      diasVencimiento: 3,
      masVendido: false,
      fechaVencimiento: "2026-11-28",
    },
    {
      id: 2,
      nombre: "Pollo fresco",
      categoriaNombre: "Carnes",
      categoriaIcono: "beef",
      imagen: null,
      tipoVenta: "KILO",
      precioVenta: "12.00",
      stock: "4.500",
      sinCosto: false,
      diasVencimiento: null,
      masVendido: true,
      fechaVencimiento: null,
    },
  ],
  total: 2,
  page: 0,
  size: 25,
};

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function simularApi(caja: CajaActual = cajaAbierta, ventaNoDisponible = false) {
  const peticiones = vi.fn<(url: string, init?: RequestInit) => void>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      const metodo = init?.method ?? "GET";
      peticiones(url, init);

      if (url.includes("/caja/actual")) return respuesta(caja);
      if (url.includes("/categorias")) {
        return respuesta([{ id: 4, nombre: "Lácteos", icono: "milk", productos: 1 }]);
      }
      if (url.includes("/catalogo")) return respuesta(catalogo);
      if (url.includes("/productos")) return respuesta({ items: [], total: 0, page: 0, size: 25 });
      if (url.includes("/ventas") && metodo === "POST") {
        if (ventaNoDisponible) {
          return respuesta({ message: "Producto no encontrado" }, 404);
        }
        const cuerpo = JSON.parse(String(init?.body)) as {
          items: { cantidad: number }[];
          metodoPago: string;
          efectivoRecibido?: number;
          montoEfectivo?: number;
          medioTransferencia?: string | null;
        };
        const total = cuerpo.items.reduce((suma, item) => suma + 5.5 * item.cantidad, 0);
        const vuelto =
          cuerpo.metodoPago === "EFECTIVO" ? (cuerpo.efectivoRecibido ?? 0) - total : 0;
        const venta: VentaResponse = {
          id: 9,
          cajaId: 1,
          metodoPago: cuerpo.metodoPago as VentaResponse["metodoPago"],
          total: total.toFixed(2),
          montoEfectivo: (cuerpo.montoEfectivo ?? total).toFixed(2),
          montoTransferencia: (total - (cuerpo.montoEfectivo ?? 0)).toFixed(2),
          efectivoRecibido: cuerpo.efectivoRecibido?.toFixed(2) ?? null,
          vuelto: vuelto.toFixed(2),
          medioTransferencia: (cuerpo.medioTransferencia ?? null) as VentaResponse["medioTransferencia"],
          creadoEn: "2026-11-25T10:05:00Z",
          items: [],
        };
        return respuesta(venta, 201);
      }
      return respuesta(null, 404);
    }),
  );
  return peticiones;
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>
        <VentaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VentaPage", () => {
  it("muestra el catálogo con más vendidos, stock y alertas", async () => {
    simularApi();
    renderizar();

    expect(await screen.findAllByText("Leche entera")).not.toHaveLength(0);
    expect(screen.getAllByText("Pollo fresco").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Más vendido").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin costo").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Agregar Leche entera" })).toBeInTheDocument();
  });

  it("calcula el vuelto en tiempo real y registra una venta en efectivo", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Agregar Leche entera" }));
    fireEvent.change(screen.getByLabelText("Recibido"), { target: { value: "20" } });

    expect(screen.getByText(/Vuelto a dar/)).toHaveTextContent(/14\.50/);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar venta" }));

    const dialogo = await screen.findByRole("dialog", { name: "Venta registrada" });
    expect(within(dialogo).getByText(/14\.50/)).toBeInTheDocument();

    const llamada = peticiones.mock.calls.find(
      ([url, init]) => url.includes("/ventas") && init?.method === "POST",
    );
    expect(llamada).toBeDefined();
    const cuerpo = JSON.parse(String(llamada?.[1]?.body));
    expect(cuerpo.items[0]).toEqual({ productoId: 1, cantidad: 1 });
    expect(cuerpo.metodoPago).toBe("EFECTIVO");
    expect(cuerpo.efectivoRecibido).toBe(20);
    expect(cuerpo.total).toBeUndefined();
  });

  it("refresca catálogo y caja si el producto fue borrado desde otro dispositivo", async () => {
    const peticiones = simularApi(cajaAbierta, true);
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Agregar Leche entera" }));
    fireEvent.change(screen.getByLabelText("Recibido"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Finalizar venta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Producto no encontrado");
    await waitFor(() => {
      const consultasCatalogo = peticiones.mock.calls.filter(([url]) => url.includes("/catalogo"));
      expect(consultasCatalogo.length).toBeGreaterThan(1);
    });
  });

  it("pide Yape o Plin antes de registrar una transferencia", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Agregar Leche entera" }));
    fireEvent.click(screen.getByRole("button", { name: "Transferencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar venta" }));

    const medio = await screen.findByRole("dialog", { name: "Yape o Plin" });
    fireEvent.click(within(medio).getByRole("button", { name: "Yape" }));

    await screen.findByRole("dialog", { name: "Venta registrada" });
    const llamada = peticiones.mock.calls.find(
      ([url, init]) => url.includes("/ventas") && init?.method === "POST",
    );
    const cuerpo = JSON.parse(String(llamada?.[1]?.body));
    expect(cuerpo.metodoPago).toBe("TRANSFERENCIA");
    expect(cuerpo.medioTransferencia).toBe("YAPE");
  });

  it("calcula la transferencia al pagar con ambos medios", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Agregar Leche entera" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Leche entera" }));
    fireEvent.click(screen.getByRole("button", { name: "Ambos" }));
    fireEvent.change(screen.getByLabelText("Efectivo"), { target: { value: "5" } });

    expect(screen.getByText(/Recibido en transferencia/)).toHaveTextContent(/6\.00/);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar venta" }));
    const medio = await screen.findByRole("dialog", { name: "Yape o Plin" });
    fireEvent.click(within(medio).getByRole("button", { name: "Plin" }));

    await screen.findByRole("dialog", { name: "Venta registrada" });
    const llamada = peticiones.mock.calls.find(
      ([url, init]) => url.includes("/ventas") && init?.method === "POST",
    );
    const cuerpo = JSON.parse(String(llamada?.[1]?.body));
    expect(cuerpo.items[0].cantidad).toBe(2);
    expect(cuerpo.montoEfectivo).toBe(5);
    expect(cuerpo.medioTransferencia).toBe("PLIN");
  });

  it("impide finalizar si la caja está cerrada", async () => {
    simularApi({ abierta: false, caja: null });
    renderizar();

    expect(await screen.findByText(/La caja está cerrada/)).toBeInTheDocument();
    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Agregar Leche entera" }));
    expect(screen.getByRole("button", { name: "Finalizar venta" })).toBeDisabled();
  });

  it("muestra el precio por kilo en el ticket de un producto de kilo", async () => {
    simularApi();
    renderizar();

    await screen.findAllByText("Pollo fresco");
    fireEvent.click(screen.getByRole("button", { name: "Agregar Pollo fresco" }));

    expect(screen.getByText(/12\.00 x kilo/)).toBeInTheDocument();
  });

  it("busca en todas las categorías al escribir en el buscador", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Lácteos" }));
    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "pollo" },
    });

    await waitFor(() => {
      const url = [...peticiones.mock.calls]
        .reverse()
        .find(([valor]) => valor.includes("/catalogo"))?.[0];
      expect(url).toContain("q=pollo");
      expect(url).not.toContain("categoriaId");
    });
    expect(screen.getByText(/Buscando en todas las categorías/)).toBeInTheDocument();
  });
});
