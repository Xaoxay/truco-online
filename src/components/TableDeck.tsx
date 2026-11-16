import React, { useState } from 'react';
import type { Card as CardType } from '../engine/types';
import { CardFace, CardBack } from './Card';

interface TableDeckProps {
  onShuffleAndCut?: () => void;
  isShuffling?: boolean;
}

/** Mazo de Naipes al Costado de la Mesa de Madera con Sorteo de Mano */
export function TableDeck({ onShuffleAndCut, isShuffling }: TableDeckProps) {
  return (
    <div
      className={`table-side-deck ${isShuffling ? 'is-shuffling' : ''}`}
      onClick={onShuffleAndCut}
      title="El Mazo de Truco (Toca para mezclar y cortar)"
      role="button"
      tabIndex={0}
    >
      <div className="deck-shadow" />
      <div className="deck-layer deck-layer-3" />
      <div className="deck-layer deck-layer-2" />
      <div className="deck-layer deck-layer-1" />
      <div className="deck-top-card">
        <CardBack small />
      </div>
      <div className="deck-tag">MAZO</div>
    </div>
  );
}

interface CutModalProps {
  playerCard: CardType;
  oppCard: CardType;
  starterName: string;
  onClose: () => void;
}

/** Modal de Sorteo de Mano: Ver Quién Arranca */
export function CutModal({ playerCard, oppCard, starterName, onClose }: CutModalProps) {
  return (
    <div className="cut-modal-overlay">
      <div className="cut-modal-card">
        <div style={{ fontSize: 32, marginBottom: 4 }}>🃏</div>
        <h3 className="cut-title">Sorteo de Mano</h3>
        <p className="cut-subtitle">Se sacó una carta para ver quién arranca la partida</p>

        <div className="cut-cards-row">
          <div className="cut-player-card">
            <span className="cut-label">Vos</span>
            <CardFace card={playerCard} />
            <span className="cut-card-name">{playerCard.label}</span>
          </div>

          <div className="cut-vs-badge">VS</div>

          <div className="cut-player-card">
            <span className="cut-label">Rival</span>
            <CardFace card={oppCard} />
            <span className="cut-card-name">{oppCard.label}</span>
          </div>
        </div>

        <div className="cut-winner-banner">
          ¡Carta más alta es Mano! Arranca <strong>{starterName}</strong>
        </div>

        <button className="btn-cut-continue" onClick={onClose}>
          ¡A Jugar! ➔
        </button>
      </div>
    </div>
  );
}
