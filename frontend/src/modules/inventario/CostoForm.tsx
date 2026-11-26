import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  cantidad,
  costoPorKilo,
  costoTotal,
  inventarioApi,
  type Producto,
} from "@/lib/inventario";
import { Campo, ESTILO_CAMPO } from "./ProductoForm";

export function CostoForm({
  producto,
  onGuardado,
  onCancelar,
}: {
  producto: Producto;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const cliente = useQueryClient();
  const [costo, setCosto] = useState(costoTotal(producto));
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (valor: number | null) => inventarioApi.actualizarCosto(producto.id, valor),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["productos"] });
      onGuardado();
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    if (costo === "") {
      await guardar.mutateAsync(null);
      return;
    }

    const valor = Number(costo);
    try {
      const guardado = producto.tipoVenta === "KILO"
        ? costoPorKilo(valor, Number(producto.stock))
        : valor;
      await guardar.mutateAsync(guardado);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo registrar el costo");
    }
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-1 flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Costo del producto</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {producto.nombre}. El cambio queda registrado en el historial.
        </p>
      </div>

      <Campo
        id="costo-producto"
        label={
          producto.tipoVenta === "KILO"
            ? "Costo total del stock (dejar vacío si no tiene)"
            : "Costo actual (dejar vacío si no tiene)"
        }
      >
        <input
          id="costo-producto"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={costo}
          onChange={(evento) => setCosto(evento.target.value)}
          className={ESTILO_CAMPO}
          placeholder="Sin costo"
        />
        {producto.tipoVenta === "KILO" && (
          <p className="mt-1 text-xs text-ink-soft">
            El total se divide entre {cantidad(producto.stock)} kg de stock para obtener el costo
            por kilo.
          </p>
        )}
      </Campo>

      {mensaje && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {mensaje}
        </p>
      )}

      <div className="mt-auto flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={guardar.isPending}>
          {guardar.isPending ? "Guardando…" : "Guardar costo"}
        </Button>
      </div>
    </form>
  );
}
