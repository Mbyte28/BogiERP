package com.tuempresa.sistema.clientes;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ConfigEdificioRepository implements PanacheRepositoryBase<ConfigEdificio, Short> {
}
