// ─── Home Screen Component with Room Management ────────────────
import React, { useState } from 'react';
import type { RoomConfig } from '../engine/types';
import { soundButton } from '../engine/audio';

interface HomeScreenProps {
  onStartGame: (config: RoomConfig) => void;
  onCreateOnlineRoom: (playerName: string) => void;
  onOpenJoinModal: () => void;
  onOpenAnotador: () => void;
  isDesktop?: boolean;
  onToggleDesktop?: () => void;
}

export default function HomeScreen({
  onStartGame,
  onCreateOnlineRoom,
  onOpenJoinModal,
  onOpenAnotador,
  isDesktop = false,
  onToggleDesktop,
}: HomeScreenProps) {
  const [playerName, setPlayerName] = useState('Vos');

  const quickPlay = (goal: 15 | 30) => {
    soundButton();
    onStartGame({
      goal,
      withFlor: false,
      mode: 'bot',
      playerName: playerName.trim() || 'Vos',
      opponentName: 'Don Florencio',
    });
  };

  const playPassAndPlay = () => {
    soundButton();
    onStartGame({
      goal: 15,
      withFlor: false,
      mode: 'local',
      playerName: 'Jugador 1',
      opponentName: 'Jugador 2',
    });
  };

  return (
    <div className="home-screen">
      <div className="home-top-bar">
        <span className="platform-tag">{isDesktop ? '🖥️ Modo PC Web' : '📱 Modo Móvil'}</span>
        {onToggleDesktop && (
          <button className="btn-layout-toggle" onClick={onToggleDesktop}>
            {isDesktop ? '📱 Ver como Celular' : '🖥️ Pantalla Completa PC'}
          </button>
        )}
      </div>

      <div className="home-hero">
        <div className="home-badge">🇦🇷 TRUCO CRIOLLO MÓVIL</div>
        <h1 className="home-title">
          TRUCO<span>PRO</span>
        </h1>
        <p className="home-subtitle">Mesa gaucha, picardía y juego limpio</p>

        {/* Fan of Spanish Cards */}
        <div className="home-cards-fan">
          <div className="fan-card fan-left">
            <span className="fan-num" style={{ color: '#16a34a' }}>1</span>
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d="M12 2l3.5 7h-7L12 2zM10 9h4v13h-4z" fill="#16a34a" />
            </svg>
            <span style={{ fontSize: 7, fontWeight: 700 }}>BASTO</span>
          </div>
          <div className="fan-card fan-center">
            <span className="fan-num" style={{ color: '#2563eb' }}>1</span>
            <svg width="32" height="32" viewBox="0 0 24 24">
              <path d="M12 1l1.8 11h-3.6L12 1zM8 12h8v2.5H8zM11 14.5h2V23h-2z" fill="#2563eb" />
            </svg>
            <span className="fan-label">EL MACHO</span>
          </div>
          <div className="fan-card fan-right">
            <span className="fan-num" style={{ color: '#2563eb' }}>7</span>
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d="M12 1l1.8 11h-3.6L12 1zM8 12h8v2.5H8zM11 14.5h2V23h-2z" fill="#2563eb" />
            </svg>
            <span style={{ fontSize: 7, fontWeight: 700 }}>ESPADA</span>
          </div>
        </div>
      </div>

      {/* Player Nickname Input */}
      <div className="home-name-input-box">
        <label htmlFor="homeNameInput">Tu Nombre / Apodo:</label>
        <input
          id="homeNameInput"
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          maxLength={18}
          placeholder="Escribí tu apodo"
        />
      </div>

      {/* Main Menu Grid */}
      <div className="home-menu">
        {/* Online Room Creation */}
        <button
          className="menu-btn primary"
          onClick={() => {
            soundButton();
            onCreateOnlineRoom(playerName.trim() || 'Vos');
          }}
        >
          <div className="menu-icon">🌐</div>
          <div className="menu-text">
            <strong>Crear Sala Online</strong>
            <span>Generá un código o link para jugar con amigos</span>
          </div>
          <span className="menu-arrow">➔</span>
        </button>

        {/* Join Online Room */}
        <button
          className="menu-btn"
          onClick={() => {
            soundButton();
            onOpenJoinModal();
          }}
        >
          <div className="menu-icon">🔑</div>
          <div className="menu-text">
            <strong>Unirse a Sala Online</strong>
            <span>Ingresá el código PIN que te pasó tu amigo</span>
          </div>
          <span className="menu-arrow">➔</span>
        </button>

        {/* Local Pass and Play */}
        <button className="menu-btn" onClick={playPassAndPlay}>
          <div className="menu-icon">📱</div>
          <div className="menu-text">
            <strong>Pasa y Juega (Local)</strong>
            <span>2 personas en este mismo celular (sin internet)</span>
          </div>
          <span className="menu-arrow">➔</span>
        </button>

        {/* Solo vs Bot */}
        <button className="menu-btn" onClick={() => quickPlay(15)}>
          <div className="menu-icon">🤠</div>
          <div className="menu-text">
            <strong>Partida vs Bot (Don Florencio)</strong>
            <span>Practicá tus señas y cantos offline</span>
          </div>
          <span className="menu-arrow">➔</span>
        </button>

        {/* Classic Matchstick Scorer */}
        <button
          className="menu-btn"
          onClick={() => {
            soundButton();
            onOpenAnotador();
          }}
        >
          <div className="menu-icon">📋</div>
          <div className="menu-text">
            <strong>Solo Anotador Gaucho</strong>
            <span>Anotador con fósforos para cartas reales</span>
          </div>
          <span className="menu-arrow">➔</span>
        </button>
      </div>

      <div className="home-footer">
        <span>⚡ Versión Web & Móvil PWA</span>
        <span>iPhone • Android • PC</span>
      </div>
    </div>
  );
}
