import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import {
  abastecerMateriaPrima,
  createMateriaPrima,
  deleteMateriaPrima,
  getMateriasPrimas,
  updateMateriaPrima
} from '../api/api.js';
import { Modal } from '../components/Modal.jsx';
import { formatCantidad } from '../utils/format.js';

const unidades = ['kg', 'g', 'lt', 'ml', 'unidad'];

const emptyForm = {
  nombre: '',
  unidad_medida: 'kg',
  cantidad_disponible: 0,
  nivel_minimo: 0
};

export function MateriasPrimasPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [openStockModal, setOpenStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ materia_prima_id: '', cantidad_agregar: 0 });
  const [error, setError] = useState('');

  async function load() {
    const data = await getMateriasPrimas();
    setItems(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await updateMateriaPrima(editingId, form);
      } else {
        await createMateriaPrima(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpenModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Confirmas retirar la materia prima del catalogo?')) return;
    try {
      const result = await deleteMateriaPrima(id);
      if (result?.mode === 'inactivado') {
        alert('Materia prima retirada del catalogo. Se conserva historial de consumo.');
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      unidad_medida: item.unidad_medida,
      cantidad_disponible: Number(item.cantidad_disponible),
      nivel_minimo: Number(item.nivel_minimo)
    });
    setOpenModal(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpenModal(true);
  }

  function startStockAdd() {
    setStockForm({ materia_prima_id: '', cantidad_agregar: 0 });
    setOpenStockModal(true);
  }

  async function onSubmitStock(e) {
    e.preventDefault();
    setError('');

    try {
      await abastecerMateriaPrima(
        Number(stockForm.materia_prima_id),
        Number(stockForm.cantidad_agregar)
      );
      setStockForm({ materia_prima_id: '', cantidad_agregar: 0 });
      setOpenStockModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <section>
      <h2>Materias Primas</h2>
      <p className="page-subtitle">Gestion de ingredientes, unidades y niveles minimos de abastecimiento.</p>
      {error && <p className="error-msg">{error}</p>}

      <div className="section-actions">
        <button type="button" onClick={startCreate}><Plus size={16} /> Nueva Materia Prima</button>
        <button type="button" onClick={startStockAdd}><Plus size={16} /> Agregar Stock</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Unidad</th><th>Disponible</th><th>Minimo</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.id}</td>
              <td>{it.nombre}</td>
              <td>{it.unidad_medida}</td>
              <td>{formatCantidad(it.cantidad_disponible)}</td>
              <td>{formatCantidad(it.nivel_minimo)}</td>
              <td>
                <button onClick={() => startEdit(it)}><Pencil size={14} /> Editar</button>
                <button className="danger" onClick={() => onDelete(it.id)}>Retirar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openModal && (
        <Modal
          title={editingId ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
          onClose={() => setOpenModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="field">
              <span>Nombre de la materia prima</span>
              <input
                placeholder="Ejemplo: Aloe Vera Gel"
                value={form.nombre}
                onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Unidad de medida</span>
              <select
                value={form.unidad_medida}
                onChange={(e) => setForm((s) => ({ ...s, unidad_medida: e.target.value }))}
              >
                {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Cantidad disponible</span>
              <input
                type="number"
                step="0.001"
                placeholder="Ejemplo: 100"
                value={form.cantidad_disponible}
                onChange={(e) => setForm((s) => ({ ...s, cantidad_disponible: Number(e.target.value) }))}
                required
              />
            </label>
            <label className="field">
              <span>Nivel minimo para alerta</span>
              <input
                type="number"
                step="0.001"
                placeholder="Ejemplo: 20"
                value={form.nivel_minimo}
                onChange={(e) => setForm((s) => ({ ...s, nivel_minimo: Number(e.target.value) }))}
                required
              />
            </label>
            <button type="submit">{editingId ? 'Guardar Cambios' : 'Crear Materia Prima'}</button>
          </form>
        </Modal>
      )}

      {openStockModal && (
        <Modal
          title="Agregar stock de materia prima"
          onClose={() => setOpenStockModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmitStock}>
            <label className="field">
              <span>Materia prima</span>
              <select
                value={stockForm.materia_prima_id}
                onChange={(e) => setStockForm((s) => ({ ...s, materia_prima_id: e.target.value }))}
                required
              >
                <option value="">Selecciona una materia prima</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.nombre} ({it.unidad_medida})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cantidad a agregar</span>
              <input
                type="number"
                step="0.001"
                placeholder="Ejemplo: 25"
                value={stockForm.cantidad_agregar}
                onChange={(e) => setStockForm((s) => ({ ...s, cantidad_agregar: e.target.value }))}
                required
              />
            </label>
            <button type="submit">Agregar al inventario</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
