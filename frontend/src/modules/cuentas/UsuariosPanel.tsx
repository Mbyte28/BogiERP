import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { sesionApi, type CrearUsuario } from "@/lib/auth";

export function UsuariosPanel() {
  const cliente = useQueryClient();
  const usuarios = useQuery({ queryKey: ["usuarios"], queryFn: sesionApi.usuarios });
  const roles = useQuery({ queryKey: ["roles"], queryFn: sesionApi.roles });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: (datos: CrearUsuario) => sesionApi.crearUsuario(datos),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["usuarios"] });
      setUsername("");
      setPassword("");
      setRolId("");
      setMostrarFormulario(false);
      setMensaje("Usuario creado correctamente.");
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    await crear.mutateAsync({
      username: username.trim(),
      password,
      rolId: Number(rolId),
    });
  }

  const errorConsulta = usuarios.error ?? roles.error;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <p className="mt-1 text-sm text-ink-soft">
            Cuentas con acceso al sistema y rol asignado.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setMostrarFormulario((abierto) => !abierto)}
          aria-expanded={mostrarFormulario}
        >
          <UserPlus />
          <span className="hidden sm:inline">Nuevo usuario</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {mostrarFormulario && (
          <form
            onSubmit={alEnviar}
            className="grid gap-4 rounded-field border border-line bg-app p-4 sm:grid-cols-2"
          >
            <Campo id="nuevo-usuario" label="Usuario">
              <input
                id="nuevo-usuario"
                required
                minLength={3}
                maxLength={60}
                autoComplete="off"
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
                className={ESTILO_CAMPO}
                placeholder="Nombre de usuario"
              />
            </Campo>
            <Campo id="nueva-clave" label="Contraseña">
              <input
                id="nueva-clave"
                type="password"
                required
                minLength={6}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                className={ESTILO_CAMPO}
                placeholder="Mínimo 6 caracteres"
              />
            </Campo>
            <Campo id="nuevo-rol" label="Rol">
              <Select
                id="nuevo-rol"
                required
                value={rolId}
                onChange={setRolId}
                placeholder="Selecciona un rol"
                opciones={[
                  { valor: "", etiqueta: "Selecciona un rol" },
                  ...(roles.data ?? []).map((rol) => ({
                    valor: String(rol.id),
                    etiqueta: rol.nombre,
                  })),
                ]}
              />
            </Campo>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={crear.isPending}>
                {crear.isPending ? "Creando…" : "Crear usuario"}
              </Button>
            </div>
          </form>
        )}

        {mensaje && (
          <p role="status" className="text-sm font-medium text-primary-600">
            {mensaje}
          </p>
        )}
        {errorConsulta && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {errorConsulta instanceof Error
              ? errorConsulta.message
              : "No se pudieron cargar los usuarios."}
          </p>
        )}

        {usuarios.isPending ? (
          <p className="text-sm text-ink-soft">Cargando usuarios…</p>
        ) : usuarios.data?.length ? (
          <ul className="divide-y divide-line/70">
            {usuarios.data.map((usuario) => (
              <li
                key={usuario.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {usuario.username}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {usuario.rol} · Desde{" "}
                    {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
                      new Date(usuario.creadoEn),
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {usuario.principal && <Badge variant="default">Principal</Badge>}
                  <Badge variant={usuario.activo ? "success" : "danger"}>
                    {usuario.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Todavía no hay usuarios.</p>
        )}
      </CardContent>
    </Card>
  );
}

const ESTILO_CAMPO =
  "h-12 w-full rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";

function Campo({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
