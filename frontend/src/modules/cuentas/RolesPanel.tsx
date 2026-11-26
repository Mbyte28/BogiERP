import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sesionApi, type CrearRol, type Rol } from "@/lib/auth";
import { MODULOS, type ModuloKey } from "@/lib/navigation";

const MODULOS_ASIGNABLES = MODULOS.filter((modulo) => modulo.key !== "CUENTAS");
const MAX_ROLES = 6;

export function RolesPanel() {
  const cliente = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: sesionApi.roles });
  const [nombre, setNombre] = useState("");
  const [modulosNuevos, setModulosNuevos] = useState<Set<ModuloKey>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: (datos: CrearRol) => sesionApi.crearRol(datos),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["roles"] });
      setNombre("");
      setModulosNuevos(new Set());
      setMensaje("Rol creado correctamente.");
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  const principales = roles.data?.filter((rol) => rol.esPrincipal) ?? [];
  const configurables = (roles.data ?? [])
    .filter((rol) => !rol.esPrincipal)
    .slice(0, MAX_ROLES);
  const puedeCrear = configurables.length < MAX_ROLES;

  async function alCrear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeCrear) return;
    setMensaje(null);
    await crear.mutateAsync({ nombre: nombre.trim(), modulos: [...modulosNuevos] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles y permisos</CardTitle>
        <p className="mt-1 text-sm text-ink-soft">
          Define a qué módulos puede acceder cada rol.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={alCrear} className="grid gap-4 rounded-field border border-line bg-app p-4">
          <div>
            <label htmlFor="nombre-rol" className="text-xs font-semibold text-ink">
              Nombre del rol
            </label>
            <input
              id="nombre-rol"
              required
              maxLength={60}
              disabled={!puedeCrear}
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="mt-2 h-12 w-full rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-60"
              placeholder="Ej. Supervisor"
            />
          </div>

          <ModulosCheckboxes valor={modulosNuevos} onChange={setModulosNuevos} deshabilitado={!puedeCrear} />

          <Button type="submit" className="w-full sm:w-auto" disabled={!puedeCrear || crear.isPending}>
            <Plus />
            {crear.isPending ? "Creando…" : "Crear rol"}
          </Button>
          <p className="text-xs text-ink-soft" role="status">
            {puedeCrear
              ? `Puedes crear hasta ${MAX_ROLES - configurables.length} rol(es) más; el rol principal no cuenta.`
              : `Máximo ${MAX_ROLES} roles alcanzado (sin contar el principal).`}
          </p>
        </form>

        {mensaje && (
          <p role="status" className="text-sm font-medium text-primary-600">
            {mensaje}
          </p>
        )}
        {roles.error && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {roles.error instanceof Error
              ? roles.error.message
              : "No se pudieron cargar los roles."}
          </p>
        )}

        {principales.map((rol) => (
          <div key={rol.id} className="flex flex-wrap items-center gap-2 rounded-field bg-app px-4 py-3">
            <span className="text-sm font-semibold text-ink">Rol principal: {rol.nombre}</span>
            <Badge>Principal</Badge>
            <p className="w-full text-xs text-ink-soft">
              Conserva todos los módulos, incluido Cuentas. No se cuenta en el límite de 6 roles.
            </p>
          </div>
        ))}

        {roles.isPending ? (
          <p className="text-sm text-ink-soft">Cargando roles…</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {configurables.map((rol) => (
              <EditorRol key={rol.id} rol={rol} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EditorRol({ rol }: { rol: Rol }) {
  const cliente = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<ModuloKey>>(
    () => new Set(rol.modulos),
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    setSeleccionados(new Set(rol.modulos));
  }, [rol]);

  const guardar = useMutation({
    mutationFn: (modulos: ModuloKey[]) => sesionApi.actualizarModulos(rol.id, modulos),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["roles"] });
      setMensaje("Permisos actualizados.");
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  const sinCambios =
    seleccionados.size === rol.modulos.length &&
    rol.modulos.every((modulo) => seleccionados.has(modulo));

  return (
    <li className="self-start rounded-field border border-line p-4">
      <button
        type="button"
        aria-expanded={abierto}
        aria-label={`${abierto ? "Ocultar" : "Ver"} permisos de ${rol.nombre}`}
        onClick={() => setAbierto((actual) => !actual)}
        className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      >
        <span className="text-sm font-semibold text-ink">{rol.nombre}</span>
        {rol.esSistema && <Badge variant="outline">Del sistema</Badge>}
        <ChevronDown
          size={20}
          strokeWidth={1.8}
          aria-hidden="true"
          className={cn("ml-auto shrink-0 text-ink-soft transition-transform", abierto && "rotate-180")}
        />
      </button>

      {abierto && (
        <>
          <div className="mt-4">
            <ModulosCheckboxes valor={seleccionados} onChange={setSeleccionados} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => guardar.mutate([...seleccionados])}
              disabled={sinCambios || guardar.isPending}
            >
              {guardar.isPending ? "Guardando…" : "Guardar permisos"}
            </Button>
            {mensaje && <span className="text-xs text-ink-soft">{mensaje}</span>}
          </div>
        </>
      )}
    </li>
  );
}

function ModulosCheckboxes({
  valor,
  onChange,
  deshabilitado = false,
}: {
  valor: Set<ModuloKey>;
  onChange: (modulos: Set<ModuloKey>) => void;
  deshabilitado?: boolean;
}) {
  function alternar(modulo: ModuloKey) {
    const siguiente = new Set(valor);
    if (siguiente.has(modulo)) {
      siguiente.delete(modulo);
    } else {
      siguiente.add(modulo);
    }
    onChange(siguiente);
  }

  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">Módulos permitidos</legend>
      {MODULOS_ASIGNABLES.map((modulo) => (
        <label
          key={modulo.key}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border border-line bg-surface px-3 text-sm text-ink"
        >
          <input
            type="checkbox"
            className="size-5 accent-primary-500"
            checked={valor.has(modulo.key)}
            disabled={deshabilitado}
            onChange={() => alternar(modulo.key)}
          />
          {modulo.nombre}
        </label>
      ))}
      <p className="text-[11px] leading-relaxed text-ink-soft sm:col-span-2">
        El módulo Cuentas es exclusivo del rol principal.
      </p>
    </fieldset>
  );
}
