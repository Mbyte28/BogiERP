package com.tuempresa.sistema.dashboard;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.dashboard.dto.MesDashboardResponse;
import com.tuempresa.sistema.dashboard.dto.ProductoDestacadoResponse;
import com.tuempresa.sistema.dashboard.dto.PuntoDiarioResponse;
import com.tuempresa.sistema.dashboard.dto.ResumenDashboardResponse;
import com.tuempresa.sistema.dashboard.dto.VentaMensualResponse;
import com.tuempresa.sistema.inventario.TipoVenta;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

@ApplicationScoped
public class DashboardService {

    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyy-MM");

    @Inject
    DashboardRepository datos;

    @Transactional
    public List<VentaMensualResponse> ventasMensuales(Integer meses, Integer anio) {
        YearMonth fin;
        int cantidad;
        if (anio != null) {
            if (meses != null) {
                throw Errores.badRequest("Indica meses o año, no ambos");
            }
            if (anio < 2000 || anio > 2100) {
                throw Errores.badRequest("El año no es válido");
            }
            fin = YearMonth.of(anio, 12);
            cantidad = 12;
        } else {
            cantidad = meses == null ? 6 : meses;
            if (cantidad < 1 || cantidad > 12) {
                throw Errores.badRequest("La cantidad de meses debe estar entre 1 y 12");
            }
            fin = YearMonth.now(ZONA);
        }

        YearMonth inicio = fin.minusMonths(cantidad - 1L);
        Map<String, Object[]> porMes = new LinkedHashMap<>();
        for (Object[] fila : datos.mensuales(inicio.atDay(1), fin.atEndOfMonth())) {
            porMes.put(aMes(fila[0]), fila);
        }

        List<VentaMensualResponse> respuesta = new ArrayList<>();
        for (int i = 0; i < cantidad; i++) {
            YearMonth actual = inicio.plusMonths(i);
            Object[] fila = porMes.get(actual.toString());
            respuesta.add(aVentaMensual(actual.toString(), fila));
        }
        return respuesta;
    }

    @Transactional
    public ResumenDashboardResponse resumen(String desde, String hasta) {
        return construirResumen(rango(desde, hasta));
    }

    @Transactional
    public List<ProductoDestacadoResponse> topProductos(String desde, String hasta, String orden) {
        String filtro = orden == null || orden.isBlank()
                ? "desc"
                : orden.toLowerCase(Locale.ROOT);
        if (!List.of("desc", "asc").contains(filtro)) {
            throw Errores.badRequest("El orden debe ser desc o asc");
        }
        Rango periodo = rango(desde, hasta);
        return aProductos(datos.topProductos(periodo.inicio(), periodo.fin(), "desc".equals(filtro), 10));
    }

    @Transactional
    public MesDashboardResponse mes(String valor) {
        if (valor == null || valor.isBlank()) {
            throw Errores.badRequest("Indica el mes en formato AAAA-MM");
        }
        YearMonth mes;
        try {
            mes = YearMonth.parse(valor.trim(), FORMATO_MES);
        } catch (DateTimeException error) {
            throw Errores.badRequest("El mes no es válido. Usa el formato AAAA-MM");
        }

        Rango periodo = rango(mes.atDay(1), mes.atEndOfMonth());
        return new MesDashboardResponse(
                mes.toString(),
                construirResumen(periodo),
                construirPorDia(periodo),
                aProductos(datos.topProductos(periodo.inicio(), periodo.fin(), true, 5)));
    }

    private ResumenDashboardResponse construirResumen(Rango periodo) {
        Object[] fila = datos.resumen(periodo.inicio(), periodo.fin());
        BigDecimal ventas = decimal(fila[0]);
        BigDecimal ganancia = decimal(fila[1]);
        BigDecimal unidades = decimal(fila[2]);
        BigDecimal kilos = decimal(fila[3]);
        long sinCosto = entero(fila[4]);
        long lineas = entero(fila[5]);
        BigDecimal merma = datos.merma(periodo.inicio(), periodo.fin());
        BigDecimal neta = ganancia.subtract(merma).setScale(2, RoundingMode.HALF_UP);

        return new ResumenDashboardResponse(ventas, ganancia, merma, neta,
                unidades, kilos, sinCosto, lineas, periodo.desde(), periodo.hasta());
    }

    private List<PuntoDiarioResponse> construirPorDia(Rango periodo) {
        Map<LocalDate, PuntoDiarioResponse> dias = new TreeMap<>();
        for (Object[] fila : datos.ventasPorDia(periodo.inicio(), periodo.fin())) {
            LocalDate dia = aFecha(fila[0]);
            dias.put(dia, new PuntoDiarioResponse(dia.toString(), decimal(fila[1]), decimal(fila[2]),
                    BigDecimal.ZERO));
        }
        for (Object[] fila : datos.mermaPorDia(periodo.inicio(), periodo.fin())) {
            LocalDate dia = aFecha(fila[0]);
            PuntoDiarioResponse actual = dias.get(dia);
            BigDecimal perdida = decimal(fila[1]);
            if (actual == null) {
                dias.put(dia, new PuntoDiarioResponse(dia.toString(), BigDecimal.ZERO,
                        BigDecimal.ZERO, perdida));
            } else {
                dias.put(dia, new PuntoDiarioResponse(actual.dia(), actual.ventas(),
                        actual.ganancia(), perdida));
            }
        }
        return new ArrayList<>(dias.values());
    }

    private List<ProductoDestacadoResponse> aProductos(List<Object[]> filas) {
        List<ProductoDestacadoResponse> respuesta = new ArrayList<>();
        for (Object[] fila : filas) {
            respuesta.add(new ProductoDestacadoResponse(
                    ((Number) fila[0]).longValue(),
                    String.valueOf(fila[1]),
                    TipoVenta.valueOf(String.valueOf(fila[2])),
                    fila[3] == null ? null : String.valueOf(fila[3]),
                    fila[4] == null ? null : String.valueOf(fila[4]),
                    decimal(fila[5]),
                    decimal(fila[6]),
                    decimal(fila[7])));
        }
        return respuesta;
    }

    private VentaMensualResponse aVentaMensual(String mes, Object[] fila) {
        if (fila == null) {
            return new VentaMensualResponse(mes, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0);
        }
        BigDecimal ganancia = decimal(fila[2]);
        BigDecimal merma = decimal(fila[3]);
        return new VentaMensualResponse(
                mes,
                decimal(fila[1]),
                ganancia,
                merma,
                ganancia.subtract(merma).setScale(2, RoundingMode.HALF_UP),
                decimal(fila[5]),
                decimal(fila[6]),
                entero(fila[7]));
    }

    private Rango rango(String desdeTexto, String hastaTexto) {
        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate desde = desdeTexto == null || desdeTexto.isBlank()
                ? hoy.withDayOfMonth(1)
                : fecha(desdeTexto, "desde");
        LocalDate hasta = hastaTexto == null || hastaTexto.isBlank()
                ? YearMonth.from(desde).atEndOfMonth()
                : fecha(hastaTexto, "hasta");
        return rango(desde, hasta);
    }

    private Rango rango(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw Errores.badRequest("La fecha hasta debe ser posterior o igual a la fecha desde");
        }
        Timestamp inicio = Timestamp.from(desde.atStartOfDay(ZONA).toInstant());
        Timestamp fin = Timestamp.from(hasta.plusDays(1).atStartOfDay(ZONA).toInstant());
        return new Rango(desde.toString(), hasta.toString(), inicio, fin);
    }

    private LocalDate fecha(String valor, String nombre) {
        try {
            return LocalDate.parse(valor.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeException error) {
            throw Errores.badRequest("La fecha " + nombre + " no es válida. Usa el formato AAAA-MM-DD");
        }
    }

    private String aMes(Object valor) {
        return String.valueOf(valor).substring(0, 7);
    }

    private LocalDate aFecha(Object valor) {
        if (valor instanceof Date fechaSql) {
            return fechaSql.toLocalDate();
        }
        if (valor instanceof LocalDate fecha) {
            return fecha;
        }
        return LocalDate.parse(String.valueOf(valor).substring(0, 10));
    }

    private BigDecimal decimal(Object valor) {
        return valor instanceof BigDecimal cantidad
                ? cantidad
                : new BigDecimal(String.valueOf(valor));
    }

    private long entero(Object valor) {
        return valor == null ? 0 : ((Number) valor).longValue();
    }

    private record Rango(String desde, String hasta, Timestamp inicio, Timestamp fin) {
    }
}
