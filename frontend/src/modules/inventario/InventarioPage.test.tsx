import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Categoria, Merma, Producto, ProductoPage } from "@/lib/inventario";
import type { PaginaCatalogo } from "@/lib/venta";
import InventarioPage from "./InventarioPage";

const categorias: Categoria[] = [
  { id: 3, nombre: "Carnes", icono: "beef", productos: 1 },
  { id: 4, nombre: "Lácteos", icono: "milk", productos: 1 },
];

const productos: Producto[] = [
  {
    id: 1,
    nombre: "Leche entera",
    categoriaId: 4,
    categoriaNombre: "Lácteos",
    categoriaIcono: "milk",
    imagen: "leche.jpg",
    tipoVenta: "UNIDAD",
    precioVenta: "5.50",
    costoActual: null,
    stock: "12",
    fechaVencimiento: "2026-11-28",
    activo: true,
    sinCosto: true,
    diasVencimiento: 3,
    creadoEn: "2026-11-20T10:00:00Z",
  },
  {
    id: 2,
    nombre: "Pollo fresco",
    categoriaId: 3,
    categoriaNombre: "Carnes",
    categoriaIcono: "beef",
    imagen: null,
    tipoVenta: "KILO",
    precioVenta: "12.00",
    costoActual: "9.00",
    stock: "4.500",
    fechaVencimiento: null,
    activo: true,
    sinCosto: false,
    diasVencimiento: null,
    creadoEn: "2026-11-21T10:00:00Z",
  },
];

const pagina: ProductoPage = { items: productos, total: 2, page: 0, size: 25 };

const catalogo: PaginaCatalogo = {
  items: [
    {
      id: 1,
      nombre: "Leche entera",
      categoriaNombre: "Lácteos",
      categoriaIcono: "milk",
      imagen: null,
      tipoVenta: "UNIDAD",
      precioVenta: "5.50",
      stock: "12",
      sinCosto: true,
      diasVencimiento: 3,
      cantidadVendida: 12,
      masVendido: true,
      fechaVencimiento: "2026-11-28",
    },
    {
      id: 2,
      nombre: "Pollo fresco",
      categoriaNombre: "Carnes",
      categoriaIcono: "beef",
      imagen: null,
      tipoVenta: "KILO",
      precioVenta: "12.00",
      stock: "4.500",
      sinCosto: false,
      diasVencimiento: null,
      cantidadVendida: "4.5",
      masVendido: false,
      fechaVencimiento: null,
    },
  ],
  total: 2,
  page: 0,
  size: 25,
};

const mermas: Merma[] = [
  {
    id: 10,
    productoId: 1,
    productoNombre: "Leche entera",
    cantidad: "2",
    costoUnitario: null,
    total: "0.00",
    motivo: "VENCIMIENTO",
    creadoEn: "2026-11-24T10:00:00Z",
    usuarioId: 1,
  },
];

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <InventarioPage />
    </QueryClientProvider>,
  );
}

function simularApi(peticiones = vi.fn()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      peticiones(String(entrada), init);
      const url = String(entrada);
      const metodo = init?.method ?? "GET";

      if (url.includes("/categorias") && metodo === "POST") {
        return respuesta({ id: 5, nombre: "Panadería", icono: "package", productos: 0 }, 201);
      }
      if (url.includes("/categorias")) return respuesta(categorias);
      if (url.includes("/catalogo")) return respuesta(catalogo);

      if (url.includes("/productos/ingresos") && metodo === "POST") {
        return respuesta(productos);
      }
      if (url.includes("/productos/") && url.endsWith("/imagen") && metodo === "DELETE") {
        return respuesta({ ...productos[0], imagen: null });
      }
      if (url.includes("/productos") && metodo === "POST") {
        return respuesta({ ...productos[0], id: 3, nombre: "Nueva gaseosa" }, 201);
      }
      if (url.includes("/productos")) return respuesta(pagina);

      if (url.includes("/mermas") && metodo === "POST") {
        return respuesta({ ...mermas[0], id: 11, cantidad: "1" }, 201);
      }
      if (url.includes("/mermas")) return respuesta(mermas);

      return respuesta(null, 404);
    }),
  );
  return peticiones;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InventarioPage", () => {
  it("muestra productos, categorías, tipo de venta y alertas", async () => {
    simularApi();
    renderizar();

    expect(await screen.findAllByText("Leche entera")).not.toHaveLength(0);
    expect(screen.getAllByText("Pollo fresco").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin costo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vence en 3 d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kilo").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Lácteos" })).toBeInTheDocument();
    expect(screen.getAllByText(/VENCIMIENTO/).length).toBeGreaterThan(0);
  });

  it("filtra por búsqueda y categoría enviando los parámetros al backend", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "leche" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Carnes" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(([url]) =>
        url.includes("/productos?q=leche&categoriaId=3"),
      );
      expect(llamada).toBeDefined();
    });
  });

  it("no permite ajustar stock ni cambiar costos desde la tabla de productos", async () => {
    simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    expect(
      screen.queryByRole("button", { name: "Quitar stock de Leche entera" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Agregar stock a Leche entera" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar costo de Leche entera" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Costo" })).not.toBeInTheDocument();
  });

  it("registra varios productos del catálogo con costo opcional y permite quitar líneas", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Registrar inventario" }));
    const dialogo = await screen.findByRole("dialog", { name: "Registrar inventario" });

    fireEvent.change(within(dialogo).getByLabelText("Buscar productos"), {
      target: { value: "pollo" },
    });
    await waitFor(() => {
      expect(
        peticiones.mock.calls.some(([url]) => url.includes("/catalogo?q=pollo")),
      ).toBe(true);
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Carnes" }));
    await waitFor(() => {
      expect(
        peticiones.mock.calls.some(([url]) => url.includes("/catalogo?categoriaId=3")),
      ).toBe(true);
    });

    fireEvent.click(within(dialogo).getByRole("button", { name: "Seleccionar Leche entera" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Seleccionar Pollo fresco" }));
    expect(within(dialogo).getByText("2 productos en este registro")).toBeInTheDocument();

    fireEvent.change(
      within(dialogo).getByLabelText("Cantidad a ingresar de Leche entera"),
      { target: { value: "5" } },
    );
    fireEvent.change(within(dialogo).getByLabelText("Costo de Leche entera (opcional)"), {
      target: { value: "4.5" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Cantidad a ingresar de Pollo fresco"), {
      target: { value: "2" },
    });

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Quitar Pollo fresco del registro" }),
    );
    expect(
      within(dialogo).queryByLabelText("Cantidad a ingresar de Pollo fresco"),
    ).not.toBeInTheDocument();
    expect(within(dialogo).getByText("1 producto en este registro")).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar inventario" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/productos/ingresos") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        items: [{ productoId: 1, cantidad: 5, costo: 4.5 }],
      });
    });
    expect(await within(dialogo).findByText("Inventario registrado.")).toBeInTheDocument();
  });

  it("no envía el registro si falta la cantidad o el costo es negativo", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Registrar inventario" }));
    const dialogo = await screen.findByRole("dialog", { name: "Registrar inventario" });

    fireEvent.click(
      await within(dialogo).findByRole("button", { name: "Seleccionar Leche entera" }),
    );
    const enviar = within(dialogo).getByRole("button", { name: "Registrar inventario" });
    fireEvent.click(enviar);
    expect(
      await within(dialogo).findByText("Ingresa una cantidad mayor a cero para Leche entera."),
    ).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url]) => url.includes("/productos/ingresos")),
    ).toBe(false);

    fireEvent.change(within(dialogo).getByLabelText("Cantidad a ingresar de Leche entera"), {
      target: { value: "3" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Costo de Leche entera (opcional)"), {
      target: { value: "-1" },
    });
    fireEvent.click(enviar);
    expect(
      await within(dialogo).findByText("El costo de Leche entera no es válido."),
    ).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url]) => url.includes("/productos/ingresos")),
    ).toBe(false);
  });

  it("no muestra la descripción dentro del modal de registrar inventario", async () => {
    simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Registrar inventario" }));
    const dialogo = await screen.findByRole("dialog", { name: "Registrar inventario" });

    expect(within(dialogo).queryByText(/Elige uno o varios productos/)).not.toBeInTheDocument();
    expect(
      within(dialogo).queryByRole("heading", { level: 3, name: "Registrar inventario" }),
    ).not.toBeInTheDocument();
  });

  it("muestra la imagen actual y obliga a eliminarla antes de subir otra", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagen de Leche entera" })[0]);
    const dialogo = await screen.findByRole("dialog", { name: "Imagen de Leche entera" });

    expect(within(dialogo).getByRole("img", { name: "Imagen de Leche entera" })).toHaveAttribute(
      "src",
      "/uploads/leche.jpg",
    );
    expect(
      within(dialogo).queryByRole("button", { name: "Agregar imagen" }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar imagen" }));
    expect(await within(dialogo).findByText("Este producto no tiene imagen.")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        peticiones.mock.calls.some(
          ([url, init]) => url.includes("/productos/1/imagen") && init?.method === "DELETE",
        ),
      ).toBe(true);
    });

    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar imagen" }));
    fireEvent.change(screen.getByLabelText("Seleccionar imagen del producto"), {
      target: { files: [new File(["x"], "nueva.png", { type: "image/png" })] },
    });
    await waitFor(() => {
      expect(
        peticiones.mock.calls.some(
          ([url, init]) => url.includes("/productos/1/imagen") && init?.method === "POST",
        ),
      ).toBe(true);
    });
  });

  it("abre el selector de archivos directamente si el producto no tiene imagen", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    const entrada = screen.getByLabelText("Seleccionar imagen del producto") as HTMLInputElement;
    const abrir = vi.spyOn(entrada, "click").mockImplementation(() => {});

    fireEvent.click(screen.getAllByRole("button", { name: "Agregar imagen de Pollo fresco" })[0]);
    expect(abrir).toHaveBeenCalled();

    fireEvent.change(entrada, {
      target: { files: [new File(["x"], "pollo.png", { type: "image/png" })] },
    });
    await waitFor(() => {
      expect(
        peticiones.mock.calls.some(
          ([url, init]) => url.includes("/productos/2/imagen") && init?.method === "POST",
        ),
      ).toBe(true);
    });
  });

  it("crea un producto con los datos del formulario", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));

    const dialogo = await screen.findByRole("dialog", { name: "Producto" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "Nueva gaseosa" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Categoría"), {
      target: { value: "4" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Tipo de venta"), {
      target: { value: "UNIDAD" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Precio de venta"), {
      target: { value: "7.50" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Stock (unidades)"), {
      target: { value: "20" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear producto" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/productos") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      const cuerpo = JSON.parse(String(llamada?.[1]?.body));
      expect(cuerpo.nombre).toBe("Nueva gaseosa");
      expect(cuerpo.categoriaId).toBe(4);
      expect(cuerpo.precioVenta).toBe(7.5);
      expect(cuerpo.stock).toBe(20);
      expect(cuerpo.costoActual).toBeNull();
    });
  });

  it("al editar un producto oculta el costo, deja el stock solo lectura y no envía stock ni costo", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar Leche entera" })[0]);
    const dialogo = await screen.findByRole("dialog", { name: "Producto" });

    expect(within(dialogo).getByLabelText("Stock (unidades)")).toHaveAttribute("readonly");
    expect(within(dialogo).queryByLabelText("Costo actual (opcional)")).not.toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "Leche entera light" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/productos/1") && init?.method === "PUT",
      );
      expect(llamada).toBeDefined();
      const cuerpo = JSON.parse(String(llamada?.[1]?.body));
      expect(cuerpo.nombre).toBe("Leche entera light");
      expect(cuerpo.stock).toBeUndefined();
      expect(cuerpo.costoActual).toBeUndefined();
    });
  });

  it("registra una merma desde las acciones del producto", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Registrar merma de Leche entera" })[0],
    );

    const dialogo = await screen.findByRole("dialog", { name: "Registrar merma" });
    fireEvent.change(within(dialogo).getByLabelText("Cantidad (unidades)"), {
      target: { value: "1" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Motivo"), {
      target: { value: "ROTURA" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar merma" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/mermas") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      const cuerpo = JSON.parse(String(llamada?.[1]?.body));
      expect(cuerpo.productoId).toBe(1);
      expect(cuerpo.cantidad).toBe(1);
      expect(cuerpo.motivo).toBe("ROTURA");
    });
  });

  it("agrega una categoría desde el panel de gestión", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Gestionar categorías" }));

    const dialogo = await screen.findByRole("dialog", { name: "Gestionar categorías" });
    fireEvent.change(within(dialogo).getByLabelText("Nueva categoría"), {
      target: { value: "Panadería" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar categoría" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/categorias") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      expect(JSON.parse(String(llamada?.[1]?.body)).nombre).toBe("Panadería");
    });
  });

  it("muestra todos los iconos y cierra el panel de categorías con la X", async () => {
    simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Gestionar categorías" }));

    const dialogo = await screen.findByRole("dialog", { name: "Gestionar categorías" });
    const iconoCarne = within(dialogo).getByRole("button", { name: "Icono Carne" });
    expect(iconoCarne).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: "Icono Gaseosa" })).toBeInTheDocument();
    expect(dialogo).toHaveClass("sm:w-[min(100%,40rem)]");
    expect(iconoCarne).toHaveTextContent("");
    expect(iconoCarne.querySelector("svg")).toHaveAttribute("width", "24");

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Gestionar categorías" }),
      ).not.toBeInTheDocument();
    });
  });

  it("convierte el costo total de un producto de kilo a costo por kilo", async () => {
    const peticiones = simularApi();
    renderizar();

    await screen.findAllByText("Leche entera");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));

    const dialogo = await screen.findByRole("dialog", { name: "Producto" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "Carne de prueba" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Tipo de venta"), {
      target: { value: "KILO" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Precio de venta"), {
      target: { value: "20" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Stock (kilos)"), {
      target: { value: "10" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Costo total del stock (opcional)"), {
      target: { value: "10" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear producto" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/productos") && init?.method === "POST",
      );
      expect(llamada).toBeDefined();
      const cuerpo = JSON.parse(String(llamada?.[1]?.body));
      expect(cuerpo.tipoVenta).toBe("KILO");
      expect(cuerpo.stock).toBe(10);
      expect(cuerpo.costoActual).toBe(1);
    });
  });
});
