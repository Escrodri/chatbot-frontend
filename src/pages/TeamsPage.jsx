import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconoVisto, IconoAlerta } from '../components/Icons';

export function TeamsPage() {
  const { apiFetch } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Formulario nuevo equipo
  const [createForm, setCreateForm] = useState({
    name: '',
    metaAppId: '',
    metaAppSecret: '',
    adminEmail: '',
    adminPassword: '',
    adminName: ''
  });

  // Formulario editar equipo
  const [editForm, setEditForm] = useState({
    name: '',
    metaAppId: '',
    metaAppSecret: ''
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
    if (!createForm.name.trim()) {
      addToast('El nombre del equipo es obligatorio.', 'error');
      return;
    }

    if (createForm.adminEmail && !createForm.adminPassword) {
      addToast('Debes ingresar la contraseña para el administrador inicial.', 'error');
      return;
    }

    if (createForm.adminPassword && createForm.adminPassword.length < 12) {
      addToast('La contraseña debe tener al menos 12 caracteres.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al crear el equipo.', 'error');
        return;
      }

      addToast(data.message || 'Equipo creado exitosamente.', 'success');
      setShowCreateModal(false);
      setCreateForm({
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
      setSubmitting(false);
    }
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setEditForm({
      name: team.name || '',
      metaAppId: team.meta_app_id || '',
      metaAppSecret: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;

    if (!editForm.name.trim()) {
      addToast('El nombre del equipo es obligatorio.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al actualizar el equipo.', 'error');
        return;
      }

      addToast(data.message || 'Equipo actualizado exitosamente.', 'success');
      setShowEditModal(false);
      setEditingTeam(null);
      loadTeams();
    } catch (err) {
      addToast('Error de red al actualizar equipo: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (team) => {
    if (team.id === 1) {
      addToast('El Equipo Principal no se puede desactivar.', 'error');
      return;
    }

    const accion = team.status === 'active' ? 'desactivar' : 'reactivar';
    const confirmMsg = `¿Estás seguro de que deseas ${accion} el equipo "${team.name}"? Los datos de canales, usuarios y chats permanecerán totalmente seguros en la base de datos.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiFetch(`/api/teams/${team.id}/status`, {
        method: 'PATCH'
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al cambiar estado.', 'error');
        return;
      }

      addToast(data.message || `Equipo ${accion}do exitosamente.`, 'success');
      loadTeams();
    } catch (err) {
      addToast('Error de red al cambiar estado: ' + err.message, 'error');
    }
  };

  return (
    <main className="settings-main" style={{ maxWidth: '1140px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div className="panel-action-bar" style={{ marginBottom: '28px' }}>
        <div className="panel-title">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
            <span>🏢</span>
            <span>Gestión Global de Equipos y Empresas</span>
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
            Panel de control del Superadministrador. Configura empresas, asigna administradores y gestiona accesos sin borrar datos.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-gold"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
          <span>Crear Nuevo Equipo</span>
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: 'var(--danger)',
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '24px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <IconoAlerta size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Lista de Equipos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-soft)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p style={{ margin: 0 }}>Cargando equipos registrados…</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state-box" style={{ padding: '40px', textAlign: 'center' }}>
          <h4>No hay equipos registrados</h4>
          <p>Crea tu primer equipo para asignar administradores e integrar canales de Meta.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '22px' }}>
          {teams.map(t => {
            const isActive = t.status !== 'inactive' && t.is_active !== false;

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid ' + (isActive ? 'var(--border)' : 'rgba(239, 68, 68, 0.35)'),
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: 'var(--shadow-1)',
                  opacity: isActive ? 1 : 0.82,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Cabecera de Tarjeta */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-strong)', fontWeight: 700 }}>
                        {t.name}
                      </h4>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-soft)' }}>ID de Equipo: #{t.id}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t.id === 1 && (
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          background: 'rgba(234, 179, 8, 0.14)',
                          color: 'var(--warn)',
                          border: '1px solid rgba(234, 179, 8, 0.35)'
                        }}>
                          Principal
                        </span>
                      )}

                      <span style={{
                        fontSize: '0.72rem',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        background: isActive ? 'rgba(14, 163, 111, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: isActive ? 'var(--ok)' : 'var(--danger)',
                        border: '1px solid ' + (isActive ? 'rgba(14, 163, 111, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      }}>
                        {isActive ? '● Activo' : '⏸ Desactivado'}
                      </span>
                    </div>
                  </div>

                  {/* Métricas del Equipo */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    background: 'var(--bg-sunken)',
                    border: '1px solid var(--border)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    marginBottom: '14px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-soft)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>
                        USUARIOS / OPERADORES
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--text-strong)' }}>
                        {t.total_users || 0}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-soft)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>
                        CANALES ACTIVOS
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--wa-teal-dark)' }}>
                        {t.total_channels || 0}
                      </strong>
                    </div>
                  </div>

                  {/* Credenciales / Info Meta */}
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-body)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-soft)' }}>Meta App ID:</span>
                      {t.meta_app_id ? (
                        <code style={{
                          color: 'var(--wa-blue)',
                          background: 'var(--bg-sunken)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          border: '1px solid var(--border)'
                        }}>
                          {t.meta_app_id}
                        </code>
                      ) : (
                        <span style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.78rem' }}>Sin configurar</span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '2px' }}>
                      Registrado: {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Botones de Acción (Editar y Desactivar) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  marginTop: '6px'
                }}>
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => openEditModal(t)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: 'var(--bg-sunken)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-strong)',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>✏️</span>
                    <span>Editar</span>
                  </button>

                  {t.id !== 1 ? (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(t)}
                      style={{
                        background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 163, 111, 0.1)',
                        border: '1px solid ' + (isActive ? 'var(--danger)' : 'var(--ok)'),
                        color: isActive ? 'var(--danger)' : 'var(--ok)',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      title={isActive ? "Desactivar temporalmente este equipo sin borrar datos" : "Reactivar este equipo"}
                    >
                      <span>{isActive ? '⏸️' : '▶️'}</span>
                      <span>{isActive ? 'Desactivar' : 'Reactivar'}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                      🔒 Equipo principal protegido
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Crear Equipo */}
      {showCreateModal && (
        <div className="modal-overlay active" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>🏢 Crear Nuevo Equipo / Empresa</h3>
              <button className="btn-close-modal" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Nombre del Equipo o Empresa (*):
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="Ej: Empresa Logística S.A."
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{
                  background: 'var(--bg-sunken)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--wa-teal-dark)' }}>
                    👤 Administrador Principal del Equipo (Opcional)
                  </strong>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>Nombre completo:</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="Ej: Carlos Gómez"
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    />
                  </div>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>Correo Electrónico:</label>
                    <input
                      type="email"
                      className="input-custom"
                      placeholder="carlos@empresa.com"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    />
                  </div>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>Contraseña inicial (mínimo 12 caracteres):</label>
                    <input
                      type="password"
                      className="input-custom"
                      placeholder="Mínimo 12 caracteres"
                      value={createForm.adminPassword}
                      onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-sunken)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--wa-blue)' }}>
                    ⚙️ Credenciales de Meta Developers (Opcional)
                  </strong>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>Meta App ID:</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="Ej: 123456789012345"
                      value={createForm.metaAppId}
                      onChange={(e) => setCreateForm({ ...createForm, metaAppId: e.target.value })}
                    />
                  </div>

                  <div className="form-group-custom" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>Meta App Secret:</label>
                    <input
                      type="password"
                      className="input-custom"
                      placeholder="Pega el App Secret (se almacenará cifrado con AES-256)"
                      value={createForm.metaAppSecret}
                      onChange={(e) => setCreateForm({ ...createForm, metaAppSecret: e.target.value })}
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
                  disabled={submitting}
                >
                  {submitting ? 'Creando Equipo…' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Equipo */}
      {showEditModal && editingTeam && (
        <div className="modal-overlay active" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>✏️ Editar Equipo / Empresa</h3>
              <button className="btn-close-modal" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleUpdateTeam}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Nombre del Equipo o Empresa (*):
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Meta App ID:
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="Ej: 123456789012345"
                    value={editForm.metaAppId}
                    onChange={(e) => setEditForm({ ...editForm, metaAppId: e.target.value })}
                  />
                </div>

                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Actualizar Meta App Secret (Opcional):
                  </label>
                  <input
                    type="password"
                    className="input-custom"
                    placeholder="Dejar en blanco para mantener el secreto actual"
                    value={editForm.metaAppSecret}
                    onChange={(e) => setEditForm({ ...editForm, metaAppSecret: e.target.value })}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-soft)', marginTop: '4px', display: 'block' }}>
                    🔒 Se cifra en reposo con AES-256-GCM en la base de datos PostgreSQL.
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando…' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contenedor de Notificaciones Toast */}
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
