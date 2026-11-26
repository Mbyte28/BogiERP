import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cantidad, inventarioApi, type Producto } from "@/lib/inventario";
import { Campo, ESTILO_CAMPO } from "./ProductoForm";

export function MermaForm({
  productos,
  productoIdInicial,
  onGuardado,
  onCancelar,
}: {
  productos: Producto[];
  productoIdInicial?: number | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const cliente = useQueryClient();
  const [productoId, setProductoId] = useState(
    productoIdInicial ? String(productoIdInicial) : "",
  );
  const [cantidadMermada, setCantidadMermada] = useState("");
  const [motivo, setMotivo] = useState("VENCIMIENTO");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const producto = productos.find((item) => String(item.id) === productoId);

  const guardar = useMutation({
    mutationFn: () =>
      inventarioApi.crearMerma({
        productoId: Number(productoId),
        cantidad: Number(cantidadMermada),
        motivo: motivo.trim() || "VENCIMIENTO",
      }),
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["productos"] }),
        cliente.invalidateQueries({ queryKey: ["mermas"] }),
      ]);
      onGuardado();
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    await guardar.mutateAsync();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-1 flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Registrar merma</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Se descuenta del stock y se guarda el costo actual del producto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="merma-producto" label="Producto" className="sm:col-span-2">
          <Select
            id="merma-producto"
            required
            value={productoId}
            onChange={setProductoId}
            placeholder="Selecciona un producto"
            opciones={[
              { valor: "", etiqueta: "Selecciona un producto" },
              ...productos.map((item) => ({
                valor: String(item.id),
                etiqueta: `${item.nombre} · ${cantidad(item.stock)} ${item.tipoVenta === "KILO" ? "kg" : "und"}`,
              })),
            ]}
          />
        </Campo>

        <Campo
          id="merma-cantidad"
          label={producto?.tipoVenta === "KILO" ? "Cantidad (kilos)" : "Cantidad (unidades)"}
        >
          <input
            id="merma-cantidad"
            type="number"
            required
            min={producto?.tipoVenta === "KILO" ? "0.001" : "1"}
            step={producto?.tipoVenta === "KILO" ? "0.001" : "1"}
            inputMode="decimal"
            value={cantidadMermada}
            onChange={(evento) => setCantidadMermada(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="0"
          />
        </Campo>

        <Campo id="merma-motivo" label="Motivo">
          <input
            id="merma-motivo"
            maxLength={100}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="VENCIMIENTO"
          />
        </Campo>
      </div>

      {producto && (
        <p className="rounded-field bg-app px-4 py-3 text-sm text-ink-soft">
          Stock disponible: <span className="font-semibold text-ink">{cantidad(producto.stock)}</span>
        </p>
      )}

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
          {guardar.isPending ? "Registrando…" : "Registrar merma"}
        </Button>
      </div>
    </form>
  );
}
