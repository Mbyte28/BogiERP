package com.tuempresa.sistema.dashboard;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;

/**
 * Consultas de agregación del dashboard. Todas se apoyan en las vistas con
 * snapshots de la migración inicial: nunca se usa el costo actual del producto.
 */
@ApplicationScoped
public class DashboardRepository {

    @Inject
    EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public List<Object[]> mensuales(LocalDate desde, LocalDate hasta) {
        return entityManager.createNativeQuery("""
                        select mes, ventas, ganancia_bruta, perdida_merma, ganancia_neta,
                               unidades, kilos, items_sin_costo
                        from v_resumen_mensual
                        where mes between :desde and :hasta
                        order by mes
                        """)
                .setParameter("desde", desde)
                .setParameter("hasta", hasta)
                .getResultList();
    }

    public Object[] resumen(Timestamp desde, Timestamp hasta) {
        return (Object[]) entityManager.createNativeQuery("""
                        select coalesce(sum(subtotal), 0) as ventas,
                               coalesce(sum(ganancia), 0) as ganancia,
                               coalesce(sum(cantidad) filter (where tipo_venta = 'UNIDAD'), 0) as unidades,
                               coalesce(sum(cantidad) filter (where tipo_venta = 'KILO'), 0) as kilos,
                               coalesce(count(*) filter (where sin_costo), 0) as items_sin_costo,
                               count(*) as lineas
                        from v_lineas_ingreso
                        where fecha >= :desde and fecha < :hasta
                        """)
                .setParameter("desde", desde)
                .setParameter("hasta", hasta)
                .getSingleResult();
    }

    public BigDecimal merma(Timestamp desde, Timestamp hasta) {
        Object valor = entityManager.createNativeQuery("""
                        select coalesce(sum(round(m.cantidad * coalesce(m.costo_unitario, 0), 2)), 0)
                        from merma m
                        where m.creado_en >= :desde and m.creado_en < :hasta
                        """)
                .setParameter("desde", desde)
                .setParameter("hasta", hasta)
                .getSingleResult();
        return decimal(valor);
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> topProductos(Timestamp desde, Timestamp hasta, boolean descendente, int limite) {
        String consulta = """
                select p.id,
                       coalesce(max(i.nombre_producto), p.nombre) as nombre,
                       coalesce(max(i.tipo_venta), p.tipo_venta) as tipo_venta,
                       p.imagen,
                       cat.icono,
                       coalesce(sum(i.cantidad), 0) as cantidad_total,
                       coalesce(sum(i.subtotal), 0) as ventas_total,
                       coalesce(sum(i.ganancia), 0) as ganancia_total
                from producto p
                left join categoria cat on cat.id = p.categoria_id
                left join v_lineas_ingreso i
                       on i.producto_id = p.id
                      and i.fecha >= :desde
                      and i.fecha < :hasta
                where p.activo
                group by p.id, p.nombre, p.tipo_venta, p.imagen, cat.icono
                """ + (descendente
                ? "having coalesce(sum(i.cantidad), 0) > 0 "
                        + "order by cantidad_total desc, nombre limit :limite"
                : "order by cantidad_total asc, nombre limit :limite");

        return entityManager.createNativeQuery(consulta)
                .setParameter("desde", desde)
                .setParameter("hasta", hasta)
                .setParameter("limite", limite)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> ventasPorDia(Timestamp desde, Timestamp hasta) {
        return entityManager.createNativeQuery("""
                        select date(i.fecha at time zone 'America/Lima') as dia,
                               coalesce(sum(i.subtotal), 0) as ventas,
                               coalesce(sum(i.ganancia), 0) as ganancia
                        from v_lineas_ingreso i
                        where i.fecha >= :desde and i.fecha < :hasta
                        group by 1
                        order by 1
                        """)
                .setParameter("desde", desde)
                .setParameter("hasta", hasta)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> mermaPorDia(Timestamp desde, Timestamp hasta) {
        return entityManager.createNativeQuery("""
                        select date(m.creado_en at time zone 'America/Lima') as dia,
                               coalesce(sum(round(m.cantidad * coalesce(m.costo_unitario, 0), 2)), 0) as perdida
                        from merma m
                        where m.creado_en >= :desde and m.creado_en < :hasta
                        group by 1
                        order by 1
                        """)
                .setParameter("desde", desde)
                .setParameter("hasta", hasta)
                .getResultList();
    }

    private BigDecimal decimal(Object valor) {
        return valor instanceof BigDecimal cantidad ? cantidad : new BigDecimal(String.valueOf(valor));
    }
}
