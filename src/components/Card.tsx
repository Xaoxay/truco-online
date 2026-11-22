// ─── Naipes Españoles Tradicionales de Truco (Estilo Fournier Auténtico) ────
import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../engine/types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  className?: string;
}

/** Obtiene la URL exacta de la carta de alta definición (WebP ultra liviano con fallback SVG/JPG) */
export function getCardUrl(suit: string, num: number | string): string {
  if (typeof window !== 'undefined') {
    const loc = window.location;
    // Si corre en GitHub Pages (ej: xaoxay.github.io/truco-online)
    if (loc.hostname.includes('github.io') || loc.pathname.includes('/truco-online')) {
      return `/truco-online/cards/${suit}-${num}.webp`;
    }
  }
  return `./cards/${suit}-${num}.webp`;
}

export function getCardBackUrl(): string {
  if (typeof window !== 'undefined') {
    const loc = window.location;
    if (loc.hostname.includes('github.io') || loc.pathname.includes('/truco-online')) {
      return `/truco-online/cards/back.webp`;
    }
  }
  return `./cards/back.webp`;
}

const suitSymbols: Record<string, string> = {
  espada: '⚔️',
  basto: '🌿',
  oro: '🪙',
  copa: '🏆',
};

const suitColors: Record<string, string> = {
  espada: '#1e3a8a',
  basto: '#15803d',
  oro: '#b45309',
  copa: '#b91c1c',
};

/** Frente del Naipe Español (Imágenes Oficiales Fournier con Triple Fallback) */
export function CardFace({ card, onClick, disabled, small, className = '' }: CardProps) {
  const isMacho = card.num === 1 && card.suit === 'espada';
  const isHembra = card.num === 1 && card.suit === 'basto';
  const isSieteBravo = card.num === 7 && (card.suit === 'espada' || card.suit === 'oro');
  const isBrava = isMacho || isHembra || isSieteBravo;

  const [currentSrc, setCurrentSrc] = useState(() => getCardUrl(card.suit, card.num));
  const [attempt, setAttempt] = useState(0);

  // Cuando cambie la carta (nuevas rondas o tiradas), reiniciar al enlace primario
  useEffect(() => {
    setCurrentSrc(getCardUrl(card.suit, card.num));
    setAttempt(0);
  }, [card.suit, card.num]);

  const handleError = () => {
    if (attempt === 0) {
      setAttempt(1);
      // Alternar ruta relativa o absoluta de WebP
      if (currentSrc.includes('/truco-online/')) {
        setCurrentSrc(`./cards/${card.suit}-${card.num}.webp`);
      } else {
        setCurrentSrc(`/truco-online/cards/${card.suit}-${card.num}.webp`);
      }
    } else if (attempt === 1) {
      setAttempt(2);
      // Fallback a JPG ultra liviano (4-8 KB, instantáneo sin trabas)
      setCurrentSrc(`./cards/${card.suit}-${card.num}.jpg`);
    } else {
      // Fallback visual criollo garantizado sin bloquear el hilo
      setAttempt(3);
    }
  };

  const handlePointerUp = (e: React.SyntheticEvent) => {
    if (disabled || !onClick) return;
    e.stopPropagation();
    onClick();
  };

  const symbol = suitSymbols[card.suit] || '🃏';
  const color = suitColors[card.suit] || '#222';
  const isTableCard = className.includes('table-played-card');

  return (
    <button
      type="button"
      className={`truco-card-argentina ${isBrava ? 'carta-brava' : ''} ${disabled && !isTableCard ? 'disabled' : ''} ${small ? 'small-card' : ''} ${className}`}
      onClick={handlePointerUp}
      onTouchEnd={(e) => {
        if (!disabled && onClick) {
          e.preventDefault();
          handlePointerUp(e);
        }
      }}
      disabled={isTableCard ? false : disabled}
      title={card.label}
      aria-label={card.label}
    >
      {attempt < 3 ? (
        <img
          src={currentSrc}
          alt={card.label}
          className="card-fournier-img"
          loading="eager"
          decoding="async"
          draggable={false}
          onError={handleError}
        />
      ) : (
        /* Fallback visual criollo que NUNCA queda en blanco en el celular */
        <div
          className="card-fallback-face"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: small ? '2px 4px' : '5px 7px',
            background: '#ffffff',
            color: color,
            border: '1px solid rgba(0,0,0,0.25)',
            borderRadius: 'inherit',
            boxSizing: 'border-box',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: small ? 11 : 16, fontWeight: 900, fontFamily: 'Georgia, serif' }}>{card.num}</span>
            <span style={{ fontSize: small ? 10 : 13 }}>{symbol}</span>
          </div>
          <div style={{ textAlign: 'center', fontSize: small ? 18 : 28, lineHeight: 1 }}>
            {symbol}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1, transform: 'rotate(180deg)' }}>
            <span style={{ fontSize: small ? 11 : 16, fontWeight: 900, fontFamily: 'Georgia, serif' }}>{card.num}</span>
            <span style={{ fontSize: small ? 10 : 13 }}>{symbol}</span>
          </div>
        </div>
      )}
      {isBrava && <div className="card-brava-glow-border" aria-hidden="true" />}
    </button>
  );
}

/** Dorso del Naipe Español (Dorso Gaucho Tradicional) */
export function CardBack({ small, className = '' }: { small?: boolean; className?: string }) {
  const [src, setSrc] = useState(getCardBackUrl);
  const [attempt, setAttempt] = useState(0);

  const handleError = () => {
    if (attempt === 0) {
      setAttempt(1);
      setSrc('./cards/back.png');
    } else {
      setAttempt(2);
    }
  };

  return (
    <div className={`card-back-argentina ${small ? 'small-back' : ''} ${className}`} aria-hidden="true">
      {attempt < 2 ? (
        <img
          src={src}
          alt="Dorso de naipe"
          className="card-fournier-img card-back-img"
          loading="eager"
          decoding="async"
          draggable={false}
          onError={handleError}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1b0a04 0%, #3d1c0c 50%, #1b0a04 100%)',
            border: '1.5px solid #d99b16',
            borderRadius: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f4c430',
            fontSize: small ? '11px' : '18px',
          }}
        >
          ☀️
        </div>
      )}
    </div>
  );
}
