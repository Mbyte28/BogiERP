package com.tuempresa.sistema.clientes.dto;

import com.tuempresa.sistema.venta.MedioTransferencia;
import com.tuempresa.sistema.venta.MetodoPago;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Datos del cobro con el que se cierra un envío y se genera su venta. */
public record PagarFiadoRequest(
        @NotNull(message = "Selecciona el método de pago") MetodoPago metodoPago,
        BigDecimal efectivoRecibido,
        BigDecimal montoEfectivo,
        MedioTransferencia medioTransferencia) {
}
