import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { puedeAcceder, rutaInicial } from "@/lib/auth";
import type { ModuloKey } from "@/lib/navigation";

export function RequireModulo({
  modulo,
  children,
}: {
  modulo: ModuloKey;
  children: ReactNode;
}) {
  const { sesion } = useAuth();

  if (!puedeAcceder(sesion, modulo)) {
    return <AccesoDenegado />;
  }

  return <>{children}</>;
}

function AccesoDenegado() {
  const { sesion } = useAuth();

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-danger/15 text-[#c75f53]">
          <ShieldX size={26} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-ink">Acceso denegado</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Tu rol no tiene permiso para entrar en este módulo. Si crees que es un error,
          pide al administrador que revise tus permisos.
        </p>
        <Button asChild className="mt-6">
          <Link to={rutaInicial(sesion)}>Volver al inicio</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
