import React from 'react';
import { getGlobalNotifyEvent } from '../utils/globalNotifier';

const AUTO_HIDE_MS = 6000;

export default function GlobalToast() {
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    let timer = null;

    const onNotify = (event) => {
      const detail = event?.detail;
      if (!detail) return;
      setToast(detail);

      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        setToast(null);
      }, AUTO_HIDE_MS);
    };

    window.addEventListener(getGlobalNotifyEvent(), onNotify);

    return () => {
      window.removeEventListener(getGlobalNotifyEvent(), onNotify);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-sm w-[calc(100vw-2rem)]">
      <div
        className={`rounded-xl border shadow-xl px-4 py-3 bg-white backdrop-blur-sm ${
          isSuccess ? 'border-green-200' : 'border-slate-200'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span
            className={`material-symbols-outlined mt-[1px] ${
              isSuccess ? 'text-green-600' : 'text-primary'
            }`}
          >
            {isSuccess ? 'check_circle' : 'info'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{toast.title}</p>
            <p className="text-sm text-slate-600 mt-0.5">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Cerrar notificación"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
