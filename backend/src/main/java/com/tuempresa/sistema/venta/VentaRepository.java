package com.tuempresa.sistema.venta;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class VentaRepository implements PanacheRepository<Venta> {

    public List<Venta> listarPorCaja(Long cajaId) {
        return list("cajaId = ?1 order by creadoEn desc, id desc", cajaId);
    }
}
