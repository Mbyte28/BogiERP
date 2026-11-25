package com.tuempresa.sistema.inventario.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CrearMermaRequest(
        @NotNull(message = "Selecciona el producto")
        Long productoId,
        @NotNull(message = "Indica la cantidad mermada")
        @DecimalMin(value = "0.001", message = "La cantidad debe ser mayor que cero")
        @Digits(integer = 9, fraction = 3, message = "La cantidad no es válida")
        BigDecimal cantidad,
        @Size(max = 100, message = "El motivo no puede superar los 100 caracteres")
        String motivo) {
}
