import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [serverHealth, setServerHealth] = useState('checking');

  // Si ya está autenticado, redirigir automáticamente
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/settings' : '/inbox', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Comprobar estado de conexión con backend vía proxy
    fetch('/health')
      .then(r => r.ok ? setServerHealth('healthy') : setServerHealth('offline'))
      .catch(() => setServerHealth('offline'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Ingresá tu correo y contraseña.' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Verificando credenciales…' });

    try {
      const loggedUser = await login(email, password);
      setMessage({
        type: 'success',
        text: `¡Hola ${loggedUser.name}! Acceso autorizado.`
      });
      setTimeout(() => {
        navigate(loggedUser.role === 'admin' ? '/settings' : '/inbox', { replace: true });
      }, 400);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'No pudimos iniciar sesión. Revisá el correo o la contraseña.'
      });
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-theme-row">
          <ThemeToggle variant="outline" />
        </div>

        {/* Encabezado */}
        <div className="login-header">
          <div className="brand-badge-login">
            <span className="brand-icon" style={{ color: 'var(--wa-teal-dark)' }}>
              <BrandMark size={18} />
            </span>
            <span className="brand-name">Bandeja Unificada</span>
          </div>
          <h2>Acceso del equipo</h2>
          <p>Entrá con tu usuario para responder los mensajes de WhatsApp, Messenger e Instagram.</p>

          <div style={{ marginTop: '12px', fontSize: '12.5px', fontWeight: 600 }}>
            {serverHealth === 'healthy' && (
              <span style={{ color: 'var(--ok)' }}>● Conectado con el servidor</span>
            )}
            {serverHealth === 'offline' && (
              <span style={{ color: 'var(--warn)' }}>● Servidor en espera de conexión</span>
            )}
          </div>
        </div>

        {/* Mensaje de feedback */}
        {message && (
          <div className={`login-msg ${message.type === 'error' ? 'msg-error' : 'msg-success'}`}>
            {message.text}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              id="email"
              required
              autoComplete="email"
              placeholder="operador@lecturasdetarde.online"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label="Ver u ocultar contraseña"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M4 20L20 4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? 'Validando acceso…' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            ¿Problemas para entrar? Escribí a{' '}
            <a href="mailto:soporte@lecturasdetarde.online">soporte@lecturasdetarde.online</a>
          </p>
          <div style={{ marginTop: '10px' }}>
            <Link to="/" style={{ color: 'var(--text-soft)', fontSize: '13px', textDecoration: 'none' }}>
              ← Volver al sitio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
