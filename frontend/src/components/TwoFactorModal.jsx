import React, { useState } from 'react';

export default function TwoFactorModal({ qr, onSubmit, onClose, error }) {
  const [token, setToken] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal-card modal-2fa">
        <h2 className="modal-2fa-title">Verificación en dos pasos</h2>
        {qr && (
          <>
            <p className="modal-2fa-desc">Escanea este código QR con Google Authenticator o una app compatible:</p>
            <img src={qr} alt="QR 2FA" className="modal-2fa-qr" />
            <p className="modal-2fa-desc">Luego ingresa el código de 6 dígitos generado por la app.</p>
          </>
        )}
        <form onSubmit={e => { e.preventDefault(); onSubmit(token); }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Código 2FA"
            value={token}
            onChange={e => setToken(e.target.value)}
            required
            autoFocus
            className="modal-2fa-input"
          />
          {error && <div className="modal-2fa-error">{error}</div>}
          <div className="modal-2fa-btns">
            <button type="submit" className="modal-2fa-btn modal-2fa-btn-primary">Verificar</button>
            <button type="button" className="modal-2fa-btn modal-2fa-btn-cancel" onClick={onClose}>Cancelar</button>
          </div>
        </form>
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
        .modal-2fa-qr {
          margin: 1em auto; display: block; width: 200px; height: 200px; border: 2px solid #F5A800; border-radius: 12px; background: #fffbe6;
        }
        .modal-2fa-input {
          font-size: 1.5em; letter-spacing: 0.3em; text-align: center; margin-bottom: 12px; width: 100%; border: 2px solid #003366; border-radius: 8px; padding: 0.5em 0.7em; outline: none; transition: border 0.2s;
        }
        .modal-2fa-input:focus {
          border-color: #F5A800;
        }
        .modal-2fa-error {
          color: #d32f2f; background: #fff3e0; border-radius: 6px; padding: 0.5em 1em; margin-bottom: 8px; text-align: center; font-weight: 500;
        }
        .modal-2fa-btns {
          display: flex; gap: 12px; justify-content: center; margin-top: 8px;
        }
        .modal-2fa-btn {
          font-weight: bold; font-size: 1em; border-radius: 8px; padding: 0.5em 1.5em; border: none; cursor: pointer; transition: background 0.2s, color 0.2s;
        }
        .modal-2fa-btn-primary {
          background: #003366; color: #fff;
        }
        .modal-2fa-btn-primary:hover {
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
