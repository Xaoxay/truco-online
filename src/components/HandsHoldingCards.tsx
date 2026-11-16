import React from 'react';
import type { Card as CardType } from '../engine/types';
import { CardFace, CardBack } from './Card';

interface PlayerHandsProps {
  cards: CardType[];
  onPlayCard: (idx: number) => void;
  canPlay: boolean;
  isDesktop?: boolean;
}

/** Abanico Criollo de Cartas del Jugador */
export function PlayerHandsHoldingCards({ cards, onPlayCard, canPlay, isDesktop }: PlayerHandsProps) {
  const count = cards.length;
  const lastPlayTime = React.useRef(0);

  const handlePlay = (idx: number, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastPlayTime.current < 400) return;
    lastPlayTime.current = now;
    if (!canPlay) return;
    onPlayCard(idx);
  };

  return (
    <div className="player-hands-holder" role="region" aria-label="Tus cartas en mano">
      {/* Tapete de apoyo para las cartas del jugador */}
      <div className="player-mat-tray" aria-hidden="true" />

      {/* Cartas en abanico criollo interactivo */}
      <div className="cards-fan-container">
        {cards.map((card, idx) => {
          let rot = 0;
          let translateY = 0;
          let translateX = 0;

          if (count === 3) {
            if (idx === 0) { rot = -8; translateY = 4; translateX = -14; }
            else if (idx === 1) { rot = 0; translateY = -4; translateX = 0; }
            else if (idx === 2) { rot = 8; translateY = 4; translateX = 14; }
          } else if (count === 2) {
            if (idx === 0) { rot = -6; translateY = 2; translateX = -10; }
            else if (idx === 1) { rot = 6; translateY = 2; translateX = 10; }
          } else {
            rot = 0; translateY = 0; translateX = 0;
          }

          return (
            <div
              key={card.id}
              className={`fan-card-wrapper fan-pos-${idx} ${canPlay ? 'can-play' : 'wait-turn'}`}
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rot}deg)`,
                zIndex: idx + 2,
              }}
              onClick={(e) => handlePlay(idx, e)}
              onTouchEnd={(e) => handlePlay(idx, e)}
            >
              {isDesktop && <div className="card-key-badge">[{idx + 1}]</div>}
              <CardFace
                card={card}
                onClick={() => handlePlay(idx)}
                disabled={!canPlay}
                className="held-in-hand-card"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface OpponentHandsProps {
  cardsCount: number;
  isTurn: boolean;
  name: string;
  avatar: string;
}

/** Cartas del Rival boca abajo */
export function OpponentHandsHoldingCards({ cardsCount, isTurn, name, avatar }: OpponentHandsProps) {
  return (
    <div className={`opponent-hands-holder ${isTurn ? 'opp-turn-active' : ''}`} aria-label={`Cartas de ${name}`}>
      {/* Insignia del rival */}
      <div className="opponent-badge">
        <span className="opponent-avatar">{avatar}</span>
        <span className="opponent-name">{name}</span>
        {isTurn && <span className="turn-indicator-pulse"></span>}
      </div>

      {/* Naipes boca abajo fanned out */}
      <div className="opp-cards-row">
        {Array.from({ length: cardsCount }).map((_, idx) => {
          let rot = 0;
          if (cardsCount === 3) {
            rot = idx === 0 ? 6 : idx === 1 ? 0 : -6;
          } else if (cardsCount === 2) {
            rot = idx === 0 ? 4 : -4;
          }
          return (
            <div
              key={idx}
              className="opp-card-wrapper"
              style={{ transform: `rotate(${rot}deg)` }}
            >
              <CardBack small />
            </div>
          );
        })}
      </div>
    </div>
  );
}
