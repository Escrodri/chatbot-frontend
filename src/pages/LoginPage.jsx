import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@empresa.com');
  const [password, setPassword] = useState('admin123');
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
      setMessage({ type: 'error', text: 'Por favor ingresa tu correo y contraseña.' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Verificando credenciales con el servidor...' });

    try {
      const loggedUser = await login(email, password);
      setMessage({
        type: 'success',
        text: `✨ ¡Bienvenida ${loggedUser.name}! Acceso autorizado.`
      });
      setTimeout(() => {
        navigate(loggedUser.role === 'admin' ? '/settings' : '/inbox', { replace: true });
      }, 400);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al iniciar sesión. Verifica correo o contraseña.'
      });
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Encabezado Místico */}
        <div className="login-header">
          <div className="brand-badge-login">
            <span className="brand-icon">🔮</span>
            <span className="brand-name">Lecturas de Tarot</span>
          </div>
          <h2>Portal de Tarotistas</h2>
          <p>Ingresa tus credenciales para acceder a la bandeja de mensajes omnicanal y atender a tus consultantes.</p>

          <div style={{ marginTop: '10px', fontSize: '0.75rem' }}>
            {serverHealth === 'healthy' && (
              <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 Conexión Segura con Servidor Central</span>
            )}
            {serverHealth === 'offline' && (
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>🟡 Servidor en espera de conexión</span>
            )}
          </div>
        </div>

        {/* Mensaje de feedback */}
        {message && (
          <div
            className={`login-msg ${message.type === 'error' ? 'msg-error' : 'msg-success'}`}
            style={{ display: 'block', marginBottom: '16px' }}
          >
            {message.text}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              required
              autoComplete="email"
              placeholder="tarotista@lecturasdetarte.online"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña:</label>
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
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-login-submit"
            disabled={loading}
          >
            {loading ? 'Validando acceso...' : 'Ingresar al Panel de Mensajes'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            ¿Problemas para acceder? Contacta al administrador en{' '}
            <a href="mailto:soporte@lecturasdetarte.online">soporte@lecturasdetarte.online</a>
          </p>
          <div style={{ marginTop: '12px' }}>
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
              ← Volver al sitio principal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
