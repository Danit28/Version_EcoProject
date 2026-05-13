import { useEffect, useState } from 'react';
import { getProduccion, getProductos, registrarProduccion } from '../api/api.js';

export function ProduccionPage() {
  const [productos, setProductos] = useState([]);
  const [producciones, setProducciones] = useState([]);
  const [form, setForm] = useState({ producto_id: '', cantidad_producida: 1, observacion: '' });
  const [error, setError] = useState('');

  async function load() {
    const [p, pr] = await Promise.all([getProductos(), getProduccion()]);
    setProductos(p);
    setProducciones(pr);
  }

  useEffect(() => {
    load().catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await registrarProduccion({
        producto_id: Number(form.producto_id),
        cantidad_producida: Number(form.cantidad_producida),
        observacion: form.observacion
      });
      setForm({ producto_id: '', cantidad_producida: 1, observacion: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message);
    }
  }

  return (
    <section>
      <h2>Registro de Produccion</h2>
      <p className="page-subtitle">Produccion central: descuenta materias primas y acumula stock en central.</p>
      <p className="form-hint">Si no hay materia prima suficiente para la formula, el sistema bloqueara el registro.</p>
      {error && <p className="error-msg">{error}</p>}

      <form className="form-grid" onSubmit={onSubmit}>
        <label className="field">
          <span>Producto a producir</span>
          <select value={form.producto_id} onChange={(e) => setForm((s) => ({ ...s, producto_id: e.target.value }))} required>
            <option value="">Selecciona producto</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Cantidad a producir (unidades)</span>
          <input
            type="number"
            min="1"
            placeholder="Ejemplo: 25"
            value={form.cantidad_producida}
            onChange={(e) => setForm((s) => ({ ...s, cantidad_producida: e.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Observacion del lote (opcional)</span>
          <input
            placeholder="Ejemplo: Lote marzo"
            value={form.observacion}
            onChange={(e) => setForm((s) => ({ ...s, observacion: e.target.value }))}
          />
        </label>
        <button type="submit">Registrar Produccion</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Origen</th><th>Producto</th><th>Cantidad</th><th>Observacion</th>
          </tr>
        </thead>
        <tbody>
          {producciones.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.fecha).toLocaleString()}</td>
              <td>{p.origen}</td>
              <td>{p.producto}</td>
              <td>{p.cantidad_producida}</td>
              <td>{p.observacion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
