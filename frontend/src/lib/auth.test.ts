import { describe, expect, it } from "vitest";
import { modulosVisibles, puedeAcceder, rutaInicial, type Sesion } from "./auth";

const principal: Sesion = {
  id: 1,
  username: "admin",
  rol: "PRINCIPAL",
  principal: true,
  modulos: [
    "DASHBOARD",
    "VENTA",
    "INVENTARIO",
    "CLIENTES",
    "CAJA",
    "HISTORIAL",
    "CUENTAS",
  ],
};

const trabajador: Sesion = {
  id: 2,
  username: "vendedor",
  rol: "TRABAJADOR",
  principal: false,
  modulos: ["VENTA", "CAJA", "HISTORIAL"],
};

describe("puedeAcceder", () => {
  it("da acceso total al rol principal, incluido Cuentas", () => {
    for (const modulo of [
      "DASHBOARD",
      "VENTA",
      "INVENTARIO",
      "CLIENTES",
      "CAJA",
      "HISTORIAL",
      "CUENTAS",
    ] as const) {
      expect(puedeAcceder(principal, modulo)).toBe(true);
    }
  });

  it("limita al trabajador a los módulos de su rol", () => {
    expect(puedeAcceder(trabajador, "VENTA")).toBe(true);
    expect(puedeAcceder(trabajador, "CAJA")).toBe(true);
    expect(puedeAcceder(trabajador, "INVENTARIO")).toBe(false);
    expect(puedeAcceder(trabajador, "CLIENTES")).toBe(false);
  });

  it("nunca permite Cuentas a un rol normal", () => {
    expect(puedeAcceder(trabajador, "CUENTAS")).toBe(false);
    expect(puedeAcceder({ ...trabajador, modulos: ["CUENTAS"] }, "CUENTAS")).toBe(
      false,
    );
  });

  it("niega el acceso sin sesión", () => {
    expect(puedeAcceder(null, "DASHBOARD")).toBe(false);
  });
});

describe("navegación según permisos", () => {
  it("muestra solo los módulos permitidos en el orden oficial", () => {
    expect(modulosVisibles(trabajador).map((modulo) => modulo.key)).toEqual([
      "VENTA" as const,
      "CAJA" as const,
      "HISTORIAL" as const,
    ]);
  });

  it("envía al principal al dashboard y al trabajador a su primer módulo", () => {
    expect(rutaInicial(principal)).toBe("/dashboard");
    expect(rutaInicial(trabajador)).toBe("/venta");
    expect(rutaInicial(null)).toBe("/sin-acceso");
  });
});
