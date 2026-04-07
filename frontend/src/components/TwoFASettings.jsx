import React, { useState } from 'react';
import TwoFactorModal from './TwoFactorModal';
import { API_BASE } from '../config';

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
      const res = await fetch(`${API_BASE}/2fa/activate`, {
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
      <div className="modal-card modal-2fa">
        <h2 className="modal-2fa-title">Configuración de Doble Factor (2FA)</h2>
        {success && <div className="modal-2fa-success">2FA activado correctamente</div>}
        {error && <div className="modal-2fa-error">{error}</div>}
        <p className="modal-2fa-desc">Activa la verificación en dos pasos para mayor seguridad.</p>
        <div className="modal-2fa-btns">
          <button onClick={handleActivate} disabled={!!qr || showModal || activated} className="modal-2fa-btn modal-2fa-btn-primary">
            Activar 2FA
          </button>
          <button onClick={onClose} className="modal-2fa-btn modal-2fa-btn-cancel">Cerrar</button>
        </div>
        {showModal && qr && (
          <TwoFactorModal
            qr={qr}
            error={error}
            onSubmit={async (token) => {
              setError(null);
              try {
                const res = await fetch(`${API_BASE}/2fa/verify`, {
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
        .modal-card.modal-2fa {
          background: #fff; border-radius: 18px; padding: 2.5em 2em 2em 2em; max-width: 370px; width: 100%; box-shadow: 0 8px 32px #0003; border: 3px solid #F5A800;
        }
        .modal-2fa-title {
          color: #003366; font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; text-align: center;
        }
        .modal-2fa-desc {
          color: #003366; font-size: 1em; margin-bottom: 0.5em; text-align: center;
        }
        .modal-2fa-success {
          color: #388e3c; background: #e8f5e9; border-radius: 6px; padding: 0.5em 1em; margin-bottom: 8px; text-align: center; font-weight: 500;
        }
        .modal-2fa-error {
          color: #d32f2f; background: #fff3e0; border-radius: 6px; padding: 0.5em 1em; margin-bottom: 8px; text-align: center; font-weight: 500;
        }
        .modal-2fa-btns {
          display: flex; gap: 12px; justify-content: center; margin-top: 8px; margin-bottom: 8px;
        }
        .modal-2fa-btn {
          font-weight: bold; font-size: 1em; border-radius: 8px; padding: 0.5em 1.5em; border: none; cursor: pointer; transition: background 0.2s, color 0.2s;
        }
        .modal-2fa-btn-primary {
          background: #003366; color: #fff;
        }
        .modal-2fa-btn-primary:disabled {
          background: #b0b0b0; color: #fff;
          cursor: not-allowed;
        }
        .modal-2fa-btn-primary:hover:enabled {
          background: #F5A800; color: #003366;
        }
        .modal-2fa-btn-cancel {
          background: #fffbe6; color: #003366; border: 1.5px solid #F5A800;
        }
        .modal-2fa-btn-cancel:hover {
          background: #F5A800; color: #fff;
        }
      `}</style>
    </div>
  );
}
