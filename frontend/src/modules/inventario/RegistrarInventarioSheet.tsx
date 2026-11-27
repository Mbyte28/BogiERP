import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import {
  cantidad,
  inventarioApi,
  type LineaInventario,
} from "@/lib/inventario";
import type { ItemCatalogo } from "@/lib/venta";
import { CatalogoProductos } from "@/modules/venta/CatalogoProductos";
import { Campo, ESTILO_CAMPO } from "./ProductoForm";

interface LineaBorrador {
  producto: ItemCatalogo;
  cantidad: string;
  costo: string;
}

function unidad(producto: ItemCatalogo): string {
  return producto.tipoVenta === "KILO" ? "kg" : "uni";
}

export function RegistrarInventarioSheet({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const cliente = useQueryClient();
  const [lineas, setLineas] = useState<LineaBorrador[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const registro = useMutation({
    mutationFn: (items: LineaInventario[]) => inventarioApi.registrarInventario(items),
    onSuccess: async () => {
      setLineas([]);
      setMensaje(null);
      setConfirmado(true);
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["catalogo"] }),
        cliente.invalidateQueries({ queryKey: ["productos"] }),
      ]);
    },
    onError: async (fallo: Error) => {
      setConfirmado(false);
      setMensaje(fallo.message);
      if (fallo instanceof ApiError && (fallo.status === 404 || fallo.status === 409)) {
        await Promise.all([
          cliente.invalidateQueries({ queryKey: ["catalogo"] }),
          cliente.invalidateQueries({ queryKey: ["productos"] }),
        ]);
      }
    },
  });

  function alSeleccionar(producto: ItemCatalogo) {
    setLineas((actuales) =>
      actuales.some((linea) => linea.producto.id === producto.id)
        ? actuales
        : [...actuales, { producto, cantidad: "", costo: "" }],
    );
    setMensaje(null);
    setConfirmado(false);
  }

  function cambiarCampo(id: number, campo: "cantidad" | "costo", valor: string) {
    setLineas((actuales) =>
      actuales.map((linea) =>
        linea.producto.id === id ? { ...linea, [campo]: valor } : linea,
      ),
    );
    setMensaje(null);
    setConfirmado(false);
  }

  function quitar(id: number) {
    setLineas((actuales) => actuales.filter((linea) => linea.producto.id !== id));
    setMensaje(null);
    setConfirmado(false);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    setConfirmado(false);
    if (!lineas.length) {
      setMensaje("Elige al menos un producto del catálogo.");
      return;
    }

    const items: LineaInventario[] = [];
    for (const linea of lineas) {
      const numero = Number(linea.cantidad.replace(",", "."));
      if (!numero || !Number.isFinite(numero) || numero <= 0) {
        setMensaje(`Ingresa una cantidad mayor a cero para ${linea.producto.nombre}.`);
        return;
      }
      if (linea.producto.tipoVenta === "UNIDAD" && !Number.isInteger(numero)) {
        setMensaje(
          `${linea.producto.nombre} se maneja por unidad: la cantidad debe ser entera.`,
        );
        return;
      }
      const textoCosto = linea.costo.trim();
      let costo: number | null = null;
      if (textoCosto) {
        costo = Number(textoCosto.replace(",", "."));
        if (!Number.isFinite(costo) || costo < 0) {
          setMensaje(`El costo de ${linea.producto.nombre} no es válido.`);
          return;
        }
      }
      items.push({ productoId: linea.producto.id, cantidad: numero, costo });
    }
    registro.mutate(items);
  }

  function cerrar() {
    setLineas([]);
    setMensaje(null);
    setConfirmado(false);
    onCerrar();
  }

  return (
    <Sheet open={abierto} onOpenChange={(estado) => !estado && cerrar()}>
      <SheetContent
        side="center"
        title="Registrar inventario"
        className="w-[min(96vw,960px)] max-h-[92dvh] gap-4 overflow-hidden p-4 sm:p-5"
      >
        <div className="pr-12">
          <h3 className="text-lg font-bold text-ink">Registrar inventario</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Elige uno o varios productos del catálogo e indica cuánto ingresó. El costo es opcional
            y, si lo indicas, reemplaza el costo vigente del producto.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <CatalogoProductos
            onSeleccionar={alSeleccionar}
            textoBoton="Seleccionar"
            deshabilitarSinStock={false}
            seleccionadosIds={lineas.map((linea) => linea.producto.id)}
          />
        </div>

        <form onSubmit={alEnviar} className="shrink-0 space-y-3 border-t border-line pt-4">
          <div className="max-h-[34dvh] min-h-16 overflow-y-auto pr-1">
            {lineas.length ? (
              <ul className="space-y-3">
                {lineas.map((linea) => (
                  <li
                    key={linea.producto.id}
                    className="rounded-xl border border-line bg-app p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">
                          {linea.producto.nombre}
                        </p>
                        <p className="text-xs text-ink-soft">
                          Stock actual: {cantidad(linea.producto.stock)} {unidad(linea.producto)}
                          {linea.producto.sinCosto ? " · Sin costo registrado" : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar ${linea.producto.nombre} del registro`}
                        onClick={() => quitar(linea.producto.id)}
                      >
                        <X />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Campo id={`cantidad-${linea.producto.id}`} label="Cantidad a ingresar">
                        <input
                          id={`cantidad-${linea.producto.id}`}
                          aria-label={`Cantidad a ingresar de ${linea.producto.nombre}`}
                          type="number"
                          inputMode="decimal"
                          value={linea.cantidad}
                          onChange={(evento) =>
                            cambiarCampo(linea.producto.id, "cantidad", evento.target.value)
                          }
                          placeholder={unidad(linea.producto)}
                          className={ESTILO_CAMPO}
                        />
                      </Campo>
                      <Campo
                        id={`costo-${linea.producto.id}`}
                        label={linea.producto.tipoVenta === "KILO" ? "Costo por kg (opcional)" : "Costo por unidad (opcional)"}
                      >
                        <input
                          id={`costo-${linea.producto.id}`}
                          aria-label={`Costo de ${linea.producto.nombre} (opcional)`}
                          type="number"
                          inputMode="decimal"
                          value={linea.costo}
                          onChange={(evento) =>
                            cambiarCampo(linea.producto.id, "costo", evento.target.value)
                          }
                          placeholder="Sin cambio"
                          className={ESTILO_CAMPO}
                        />
                      </Campo>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-soft">
                Selecciona productos del catálogo para armar este registro.
              </p>
            )}
          </div>

          {mensaje && (
            <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
              {mensaje}
            </p>
          )}
          {confirmado && (
            <p role="status" className="rounded-field bg-success/15 px-4 py-3 text-sm text-[#3d8f83]">
              Inventario registrado.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              {lineas.length} {lineas.length === 1 ? "producto" : "productos"} en este registro
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-12 flex-1 sm:flex-none" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-12 flex-1 sm:flex-none"
                disabled={registro.isPending || lineas.length === 0}
              >
                {registro.isPending ? "Registrando…" : "Registrar inventario"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
