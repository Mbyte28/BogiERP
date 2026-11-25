package com.tuempresa.sistema.clientes;

import com.tuempresa.sistema.clientes.dto.ConfigEdificioResponse;
import com.tuempresa.sistema.clientes.dto.DatosConfigEdificio;
import com.tuempresa.sistema.clientes.dto.DepartamentoResponse;
import com.tuempresa.sistema.clientes.dto.PisoResponse;
import com.tuempresa.sistema.clientes.dto.TorreResponse;
import com.tuempresa.sistema.common.error.Errores;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class EdificioService {

    private static final Short ID_CONFIGURACION = 1;
    private static final int MAXIMO_DEPARTAMENTOS = 10000;

    @Inject
    EntityManager entityManager;

    @Inject
    ConfigEdificioRepository configuraciones;

    @Inject
    DepartamentoRepository departamentos;

    @Transactional
    public ConfigEdificioResponse configuracion() {
        return aRespuesta(configuraciones.findById(ID_CONFIGURACION));
    }

    @Transactional
    public ConfigEdificioResponse configurar(DatosConfigEdificio datos) {
        Integer torres = datos.torres();
        Integer pisos = datos.pisosPorTorre();
        Integer deptos = datos.deptosPorPiso();
        if (torres == null || pisos == null || deptos == null
                || torres < 1 || pisos < 1 || deptos < 1 || deptos > 99) {
            throw Errores.badRequest("Los valores deben ser positivos y los departamentos por piso entre 1 y 99");
        }
        if ((long) torres * pisos * deptos > MAXIMO_DEPARTAMENTOS) {
            throw Errores.badRequest("La configuración supera el máximo de 10000 departamentos");
        }
        if (configuraciones.findById(ID_CONFIGURACION) != null) {
            throw Errores.conflict("El edificio ya fue configurado");
        }

        entityManager.createNativeQuery("select fn_configurar_edificio(:torres, :pisos, :deptos)")
                .setParameter("torres", torres)
                .setParameter("pisos", pisos)
                .setParameter("deptos", deptos)
                .getResultList();
        return configuracion();
    }

    @Transactional
    public List<TorreResponse> torres() {
        requerirConfiguracion();
        @SuppressWarnings("unchecked")
        List<Object[]> filas = entityManager.createNativeQuery(
                "select d.torre, count(distinct d.piso), count(distinct d.id), "
                        + "count(distinct f.departamento_id), coalesce(sum(f.subtotal), 0) "
                        + "from departamento d "
                        + "left join v_fiados_pendientes f on f.departamento_id = d.id "
                        + "group by d.torre order by d.torre")
                .getResultList();
        return filas.stream().map(fila -> new TorreResponse(
                entero(fila[0]),
                entero(fila[1]),
                entero(fila[2]),
                entero(fila[3]),
                decimal(fila[4]))).toList();
    }

    @Transactional
    public List<PisoResponse> pisos(int torre) {
        validarUbicacion(torre, null);
        @SuppressWarnings("unchecked")
        List<Object[]> filas = entityManager.createNativeQuery(
                "select d.piso, count(distinct d.id), count(distinct f.departamento_id), "
                        + "coalesce(sum(f.subtotal), 0) "
                        + "from departamento d "
                        + "left join v_fiados_pendientes f on f.departamento_id = d.id "
                        + "where d.torre = :torre group by d.piso order by d.piso")
                .setParameter("torre", torre)
                .getResultList();
        return filas.stream().map(fila -> new PisoResponse(
                entero(fila[0]),
                entero(fila[1]),
                entero(fila[2]),
                decimal(fila[3]))).toList();
    }

    @Transactional
    public List<DepartamentoResponse> departamentos(int torre, int piso) {
        validarUbicacion(torre, piso);
        @SuppressWarnings("unchecked")
        List<Object[]> filas = entityManager.createNativeQuery(
                "select d.id, d.torre, d.piso, d.numero, d.etiqueta, "
                        + "count(f.fiado_id), coalesce(sum(f.subtotal), 0) "
                        + "from departamento d "
                        + "left join v_fiados_pendientes f on f.departamento_id = d.id "
                        + "where d.torre = :torre and d.piso = :piso "
                        + "group by d.id, d.torre, d.piso, d.numero, d.etiqueta "
                        + "order by d.numero")
                .setParameter("torre", torre)
                .setParameter("piso", piso)
                .getResultList();
        return filas.stream().map(fila -> new DepartamentoResponse(
                ((Number) fila[0]).longValue(),
                entero(fila[1]),
                entero(fila[2]),
                entero(fila[3]),
                String.valueOf(fila[4]),
                entero(fila[5]) > 0,
                entero(fila[5]),
                decimal(fila[6]))).toList();
    }

    public void validarUbicacion(Integer torre, Integer piso) {
        ConfigEdificio config = requerirConfiguracion();
        if (torre != null && (torre < 1 || torre > config.torres)) {
            throw Errores.notFound("Torre no encontrada");
        }
        if (piso != null && (piso < 1 || piso > config.pisosPorTorre)) {
            throw Errores.notFound("Piso no encontrado");
        }
    }

    private ConfigEdificio requerirConfiguracion() {
        ConfigEdificio config = configuraciones.findById(ID_CONFIGURACION);
        if (config == null) {
            throw Errores.conflict("Configura el edificio antes de continuar");
        }
        return config;
    }

    private ConfigEdificioResponse aRespuesta(ConfigEdificio config) {
        if (config == null) {
            return new ConfigEdificioResponse(false, null, null, null, 0);
        }
        Long total = departamentos.count();
        return new ConfigEdificioResponse(true, config.torres, config.pisosPorTorre,
                config.deptosPorPiso, total == null ? 0 : total);
    }

    private int entero(Object valor) {
        return valor == null ? 0 : ((Number) valor).intValue();
    }

    private BigDecimal decimal(Object valor) {
        return valor instanceof BigDecimal decimal
                ? decimal
                : new BigDecimal(String.valueOf(valor == null ? 0 : valor));
    }
}
