import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Modulo } from "@/lib/navigation";

export function ModulePlaceholder({ modulo }: { modulo: Modulo }) {
  const Icono = modulo.icono;

  return (
    <section className="flex min-h-[60vh] items-center justify-center py-6">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-surface text-primary-600 shadow-card">
          <Icono size={28} strokeWidth={1.6} aria-hidden="true" />
        </div>

        <Badge variant="warning" className="mt-6">
          Estructura lista
        </Badge>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {modulo.nombre}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
          {modulo.descripcion}.
        </p>

        <Card className="mt-8 text-left">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-ink">Siguiente paso</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              La carpeta{" "}
              <code className="rounded-md bg-app px-1.5 py-0.5 text-[12px] text-primary-600">
                src/modules/{modulo.key.toLowerCase()}
              </code>{" "}
              está reservada para este módulo. Se implementará y probará en su
              propia rama <code className="text-[12px]">feature/…</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
