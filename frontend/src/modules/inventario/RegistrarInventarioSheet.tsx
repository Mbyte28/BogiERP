import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { cantidad, inventarioApi } from "@/lib/inventario";
import type { ItemCatalogo } from "@/lib/venta";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Campo, ESTILO_CAMPO } from "./ProductoForm";
import { CatalogoProductos } from "@/modules/venta/CatalogoProductos";

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
  const [seleccionado, setSeleccionado] = useState<ItemCatalogo | null>(null);
  const [valor, setValor] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const ingreso = useMutation({
    mutationFn: ({ id, cantidad: ingreso }: { id: number; cantidad: number }) =>
      inventarioApi.registrarIngreso(id, ingreso),
    onSuccess: async (producto) => {
      setSeleccionado((actual) =>
        actual?.id === producto.id ? { ...actual, stock: producto.stock } : actual,
      );
      setValor("");
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
    setSeleccionado(producto);
    setValor("");
    setMensaje(null);
    setConfirmado(false);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    setConfirmado(false);
    if (!seleccionado) {
      setMensaje("Elige un producto del catálogo.");
      return;
    }
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      setMensaje("Ingresa una cantidad mayor a cero.");
      return;
    }
    if (seleccionado.tipoVenta === "UNIDAD" && !Number.isInteger(numero)) {
      setMensaje("Los productos por unidad solo admiten cantidades enteras.");
      return;
    }
    ingreso.mutate({ id: seleccionado.id, cantidad: numero });
  }

  function cerrar() {
    setSeleccionado(null);
    setValor("");
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
            Elige un producto del catálogo e indica cuánto ingresó. Se sumará a su stock actual.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <CatalogoProductos
            onSeleccionar={alSeleccionar}
            textoBoton="Seleccionar"
            deshabilitarSinStock={false}
            seleccionadoId={seleccionado?.id ?? null}
          />
        </div>

        {seleccionado ? (
          <form onSubmit={alEnviar} className="space-y-3 border-t border-line pt-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-ink-soft">
                Producto seleccionado
              </p>
              <p className="truncate text-sm font-bold text-ink">{seleccionado.nombre}</p>
              <p className="text-xs text-ink-soft">
                Stock actual: {cantidad(seleccionado.stock)} {unidad(seleccionado)}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Campo id="cantidad-ingreso" label="Cantidad a ingresar" className="sm:flex-1">
                <input
                  id="cantidad-ingreso"
                  type="number"
                  inputMode="decimal"
                  min={seleccionado.tipoVenta === "KILO" ? "0.001" : "1"}
                  step={seleccionado.tipoVenta === "KILO" ? "0.001" : "1"}
                  value={valor}
                  onChange={(evento) => {
                    setValor(evento.target.value);
                    setMensaje(null);
                    setConfirmado(false);
                  }}
                  placeholder={unidad(seleccionado)}
                  className={ESTILO_CAMPO}
                />
              </Campo>
              <div className="flex gap-2 sm:shrink-0">
                <Button type="button" variant="outline" className="h-12 flex-1 sm:flex-none" onClick={cerrar}>
                  Cancelar
                </Button>
                <Button type="submit" className="h-12 flex-1 sm:flex-none" disabled={ingreso.isPending}>
                  {ingreso.isPending ? "Registrando…" : "Registrar inventario"}
                </Button>
              </div>
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
          </form>
        ) : (
          <p className="border-t border-line pt-4 text-sm text-ink-soft">
            Selecciona un producto para registrar el ingreso.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
