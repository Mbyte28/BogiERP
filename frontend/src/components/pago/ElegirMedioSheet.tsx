import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { dinero } from "@/lib/inventario";
import type { MedioTransferencia } from "@/lib/venta";

interface ElegirMedioSheetProps {
  abierto: boolean;
  total: number;
  onElegir: (medio: MedioTransferencia) => void;
  onCerrar: () => void;
}

export function ElegirMedioSheet({ abierto, total, onElegir, onCerrar }: ElegirMedioSheetProps) {
  return (
    <Sheet open={abierto} onOpenChange={(estado) => !estado && onCerrar()}>
      <SheetContent
        side="bottom"
        title="Yape o Plin"
        className="sm:inset-y-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:w-[min(100%,420px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
      >
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Wallet />
          </span>
          <h3 className="mt-4 text-lg font-bold text-ink">¿Con qué billetera pagaron?</h3>
          <p className="mt-1 text-sm text-ink-soft">Total a transferir: {dinero(total)}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(["YAPE", "PLIN"] as const).map((medio) => (
            <Button
              key={medio}
              type="button"
              size="lg"
              variant={medio === "YAPE" ? "default" : "secondary"}
              onClick={() => onElegir(medio)}
            >
              {medio === "YAPE" ? "Yape" : "Plin"}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
