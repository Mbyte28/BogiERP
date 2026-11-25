package com.tuempresa.sistema.inventario;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class MermaRepository implements PanacheRepository<Merma> {

    /**
     * El mes se calcula en America/Lima, igual que las vistas del dashboard.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> listarPorMes(String mes) {
        return getEntityManager()
                .createNativeQuery(
                        "select m.id, m.producto_id, p.nombre, m.cantidad, m.costo_unitario, "
                                + "m.motivo, m.creado_en, m.usuario_id "
                                + "from merma m join producto p on p.id = m.producto_id "
                                + "where to_char(m.creado_en at time zone 'America/Lima', 'YYYY-MM') = :mes "
                                + "order by m.creado_en desc")
                .setParameter("mes", mes)
                .getResultList();
    }
}
