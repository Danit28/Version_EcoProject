import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import {
  createProducto,
  deleteProducto,
  getFormula,
  getMateriasPrimas,
  getProductos,
  downloadFormulasPdf,
  saveFormula,
  updateProducto
} from '../api/api.js';
import { Modal } from '../components/Modal.jsx';

const emptyForm = { nombre: '', descripcion: '' };

export function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [formula, setFormula] = useState([]);
  const [error, setError] = useState('');

  async function loadBase() {
    const [prods, mats] = await Promise.all([getProductos(), getMateriasPrimas()]);
    setProductos(prods);
    setMaterias(mats);
  }

  useEffect(() => {
    loadBase().catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  async function onSubmitProducto(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateProducto(editingId, form);
      } else {
        await createProducto(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpenModal(false);
      await loadBase();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ nombre: item.nombre, descripcion: item.descripcion || '' });
    setOpenModal(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpenModal(true);
  }

  async function onDelete(id) {
    if (!window.confirm('Esto eliminara el producto y todo lo relacionado. Deseas continuar?')) return;
    try {
      const result = await deleteProducto(id);
      if (productoSeleccionado === id) {
        setProductoSeleccionado(null);
        setFormula([]);
      }
      await loadBase();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function seleccionarProducto(id) {
    setProductoSeleccionado(id);
    try {
      const data = await getFormula(id);
      setFormula(
        data.map((d) => ({
          materia_prima_id: d.materia_prima_id,
          cantidad_requerida: String(d.cantidad_requerida)
        }))
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  function addFormulaRow() {
    if (!materias.length) return;
    setFormula((prev) => [...prev, { materia_prima_id: materias[0].id, cantidad_requerida: '' }]);
  }

  function updateFormulaRow(index, patch) {
    setFormula((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeFormulaRow(index) {
    setFormula((prev) => prev.filter((_row, i) => i !== index));
  }

  async function guardarFormula() {
    if (!productoSeleccionado) return;
    try {
      const detalles = formula.map((row) => ({
        materia_prima_id: row.materia_prima_id,
        cantidad_requerida: Number(row.cantidad_requerida)
      }));

      const invalid = detalles.some((row) => !Number.isFinite(row.cantidad_requerida) || row.cantidad_requerida <= 0);
      if (invalid) {
        setError('Todas las cantidades deben ser mayores a cero.');
        return;
      }

      await saveFormula(productoSeleccionado, detalles);
      alert('Formula guardada');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function descargarFormulasPdf() {
    setError('');
    try {
      const blob = await downloadFormulasPdf();
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `formulas-${fecha}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <section>
      <h2>Productos y Formulas</h2>
      <p className="page-subtitle">Catalogo de productos terminados y receta de consumo de materias primas.</p>
      {error && <p className="error-msg">{error}</p>}

      <div className="section-actions">
        <button type="button" onClick={startCreate}><Plus size={16} /> Nuevo Producto</button>
        <button type="button" onClick={descargarFormulasPdf}>Descargar PDF de formulas</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Descripcion</th><th>Formula</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {[...productos].sort((a, b) => a.id - b.id).map((p, index) => (
            <tr key={p.id} className={productoSeleccionado === p.id ? 'selected' : ''}>
              <td>{index + 1}</td>
              <td>{p.nombre}</td>
              <td>{p.descripcion}</td>
              <td>
                <button onClick={() => seleccionarProducto(p.id)}>Configurar</button>
              </td>
              <td>
                <button onClick={() => startEdit(p)}><Pencil size={14} /> Editar</button>
                <button className="danger" onClick={() => onDelete(p.id)}>Retirar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {productoSeleccionado && (
        <article className="panel">
          <h3>Formula del producto #{productoSeleccionado}</h3>
          <button onClick={addFormulaRow}>Agregar Materia Prima</button>
          <div className="formula-list">
            {formula.map((row, idx) => (
              <div key={idx} className="formula-row">
                <select
                  value={row.materia_prima_id}
                  onChange={(e) => updateFormulaRow(idx, { materia_prima_id: Number(e.target.value) })}
                >
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.unidad_medida})</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={row.cantidad_requerida}
                  onChange={(e) => updateFormulaRow(idx, { cantidad_requerida: e.target.value })}
                />
                <button className="danger" onClick={() => removeFormulaRow(idx)}>Quitar</button>
              </div>
            ))}
          </div>
          <button onClick={guardarFormula}>Guardar Formula</button>
        </article>
      )}

      {openModal && (
        <Modal
          title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
          onClose={() => setOpenModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmitProducto}>
            <input
              placeholder="Nombre del producto"
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              required
            />
            <input
              placeholder="Descripcion"
              value={form.descripcion}
              onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
            />
            <button type="submit">{editingId ? 'Guardar Cambios' : 'Crear Producto'}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
