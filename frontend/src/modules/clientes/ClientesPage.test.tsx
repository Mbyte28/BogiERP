import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  ConfigEdificio,
  DeudaGrupo,
  Departamento,
  Fiado,
  Torre,
} from "@/lib/clientes";
import ClientesPage from "./ClientesPage";

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

type Dimensiones = { torres: number; pisosPorTorre: number; deptosPorPiso: number };

function configuracion(configurado: boolean, dimensiones?: Dimensiones): ConfigEdificio {
  const torres = configurado ? (dimensiones?.torres ?? 1) : null;
  const pisos = configurado ? (dimensiones?.pisosPorTorre ?? 1) : null;
  const deptos = configurado ? (dimensiones?.deptosPorPiso ?? 2) : null;
  return {
    configurado,
    torres,
    pisosPorTorre: pisos,
    deptosPorPiso: deptos,
    totalDepartamentos: configurado ? (torres ?? 0) * (pisos ?? 0) * (deptos ?? 0) : 0,
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
  bloquearEdicion = false,
  torresIniciales = 1,
  pagoEliminado = false,
}: {
  configurado?: boolean;
  conFiado?: boolean;
  fallar?: boolean;
  bloquearEdicion?: boolean;
  torresIniciales?: number;
  pagoEliminado?: boolean;
} = {}) {
  const estado = {
    configurado,
    fiados: conFiado ? [fiadoInicial()] : [] as Fiado[],
    dimensiones: { torres: torresIniciales, pisosPorTorre: 1, deptosPorPiso: 2 },
  };
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
          estado.dimensiones = JSON.parse(String(init?.body)) as Dimensiones;
          return respuesta(configuracion(true, estado.dimensiones), 201);
        }
        if (metodo === "PUT") {
          if (bloquearEdicion) {
            return respuesta(
              { message: "No se puede eliminar: hay envíos activos en Torre 2 Departamento 101" },
              409,
            );
          }
          estado.dimensiones = JSON.parse(String(init?.body)) as Dimensiones;
          return respuesta(configuracion(true, estado.dimensiones));
        }
        return respuesta(configuracion(estado.configurado, estado.dimensiones));
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

      if (url.includes("/fiados/deudas")) {
        const nivel = new URL(url, "http://local").searchParams.get("nivel");
        return respuesta(deudas(estado.fiados, nivel));
      }
      const pago = url.match(/\/fiados\/(\d+)\/pagar/);
      if (pago && metodo === "PATCH") {
        if (pagoEliminado) {
          return respuesta(
            { message: "El departamento ya no existe; actualiza la lista y elige otro." },
            404,
          );
        }
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
  return screen.findByRole("button", { name: "Ver envíos de Torre 1 Departamento 101" });
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

    const grillaTorres = screen.getByRole("button", { name: "Ver torre 1" }).parentElement;
    expect(grillaTorres).toHaveClass("flex-wrap", "justify-center");
    expect(grillaTorres?.parentElement).toHaveClass("justify-center");

    fireEvent.click(screen.getByRole("button", { name: "Ver torre 1" }));
    expect(await screen.findByRole("button", { name: "Ver piso 1 de la torre 1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver piso 1 de la torre 1" }));
    expect(
      await screen.findByRole("button", { name: "Ver envíos de Torre 1 Departamento 101" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver envíos de Torre 1 Departamento 102" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/elige un cuadrado para continuar/)).not.toBeInTheDocument();

    const volver = screen.getByRole("button", { name: "Volver a pisos" });
    const revisar = screen.getByRole("button", { name: "Revisar envíos" });
    expect(volver.parentElement).toBe(revisar.parentElement);

    fireEvent.click(volver);
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

  it("muestra los envíos del departamento y permite marcarlos como pagados", async () => {
    const peticiones = simularApi();
    renderizar();

    fireEvent.click(await navegarAlDepartamento());

    const detalle = await screen.findByRole("dialog", { name: "Torre 1 Departamento 101" });
    expect(await within(detalle).findByText("Pan")).toBeInTheDocument();
    expect(within(detalle).getByText("Activo")).toBeInTheDocument();
    expect(within(detalle).queryByRole("button", { name: "Registrar fiado" })).not.toBeInTheDocument();
    expect(within(detalle).queryByRole("button", { name: "Registrar envío" })).not.toBeInTheDocument();

    fireEvent.click(within(detalle).getByRole("button", { name: "Marcar pagado" }));

    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog", { name: "Torre 1 Departamento 101" })).getByText("Pagado"),
      ).toBeInTheDocument(),
    );
    expect(
      peticiones.mock.calls.some(([url, init]) =>
        url.includes("/fiados/1/pagar") && init?.method === "PATCH",
      ),
    ).toBe(true);
    expect(
      peticiones.mock.calls.some(([url, init]) => url.endsWith("/fiados") && init?.method === "POST"),
    ).toBe(false);
    expect(await screen.findByText("Envío marcado como pagado.")).toBeInTheDocument();
  });

  it("vuelve al inicio si el departamento fue borrado desde otro dispositivo", async () => {
    simularApi({ pagoEliminado: true });
    renderizar();

    fireEvent.click(await navegarAlDepartamento());
    const detalle = await screen.findByRole("dialog", { name: "Torre 1 Departamento 101" });
    fireEvent.click(await within(detalle).findByRole("button", { name: "Marcar pagado" }));

    expect(await screen.findByRole("status")).toHaveTextContent("ya no existe");
    expect(await screen.findByRole("button", { name: "Ver torre 1" })).toBeInTheDocument();
  });

  it("revisa los envíos activos agrupados y permite pagar desde el panel", async () => {
    const peticiones = simularApi();
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Revisar envíos" }));
    const panel = await screen.findByRole("dialog", { name: "Revisar envíos" });
    expect(await within(panel).findByText("Torre 1")).toBeInTheDocument();
    expect(within(panel).getByText(/Torre 1 Departamento 101/)).toBeInTheDocument();
    expect(within(panel).getByText("Pan")).toBeInTheDocument();
    expect(
      peticiones.mock.calls.some(([url]) => url.includes("/fiados/deudas?nivel=edificio")),
    ).toBe(true);

    fireEvent.click(within(panel).getByRole("button", { name: "Marcar pagado" }));

    expect(await within(panel).findByText("No hay envíos activos.")).toBeInTheDocument();
    expect(within(panel).getByText("Envío marcado como pagado.")).toBeInTheDocument();
  });

  it("muestra estados vacíos cuando no hay envíos", async () => {
    simularApi({ conFiado: false });
    renderizar();

    fireEvent.click(await navegarAlDepartamento());

    const detalle = await screen.findByRole("dialog", { name: "Torre 1 Departamento 101" });
    expect(within(detalle).getByText("Al día")).toBeInTheDocument();
    expect(
      await within(detalle).findByText("Aún no hay envíos para este departamento."),
    ).toBeInTheDocument();

    fireEvent.click(within(detalle).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Revisar envíos" }));
    const panel = await screen.findByRole("dialog", { name: "Revisar envíos" });
    expect(await within(panel).findByText("No hay envíos activos.")).toBeInTheDocument();
  });

  it("muestra el error de la API", async () => {
    simularApi({ fallar: true });
    renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el edificio.");
  });

  it("usa iconos distintos para torres, pisos y departamentos", async () => {
    simularApi({ conFiado: false });
    renderizar();

    expect(await screen.findByRole("button", { name: "Ver torre 1" })).toBeInTheDocument();
    expect(document.querySelector("svg.lucide-building")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ver torre 1" }));
    expect(await screen.findByRole("button", { name: "Ver piso 1 de la torre 1" })).toBeInTheDocument();
    expect(document.querySelector("svg.lucide-door-stairwell")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ver piso 1 de la torre 1" }));
    expect(
      await screen.findByRole("button", { name: "Ver envíos de Torre 1 Departamento 101" }),
    ).toBeInTheDocument();
    expect(document.querySelector("svg.lucide-house")).not.toBeNull();
  });

  it("muestra la advertencia y permite editar la estructura de torres", async () => {
    const peticiones = simularApi({ conFiado: false });
    renderizar();

    await screen.findByRole("button", { name: "Ver torre 1" });
    fireEvent.click(screen.getByRole("button", { name: "Editar sistema de torres" }));

    const modal = await screen.findByRole("dialog", { name: "Editar sistema de torres" });
    expect(within(modal).getByText(/toda venta o envío registrado/)).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText("Torres"), { target: { value: "2" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      const llamada = peticiones.mock.calls.find(
        ([url, init]) => url.includes("/edificio/config") && init?.method === "PUT",
      );
      expect(llamada).toBeDefined();
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        torres: 2,
        pisosPorTorre: 1,
        deptosPorPiso: 2,
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Editar sistema de torres" })).not.toBeInTheDocument(),
    );
  });

  it("centra un aviso con los departamentos que impiden eliminar una torre", async () => {
    simularApi({ torresIniciales: 2, bloquearEdicion: true });
    renderizar();

    await screen.findByRole("button", { name: "Ver torre 1" });
    fireEvent.click(screen.getByRole("button", { name: "Editar sistema de torres" }));
    const modal = await screen.findByRole("dialog", { name: "Editar sistema de torres" });
    fireEvent.change(within(modal).getByLabelText("Torres"), { target: { value: "1" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

    const aviso = await screen.findByRole("alertdialog", { name: "No se puede eliminar" });
    expect(aviso).toHaveTextContent("Torre 2 Departamento 101");
    fireEvent.click(within(aviso).getByRole("button", { name: "Entendido" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
