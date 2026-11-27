import { api } from "@/lib/api";

export type TipoVenta = "UNIDAD" | "KILO";

export interface Categoria {
  id: number;
  nombre: string;
  icono: string | null;
  productos: number;
}

export interface Producto {
  id: number;
  nombre: string;
  categoriaId: number | null;
  categoriaNombre: string | null;
  categoriaIcono: string | null;
  imagen: string | null;
  tipoVenta: TipoVenta;
  precioVenta: string;
  costoActual: string | null;
  stock: string;
  fechaVencimiento: string | null;
  activo: boolean;
  sinCosto: boolean;
  diasVencimiento: number | null;
  creadoEn: string;
}

export interface ProductoPage {
  items: Producto[];
  total: number;
  page: number;
  size: number;
}

export interface FiltrosProductos {
  page?: number;
  size?: number;
  q?: string;
  categoriaId?: number | null;
}

export interface DatosCategoria {
  nombre: string;
  icono?: string | null;
}

export interface DatosProducto {
  nombre: string;
  categoriaId?: number | null;
  tipoVenta: TipoVenta;
  precioVenta: number;
  costoActual?: number | null;
  stock?: number;
  fechaVencimiento?: string | null;
}

export interface Merma {
  id: number;
  productoId: number;
  productoNombre: string;
  cantidad: string;
  costoUnitario: string | null;
  total: string;
  motivo: string;
  creadoEn: string;
  usuarioId: number | null;
}

export interface DatosMerma {
  productoId: number;
  cantidad: number;
  motivo?: string;
}

export interface LineaInventario {
  productoId: number;
  cantidad: number;
  costo?: number | null;
}

function consulta(parametros: object): string {
  const pares = Object.entries(parametros as Record<string, unknown>)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== "")
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);
  return pares.length ? `?${pares.join("&")}` : "";
}

export function urlImagen(nombre: string | null): string | null {
  return nombre ? `/uploads/${encodeURIComponent(nombre)}` : null;
}

export function dinero(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(numero);
}

export function cantidad(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "0";
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero)) return "0";
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(numero);
}

/** Convierte el costo total de un lote de kilos al costo por kilo que guarda el backend. */
export function costoPorKilo(costoTotal: number, kilos: number): number {
  if (!Number.isFinite(costoTotal) || costoTotal < 0) {
    throw new Error("El costo registrado no es válido");
  }
  if (!Number.isFinite(kilos) || kilos <= 0) {
    throw new Error("Ingresa stock en kilos antes de registrar el costo total");
  }
  return Math.round((costoTotal / kilos + Number.EPSILON) * 100) / 100;
}

export function fecha(valor: string | null): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(fecha);
}

export const inventarioApi = {
  categorias: () => api.get<Categoria[]>("/categorias"),
  crearCategoria: (datos: DatosCategoria) => api.post<Categoria>("/categorias", datos),
  actualizarCategoria: (id: number, datos: DatosCategoria) =>
    api.put<Categoria>(`/categorias/${id}`, datos),
  eliminarCategoria: (id: number) => api.delete<void>(`/categorias/${id}`),

  productos: (filtros: FiltrosProductos = {}) =>
    api.get<ProductoPage>(`/productos${consulta(filtros)}`),
  crearProducto: (datos: DatosProducto) => api.post<Producto>("/productos", datos),
  actualizarProducto: (id: number, datos: DatosProducto) =>
    api.put<Producto>(`/productos/${id}`, datos),
  registrarInventario: (items: LineaInventario[]) =>
    api.post<Producto[]>("/productos/ingresos", { items }),
  subirImagen: (id: number, archivo: File) => {
    const datos = new FormData();
    datos.append("imagen", archivo);
    return api.upload<Producto>(`/productos/${id}/imagen`, datos);
  },
  eliminarImagen: (id: number) => api.delete<Producto>(`/productos/${id}/imagen`),

  mermas: (mes: string) => api.get<Merma[]>(`/mermas${consulta({ mes })}`),
  crearMerma: (datos: DatosMerma) => api.post<Merma>("/mermas", datos),
};
