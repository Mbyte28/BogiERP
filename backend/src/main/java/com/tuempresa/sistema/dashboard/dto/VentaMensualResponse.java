package com.tuempresa.sistema.dashboard.dto;

import java.math.BigDecimal;

public record VentaMensualResponse(
        String mes,
        BigDecimal ventas,
        BigDecimal ganancia,
        BigDecimal merma,
        BigDecimal gananciaNeta,
        BigDecimal unidades,
        BigDecimal kilos,
        long itemsSinCosto) {
}
