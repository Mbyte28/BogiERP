import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, UserRound } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { rutaInicial } from "@/lib/auth";

export default function LoginPage() {
  const { sesion, cargando, error, iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (error) {
      setMensaje(error);
    }
  }, [error]);

  if (!cargando && sesion) {
    return <Navigate to={rutaInicial(sesion)} replace />;
  }

  const desde = (ubicacion.state as { desde?: string } | null)?.desde;

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const nuevaSesion = await iniciarSesion(username.trim(), password);
      navegar(desde && desde !== "/login" ? desde : rutaInicial(nuevaSesion), {
        replace: true,
      });
    } catch (fallo) {
      setMensaje(
        fallo instanceof ApiError
          ? fallo.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>

        <Card>
          <CardContent className="px-6 py-7 sm:px-8">
            <h1 className="text-xl font-bold tracking-tight text-ink">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Ingresa con tu usuario para continuar al sistema.
            </p>

            <form className="mt-6 space-y-4" onSubmit={alEnviar}>
              <div>
                <label htmlFor="username" className="text-xs font-semibold text-ink">
                  Usuario
                </label>
                <div className="relative mt-2">
                  <UserRound
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
                    aria-hidden="true"
                  />
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(evento) => setUsername(evento.target.value)}
                    className="h-12 w-full rounded-field border border-line bg-app pl-11 pr-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                    placeholder="Tu usuario"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold text-ink">
                  Contraseña
                </label>
                <div className="relative mt-2">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(evento) => setPassword(evento.target.value)}
                    className="h-12 w-full rounded-field border border-line bg-app pl-11 pr-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                    placeholder="Tu contraseña"
                  />
                </div>
              </div>

              {mensaje && (
                <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                  {mensaje}
                </p>
              )}

              <Button type="submit" className="h-12 w-full" disabled={enviando}>
                {enviando ? "Iniciando sesión…" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[11px] text-ink-soft">
          Acceso interno · Tienda Condominio
        </p>
      </div>
    </div>
  );
}
