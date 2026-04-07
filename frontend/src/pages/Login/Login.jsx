
import React, { useState } from 'react';
import TwoFactorModal from '../../components/TwoFactorModal';
import { useNavigate } from 'react-router-dom';
import unacLogo from '../../assets/Logo UNAC + FI Azul@2x.png';
import bgImage from '../../assets/fondo.jpg';
import '../../styles/pages/login.css';
import { LOGIN_URL } from '../../config';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [show2FA, setShow2FA] = useState(false);
  const [qr, setQr] = useState(null);
  const [pendingLogin, setPendingLogin] = useState({ email: '', password: '' });
  const [twoFAError, setTwoFAError] = useState(null);

  const isAdminRole = (role) => String(role || '').trim().toLowerCase() === 'admin';

  const completeLogin = (data) => {
    const destination = isAdminRole(data?.role) ? '/homeadmin' : '/home';
    navigate(destination, { state: { user: data } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setTwoFAError(null);
    try {
      const loginUrls = [LOGIN_URL].filter(Boolean);
      let data = null;
      let lastError = null;
      for (const url of loginUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (res.status === 404) continue;
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.message || 'Login failed');
          data = resData;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!data) throw lastError || new Error('Login failed');
      if (data.require2FA) {
        setShow2FA(true);
        setQr(data.activation ? data.qr : null);
        setPendingLogin({ email, password });
        return;
      }
      completeLogin(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handle2FASubmit = async (token) => {
    setTwoFAError(null);
    try {
      const loginUrls = [LOGIN_URL].filter(Boolean);
      let data = null;
      let lastError = null;
      for (const url of loginUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...pendingLogin, token }),
          });
          if (res.status === 404) continue;
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.message || 'Login failed');
          data = resData;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!data) throw lastError || new Error('Login failed');
      setShow2FA(false);
      setQr(null);
      setPendingLogin({ email: '', password: '' });
      completeLogin(data);
    } catch (err) {
      setTwoFAError(err.message);
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
      {show2FA && (
        <TwoFactorModal
          qr={qr}
          error={twoFAError}
          onSubmit={handle2FASubmit}
          onClose={() => { setShow2FA(false); setQr(null); setTwoFAError(null); }}
        />
      )}
    </div>
  );
}
