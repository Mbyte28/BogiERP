package com.tuempresa.sistema.clientes.dto;

import java.math.BigDecimal;

public record TorreResponse(
        int torre,
        long pisos,
        long departamentos,
        long departamentosConDeuda,
        BigDecimal totalPendiente) {
}
