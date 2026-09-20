import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconoVisto, IconoAlerta } from '../components/Icons';

export function TeamsPage() {
  const { apiFetch } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Formulario nuevo equipo
  const [form, setForm] = useState({
    name: '',
    metaAppId: '',
    metaAppSecret: '',
    adminEmail: '',
    adminPassword: '',
    adminName: ''
  });

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const loadTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/teams');
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'No se pudieron cargar los equipos.');
        return;
      }
      const data = await res.json();
      setTeams(data || []);
    } catch (err) {
      setError('Error de conexión al cargar equipos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast('El nombre del equipo es obligatorio.', 'error');
      return;
    }

    if (form.adminEmail && !form.adminPassword) {
      addToast('Debes ingresar la contraseña para el administrador inicial.', 'error');
      return;
    }

    if (form.adminPassword && form.adminPassword.length < 12) {
      addToast('La contraseña debe tener al menos 12 caracteres.', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al crear el equipo.', 'error');
        return;
      }

      addToast(data.message || 'Equipo creado exitosamente.', 'success');
      setShowCreateModal(false);
      setForm({
        name: '',
        metaAppId: '',
        metaAppSecret: '',
        adminEmail: '',
        adminPassword: '',
        adminName: ''
      });
      loadTeams();
    } catch (err) {
      addToast('Error de red al crear equipo: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="settings-main" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🏢</span>
            <span>Gestión Global de Equipos y Empresas</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Panel de control exclusivo del Superadministrador para crear y supervisar equipos independientes.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-gold"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>+</span>
          <span>Crear Nuevo Equipo</span>
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.88rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Lista de Equipos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Cargando equipos registrados...
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state-box" style={{ padding: '40px', textAlign: 'center' }}>
          <h4>No hay equipos registrados</h4>
          <p>Crea tu primer equipo para asignar administradores e integrar canales de Meta.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {teams.map(t => (
            <div
              key={t.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>{t.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID Equipo: #{t.id}</span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: 'rgba(24, 119, 242, 0.12)',
                  color: '#60a5fa',
                  border: '1px solid rgba(24, 119, 242, 0.3)'
                }}>
                  {t.id === 1 ? 'Principal' : 'Empresa'}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>USUARIOS / OPERADORES</span>
                  <strong style={{ fontSize: '1.1rem', color: '#38bdf8' }}>{t.total_users || 0}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>CANALES CONECTADOS</span>
                  <strong style={{ fontSize: '1.1rem', color: '#4ade80' }}>{t.total_channels || 0}</strong>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
                <div>
                  🔑 Meta App ID:{' '}
                  {t.meta_app_id ? (
                    <code style={{ color: '#60a5fa' }}>{t.meta_app_id}</code>
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No configurado aún</span>
                  )}
                </div>
                <div>
                  📅 Creado el: {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Equipo */}
      {showCreateModal && (
        <div className="modal-overlay active" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>🏢 Crear Nuevo Equipo / Empresa</h3>
              <button className="btn-close-modal" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nombre del Equipo o Empresa (*):</label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="Ej: Empresa Logística S.A."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <strong style={{ fontSize: '0.85rem', color: '#facc15' }}>
                    👤 Administrador Principal del Equipo (Opcional)
                  </strong>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Nombre completo:</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="Ej: Carlos Gómez"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    />
                  </div>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Correo Electrónico:</label>
                    <input
                      type="email"
                      className="input-custom"
                      placeholder="carlos@empresa.com"
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    />
                  </div>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Contraseña inicial (mínimo 12 caracteres):</label>
                    <input
                      type="password"
                      className="input-custom"
                      placeholder="Mínimo 12 caracteres"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{
                  background: 'rgba(24, 119, 242, 0.06)',
                  border: '1px solid rgba(24, 119, 242, 0.2)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <strong style={{ fontSize: '0.85rem', color: '#60a5fa' }}>
                    ⚙️ Credenciales de Meta (Opcional)
                  </strong>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Meta App ID:</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="Ej: 123456789012345"
                      value={form.metaAppId}
                      onChange={(e) => setForm({ ...form, metaAppId: e.target.value })}
                    />
                  </div>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Meta App Secret:</label>
                    <input
                      type="password"
                      className="input-custom"
                      placeholder="App Secret"
                      value={form.metaAppSecret}
                      onChange={(e) => setForm({ ...form, metaAppSecret: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={creating}
                >
                  {creating ? 'Creando Equipo...' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-msg ${t.type}`}>
            <span>{t.type === 'success' ? <IconoVisto size={15} /> : <IconoAlerta size={15} />}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

export default TeamsPage;
