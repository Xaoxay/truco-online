// ─── Naipes Españoles Argentinos de Truco (Alta Fidelidad Vectorial) ───
import React from 'react';
import type { Card as CardType, Suit } from '../engine/types';

// ─── SUIT PIPS (Ilustraciones detalladas estilo Naipe de Truco Criollo) ────

/** Espada Criolla: Hoja toledana de doble filo con filo brillante, guarda curvada y empuñadura dorada */
export function EspadaPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`bladeGrad-${size}`} x1="28" y1="4" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f3f8fc" />
          <stop offset="45%" stopColor="#96bad6" />
          <stop offset="55%" stopColor="#dbe8f2" />
          <stop offset="100%" stopColor="#5d809e" />
        </linearGradient>
        <linearGradient id={`goldHilt-${size}`} x1="24" y1="42" x2="40" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="50%" stopColor="#d99b16" />
          <stop offset="100%" stopColor="#875705" />
        </linearGradient>
      </defs>
      {glow && <circle cx="32" cy="24" r="22" fill="#38bdf8" opacity="0.35" filter="blur(6px)" />}
      
      {/* Hoja de la espada */}
      <path d="M32 3 L35 12 L35 44 L32 46 L29 44 L29 12 Z" fill={`url(#bladeGrad-${size})`} stroke="#1e3a5f" strokeWidth="1" />
      <line x1="32" y1="5" x2="32" y2="43" stroke="#ffffff" strokeWidth="1" opacity="0.9" />

      {/* Guarda curvada toledana */}
      <path
        d="M17 41 C24 37, 29 42, 32 43 C35 42, 40 37, 47 41 C49 42, 49 45, 46 45 C39 44, 35 46, 32 46 C29 46, 25 44, 18 45 C15 45, 15 42, 17 41 Z"
        fill={`url(#goldHilt-${size})`}
        stroke="#593b04"
        strokeWidth="1"
      />
      <circle cx="16" cy="43" r="2.5" fill="#f7d56d" stroke="#593b04" strokeWidth="0.8" />
      <circle cx="48" cy="43" r="2.5" fill="#f7d56d" stroke="#593b04" strokeWidth="0.8" />

      {/* Empuñadura torneada */}
      <rect x="30" y="46" width="4" height="11" rx="1" fill="#7a1e1e" stroke="#4a0f0f" strokeWidth="0.8" />
      <line x1="30" y1="48" x2="34" y2="50" stroke="#f4c430" strokeWidth="0.8" />
      <line x1="30" y1="52" x2="34" y2="54" stroke="#f4c430" strokeWidth="0.8" />

      {/* Pomo esférico */}
      <circle cx="32" cy="59" r="3.5" fill={`url(#goldHilt-${size})`} stroke="#593b04" strokeWidth="1" />
    </svg>
  );
}

/** Basto Criollo: Leño nudoso de árbol con vetas de madera y hojas verdes frescas */
export function BastoPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`woodGrad-${size}`} x1="24" y1="4" x2="40" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#96602e" />
          <stop offset="35%" stopColor="#673d16" />
          <stop offset="70%" stopColor="#875626" />
          <stop offset="100%" stopColor="#44250a" />
        </linearGradient>
        <linearGradient id={`leafGrad-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      {glow && <circle cx="32" cy="32" r="22" fill="#22c55e" opacity="0.35" filter="blur(6px)" />}

      {/* Tronco principal cónico y nudoso */}
      <path
        d="M26 8 C27 4, 37 4, 38 8 C40 18, 38 28, 39 42 C40 54, 37 60, 32 60 C27 60, 24 54, 25 42 C26 28, 24 18, 26 8 Z"
        fill={`url(#woodGrad-${size})`}
        stroke="#2d1705"
        strokeWidth="1.2"
      />
      {/* Vetas y nudos */}
      <ellipse cx="32" cy="18" rx="3" ry="1.5" fill="#44250a" />
      <path d="M29 28 Q32 30 35 28" stroke="#371e07" strokeWidth="1.2" fill="none" />
      <ellipse cx="31" cy="40" rx="3.5" ry="1.8" fill="#44250a" />

      {/* Brotes verdes criollos */}
      <path d="M25 15 C18 12, 14 18, 18 22 C23 23, 25 20, 25 15 Z" fill={`url(#leafGrad-${size})`} stroke="#0f5127" strokeWidth="0.8" />
      <path d="M39 26 C46 22, 50 28, 46 33 C41 34, 39 31, 39 26 Z" fill={`url(#leafGrad-${size})`} stroke="#0f5127" strokeWidth="0.8" />
      <path d="M25 44 C18 41, 15 47, 19 51 C23 52, 25 49, 25 44 Z" fill={`url(#leafGrad-${size})`} stroke="#0f5127" strokeWidth="0.8" />
      <path d="M38 46 C44 43, 47 48, 44 52 C40 53, 38 50, 38 46 Z" fill={`url(#leafGrad-${size})`} stroke="#0f5127" strokeWidth="0.8" />
    </svg>
  );
}

/** Oro Criollo: Medalla de oro repujada con el Sol de Mayo radiante en el centro */
export function OroPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`goldCoin-${size}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fff8bd" />
          <stop offset="40%" stopColor="#f5c227" />
          <stop offset="75%" stopColor="#c98a0c" />
          <stop offset="100%" stopColor="#784f04" />
        </radialGradient>
        <radialGradient id={`innerCoin-${size}`} cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="70%" stopColor="#d99b16" />
          <stop offset="100%" stopColor="#966105" />
        </radialGradient>
      </defs>
      {glow && <circle cx="32" cy="32" r="26" fill="#f59e0b" opacity="0.35" filter="blur(6px)" />}

      <circle cx="32" cy="32" r="27" fill={`url(#goldCoin-${size})`} stroke="#613e02" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="23" stroke="#ffeaa7" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <circle cx="32" cy="32" r="20" fill={`url(#innerCoin-${size})`} stroke="#784f04" strokeWidth="1" />

      {/* Sol de Mayo radiante */}
      <g stroke="#784f04" strokeWidth="1" fill="#ffeaa7">
        <polygon points="32,13 34,18 30,18" />
        <polygon points="32,51 34,46 30,46" />
        <polygon points="13,32 18,34 18,30" />
        <polygon points="51,32 46,34 46,30" />
        <polygon points="19,19 24,21 21,24" />
        <polygon points="45,19 43,24 40,21" />
        <polygon points="19,45 21,40 24,43" />
        <polygon points="45,45 40,43 43,40" />
      </g>
      <circle cx="32" cy="32" r="8" fill="#ffe066" stroke="#784f04" strokeWidth="0.8" />
      <ellipse cx="29.5" cy="30.5" rx="1.2" ry="0.8" fill="#442703" />
      <ellipse cx="34.5" cy="30.5" rx="1.2" ry="0.8" fill="#442703" />
      <path d="M30 35 Q32 36.5 34 35" stroke="#784f04" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

/** Copa Criolla: Cáliz litúrgico dorado labrado con base moldurada y piedras rojas */
export function CopaPip({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`chaliceGrad-${size}`} x1="18" y1="6" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7b8" />
          <stop offset="35%" stopColor="#f3be2b" />
          <stop offset="70%" stopColor="#bf830e" />
          <stop offset="100%" stopColor="#6e4604" />
        </linearGradient>
      </defs>
      {glow && <circle cx="32" cy="28" r="22" fill="#ef4444" opacity="0.35" filter="blur(6px)" />}

      <path d="M22 13 C26 9, 38 9, 42 13 L43 16 L21 16 Z" fill={`url(#chaliceGrad-${size})`} stroke="#593b04" strokeWidth="1" />
      <circle cx="32" cy="8" r="2.5" fill="#fde047" stroke="#593b04" strokeWidth="0.8" />

      {/* Cáliz */}
      <path
        d="M20 17 L44 17 L42 32 C41 38, 37 42, 32 42 C27 42, 23 38, 22 32 Z"
        fill={`url(#chaliceGrad-${size})`}
        stroke="#593b04"
        strokeWidth="1.2"
      />
      <path d="M21 23 L43 23" stroke="#593b04" strokeWidth="1" strokeDasharray="3 2" />
      <polygon points="32,26 35,30 32,34 29,30" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8" />

      {/* Tallo */}
      <rect x="29.5" y="42" width="5" height="10" fill={`url(#chaliceGrad-${size})`} stroke="#593b04" strokeWidth="1" />
      <ellipse cx="32" cy="46" rx="4.5" ry="2.2" fill={`url(#chaliceGrad-${size})`} stroke="#593b04" strokeWidth="0.8" />

      {/* Base */}
      <path d="M19 58 C24 53, 40 53, 45 58 Z" fill={`url(#chaliceGrad-${size})`} stroke="#593b04" strokeWidth="1.2" />
      <line x1="17" y1="58" x2="47" y2="58" stroke="#593b04" strokeWidth="1.5" />
    </svg>
  );
}

// ─── LA PINTA (Discontinuidad del marco de la baraja española) ─────────────
export function CardBorderPinta({ suit }: { suit: Suit }) {
  return (
    <svg className="card-border-svg" viewBox="0 0 100 150" preserveAspectRatio="none">
      {/* Marco exterior */}
      <rect x="2" y="2" width="96" height="146" rx="4" fill="none" stroke="#331c0a" strokeWidth="1.2" />
      {/* Marco interior */}
      <rect x="5" y="5" width="90" height="140" rx="3" fill="none" stroke="#b39169" strokeWidth="0.8" opacity="0.6" />

      {/* Muescas de Pinta tradicional */}
      {suit === 'copa' && (
        <>
          <rect x="46" y="1" width="8" height="3" fill="#fffdf8" />
          <rect x="46" y="146" width="8" height="3" fill="#fffdf8" />
        </>
      )}
      {suit === 'espada' && (
        <>
          <rect x="33" y="1" width="6" height="3" fill="#fffdf8" />
          <rect x="61" y="1" width="6" height="3" fill="#fffdf8" />
          <rect x="33" y="146" width="6" height="3" fill="#fffdf8" />
          <rect x="61" y="146" width="6" height="3" fill="#fffdf8" />
        </>
      )}
      {suit === 'basto' && (
        <>
          <rect x="25" y="1" width="6" height="3" fill="#fffdf8" />
          <rect x="47" y="1" width="6" height="3" fill="#fffdf8" />
          <rect x="69" y="1" width="6" height="3" fill="#fffdf8" />
          <rect x="25" y="146" width="6" height="3" fill="#fffdf8" />
          <rect x="47" y="146" width="6" height="3" fill="#fffdf8" />
          <rect x="69" y="146" width="6" height="3" fill="#fffdf8" />
        </>
      )}
    </svg>
  );
}

// ─── ILUSTRACIONES DE FIGURAS ESPAÑOLAS (10, 11, 12) ───────────────────────

/** 10 - SOTA: Paje español con jubón y calzas sosteniendo el palo */
function SotaFigure({ suit, small }: { suit: Suit; small?: boolean }) {
  const iconSize = small ? 14 : 20;
  return (
    <div className="figura-naipe-wrapper">
      <svg width={small ? "34" : "50"} height={small ? "42" : "62"} viewBox="0 0 60 76" fill="none">
        {/* Gorro con pluma */}
        <ellipse cx="30" cy="12" rx="14" ry="6" fill="#881337" stroke="#4c0519" strokeWidth="1" />
        <path d="M38 12 Q44 6 42 2" stroke="#f4c430" strokeWidth="2" strokeLinecap="round" />
        {/* Cabeza */}
        <circle cx="30" cy="18" r="7" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1" />
        {/* Ojos y sonrisa */}
        <circle cx="28" cy="17" r="0.8" fill="#431407" />
        <circle cx="32" cy="17" r="0.8" fill="#431407" />
        <path d="M29 21 Q30 22 31 21" stroke="#7c2d12" strokeWidth="0.7" fill="none" />
        {/* Capa */}
        <path d="M18 25 C14 38, 14 55, 16 66 L44 66 C46 55, 46 38, 42 25 Z" fill="#991b1b" stroke="#450a0a" strokeWidth="1" />
        {/* Jubón */}
        <path d="M22 25 L38 25 L35 50 L25 50 Z" fill="#1e3a8a" stroke="#172554" strokeWidth="1" />
        {/* Cinturón dorado */}
        <rect x="24" y="44" width="12" height="3" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
        {/* Piernas con calzas */}
        <rect x="24" y="50" width="4.5" height="18" fill="#fed7aa" stroke="#7c2d12" strokeWidth="0.8" />
        <rect x="31.5" y="50" width="4.5" height="18" fill="#fed7aa" stroke="#7c2d12" strokeWidth="0.8" />
      </svg>
      <div className="figura-pip-badge">
        {suit === 'espada' && <EspadaPip size={iconSize} />}
        {suit === 'basto' && <BastoPip size={iconSize} />}
        {suit === 'oro' && <OroPip size={iconSize} />}
        {suit === 'copa' && <CopaPip size={iconSize} />}
      </div>
      <span className="figura-badge">SOTA</span>
    </div>
  );
}

/** 11 - CABALLO: Jinete criollo/caballero montado con el palo en alto */
function CaballoFigure({ suit, small }: { suit: Suit; small?: boolean }) {
  const iconSize = small ? 14 : 20;
  return (
    <div className="figura-naipe-wrapper">
      <svg width={small ? "34" : "50"} height={small ? "42" : "62"} viewBox="0 0 60 76" fill="none">
        {/* Jinete */}
        <circle cx="36" cy="15" r="6" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1" />
        {/* Sombrero gaucho */}
        <ellipse cx="36" cy="11" rx="10" ry="3.5" fill="#262626" stroke="#0a0a0a" strokeWidth="0.8" />
        {/* Torso del jinete */}
        <path d="M30 21 L42 21 L40 38 L32 38 Z" fill="#b45309" stroke="#451a03" strokeWidth="1" />
        {/* Cabeza del Caballo */}
        <path d="M14 26 C16 20, 24 18, 28 24 L26 38 C20 40, 16 34, 14 26 Z" fill="#78350f" stroke="#451a03" strokeWidth="1" />
        <polygon points="26,18 28,14 29,19" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
        {/* Ojo del caballo */}
        <circle cx="20" cy="25" r="1.2" fill="#000" />
        {/* Cuerpo del caballo */}
        <path d="M18 36 C24 34, 38 34, 46 40 L44 56 C34 56, 22 56, 16 52 Z" fill="#92400e" stroke="#451a03" strokeWidth="1" />
        {/* Patas del caballo */}
        <rect x="18" y="52" width="4" height="18" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
        <rect x="40" y="52" width="4" height="18" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
        {/* Rienda */}
        <path d="M22 30 Q28 32 34 32" stroke="#f4c430" strokeWidth="1" fill="none" />
      </svg>
      <div className="figura-pip-badge">
        {suit === 'espada' && <EspadaPip size={iconSize} />}
        {suit === 'basto' && <BastoPip size={iconSize} />}
        {suit === 'oro' && <OroPip size={iconSize} />}
        {suit === 'copa' && <CopaPip size={iconSize} />}
      </div>
      <span className="figura-badge">CABALLO</span>
    </div>
  );
}

/** 12 - REY: Monarca con corona dorada, manto real y cetro */
function ReyFigure({ suit, small }: { suit: Suit; small?: boolean }) {
  const iconSize = small ? 14 : 20;
  return (
    <div className="figura-naipe-wrapper">
      <svg width={small ? "34" : "50"} height={small ? "42" : "62"} viewBox="0 0 60 76" fill="none">
        {/* Corona imperial dorada */}
        <path d="M20 12 L22 6 L26 10 L30 4 L34 10 L38 6 L40 12 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
        <circle cx="22" cy="6" r="1.2" fill="#ef4444" />
        <circle cx="30" cy="4" r="1.5" fill="#3b82f6" />
        <circle cx="38" cy="6" r="1.2" fill="#ef4444" />
        {/* Cabeza y barba */}
        <circle cx="30" cy="18" r="7" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1" />
        <path d="M23 18 C23 26, 37 26, 37 18 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Ojos y semblante */}
        <circle cx="28" cy="17" r="0.8" fill="#431407" />
        <circle cx="32" cy="17" r="0.8" fill="#431407" />
        {/* Manto Real Rojo con Armiño */}
        <path d="M16 26 C12 40, 12 58, 14 68 L46 68 C48 58, 48 40, 44 26 Z" fill="#881337" stroke="#4c0519" strokeWidth="1.2" />
        {/* Cenefa de armiño blanco con motas */}
        <path d="M22 26 L38 26 L36 68 L24 68 Z" fill="#fff" stroke="#cbd5e1" strokeWidth="0.8" />
        <circle cx="28" cy="36" r="1" fill="#000" />
        <circle cx="32" cy="46" r="1" fill="#000" />
        <circle cx="29" cy="56" r="1" fill="#000" />
        {/* Cetro dorado */}
        <line x1="18" y1="28" x2="18" y2="58" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="18" cy="27" r="3" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
      </svg>
      <div className="figura-pip-badge">
        {suit === 'espada' && <EspadaPip size={iconSize} />}
        {suit === 'basto' && <BastoPip size={iconSize} />}
        {suit === 'oro' && <OroPip size={iconSize} />}
        {suit === 'copa' && <CopaPip size={iconSize} />}
      </div>
      <span className="figura-badge">REY</span>
    </div>
  );
}

// ─── DISTRIBUCIÓN COMPLETA DE PIPS (BARAJA ESPAÑOLA AUTÉNTICA) ─────────────

function CardPipsPattern({ card, small }: { card: CardType; small?: boolean }) {
  const isAncho = card.num === 1;
  const isMacho = card.num === 1 && card.suit === 'espada';
  const isHembra = card.num === 1 && card.suit === 'basto';
  const isSieteBravo = card.num === 7 && (card.suit === 'espada' || card.suit === 'oro');

  const pip = (size: number, glow = false) => {
    switch (card.suit) {
      case 'espada': return <EspadaPip size={size} glow={glow} />;
      case 'basto':  return <BastoPip size={size} glow={glow} />;
      case 'oro':    return <OroPip size={size} glow={glow} />;
      case 'copa':   return <CopaPip size={size} glow={glow} />;
    }
  };

  // 1: Ases / Bravas
  if (isAncho) {
    const size = small ? 30 : 54;
    if (isMacho) {
      return (
        <div className="ancho-macho-center">
          <div className="macho-laurel">🇦🇷</div>
          {pip(size, true)}
          {!small && <span className="ancho-title">EL MACHO</span>}
        </div>
      );
    }
    if (isHembra) {
      return (
        <div className="ancho-macho-center">
          {pip(size, true)}
          {!small && <span className="ancho-title hembra">LA HEMBRA</span>}
        </div>
      );
    }
    return (
      <div className="ancho-macho-center">
        {pip(size, true)}
        {!small && <span className="ancho-title as">{card.suit === 'oro' ? 'AS DE ORO' : 'AS DE COPA'}</span>}
      </div>
    );
  }

  // 2: Dos pips alineados verticalmente
  if (card.num === 2) {
    const s = small ? 14 : 26;
    return (
      <div className="pips-column pips-2">
        <div className="pip-item">{pip(s)}</div>
        <div className="pip-item">{pip(s)}</div>
      </div>
    );
  }

  // 3: Tres pips alineados verticalmente
  if (card.num === 3) {
    const s = small ? 13 : 24;
    return (
      <div className="pips-column pips-3">
        <div className="pip-item">{pip(s)}</div>
        <div className="pip-item">{pip(s)}</div>
        <div className="pip-item">{pip(s)}</div>
      </div>
    );
  }

  // 4: Cuatro pips en dos columnas
  if (card.num === 4) {
    const s = small ? 12 : 22;
    return (
      <div className="pips-grid-2x2">
        <div className="pips-col">
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
        </div>
        <div className="pips-col">
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
        </div>
      </div>
    );
  }

  // 5: Cinco pips (4 esquinas + 1 central)
  if (card.num === 5) {
    const s = small ? 11 : 20;
    return (
      <div className="pips-grid-5">
        <div className="pips-col">
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
        </div>
        <div className="pip-item pip-center-5">{pip(s)}</div>
        <div className="pips-col">
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
        </div>
      </div>
    );
  }

  // 6: Seis pips (3 izq, 3 der)
  if (card.num === 6) {
    const s = small ? 11 : 19;
    return (
      <div className="pips-grid-6">
        <div className="pips-col">
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
        </div>
        <div className="pips-col">
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
          <div className="pip-item">{pip(s)}</div>
        </div>
      </div>
    );
  }

  // 7: Siete pips (3 izq, 3 der + 1 centro superior)
  if (card.num === 7) {
    const s = small ? 10 : 18;
    return (
      <div className={`pips-grid-7 ${isSieteBravo ? 'siete-bravo-glow' : ''}`}>
        <div className="pip-item pip-center-top-7">{pip(s, isSieteBravo)}</div>
        <div className="pips-grid-6" style={{ width: '100%' }}>
          <div className="pips-col">
            <div className="pip-item">{pip(s, isSieteBravo)}</div>
            <div className="pip-item">{pip(s, isSieteBravo)}</div>
            <div className="pip-item">{pip(s, isSieteBravo)}</div>
          </div>
          <div className="pips-col">
            <div className="pip-item">{pip(s, isSieteBravo)}</div>
            <div className="pip-item">{pip(s, isSieteBravo)}</div>
            <div className="pip-item">{pip(s, isSieteBravo)}</div>
          </div>
        </div>
        {isSieteBravo && !small && <span className="ancho-title siete">MANILLA</span>}
      </div>
    );
  }

  // 10: SOTA
  if (card.num === 10) {
    return <SotaFigure suit={card.suit} small={small} />;
  }

  // 11: CABALLO
  if (card.num === 11) {
    return <CaballoFigure suit={card.suit} small={small} />;
  }

  // 12: REY
  if (card.num === 12) {
    return <ReyFigure suit={card.suit} small={small} />;
  }

  return null;
}

// ─── COMPONENTE CARD FACE (Frente de la Carta) ─────────────────────────────
interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  className?: string;
  isHeld?: boolean;
}

export function CardFace({ card, onClick, disabled, small, className = '' }: CardProps) {
  const isMacho = card.num === 1 && card.suit === 'espada';
  const isHembra = card.num === 1 && card.suit === 'basto';
  const isSieteBravo = card.num === 7 && (card.suit === 'espada' || card.suit === 'oro');
  const isBrava = isMacho || isHembra || isSieteBravo;

  const renderIndexPip = (size: number) => {
    switch (card.suit) {
      case 'espada': return <EspadaPip size={size} />;
      case 'basto':  return <BastoPip size={size} />;
      case 'oro':    return <OroPip size={size} />;
      case 'copa':   return <CopaPip size={size} />;
    }
  };

  const numColor = card.suit === 'copa' ? '#b91c1c' : card.suit === 'basto' ? '#15803d' : card.suit === 'espada' ? '#1d4ed8' : '#b45309';

  return (
    <button
      className={`truco-card-argentina ${isBrava ? 'carta-brava' : ''} ${disabled ? 'disabled' : ''} ${small ? 'small-card' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={card.label}
      aria-label={card.label}
    >
      {/* Marco y Pinta Tradicional */}
      <CardBorderPinta suit={card.suit} />

      {/* Esquina Superior Izquierda */}
      <div className="card-indice top-left">
        <span className="indice-num" style={{ color: numColor }}>{card.num}</span>
        <div className="indice-pip">{renderIndexPip(small ? 12 : 16)}</div>
      </div>

      {/* Motivo Central Completo (Auténtica Baraja de Truco) */}
      <div className="card-center-stage">
        <CardPipsPattern card={card} small={small} />
      </div>

      {/* Esquina Inferior Derecha (Invertida) */}
      <div className="card-indice bottom-right">
        <span className="indice-num" style={{ color: numColor }}>{card.num}</span>
        <div className="indice-pip">{renderIndexPip(small ? 12 : 16)}</div>
      </div>
    </button>
  );
}

// ─── COMPONENTE CARD BACK (Dorso Gaucho con Guarda Pampa y Sol de Mayo) ────
export function CardBack({ small, className = '' }: { small?: boolean; className?: string }) {
  return (
    <div className={`card-back-argentina ${small ? 'small-back' : ''} ${className}`} aria-hidden="true">
      <div className="back-inner-frame">
        <div className="guarda-pampa-pattern">
          <svg width="100%" height="100%" viewBox="0 0 80 120" preserveAspectRatio="none">
            <defs>
              <pattern id="guardaPampa" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M10 0 L20 10 L10 20 L0 10 Z" fill="#821c16" />
                <path d="M10 4 L16 10 L10 16 L4 10 Z" fill="#2d0a08" />
                <path d="M10 7 L13 10 L10 13 L7 10 Z" fill="#f4c430" />
              </pattern>
            </defs>
            <rect width="80" height="120" fill="url(#guardaPampa)" />
            {/* Medallón central */}
            <circle cx="40" cy="60" r="16" fill="#1b0806" stroke="#f4c430" strokeWidth="1.5" />
            <circle cx="40" cy="60" r="13" stroke="#f4c430" strokeWidth="0.8" strokeDasharray="2 2" fill="none" />
            <circle cx="40" cy="60" r="5" fill="#f4c430" />
            <path d="M40 48 L40 53 M40 67 L40 72 M28 60 L33 60 M47 60 L52 60" stroke="#f4c430" strokeWidth="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
