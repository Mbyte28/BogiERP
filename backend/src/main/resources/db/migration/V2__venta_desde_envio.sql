-- Un envío pagado se cierra con una venta finalizada; el vínculo evita
-- contar dos veces el mismo ingreso en el dashboard.

-- Sin FOREIGN KEY: la venta finalizada conserva sus snapshots aunque se
-- reconfigure el edificio y se eliminen los envíos de esos departamentos.
ALTER TABLE venta ADD COLUMN fiado_id BIGINT;
CREATE UNIQUE INDEX idx_venta_fiado ON venta(fiado_id) WHERE fiado_id IS NOT NULL;

CREATE OR REPLACE VIEW v_lineas_ingreso AS
SELECT 'VENTA'::text AS origen,
       vi.producto_id, vi.nombre_producto, vi.tipo_venta,
       vi.cantidad, vi.precio_unitario, vi.costo_unitario, vi.subtotal,
       v.creado_en AS fecha,
       date_trunc('month', v.creado_en AT TIME ZONE 'America/Lima')::date AS mes,
       (vi.costo_unitario IS NULL) AS sin_costo,
       CASE WHEN vi.costo_unitario IS NULL THEN NULL
            ELSE vi.subtotal - round(vi.cantidad * vi.costo_unitario, 2) END AS ganancia
FROM venta_item vi
JOIN venta v ON v.id = vi.venta_id
UNION ALL
SELECT 'FIADO'::text,
       f.producto_id, f.nombre_producto, f.tipo_venta,
       f.cantidad, f.precio_unitario, f.costo_unitario, f.subtotal,
       f.pagado_en,
       date_trunc('month', f.pagado_en AT TIME ZONE 'America/Lima')::date,
       (f.costo_unitario IS NULL),
       CASE WHEN f.costo_unitario IS NULL THEN NULL
            ELSE f.subtotal - round(f.cantidad * f.costo_unitario, 2) END
FROM fiado f
WHERE f.estado = 'PAGADO'
  AND NOT EXISTS (SELECT 1 FROM venta v WHERE v.fiado_id = f.id);
