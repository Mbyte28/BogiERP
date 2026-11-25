package com.tuempresa.sistema.clientes.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ItemFiadoRequest(
        @NotNull(message = "Indica el producto a fiar") Long productoId,
        @NotNull(message = "Indica la cantidad") BigDecimal cantidad) {
}
