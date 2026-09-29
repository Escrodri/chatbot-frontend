/**
 * Aviso de cambios sin guardar, para lo que está fuera de la pantalla.
 *
 * La app usa <BrowserRouter>, que no trae el bloqueo de navegación de React
 * Router. La pantalla de un producto marca acá si tiene cambios, y el menú de
 * arriba pregunta antes de ir a otra sección.
 */
let pendiente = false;

export function marcarCambiosSinGuardar(hay) {
  pendiente = Boolean(hay);
}

/** true si se puede salir: no hay cambios, o la persona confirmó que los pierde. */
export function puedeSalir() {
  if (!pendiente) return true;
  const ok = window.confirm('Tenés cambios sin guardar. ¿Salir igual y perderlos?');
  if (ok) pendiente = false;
  return ok;
}
