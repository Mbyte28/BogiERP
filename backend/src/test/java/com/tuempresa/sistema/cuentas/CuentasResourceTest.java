package com.tuempresa.sistema.cuentas;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tuempresa.sistema.common.security.AuthResourceTest;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CuentasResourceTest {

    private static final String COOKIE = "access_token";

    @Test
    void elPrincipalPuedeListarUsuariosYRoles() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");

        given()
                .cookie(COOKIE, token)
                .get("/usuarios")
                .then()
                .statusCode(200)
                .body("username", hasItem("admin"));

        given()
                .cookie(COOKIE, token)
                .get("/roles")
                .then()
                .statusCode(200)
                .body("nombre", hasItems("PRINCIPAL", "TRABAJADOR"));
    }

    @Test
    void unTrabajadorNoPuedeEntrarAlModuloCuentas() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        long rolTrabajador = idDeRol(tokenAdmin, "TRABAJADOR");
        String username = "trabajador_" + sufijo();

        given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(username, rolTrabajador))
                .post("/usuarios")
                .then()
                .statusCode(201);

        String tokenTrabajador = AuthResourceTest.iniciarSesion(username, "clave123");

        given()
                .cookie(COOKIE, tokenTrabajador)
                .get("/usuarios")
                .then()
                .statusCode(403)
                .body("message", containsString("permiso"));

        given()
                .cookie(COOKIE, tokenTrabajador)
                .get("/roles")
                .then()
                .statusCode(403);
    }

    @Test
    void elTrabajadorRecibeSusModulosEnLaSesion() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        long rolTrabajador = idDeRol(tokenAdmin, "TRABAJADOR");
        String username = "trabajador_" + sufijo();

        given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(username, rolTrabajador))
                .post("/usuarios")
                .then()
                .statusCode(201);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123"}
                        """.formatted(username))
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("principal", equalTo(false))
                .body("modulos", hasItems("VENTA", "CAJA", "HISTORIAL"))
                .body("modulos", not(hasItem("CUENTAS")));
    }

    @Test
    void crearUsuarioDuplicadoDevuelve409() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long rolTrabajador = idDeRol(token, "TRABAJADOR");
        String username = "duplicado_" + sufijo();

        String cuerpo = """
                {"username": "%s", "password": "clave123", "rolId": %d}
                """.formatted(username, rolTrabajador);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .post("/usuarios")
                .then()
                .statusCode(201);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .post("/usuarios")
                .then()
                .statusCode(409);
    }

    @Test
    void crearUsuarioConContrasenaCortaDevuelve400() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long rolTrabajador = idDeRol(token, "TRABAJADOR");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "corto_%s", "password": "123", "rolId": %d}
                        """.formatted(sufijo(), rolTrabajador))
                .post("/usuarios")
                .then()
                .statusCode(400);
    }

    @Test
    void crearRolYActualizarSusModulos() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String nombre = "Supervisor " + sufijo();

        Response creado = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "%s", "modulos": ["INVENTARIO", "VENTA"]}
                        """.formatted(nombre))
                .post("/roles");

        creado.then()
                .statusCode(201)
                .body("nombre", equalTo(nombre))
                .body("esSistema", equalTo(false))
                .body("esPrincipal", equalTo(false))
                .body("modulos", hasItems("INVENTARIO", "VENTA"));

        long rolId = creado.jsonPath().getLong("id");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"modulos": ["CLIENTES", "DASHBOARD"]}
                        """)
                .put("/roles/{id}/modulos", rolId)
                .then()
                .statusCode(200)
                .body("modulos", hasItems("CLIENTES", "DASHBOARD"));

        JsonPath roles = given()
                .cookie(COOKIE, token)
                .get("/roles")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        List<String> nombres = roles.getList("nombre", String.class);
        int indice = nombres.indexOf(nombre);
        assertTrue(indice >= 0);
        List<String> modulos = roles.getList("[" + indice + "].modulos", String.class);
        assertEquals(List.of("CLIENTES", "DASHBOARD"), modulos);
    }

    @Test
    void noSePuedeAsignarElModuloCuentasAUnRolNormal() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "Intruso %s", "modulos": ["CUENTAS"]}
                        """.formatted(sufijo()))
                .post("/roles")
                .then()
                .statusCode(400)
                .body("message", containsString("CUENTAS"));
    }

    @Test
    void noSePuedenCambiarLosModulosDelRolPrincipal() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long rolPrincipal = idDeRol(token, "PRINCIPAL");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"modulos": ["VENTA"]}
                        """)
                .put("/roles/{id}/modulos", rolPrincipal)
                .then()
                .statusCode(400)
                .body("message", containsString("principal"));
    }

    @Test
    void crearRolDuplicadoDevuelve409() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String nombre = "Repetido " + sufijo();
        String cuerpo = """
                {"nombre": "%s", "modulos": []}
                """.formatted(nombre);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .post("/roles")
                .then()
                .statusCode(201);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .post("/roles")
                .then()
                .statusCode(409);
    }

    private long idDeRol(String token, String nombre) {
        JsonPath roles = given()
                .cookie(COOKIE, token)
                .get("/roles")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        List<String> nombres = roles.getList("nombre", String.class);
        int indice = nombres.indexOf(nombre);
        if (indice < 0) {
            throw new IllegalStateException("No existe el rol " + nombre);
        }
        List<Number> ids = roles.getList("id");
        return ids.get(indice).longValue();
    }

    private String sufijo() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
