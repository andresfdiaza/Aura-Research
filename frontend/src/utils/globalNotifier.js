const GLOBAL_NOTIFY_EVENT = 'aura:notify';

export function notifySuccess(title, message) {
  const detail = {
    type: 'success',
    title: title || 'Proceso completado',
    message: message || 'La operación se ejecutó correctamente.',
    ts: Date.now(),
  };

  window.dispatchEvent(new CustomEvent(GLOBAL_NOTIFY_EVENT, { detail }));
}

export function notifyError(title, message) {
  const detail = {
    type: 'error',
    title: title || 'No se pudo completar',
    message: message || 'No se pudo ejecutar la acción.',
    ts: Date.now(),
  };

  window.dispatchEvent(new CustomEvent(GLOBAL_NOTIFY_EVENT, { detail }));
}

export function getGlobalNotifyEvent() {
  return GLOBAL_NOTIFY_EVENT;
}
