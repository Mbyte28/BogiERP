package com.tuempresa.sistema.inventario.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductoRequest(
        @NotBlank(message = "El nombre del producto es obligatorio")
        @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
        String nombre,
        Long categoriaId,
        @NotNull(message = "Selecciona el tipo de venta")
        TipoVenta tipoVenta,
        @NotNull(message = "El precio de venta es obligatorio")
        @DecimalMin(value = "0.01", message = "El precio debe ser mayor que cero")
        @Digits(integer = 10, fraction = 2, message = "El precio no es válido")
        BigDecimal precioVenta,
        @DecimalMin(value = "0", message = "El costo no puede ser negativo")
        @Digits(integer = 10, fraction = 2, message = "El costo no es válido")
        BigDecimal costoActual,
        @DecimalMin(value = "0", message = "El stock no puede ser negativo")
        @Digits(integer = 9, fraction = 3, message = "El stock no es válido")
        BigDecimal stock,
        LocalDate fechaVencimiento) {
}
