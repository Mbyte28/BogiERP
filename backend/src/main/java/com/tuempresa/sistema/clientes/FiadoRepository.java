package com.tuempresa.sistema.clientes;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class FiadoRepository implements PanacheRepository<Fiado> {

    public List<Fiado> listarPorDepartamento(Long departamentoId) {
        return list("departamentoId = ?1 order by creadoEn desc, id desc", departamentoId);
    }
}
