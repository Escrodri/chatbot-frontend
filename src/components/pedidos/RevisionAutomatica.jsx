import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ordersService } from '../../services/orders.service';

/**
 * El interruptor de "salgo un rato, que apruebe solo".
 *
 * La aprobación automática de comprobantes nació atada al horario: de noche
 * sí, de día no, porque de día hay alguien mirando. Es la regla correcta
 * mientras esa persona esté. En cuanto sale a hacer un trámite, el comprobante
 * de las once de la mañana queda esperando igual que el de las tres de la
 * madrugada, pero sin la excusa de la hora: el cliente ve que es horario de
 * atención, que nadie le contesta, y saca la única conclusión que le queda.
 *
 * Tres cosas de esta pantalla no son decorativas:
 *
 * Lo primero que se lee es si ahora mismo está aprobando sola o no, en una
 * frase y no en un ícono. Un interruptor que solo muestra su posición obliga a
 * hacer la cuenta mental "está en modo noche, son las tres de la tarde,
 * entonces no"; y esa cuenta se hace mal justo el día que uno está apurado
 * por salir.
 *
 * El vencimiento no es opcional por capricho. Un interruptor sin vencimiento
 * se queda encendido: se activa un martes para salir dos horas y tres semanas
 * después sigue aprobando sola a las cuatro de la tarde sin que nadie lo haya
 * decidido. Por eso "siempre" se enciende siempre con un plazo, y cuando vence
 * el sistema vuelve solo a lo de siempre.
 *
 * Y el cartel de los números de prueba está para que nadie encienda "siempre"
 * creyendo que es la única forma de probar el circuito.
 */
export function RevisionAutomatica() {
  const { token, user } = useAuth();
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [editandoCuenta, setEditandoCuenta] = useState(false);
  const [cuenta, setCuenta] = useState({});

  const esAdmin = ['admin', 'superadmin'].includes(user?.role);

  const cargar = useCallback(async () => {
    try {
      const datos = await ordersService.revisionConfig(token);
      setEstado(datos);
      // Solo se precarga el formulario si no se está editando, para no pisarle
      // lo que la persona está escribiendo cuando el reloj recarga el estado.
      setEditandoCuenta(abierta => {
        if (!abierta && datos.datos_pago) setCuenta(datos.datos_pago);
        return abierta;
      });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  // Se revisa cada minuto para que el cartel no mienta: el modo puede vencer,
  // y la franja nocturna puede empezar, sin que nadie recargue la página.
  useEffect(() => {
    const reloj = setInterval(cargar, 60 * 1000);
    return () => clearInterval(reloj);
  }, [cargar]);

  const guardarCuenta = async () => {
    setGuardando(true);
    setError(null);
    try {
      await ordersService.guardarDatosPago(token, cuenta);
      setEditandoCuenta(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiar = async (modo, horas = null) => {
    setGuardando(true);
    setError(null);
    try {
      setEstado(await ordersService.cambiarRevisionConfig(token, { modo, horas }));
      setAbierto(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Este panel NUNCA desaparece.
  //
  // Antes hacía `if (cargando || !estado) return null`, y eso lo volvía
  // invisible en el único momento en que hacía falta que se viera: cuando el
  // backend todavía no tiene esta función y la consulta devuelve 404. La
  // pantalla quedaba exactamente igual que antes de existir el panel, sin un
  // solo cartel, y desde afuera se lee como "no lo hicieron".
  //
  // Un control que decide si se entrega material sin que nadie mire tiene que
  // decir siempre en qué estado está, incluso —sobre todo— cuando no lo puede
  // averiguar.
  if (cargando && !estado) {
    return (
      <section style={{
        border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px',
        padding: '12px 14px', marginBottom: '16px',
        fontSize: '.82rem', color: 'var(--text-soft)'
      }}>
        Aprobación automática de comprobantes — leyendo el estado…
      </section>
    );
  }

  if (!estado) {
    const es404 = /404|not found|no encontr/i.test(error || '');
    return (
      <section style={{
        border: '1px solid #b4530944', background: 'rgba(245,158,11,.10)',
        borderRadius: '10px', padding: '12px 14px', marginBottom: '16px'
      }}>
        <div style={{ fontSize: '.86rem', fontWeight: 700, color: '#b45309' }}>
          Aprobación automática de comprobantes
        </div>
        <div style={{ fontSize: '.79rem', color: 'var(--text-soft)', lineHeight: 1.45, marginTop: '3px' }}>
          {es404
            ? 'El servidor todavía no tiene esta función. Falta desplegar el backend: ' +
              'mientras tanto, todos los comprobantes los revisás vos.'
            : `No se pudo leer el estado: ${error || 'el servidor no contestó'}. ` +
              'Mientras tanto, todos los comprobantes los revisás vos.'}
        </div>
        <button
          type="button"
          onClick={() => { setCargando(true); cargar(); }}
          className="btn-card-action"
          style={{ marginTop: '9px' }}
        >
          Reintentar
        </button>
      </section>
    );
  }

  const activo = Boolean(estado.aprobando_ahora);
  const modo = estado.modo_efectivo;

  const color = activo ? '#047857' : 'var(--text-soft, #6b7280)';
  const fondo = activo ? 'rgba(16,185,129,.12)' : 'rgba(107,114,128,.10)';

  const franja = `${String(estado.franja_nocturna?.desde ?? 21).padStart(2, '0')}:00 ` +
                 `a ${String(estado.franja_nocturna?.hasta ?? 8).padStart(2, '0')}:00`;

  const frase = !estado.habilitada_en_servidor
    ? 'Apagada en la configuración del servidor.'
    : modo === 'apagado'
      ? 'Apagada: todos los comprobantes los revisás vos.'
      : modo === 'siempre'
        ? 'Encendida a toda hora.'
        : activo
          ? `Encendida: es horario de madrugada (${franja}).`
          : `Solo de madrugada (${franja}). Ahora los revisás vos.`;

  const venceEn = estado.hasta && !estado.vencido
    ? new Date(estado.hasta).toLocaleString('es-PY', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      })
    : null;

  const opcion = (texto, onClick, destacado = false) => (
    <button
      type="button"
      disabled={guardando}
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
        fontSize: '.82rem', fontWeight: destacado ? 700 : 500,
        border: `1px solid ${destacado ? '#04785744' : 'var(--border-gold, #e2e2e2)'}`,
        background: destacado ? 'rgba(16,185,129,.10)' : 'transparent',
        color: destacado ? '#047857' : 'inherit',
        width: '100%', lineHeight: 1.35
      }}
    >
      {texto}
    </button>
  );

  const campo = (clave, etiqueta, ejemplo) => (
    <label style={{ display: 'block', fontSize: '.74rem', color: 'var(--text-soft)' }}>
      {etiqueta}
      <input
        type="text"
        value={cuenta[clave] || ''}
        onChange={(e) => setCuenta(c => ({ ...c, [clave]: e.target.value }))}
        placeholder={ejemplo}
        style={{
          width: '100%', marginTop: '3px', padding: '7px 9px', borderRadius: '7px',
          border: '1px solid var(--border-gold, #ddd)', fontSize: '.84rem'
        }}
      />
    </label>
  );

  return (
    <section style={{
      border: `1px solid ${activo ? '#04785733' : 'var(--border-gold, #e2e2e2)'}`,
      background: fondo, borderRadius: '10px',
      padding: '12px 14px', marginBottom: '16px'
    }}>
      {/* Sin la cuenta cargada, la aprobación automática no entrega nada por
          más encendida que esté: no tiene contra qué contrastar el comprobante.
          Va arriba de todo y en naranja porque el momento de enterarse es
          ahora, no cuando un cliente ya transfirió. */}
      {estado.datos_pago && !estado.datos_pago.configurado && !editandoCuenta && (
        <div style={{
          marginBottom: '11px', padding: '9px 11px', borderRadius: '8px',
          background: 'rgba(245,158,11,.16)', border: '1px solid #b4530933',
          fontSize: '.79rem', color: '#b45309', lineHeight: 1.45
        }}>
          <strong>Falta cargar la cuenta que recibe las transferencias.</strong> Sin
          eso no puede verificar ningún comprobante solo, aunque esté encendida.
          <button
            type="button"
            onClick={() => setEditandoCuenta(true)}
            className="btn-card-action"
            style={{ display: 'block', marginTop: '8px' }}
          >
            Cargarla ahora
          </button>
        </div>
      )}

      {editandoCuenta && (
        <div style={{
          marginBottom: '11px', padding: '11px', borderRadius: '8px',
          background: 'var(--bg-card, #fff)', border: '1px solid var(--border-gold, #e2e2e2)'
        }}>
          <div style={{ fontSize: '.84rem', fontWeight: 700, marginBottom: '8px' }}>
            Cuenta que recibe las transferencias
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {campo('titular', 'Titular', 'Enmanuel Rodríguez')}
            {campo('cuenta', 'Número de cuenta', '18233467')}
            {campo('alias', 'Alias', '4571109')}
            {campo('documento', 'Documento (si el alias es la cédula)', '4571109')}
            {campo('banco', 'Banco', 'ueno bank')}
          </div>
          <p style={{ margin: '9px 0 0', fontSize: '.73rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>
            Alcanza con que el comprobante coincida en uno de estos datos. Cargá los
            que tengas: cada banco muestra cosas distintas en la captura.
          </p>
          <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
            <button type="button" className="btn-card-action" disabled={guardando} onClick={guardarCuenta}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="btn-card-action" onClick={() => setEditandoCuenta(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{
          width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
          background: activo ? '#10b981' : '#9ca3af'
        }} />

        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '.86rem', fontWeight: 700, color }}>
            Aprobación automática de comprobantes
          </div>
          <div style={{ fontSize: '.79rem', color: 'var(--text-soft)', lineHeight: 1.4 }}>
            {frase}
            {venceEn
              ? <> Vuelve a lo de siempre a las <strong>{venceEn}</strong>.</>
              // Encendida sin plazo: que se vea que no se apaga sola, porque
              // esperar un vencimiento que no existe es cómo se termina
              // entregando sin revisión un martes a las tres de la tarde sin
              // que nadie lo haya decidido ese día.
              : (modo === 'siempre' && <> <strong>No se apaga sola</strong>: queda así hasta que la cambies.</>)}
            {/* Lo primero que uno quiere ver al volver de la calle: cuántas
                entregó solo mientras no estabas, y si el tope del día está por
                frenar las que vengan. */}
            {Number(estado.entregadas_hoy) > 0 && (
              <> Hoy entregó <strong>{estado.entregadas_hoy}</strong>
                {Number(estado.max_por_dia) > 0 && ` de ${estado.max_por_dia}`} sin revisión.</>
            )}
            {Number(estado.max_por_dia) > 0 &&
              Number(estado.entregadas_hoy) >= Number(estado.max_por_dia) && (
              <> <span style={{ color: '#b45309', fontWeight: 600 }}>
                Llegó al tope del día: el resto lo revisás vos hasta mañana.
              </span></>
            )}
          </div>
        </div>

        {/* El botón se muestra siempre. Esconderlo por rol dejaba la pantalla
            idéntica a como era antes de que este panel existiera, y no había
            forma de distinguir "no tenés permiso" de "no se instaló". Quien no
            es administrador lo ve deshabilitado y con el motivo escrito; el
            permiso de verdad lo sigue aplicando el servidor. */}
        <button
          type="button"
          onClick={() => esAdmin && setAbierto(a => !a)}
          disabled={!esAdmin}
          title={esAdmin ? 'Cambiar el modo' : 'Solo un administrador puede cambiar esto'}
          className="btn-card-action"
          style={{ flexShrink: 0, opacity: esAdmin ? 1 : 0.55, cursor: esAdmin ? 'pointer' : 'not-allowed' }}
        >
          {abierto ? 'Cerrar' : 'Cambiar'}
        </button>
      </div>

      {!esAdmin && (
        <p style={{ margin: '8px 0 0', fontSize: '.75rem', color: 'var(--text-soft)' }}>
          Solo un administrador puede cambiar esto.
        </p>
      )}

      {error && (
        <p style={{ margin: '9px 0 0', fontSize: '.78rem', color: '#b91c1c' }}>{error}</p>
      )}

      {abierto && esAdmin && (
        <div style={{ marginTop: '12px', display: 'grid', gap: '7px' }}>
          {opcion(
            <>Salgo un rato — <strong>que apruebe sola 2 horas</strong></>,
            () => cambiar('siempre', 2),
            modo !== 'siempre'
          )}
          {opcion(<>Salgo por más tiempo — que apruebe sola <strong>6 horas</strong></>, () => cambiar('siempre', 6))}
          {opcion(<>Todo el día — que apruebe sola <strong>12 horas</strong></>, () => cambiar('siempre', 12))}

          {/* Sin plazo.
              Las tres de arriba vencen solas, y esa es la opción sana para el
              "salgo un rato": un interruptor que queda encendido porque nadie
              se acordó de apagarlo no es una decisión de nadie.
              Pero decidir que de acá en adelante entregue siempre sola SÍ es
              una decisión, y tiene que poder tomarse. Sin esta opción, la
              alternativa real no era más seguridad: era volver a encenderla
              cada doce horas, olvidarse una vez, y dejar esperando a alguien
              que ya pagó. */}
          {opcion(
            <>Siempre, sin plazo — <strong>hasta que yo la apague</strong></>,
            () => {
              const ok = window.confirm(
                'La aprobación automática va a quedar encendida a toda hora, sin vencimiento, ' +
                'hasta que vos la apagues.\n\n' +
                'Los controles siguen valiendo igual: monto, cuenta y número de operación. ' +
                'Y el tope de entregas por día también.\n\n' +
                '¿Seguimos?'
              );
              if (ok) cambiar('siempre', null);
            }
          )}

          {opcion(<>Volver a lo de siempre — <strong>solo de madrugada</strong> ({franja})</>, () => cambiar('noche'))}
          {opcion(<>Apagarla del todo — <strong>reviso yo todos</strong>, incluso de madrugada</>, () => cambiar('apagado'))}

          <p style={{
            margin: '4px 0 0', fontSize: '.74rem', color: 'var(--text-soft)', lineHeight: 1.45
          }}>
            Aunque esté encendida, sigue entregando sola únicamente cuando no queda
            ninguna duda: el monto tiene que llegar al precio, la cuenta de destino
            tiene que ser la tuya y el número de operación no puede haber cobrado
            otro pedido. Cualquier cosa rara cae igual en tu revisión.
          </p>
          <p style={{
            margin: 0, fontSize: '.74rem', color: 'var(--text-soft)', lineHeight: 1.45
          }}>
            Para probar no hace falta encender nada: los comprobantes que llegan
            desde los números de prueba se aprueban solos a cualquier hora.
          </p>
        </div>
      )}
    </section>
  );
}

export default RevisionAutomatica;
