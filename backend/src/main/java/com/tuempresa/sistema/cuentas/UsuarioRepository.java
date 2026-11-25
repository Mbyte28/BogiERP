package com.tuempresa.sistema.cuentas;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@ApplicationScoped
public class UsuarioRepository implements PanacheRepository<Usuario> {

    public Optional<Usuario> buscarPorUsername(String username) {
        return find("lower(username) = ?1", username.toLowerCase(Locale.ROOT)).firstResultOptional();
    }

    public boolean existeUsername(String username) {
        return count("lower(username) = ?1", username.toLowerCase(Locale.ROOT)) > 0;
    }

    public List<Usuario> listarConRol() {
        return getEntityManager()
                .createQuery("select u from Usuario u join fetch u.rol order by lower(u.username)", Usuario.class)
                .getResultList();
    }
}
