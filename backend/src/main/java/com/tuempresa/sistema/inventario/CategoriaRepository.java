package com.tuempresa.sistema.inventario;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Locale;

@ApplicationScoped
public class CategoriaRepository implements PanacheRepository<Categoria> {

    public List<Categoria> listarOrdenadas() {
        return list("order by lower(nombre)");
    }

    public boolean existeNombre(String nombre, Long idExcluido) {
        String jpql = "select count(c) from Categoria c where lower(c.nombre) = :nombre";
        if (idExcluido != null) {
            jpql += " and c.id <> :idExcluido";
        }
        var consulta = getEntityManager().createQuery(jpql, Long.class);
        consulta.setParameter("nombre", nombre.toLowerCase(Locale.ROOT));
        if (idExcluido != null) {
            consulta.setParameter("idExcluido", idExcluido);
        }
        return consulta.getSingleResult() > 0;
    }

    public List<Object[]> contarProductosActivos() {
        return getEntityManager()
                .createQuery(
                        "select p.categoria.id, count(p) from Producto p "
                                + "where p.activo = true and p.categoria is not null "
                                + "group by p.categoria.id",
                        Object[].class)
                .getResultList();
    }
}
