import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconoBuscar,
  IconoEquipo,
  IconoCanales,
  IconoDeCanal,
  IconoVisto,
  IconoAlerta
} from '../components/Icons';

export function TeamsPage() {
  const { apiFetch } = useAuth();

  // Estados principales de Equipos
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modales de Equipo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Centro de Control de Equipo (Operadores y Canales)
  const [selectedTeamForControl, setSelectedTeamForControl] = useState(null);
  const [teamControlTab, setTeamControlTab] = useState('users'); // 'users' | 'channels' | 'meta'
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamChannels, setTeamChannels] = useState([]);
  const [loadingControl, setLoadingControl] = useState(false);

  // Modal de Usuario/Operador (Crear o Editar)
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = nuevo usuario
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'agent',
    password: '',
    isActive: true,
    channelIds: []
  });

  // Notificaciones Toast
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

  // Carga lista global de equipos
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

  // Carga detalles (operadores y canales) del equipo seleccionado
  const loadTeamControlData = async (teamId) => {
    setLoadingControl(true);
    try {
      const res = await apiFetch(`/api/teams/${teamId}`);
      if (!res.ok) {
        const errData = await res.json();
        addToast(errData.error || 'No se pudieron cargar los datos del equipo.', 'error');
        return;
      }
      const data = await res.json();
      setTeamUsers(data.users || []);
      setTeamChannels(data.channels || []);
      if (data.team) {
        setSelectedTeamForControl(prev => ({ ...prev, ...data.team }));
      }
    } catch (err) {
      addToast('Error de red al cargar el equipo: ' + err.message, 'error');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleOpenControl = (team) => {
    setSelectedTeamForControl(team);
    setTeamControlTab('users');
    loadTeamControlData(team.id);
  };

  // KPIs calculados
  const stats = useMemo(() => {
    const total = teams.length;
    const active = teams.filter(t => t.status !== 'inactive' && t.is_active !== false).length;
    const inactive = total - active;
    const totalUsers = teams.reduce((acc, t) => acc + (parseInt(t.total_users, 10) || 0), 0);
    const totalChannels = teams.reduce((acc, t) => acc + (parseInt(t.total_channels, 10) || 0), 0);
    return { total, active, inactive, totalUsers, totalChannels };
  }, [teams]);

  // Filtrado de equipos reactivo
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.name?.toLowerCase().includes(q);
        const matchesId = String(t.id) === q;
        const matchesAppId = t.meta_app_id?.includes(q);
        if (!matchesName && !matchesId && !matchesAppId) return false;
      }
      // Filtro de estado
      const isActive = t.status !== 'inactive' && t.is_active !== false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
      return true;
    });
  }, [teams, searchQuery, statusFilter]);

  // Crear Equipo
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

    setSubmittingTeam(true);
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
      setSubmittingTeam(false);
    }
  };

  // Abrir Modal Editar Equipo
  const openEditTeamModal = (team) => {
    setEditingTeam(team);
    setEditForm({
      name: team.name || '',
      metaAppId: team.meta_app_id || '',
      metaAppSecret: ''
    });
    setShowEditModal(true);
  };

  // Guardar Cambios de Equipo
  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;

    if (!editForm.name.trim()) {
      addToast('El nombre del equipo es obligatorio.', 'error');
      return;
    }

    setSubmittingTeam(true);
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
      if (selectedTeamForControl?.id === editingTeam.id) {
        setSelectedTeamForControl(prev => ({ ...prev, ...data.team }));
      }
    } catch (err) {
      addToast('Error de red al actualizar equipo: ' + err.message, 'error');
    } finally {
      setSubmittingTeam(false);
    }
  };

  // Desactivar / Reactivar Equipo (Soft-delete)
  const handleToggleTeamStatus = async (team) => {
    if (team.id === 1) {
      addToast('El Equipo Principal no se puede desactivar.', 'error');
      return;
    }

    const accion = (team.status !== 'inactive' && team.is_active !== false) ? 'desactivar' : 'reactivar';
    const confirmMsg = `¿Estás seguro de que deseas ${accion} el equipo "${team.name}"? Los datos de canales, usuarios y mensajes permanecerán totalmente seguros en la base de datos.`;

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
      if (selectedTeamForControl?.id === team.id) {
        setSelectedTeamForControl(prev => ({ ...prev, ...data.team }));
      }
    } catch (err) {
      addToast('Error de red al cambiar estado: ' + err.message, 'error');
    }
  };

  // Abrir Modal Usuario (Crear nuevo)
  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      role: 'agent',
      password: '',
      isActive: true,
      channelIds: []
    });
    setShowUserModal(true);
  };

  // Abrir Modal Usuario (Editar existente)
  const openEditUserModal = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'agent',
      password: '', // Dejar en blanco para no cambiarla
      isActive: user.is_active !== false,
      channelIds: user.channel_ids || []
    });
    setShowUserModal(true);
  };

  // Guardar Usuario (Crear o Editar)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!selectedTeamForControl) return;

    if (!userForm.name.trim()) {
      addToast('El nombre del operador es obligatorio.', 'error');
      return;
    }
    if (!userForm.email.trim() || !userForm.email.includes('@')) {
      addToast('Ingresa un correo electrónico válido.', 'error');
      return;
    }

    // Validación de contraseña
    if (!editingUser) {
      if (!userForm.password || userForm.password.length < 12) {
        addToast('La contraseña debe tener al menos 12 caracteres.', 'error');
        return;
      }
    } else {
      if (userForm.password && userForm.password.length < 12) {
        addToast('Si deseas restablecer la contraseña, debe tener al menos 12 caracteres.', 'error');
        return;
      }
    }

    setSubmittingUser(true);
    try {
      const isEditing = Boolean(editingUser);
      const url = isEditing
        ? `/api/teams/${selectedTeamForControl.id}/users/${editingUser.id}`
        : `/api/teams/${selectedTeamForControl.id}/users`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(userForm)
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Error al guardar usuario.', 'error');
        return;
      }

      addToast(data.message || (isEditing ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.'), 'success');
      setShowUserModal(false);
      setEditingUser(null);
      // Recargar operadores del equipo y la lista global de equipos (para refrescar contadores)
      loadTeamControlData(selectedTeamForControl.id);
      loadTeams();
    } catch (err) {
      addToast('Error de red al guardar usuario: ' + err.message, 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  // Activar / Desactivar Usuario (Soft-toggle)
  const handleToggleUserStatus = async (user) => {
    if (user.role === 'superadmin') {
      addToast('El Superadministrador no puede ser desactivado.', 'error');
      return;
    }

    const accion = user.is_active ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿Deseas ${accion} el acceso del operador "${user.name}"?`)) return;

    try {
      const res = await apiFetch(`/api/teams/${selectedTeamForControl.id}/users/${user.id}/status`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Error al cambiar estado.', 'error');
        return;
      }

      addToast(data.message || `Usuario ${accion}do exitosamente.`, 'success');
      loadTeamControlData(selectedTeamForControl.id);
    } catch (err) {
      addToast('Error de red al cambiar estado: ' + err.message, 'error');
    }
  };

  return (
    <main className="settings-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
      
      {/* 1. Header Principal */}
      <div className="panel-action-bar" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
        <div className="panel-title">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.45rem', color: 'var(--text-strong)' }}>
            <span>🏢</span>
            <span>Centro de Control de Equipos y Empresas</span>
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--text-soft)' }}>
            Supervisión global de organizaciones, asignación de operadores, auditoría de canales y gestión de accesos.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-gold"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px' }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
          <span>Crear Nueva Empresa</span>
        </button>
      </div>

      {/* 2. Barra de KPIs / Métricas Globales */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              EMPRESAS REGISTRADAS
            </span>
            <span style={{ fontSize: '1.2rem' }}>🏢</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <strong style={{ fontSize: '1.75rem', color: 'var(--text-strong)' }}>{stats.total}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--ok)', fontWeight: 600 }}>
              {stats.active} activas
            </span>
            {stats.inactive > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>
                • {stats.inactive} inactivas
              </span>
            )}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              USUARIOS & OPERADORES
            </span>
            <span style={{ fontSize: '1.2rem' }}>👥</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <strong style={{ fontSize: '1.75rem', color: 'var(--wa-teal-dark)' }}>{stats.totalUsers}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
              en todas las organizaciones
            </span>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CANALES DE MENSAJERÍA
            </span>
            <span style={{ fontSize: '1.2rem' }}>📡</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <strong style={{ fontSize: '1.75rem', color: 'var(--wa-blue)' }}>{stats.totalChannels}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
              WhatsApp, FB e IG
            </span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: 'var(--shadow-1)'
      }}>
        {/* Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
          <span style={{ color: 'var(--text-soft)', display: 'flex', alignItems: 'center' }}>
            <IconoBuscar size={17} />
          </span>
          <input
            type="text"
            className="input-custom"
            placeholder="Buscar empresa por nombre o Meta App ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '7px 12px' }}
          />
        </div>

        {/* Filtros de Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600 }}>Estado:</span>
          <div style={{ display: 'inline-flex', background: 'var(--bg-sunken)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                background: statusFilter === 'all' ? 'var(--bg-panel)' : 'transparent',
                color: statusFilter === 'all' ? 'var(--text-strong)' : 'var(--text-soft)',
                border: statusFilter === 'all' ? '1px solid var(--border-strong)' : 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Todos ({teams.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              style={{
                background: statusFilter === 'active' ? 'var(--bg-panel)' : 'transparent',
                color: statusFilter === 'active' ? 'var(--ok)' : 'var(--text-soft)',
                border: statusFilter === 'active' ? '1px solid var(--border-strong)' : 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Activos ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              style={{
                background: statusFilter === 'inactive' ? 'var(--bg-panel)' : 'transparent',
                color: statusFilter === 'inactive' ? 'var(--danger)' : 'var(--text-soft)',
                border: statusFilter === 'inactive' ? '1px solid var(--border-strong)' : 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Inactivos ({stats.inactive})
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
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

      {/* 4. Lista de Tarjetas de Equipos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-soft)' }}>
          <div className="spinner" style={{ margin: '0 auto 14px' }}></div>
          <p style={{ margin: 0, fontWeight: 500 }}>Cargando directorio de empresas…</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="empty-state-box" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h4>No se encontraron empresas</h4>
          <p style={{ color: 'var(--text-soft)' }}>
            {searchQuery ? 'No hay resultados que coincidan con la búsqueda.' : 'Crea tu primera empresa para comenzar.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
          {filteredTeams.map(t => {
            const isActive = t.status !== 'inactive' && t.is_active !== false;

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid ' + (isActive ? 'var(--border)' : 'rgba(239, 68, 68, 0.4)'),
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: 'var(--shadow-1)',
                  opacity: isActive ? 1 : 0.85,
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  {/* Cabecera de la Tarjeta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-strong)', fontWeight: 700 }}>
                        {t.name}
                      </h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-soft)' }}>ID de Empresa: #{t.id}</span>
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
                        border: '1px solid ' + (isActive ? 'rgba(14, 163, 111, 0.35)' : 'rgba(239, 68, 68, 0.35)')
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
                      <span style={{ color: 'var(--text-soft)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                        OPERADORES
                      </span>
                      <strong style={{ fontSize: '1.3rem', color: 'var(--text-strong)' }}>
                        {t.total_users || 0}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-soft)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                        CANALES ACTIVOS
                      </span>
                      <strong style={{ fontSize: '1.3rem', color: 'var(--wa-teal-dark)' }}>
                        {t.total_channels || 0}
                      </strong>
                    </div>
                  </div>

                  {/* Configuración Meta */}
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-soft)' }}>Meta App ID:</span>
                      {t.meta_app_id ? (
                        <code style={{
                          color: 'var(--wa-blue)',
                          background: 'var(--bg-sunken)',
                          padding: '2px 7px',
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

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                      Registrado: {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Botón Principal: Gestionar Operadores y Canales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenControl(t)}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0, 168, 132, 0.1)',
                      border: '1px solid var(--wa-teal-dark)',
                      color: 'var(--wa-teal-dark)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>👥</span>
                    <span>Ver Operadores y Canales ({t.total_users || 0})</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-card-action"
                      onClick={() => openEditTeamModal(t)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'var(--bg-sunken)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-strong)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>✏️</span>
                      <span>Editar</span>
                    </button>

                    {t.id !== 1 ? (
                      <button
                        type="button"
                        onClick={() => handleToggleTeamStatus(t)}
                        style={{
                          background: isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(14, 163, 111, 0.08)',
                          border: '1px solid ' + (isActive ? 'var(--danger)' : 'var(--ok)'),
                          color: isActive ? 'var(--danger)' : 'var(--ok)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        title={isActive ? "Desactivar temporalmente esta empresa sin borrar datos" : "Reactivar esta empresa"}
                      >
                        <span>{isActive ? '⏸️' : '▶️'}</span>
                        <span>{isActive ? 'Desactivar' : 'Reactivar'}</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                        🔒 Empresa Principal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          5. MODAL: CENTRO DE CONTROL DEL EQUIPO (Operadores, Canales, Meta)
         ========================================================================= */}
      {selectedTeamForControl && (
        <div className="modal-overlay active" onClick={() => setSelectedTeamForControl(null)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '920px', width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-strong)' }}>
                    🏢 {selectedTeamForControl.name}
                  </h3>
                  <span style={{
                    fontSize: '0.74rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    background: (selectedTeamForControl.status !== 'inactive' && selectedTeamForControl.is_active !== false) ? 'rgba(14, 163, 111, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: (selectedTeamForControl.status !== 'inactive' && selectedTeamForControl.is_active !== false) ? 'var(--ok)' : 'var(--danger)',
                    border: '1px solid ' + ((selectedTeamForControl.status !== 'inactive' && selectedTeamForControl.is_active !== false) ? 'rgba(14, 163, 111, 0.35)' : 'rgba(239, 68, 68, 0.35)')
                  }}>
                    {(selectedTeamForControl.status !== 'inactive' && selectedTeamForControl.is_active !== false) ? '● Activo' : '⏸ Desactivado'}
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                  ID de Empresa: #{selectedTeamForControl.id}
                </span>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedTeamForControl(null)}>&times;</button>
            </div>

            {/* Pestañas del Centro de Control */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-sunken)',
              padding: '0 24px'
            }}>
              <button
                type="button"
                onClick={() => setTeamControlTab('users')}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: teamControlTab === 'users' ? '3px solid var(--wa-teal-dark)' : '3px solid transparent',
                  color: teamControlTab === 'users' ? 'var(--text-strong)' : 'var(--text-soft)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>👥 Operadores</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)'
                }}>
                  {teamUsers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTeamControlTab('channels')}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: teamControlTab === 'channels' ? '3px solid var(--wa-teal-dark)' : '3px solid transparent',
                  color: teamControlTab === 'channels' ? 'var(--text-strong)' : 'var(--text-soft)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📡 Canales Conectados</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)'
                }}>
                  {teamChannels.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTeamControlTab('meta')}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: teamControlTab === 'meta' ? '3px solid var(--wa-teal-dark)' : '3px solid transparent',
                  color: teamControlTab === 'meta' ? 'var(--text-strong)' : 'var(--text-soft)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚙️ Configuración Meta</span>
              </button>
            </div>

            {/* Contenido de la Pestaña */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingControl ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-soft)' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                  <p style={{ margin: 0 }}>Cargando datos del equipo…</p>
                </div>
              ) : (
                <>
                  {/* PESTAÑA: OPERADORES */}
                  {teamControlTab === 'users' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-strong)' }}>
                            Operadores y Administradores
                          </h4>
                          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                            Personal con acceso a responder chats y gestionar esta empresa.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="btn-primary-gold"
                          onClick={openCreateUserModal}
                          style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>+</span>
                          <span>Agregar Operador</span>
                        </button>
                      </div>

                      {teamUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px', background: 'var(--bg-sunken)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                          <p style={{ margin: 0, color: 'var(--text-soft)' }}>
                            No hay operadores registrados en este equipo aún.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {teamUsers.map(u => {
                            const isUserActive = u.is_active !== false;

                            return (
                              <div
                                key={u.id}
                                style={{
                                  background: 'var(--bg-panel)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '10px',
                                  padding: '12px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  boxShadow: 'var(--shadow-1)'
                                }}
                              >
                                {/* Info del Operador */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: u.role === 'admin' ? 'var(--wa-teal-dark)' : 'var(--wa-blue)',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '15px'
                                  }}>
                                    {(u.name || u.email || 'O').charAt(0).toUpperCase()}
                                  </div>

                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-strong)' }}>
                                        {u.name}
                                      </strong>
                                      <span style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 7px',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        background: u.role === 'admin' ? 'rgba(0, 168, 132, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                                        color: u.role === 'admin' ? 'var(--wa-teal-dark)' : 'var(--wa-blue)',
                                        border: '1px solid ' + (u.role === 'admin' ? 'rgba(0, 168, 132, 0.3)' : 'rgba(2, 132, 199, 0.3)')
                                      }}>
                                        {u.role === 'admin' ? '👑 Administrador' : '🎧 Operador'}
                                      </span>
                                      <span style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 7px',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        background: isUserActive ? 'rgba(14, 163, 111, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: isUserActive ? 'var(--ok)' : 'var(--danger)',
                                        border: '1px solid ' + (isUserActive ? 'rgba(14, 163, 111, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                                      }}>
                                        {isUserActive ? '● Activo' : '⏸ Inactivo'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '2px' }}>
                                      {u.email}
                                    </div>
                                  </div>
                                </div>

                                {/* Canales Asignados */}
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-body)', minWidth: '180px' }}>
                                  {u.role === 'admin' ? (
                                    <span style={{ color: 'var(--wa-teal-dark)', fontWeight: 600 }}>
                                      ✓ Acceso total (Admin de Empresa)
                                    </span>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ color: 'var(--text-soft)' }}>Canales:</span>
                                      {u.channel_ids && u.channel_ids.length > 0 ? (
                                        u.channel_ids.map(cId => {
                                          const ch = teamChannels.find(c => c.id === cId);
                                          return (
                                            <span
                                              key={cId}
                                              style={{
                                                fontSize: '0.7rem',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: 'var(--bg-sunken)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-strong)'
                                              }}
                                            >
                                              {ch ? ch.name : `#${cId}`}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>Sin canales asignados</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Acciones de Usuario */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => openEditUserModal(u)}
                                    style={{
                                      background: 'var(--bg-sunken)',
                                      border: '1px solid var(--border-strong)',
                                      color: 'var(--text-strong)',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <span>✏️</span>
                                    <span>Editar</span>
                                  </button>

                                  {u.role !== 'superadmin' && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserStatus(u)}
                                      style={{
                                        background: isUserActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(14, 163, 111, 0.08)',
                                        border: '1px solid ' + (isUserActive ? 'var(--danger)' : 'var(--ok)'),
                                        color: isUserActive ? 'var(--danger)' : 'var(--ok)',
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.76rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title={isUserActive ? "Desactivar temporalmente el acceso" : "Reactivar acceso"}
                                    >
                                      <span>{isUserActive ? '⏸️' : '▶️'}</span>
                                      <span>{isUserActive ? 'Desactivar' : 'Reactivar'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PESTAÑA: CANALES CONECTADOS */}
                  {teamControlTab === 'channels' && (
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-strong)' }}>
                          Canales de Comunicación Conectados
                        </h4>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                          Cuentas de WhatsApp Business, Páginas de Facebook y Cuentas de Instagram vinculadas.
                        </p>
                      </div>

                      {teamChannels.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-sunken)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                          <p style={{ margin: 0, color: 'var(--text-soft)' }}>
                            Esta empresa no tiene canales conectados actualmente. El administrador del equipo puede conectarlos desde su panel de configuración.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                          {teamChannels.map(ch => (
                            <div
                              key={ch.id}
                              style={{
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                padding: '14px',
                                boxShadow: 'var(--shadow-1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <IconoDeCanal platform={ch.platform} size={18} />
                                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-strong)' }}>{ch.name}</strong>
                                </div>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                  fontWeight: 700,
                                  background: ch.status === 'active' ? 'rgba(14, 163, 111, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: ch.status === 'active' ? 'var(--ok)' : 'var(--danger)',
                                  border: '1px solid ' + (ch.status === 'active' ? 'rgba(14, 163, 111, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                                }}>
                                  {ch.status}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.76rem', color: 'var(--text-soft)' }}>
                                ID: <code style={{ color: 'var(--wa-blue)' }}>{ch.channel_identifier}</code>
                              </div>

                              {ch.app_id && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-soft)' }}>
                                  App ID: <code>{ch.app_id}</code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PESTAÑA: CONFIGURACIÓN META */}
                  {teamControlTab === 'meta' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{
                        background: 'var(--bg-sunken)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--wa-blue)' }}>
                          ⚙️ Credenciales de Meta Developers para {selectedTeamForControl.name}
                        </strong>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem' }}>
                          <span style={{ color: 'var(--text-soft)', width: '130px' }}>Meta App ID:</span>
                          {selectedTeamForControl.meta_app_id ? (
                            <code style={{ background: 'var(--bg-panel)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--wa-blue)' }}>
                              {selectedTeamForControl.meta_app_id}
                            </code>
                          ) : (
                            <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>Sin configurar</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem' }}>
                          <span style={{ color: 'var(--text-soft)', width: '130px' }}>Meta App Secret:</span>
                          <span style={{ color: selectedTeamForControl.has_meta_secret ? 'var(--ok)' : 'var(--warn)', fontWeight: 600 }}>
                            {selectedTeamForControl.has_meta_secret ? '🔒 Configurado y cifrado (AES-256-GCM)' : '⚠️ No configurado'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button
                            type="button"
                            className="btn-card-action"
                            onClick={() => openEditTeamModal(selectedTeamForControl)}
                            style={{
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-strong)',
                              padding: '7px 14px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Modificar Credenciales Meta
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedTeamForControl(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL: CREAR / EDITAR OPERADOR EN EQUIPO
         ========================================================================= */}
      {showUserModal && selectedTeamForControl && (
        <div className="modal-overlay active" onClick={() => setShowUserModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>
                {editingUser ? `✏️ Editar Operador: ${editingUser.name}` : `➕ Agregar Operador a ${selectedTeamForControl.name}`}
              </h3>
              <button className="btn-close-modal" onClick={() => setShowUserModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Nombre Completo (*):
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="Ej: Laura Martínez"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Correo Electrónico (*):
                  </label>
                  <input
                    type="email"
                    className="input-custom"
                    placeholder="laura@empresa.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Rol en la Empresa (*):
                  </label>
                  <select
                    className="input-custom"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="agent">🎧 Operador (Atención de chats asignados)</option>
                    <option value="admin">👑 Administrador de Empresa (Acceso completo y configuración)</option>
                  </select>
                </div>

                {/* Contraseña */}
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    {editingUser ? 'Restablecer Contraseña (Opcional):' : 'Contraseña de Acceso (*):'}
                  </label>
                  <input
                    type="password"
                    className="input-custom"
                    placeholder={editingUser ? 'Dejar en blanco para mantener la contraseña actual' : 'Mínimo 12 caracteres'}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required={!editingUser}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: '4px', display: 'block' }}>
                    {editingUser ? '🔒 Solo ingresa una contraseña si deseas cambiarla.' : '🔒 Mínimo 12 caracteres recomendados.'}
                  </span>
                </div>

                {/* Asignación de Canales (Solo para operadores) */}
                {userForm.role === 'agent' && (
                  <div style={{
                    background: 'var(--bg-sunken)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 14px'
                  }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-strong)', display: 'block', marginBottom: '8px' }}>
                      Asignar Canales para este Operador:
                    </label>

                    {teamChannels.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                        No hay canales registrados en este equipo todavía.
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {teamChannels.map(ch => {
                          const isChecked = userForm.channelIds.includes(ch.id);

                          return (
                            <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-body)' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setUserForm({ ...userForm, channelIds: [...userForm.channelIds, ch.id] });
                                  } else {
                                    setUserForm({ ...userForm, channelIds: userForm.channelIds.filter(id => id !== ch.id) });
                                  }
                                }}
                              />
                              <IconoDeCanal platform={ch.platform} size={15} />
                              <span>{ch.name}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>({ch.platform})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={submittingUser}
                >
                  {submittingUser ? 'Guardando…' : (editingUser ? 'Guardar Cambios' : 'Registrar Operador')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL: CREAR EQUIPO / EMPRESA
         ========================================================================= */}
      {showCreateModal && (
        <div className="modal-overlay active" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>🏢 Crear Nueva Empresa / Equipo</h3>
              <button className="btn-close-modal" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Nombre de la Empresa (*):
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="Ej: Distribuidora Central S.A."
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
                    👤 Administrador Inicial del Equipo (Opcional)
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
                  disabled={submittingTeam}
                >
                  {submittingTeam ? 'Creando Empresa…' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. MODAL: EDITAR EQUIPO / EMPRESA
         ========================================================================= */}
      {showEditModal && editingTeam && (
        <div className="modal-overlay active" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>✏️ Editar Empresa / Equipo</h3>
              <button className="btn-close-modal" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleUpdateTeam}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-custom">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    Nombre de la Empresa (*):
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
                    🔒 Se almacena cifrado con AES-256-GCM en la base de datos PostgreSQL.
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
                  disabled={submittingTeam}
                >
                  {submittingTeam ? 'Guardando…' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Contenedor de Notificaciones Toast */}
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
