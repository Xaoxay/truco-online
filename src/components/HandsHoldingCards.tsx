import React from 'react';
import type { Card as CardType } from '../engine/types';
import { CardFace, CardBack } from './Card';

interface PlayerHandsProps {
  cards: CardType[];
  onPlayCard: (idx: number) => void;
  canPlay: boolean;
  isDesktop?: boolean;
}

/** Manos del Jugador sosteniendo las cartas en abanico criollo */
export function PlayerHandsHoldingCards({ cards, onPlayCard, canPlay, isDesktop }: PlayerHandsProps) {
  const count = cards.length;

  return (
    <div className="player-hands-holder" role="region" aria-label="Tus cartas en mano">
      {/* Manos del jugador (detrás y debajo de las cartas) */}
      <div className="hands-artwork hands-back" aria-hidden="true">
        <svg viewBox="0 0 340 120" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="skinGradLeft" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#b4744d" />
              <stop offset="50%" stopColor="#d4946d" />
              <stop offset="100%" stopColor="#eab593" />
            </linearGradient>
            <linearGradient id="skinGradRight" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#b4744d" />
              <stop offset="50%" stopColor="#d4946d" />
              <stop offset="100%" stopColor="#eab593" />
            </linearGradient>
            <linearGradient id="cuffGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#54301a" />
              <stop offset="100%" stopColor="#31190c" />
            </linearGradient>
          </defs>

          {/* Muñeca / Manga Izquierda con muñequera criolla */}
          <path d="M40 120 L75 75 C85 68, 100 70, 115 80 L100 120 Z" fill="url(#skinGradLeft)" stroke="#67391b" strokeWidth="1.2" />
          <path d="M30 120 L65 72 L82 85 L48 120 Z" fill="url(#cuffGrad)" stroke="#221107" strokeWidth="1.5" />
          <line x1="68" y1="75" x2="52" y2="115" stroke="#f4c430" strokeWidth="1" strokeDasharray="3 3" />

          {/* Palma y dedos base izquierda sosteniendo el abanico */}
          <path d="M85 75 C100 65, 120 70, 140 85 C130 95, 110 98, 95 90 Z" fill="url(#skinGradLeft)" stroke="#67391b" strokeWidth="1" />

          {/* Muñeca / Manga Derecha con muñequera criolla */}
          <path d="M300 120 L265 75 C255 68, 240 70, 225 80 L240 120 Z" fill="url(#skinGradRight)" stroke="#67391b" strokeWidth="1.2" />
          <path d="M310 120 L275 72 L258 85 L292 120 Z" fill="url(#cuffGrad)" stroke="#221107" strokeWidth="1.5" />
          <line x1="272" y1="75" x2="288" y2="115" stroke="#f4c430" strokeWidth="1" strokeDasharray="3 3" />

          {/* Palma y dedos base derecha sosteniendo el abanico */}
          <path d="M255 75 C240 65, 220 70, 200 85 C210 95, 230 98, 245 90 Z" fill="url(#skinGradRight)" stroke="#67391b" strokeWidth="1" />
        </svg>
      </div>

      {/* Cartas en abanico criollo interactivo */}
      <div className="cards-fan-container">
        {cards.map((card, idx) => {
          let rot = 0;
          let translateY = 0;
          let translateX = 0;

          if (count === 3) {
            if (idx === 0) { rot = -10; translateY = 6; translateX = -16; }
            else if (idx === 1) { rot = 0; translateY = -6; translateX = 0; }
            else if (idx === 2) { rot = 10; translateY = 6; translateX = 16; }
          } else if (count === 2) {
            if (idx === 0) { rot = -7; translateY = 4; translateX = -12; }
            else if (idx === 1) { rot = 7; translateY = 4; translateX = 12; }
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
            >
              {isDesktop && <div className="card-key-badge">[{idx + 1}]</div>}
              <CardFace
                card={card}
                onClick={() => canPlay && onPlayCard(idx)}
                disabled={!canPlay}
                className="held-in-hand-card"
              />
            </div>
          );
        })}
      </div>

      {/* Pulgares y dedos delanteros que sujetan las cartas por el frente */}
      <div className="hands-artwork hands-front" aria-hidden="true">
        <svg viewBox="0 0 340 70" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="thumbGradLeft" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#bf7e55" />
              <stop offset="70%" stopColor="#eab593" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
            <linearGradient id="thumbGradRight" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#bf7e55" />
              <stop offset="70%" stopColor="#eab593" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
          </defs>

          {/* Pulgar izquierdo apoyado sobre la carta izquierda */}
          <path
            d="M95 65 C105 45, 125 35, 142 42 C148 46, 148 55, 138 60 C125 66, 110 68, 95 65 Z"
            fill="url(#thumbGradLeft)"
            stroke="#67391b"
            strokeWidth="1.2"
          />
          {/* Uña pulgar izquierdo */}
          <path d="M136 44 C142 47, 142 52, 136 55" stroke="#fbd5b5" strokeWidth="1.2" fill="none" />

          {/* Pulgar derecho apoyado sobre la carta derecha */}
          <path
            d="M245 65 C235 45, 215 35, 198 42 C192 46, 192 55, 202 60 C215 66, 230 68, 245 65 Z"
            fill="url(#thumbGradRight)"
            stroke="#67391b"
            strokeWidth="1.2"
          />
          {/* Uña pulgar derecho */}
          <path d="M204 44 C198 47, 198 52, 204 55" stroke="#fbd5b5" strokeWidth="1.2" fill="none" />
        </svg>
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

/** Manos del Rival sosteniendo sus cartas boca abajo desde el otro lado de la mesa */
export function OpponentHandsHoldingCards({ cardsCount, isTurn, name, avatar }: OpponentHandsProps) {
  return (
    <div className={`opponent-hands-holder ${isTurn ? 'opp-turn-active' : ''}`} aria-label={`Cartas de ${name}`}>
      {/* Insignia del rival */}
      <div className="opponent-badge">
        <span className="opponent-avatar">{avatar}</span>
        <span className="opponent-name">{name}</span>
        {isTurn && <span className="turn-indicator-pulse"></span>}
      </div>

      {/* Contenedor de manos del rival sosteniendo cartas boca abajo */}
      <div className="opp-cards-fan-container">
        {/* Manos del rival desde arriba */}
        <div className="opp-hands-artwork" aria-hidden="true">
          <svg viewBox="0 0 220 50" width="100%" height="100%" preserveAspectRatio="xMidYMin meet">
            <defs>
              <linearGradient id="oppSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b4744d" />
                <stop offset="70%" stopColor="#d4946d" />
                <stop offset="100%" stopColor="#eab593" />
              </linearGradient>
            </defs>
            {/* Muñeca y dedos izquierdos */}
            <path d="M60 0 L70 25 C75 32, 90 32, 95 24 L85 0 Z" fill="url(#oppSkin)" stroke="#593015" strokeWidth="1" />
            {/* Muñeca y dedos derechos */}
            <path d="M160 0 L150 25 C145 32, 130 32, 125 24 L135 0 Z" fill="url(#oppSkin)" stroke="#593015" strokeWidth="1" />
          </svg>
        </div>

        {/* Naipes boca abajo fanned out */}
        <div className="opp-cards-row">
          {Array.from({ length: cardsCount }).map((_, idx) => {
            let rot = 0;
            if (cardsCount === 3) {
              rot = idx === 0 ? 6 : idx === 1 ? 0 : -6;
            } else if (cardsCount === 2) {
              rot = idx === 0 ? 5 : -5;
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
    </div>
  );
}
