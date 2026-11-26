import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Select } from "./select";

describe("Select", () => {
  it("abre un menú estilizado y permite elegir una opción", () => {
    const onChange = vi.fn();
    render(
      <Select
        ariaLabel="Periodo"
        value="meses:6"
        onChange={onChange}
        opciones={[
          { valor: "meses:6", etiqueta: "Últimos 6 meses" },
          { valor: "anio:2026", etiqueta: "Año 2026" },
        ]}
      />,
    );

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir periodo" }));

    const menu = screen.getByRole("listbox", { name: "Periodo" });
    expect(within(menu).getAllByRole("option")).toHaveLength(2);
    fireEvent.click(within(menu).getByRole("option", { name: "Año 2026" }));

    expect(onChange).toHaveBeenCalledWith("anio:2026");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
