package com.tuempresa.sistema.dashboard;

import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.dashboard.dto.MesDashboardResponse;
import com.tuempresa.sistema.dashboard.dto.ProductoDestacadoResponse;
import com.tuempresa.sistema.dashboard.dto.ResumenDashboardResponse;
import com.tuempresa.sistema.dashboard.dto.VentaMensualResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/dashboard")
@Authenticated
@RequiereModulo(Modulo.DASHBOARD)
@Produces(MediaType.APPLICATION_JSON)
public class DashboardResource {

    @Inject
    DashboardService servicio;

    @GET
    @Path("/ventas-mensuales")
    public List<VentaMensualResponse> ventasMensuales(
            @QueryParam("meses") Integer meses,
            @QueryParam("anio") Integer anio) {
        return servicio.ventasMensuales(meses, anio);
    }

    @GET
    @Path("/resumen")
    public ResumenDashboardResponse resumen(
            @QueryParam("desde") String desde,
            @QueryParam("hasta") String hasta) {
        return servicio.resumen(desde, hasta);
    }

    @GET
    @Path("/top-productos")
    public List<ProductoDestacadoResponse> topProductos(
            @QueryParam("desde") String desde,
            @QueryParam("hasta") String hasta,
            @QueryParam("orden") @DefaultValue("desc") String orden) {
        return servicio.topProductos(desde, hasta, orden);
    }

    @GET
    @Path("/mes")
    public MesDashboardResponse mes(@QueryParam("mes") String mes) {
        return servicio.mes(mes);
    }
}
