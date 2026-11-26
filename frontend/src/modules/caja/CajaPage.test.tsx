import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CajaActual, CajaResumen } from "@/lib/caja";
import type { VentaResponse } from "@/lib/venta";
import CajaPage from "./CajaPage";

const resumen: CajaResumen = {
  cajaId: 3,
  abiertaEn: "2026-11-25T10:00:00Z",
  cerradaEn: null,
  abierta: true,
  totalVentas: 1,
  totalDinero: "45.50",
  totalEfectivo: "45.50",
  totalTransferencia: "0.00",
  totalUnidades: "2",
  totalKilos: "3.500",
  totalLineas: 2,
  ganancia: "12.00",
  itemsSinCosto: 1,
  productos: [
    {
      productoId: 1,
      nombreProducto: "Leche entera",
      tipoVenta: "UNIDAD",
      cantidadTotal: "2",
      ventasTotal: "11.00",
      ganancia: "4.00",
      tieneItemsSinCosto: false,
    },
    {
      productoId: 2,
      nombreProducto: "Pollo fresco",
      tipoVenta: "KILO",
      cantidadTotal: "3.500",
      ventasTotal: "42.00",
      ganancia: null,
      tieneItemsSinCosto: true,
    },
  ],
};

const ventas: VentaResponse[] = [
  {
    id: 7,
    cajaId: 3,
    metodoPago: "AMBOS",
    total: "53.00",
    montoEfectivo: "5.00",
    montoTransferencia: "48.00",
    efectivoRecibido: null,
    vuelto: "0.00",
    medioTransferencia: "PLIN",
    creadoEn: "2026-11-25T10:30:00Z",
    items: [
      {
        id: 8,
        productoId: 2,
        nombreProducto: "Pollo fresco",
        tipoVenta: "KILO",
        cantidad: "1.500",
        precioUnitario: "12.00",
        costoUnitario: null,
        subtotal: "18.00",
        ganancia: null,
        sinCosto: true,
      },
    ],
  },
];

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function simularApi(caja: CajaActual = { abierta: true, caja: resumen }) {
  const peticiones = vi.fn<(url: string, init?: RequestInit) => void>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      peticiones(url, init);

      if (url.includes("/caja/actual")) return respuesta(caja);
      if (url.includes("/caja/abrir")) return respuesta(resumen, 201);
      if (url.includes("/caja/cerrar")) {
        return respuesta({ ...resumen, abierta: false, cerradaEn: "2026-11-25T11:00:00Z" });
      }
      if (url.includes("/resumen")) return respuesta(resumen);
      if (url.includes("/ventas")) return respuesta(ventas);
      return respuesta(null, 404);
    }),
  );
  return peticiones;
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <CajaPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CajaPage", () => {
  it("muestra los KPIs y el detalle general de la caja abierta", async () => {
    simularApi();
    renderizar();

    expect(await screen.findByText(/45\.50/)).toBeInTheDocument();
    expect(screen.getByText("Total en caja")).toBeInTheDocument();
    expect(screen.getByText("Ganancia")).toBeInTheDocument();
    expect(screen.getAllByText("Sin costo").length).toBeGreaterThan(0);

    const filaLeche = screen.getByText("Leche entera").closest("li") as HTMLElement;
    expect(filaLeche).toHaveTextContent("2 uni.");
    expect(filaLeche).toHaveTextContent("S/ 11.00");
    expect(filaLeche).not.toHaveTextContent("vendidos");
    expect(filaLeche).not.toHaveTextContent("Unidad");
    expect(filaLeche).not.toHaveTextContent("Ganancia");

    const filaPollo = screen.getByText("Pollo fresco").closest("li") as HTMLElement;
    expect(filaPollo).toHaveTextContent("3.5 kg");
    expect(filaPollo).toHaveTextContent("S/ 42.00");

    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();
  });

  it("muestra cada venta con hora, método, billetera y productos", async () => {
    simularApi();
    renderizar();

    expect(await screen.findByText(/45\.50/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Por venta" }));

    expect(await screen.findByText("Ambos")).toBeInTheDocument();
    expect(screen.getByText("Plin")).toBeInTheDocument();
    expect(screen.getByText(/1.5 kg · Pollo fresco/)).toBeInTheDocument();
    expect(screen.getAllByText(/18\.00/).length).toBeGreaterThan(0);
  });

  it("abre la caja cuando no hay ninguna abierta", async () => {
    const peticiones = simularApi({ abierta: false, caja: null });
    renderizar();

    const boton = await screen.findByRole("button", { name: "Abrir caja" });
    fireEvent.click(boton);

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/caja/abrir") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
    });
  });

  it("pide confirmación antes de cerrar la caja", async () => {
    const peticiones = simularApi();
    renderizar();

    expect(await screen.findByText(/45\.50/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar caja" }));

    const dialogo = await screen.findByRole("dialog", { name: "Cerrar caja" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cerrar caja" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/caja/cerrar") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
    });
  });
});
