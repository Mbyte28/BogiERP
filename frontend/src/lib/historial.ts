import { api } from "@/lib/api";
import type { CajaResumen } from "@/lib/caja";
import type { VentaResponse } from "@/lib/venta";

export interface HistorialCaja {
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
  ganancia: string;
  itemsSinCosto: number;
}

export interface HistorialCajaPage {
  items: HistorialCaja[];
  total: number;
  page: number;
  size: number;
}

export interface HistorialCajaDetalle {
  resumen: CajaResumen;
  ventas: VentaResponse[];
}

export interface FiltrosHistorial {
  page?: number;
  size?: number;
}

export const historialApi = {
  cajas: ({ page = 0, size = 30 }: FiltrosHistorial = {}) =>
    api.get<HistorialCajaPage>(`/historial/cajas?page=${page}&size=${size}`),
  detalle: (id: number) =>
    api.get<HistorialCajaDetalle>(`/historial/cajas/${id}`),
};
