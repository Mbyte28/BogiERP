package com.tuempresa.sistema.inventario.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record RegistrarInventarioRequest(
        @NotNull(message = "Indica los productos a registrar")
        @Size(min = 1, max = 100, message = "Debes registrar entre 1 y 100 productos")
        List<@Valid Linea> items) {

    public record Linea(
            @NotNull(message = "Indica el producto")
            Long productoId,

            @NotNull(message = "Indica la cantidad")
            @DecimalMin(value = "0.001", message = "La cantidad a ingresar debe ser mayor a cero")
            @Digits(integer = 9, fraction = 3, message = "La cantidad no es válida")
            BigDecimal cantidad,

            @DecimalMin(value = "0", message = "El costo no puede ser negativo")
            @Digits(integer = 10, fraction = 2, message = "El costo no es válido")
            BigDecimal costo) {
    }
}
