import React, { useEffect, useRef, useState } from 'react';
import { IconoReproducir, IconoPausa, IconoMicrofono } from '../Icons';

/**
 * Reproductor de notas de voz.
 *
 * El reproductor nativo del navegador ocupa mucho, cambia de aspecto en cada
 * navegador y trae un menú de tres puntos que acá no sirve para nada. Este es
 * el mínimo que hace falta en un chat: reproducir, ver por dónde va y saber
 * cuánto dura.
 */
function formatearTiempo(segundos) {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayer({ src, propio = false }) {
  const audioRef = useRef(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [posicion, setPosicion] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const alActualizar = () => setPosicion(audio.currentTime);
    const alCargar = () => {
      // Un audio grabado en streaming puede informar duración infinita hasta
      // que se lo recorre entero; en ese caso se muestra al terminar.
      if (Number.isFinite(audio.duration)) setDuracion(audio.duration);
    };
    const alTerminar = () => {
      setReproduciendo(false);
      setPosicion(0);
      if (Number.isFinite(audio.duration)) setDuracion(audio.duration);
    };
    const alFallar = () => setError(true);

    audio.addEventListener('timeupdate', alActualizar);
    audio.addEventListener('loadedmetadata', alCargar);
    audio.addEventListener('durationchange', alCargar);
    audio.addEventListener('ended', alTerminar);
    audio.addEventListener('error', alFallar);

    return () => {
      audio.removeEventListener('timeupdate', alActualizar);
      audio.removeEventListener('loadedmetadata', alCargar);
      audio.removeEventListener('durationchange', alCargar);
      audio.removeEventListener('ended', alTerminar);
      audio.removeEventListener('error', alFallar);
    };
  }, [src]);

  const alternar = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (reproduciendo) {
      audio.pause();
      setReproduciendo(false);
    } else {
      audio.play().then(() => setReproduciendo(true)).catch(() => setError(true));
    }
  };

  const buscar = (e) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duracion) || duracion <= 0) return;
    const nueva = Number(e.target.value);
    audio.currentTime = nueva;
    setPosicion(nueva);
  };

  if (error) {
    return <div className="audio-player audio-player-error">No se pudo cargar el audio.</div>;
  }

  const avance = duracion > 0 ? posicion : 0;

  return (
    <div className={`audio-player ${propio ? 'propio' : ''}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        className="audio-player-boton"
        onClick={alternar}
        aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
      >
        {reproduciendo ? <IconoPausa size={15} /> : <IconoReproducir size={15} />}
      </button>

      <input
        type="range"
        className="audio-player-barra"
        min={0}
        max={duracion > 0 ? duracion : 0}
        step="any"
        value={avance}
        onChange={buscar}
        disabled={!(duracion > 0)}
        aria-label="Posición del audio"
      />

      <span className="audio-player-tiempo">
        {formatearTiempo(reproduciendo || posicion > 0 ? posicion : duracion)}
      </span>

      <IconoMicrofono size={13} className="audio-player-marca" />
    </div>
  );
}

export default AudioPlayer;
