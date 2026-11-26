package com.tuempresa.sistema.cuentas;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@ApplicationScoped
public class RolRepository implements PanacheRepository<Rol> {

    public Optional<Rol> buscarPrincipal() {
        return find("esPrincipal = true").firstResultOptional();
    }

    public List<Rol> listarOrdenados() {
        return find("order by lower(nombre)").list();
    }

    public boolean existeNombre(String nombre) {
        return count("lower(nombre) = ?1", nombre.toLowerCase(Locale.ROOT)) > 0;
    }

    public long contarNoPrincipales() {
        return count("esPrincipal = false");
    }
}
