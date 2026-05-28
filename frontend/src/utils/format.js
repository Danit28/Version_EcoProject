export function formatCantidad(value, maxDecimals = 3) {
  const numero = Number(value);
  if (!Number.isFinite(numero)) return '';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  }).format(numero);
}
