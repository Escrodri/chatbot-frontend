import React from 'react';

/** Marca de la app: burbuja de chat con tres canales. */
export function BrandMark({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.2c-5.4 0-9.8 3.9-9.8 8.7 0 2.6 1.3 5 3.4 6.6v3.4c0 .5.6.8 1 .5l3-2a11 11 0 0 0 2.4.3c5.4 0 9.8-3.9 9.8-8.8S17.4 2.2 12 2.2z" />
      <circle cx="7.9" cy="10.9" r="1.35" fill="#fff" />
      <circle cx="12" cy="10.9" r="1.35" fill="#fff" />
      <circle cx="16.1" cy="10.9" r="1.35" fill="#fff" />
    </svg>
  );
}

export default BrandMark;
