import { api } from "@/lib/api";
import type { TipoVenta } from "@/lib/inventario";

export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "AMBOS";
export type MedioTransferencia = "YAPE" | "PLIN";

export const METODOS_PAGO: { clave: MetodoPago; nombre: string }[] = [
  { clave: "EFECTIVO", nombre: "Efectivo" },
  { clave: "TRANSFERENCIA", nombre: "Transferencia" },
  { clave: "AMBOS", nombre: "Ambos" },
];

export function pagoValido(
  metodo: MetodoPago,
  total: number,
  recibido: number,
  efectivo: number,
): boolean {
  if (total <= 0) return false;
  if (metodo === "EFECTIVO") return Number.isFinite(recibido) && recibido >= total;
  if (metodo === "AMBOS") return efectivo > 0 && efectivo < total;
  return true;
}

export interface ItemCatalogo {
  id: number;
  nombre: string;
  categoriaNombre: string | null;
  categoriaIcono: string | null;
  imagen: string | null;
  tipoVenta: TipoVenta;
  precioVenta: string;
  stock: string;
  sinCosto: boolean;
  diasVencimiento: number | null;
  cantidadVendida: string | number;
  masVendido: boolean;
  fechaVencimiento: string | null;
}

export interface PaginaCatalogo {
  items: ItemCatalogo[];
  total: number;
  page: number;
  size: number;
}

export interface FiltrosCatalogo {
  page?: number;
  size?: number;
  q?: string;
  categoriaId?: number | null;
}

export interface LineaTicket {
  producto: ItemCatalogo;
  cantidad: number;
}

export interface SolicitudVenta {
  items: { productoId: number; cantidad: number }[];
  metodoPago: MetodoPago;
  efectivoRecibido?: number | null;
  montoEfectivo?: number | null;
  medioTransferencia?: MedioTransferencia | null;
}

export interface ItemVentaResponse {
  id: number;
  productoId: number;
  nombreProducto: string;
  tipoVenta: TipoVenta;
  cantidad: string;
  precioUnitario: string;
  costoUnitario: string | null;
  subtotal: string;
  ganancia: string | null;
  sinCosto: boolean;
}

export interface VentaResponse {
  id: number;
  cajaId: number;
  metodoPago: MetodoPago;
  total: string;
  montoEfectivo: string;
  montoTransferencia: string;
  efectivoRecibido: string | null;
  vuelto: string;
  medioTransferencia: MedioTransferencia | null;
  creadoEn: string;
  items: ItemVentaResponse[];
}

export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** El backend recalcula el total; aquí solo se muestra en tiempo real. */
export function totalTicket(lineas: LineaTicket[]): number {
  return redondear(
    lineas.reduce(
      (suma, linea) => suma + Number(linea.producto.precioVenta) * linea.cantidad,
      0,
    ),
  );
}

export function vuelto(total: number, recibido: number): number {
  if (!Number.isFinite(recibido) || recibido <= total) return 0;
  return redondear(recibido - total);
}

export function transferencia(total: number, efectivo: number): number {
  if (!Number.isFinite(efectivo) || efectivo <= 0 || efectivo >= total) return 0;
  return redondear(total - efectivo);
}

function consulta(parametros: FiltrosCatalogo): string {
  const pares = Object.entries(parametros)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== "")
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);
  return pares.length ? `?${pares.join("&")}` : "";
}

export const ventaApi = {
  catalogo: (filtros: FiltrosCatalogo = {}) =>
    api.get<PaginaCatalogo>(`/catalogo${consulta(filtros)}`),
  registrar: (datos: SolicitudVenta) => api.post<VentaResponse>("/ventas", datos),
};
