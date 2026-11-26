import { describe, expect, it } from "vitest";
import { crearQueryClient, REFRESCO_AUTOMATICO } from "./queryClient";

describe("crearQueryClient", () => {
  it("actualiza las consultas automáticamente sin botones manuales", () => {
    const cliente = crearQueryClient();
    const opciones = cliente.getDefaultOptions().queries;

    expect(opciones?.refetchInterval).toBe(REFRESCO_AUTOMATICO);
    expect(opciones?.refetchOnWindowFocus).toBe(true);
    expect(opciones?.refetchOnReconnect).toBe(true);
    expect(opciones?.staleTime).toBe(0);
    cliente.clear();
  });
});
