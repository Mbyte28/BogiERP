package com.tuempresa.sistema.historial;

import com.tuempresa.sistema.caja.Caja;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class HistorialRepository implements PanacheRepository<Caja> {

    private static final String COLUMNAS = "caja_id, abierta_en, cerrada_en, abierta, "
            + "total_ventas, total_dinero, total_efectivo, total_transferencia, "
            + "total_unidades, total_kilos, total_lineas, ganancia, items_sin_costo";

    @SuppressWarnings("unchecked")
    public List<Object[]> listar(int page, int size) {
        return getEntityManager()
                .createNativeQuery("select " + COLUMNAS + " from v_caja_resumen "
                        + "order by abierta_en desc, caja_id desc")
                .setFirstResult(page * size)
                .setMaxResults(size)
                .getResultList();
    }
}
