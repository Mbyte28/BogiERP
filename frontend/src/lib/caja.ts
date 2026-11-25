import { api } from "@/lib/api";
import type { TipoVenta } from "@/lib/inventario";
import type { VentaResponse } from "@/lib/venta";

export interface ProductoCaja {
  productoId: number;
  nombreProducto: string;
  tipoVenta: TipoVenta;
  cantidadTotal: string;
  ventasTotal: string;
  ganancia: string | null;
  tieneItemsSinCosto: boolean;
}

export interface CajaResumen {
  cajaId: number;
  abiertaEn: string;
  cerradaEn: string | null;
  abierta: boolean;
  totalVentas: number;
  totalDinero: string;
  totalEfectivo: string;
  totalTransferencia: string;
  totalUnidades: string;
  totalKilos: string;
  totalLineas: number;
  ganancia: string | null;
  itemsSinCosto: number;
  productos: ProductoCaja[];
}

export interface CajaActual {
  abierta: boolean;
  caja: CajaResumen | null;
}

export const cajaApi = {
  actual: () => api.get<CajaActual>("/caja/actual"),
  abrir: () => api.post<CajaResumen>("/caja/abrir"),
  cerrar: () => api.post<CajaResumen>("/caja/cerrar"),
  resumen: (id: number) => api.get<CajaResumen>(`/caja/${id}/resumen`),
  ventas: (id: number) => api.get<VentaResponse[]>(`/caja/${id}/ventas`),
};
