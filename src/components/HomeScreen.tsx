// ─── Home Screen Component with Room Management ────────────────
import React, { useState, useEffect } from 'react';
import type { RoomConfig, MatchType } from '../engine/types';
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
  const [setupModal, setSetupModal] = useState<{
    open: boolean;
    mode: 'bot' | 'local';
    title: string;
  } | null>(null);

  const [selectedFormat, setSelectedFormat] = useState<MatchType>('1v1');
  const [selectedGoal, setSelectedGoal] = useState<15 | 30>(15);
  const [withFlor, setWithFlor] = useState(false);

  // PWA Web App Install state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(Boolean(isPWA));
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    soundButton();
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => setInstallPrompt(null));
    } else {
      setShowIosGuide(true);
    }
  };

  const handleLaunchGame = () => {
    soundButton();
    if (!setupModal) return;

    const isBot = setupModal.mode === 'bot';
    onStartGame({
      goal: selectedGoal,
      withFlor,
      mode: setupModal.mode,
      matchType: selectedFormat,
      playerName: playerName.trim() || 'Vos',
      opponentName: isBot ? 'Don Florencio' : 'Rival',
    });
    setSetupModal(null);
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
            <strong>Crear Sala Online (1v1, 2v2, 3v3)</strong>
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

        {/* Solo vs Bot */}
        <button
          className="menu-btn"
          onClick={() => {
            soundButton();
            setSetupModal({
              open: true,
              mode: 'bot',
              title: 'Jugar vs Bots (1v1, 2v2, 3v3)',
            });
          }}
        >
          <div className="menu-icon">🤠</div>
          <div className="menu-text">
            <strong>Partida vs Bots Criollos</strong>
            <span>1v1 mano a mano, 2v2 en parejas o 3v3 sexteto</span>
          </div>
          <span className="menu-arrow">➔</span>
        </button>

        {/* Local Pass and Play */}
        <button
          className="menu-btn"
          onClick={() => {
            soundButton();
            setSetupModal({
              open: true,
              mode: 'local',
              title: 'Pasa y Juega en este Celular',
            });
          }}
        >
          <div className="menu-icon">📱</div>
          <div className="menu-text">
            <strong>Pasa y Juega (Local)</strong>
            <span>Sin internet, pasando el celu entre amigos</span>
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

        {/* PWA / Web App Install */}
        {!isStandalone && (
          <button className="menu-btn pwa-install-btn" onClick={handleInstallClick}>
            <div className="menu-icon">📲</div>
            <div className="menu-text">
              <strong>Instalar como App en tu Celular</strong>
              <span>Jugá en pantalla completa como app nativa</span>
            </div>
            <span className="menu-arrow">➔</span>
          </button>
        )}
      </div>

      <div className="home-footer">
        <span>⚡ Versión Web & Móvil PWA</span>
        <span>iPhone • Android • PC</span>
      </div>

      {/* Setup Modal for Bots and Pass-and-Play */}
      {setupModal && setupModal.open && (
        <div className="join-modal-overlay" onClick={() => setSetupModal(null)}>
          <div className="join-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{setupModal.title}</h3>
              <button className="btn-close-modal" onClick={() => setSetupModal(null)}>✕</button>
            </div>

            <div className="setup-section" style={{ marginTop: 12 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Modalidad de Partida</div>
              <div className="matchtype-buttons-row">
                <button
                  className={`btn-matchtype ${selectedFormat === '1v1' ? 'active' : ''}`}
                  onClick={() => { soundButton(); setSelectedFormat('1v1'); }}
                >
                  ⚔️ 1 vs 1<br /><small style={{ fontSize: 9 }}>Mano a mano</small>
                </button>
                <button
                  className={`btn-matchtype ${selectedFormat === '2v2' ? 'active' : ''}`}
                  onClick={() => { soundButton(); setSelectedFormat('2v2'); }}
                >
                  👥 2 vs 2<br /><small style={{ fontSize: 9 }}>En parejas</small>
                </button>
                <button
                  className={`btn-matchtype ${selectedFormat === '3v3' ? 'active' : ''}`}
                  onClick={() => { soundButton(); setSelectedFormat('3v3'); }}
                >
                  🎪 3 vs 3<br /><small style={{ fontSize: 9 }}>Sexteto criollo</small>
                </button>
              </div>
            </div>

            <div className="setup-section" style={{ marginTop: 14 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Objetivo de Tantos</div>
              <div className="option-grid">
                <div
                  className={`option-card ${selectedGoal === 15 ? 'selected' : ''}`}
                  onClick={() => { soundButton(); setSelectedGoal(15); }}
                >
                  <div className="opt-emoji">⚡</div>
                  <div className="opt-name">A 15 Tantos</div>
                  <div className="opt-sub">Partida rápida</div>
                </div>
                <div
                  className={`option-card ${selectedGoal === 30 ? 'selected' : ''}`}
                  onClick={() => { soundButton(); setSelectedGoal(30); }}
                >
                  <div className="opt-emoji">🏆</div>
                  <div className="opt-name">A 30 Tantos</div>
                  <div className="opt-sub">Malas y Buenas</div>
                </div>
              </div>
            </div>

            <button
              className="btn-primary-action full-width"
              style={{ marginTop: 18 }}
              onClick={handleLaunchGame}
            >
              ¡A las Barajas! 🃏
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIosGuide && (
        <div className="score-modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="join-modal" onClick={e => e.stopPropagation()}>
            <div className="score-modal-header">
              <h3>📲 Instalar como App Web</h3>
              <button className="btn-close-sheet" onClick={() => setShowIosGuide(false)}>✕</button>
            </div>
            <p className="join-desc" style={{ marginBottom: 12 }}>
              Podés tener Truco Pro instalado en la pantalla de inicio de tu celular como una app nativa:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--wood-border)', marginBottom: 14 }}>
              <div style={{ marginBottom: 10, fontSize: 13 }}>
                <b style={{ color: 'var(--gold)' }}>En iPhone (Safari):</b>
                <div style={{ marginTop: 4, color: '#e5dacb', lineHeight: 1.5 }}>
                  1. Tocá el botón Compartir <b>⎋</b> abajo al medio.<br />
                  2. Seleccioná <b>"Agregar al inicio ➕"</b>.<br />
                  3. Tocá <b>"Agregar"</b> arriba a la derecha.
                </div>
              </div>
              <div style={{ fontSize: 13 }}>
                <b style={{ color: 'var(--gold)' }}>En Android (Chrome):</b>
                <div style={{ marginTop: 4, color: '#e5dacb', lineHeight: 1.5 }}>
                  1. Tocá los tres puntos <b>⋮</b> arriba a la derecha.<br />
                  2. Seleccioná <b>"Instalar aplicación"</b> o "Agregar a pantalla principal".
                </div>
              </div>
            </div>
            <button className="btn-primary-action full-width" onClick={() => setShowIosGuide(false)}>
              ¡Entendido! 👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
