import { useEffect, useState } from 'react';
import {
  ajusteInventario,
  deleteInventarioRegistro,
  getInventario,
  getMovimientos,
  getProductos,
  getSedes,
  setInventarioMinimo
} from '../api/api.js';
import { formatCantidad } from '../utils/format.js';

export function InventarioPage() {
  const [inventario, setInventario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [ajuste, setAjuste] = useState({ sede_id: '', producto_id: '', cantidad_nueva: '', referencia: '' });
  const [error, setError] = useState('');

  const sedeSeleccionada = ajuste.sede_id ? Number(ajuste.sede_id) : null;
  const productosPorSede = sedeSeleccionada
    ? inventario.filter((i) => Number(i.sede_id) === sedeSeleccionada)
    : [];

  async function loadData() {
    const [inv, mov, sed, prod] = await Promise.all([
      getInventario(sedeFiltro || null),
      getMovimientos(),
      getSedes(),
      getProductos()
    ]);
    setInventario(inv);
    setMovimientos(mov);
    setSedes(sed);
    setProductos(prod);
  }

  useEffect(() => {
    loadData().catch((e) => setError(e.response?.data?.error || e.message));
  }, [sedeFiltro]);

  async function actualizarMinimo(id, value) {
    try {
      await setInventarioMinimo(id, Number(value));
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function onDeleteInventario(id, sede, producto) {
    if (!window.confirm(`Esto eliminara el producto ${producto} de la sede ${sede}. Deseas continuar?`)) return;
    try {
      await deleteInventarioRegistro(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function onSubmitAjuste(e) {
    e.preventDefault();
    setError('');
    try {
      const sedeId = Number(ajuste.sede_id);
      const productoId = Number(ajuste.producto_id);
      const cantidadNueva = Number(ajuste.cantidad_nueva);

      const registro = inventario.find(
        (item) => Number(item.sede_id) === sedeId && Number(item.producto_id) === productoId
      );

      if (!registro) {
        setError('No se encontro el producto en el inventario de la sede seleccionada.');
        return;
      }

      const cantidadDelta = cantidadNueva - Number(registro.cantidad_actual);

      await ajusteInventario({
        sede_id: sedeId,
        producto_id: productoId,
        cantidad_delta: cantidadDelta,
        referencia: ajuste.referencia
      });
      setAjuste({ sede_id: '', producto_id: '', cantidad_nueva: '', referencia: '' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <section>
      <h2>Inventario por Sede</h2>
      <p className="page-subtitle">Control por sede, ajustes manuales por ventas y seguimiento de movimientos.</p>
      {error && <p className="error-msg">{error}</p>}

      <label>
        Filtrar por sede:
        <select value={sedeFiltro} onChange={(e) => setSedeFiltro(e.target.value)}>
          <option value="">Todas</option>
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </label>

      <table>
        <thead>
          <tr>
            <th>Sede</th><th>Producto</th><th>Actual</th><th>Minimo</th><th>Stock bajo</th><th>Editar minimo</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {inventario.map((i) => (
            <tr key={i.id} className={i.stock_bajo ? 'low-stock' : ''}>
              <td>{i.sede}</td>
              <td>{i.producto}</td>
              <td>{formatCantidad(i.cantidad_actual)}</td>
              <td>{formatCantidad(i.cantidad_minima)}</td>
              <td>{i.stock_bajo ? 'Si' : 'No'}</td>
              <td>
                <input
                  type="number"
                  defaultValue={i.cantidad_minima}
                  onBlur={(e) => actualizarMinimo(i.id, e.target.value)}
                />
              </td>
              <td>
                <button
                  className="danger"
                  onClick={() => onDeleteInventario(i.id, i.sede, i.producto)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <article className="panel">
        <h3>Actualizar inventario por ventas</h3>
        <p className="form-hint">
          Escribe el nuevo total que debe quedar en inventario para la sede y producto seleccionados.
        </p>
        {sedeSeleccionada && (
          <p className="form-hint">
            Productos disponibles para esta sede: {productosPorSede.length}
          </p>
        )}
        <form className="form-grid" onSubmit={onSubmitAjuste}>
          <select
            value={ajuste.sede_id}
            onChange={(e) => setAjuste((s) => ({ ...s, sede_id: e.target.value, producto_id: '' }))}
            required
          >
            <option value="">Selecciona sede</option>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select
            value={ajuste.producto_id}
            onChange={(e) => setAjuste((s) => ({ ...s, producto_id: e.target.value }))}
            required
            disabled={!sedeSeleccionada}
          >
            <option value="">{sedeSeleccionada ? 'Selecciona producto' : 'Selecciona sede primero'}</option>
            {productosPorSede
              .reduce((acc, item) => {
                if (!acc.has(item.producto_id)) {
                  acc.set(item.producto_id, item.producto);
                }
                return acc;
              }, new Map())
              .entries()
              .map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
          </select>
          <input
            type="number"
            placeholder="Nuevo total en inventario"
            value={ajuste.cantidad_nueva}
            onChange={(e) => setAjuste((s) => ({ ...s, cantidad_nueva: e.target.value }))}
            required
          />
          <input
            placeholder="Referencia de la venta (ej. cierre diario)"
            value={ajuste.referencia}
            onChange={(e) => setAjuste((s) => ({ ...s, referencia: e.target.value }))}
            required
          />
          <button type="submit">Actualizar Inventario</button>
        </form>
      </article>

      <article className="panel">
        <h3>Movimientos recientes</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Sede</th><th>Producto</th><th>Tipo</th><th>Delta</th><th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.fecha).toLocaleString()}</td>
                <td>{m.sede}</td>
                <td>{m.producto}</td>
                <td>{m.tipo}</td>
                <td>{formatCantidad(m.cantidad_delta)}</td>
                <td>{m.referencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
