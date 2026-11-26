package com.tuempresa.sistema.clientes;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tuempresa.sistema.common.RolesDePrueba;
import com.tuempresa.sistema.common.security.AuthResourceTest;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ClientesResourceTest {

    private static final String COOKIE = "access_token";

    @Inject
    AgroalDataSource dataSource;

    @AfterEach
    void limpiarRoles() {
        RolesDePrueba.limpiar(dataSource);
    }

    @Test
    void configurarEdificioYnavegarPorNiveles() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");

        if (!edificioConfigurado(token)) {
            given()
                    .cookie(COOKIE, token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"torres\": 0, \"pisosPorTorre\": 1, \"deptosPorPiso\": 1}")
                    .post("/edificio/config")
                    .then()
                    .statusCode(400)
                    .body("message", containsString("valores"));

            given()
                    .cookie(COOKIE, token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"torres\": 2, \"pisosPorTorre\": 2, \"deptosPorPiso\": 3}")
                    .post("/edificio/config")
                    .then()
                    .statusCode(201)
                    .body("configurado", equalTo(true))
                    .body("torres", equalTo(2))
                    .body("pisosPorTorre", equalTo(2))
                    .body("deptosPorPiso", equalTo(3))
                    .body("totalDepartamentos", equalTo(12));
        }

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"torres\": 1, \"pisosPorTorre\": 1, \"deptosPorPiso\": 1}")
                .post("/edificio/config")
                .then()
                .statusCode(409)
                .body("message", containsString("ya fue configurado"));

        JsonPath config = given()
                .cookie(COOKIE, token)
                .get("/edificio/config")
                .then()
                .statusCode(200)
                .body("configurado", equalTo(true))
                .extract()
                .jsonPath();
        int torres = config.getInt("torres");
        int pisos = config.getInt("pisosPorTorre");
        int deptos = config.getInt("deptosPorPiso");

        given()
                .cookie(COOKIE, token)
                .get("/edificio/torres")
                .then()
                .statusCode(200)
                .body("size()", equalTo(torres))
                .body("[0].torre", equalTo(1))
                .body("[0].departamentos", equalTo(pisos * deptos))
                .body("[0].pisos", equalTo(pisos));

        given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos")
                .then()
                .statusCode(200)
                .body("size()", equalTo(pisos))
                .body("[0].piso", equalTo(1))
                .body("[0].departamentos", equalTo(deptos));

        given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos/1/departamentos")
                .then()
                .statusCode(200)
                .body("size()", equalTo(deptos))
                .body("[0].numero", equalTo(101))
                .body("[0].etiqueta", equalTo("Torre 1 Departamento 101"));

        given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/9/pisos/1/departamentos")
                .then()
                .statusCode(404)
                .body("message", containsString("Torre no encontrada"));
    }

    @Test
    void actualizarEdificioConservaDepartamentosYCreaLosNuevos() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        configurarSiHaceFalta(token);
        JsonPath inicial = configuracion(token);
        int torres = inicial.getInt("torres");
        int pisos = inicial.getInt("pisosPorTorre");
        int deptos = inicial.getInt("deptosPorPiso");
        int total = inicial.getInt("totalDepartamentos");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"torres": %d, "pisosPorTorre": %d, "deptosPorPiso": %d}
                        """.formatted(torres + 1, pisos, deptos))
                .put("/edificio/config")
                .then()
                .statusCode(200)
                .body("torres", equalTo(torres + 1))
                .body("totalDepartamentos", equalTo(total + pisos * deptos));

        given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos/1/departamentos")
                .then()
                .statusCode(200)
                .body("size()", equalTo(deptos))
                .body("[0].etiqueta", equalTo("Torre 1 Departamento 101"));
    }

    @Test
    void actualizarEdificioNoEliminaDepartamentosConDeudaPendiente() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        Dimensiones actuales = conAlMenosDosDepartamentos(token);
        long productoId = crearProducto(token, "Deuda config " + sufijo(), "5.00", "2.00", "10");
        long departamentoId = ultimoDepartamento(token, actuales.deptos);
        long fiadoId = crearFiado(token, departamentoId, productoId);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"torres": %d, "pisosPorTorre": %d, "deptosPorPiso": %d}
                        """.formatted(actuales.torres, actuales.pisos, actuales.deptos - 1))
                .put("/edificio/config")
                .then()
                .statusCode(409)
                .body("message", containsString("fiados pendientes"))
                .body("message", containsString("Torre 1 Departamento " + (100 + actuales.deptos)));

        given()
                .cookie(COOKIE, token)
                .patch("/fiados/{id}/pagar", fiadoId)
                .then()
                .statusCode(200);
    }

    @Test
    void actualizarEdificioBorraFiadosPagadosDeLosDepartamentosQuitados() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        Dimensiones actuales = conAlMenosDosDepartamentos(token);
        long productoId = crearProducto(token, "Fiado quitado " + sufijo(), "5.00", "2.00", "10");
        long departamentoId = ultimoDepartamento(token, actuales.deptos);
        long fiadoId = crearFiado(token, departamentoId, productoId);

        given()
                .cookie(COOKIE, token)
                .patch("/fiados/{id}/pagar", fiadoId)
                .then()
                .statusCode(200);
        assertEquals("FIADO", movimientoDe(productoId).get(0));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"torres": %d, "pisosPorTorre": %d, "deptosPorPiso": %d}
                        """.formatted(actuales.torres, actuales.pisos, actuales.deptos - 1))
                .put("/edificio/config")
                .then()
                .statusCode(200)
                .body("deptosPorPiso", equalTo(actuales.deptos - 1));

        given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos/1/departamentos")
                .then()
                .statusCode(200)
                .body("size()", equalTo(actuales.deptos - 1));

        assertEquals(0, contar("select count(*) from fiado where id = ?", fiadoId));
        assertEquals(
                0,
                contar("select count(*) from movimiento_stock where tipo = 'FIADO' and referencia_id = ?", fiadoId));
    }

    private record Dimensiones(int torres, int pisos, int deptos) {
    }

    private JsonPath configuracion(String token) {
        return given()
                .cookie(COOKIE, token)
                .get("/edificio/config")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    private Dimensiones conAlMenosDosDepartamentos(String token) {
        configurarSiHaceFalta(token);
        JsonPath config = configuracion(token);
        int deptos = config.getInt("deptosPorPiso");
        if (deptos >= 2) {
            return new Dimensiones(config.getInt("torres"), config.getInt("pisosPorTorre"), deptos);
        }
        int torres = config.getInt("torres");
        int pisos = config.getInt("pisosPorTorre");
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"torres": %d, "pisosPorTorre": %d, "deptosPorPiso": 2}
                        """.formatted(torres, pisos))
                .put("/edificio/config")
                .then()
                .statusCode(200);
        return new Dimensiones(torres, pisos, 2);
    }

    private long ultimoDepartamento(String token, int deptos) {
        return given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos/1/departamentos")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("[%d].id".formatted(deptos - 1));
    }

    private long crearFiado(String token, long departamentoId, long productoId) {
        return given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"departamentoId": %d, "items": [{"productoId": %d, "cantidad": 1}]}
                        """.formatted(departamentoId, productoId))
                .post("/fiados")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("[0].id");
    }

    private long contar(String sql, long parametro) throws Exception {
        try (Connection conexion = dataSource.getConnection();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, parametro);
            try (ResultSet resultados = consulta.executeQuery()) {
                assertTrue(resultados.next());
                return resultados.getLong(1);
            }
        }
    }

    @Test
    void registrarPagarYconsultarDeudas() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        configurarSiHaceFalta(token);
        String nombre = "Fiado smoke " + sufijo();
        long productoId = crearProducto(token, nombre, "5.00", "2.00", "10");
        long departamentoId = primerDepartamento(token);

        JsonPath creados = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"departamentoId": %d, "items": [{"productoId": %d, "cantidad": 2}]}
                        """.formatted(departamentoId, productoId))
                .post("/fiados")
                .then()
                .statusCode(201)
                .body("size()", equalTo(1))
                .body("[0].nombreProducto", equalTo(nombre))
                .body("[0].tipoVenta", equalTo("UNIDAD"))
                .body("[0].subtotal", equalTo(10.00f))
                .body("[0].estado", equalTo("PENDIENTE"))
                .extract()
                .jsonPath();
        long fiadoId = creados.getLong("[0].id");

        given()
                .cookie(COOKIE, token)
                .get("/departamentos/{id}/fiados", departamentoId)
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1))
                .body("find { it.id == %d }.estado".formatted(fiadoId), equalTo("PENDIENTE"));

        given()
                .cookie(COOKIE, token)
                .queryParam("nivel", "edificio")
                .get("/fiados/deudas")
                .then()
                .statusCode(200)
                .body("[0].etiqueta", equalTo("Torre 1"))
                .body("[0].total", greaterThanOrEqualTo(10.00f));

        given()
                .cookie(COOKIE, token)
                .queryParam("nivel", "torre")
                .queryParam("torre", 1)
                .get("/fiados/deudas")
                .then()
                .statusCode(200)
                .body("[0].etiqueta", containsString("Piso 1"));

        given()
                .cookie(COOKIE, token)
                .queryParam("nivel", "piso")
                .queryParam("torre", 1)
                .queryParam("piso", 1)
                .get("/fiados/deudas")
                .then()
                .statusCode(200)
                .body("[0].etiqueta", equalTo("Torre 1 Departamento 101"))
                .body("[0].departamentos[0].fiados[0].nombreProducto", equalTo(nombre));

        assertEquals("8.000", stockDe(productoId));
        List<String> movimiento = movimientoDe(productoId);
        assertEquals(3, movimiento.size());
        assertEquals("FIADO", movimiento.get(0));
        assertEquals("-2.000", movimiento.get(1));
        assertEquals(String.valueOf(fiadoId), movimiento.get(2));

        given()
                .cookie(COOKIE, token)
                .patch("/fiados/{id}/pagar", fiadoId)
                .then()
                .statusCode(200)
                .body("estado", equalTo("PAGADO"))
                .body("pagadoEn", org.hamcrest.Matchers.notNullValue());

        given()
                .cookie(COOKIE, token)
                .patch("/fiados/{id}/pagar", fiadoId)
                .then()
                .statusCode(409)
                .body("message", containsString("ya está pagado"));

        JsonPath deudas = given()
                .cookie(COOKIE, token)
                .queryParam("nivel", "piso")
                .queryParam("torre", 1)
                .queryParam("piso", 1)
                .get("/fiados/deudas")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        List<Long> pendientes = deudas.getList("departamentos.fiados.id", Long.class);
        assertFalse(pendientes.contains(fiadoId));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"departamentoId": %d, "items": [{"productoId": %d, "cantidad": 99}]}
                        """.formatted(departamentoId, productoId))
                .post("/fiados")
                .then()
                .statusCode(400)
                .body("message", containsString("Stock insuficiente"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"departamentoId": 9999999, "items": [{"productoId": %d, "cantidad": 1}]}
                        """.formatted(productoId))
                .post("/fiados")
                .then()
                .statusCode(404)
                .body("message", containsString("Departamento no encontrado"));

        given()
                .cookie(COOKIE, token)
                .queryParam("nivel", "otro")
                .get("/fiados/deudas")
                .then()
                .statusCode(400)
                .body("message", containsString("nivel"));
    }

    @Test
    void permisosPorModuloSeValidanEnCadaEndpoint() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        configurarSiHaceFalta(tokenAdmin);
        String marca = sufijo();

        String soloClientes = "cli_" + marca;
        crearUsuarioConModulo(tokenAdmin, soloClientes, "CLIENTES");
        String tokenClientes = AuthResourceTest.iniciarSesion(soloClientes, "clave123");

        given()
                .cookie(COOKIE, tokenClientes)
                .get("/edificio/config")
                .then()
                .statusCode(200);
        given()
                .cookie(COOKIE, tokenClientes)
                .get("/fiados/productos")
                .then()
                .statusCode(200);
        given()
                .cookie(COOKIE, tokenClientes)
                .get("/fiados/deudas")
                .then()
                .statusCode(200);

        String soloVenta = "vend_" + marca;
        crearUsuarioConModulo(tokenAdmin, soloVenta, "VENTA");
        String tokenVenta = AuthResourceTest.iniciarSesion(soloVenta, "clave123");

        given()
                .cookie(COOKIE, tokenVenta)
                .get("/edificio/config")
                .then()
                .statusCode(403)
                .body("message", containsString("módulo"));
        given()
                .cookie(COOKIE, tokenVenta)
                .get("/edificio/torres")
                .then()
                .statusCode(403);
        given()
                .cookie(COOKIE, tokenVenta)
                .get("/fiados/productos")
                .then()
                .statusCode(403);
        given()
                .cookie(COOKIE, tokenVenta)
                .get("/fiados/deudas")
                .then()
                .statusCode(403);
        given()
                .cookie(COOKIE, tokenVenta)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"departamentoId\": 1, \"items\": []}")
                .post("/fiados")
                .then()
                .statusCode(403);
    }

    private boolean edificioConfigurado(String token) {
        return given()
                .cookie(COOKIE, token)
                .get("/edificio/config")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getBoolean("configurado");
    }

    private void configurarSiHaceFalta(String token) {
        if (edificioConfigurado(token)) {
            return;
        }
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"torres\": 1, \"pisosPorTorre\": 1, \"deptosPorPiso\": 3}")
                .post("/edificio/config")
                .then()
                .statusCode(201);
    }

    private long primerDepartamento(String token) {
        return given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos/1/departamentos")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("[0].id");
    }

    private long crearProducto(String token, String nombre, String precio, String costo, String stock) {
        return given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "%s", "categoriaId": null, "tipoVenta": "UNIDAD",
                         "precioVenta": %s, "costoActual": %s, "stock": %s}
                        """.formatted(nombre, precio, costo, stock))
                .post("/productos")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private void crearUsuarioConModulo(String token, String username, String modulo) {
        long rolId = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"nombre\": \"Rol %s\", \"modulos\": [\"%s\"]}".formatted(username, modulo))
                .post("/roles")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"username\": \"%s\", \"password\": \"clave123\", \"rolId\": %d}"
                        .formatted(username, rolId))
                .post("/usuarios")
                .then()
                .statusCode(201);
    }

    private String stockDe(long productoId) throws Exception {
        try (Connection conexion = dataSource.getConnection();
                PreparedStatement consulta = conexion.prepareStatement(
                        "select stock from producto where id = ?")) {
            consulta.setLong(1, productoId);
            try (ResultSet resultados = consulta.executeQuery()) {
                assertTrue(resultados.next());
                return resultados.getString(1);
            }
        }
    }

    private List<String> movimientoDe(long productoId) throws Exception {
        try (Connection conexion = dataSource.getConnection();
                PreparedStatement consulta = conexion.prepareStatement(
                        "select tipo, cantidad::text, referencia_id from movimiento_stock "
                                + "where producto_id = ? and tipo = 'FIADO' order by id desc limit 1")) {
            consulta.setLong(1, productoId);
            try (ResultSet resultados = consulta.executeQuery()) {
                assertTrue(resultados.next());
                return List.of(resultados.getString(1), resultados.getString(2), resultados.getString(3));
            }
        }
    }

    private String sufijo() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
