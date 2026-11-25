package com.tuempresa.sistema.common.security;

import com.tuempresa.sistema.cuentas.Rol;
import com.tuempresa.sistema.cuentas.RolRepository;
import com.tuempresa.sistema.cuentas.Usuario;
import com.tuempresa.sistema.cuentas.UsuarioRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Crea el usuario principal la primera vez que arranca el sistema y la tabla
 * de usuarios está vacía.
 */
@ApplicationScoped
public class AdminInicialService {

    private static final Logger LOG = Logger.getLogger(AdminInicialService.class);

    @Inject
    UsuarioRepository usuarios;

    @Inject
    RolRepository roles;

    @ConfigProperty(name = "admin.username", defaultValue = "admin")
    String username;

    @ConfigProperty(name = "admin.password", defaultValue = "")
    String password;

    @Transactional
    public void crearSiHaceFalta() {
        if (usuarios.count() > 0) {
            return;
        }

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            LOG.warn("No se creó el usuario principal: define ADMIN_USERNAME y ADMIN_PASSWORD.");
            return;
        }

        Rol principal = roles.buscarPrincipal().orElse(null);
        if (principal == null) {
            LOG.error("No se creó el usuario principal: falta el rol PRINCIPAL en la base de datos.");
            return;
        }

        Instant ahora = Instant.now();
        Usuario usuario = new Usuario();
        usuario.username = username.trim();
        usuario.passwordHash = BcryptUtil.bcryptHash(password);
        usuario.rol = principal;
        usuario.activo = true;
        usuario.creadoEn = ahora;
        usuario.actualizadoEn = ahora;
        usuario.persist();

        LOG.infof("Usuario principal inicial creado: %s", usuario.username);
    }
}
