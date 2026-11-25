import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CajaResumen } from "@/lib/caja";
import type {
  HistorialCaja,
  HistorialCajaDetalle,
  HistorialCajaPage,
} from "@/lib/historial";
import type { VentaResponse } from "@/lib/venta";
import HistorialPage from "./HistorialPage";

const cajaAbierta: HistorialCaja = {
  cajaId: 8,
  abiertaEn: "2026-11-25T12:00:00Z",
  cerradaEn: null,
  abierta: true,
  totalVentas: 2,
  totalDinero: "45.50",
  totalEfectivo: "45.50",
  totalTransferencia: "0.00",
  totalUnidades: "2",
  totalKilos: "3.500",
  totalLineas: 2,
  ganancia: "12.00",
  itemsSinCosto: 1,
};

const cajaCerrada: HistorialCaja = {
  cajaId: 7,
  abiertaEn: "2026-11-25T10:00:00Z",
  cerradaEn: "2026-11-25T11:00:00Z",
  abierta: false,
  totalVentas: 1,
  totalDinero: "53.00",
  totalEfectivo: "5.00",
  totalTransferencia: "48.00",
  totalUnidades: "0",
  totalKilos: "1.500",
  totalLineas: 1,
  ganancia: "6.00",
  itemsSinCosto: 0,
};

const resumen: CajaResumen = {
  ...cajaCerrada,
  abierta: false,
  productos: [
    {
      productoId: 2,
      nombreProducto: "Pollo fresco",
      tipoVenta: "KILO",
      cantidadTotal: "1.500",
      ventasTotal: "18.00",
      ganancia: "6.00",
      tieneItemsSinCosto: false,
    },
  ],
};

const ventas: VentaResponse[] = [
  {
    id: 12,
    cajaId: 7,
    metodoPago: "AMBOS",
    total: "18.00",
    montoEfectivo: "5.00",
    montoTransferencia: "13.00",
    efectivoRecibido: null,
    vuelto: "0.00",
    medioTransferencia: "YAPE",
    creadoEn: "2026-11-25T10:30:00Z",
    items: [
      {
        id: 13,
        productoId: 2,
        nombreProducto: "Pollo fresco",
        tipoVenta: "KILO",
        cantidad: "1.500",
        precioUnitario: "12.00",
        costoUnitario: "8.00",
        subtotal: "18.00",
        ganancia: "6.00",
        sinCosto: false,
      },
    ],
  },
];

const detalle: HistorialCajaDetalle = { resumen, ventas };

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function simularApi({
  paginas = [],
  detalleCaja = detalle,
  fallar = false,
}: {
  paginas?: HistorialCajaPage[];
  detalleCaja?: HistorialCajaDetalle;
  fallar?: boolean;
} = {}) {
  const peticiones = vi.fn<(url: string, init?: RequestInit) => void>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      peticiones(url, init);

      if (fallar) {
        return respuesta({ message: "No se pudo cargar el historial." }, 500);
      }
      if (url.includes("/historial/cajas/")) {
        return respuesta(detalleCaja);
      }
      if (url.includes("/historial/cajas")) {
        const pagina = Number(new URL(url, "http://local").searchParams.get("page") ?? 0);
        return respuesta(
          paginas[pagina] ?? { items: [], total: 0, page: pagina, size: 30 },
        );
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
      <HistorialPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HistorialPage", () => {
  it("lista las cajas ordenadas y pagina de 30 en 30", async () => {
    const peticiones = simularApi({
      paginas: [
        { items: [cajaAbierta, cajaCerrada], total: 31, page: 0, size: 30 },
        { items: [cajaCerrada], total: 31, page: 1, size: 30 },
      ],
    });
    renderizar();

    expect(await screen.findAllByRole("button", { name: /Ver caja/ })).toHaveLength(2);
    expect(screen.getAllByText("Abierta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cerrada").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/45\.50/).length).toBeGreaterThan(0);
    expect(
      screen.getByText((_, elemento) => elemento?.tagName === "SPAN" && elemento.textContent === "1 / 2"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() =>
      expect(
        screen.getByText((_, elemento) => elemento?.tagName === "SPAN" && elemento.textContent === "2 / 2"),
      ).toBeInTheDocument(),
    );
    expect(
      peticiones.mock.calls.some(([url]) => url.includes("page=1") && url.includes("size=30")),
    ).toBe(true);
  });

  it("reutiliza el detalle de caja con General y Por venta", async () => {
    simularApi({
      paginas: [{ items: [cajaCerrada], total: 1, page: 0, size: 30 }],
    });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Ver caja/ }));

    expect(await screen.findByRole("button", { name: /Volver al historial/ })).toBeInTheDocument();
    expect(await screen.findByText("Pollo fresco")).toBeInTheDocument();
    expect(screen.getByText("Detalle de la caja")).toBeInTheDocument();
    expect(screen.getByText("Total en caja")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Por venta" }));

    expect(await screen.findByText("Ambos")).toBeInTheDocument();
    expect(screen.getByText("Yape")).toBeInTheDocument();
    expect(screen.getAllByText(/18\.00/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Volver al historial/ }));

    expect(await screen.findByRole("button", { name: /Ver caja/ })).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay cajas", async () => {
    simularApi();
    renderizar();

    expect(await screen.findByText("Aún no hay cajas registradas.")).toBeInTheDocument();
  });

  it("muestra el error de la API", async () => {
    simularApi({ fallar: true });
    renderizar();

    expect(
      await screen.findByRole("alert").then((alerta) => alerta.textContent),
    ).toContain("No se pudo cargar el historial.");
  });
});
