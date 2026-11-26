import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  finDeMes,
  type DetalleMesDashboard,
  type ProductoDestacado,
  type ResumenDashboard,
  type VentaMensual,
} from "@/lib/dashboard";
import { dinero } from "@/lib/inventario";
import DashboardPage from "./DashboardPage";

function textoDinero(valor: number): string {
  return dinero(valor).replace(/\u00a0/g, " ");
}

vi.mock("recharts", async () => {
  const React = await import("react");
  const prueba = (nombre: string) => (props: { children?: ReactNode }) =>
    React.createElement("div", { "data-testid": `grafico-${nombre}` }, props.children);
  return {
    ResponsiveContainer: prueba("contenedor"),
    AreaChart: prueba("area"),
    Area: prueba("area-serie"),
    LineChart: prueba("linea"),
    Line: prueba("linea-serie"),
    BarChart: prueba("barras"),
    Bar: prueba("barra"),
    Cell: prueba("celda"),
    PieChart: prueba("dona"),
    Pie: prueba("dona-serie"),
    XAxis: prueba("eje-x"),
    YAxis: prueba("eje-y"),
    CartesianGrid: prueba("rejilla"),
    Tooltip: prueba("tooltip"),
  };
});

function producto(
  id: number,
  nombre: string,
  cantidadVendida: number,
): ProductoDestacado {
  return {
    productoId: id,
    nombre,
    tipoVenta: "UNIDAD",
    imagen: null,
    categoriaIcono: "package",
    cantidad: cantidadVendida,
    ventas: cantidadVendida * 4,
    ganancia: cantidadVendida * 2,
  };
}

function punto(mes: string, ventas: number): VentaMensual {
  return {
    mes,
    ventas,
    ganancia: ventas / 2,
    merma: ventas / 20,
    gananciaNeta: ventas / 2 - ventas / 20,
    unidades: ventas / 10,
    kilos: 0,
    itemsSinCosto: 1,
  };
}

const serie: VentaMensual[] = [
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
].map((mes, indice) => punto(mes, 100 + indice * 20));

const serieAnio: VentaMensual[] = Array.from({ length: 12 }, (_, indice) =>
  punto(`2026-${String(indice + 1).padStart(2, "0")}`, 80 + indice * 10),
);

function resumen(mes: string, ventas: number): ResumenDashboard {
  return {
    ventas,
    ganancia: ventas / 2,
    merma: ventas / 20,
    gananciaNeta: (ventas / 2) - (ventas / 20),
    unidades: ventas / 10,
    kilos: 0,
    itemsSinCosto: 1,
    lineas: 3,
    desde: `${mes}-01`,
    hasta: finDeMes(mes),
  };
}

function detalle(mes: string, ventas: number): DetalleMesDashboard {
  return {
    mes,
    resumen: resumen(mes, ventas),
    porDia: [{ dia: `${mes}-25`, ventas, ganancia: ventas / 2, merma: ventas / 20 }],
    topProductos: [
      producto(1, "Pan", 30),
      producto(2, "Leche", 20),
      producto(3, "Mantequilla", 10),
      producto(4, "Queso", 8),
      producto(5, "Yogur", 5),
    ],
  };
}

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function simularApi({ fallar = false }: { fallar?: boolean } = {}) {
  const peticiones = vi.fn<(url: string) => void>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request) => {
      const url = String(entrada);
      peticiones(url);
      if (fallar) return respuesta({ message: "No se pudo cargar el dashboard." }, 500);

      const parametros = new URL(url, "http://local").searchParams;
      if (url.includes("/dashboard/ventas-mensuales")) {
        return respuesta(parametros.has("anio") ? serieAnio : serie);
      }
      if (url.includes("/dashboard/resumen")) {
        const desde = parametros.get("desde") ?? "2026-06-01";
        return respuesta({
          ...resumen("2026-06", 900),
          desde,
          hasta: parametros.get("hasta") ?? "2026-11-30",
        });
      }
      if (url.includes("/dashboard/mes")) {
        const mes = parametros.get("mes") ?? "2026-11";
        return respuesta(mes === "2026-10" ? detalle("2026-10", 150) : detalle("2026-11", 200));
      }
      if (url.includes("/dashboard/top-productos")) {
        return respuesta([
          producto(4, "Café", 0),
          producto(5, "Azúcar", 0),
          producto(2, "Leche", 2),
          producto(1, "Pan", 3),
          producto(3, "Mantequilla", 4),
        ]);
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
      <DashboardPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DashboardPage", () => {
  it("muestra KPIs, gráficos y productos del mes seleccionado", async () => {
    const peticiones = simularApi();
    renderizar();

    expect(await screen.findByText("Ventas mensuales")).toBeInTheDocument();
    expect(screen.getByText("Detalle de Nov de 2026")).toBeInTheDocument();
    expect(await screen.findByText(textoDinero(200))).toBeInTheDocument();
    expect(screen.getAllByText("Pan").length).toBeGreaterThan(0);
    expect(screen.getByText("Café")).toBeInTheDocument();
    expect(screen.getByText("Azúcar")).toBeInTheDocument();
    expect(screen.getAllByText("Mantequilla").length).toBeGreaterThan(0);
    expect(screen.getByText("Top 5")).toBeInTheDocument();
    expect(screen.getAllByText(/ uni ·/).length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText(/ und\b/)).not.toBeInTheDocument();

    expect(screen.getAllByTestId("grafico-area").length).toBeGreaterThan(0);
    expect(screen.getByTestId("grafico-barras")).toBeInTheDocument();
    expect(screen.getByTestId("grafico-dona")).toBeInTheDocument();
    expect(screen.getByTestId("grafico-linea")).toBeInTheDocument();

    const urls = peticiones.mock.calls.map(([url]) => url);
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/dashboard/ventas-mensuales?meses=6"),
        expect.stringContaining("/dashboard/resumen?desde=2026-06-01&hasta=2026-11-30"),
        expect.stringContaining("/dashboard/mes?mes=2026-11"),
        expect.stringContaining("/dashboard/top-productos?desde=2026-11-01&hasta=2026-11-30&orden=asc"),
      ]),
    );
  });

  it("cambia el periodo y el mes y actualiza el detalle", async () => {
    const peticiones = simularApi();
    renderizar();
    await screen.findByText("Detalle de Nov de 2026");

    fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "anio:2026" } });
    await waitFor(() =>
      expect(
        peticiones.mock.calls.some(([url]) => url.includes("/dashboard/ventas-mensuales?anio=2026")),
      ).toBe(true),
    );

    await screen.findByRole("option", { name: "Oct de 2026" });
    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "2026-10" } });
    expect(await screen.findByText("Detalle de Oct de 2026")).toBeInTheDocument();
    expect(screen.getByText(textoDinero(150))).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url]) => url.includes("/dashboard/mes?mes=2026-10")),
    ).toBe(true);
  });

  it("muestra el error del servidor en español", async () => {
    simularApi({ fallar: true });
    renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el dashboard.",
    );
  });
});
