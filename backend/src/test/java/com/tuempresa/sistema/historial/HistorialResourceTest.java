package com.tuempresa.sistema.historial;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tuempresa.sistema.common.RolesDePrueba;
import com.tuempresa.sistema.common.security.AuthResourceTest;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class HistorialResourceTest {

    private static final String COOKIE = "access_token";

    @Inject
    AgroalDataSource dataSource;

    @AfterEach
    void limpiarRoles() {
        RolesDePrueba.limpiar(dataSource);
    }

    @Test
    void listadoEstaOrdenadoYPaginado() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long producto = crearProducto(token, "Historial " + sufijo(), "UNIDAD", "6.00", "4.00", "30", null);
        crearCajaConVenta(token, producto, "1");
        crearCajaConVenta(token, producto, "1");
        crearCajaConVenta(token, producto, "1");

        JsonPath primera = given()
                .cookie(COOKIE, token)
                .queryParam("page", 0)
                .queryParam("size", 2)
                .get("/historial/cajas")
                .then()
                .statusCode(200)
                .body("page", equalTo(0))
                .body("size", equalTo(2))
                .body("items.size()", equalTo(2))
                .body("total", greaterThanOrEqualTo(3))
                .extract()
                .jsonPath();

        JsonPath siguiente = given()
                .cookie(COOKIE, token)
                .queryParam("page", 1)
                .queryParam("size", 2)
                .get("/historial/cajas")
                .then()
                .statusCode(200)
                .body("page", equalTo(1))
                .body("size", equalTo(2))
                .extract()
                .jsonPath();

        List<Long> idsPrimera = primera.getList("items.cajaId", Long.class);
        List<Long> idsSiguiente = siguiente.getList("items.cajaId", Long.class);
        assertTrue(idsPrimera.get(0) > idsPrimera.get(1));
        Set<Long> vistos = new HashSet<>(idsPrimera);
        assertTrue(idsSiguiente.stream().noneMatch(vistos::contains));

        given()
                .cookie(COOKIE, token)
                .queryParam("page", -1)
                .get("/historial/cajas")
                .then()
                .statusCode(400)
                .body("message", containsString("paginación"));

        given()
                .cookie(COOKIE, token)
                .queryParam("size", 0)
                .get("/historial/cajas")
                .then()
                .statusCode(400);
    }

    @Test
    void detalleDevuelveElMismoResumenYVentasQueCaja() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String nombre = "Detalle historial " + sufijo();
        long producto = crearProducto(token, nombre, "UNIDAD", "6.00", "4.00", "20", null);
        long cajaId = crearCajaConVenta(token, producto, "2");

        given()
                .cookie(COOKIE, token)
                .get("/historial/cajas/{id}", cajaId)
                .then()
                .statusCode(200)
                .body("resumen.cajaId", equalTo((int) cajaId))
                .body("resumen.abierta", equalTo(false))
                .body("resumen.totalVentas", equalTo(1))
                .body("resumen.totalDinero", equalTo(12.00f))
                .body("resumen.ganancia", equalTo(4.00f))
                .body("resumen.productos.size()", equalTo(1))
                .body("ventas.size()", equalTo(1))
                .body("ventas[0].total", equalTo(12.00f))
                .body("ventas[0].items[0].nombreProducto", equalTo(nombre))
                .body("ventas[0].items[0].costoUnitario", equalTo(4.00f));

        given()
                .cookie(COOKIE, token)
                .get("/historial/cajas/{id}", 9999999L)
                .then()
                .statusCode(404)
                .body("message", containsString("Caja no encontrada"));
    }

    @Test
    void permisosPorModuloSeValidanEnCadaEndpoint() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        long producto = crearProducto(tokenAdmin, "Permisos hist " + sufijo(), "UNIDAD", "5.00", null, "5", null);
        long cajaId = crearCajaConVenta(tokenAdmin, producto, "1");
        String marca = sufijo();

        String soloHistorial = "hist_" + marca;
        crearUsuarioConModulo(tokenAdmin, soloHistorial, "HISTORIAL");
        String tokenHistorial = AuthResourceTest.iniciarSesion(soloHistorial, "clave123");

        given()
                .cookie(COOKIE, tokenHistorial)
                .get("/historial/cajas")
                .then()
                .statusCode(200);

        given()
                .cookie(COOKIE, tokenHistorial)
                .get("/historial/cajas/{id}", cajaId)
                .then()
                .statusCode(200)
                .body("resumen.cajaId", equalTo((int) cajaId));

        String soloCaja = "cajah_" + marca;
        crearUsuarioConModulo(tokenAdmin, soloCaja, "CAJA");
        String tokenCaja = AuthResourceTest.iniciarSesion(soloCaja, "clave123");

        given()
                .cookie(COOKIE, tokenCaja)
                .get("/historial/cajas")
                .then()
                .statusCode(403)
                .body("message", containsString("módulo"));

        given()
                .cookie(COOKIE, tokenCaja)
                .get("/historial/cajas/{id}", cajaId)
                .then()
                .statusCode(403);
    }

    private long crearCajaConVenta(String token, long productoId, String cantidad) {
        given().cookie(COOKIE, token).post("/caja/cerrar");
        long id = given()
                .cookie(COOKIE, token)
                .post("/caja/abrir")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("cajaId");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "items": [{"productoId": %d, "cantidad": %s}],
                          "metodoPago": "EFECTIVO",
                          "efectivoRecibido": 100.00
                        }
                        """.formatted(productoId, cantidad))
                .post("/ventas")
                .then()
                .statusCode(201);

        given().cookie(COOKIE, token).post("/caja/cerrar").then().statusCode(200);
        return id;
    }

    private void crearUsuarioConModulo(String token, String username, String modulo) {
        String rol = "Rol " + username;
        long rolId = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "%s", "modulos": ["%s"]}
                        """.formatted(rol, modulo))
                .post("/roles")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(username, rolId))
                .post("/usuarios")
                .then()
                .statusCode(201);
    }

    private long crearProducto(String token, String nombre, String tipo, String precio,
            String costo, String stock, Long categoriaId) {
        String categoria = categoriaId == null ? "null" : String.valueOf(categoriaId);
        String costoValor = costo == null ? "null" : costo;
        return given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "nombre": "%s", "categoriaId": %s, "tipoVenta": "%s",
                          "precioVenta": %s, "costoActual": %s, "stock": %s
                        }
                        """.formatted(nombre, categoria, tipo, precio, costoValor, stock))
                .post("/productos")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private String sufijo() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
