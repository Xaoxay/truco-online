// ─── Naipes Españoles Argentinos de Truco (Alta Fidelidad Vectorial) ───
import React from 'react';
import type { Card as CardType, Suit } from '../engine/types';

// ─── SUIT PIPS (Ilustraciones detalladas estilo Naipe de Truco Criollo) ────

/** Espada Criolla: Hoja toledana de doble filo con filo brillante, guarda curvada y empuñadura dorada */
export function EspadaPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bladeGrad" x1="28" y1="4" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#eef4f9" />
          <stop offset="45%" stopColor="#8baec7" />
          <stop offset="55%" stopColor="#d3e2ee" />
          <stop offset="100%" stopColor="#557591" />
        </linearGradient>
        <linearGradient id="goldHilt" x1="24" y1="42" x2="40" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd868" />
          <stop offset="50%" stopColor="#cf9618" />
          <stop offset="100%" stopColor="#825707" />
        </linearGradient>
      </defs>
      {/* Resplandor suave si es carta brava */}
      {glow && <circle cx="32" cy="24" r="22" fill="#3b82f6" opacity="0.25" filter="blur(6px)" />}
      
      {/* Hoja de la espada */}
      <path d="M32 3 L35 12 L35 44 L32 46 L29 44 L29 12 Z" fill="url(#bladeGrad)" stroke="#1e3a5f" strokeWidth="1" />
      {/* Línea central de sangrado */}
      <line x1="32" y1="5" x2="32" y2="43" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
      <line x1="32.5" y1="5" x2="32.5" y2="43" stroke="#254366" strokeWidth="0.8" opacity="0.6" />

      {/* Guarda curvada española / toledana */}
      <path
        d="M17 41 C24 37, 29 42, 32 43 C35 42, 40 37, 47 41 C49 42, 49 45, 46 45 C39 44, 35 46, 32 46 C29 46, 25 44, 18 45 C15 45, 15 42, 17 41 Z"
        fill="url(#goldHilt)"
        stroke="#593b04"
        strokeWidth="1"
      />
      {/* Remate de la guarda */}
      <circle cx="16" cy="43" r="2.5" fill="#f7d56d" stroke="#593b04" strokeWidth="0.8" />
      <circle cx="48" cy="43" r="2.5" fill="#f7d56d" stroke="#593b04" strokeWidth="0.8" />

      {/* Empuñadura torneada */}
      <rect x="30" y="46" width="4" height="11" rx="1" fill="#7a1e1e" stroke="#4a0f0f" strokeWidth="0.8" />
      <line x1="30" y1="48" x2="34" y2="50" stroke="#f4c430" strokeWidth="0.8" />
      <line x1="30" y1="52" x2="34" y2="54" stroke="#f4c430" strokeWidth="0.8" />

      {/* Pomo esférico */}
      <circle cx="32" cy="59" r="3.5" fill="url(#goldHilt)" stroke="#593b04" strokeWidth="1" />
    </svg>
  );
}

/** Basto Criollo: Leño nudoso de árbol con vetas de madera y hojas verdes frescas */
export function BastoPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="woodGrad" x1="24" y1="4" x2="40" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8d5a2b" />
          <stop offset="35%" stopColor="#623a15" />
          <stop offset="70%" stopColor="#805124" />
          <stop offset="100%" stopColor="#44250a" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      {glow && <circle cx="32" cy="32" r="22" fill="#22c55e" opacity="0.25" filter="blur(6px)" />}

      {/* Tronco principal cónico y nudoso */}
      <path
        d="M26 8 C27 4, 37 4, 38 8 C40 18, 38 28, 39 42 C40 54, 37 60, 32 60 C27 60, 24 54, 25 42 C26 28, 24 18, 26 8 Z"
        fill="url(#woodGrad)"
        stroke="#2d1705"
        strokeWidth="1.2"
      />
      {/* Vetas de madera y nudos */}
      <ellipse cx="32" cy="18" rx="3" ry="1.5" fill="#44250a" />
      <path d="M29 28 Q32 30 35 28" stroke="#371e07" strokeWidth="1.2" fill="none" />
      <ellipse cx="31" cy="40" rx="3.5" ry="1.8" fill="#44250a" />
      <path d="M28 48 Q32 50 36 48" stroke="#371e07" strokeWidth="1.2" fill="none" />

      {/* Hojas y brotes verdes que nacen del palo (característico del basto español) */}
      {/* Brote izquierdo superior */}
      <path d="M25 15 C18 12, 14 18, 18 22 C23 23, 25 20, 25 15 Z" fill="url(#leafGrad)" stroke="#0f5127" strokeWidth="0.8" />
      {/* Brote derecho medio */}
      <path d="M39 26 C46 22, 50 28, 46 33 C41 34, 39 31, 39 26 Z" fill="url(#leafGrad)" stroke="#0f5127" strokeWidth="0.8" />
      {/* Brote izquierdo inferior */}
      <path d="M25 44 C18 41, 15 47, 19 51 C23 52, 25 49, 25 44 Z" fill="url(#leafGrad)" stroke="#0f5127" strokeWidth="0.8" />
      {/* Brote derecho inferior */}
      <path d="M38 46 C44 43, 47 48, 44 52 C40 53, 38 50, 38 46 Z" fill="url(#leafGrad)" stroke="#0f5127" strokeWidth="0.8" />
    </svg>
  );
}

/** Oro Criollo: Medalla de oro repujada con el Sol de Mayo radiante en el centro */
export function OroPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="goldCoin" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fff6b3" />
          <stop offset="40%" stopColor="#f5c227" />
          <stop offset="75%" stopColor="#c98a0c" />
          <stop offset="100%" stopColor="#784f04" />
        </radialGradient>
        <radialGradient id="innerCoin" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="70%" stopColor="#d99b16" />
          <stop offset="100%" stopColor="#966105" />
        </radialGradient>
      </defs>
      {glow && <circle cx="32" cy="32" r="26" fill="#f59e0b" opacity="0.3" filter="blur(6px)" />}

      {/* Borde exterior de la moneda */}
      <circle cx="32" cy="32" r="27" fill="url(#goldCoin)" stroke="#613e02" strokeWidth="1.5" />
      {/* Borde perlado repujado */}
      <circle cx="32" cy="32" r="23" stroke="#ffeaa7" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      {/* Fondo interior de la moneda */}
      <circle cx="32" cy="32" r="20" fill="url(#innerCoin)" stroke="#784f04" strokeWidth="1" />

      {/* Sol de Mayo radiante (rostro y rayos característicos del naipe argentino) */}
      {/* Rayos alternados rectos y ondulados */}
      <g stroke="#784f04" strokeWidth="1" fill="#ffeaa7">
        {/* Rayos cardinales */}
        <polygon points="32,13 34,18 30,18" />
        <polygon points="32,51 34,46 30,46" />
        <polygon points="13,32 18,34 18,30" />
        <polygon points="51,32 46,34 46,30" />
        {/* Rayos diagonales */}
        <polygon points="19,19 24,21 21,24" />
        <polygon points="45,19 43,24 40,21" />
        <polygon points="19,45 21,40 24,43" />
        <polygon points="45,45 40,43 43,40" />
      </g>

      {/* Rostro del Sol de Mayo */}
      <circle cx="32" cy="32" r="8" fill="#ffe066" stroke="#784f04" strokeWidth="0.8" />
      {/* Ojos serenos */}
      <ellipse cx="29.5" cy="30.5" rx="1.2" ry="0.8" fill="#442703" />
      <ellipse cx="34.5" cy="30.5" rx="1.2" ry="0.8" fill="#442703" />
      {/* Nariz */}
      <path d="M32 30.5 L31.5 33 L32.5 33" stroke="#784f04" strokeWidth="0.7" fill="none" />
      {/* Boca sonriente */}
      <path d="M30 35 Q32 36.5 34 35" stroke="#784f04" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

/** Copa Criolla: Cáliz litúrgico dorado labrado con base moldurada y piedras rojas */
export function CopaPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chaliceGrad" x1="18" y1="6" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff3a8" />
          <stop offset="35%" stopColor="#f0b824" />
          <stop offset="70%" stopColor="#bd810e" />
          <stop offset="100%" stopColor="#6e4604" />
        </linearGradient>
      </defs>
      {glow && <circle cx="32" cy="28" r="22" fill="#ef4444" opacity="0.25" filter="blur(6px)" />}

      {/* Tapa abovedada con remate */}
      <path d="M22 13 C26 9, 38 9, 42 13 L43 16 L21 16 Z" fill="url(#chaliceGrad)" stroke="#593b04" strokeWidth="1" />
      <circle cx="32" cy="8" r="2.5" fill="#fde047" stroke="#593b04" strokeWidth="0.8" />

      {/* Copa / Cáliz */}
      <path
        d="M20 17 L44 17 L42 32 C41 38, 37 42, 32 42 C27 42, 23 38, 22 32 Z"
        fill="url(#chaliceGrad)"
        stroke="#593b04"
        strokeWidth="1.2"
      />
      {/* Cenefa ornamental grabada */}
      <path d="M21 23 L43 23" stroke="#593b04" strokeWidth="1" strokeDasharray="3 2" />
      {/* Joya / Rubí central */}
      <polygon points="32,26 35,30 32,34 29,30" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8" />

      {/* Tallo y nudo central */}
      <rect x="29.5" y="42" width="5" height="10" fill="url(#chaliceGrad)" stroke="#593b04" strokeWidth="1" />
      <ellipse cx="32" cy="46" rx="4.5" ry="2.2" fill="url(#chaliceGrad)" stroke="#593b04" strokeWidth="0.8" />

      {/* Base moldurada */}
      <path d="M19 58 C24 53, 40 53, 45 58 Z" fill="url(#chaliceGrad)" stroke="#593b04" strokeWidth="1.2" />
      <line x1="17" y1="58" x2="47" y2="58" stroke="#593b04" strokeWidth="1.5" />
    </svg>
  );
}

// ─── LA PINTA (Discontinuidad del marco de la baraja española) ─────────────
// En el truco argentino:
// Oros: sin cortes (0)
// Copas: 1 corte (arriba y abajo)
// Espadas: 2 cortes
// Bastos: 3 cortes
function CardBorderPinta({ suit }: { suit: Suit }) {
  if (suit === 'oro') {
    return (
      <rect x="4" y="4" width="calc(100% - 8px)" height="calc(100% - 8px)" rx="5" fill="none" stroke="#2a1a0c" strokeWidth="1.2" />
    );
  }

  // Para otros palos, el marco exterior tiene muescas / discontinuidades tradicionales
  return (
    <svg className="card-pinta-svg" viewBox="0 0 100 150" preserveAspectRatio="none">
      <defs>
        <pattern id="cardInnerLine" width="100%" height="100%">
          <rect x="5" y="5" width="90" height="140" rx="3" fill="none" stroke="#8b6843" strokeWidth="0.8" opacity="0.6" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="96" height="146" rx="4" fill="none" stroke="#331c0a" strokeWidth="1.2" />
      <rect x="5" y="5" width="90" height="140" rx="3" fill="none" stroke="#b39169" strokeWidth="0.8" opacity="0.6" />

      {/* Muescas de Pinta superior e inferior */}
      {suit === 'copa' && (
        <>
          <rect x="47" y="1" width="6" height="3" fill="#fffdf6" />
          <rect x="47" y="146" width="6" height="3" fill="#fffdf6" />
        </>
      )}
      {suit === 'espada' && (
        <>
          <rect x="35" y="1" width="5" height="3" fill="#fffdf6" />
          <rect x="60" y="1" width="5" height="3" fill="#fffdf6" />
          <rect x="35" y="146" width="5" height="3" fill="#fffdf6" />
          <rect x="60" y="146" width="5" height="3" fill="#fffdf6" />
        </>
      )}
      {suit === 'basto' && (
        <>
          <rect x="28" y="1" width="5" height="3" fill="#fffdf6" />
          <rect x="47.5" y="1" width="5" height="3" fill="#fffdf6" />
          <rect x="67" y="1" width="5" height="3" fill="#fffdf6" />
          <rect x="28" y="146" width="5" height="3" fill="#fffdf6" />
          <rect x="47.5" y="146" width="5" height="3" fill="#fffdf6" />
          <rect x="67" y="146" width="5" height="3" fill="#fffdf6" />
        </>
      )}
    </svg>
  );
}

// ─── COMPONENTE CARD FACE (Frente de la Carta) ─────────────────────────────
interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  className?: string;
}

export function CardFace({ card, onClick, disabled, small, className = '' }: CardProps) {
  const isAncho = card.num === 1;
  const isMacho = card.num === 1 && card.suit === 'espada';
  const isHembra = card.num === 1 && card.suit === 'basto';
  const isSieteBravo = card.num === 7 && (card.suit === 'espada' || card.suit === 'oro');
  const isBrava = isMacho || isHembra || isSieteBravo;

  const pipSize = small ? 20 : 32;
  const centerPipSize = small ? (isAncho ? 36 : 28) : (isAncho ? 58 : 46);

  const renderPip = (size = pipSize, glow = false) => {
    switch (card.suit) {
      case 'espada': return <EspadaPip size={size} glow={glow} />;
      case 'basto':  return <BastoPip size={size} glow={glow} />;
      case 'oro':    return <OroPip size={size} glow={glow} />;
      case 'copa':   return <CopaPip size={size} glow={glow} />;
    }
  };

  // Color de los números del naipe español
  const numColor = card.suit === 'copa' ? '#b91c1c' : card.suit === 'basto' ? '#15803d' : card.suit === 'espada' ? '#1d4ed8' : '#b45309';

  return (
    <button
      className={`truco-card-argentina ${isBrava ? 'carta-brava' : ''} ${disabled ? 'disabled' : ''} ${small ? 'small-card' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={card.label}
      aria-label={card.label}
    >
      {/* Textura de Naipe Marfil con Pinta Tradicional */}
      <CardBorderPinta suit={card.suit} />

      {/* Esquina Superior Izquierda */}
      <div className="card-indice top-left">
        <span className="indice-num" style={{ color: numColor }}>{card.num}</span>
        <div className="indice-pip">{renderPip(small ? 14 : 18)}</div>
      </div>

      {/* Motivo Central de la Carta */}
      <div className="card-center-stage">
        {/* En el 1 de Espada (Macho): Hoja central majestuosa con corona de laureles */}
        {isMacho && (
          <div className="ancho-macho-center">
            <div className="macho-laurel">🇦🇷</div>
            {renderPip(centerPipSize, true)}
            {!small && <span className="ancho-title">EL MACHO</span>}
          </div>
        )}

        {/* En el 1 de Basto (Hembra): Leño nudoso imponente */}
        {isHembra && (
          <div className="ancho-macho-center">
            {renderPip(centerPipSize, true)}
            {!small && <span className="ancho-title hembra">LA HEMBRA</span>}
          </div>
        )}

        {/* Siete de Espada o Siete de Oro */}
        {isSieteBravo && !isAncho && (
          <div className="siete-bravo-center">
            {renderPip(centerPipSize, true)}
            {!small && <span className="ancho-title siete">MANILLA</span>}
          </div>
        )}

        {/* Cartas normales: figuras o pips múltiples */}
        {!isMacho && !isHembra && !isSieteBravo && (
          <div className="normal-card-center">
            {card.num >= 10 ? (
              <div className="figura-naipe">
                {renderPip(centerPipSize)}
                <span className="figura-badge">
                  {card.num === 10 ? 'SOTA' : card.num === 11 ? 'CABALLO' : 'REY'}
                </span>
              </div>
            ) : (
              <div className="multi-pips-display">
                {renderPip(centerPipSize)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Esquina Inferior Derecha (Invertida) */}
      <div className="card-indice bottom-right">
        <span className="indice-num" style={{ color: numColor }}>{card.num}</span>
        <div className="indice-pip">{renderPip(small ? 14 : 18)}</div>
      </div>
    </button>
  );
}

// ─── COMPONENTE CARD BACK (Dorso Gaucho con Guarda Pampa y Sol de Mayo) ────
export function CardBack({ small, className = '' }: { small?: boolean; className?: string }) {
  return (
    <div className={`card-back-argentina ${small ? 'small-back' : ''} ${className}`} aria-hidden="true">
      <div className="back-inner-frame">
        {/* Patrón de Guarda Pampa Tradicional Argentina */}
        <div className="guarda-pampa-pattern">
          <svg width="100%" height="100%" viewBox="0 0 80 120" preserveAspectRatio="none">
            <defs>
              <pattern id="guardaPampa" width="20" height="20" patternUnits="userSpaceOnUse">
                {/* Rombos escalonados de la guarda pampa */}
                <path d="M10 0 L20 10 L10 20 L0 10 Z" fill="#821c16" />
                <path d="M10 4 L16 10 L10 16 L4 10 Z" fill="#2d0a08" />
                <path d="M10 7 L13 10 L10 13 L7 10 Z" fill="#f4c430" />
              </pattern>
            </defs>
            <rect width="80" height="120" fill="url(#guardaPampa)" />
            {/* Medallón central */}
            <circle cx="40" cy="60" r="16" fill="#1b0806" stroke="#f4c430" strokeWidth="1.5" />
            <circle cx="40" cy="60" r="13" stroke="#f4c430" strokeWidth="0.8" strokeDasharray="2 2" fill="none" />
            {/* Sol radiante criollo */}
            <circle cx="40" cy="60" r="5" fill="#f4c430" />
            <path d="M40 48 L40 53 M40 67 L40 72 M28 60 L33 60 M47 60 L52 60" stroke="#f4c430" strokeWidth="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
