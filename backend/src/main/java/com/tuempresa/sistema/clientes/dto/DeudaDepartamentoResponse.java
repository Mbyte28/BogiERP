package com.tuempresa.sistema.clientes.dto;

import java.math.BigDecimal;
import java.util.List;

public record DeudaDepartamentoResponse(
        Long departamentoId,
        String etiqueta,
        BigDecimal total,
        long cantidad,
        List<FiadoResponse> fiados) {
}
