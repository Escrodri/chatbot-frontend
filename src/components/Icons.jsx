import React from 'react';
import { FaWhatsapp, FaFacebookMessenger, FaInstagram } from 'react-icons/fa6';

/**
 * Íconos de la aplicación.
 *
 * Están todos acá por una razón: cuando cada pantalla dibuja los suyos, terminan
 * con grosores y tamaños distintos y el conjunto se ve desprolijo. Todos usan la
 * misma caja de 24, el mismo grosor de trazo y heredan el color del texto, así
 * que funcionan igual en el tema claro y en el oscuro.
 *
 * Los de WhatsApp, Messenger e Instagram vienen de react-icons, que trae las
 * marcas oficiales. Dibujarlas a mano daría versiones aproximadas y se notaría.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false'
};

const Icono = ({ size = 18, children, ...resto }) => (
  <svg width={size} height={size} {...base} {...resto}>{children}</svg>
);

export const IconoBuscar = (p) => (
  <Icono {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Icono>
);

export const IconoMensajes = (p) => (
  <Icono {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.6 9.6 0 0 1-2.4-.3L4 21l1.3-4a8 8 0 0 1-1.3-4.4 8.4 8.4 0 0 1 9-8.3 8.4 8.4 0 0 1 8 7.2Z" /></Icono>
);

export const IconoAjustes = (p) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.1 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.5 1V20a1.9 1.9 0 1 1-3.7 0v-.1a1.5 1.5 0 0 0-2.5-1l-.1.1a1.9 1.9 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1-2.5H4a1.9 1.9 0 1 1 0-3.7h.1a1.5 1.5 0 0 0 1-2.5l-.1-.1a1.9 1.9 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 2.5-1V4a1.9 1.9 0 1 1 3.7 0v.1a1.5 1.5 0 0 0 2.5 1l.1-.1a1.9 1.9 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1 2.5h.1a1.9 1.9 0 1 1 0 3.7H20a1.5 1.5 0 0 0-.9.7Z" />
  </Icono>
);

export const IconoSol = (p) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icono>
);

export const IconoLuna = (p) => (
  <Icono {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></Icono>
);

export const IconoClip = (p) => (
  <Icono {...p}><path d="m21.4 11.1-9.2 9.1a6 6 0 0 1-8.5-8.5l8.6-8.5A4 4 0 1 1 18 8.9l-8.6 8.5a2 2 0 0 1-2.8-2.8l8.5-8.5" /></Icono>
);

export const IconoMicrofono = (p) => (
  <Icono {...p}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </Icono>
);

export const IconoEnviar = (p) => (
  <Icono {...p}><path d="M4 12 20.5 4 13 20l-1.8-6.2L4 12Z" /></Icono>
);

export const IconoReproducir = ({ size = 18, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="M7 4.8v14.4c0 .7.8 1.1 1.4.7l11-7.2c.5-.4.5-1.1 0-1.4l-11-7.2c-.6-.4-1.4 0-1.4.7Z" />
  </svg>
);

export const IconoPausa = ({ size = 18, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <rect x="6.5" y="4.5" width="4" height="15" rx="1.3" />
    <rect x="13.5" y="4.5" width="4" height="15" rx="1.3" />
  </svg>
);

export const IconoEditar = (p) => (
  <Icono {...p}><path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Icono>
);

export const IconoPausar = (p) => (
  <Icono {...p}><circle cx="12" cy="12" r="9" /><path d="M10 9.5v5M14 9.5v5" /></Icono>
);

export const IconoEliminar = (p) => (
  <Icono {...p}><path d="M4 6.5h16M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M6.5 6.5 7.4 20a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3l.9-13.5" /></Icono>
);

export const IconoProbar = (p) => (
  <Icono {...p}><path d="M12 3.5v6M12 20.5a6.5 6.5 0 0 0 4.6-11.1M12 20.5a6.5 6.5 0 0 1-4.6-11.1" /></Icono>
);

export const IconoAgregar = (p) => (
  <Icono {...p}><path d="M12 5v14M5 12h14" /></Icono>
);

export const IconoBuscarPaginas = (p) => (
  <Icono {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2M8.5 11h5M11 8.5v5" /></Icono>
);

export const IconoRobot = (p) => (
  <Icono {...p}>
    <rect x="4" y="8" width="16" height="11" rx="3" />
    <path d="M12 4.5V8M9 13.5h.01M15 13.5h.01" />
  </Icono>
);

export const IconoEquipo = (p) => (
  <Icono {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.6a3.2 3.2 0 0 1 0 5.9M17.5 14.4a5.5 5.5 0 0 1 3 5.6" />
  </Icono>
);

export const IconoRegistro = (p) => (
  <Icono {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
    <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
  </Icono>
);

export const IconoCanales = (p) => (
  <Icono {...p}>
    <path d="M12 3.5v17M5 7.5v9M19 7.5v9" />
  </Icono>
);

export const IconoAlerta = (p) => (
  <Icono {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></Icono>
);

export const IconoVisto = (p) => (
  <Icono {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icono>
);

export const IconoVenta = (p) => (
  <Icono {...p}>
    <path d="M3.5 6.5h2l2 10.5h10l2-7.5H7" />
    <circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" />
  </Icono>
);

/** Colores de marca, para cuando el ícono va suelto y necesita identificarse. */
const COLOR_DE_CANAL = {
  whatsapp: '#25D366',
  facebook: '#0084FF',
  messenger: '#0084FF',
  instagram: '#E1306C'
};

const MARCA_DE_CANAL = {
  whatsapp: FaWhatsapp,
  facebook: FaFacebookMessenger,
  messenger: FaFacebookMessenger,
  instagram: FaInstagram
};

/**
 * Ícono del canal, con la marca oficial.
 *
 * @param {{ platform: string, size?: number, color?: boolean }} props
 *   `color` en falso hereda el color del texto, para cuando va dentro de algo
 *   que ya tiene su propio color y el logo a todo color quedaría estridente.
 */
export function IconoDeCanal({ platform, size = 16, color = true, ...resto }) {
  const clave = String(platform || '').toLowerCase();
  const Marca = MARCA_DE_CANAL[clave];
  if (!Marca) return null;

  return (
    <Marca
      size={size}
      color={color ? COLOR_DE_CANAL[clave] : undefined}
      aria-hidden="true"
      {...resto}
    />
  );
}

export { FaWhatsapp, FaFacebookMessenger, FaInstagram };
export default {
  IconoBuscar, IconoMensajes, IconoAjustes, IconoSol, IconoLuna, IconoClip,
  IconoMicrofono, IconoEnviar, IconoReproducir, IconoPausa, IconoEditar,
  IconoPausar, IconoEliminar, IconoProbar, IconoAgregar, IconoBuscarPaginas,
  IconoRobot, IconoEquipo, IconoRegistro, IconoCanales, IconoAlerta,
  IconoVenta, IconoVisto, IconoDeCanal
};
