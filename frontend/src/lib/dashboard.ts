import { api } from "@/lib/api";
import type { TipoVenta } from "@/lib/inventario";

/** El backend serializa BigDecimal como número, pero aceptamos texto por si cambia. */
export type DecimalDashboard = number | string;

export interface ResumenDashboard {
  ventas: DecimalDashboard;
  ganancia: DecimalDashboard;
  merma: DecimalDashboard;
  gananciaNeta: DecimalDashboard;
  unidades: DecimalDashboard;
  kilos: DecimalDashboard;
  itemsSinCosto: number;
  lineas: number;
  desde: string;
  hasta: string;
}

export interface VentaMensual {
  mes: string;
  ventas: DecimalDashboard;
  ganancia: DecimalDashboard;
  merma: DecimalDashboard;
  gananciaNeta: DecimalDashboard;
  unidades: DecimalDashboard;
  kilos: DecimalDashboard;
  itemsSinCosto: number;
}

export interface ProductoDestacado {
  productoId: number;
  nombre: string;
  tipoVenta: TipoVenta;
  imagen: string | null;
  categoriaIcono: string | null;
  cantidad: DecimalDashboard;
  ventas: DecimalDashboard;
  ganancia: DecimalDashboard;
}

export interface PuntoDiario {
  dia: string;
  ventas: DecimalDashboard;
  ganancia: DecimalDashboard;
  merma: DecimalDashboard;
}

export interface DetalleMesDashboard {
  mes: string;
  resumen: ResumenDashboard;
  porDia: PuntoDiario[];
  topProductos: ProductoDestacado[];
}

export type PeriodoDashboard = "meses" | "anio";

function consulta(parametros: Record<string, string | number | undefined>): string {
  const partes = Object.entries(parametros)
    .filter(([, valor]) => valor !== undefined && valor !== "")
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`);
  return partes.length ? `?${partes.join("&")}` : "";
}

export const dashboardApi = {
  ventasMensuales: (periodo: PeriodoDashboard, valor: number) =>
    api.get<VentaMensual[]>(`/dashboard/ventas-mensuales${consulta({ [periodo]: valor })}`),

  resumen: (desde?: string, hasta?: string) =>
    api.get<ResumenDashboard>(`/dashboard/resumen${consulta({ desde, hasta })}`),

  topProductos: (desde: string, hasta: string, orden: "asc" | "desc") =>
    api.get<ProductoDestacado[]>(`/dashboard/top-productos${consulta({ desde, hasta, orden })}`),

  mes: (mes: string) =>
    api.get<DetalleMesDashboard>(`/dashboard/mes${consulta({ mes })}`),
};

/** Último día del mes `AAAA-MM`, en la zona horaria de la tienda. */
export function finDeMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, numero, 0)).toISOString().slice(0, 10);
}

export function inicioDeMes(mes: string): string {
  return `${mes}-01`;
}
