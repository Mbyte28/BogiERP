package com.tuempresa.sistema.dashboard.dto;

import java.util.List;

public record MesDashboardResponse(
        String mes,
        ResumenDashboardResponse resumen,
        List<PuntoDiarioResponse> porDia,
        List<ProductoDestacadoResponse> topProductos) {
}
