import { useEffect, useState } from 'react';
import {
  distribuirInventario,
  getInventarioCentral,
  getProductos,
  getSedes
} from '../api/api.js';
import { formatCantidad } from '../utils/format.js';

export function DistribucionPage() {
  const [inventarioCentral, setInventarioCentral] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [form, setForm] = useState({ producto_id: '', sede_id: '', cantidad: '', referencia: '' });
  const [error, setError] = useState('');

  async function loadData() {
    const [invCentral, prod, sed] = await Promise.all([
      getInventarioCentral(),
      getProductos(),
      getSedes()
    ]);

    setInventarioCentral(invCentral);
    setProductos(prod);
    setSedes(sed);
  }

  useEffect(() => {
    loadData().catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      await distribuirInventario({
        producto_id: Number(form.producto_id),
        sede_id: Number(form.sede_id),
        cantidad: Number(form.cantidad),
        referencia: form.referencia
      });

      setForm({ producto_id: '', sede_id: '', cantidad: '', referencia: '' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message);
    }
  }

  return (
    <section>
      <h2>Distribucion desde Central</h2>
      <p className="page-subtitle">Asigna producto terminado desde inventario central hacia cada sede.</p>
      {error && <p className="error-msg">{error}</p>}

      <article className="panel">
        <h3>Inventario Central</h3>
        <table>
          <thead>
            <tr>
              <th>Producto</th><th>Cantidad central</th><th>Ultima actualizacion</th>
            </tr>
          </thead>
          <tbody>
            {inventarioCentral.map((i) => (
              <tr key={i.id}>
                <td>{i.producto}</td>
                <td>{formatCantidad(i.cantidad_actual)}</td>
                <td>{new Date(i.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {inventarioCentral.length === 0 && (
              <tr>
                <td colSpan="3">Sin inventario central registrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <article className="panel">
        <h3>Enviar producto a sede</h3>
        <form className="form-grid" onSubmit={onSubmit}>
          <select
            value={form.producto_id}
            onChange={(e) => setForm((s) => ({ ...s, producto_id: e.target.value }))}
            required
          >
            <option value="">Selecciona producto</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select
            value={form.sede_id}
            onChange={(e) => setForm((s) => ({ ...s, sede_id: e.target.value }))}
            required
          >
            <option value="">Selecciona sede</option>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <input
            type="number"
            min="1"
            value={form.cantidad}
            onChange={(e) => setForm((s) => ({ ...s, cantidad: e.target.value }))}
            required
          />
          <input
            placeholder="Referencia"
            value={form.referencia}
            onChange={(e) => setForm((s) => ({ ...s, referencia: e.target.value }))}
            required
          />
          <button type="submit">Distribuir</button>
        </form>
      </article>
    </section>
  );
}
