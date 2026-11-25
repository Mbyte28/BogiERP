package com.tuempresa.sistema.inventario.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AjustarStockRequest(
        @NotNull(message = "Indica la cantidad")
        @Digits(integer = 9, fraction = 3, message = "La cantidad no es válida")
        BigDecimal cantidad) {
}
