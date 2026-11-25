package com.tuempresa.sistema.caja;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class CajaRepository implements PanacheRepository<Caja> {

    public Caja findAbierta() {
        return find("cerradaEn is null").firstResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> resumen(Long id) {
        return getEntityManager()
                .createNativeQuery("select c.id, c.abierta_en, c.cerrada_en, "
                        + "r.total_ventas, r.total_dinero, r.total_efectivo, r.total_transferencia, "
                        + "r.total_unidades, r.total_kilos, r.total_lineas, r.ganancia, r.items_sin_costo "
                        + "from caja c join v_caja_resumen r on r.caja_id = c.id where c.id = :id")
                .setParameter("id", id)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> productos(Long id) {
        return getEntityManager()
                .createNativeQuery("select producto_id, nombre_producto, tipo_venta, cantidad_total, "
                        + "ventas_total, ganancia, tiene_items_sin_costo "
                        + "from v_caja_producto where caja_id = :id "
                        + "order by cantidad_total desc, nombre_producto")
                .setParameter("id", id)
                .getResultList();
    }
}
