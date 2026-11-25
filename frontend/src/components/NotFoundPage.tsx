import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold tracking-tight text-primary-500">404</p>
      <h2 className="mt-4 text-xl font-bold text-ink">Esta página no existe</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        Revisa la dirección o vuelve al dashboard para continuar.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Ir al dashboard</Link>
      </Button>
    </div>
  );
}
