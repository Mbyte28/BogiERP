import { api } from "@/lib/api";
import type { TipoVenta } from "@/lib/inventario";

export interface ConfigEdificio {
  configurado: boolean;
  torres: number | null;
  pisosPorTorre: number | null;
  deptosPorPiso: number | null;
  totalDepartamentos: number;
}

export interface DatosConfigEdificio {
  torres: number;
  pisosPorTorre: number;
  deptosPorPiso: number;
}

export interface Torre {
  torre: number;
  pisos: number;
  departamentos: number;
  departamentosConDeuda: number;
  totalPendiente: string;
}

export interface Piso {
  piso: number;
  departamentos: number;
  departamentosConDeuda: number;
  totalPendiente: string;
}

export interface Departamento {
  id: number;
  torre: number;
  piso: number;
  numero: number;
  etiqueta: string;
  conDeuda: boolean;
  fiadosPendientes: number;
  totalPendiente: string;
}

export interface Fiado {
  id: number;
  departamentoId: number;
  productoId: number;
  nombreProducto: string;
  tipoVenta: TipoVenta;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
  estado: "PENDIENTE" | "PAGADO";
  creadoEn: string;
  pagadoEn: string | null;
}

export interface ProductoFiado {
  id: number;
  nombre: string;
  tipoVenta: TipoVenta;
  precioVenta: string;
  stock: string;
}

export interface DeudaDepartamento {
  departamentoId: number;
  etiqueta: string;
  total: string;
  cantidad: number;
  fiados: Fiado[];
}

export interface DeudaGrupo {
  etiqueta: string;
  total: string;
  cantidad: number;
  departamentos: DeudaDepartamento[];
}

export interface ItemFiado {
  productoId: number;
  cantidad: number;
}

export interface SolicitudFiado {
  departamentoId: number;
  items: ItemFiado[];
}

export type NivelDeuda = "edificio" | "torre" | "piso";

function consulta(parametros: Record<string, number | string | undefined>): string {
  const pares = Object.entries(parametros)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== "")
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);
  return pares.length ? `?${pares.join("&")}` : "";
}

export const clientesApi = {
  configuracion: () => api.get<ConfigEdificio>("/edificio/config"),
  configurar: (datos: DatosConfigEdificio) =>
    api.post<ConfigEdificio>("/edificio/config", datos),

  torres: () => api.get<Torre[]>("/edificio/torres"),
  pisos: (torre: number) => api.get<Piso[]>(`/edificio/torres/${torre}/pisos`),
  departamentos: (torre: number, piso: number) =>
    api.get<Departamento[]>(`/edificio/torres/${torre}/pisos/${piso}/departamentos`),

  fiados: (departamentoId: number) =>
    api.get<Fiado[]>(`/departamentos/${departamentoId}/fiados`),
  productos: () => api.get<ProductoFiado[]>("/fiados/productos"),
  deudas: (nivel: NivelDeuda, torre?: number, piso?: number) =>
    api.get<DeudaGrupo[]>(`/fiados/deudas${consulta({ nivel, torre, piso })}`),
  registrar: (datos: SolicitudFiado) => api.post<Fiado[]>("/fiados", datos),
  pagar: (id: number) => api.patch<Fiado>(`/fiados/${id}/pagar`),
};
