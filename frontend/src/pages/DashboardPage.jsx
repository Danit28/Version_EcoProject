import { useEffect, useState } from 'react';
import { getAlertas, getResumen } from '../api/api.js';

function severityFromRatio(actual, min) {
  if (!min || min <= 0) return { key: 'ok', label: 'Normal' };
  const ratio = actual / min;
  if (ratio < 0.5) return { key: 'high', label: 'Urgente' };
  if (ratio < 1) return { key: 'mid', label: 'Medio' };
  return { key: 'ok', label: 'Bajo' };
}

export function DashboardPage() {
  const [resumen, setResumen] = useState(null);
  const [alertas, setAlertas] = useState({ materiaPrimaBaja: [], productosBajosPorSede: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [r, a] = await Promise.all([getResumen(), getAlertas()]);
        setResumen(r);
        setAlertas(a);
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      }
    })();
  }, []);

  return (
    <section>
      <h2>Dashboard</h2>
      <p className="page-subtitle">Vista general del estado del inventario y alertas activas.</p>
      {error && <p className="error-msg">{error}</p>}
      {resumen && (
        <div className="kpi-grid">
          <article className="kpi"><h3>Materias Primas</h3><strong>{resumen.materiasPrimas}</strong></article>
          <article className="kpi"><h3>Productos</h3><strong>{resumen.productos}</strong></article>
          <article className="kpi"><h3>Sedes</h3><strong>{resumen.sedes}</strong></article>
          <article className="kpi"><h3>Inventario Central</h3><strong>{resumen.unidadesInventarioCentral ?? 0}</strong></article>
          <article className="kpi"><h3>Unidades Inventario</h3><strong>{resumen.unidadesInventario}</strong></article>
        </div>
      )}

      <div className="panel-grid">
        <article className="panel">
          <h3>Alerta Materia Prima</h3>
          <div className="alert-list">
            {alertas.materiaPrimaBaja.map((a) => {
              const sev = severityFromRatio(Number(a.cantidad_disponible), Number(a.nivel_minimo));
              return (
                <div key={a.id} className="alert-item">
                  <div>
                    <strong>{a.nombre}</strong>
                    <p>{a.cantidad_disponible} {a.unidad_medida} disponible - minimo {a.nivel_minimo}</p>
                  </div>
                  <span className={`status-chip ${sev.key}`}>{sev.label}</span>
                </div>
              );
            })}
            {alertas.materiaPrimaBaja.length === 0 && <p className="empty-state">Sin alertas</p>}
          </div>
        </article>

        <article className="panel">
          <h3>Alerta Productos por Sede</h3>
          <div className="alert-list">
            {alertas.productosBajosPorSede.map((a) => {
              const sev = severityFromRatio(Number(a.cantidad_actual), Number(a.cantidad_minima));
              return (
                <div key={a.id} className="alert-item">
                  <div>
                    <strong>{a.producto}</strong>
                    <p>{a.sede}: {a.cantidad_actual} disponible - minimo {a.cantidad_minima}</p>
                  </div>
                  <span className={`status-chip ${sev.key}`}>{sev.label}</span>
                </div>
              );
            })}
            {alertas.productosBajosPorSede.length === 0 && <p className="empty-state">Sin alertas</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
