package com.tuempresa.sistema.clientes.dto;

import java.math.BigDecimal;
import java.util.List;

public record DeudaGrupoResponse(
        String etiqueta,
        BigDecimal total,
        long cantidad,
        List<DeudaDepartamentoResponse> departamentos) {
}
