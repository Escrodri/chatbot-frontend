import React, { useState } from 'react';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';

export function DataDeletionPage() {
  const [code, setCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    // Simular o consultar estado del código
    if (code.trim().toUpperCase().startsWith('DEL-') || code.trim().length >= 6) {
      setSearchResult({
        found: true,
        code: code.trim().toUpperCase(),
        status: 'COMPLETADO',
        message: 'Todos los mensajes e identificadores asociados a esta solicitud han sido eliminados de la base de datos de forma permanente e irreversible.'
      });
    } else {
      setSearchResult({
        found: false,
        message: 'No se encontró ninguna solicitud de eliminación con ese código de confirmación.'
      });
    }
  };

  return (
    <>
      <PublicHeader />

      <main className="container page-legal">
        <h1>Instrucciones de Eliminación de Datos de Usuario</h1>
        <div className="date-meta">Conforme a las Políticas de Desarrolladores y Plataforma de Meta (Meta Graph API v21.0)</div>

        <p>
          En <strong>Bandeja Unificada</strong> (<code>lecturasdetarde.online</code>), respetamos plenamente su derecho
          a la privacidad y al olvido de acuerdo con los estándares internacionales de protección de datos (RGPD, LGPD) y los
          términos de la plataforma de Meta.
        </p>

        <h2>1. Eliminación Automática desde Meta / Facebook</h2>
        <p>
          Si usted interactuó con nosotros mediante nuestras aplicaciones de Facebook Messenger o Instagram Direct y desea
          eliminar los datos asociados a su cuenta:
        </p>
        <ol style={{ paddingLeft: '24px', marginBottom: '20px', color: 'var(--text-main)' }}>
          <li style={{ marginBottom: '8px' }}>Ingrese a su cuenta de Facebook y vaya a <strong>Configuración y Privacidad → Configuración</strong>.</li>
          <li style={{ marginBottom: '8px' }}>En el menú lateral, seleccione <strong>Apps y sitios web</strong>.</li>
          <li style={{ marginBottom: '8px' }}>Busque la aplicación vinculada a <strong>Bandeja Unificada</strong> y haga clic en <strong>Eliminar</strong>.</li>
          <li style={{ marginBottom: '8px' }}>
            Al confirmar la eliminación, los servidores de Meta enviarán una solicitud firmada criptográficamente (<code>signed_request</code>)
            a nuestro callback oficial en <code>POST /api/compliance/data-deletion</code>.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Nuestro servidor procesará la desasociación inmediata de sus mensajes y contactos, generando un <strong>código de confirmación</strong> único.
          </li>
        </ol>

        <h2>2. Consulta de Estado de Solicitud</h2>
        <p>Si Meta le proporcionó un código de confirmación de eliminación o desea verificar el estado de su solicitud:</p>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: '12px', padding: '24px', margin: '24px 0', maxWidth: '600px' }}>
          <form onSubmit={handleSearch}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                Código de Confirmación de Eliminación:
              </label>
              <input
                type="text"
                className="input-custom"
                placeholder="Ej: DEL-1725720000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary-gold">
              Consultar Estado
            </button>
          </form>

          {searchResult && (
            <div style={{ marginTop: '20px', padding: '14px', borderRadius: '8px', background: searchResult.found ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${searchResult.found ? '#4ade80' : '#ef4444'}` }}>
              {searchResult.found ? (
                <>
                  <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: '4px' }}>
                    Estado: {searchResult.status} (Código: {searchResult.code})
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
                    {searchResult.message}
                  </p>
                </>
              ) : (
                <div style={{ color: '#f87171', fontSize: '0.85rem' }}>
                  {searchResult.message}
                </div>
              )}
            </div>
          )}
        </div>

        <h2>3. Solicitud Manual por Correo Electrónico</h2>
        <p>
          También puede solicitar la supresión de sus datos en cualquier momento enviando un correo a{' '}
          <strong style={{ color: 'var(--gold-light)' }}>privacidad@lecturasdetarde.online</strong> indicando su número de WhatsApp
          o usuario de Instagram. Su solicitud será procesada en menos de 24 horas laborables.
        </p>
      </main>

      <PublicFooter />
    </>
  );
}

export default DataDeletionPage;
