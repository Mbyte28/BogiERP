import { Button } from "@/components/ui/button";
import { dinero } from "@/lib/inventario";
import {
  METODOS_PAGO,
  transferencia,
  vuelto,
  type MetodoPago,
} from "@/lib/venta";

interface FormaPagoProps {
  idBase: string;
  total: number;
  metodoPago: MetodoPago;
  onMetodo: (metodo: MetodoPago) => void;
  recibido: string;
  onRecibido: (valor: string) => void;
  efectivo: string;
  onEfectivo: (valor: string) => void;
  cajaAbierta?: boolean;
  pendiente: boolean;
  puedeFinalizar: boolean;
  mensaje?: string | null;
  onFinalizar: () => void;
  etiquetaFinalizar?: string;
}

/** Controles de cobro compartidos por Ventas y por el pago de envíos. */
export function FormaPago({
  idBase,
  total,
  metodoPago,
  onMetodo,
  recibido,
  onRecibido,
  efectivo,
  onEfectivo,
  cajaAbierta = true,
  pendiente,
  puedeFinalizar,
  mensaje,
  onFinalizar,
  etiquetaFinalizar = "Finalizar venta",
}: FormaPagoProps) {
  const recibidoNumero = Number(recibido);
  const efectivoNumero = Number(efectivo);

  return (
    <div className="space-y-5">
      {!cajaAbierta && (
        <p
          role="alert"
          className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]"
        >
          Caja cerrada. Abre la caja para registrar la venta.
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-ink-soft">
          Método de pago
        </p>
        <div role="group" aria-label="Método de pago" className="flex gap-2 rounded-full bg-app p-1">
          {METODOS_PAGO.map((metodo) => (
            <button
              key={metodo.clave}
              type="button"
              aria-pressed={metodoPago === metodo.clave}
              onClick={() => onMetodo(metodo.clave)}
              className={`min-h-11 flex-1 rounded-full px-2 text-xs font-semibold transition-colors ${
                metodoPago === metodo.clave
                  ? "bg-primary-500 text-white"
                  : "text-ink-soft hover:bg-surface"
              }`}
            >
              {metodo.nombre}
            </button>
          ))}
        </div>
      </div>

      {metodoPago === "EFECTIVO" && (
        <div className="space-y-3">
          <label
            htmlFor={`${idBase}-recibido`}
            className="block text-xs font-semibold uppercase text-ink-soft"
          >
            Recibido
          </label>
          <div className="flex gap-2">
            <input
              id={`${idBase}-recibido`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={recibido}
              onChange={(evento) => onRecibido(evento.target.value)}
              placeholder="0.00"
              className="h-12 min-w-0 flex-1 rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            />
            <Button type="button" variant="secondary" onClick={() => onRecibido(String(total))}>
              Exacto
            </Button>
          </div>
          <p className="text-sm text-ink-soft">
            Vuelto a dar:{" "}
            <span className="font-bold text-ink">{dinero(vuelto(total, recibidoNumero))}</span>
          </p>
        </div>
      )}

      {metodoPago === "AMBOS" && (
        <div className="space-y-3">
          <label
            htmlFor={`${idBase}-efectivo`}
            className="block text-xs font-semibold uppercase text-ink-soft"
          >
            Efectivo
          </label>
          <input
            id={`${idBase}-efectivo`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={efectivo}
            onChange={(evento) => onEfectivo(evento.target.value)}
            placeholder="0.00"
            className="h-12 w-full rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          />
          <p className="text-sm text-ink-soft">
            Recibido en transferencia:{" "}
            <span className="font-bold text-ink">
              {dinero(transferencia(total, efectivoNumero))}
            </span>
          </p>
        </div>
      )}

      {metodoPago === "TRANSFERENCIA" && (
        <p className="rounded-field bg-info/10 px-4 py-3 text-sm text-info">
          Total a transferir: {dinero(total)}. Elige Yape o Plin al finalizar.
        </p>
      )}

      {mensaje && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {mensaje}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!puedeFinalizar || pendiente}
        onClick={onFinalizar}
      >
        {pendiente ? "Registrando…" : etiquetaFinalizar}
      </Button>
    </div>
  );
}
