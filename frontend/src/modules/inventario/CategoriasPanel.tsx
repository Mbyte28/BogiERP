import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { inventarioApi, type Categoria } from "@/lib/inventario";
import { Campo, ESTILO_CAMPO } from "./ProductoForm";
import { ICONOS_CATEGORIA, IconoCategoria } from "./IconoCategoria";

export function CategoriasPanel({ categorias }: { categorias: Categoria[] }) {
  const cliente = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState("package");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      editando === null
        ? inventarioApi.crearCategoria({ nombre: nombre.trim(), icono })
        : inventarioApi.actualizarCategoria(editando, {
            nombre: nombre.trim(),
            icono,
          }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["categorias"] });
      limpiar();
      setMensaje(null);
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  const borrar = useMutation({
    mutationFn: (id: number) => inventarioApi.eliminarCategoria(id),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["categorias"] });
      await cliente.invalidateQueries({ queryKey: ["productos"] });
      setMensaje(null);
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  function limpiar() {
    setEditando(null);
    setNombre("");
    setIcono("package");
  }

  function preparar(categoria: Categoria) {
    setEditando(categoria.id);
    setNombre(categoria.nombre);
    setIcono(categoria.icono ?? "package");
    setMensaje(null);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    await guardar.mutateAsync();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAbierto(true)}
        aria-label="Gestionar categorías"
      >
        <Settings2 />
        <span className="hidden sm:inline">Categorías</span>
      </Button>

      <Sheet
        open={abierto}
        onOpenChange={(estado) => {
          setAbierto(estado);
          if (!estado) limpiar();
        }}
      >
        <SheetContent
          side="bottom"
          title="Gestionar categorías"
          className="sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(100%,40rem)] sm:rounded-l-3xl sm:rounded-t-none"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink">Categorías</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Agrupa los productos por tipo. Puedes renombrar o eliminar las que no uses.
              </p>
            </div>

            <form onSubmit={alEnviar} className="grid gap-3 rounded-field bg-app p-4 sm:grid-cols-2">
              <Campo id="categoria-nombre" label={editando === null ? "Nueva categoría" : "Renombrar"}>
                <input
                  id="categoria-nombre"
                  required
                  maxLength={80}
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  className={ESTILO_CAMPO}
                  placeholder="Ej. Bebidas"
                />
              </Campo>
              <div className="min-w-0 sm:col-span-2">
                <p className="text-xs font-semibold text-ink">Icono</p>
                <div className="mt-2 grid max-h-64 grid-cols-6 gap-2 overflow-y-auto rounded-field border border-line bg-app p-2 sm:max-h-none sm:grid-cols-10">
                  {ICONOS_CATEGORIA.map(({ clave, etiqueta, Icono }) => {
                    const activo = icono === clave;
                    return (
                      <button
                        key={clave}
                        type="button"
                        aria-label={`Icono ${etiqueta}`}
                        aria-pressed={activo}
                        title={etiqueta}
                        onClick={() => setIcono(clave)}
                        className={cn(
                          "flex min-h-12 items-center justify-center rounded-xl border p-2 transition-colors",
                          activo
                            ? "border-primary-500 bg-primary-50 text-primary-600"
                            : "border-transparent bg-surface text-ink-soft hover:bg-white hover:text-ink",
                        )}
                      >
                        <Icono size={24} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" className="flex-1" disabled={guardar.isPending}>
                  {guardar.isPending
                    ? "Guardando…"
                    : editando === null
                      ? "Agregar categoría"
                      : "Guardar cambios"}
                </Button>
                {editando !== null && (
                  <Button type="button" variant="outline" onClick={limpiar}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>

            {mensaje && (
              <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                {mensaje}
              </p>
            )}

            <ul className="min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto">
              {categorias.map((categoria) => (
                <li key={categoria.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <IconoCategoria nombre={categoria.icono} size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{categoria.nombre}</p>
                    <p className="text-xs text-ink-soft">
                      {categoria.productos} {categoria.productos === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${categoria.nombre}`}
                    onClick={() => preparar(categoria)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${categoria.nombre}`}
                    disabled={borrar.isPending}
                    onClick={() => {
                      setMensaje(null);
                      void borrar.mutateAsync(categoria.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
