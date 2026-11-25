package com.tuempresa.sistema.historial.dto;

import java.util.List;

public record HistorialCajaPageResponse(
        List<HistorialCajaResponse> items,
        long total,
        int page,
        int size) {
}
