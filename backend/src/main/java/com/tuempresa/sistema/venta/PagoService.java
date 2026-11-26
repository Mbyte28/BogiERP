package com.tuempresa.sistema.venta;

import com.tuempresa.sistema.common.error.Errores;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Reparto y validación del cobro, compartido por ventas y envíos pagados. */
@ApplicationScoped
public class PagoService {

    private static final BigDecimal CERO = BigDecimal.ZERO.setScale(2);

    public record Pago(BigDecimal efectivo, BigDecimal transferencia, BigDecimal recibido,
            BigDecimal vuelto, MedioTransferencia medio) {
    }

    public Pago calcular(MetodoPago metodo, BigDecimal efectivoRecibido, BigDecimal montoEfectivo,
            MedioTransferencia medioTransferencia, BigDecimal total) {
        if (metodo == null) {
            throw Errores.badRequest("Selecciona el método de pago");
        }
        return switch (metodo) {
            case EFECTIVO -> {
                if (efectivoRecibido == null || efectivoRecibido.compareTo(total) < 0) {
                    throw Errores.badRequest("El efectivo recibido debe cubrir el total de la venta");
                }
                yield new Pago(total, CERO, efectivoRecibido.setScale(2, RoundingMode.HALF_UP),
                        efectivoRecibido.subtract(total).setScale(2, RoundingMode.HALF_UP), null);
            }
            case TRANSFERENCIA -> {
                if (medioTransferencia == null) {
                    throw Errores.badRequest("Selecciona Yape o Plin para la transferencia");
                }
                yield new Pago(CERO, total, null, CERO, medioTransferencia);
            }
            case AMBOS -> {
                if (medioTransferencia == null) {
                    throw Errores.badRequest("Selecciona Yape o Plin para la transferencia");
                }
                if (montoEfectivo == null || montoEfectivo.signum() <= 0
                        || montoEfectivo.compareTo(total) >= 0) {
                    throw Errores.badRequest("El efectivo debe ser mayor que cero y menor que el total");
                }
                yield new Pago(montoEfectivo.setScale(2, RoundingMode.HALF_UP),
                        total.subtract(montoEfectivo).setScale(2, RoundingMode.HALF_UP),
                        null, CERO, medioTransferencia);
            }
        };
    }
}
