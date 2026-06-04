import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
});

export async function getResumen() {
  const { data } = await api.get('/dashboard/resumen');
  return data;
}

export async function getAlertas() {
  const { data } = await api.get('/alertas');
  return data;
}

export async function getMateriasPrimas() {
  const { data } = await api.get('/materias-primas');
  return data;
}

export async function createMateriaPrima(payload) {
  const { data } = await api.post('/materias-primas', payload);
  return data;
}

export async function updateMateriaPrima(id, payload) {
  const { data } = await api.put(`/materias-primas/${id}`, payload);
  return data;
}

export async function deleteMateriaPrima(id) {
  const { data } = await api.delete(`/materias-primas/${id}`);
  return data;
}

export async function abastecerMateriaPrima(id, cantidad_agregar) {
  const { data } = await api.post(`/materias-primas/${id}/abastecer`, { cantidad_agregar });
  return data;
}

export async function getProductos() {
  const { data } = await api.get('/productos');
  return data;
}

export async function createProducto(payload) {
  const { data } = await api.post('/productos', payload);
  return data;
}

export async function updateProducto(id, payload) {
  const { data } = await api.put(`/productos/${id}`, payload);
  return data;
}

export async function deleteProducto(id) {
  const { data } = await api.delete(`/productos/${id}`);
  return data;
}

export async function getFormula(productoId) {
  const { data } = await api.get(`/productos/${productoId}/formula`);
  return data;
}

export async function saveFormula(productoId, detalles) {
  const { data } = await api.put(`/productos/${productoId}/formula`, { detalles });
  return data;
}

export async function downloadFormulasPdf() {
  const { data } = await api.get('/productos/formulas/pdf', { responseType: 'blob' });
  return data;
}

export async function getSedes() {
  const { data } = await api.get('/sedes');
  return data;
}

export async function createSede(payload) {
  const { data } = await api.post('/sedes', payload);
  return data;
}

export async function updateSede(id, payload) {
  const { data } = await api.put(`/sedes/${id}`, payload);
  return data;
}

export async function deleteSede(id) {
  await api.delete(`/sedes/${id}`);
}

export async function getInventario(sedeId) {
  const { data } = await api.get('/inventario', { params: { sede_id: sedeId || undefined } });
  return data;
}

export async function getInventarioCentral() {
  const { data } = await api.get('/inventario-central');
  return data;
}

export async function setInventarioMinimo(id, cantidad_minima) {
  const { data } = await api.put(`/inventario/${id}/minimo`, { cantidad_minima });
  return data;
}

export async function deleteInventarioRegistro(id) {
  await api.delete(`/inventario/${id}`);
}

export async function ajusteInventario(payload) {
  const { data } = await api.post('/inventario/ajustes', payload);
  return data;
}

export async function distribuirInventario(payload) {
  const { data } = await api.post('/inventario/distribuciones', payload);
  return data;
}

export async function getMovimientos() {
  const { data } = await api.get('/inventario/movimientos');
  return data;
}

export async function registrarProduccion(payload) {
  const { data } = await api.post('/produccion', payload);
  return data;
}

export async function getProduccion() {
  const { data } = await api.get('/produccion');
  return data;
}
