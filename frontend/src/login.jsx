import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import unacLogo from './assets/Logo UNAC + FI Azul@2x.png';
import bgImage from './assets/fondo.jpg';
import './login.css';

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
      const res = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }
      const data = await res.json();
      navigate('/home', { state: { user: data } });
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
            <label>
              <input type="checkbox" id="remember" />
              Mantener sesión iniciada
            </label>
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit">Acceder</button>
        </form>
        <p className="footer">
          © 2024 UNAC - Facultad de Ingeniería<br />
          Grupo de Investigación GI2A • Excelencia Académica
        </p>
      </div>
    </div>
  );
}
