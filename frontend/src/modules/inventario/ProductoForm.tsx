import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  costoPorKilo,
  costoTotal,
  inventarioApi,
  type Categoria,
  type DatosProducto,
  type Producto,
  type TipoVenta,
} from "@/lib/inventario";

export function ProductoForm({
  producto,
  categorias,
  onGuardado,
  onCancelar,
}: {
  producto?: Producto | null;
  categorias: Categoria[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const cliente = useQueryClient();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(
    producto?.categoriaId === null || producto?.categoriaId === undefined
      ? ""
      : String(producto.categoriaId),
  );
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>(producto?.tipoVenta ?? "UNIDAD");
  const [precioVenta, setPrecioVenta] = useState(producto?.precioVenta ?? "");
  const [costoActual, setCostoActual] = useState(producto ? costoTotal(producto) : "");
  const [stock, setStock] = useState(producto?.stock ?? "0");
  const [fechaVencimiento, setFechaVencimiento] = useState(producto?.fechaVencimiento ?? "");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async (datos: DatosProducto) =>
      producto
        ? inventarioApi.actualizarProducto(producto.id, datos)
        : inventarioApi.crearProducto(datos),
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["productos"] }),
        cliente.invalidateQueries({ queryKey: ["categorias"] }),
      ]);
      onGuardado();
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);

    const costo = costoActual === "" ? null : Number(costoActual);
    const stockNumerico = stock === "" ? 0 : Number(stock);
    let costoGuardado: number | null = null;
    if (costo !== null) {
      try {
        costoGuardado = tipoVenta === "KILO" ? costoPorKilo(costo, stockNumerico) : costo;
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudo registrar el costo");
        return;
      }
    }

    await guardar.mutateAsync({
      nombre: nombre.trim(),
      categoriaId: categoriaId ? Number(categoriaId) : null,
      tipoVenta,
      precioVenta: Number(precioVenta),
      costoActual: costoGuardado,
      stock: stockNumerico,
      fechaVencimiento: fechaVencimiento || null,
    });
  }

  return (
    <form onSubmit={alEnviar} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {producto ? "Editar producto" : "Nuevo producto"}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Los precios están en soles. El costo es opcional y se puede registrar después.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="producto-nombre" label="Nombre" className="sm:col-span-2">
          <input
            id="producto-nombre"
            required
            maxLength={150}
            autoComplete="off"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="Ej. Cerveza lata 355 ml"
          />
        </Campo>

        <Campo id="producto-categoria" label="Categoría">
          <Select
            id="producto-categoria"
            value={categoriaId}
            onChange={setCategoriaId}
            placeholder="Selecciona una categoría"
            opciones={[
              { valor: "", etiqueta: "Sin categoría" },
              ...categorias.map((categoria) => ({
                valor: String(categoria.id),
                etiqueta: categoria.nombre,
              })),
            ]}
          />
        </Campo>

        <Campo id="producto-tipo" label="Tipo de venta">
          <Select
            id="producto-tipo"
            value={tipoVenta}
            onChange={(valor) => setTipoVenta(valor as TipoVenta)}
            opciones={[
              { valor: "UNIDAD", etiqueta: "Unidad" },
              { valor: "KILO", etiqueta: "Kilo" },
            ]}
          />
        </Campo>

        <Campo id="producto-precio" label="Precio de venta">
          <input
            id="producto-precio"
            type="number"
            required
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={precioVenta}
            onChange={(evento) => setPrecioVenta(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="0.00"
          />
        </Campo>

        <Campo
          id="producto-costo"
          label={tipoVenta === "KILO" ? "Costo total del stock (opcional)" : "Costo actual (opcional)"}
        >
          <input
            id="producto-costo"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={costoActual}
            onChange={(evento) => setCostoActual(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="Sin costo"
          />
          {tipoVenta === "KILO" && (
            <p className="mt-1 text-xs text-ink-soft">
              Se divide entre los kilos de stock. Ejemplo: 10 kg que costaron S/ 10.00 → S/ 1.00
              por kilo.
            </p>
          )}
        </Campo>

        <Campo id="producto-stock" label={tipoVenta === "KILO" ? "Stock (kilos)" : "Stock (unidades)"}>
          <input
            id="producto-stock"
            type="number"
            required
            min="0"
            step={tipoVenta === "KILO" ? "0.001" : "1"}
            inputMode="decimal"
            value={stock}
            onChange={(evento) => setStock(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="0"
          />
        </Campo>

        <Campo id="producto-vence" label="Fecha de vencimiento (opcional)">
          <input
            id="producto-vence"
            type="date"
            value={fechaVencimiento}
            onChange={(evento) => setFechaVencimiento(evento.target.value)}
            className={ESTILO_CAMPO}
          />
        </Campo>
      </div>

      {mensaje && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {mensaje}
        </p>
      )}

      <div className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={guardar.isPending}>
          {guardar.isPending
            ? "Guardando…"
            : producto
              ? "Guardar cambios"
              : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}

export const ESTILO_CAMPO =
  "h-12 w-full rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";

export function Campo({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
