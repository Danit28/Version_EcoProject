import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { query, withTransaction } from '../db/query.js';

export const apiRouter = Router();

apiRouter.get('/dashboard/resumen', async (_req, res, next) => {
  try {
    const [materias, productos, sedes, inventario, inventarioCentral] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM materia_prima'),
      query('SELECT COUNT(*)::int AS total FROM producto'),
      query('SELECT COUNT(*)::int AS total FROM sede'),
      query('SELECT COALESCE(SUM(cantidad_actual), 0)::int AS total FROM inventario_sede'),
      query('SELECT COALESCE(SUM(cantidad_actual), 0)::int AS total FROM inventario_central')
    ]);

    res.json({
      materiasPrimas: materias.rows[0].total,
      productos: productos.rows[0].total,
      sedes: sedes.rows[0].total,
      unidadesInventario: inventario.rows[0].total,
      unidadesInventarioCentral: inventarioCentral.rows[0].total
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/alertas', async (_req, res, next) => {
  try {
    const [materias, productos] = await Promise.all([
      query('SELECT * FROM vw_alertas_materia_prima_baja ORDER BY diferencia DESC'),
      query('SELECT * FROM vw_alertas_producto_sede_bajo ORDER BY diferencia DESC')
    ]);

    res.json({
      materiaPrimaBaja: materias.rows,
      productosBajosPorSede: productos.rows
    });
  } catch (error) {
    next(error);
  }
});

// Materias primas
apiRouter.get('/materias-primas', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM materia_prima WHERE activo = TRUE ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/materias-primas', async (req, res, next) => {
  try {
    const { nombre, unidad_medida, cantidad_disponible, nivel_minimo } = req.body;

    const result = await query(
      `INSERT INTO materia_prima (nombre, unidad_medida, cantidad_disponible, nivel_minimo, activo, deleted_at)
       VALUES ($1, $2, $3, $4, TRUE, NULL)
       RETURNING *`,
      [nombre, unidad_medida, cantidad_disponible, nivel_minimo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/materias-primas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, unidad_medida, cantidad_disponible, nivel_minimo } = req.body;

    const result = await query(
      `UPDATE materia_prima
       SET nombre = $1,
           unidad_medida = $2,
           cantidad_disponible = $3,
           nivel_minimo = $4
       WHERE id = $5
       RETURNING *`,
      [nombre, unidad_medida, cantidad_disponible, nivel_minimo, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Materia prima no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/materias-primas/:id/abastecer', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cantidadAgregar = Number(req.body?.cantidad_agregar);

    if (!Number.isFinite(cantidadAgregar) || cantidadAgregar <= 0) {
      return res.status(400).json({ error: 'Cantidad a agregar invalida' });
    }

    const result = await query(
      `UPDATE materia_prima
       SET cantidad_disponible = cantidad_disponible + $1
       WHERE id = $2 AND activo = TRUE
       RETURNING *`,
      [cantidadAgregar, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Materia prima no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/materias-primas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const existe = await query('SELECT id FROM materia_prima WHERE id = $1', [id]);
    if (!existe.rowCount) {
      return res.status(404).json({ error: 'Materia prima no encontrada' });
    }

    const usada = await query(
      'SELECT COUNT(*)::int AS total FROM detalle_formula WHERE materia_prima_id = $1',
      [id]
    );

    if (usada.rows[0].total > 0) {
      return res.status(409).json({
        error: 'No se puede retirar. La materia prima esta asociada a una o mas formulas activas.'
      });
    }

    const conHistorial = await query(
      `SELECT EXISTS (
          SELECT 1 FROM produccion_consumo WHERE materia_prima_id = $1
      ) AS tiene_historial`,
      [id]
    );

    if (conHistorial.rows[0].tiene_historial) {
      await query(
        `UPDATE materia_prima
         SET activo = FALSE,
             deleted_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      return res.status(200).json({
        ok: true,
        mode: 'inactivado',
        message: 'Materia prima retirada del catalogo. Se conserva historial de consumo.'
      });
    }

    const result = await query('DELETE FROM materia_prima WHERE id = $1 RETURNING id', [id]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Materia prima no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/materias-primas/:id/historial', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await query(
      `SELECT *
       FROM materia_prima_historial
       WHERE materia_prima_id = $1
       ORDER BY fecha_cambio DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Productos
apiRouter.get('/productos', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM producto WHERE activo = TRUE ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/productos', async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const result = await query(
      `INSERT INTO producto (nombre, descripcion, activo, deleted_at)
       VALUES ($1, $2, TRUE, NULL)
       RETURNING *`,
      [nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/productos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, descripcion } = req.body;

    const result = await query(
      `UPDATE producto
       SET nombre = $1,
           descripcion = $2
       WHERE id = $3
       RETURNING *`,
      [nombre, descripcion, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/productos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const existe = await query('SELECT id FROM producto WHERE id = $1', [id]);
    if (!existe.rowCount) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await query('DELETE FROM detalle_formula WHERE producto_id = $1', [id]);

    const conHistorial = await query(
      `SELECT EXISTS (
          SELECT 1 FROM produccion WHERE producto_id = $1
      ) OR EXISTS (
          SELECT 1 FROM inventario_movimiento WHERE producto_id = $1
      ) OR EXISTS (
          SELECT 1 FROM inventario_sede WHERE producto_id = $1
      ) OR EXISTS (
          SELECT 1 FROM inventario_central WHERE producto_id = $1
      ) AS tiene_historial`,
      [id]
    );

    if (conHistorial.rows[0].tiene_historial) {
      await query(
        `UPDATE producto
         SET activo = FALSE,
             deleted_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      return res.status(200).json({
        ok: true,
        mode: 'inactivado',
        message: 'Producto retirado del catalogo y formulas. Se conserva historial.'
      });
    }

    const result = await query('DELETE FROM producto WHERE id = $1 RETURNING id', [id]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Sedes
apiRouter.get('/sedes', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM sede ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/sedes', async (req, res, next) => {
  try {
    const { nombre, direccion, telefono } = req.body;
    const result = await query(
      `INSERT INTO sede (nombre, direccion, telefono)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, direccion, telefono]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/sedes/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, direccion, telefono } = req.body;

    const result = await query(
      `UPDATE sede
       SET nombre = $1,
           direccion = $2,
           telefono = $3
       WHERE id = $4
       RETURNING *`,
      [nombre, direccion, telefono, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/sedes/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existe = await query('SELECT id FROM sede WHERE id = $1', [id]);
    if (!existe.rowCount) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    const conHistorial = await query(
      `SELECT EXISTS (
          SELECT 1 FROM inventario_sede WHERE sede_id = $1
      ) OR EXISTS (
          SELECT 1 FROM inventario_movimiento WHERE sede_id = $1
      ) OR EXISTS (
          SELECT 1 FROM produccion WHERE sede_id = $1
      ) AS tiene_historial`,
      [id]
    );

    if (conHistorial.rows[0].tiene_historial) {
      return res.status(409).json({
        error: 'No se puede eliminar. La sede tiene inventario o movimientos asociados.'
      });
    }

    const result = await query('DELETE FROM sede WHERE id = $1 RETURNING id', [id]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar. La sede tiene inventario o movimientos asociados.'
      });
    }
    next(error);
  }
});

// Formulas
apiRouter.get('/productos/:productoId/formula', async (req, res, next) => {
  try {
    const productoId = Number(req.params.productoId);

    const result = await query(
      `SELECT
          df.id,
          df.producto_id,
          df.materia_prima_id,
          mp.nombre AS materia_prima,
          mp.unidad_medida,
          df.cantidad_requerida
       FROM detalle_formula df
       JOIN materia_prima mp ON mp.id = df.materia_prima_id
       WHERE df.producto_id = $1
       ORDER BY mp.nombre`,
      [productoId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/productos/:productoId/formula', async (req, res, next) => {
  try {
    const productoId = Number(req.params.productoId);
    const detalles = Array.isArray(req.body?.detalles) ? req.body.detalles : [];

    await withTransaction(async (client) => {
      await client.query('DELETE FROM detalle_formula WHERE producto_id = $1', [productoId]);

      for (const detalle of detalles) {
        await client.query(
          `INSERT INTO detalle_formula (producto_id, materia_prima_id, cantidad_requerida)
           VALUES ($1, $2, $3)`,
          [productoId, detalle.materia_prima_id, detalle.cantidad_requerida]
        );
      }
    });

    const result = await query(
      `SELECT
          df.id,
          df.producto_id,
          df.materia_prima_id,
          mp.nombre AS materia_prima,
          mp.unidad_medida,
          df.cantidad_requerida
       FROM detalle_formula df
       JOIN materia_prima mp ON mp.id = df.materia_prima_id
       WHERE df.producto_id = $1
       ORDER BY mp.nombre`,
      [productoId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/productos/formulas/pdf', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT
          p.nombre AS producto,
          mp.nombre AS materia_prima,
          mp.unidad_medida,
          df.cantidad_requerida
       FROM producto p
       JOIN detalle_formula df ON df.producto_id = p.id
       JOIN materia_prima mp ON mp.id = df.materia_prima_id
       WHERE p.activo = TRUE
       ORDER BY p.nombre, mp.nombre`
    );

    const grouped = new Map();
    for (const row of result.rows) {
      if (!grouped.has(row.producto)) {
        grouped.set(row.producto, []);
      }
      grouped.get(row.producto).push(row);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="formulas.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('Formulas de productos', { align: 'center' });
    doc.moveDown(1.2);

    if (grouped.size === 0) {
      doc.fontSize(12).text('Sin formulas registradas.');
      doc.end();
      return;
    }

    for (const [producto, items] of grouped.entries()) {
      doc.fontSize(13).text(producto, { underline: true });
      doc.moveDown(0.5);
      items.forEach((item) => {
        doc
          .fontSize(11)
          .text(`- ${item.materia_prima}: ${item.cantidad_requerida} ${item.unidad_medida}`);
      });
      doc.moveDown(1);
    }

    doc.end();
  } catch (error) {
    next(error);
  }
});

// Inventario por sede
apiRouter.get('/inventario-central', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM vw_inventario_central');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/inventario', async (req, res, next) => {
  try {
    const sedeId = req.query.sede_id ? Number(req.query.sede_id) : null;

    const result = await query(
      `SELECT
          i.id,
          i.sede_id,
          s.nombre AS sede,
          i.producto_id,
          p.nombre AS producto,
          i.cantidad_actual,
          i.cantidad_minima,
          (i.cantidad_actual <= i.cantidad_minima) AS stock_bajo,
          i.updated_at
       FROM inventario_sede i
       JOIN sede s ON s.id = i.sede_id
       JOIN producto p ON p.id = i.producto_id
       WHERE ($1::int IS NULL OR i.sede_id = $1)
       ORDER BY s.nombre, p.nombre`,
      [sedeId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/inventario/:id/minimo', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { cantidad_minima } = req.body;

    const result = await query(
      `UPDATE inventario_sede
       SET cantidad_minima = $1
       WHERE id = $2
       RETURNING *`,
      [cantidad_minima, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Registro de inventario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/inventario/ajustes', async (req, res, next) => {
  try {
    const { sede_id, producto_id, cantidad_delta, referencia } = req.body;
    const sedeId = Number(sede_id);
    const productoId = Number(producto_id);
    const cantidadDelta = Number(cantidad_delta);

    if (!Number.isFinite(sedeId) || !Number.isFinite(productoId) || !Number.isFinite(cantidadDelta)) {
      return res.status(400).json({ error: 'Datos de ajuste invalidos' });
    }

    const result = await query(
      `UPDATE inventario_sede
       SET cantidad_actual = cantidad_actual + $1
       WHERE sede_id = $2 AND producto_id = $3
       RETURNING id`,
      [cantidadDelta, sedeId, productoId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Registro de inventario no encontrado' });
    }

    await query(
      `INSERT INTO inventario_movimiento (sede_id, producto_id, tipo, cantidad_delta, referencia)
       VALUES ($1, $2, 'AJUSTE_MANUAL', $3, $4)`,
      [sedeId, productoId, cantidadDelta, referencia || null]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/inventario/distribuciones', async (req, res, next) => {
  try {
    const { producto_id, sede_id, cantidad, referencia } = req.body;
    await query('SELECT fn_distribuir_desde_central($1, $2, $3, $4)', [
      producto_id,
      sede_id,
      cantidad,
      referencia || null
    ]);

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/inventario/movimientos', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
          m.id,
          m.fecha,
          COALESCE(s.nombre, 'CENTRAL') AS sede,
          p.nombre AS producto,
          m.tipo,
          m.cantidad_delta,
          m.referencia
       FROM inventario_movimiento m
       LEFT JOIN sede s ON s.id = m.sede_id
       JOIN producto p ON p.id = m.producto_id
       ORDER BY m.fecha DESC
       LIMIT 200`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Produccion
apiRouter.post('/produccion', async (req, res, next) => {
  try {
    const { producto_id, cantidad_producida, observacion } = req.body;

    const result = await query(
      'SELECT fn_registrar_produccion($1, $2, $3) AS produccion_id',
      [producto_id, cantidad_producida, observacion || null]
    );

    res.status(201).json({ produccion_id: result.rows[0].produccion_id });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/produccion', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT
          pr.id,
          pr.fecha,
          COALESCE(s.nombre, 'CENTRAL') AS origen,
          p.nombre AS producto,
          pr.cantidad_producida,
          pr.observacion
       FROM produccion pr
       LEFT JOIN sede s ON s.id = pr.sede_id
       JOIN producto p ON p.id = pr.producto_id
       ORDER BY pr.fecha DESC
       LIMIT 200`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});
