import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import unacLogo from './assets/Logo UNAC + FI Azul@2x.png';
import bgImage from './assets/fondo.jpg';
import './login.css';
import { LOGIN_URL } from './config';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);


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

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="login-card">
        <img className="logo" src={unacLogo} alt="UNAC Facultad de Ingeniería Logo" />
        <h1>Sistema de Análisis de Productos de Investigación</h1>
        {error && <p className="error">{error}</p>}
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
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit">Acceder</button>
        </form>
        <p className="footer">
          © 2026 UNAC - Facultad de Ingeniería<br />
             • Excelencia Académica
        </p>
      </div>
    </div>
  );
}
