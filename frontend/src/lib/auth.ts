import { api } from "@/lib/api";
import { MODULOS, type ModuloKey } from "@/lib/navigation";

export interface Sesion {
  id: number;
  username: string;
  rol: string;
  principal: boolean;
  modulos: ModuloKey[];
}

export interface Usuario {
  id: number;
  username: string;
  rol: string;
  principal: boolean;
  activo: boolean;
  creadoEn: string;
}

export interface Rol {
  id: number;
  nombre: string;
  esSistema: boolean;
  esPrincipal: boolean;
  modulos: ModuloKey[];
}

export interface CrearUsuario {
  username: string;
  password: string;
  rolId: number;
}

export interface CrearRol {
  nombre: string;
  modulos: ModuloKey[];
}

/** El módulo CUENTAS es exclusivo del rol principal, también en la interfaz. */
export function puedeAcceder(sesion: Sesion | null, modulo: ModuloKey): boolean {
  if (!sesion) {
    return false;
  }
  if (modulo === "CUENTAS") {
    return sesion.principal;
  }
  return sesion.principal || sesion.modulos.includes(modulo);
}

export function modulosVisibles(sesion: Sesion | null) {
  return MODULOS.filter((modulo) => puedeAcceder(sesion, modulo.key));
}

export function rutaInicial(sesion: Sesion | null): string {
  return modulosVisibles(sesion)[0]?.ruta ?? "/sin-acceso";
}

export const sesionApi = {
  actual: () => api.get<Sesion>("/auth/me"),
  iniciar: (username: string, password: string) =>
    api.post<Sesion>("/auth/login", { username, password }),
  cerrar: () => api.post<void>("/auth/logout"),
  usuarios: () => api.get<Usuario[]>("/usuarios"),
  crearUsuario: (datos: CrearUsuario) => api.post<Usuario>("/usuarios", datos),
  roles: () => api.get<Rol[]>("/roles"),
  crearRol: (datos: CrearRol) => api.post<Rol>("/roles", datos),
  actualizarModulos: (id: number, modulos: ModuloKey[]) =>
    api.put<Rol>(`/roles/${id}/modulos`, { modulos }),
};
