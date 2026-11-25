package com.tuempresa.sistema.inventario;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.TypedQuery;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class ProductoRepository implements PanacheRepository<Producto> {

    public List<Producto> buscar(String q, Long categoriaId, int page, int size) {
        StringBuilder jpql = new StringBuilder(
                "select p from Producto p left join fetch p.categoria where p.activo = true");
        Map<String, Object> parametros = new HashMap<>();
        if (q != null && !q.isBlank()) {
            jpql.append(" and lower(p.nombre) like :q");
            parametros.put("q", "%" + q.trim().toLowerCase(Locale.ROOT) + "%");
        }
        if (categoriaId != null) {
            jpql.append(" and p.categoria.id = :categoriaId");
            parametros.put("categoriaId", categoriaId);
        }
        jpql.append(" order by lower(p.nombre), p.id");

        TypedQuery<Producto> consulta = getEntityManager().createQuery(jpql.toString(), Producto.class);
        parametros.forEach(consulta::setParameter);
        return consulta.setFirstResult(page * size).setMaxResults(size).getResultList();
    }

    public long contar(String q, Long categoriaId) {
        StringBuilder jpql = new StringBuilder(
                "select count(p) from Producto p where p.activo = true");
        Map<String, Object> parametros = new HashMap<>();
        if (q != null && !q.isBlank()) {
            jpql.append(" and lower(p.nombre) like :q");
            parametros.put("q", "%" + q.trim().toLowerCase(Locale.ROOT) + "%");
        }
        if (categoriaId != null) {
            jpql.append(" and p.categoria.id = :categoriaId");
            parametros.put("categoriaId", categoriaId);
        }

        TypedQuery<Long> consulta = getEntityManager().createQuery(jpql.toString(), Long.class);
        parametros.forEach(consulta::setParameter);
        return consulta.getSingleResult();
    }
}
