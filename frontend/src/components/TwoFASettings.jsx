import React, { useState } from 'react';
import TwoFactorModal from './TwoFactorModal';
import { SERVER_BASE } from '../config';

export default function TwoFASettings({ user, onClose }) {
  const [qr, setQr] = useState(null);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [token, setToken] = useState('');
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${SERVER_BASE}/api/2fa/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (!res.ok) throw new Error('Error generando QR');
      const data = await res.json();
      setQr(data.qr);
      setShowModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Aquí podrías agregar la verificación del token si quieres forzar la validación al activar

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Configuración de Doble Factor (2FA)</h2>
        {success && <div className="success">2FA activado correctamente</div>}
        {error && <div className="error">{error}</div>}
        <p>Activa la verificación en dos pasos para mayor seguridad.</p>
        <button onClick={handleActivate} disabled={!!qr || showModal || activated}>
          Activar 2FA
        </button>
        <button onClick={onClose} style={{ marginLeft: 8 }}>Cerrar</button>
        {showModal && qr && (
          <TwoFactorModal
            qr={qr}
            error={error}
            onSubmit={async (token) => {
              setError(null);
              try {
                const res = await fetch(`${SERVER_BASE}/api/2fa/verify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: user.email, token })
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.message || 'Código 2FA inválido');
                }
                setShowModal(false);
                setActivated(true);
                setSuccess(true);
              } catch (err) {
                setError(err.message);
              }
            }}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal-card {
          background: #fff; border-radius: 12px; padding: 2em; max-width: 350px; width: 100%; box-shadow: 0 8px 32px #0002;
        }
        .success { color: green; margin-bottom: 1em; }
        .error { color: red; margin-bottom: 1em; }
      `}</style>
    </div>
  );
}
