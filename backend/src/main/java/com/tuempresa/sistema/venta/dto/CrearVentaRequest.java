package com.tuempresa.sistema.venta.dto;

import com.tuempresa.sistema.venta.MedioTransferencia;
import com.tuempresa.sistema.venta.MetodoPago;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record CrearVentaRequest(
        @NotEmpty(message = "Agrega al menos un producto a la venta")
        List<@Valid ItemVentaRequest> items,
        @NotNull(message = "Selecciona el método de pago") MetodoPago metodoPago,
        BigDecimal efectivoRecibido,
        BigDecimal montoEfectivo,
        MedioTransferencia medioTransferencia) {
}
