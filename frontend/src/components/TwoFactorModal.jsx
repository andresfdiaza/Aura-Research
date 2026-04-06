import React, { useState } from 'react';

export default function TwoFactorModal({ qr, onSubmit, onClose, error }) {
  const [token, setToken] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Verificación en dos pasos</h2>
        {qr && (
          <>
            <p>Escanea este código QR con Google Authenticator o una app compatible:</p>
            <img src={qr} alt="QR 2FA" style={{ margin: '1em auto', display: 'block', width: 200, height: 200 }} />
            <p>Luego ingresa el código de 6 dígitos generado por la app.</p>
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
            style={{ fontSize: '1.5em', letterSpacing: '0.3em', textAlign: 'center', marginBottom: 12 }}
          />
          {error && <div className="error" style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button type="submit">Verificar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal-card {
          background: #fff; border-radius: 12px; padding: 2em; max-width: 350px; width: 100%; box-shadow: 0 8px 32px #0002;
        }
      `}</style>
    </div>
  );
}
