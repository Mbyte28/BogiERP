import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  ConfigEdificio,
  DeudaGrupo,
  Departamento,
  Fiado,
  ProductoFiado,
  SolicitudFiado,
  Torre,
} from "@/lib/clientes";
import ClientesPage from "./ClientesPage";

const productos: ProductoFiado[] = [
  { id: 10, nombre: "Pan", tipoVenta: "UNIDAD", precioVenta: "5.00", stock: "20" },
];

function fiadoInicial(): Fiado {
  return {
    id: 1,
    departamentoId: 1,
    productoId: 10,
    nombreProducto: "Pan",
    tipoVenta: "UNIDAD",
    cantidad: "2",
    precioUnitario: "5.00",
    subtotal: "10.00",
    estado: "PENDIENTE",
    creadoEn: "2026-11-25T10:00:00Z",
    pagadoEn: null,
  };
}

function configuracion(configurado: boolean): ConfigEdificio {
  return {
    configurado,
    torres: configurado ? 1 : null,
    pisosPorTorre: configurado ? 1 : null,
    deptosPorPiso: configurado ? 2 : null,
    totalDepartamentos: configurado ? 2 : 0,
  };
}

function departamentos(fiados: Fiado[]): Departamento[] {
  const conDeuda = fiados.some((fiado) => fiado.estado === "PENDIENTE");
  return [101, 102].map((numero, indice) => ({
    id: indice + 1,
    torre: 1,
    piso: 1,
    numero,
    etiqueta: `Torre 1 Departamento ${numero}`,
    conDeuda: indice === 0 && conDeuda,
    fiadosPendientes: indice === 0 ? fiados.filter((f) => f.estado === "PENDIENTE").length : 0,
    totalPendiente: indice === 0 ? "10.00" : "0.00",
  }));
}

function torres(fiados: Fiado[]): Torre[] {
  const conDeuda = fiados.some((fiado) => fiado.estado === "PENDIENTE") ? 1 : 0;
  return [{ torre: 1, pisos: 1, departamentos: 2, departamentosConDeuda: conDeuda, totalPendiente: "10.00" }];
}

function deudas(fiados: Fiado[], nivel: string | null): DeudaGrupo[] {
  const pendientes = fiados.filter((fiado) => fiado.estado === "PENDIENTE");
  if (!pendientes.length) return [];
  const etiqueta = nivel === "piso" ? "Torre 1 Departamento 101" : nivel === "torre" ? "Piso 1" : "Torre 1";
  return [
    {
      etiqueta,
      total: "10.00",
      cantidad: pendientes.length,
      departamentos: [
        {
          departamentoId: 1,
          etiqueta: "Torre 1 Departamento 101",
          total: "10.00",
          cantidad: pendientes.length,
          fiados: pendientes,
        },
      ],
    },
  ];
}

function respuesta(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function simularApi({
  configurado = true,
  conFiado = true,
  fallar = false,
}: { configurado?: boolean; conFiado?: boolean; fallar?: boolean } = {}) {
  const estado = { configurado, fiados: conFiado ? [fiadoInicial()] : [] as Fiado[] };
  const peticiones = vi.fn<(url: string, init?: RequestInit) => void>();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      const metodo = init?.method ?? "GET";
      peticiones(url, init);

      if (fallar) return respuesta({ message: "No se pudo cargar el edificio." }, 500);

      if (url.includes("/edificio/config")) {
        if (metodo === "POST") {
          estado.configurado = true;
          return respuesta(configuracion(true), 201);
        }
        return respuesta(configuracion(estado.configurado));
      }
      if (url.includes("/edificio/torres/1/pisos/1/departamentos")) {
        return respuesta(departamentos(estado.fiados));
      }
      if (url.includes("/edificio/torres/1/pisos")) {
        return respuesta([
          {
            piso: 1,
            departamentos: 2,
            departamentosConDeuda: estado.fiados.some((f) => f.estado === "PENDIENTE") ? 1 : 0,
            totalPendiente: "10.00",
          },
        ]);
      }
      if (url.includes("/edificio/torres")) return respuesta(torres(estado.fiados));

      if (url.includes("/fiados/productos")) return respuesta(productos);
      if (url.includes("/fiados/deudas")) {
        const nivel = new URL(url, "http://local").searchParams.get("nivel");
        return respuesta(deudas(estado.fiados, nivel));
      }
      const pago = url.match(/\/fiados\/(\d+)\/pagar/);
      if (pago && metodo === "PATCH") {
        const fiado = estado.fiados.find((item) => item.id === Number(pago[1]));
        if (!fiado) return respuesta({ message: "Fiado no encontrado" }, 404);
        if (fiado.estado === "PAGADO") {
          return respuesta({ message: "El fiado ya está pagado" }, 409);
        }
        fiado.estado = "PAGADO";
        fiado.pagadoEn = "2026-11-25T11:00:00Z";
        return respuesta(fiado);
      }
      if (url.includes("/departamentos/") && url.endsWith("/fiados")) {
        return respuesta(estado.fiados.filter((fiado) => fiado.departamentoId === 1));
      }
      if (url.endsWith("/fiados") && metodo === "POST") {
        const datos = JSON.parse(String(init?.body)) as SolicitudFiado;
        const creados = datos.items.map((item, indice) => {
          const producto = productos.find((p) => p.id === item.productoId)!;
          const fiado: Fiado = {
            id: estado.fiados.length + indice + 1,
            departamentoId: datos.departamentoId,
            productoId: item.productoId,
            nombreProducto: producto.nombre,
            tipoVenta: producto.tipoVenta,
            cantidad: String(item.cantidad),
            precioUnitario: producto.precioVenta,
            subtotal: String(item.cantidad * Number(producto.precioVenta)),
            estado: "PENDIENTE",
            creadoEn: "2026-11-25T10:30:00Z",
            pagadoEn: null,
          };
          estado.fiados.push(fiado);
          return fiado;
        });
        return respuesta(creados, 201);
      }
      return respuesta(null, 404);
    }),
  );
  return peticiones;
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ClientesPage />
    </QueryClientProvider>,
  );
}

async function navegarAlDepartamento() {
  fireEvent.click(await screen.findByRole("button", { name: "Ver torre 1" }));
  fireEvent.click(await screen.findByRole("button", { name: "Ver piso 1 de la torre 1" }));
  return screen.findByRole("button", { name: "Ver fiados de Torre 1 Departamento 101" });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClientesPage", () => {
  it("configura el edificio una sola vez y navega por torre, piso y departamento", async () => {
    const peticiones = simularApi({ configurado: false, conFiado: false });
    renderizar();

    fireEvent.change(await screen.findByLabelText("Torres"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Pisos por torre"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Departamentos por piso"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Configurar edificio" }));

    expect(await screen.findByRole("button", { name: "Ver torre 1" })).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url, init]) =>
        url.includes("/edificio/config") && init?.method === "POST",
      ),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Ver torre 1" }));
    expect(await screen.findByRole("button", { name: "Ver piso 1 de la torre 1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver piso 1 de la torre 1" }));
    expect(
      await screen.findByRole("button", { name: "Ver fiados de Torre 1 Departamento 101" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver fiados de Torre 1 Departamento 102" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a pisos" }));
    expect(await screen.findByRole("button", { name: "Ver piso 1 de la torre 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a torres" }));
    expect(await screen.findByRole("button", { name: "Ver torre 1" })).toBeInTheDocument();
  });

  it("valida la configuración antes de enviarla", async () => {
    simularApi({ configurado: false });
    renderizar();

    fireEvent.change(await screen.findByLabelText("Departamentos por piso"), {
      target: { value: "100" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Configurar edificio" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("entre 1 y 99");
    expect(screen.queryByRole("button", { name: "Ver torre 1" })).not.toBeInTheDocument();
  });

  it("registra un fiado y marca los pendientes como pagados", async () => {
    const peticiones = simularApi();
    renderizar();

    const departamento = await navegarAlDepartamento();
    fireEvent.click(departamento);

    const detalle = await screen.findByRole("dialog", { name: "Torre 1 Departamento 101" });
    expect(await within(detalle).findByText("Pan")).toBeInTheDocument();
    expect(within(detalle).getByText("Pendiente")).toBeInTheDocument();

    fireEvent.click(within(detalle).getByRole("button", { name: "Registrar fiado" }));
    const formulario = await screen.findByRole("dialog", { name: "Registrar fiado" });
    await within(formulario).findByRole("option", { name: /Pan/ });
    fireEvent.change(within(formulario).getByLabelText("Producto"), {
      target: { value: "10" },
    });
    fireEvent.change(within(formulario).getByLabelText("Cantidad"), {
      target: { value: "1" },
    });
    fireEvent.click(within(formulario).getByRole("button", { name: "Agregar producto" }));
    expect(await within(formulario).findByText(/Pan · 1/)).toBeInTheDocument();
    fireEvent.click(within(formulario).getByRole("button", { name: "Guardar fiado" }));

    const actualizado = await screen.findByRole("dialog", { name: "Torre 1 Departamento 101" });
    await waitFor(() => expect(within(actualizado).getAllByText("Pan")).toHaveLength(2));
    expect(within(actualizado).getByText("Fiado registrado.")).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url, init]) => url.endsWith("/fiados") && init?.method === "POST"),
    ).toBe(true);

    const pagar = (await within(actualizado).findAllByRole("button", { name: "Marcar pagado" }))[0];
    fireEvent.click(pagar);

    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog", { name: "Torre 1 Departamento 101" })).getAllByText("Pagado"),
      ).toHaveLength(1),
    );
    expect(
      peticiones.mock.calls.some(([url, init]) =>
        url.includes("/fiados/1/pagar") && init?.method === "PATCH",
      ),
    ).toBe(true);
  });

  it("revisa las deudas agrupadas y permite pagar desde el panel", async () => {
    const peticiones = simularApi();
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Revisar fiados" }));
    const panel = await screen.findByRole("dialog", { name: "Revisar fiados" });
    expect(await within(panel).findByText("Torre 1")).toBeInTheDocument();
    expect(within(panel).getByText(/Torre 1 Departamento 101/)).toBeInTheDocument();
    expect(within(panel).getByText("Pan")).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url]) => url.includes("/fiados/deudas?nivel=edificio")),
    ).toBe(true);

    fireEvent.click(within(panel).getByRole("button", { name: "Marcar pagado" }));

    expect(await within(panel).findByText("No hay fiados pendientes.")).toBeInTheDocument();
    expect(within(panel).getByText("Fiado marcado como pagado.")).toBeInTheDocument();
  });

  it("muestra estados vacíos cuando no hay fiados", async () => {
    simularApi({ conFiado: false });
    renderizar();

    const departamento = await navegarAlDepartamento();
    fireEvent.click(departamento);

    const detalle = await screen.findByRole("dialog", { name: "Torre 1 Departamento 101" });
    expect(within(detalle).getByText("Al día")).toBeInTheDocument();
    expect(
      await within(detalle).findByText("Aún no hay fiados para este departamento."),
    ).toBeInTheDocument();

    fireEvent.click(within(detalle).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Revisar fiados" }));
    const panel = await screen.findByRole("dialog", { name: "Revisar fiados" });
    expect(await within(panel).findByText("No hay fiados pendientes.")).toBeInTheDocument();
  });

  it("muestra el error de la API", async () => {
    simularApi({ fallar: true });
    renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el edificio.");
  });
});
