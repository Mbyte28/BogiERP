import {
  History,
  LayoutDashboard,
  Package,
  ShoppingBasket,
  ShoppingCart,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ModuloKey =
  | "DASHBOARD"
  | "VENTA"
  | "INVENTARIO"
  | "CLIENTES"
  | "CAJA"
  | "HISTORIAL"
  | "CUENTAS";

export interface Modulo {
  key: ModuloKey;
  nombre: string;
  nombreCorto: string;
  ruta: string;
  descripcion: string;
  icono: LucideIcon;
}

/**
 * Orden oficial de los módulos del sistema (sección 6 del documento de
 * arquitectura). Los permisos por rol se aplicarán sobre esta lista.
 */
export const MODULOS: readonly Modulo[] = [
  {
    key: "DASHBOARD",
    nombre: "Dashboard",
    nombreCorto: "Inicio",
    ruta: "/dashboard",
    descripcion: "Ventas, ganancia, merma y productos destacados del periodo",
    icono: LayoutDashboard,
  },
  {
    key: "VENTA",
    nombre: "Ventas",
    nombreCorto: "Venta",
    ruta: "/venta",
    descripcion: "Catálogo de productos, ticket y cobro en efectivo o transferencia",
    icono: ShoppingCart,
  },
  {
    key: "INVENTARIO",
    nombre: "Inventario",
    nombreCorto: "Inventario",
    ruta: "/inventario",
    descripcion: "Categorías, productos, costos, stock y mermas",
    icono: Package,
  },
  {
    key: "CLIENTES",
    nombre: "Envíos",
    nombreCorto: "Envíos",
    ruta: "/envios",
    descripcion: "Torres, pisos, departamentos y envíos activos o pagados",
    icono: ShoppingBasket,
  },
  {
    key: "CAJA",
    nombre: "Caja",
    nombreCorto: "Caja",
    ruta: "/caja",
    descripcion: "Apertura, cierre y resumen de la caja actual",
    icono: Wallet,
  },
  {
    key: "HISTORIAL",
    nombre: "Historial",
    nombreCorto: "Historial",
    ruta: "/historial",
    descripcion: "Consulta de cajas cerradas y su detalle",
    icono: History,
  },
  {
    key: "CUENTAS",
    nombre: "Cuentas",
    nombreCorto: "Cuentas",
    ruta: "/cuentas",
    descripcion: "Usuarios, roles y permisos por módulo",
    icono: UserCog,
  },
];

export function getModulo(key: ModuloKey): Modulo {
  const modulo = MODULOS.find((item) => item.key === key);
  if (!modulo) {
    throw new Error(`Módulo desconocido: ${key}`);
  }
  return modulo;
}

export function moduloPorRuta(pathname: string): Modulo | undefined {
  return MODULOS.find(
    (modulo) => pathname === modulo.ruta || pathname.startsWith(`${modulo.ruta}/`),
  );
}
