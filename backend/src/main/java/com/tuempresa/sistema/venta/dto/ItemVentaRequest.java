package com.tuempresa.sistema.venta.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ItemVentaRequest(
        @NotNull(message = "Selecciona un producto") Long productoId,
        @NotNull(message = "Indica la cantidad")
        @DecimalMin(value = "0.001", message = "La cantidad debe ser mayor que cero")
        BigDecimal cantidad) {
}
