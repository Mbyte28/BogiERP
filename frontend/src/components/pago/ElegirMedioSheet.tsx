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
        side="center"
        title="Yape o Plin"
        className="w-[min(92vw,360px)] rounded-3xl"
      >
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Wallet size={22} />
          </span>
          <h3 className="mt-3 text-base font-bold text-ink">¿Con qué billetera pagaron?</h3>
          <p className="mt-1 text-sm text-ink-soft">Total a transferir: {dinero(total)}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["YAPE", "PLIN"] as const).map((medio) => (
            <Button
              key={medio}
              type="button"
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
