import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { createSede, deleteSede, getSedes, updateSede } from '../api/api.js';
import { Modal } from '../components/Modal.jsx';

const emptyForm = { nombre: '', direccion: '', telefono: '' };

export function SedesPage() {
  const [sedes, setSedes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await getSedes();
    setSedes(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateSede(editingId, form);
      } else {
        await createSede(form);
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
    if (!window.confirm('Esto eliminara la sede y todo lo relacionado. Deseas continuar?')) return;
    try {
      await deleteSede(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ nombre: item.nombre, direccion: item.direccion || '', telefono: item.telefono || '' });
    setOpenModal(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpenModal(true);
  }

  return (
    <section>
      <h2>Sedes</h2>
      <p className="page-subtitle">Gestion de ubicaciones donde se distribuyen y venden productos.</p>
      {error && <p className="error-msg">{error}</p>}

      <div className="section-actions">
        <button type="button" onClick={startCreate}><Plus size={16} /> Nueva Sede</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Direccion</th><th>Telefono</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sedes.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.nombre}</td>
              <td>{s.direccion}</td>
              <td>{s.telefono}</td>
              <td>
                <button onClick={() => startEdit(s)}><Pencil size={14} /> Editar</button>
                <button className="danger" onClick={() => onDelete(s.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openModal && (
        <Modal
          title={editingId ? 'Editar Sede' : 'Nueva Sede'}
          onClose={() => setOpenModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} required />
            <input placeholder="Direccion" value={form.direccion} onChange={(e) => setForm((s) => ({ ...s, direccion: e.target.value }))} />
            <input placeholder="Telefono" value={form.telefono} onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))} />
            <button type="submit">{editingId ? 'Guardar Cambios' : 'Crear Sede'}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
