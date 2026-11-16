// ─── Naipes Españoles Tradicionales de Truco (Estilo Fournier Auténtico) ────
import React from 'react';
import type { Card as CardType } from '../engine/types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  className?: string;
}

const BASE = import.meta.env.BASE_URL
  ? (import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`)
  : './';

/** Frente del Naipe Español (Imágenes Oficiales Fournier) */
export function CardFace({ card, onClick, disabled, small, className = '' }: CardProps) {
  const isMacho = card.num === 1 && card.suit === 'espada';
  const isHembra = card.num === 1 && card.suit === 'basto';
  const isSieteBravo = card.num === 7 && (card.suit === 'espada' || card.suit === 'oro');
  const isBrava = isMacho || isHembra || isSieteBravo;

  // Ruta a la imagen auténtica en public/cards/
  const imgUrl = `${BASE}cards/${card.suit}-${card.num}.jpg`;

  return (
    <button
      type="button"
      className={`truco-card-argentina ${isBrava ? 'carta-brava' : ''} ${disabled ? 'disabled' : ''} ${small ? 'small-card' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={card.label}
      aria-label={card.label}
    >
      <img
        src={imgUrl}
        alt={card.label}
        className="card-fournier-img"
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {isBrava && <div className="card-brava-glow-border" aria-hidden="true" />}
    </button>
  );
}

/** Dorso del Naipe Español (Dorso Gaucho Tradicional) */
export function CardBack({ small, className = '' }: { small?: boolean; className?: string }) {
  return (
    <div className={`card-back-argentina ${small ? 'small-back' : ''} ${className}`} aria-hidden="true">
      <img
        src={`${BASE}cards/back.png`}
        alt="Dorso de naipe"
        className="card-fournier-img card-back-img"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
