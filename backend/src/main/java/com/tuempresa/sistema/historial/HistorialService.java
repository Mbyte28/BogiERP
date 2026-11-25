package com.tuempresa.sistema.historial;

import com.tuempresa.sistema.caja.CajaService;
import com.tuempresa.sistema.caja.dto.CajaResumenResponse;
import com.tuempresa.sistema.historial.dto.HistorialCajaDetalleResponse;
import com.tuempresa.sistema.historial.dto.HistorialCajaPageResponse;
import com.tuempresa.sistema.historial.dto.HistorialCajaResponse;
import com.tuempresa.sistema.venta.dto.VentaResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

@ApplicationScoped
public class HistorialService {

    @Inject
    HistorialRepository cajas;

    @Inject
    CajaService cajaService;

    @Transactional
    public HistorialCajaPageResponse listar(int page, int size) {
        List<HistorialCajaResponse> items = cajas.listar(page, size).stream()
                .map(this::aResumen)
                .toList();
        return new HistorialCajaPageResponse(items, cajas.count(), page, size);
    }

    @Transactional
    public HistorialCajaDetalleResponse detalle(Long id) {
        CajaResumenResponse resumen = cajaService.resumen(id);
        List<VentaResponse> ventas = cajaService.ventas(id);
        return new HistorialCajaDetalleResponse(resumen, ventas);
    }

    private HistorialCajaResponse aResumen(Object[] fila) {
        Object abierta = fila[3];
        boolean estaAbierta = abierta instanceof Boolean bandera
                ? bandera
                : Boolean.parseBoolean(String.valueOf(abierta));
        return new HistorialCajaResponse(
                ((Number) fila[0]).longValue(),
                aInstant(fila[1]),
                fila[2] == null ? null : aInstant(fila[2]),
                estaAbierta,
                aEntero(fila[4]),
                aDecimal(fila[5]),
                aDecimal(fila[6]),
                aDecimal(fila[7]),
                aDecimal(fila[8]),
                aDecimal(fila[9]),
                aEntero(fila[10]),
                aDecimal(fila[11]),
                aEntero(fila[12]));
    }

    private BigDecimal aDecimal(Object valor) {
        return valor instanceof BigDecimal decimal ? decimal : new BigDecimal(String.valueOf(valor));
    }

    private long aEntero(Object valor) {
        return valor == null ? 0 : ((Number) valor).longValue();
    }

    private Instant aInstant(Object valor) {
        if (valor instanceof Instant instant) {
            return instant;
        }
        if (valor instanceof Timestamp marcaTiempo) {
            return marcaTiempo.toInstant();
        }
        if (valor instanceof OffsetDateTime fecha) {
            return fecha.toInstant();
        }
        return Instant.parse(String.valueOf(valor));
    }
}
