package com.tuempresa.sistema.caja;

import com.tuempresa.sistema.caja.dto.CajaActualResponse;
import com.tuempresa.sistema.caja.dto.CajaProductoResponse;
import com.tuempresa.sistema.caja.dto.CajaResumenResponse;
import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.UsuarioActual;
import com.tuempresa.sistema.inventario.TipoVenta;
import com.tuempresa.sistema.venta.dto.VentaResponse;
import com.tuempresa.sistema.venta.VentaService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

@ApplicationScoped
public class CajaService {

    @Inject
    CajaRepository cajas;

    @Inject
    VentaService ventaService;

    @Inject
    UsuarioActual usuarioActual;

    @Transactional
    public CajaActualResponse actual() {
        Caja caja = cajas.findAbierta();
        return caja == null
                ? new CajaActualResponse(false, null)
                : new CajaActualResponse(true, resumen(caja.id));
    }

    @Transactional
    public CajaResumenResponse abrir() {
        if (cajas.findAbierta() != null) {
            throw Errores.conflict("Ya hay una caja abierta");
        }
        Caja caja = new Caja();
        caja.abiertaEn = Instant.now();
        caja.abiertaPor = usuarioActual.id();
        cajas.persist(caja);
        return resumen(caja.id);
    }

    @Transactional
    public CajaResumenResponse cerrar() {
        Caja caja = cajas.findAbierta();
        if (caja == null) {
            throw Errores.notFound("No hay una caja abierta");
        }
        caja.cerradaEn = Instant.now();
        caja.cerradaPor = usuarioActual.id();
        return resumen(caja.id);
    }

    @Transactional
    public CajaResumenResponse resumen(Long id) {
        List<Object[]> filas = cajas.resumen(id);
        if (filas.isEmpty()) {
            throw Errores.notFound("Caja no encontrada");
        }
        Object[] fila = filas.get(0);
        return new CajaResumenResponse(
                ((Number) fila[0]).longValue(),
                aInstant(fila[1]),
                fila[2] == null ? null : aInstant(fila[2]),
                fila[2] == null,
                aEntero(fila[3]),
                aDecimal(fila[4]),
                aDecimal(fila[5]),
                aDecimal(fila[6]),
                aDecimal(fila[7]),
                aDecimal(fila[8]),
                aEntero(fila[9]),
                aDecimal(fila[10]),
                aEntero(fila[11]),
                cajas.productos(id).stream().map(this::aProducto).toList());
    }

    @Transactional
    public List<VentaResponse> ventas(Long id) {
        if (cajas.findById(id) == null) {
            throw Errores.notFound("Caja no encontrada");
        }
        return ventaService.detallesPorCaja(id);
    }

    private CajaProductoResponse aProducto(Object[] fila) {
        Boolean sinCosto = fila[6] instanceof Boolean bandera
                ? bandera
                : Boolean.parseBoolean(String.valueOf(fila[6]));
        return new CajaProductoResponse(
                ((Number) fila[0]).longValue(),
                String.valueOf(fila[1]),
                TipoVenta.valueOf(String.valueOf(fila[2])),
                aDecimal(fila[3]),
                aDecimal(fila[4]),
                fila[5] == null ? null : aDecimal(fila[5]),
                sinCosto);
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
