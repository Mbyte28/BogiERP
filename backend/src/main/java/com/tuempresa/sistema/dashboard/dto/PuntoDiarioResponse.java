package com.tuempresa.sistema.dashboard.dto;

import java.math.BigDecimal;

public record PuntoDiarioResponse(
        String dia,
        BigDecimal ventas,
        BigDecimal ganancia,
        BigDecimal merma) {
}
