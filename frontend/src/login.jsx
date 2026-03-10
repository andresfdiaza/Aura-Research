import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import unacLogo from './assets/Logo UNAC + FI Azul@2x.png';
import bgImage from './assets/fondo.jpg';
import './login.css';
import { LOGIN_URL, SERVER_BASE } from './config';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // Compatibility: try configured endpoint first, then legacy /login if needed.
      const fallbackUrl = LOGIN_URL.replace('/api/login', '/login');
      const loginUrls = [LOGIN_URL, fallbackUrl].filter((url, idx, arr) => url && arr.indexOf(url) === idx);

      let data = null;
      let lastError = null;

      for (const url of loginUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (res.status === 404) {
            continue;
          }

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || 'Login failed');
          }

          data = await res.json();
          break;
        } catch (err) {
          lastError = err;
          // If endpoint exists but credentials are wrong, do not retry legacy URL.
          if (err.message === 'Invalid credentials') {
            break;
          }
        }
      }

      if (!data) {
        throw lastError || new Error('Login failed');
      }

      // Redirigir según el role del usuario
      const destination = data.role === 'admin' ? '/homeadmin' : '/home';
      navigate(destination, { state: { user: data } });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(false);
    setForgotLoading(true);

    try {
      const forgotUrls = [`${SERVER_BASE}/api/forgot-password`, `${SERVER_BASE}/forgot-password`];
      let sent = false;
      let lastErr = null;

      for (const url of forgotUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail }),
          });

          if (res.status === 404) {
            continue;
          }

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || 'Error al enviar enlace de recuperación');
          }

          sent = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!sent) {
        throw lastErr || new Error('No fue posible contactar el servicio de recuperación');
      }

      setForgotSuccess(true);
      setForgotEmail('');
      setTimeout(() => {
        setIsForgotView(false);
        setForgotSuccess(false);
      }, 3000);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="login-card">
        <img className="logo" src={unacLogo} alt="UNAC Facultad de Ingeniería Logo" />
        <h1>{isForgotView ? 'Recuperar Contraseña' : 'Sistema de Análisis de Productos de Investigación'}</h1>
        {error && <p className="error">{error}</p>}
        {!isForgotView && (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Correo Institucional</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre.apellido@unac.edu.co"
          />

          <label htmlFor="password">Contraseña</label>
          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <span
              className="toggle-password material-symbols-outlined"
              onClick={() => setShowPassword((v) => !v)}
              role="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </div>

          <div className="options">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsForgotView(true);
                }}
              >
                ¿Olvidaste tu contraseña?
              </a>
          </div>

          <button type="submit">Acceder</button>
        </form>
        )}

        {isForgotView && (
          <form onSubmit={handleForgotPassword} className="forgot-form-inline">
            <p className="forgot-description">
              Ingresa tu correo institucional y te enviaremos un enlace para recuperar tu contraseña.
            </p>
            {forgotError && <p className="error">{forgotError}</p>}
            {forgotSuccess && <p className="success">¡Enlace enviado! Revisa tu correo.</p>}

            <label htmlFor="forgot-email">Correo Institucional</label>
            <input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="nombre.apellido@unac.edu.co"
              required
            />

            <div className="modal-buttons">
              <button type="submit" disabled={forgotLoading} className="btn-primary">
                {forgotLoading ? 'Enviando...' : 'Enviar Enlace'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsForgotView(false);
                  setForgotError(null);
                  setForgotSuccess(false);
                }}
                className="btn-secondary"
              >
                Volver
              </button>
            </div>
          </form>
        )}

        <p className="footer">
          © 2026 UNAC - Facultad de Ingeniería<br />
             • Excelencia Académica
        </p>
      </div>
    </div>
  );
}
