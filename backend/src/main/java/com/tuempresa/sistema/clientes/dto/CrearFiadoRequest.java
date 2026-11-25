package com.tuempresa.sistema.clientes.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CrearFiadoRequest(
        @NotNull(message = "Indica el departamento") Long departamentoId,
        @NotEmpty(message = "Agrega al menos un producto al fiado") List<ItemFiadoRequest> items) {
}
