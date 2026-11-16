// ─── Online Room Host / Guest Lobby ──────────────────────────────
import React, { useState } from 'react';
import { soundButton } from '../engine/audio';
import type { NetworkStatus } from '../engine/network';
import type { MatchType } from '../engine/types';

interface OnlineLobbyProps {
  roomCode: string;
  isHost: boolean;
  networkStatus: NetworkStatus;
  statusInfo: string;
  peerName: string | null;
  playerName?: string;
  opponentName?: string;
  goal: 15 | 30;
  withFlor: boolean;
  matchType?: MatchType;
  onSetGoal: (g: 15 | 30) => void;
  onSetFlor: (f: boolean) => void;
  onSetMatchType?: (m: MatchType) => void;
  onStartMatch: () => void;
  onCancel: () => void;
}

export default function OnlineLobby({
  roomCode,
  isHost,
  networkStatus,
  statusInfo,
  peerName,
  playerName = 'Vos',
  opponentName,
  goal,
  withFlor,
  matchType = '1v1',
  onSetGoal,
  onSetFlor,
  onSetMatchType,
  onStartMatch,
  onCancel,
}: OnlineLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [fillBots, setFillBots] = useState(true);

  const getShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    return url.toString();
  };

  const handleCopyLink = async () => {
    soundButton();
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      prompt('Copia este enlace para enviarlo a tus amigos:', shareUrl);
    }
  };

  const handleShareWhatsApp = () => {
    soundButton();
    const shareUrl = getShareUrl();
    const text = encodeURIComponent(
      `¡Sale truco ${matchType}! Entrá a mi mesa: ${shareUrl} o ingresá el código ${roomCode}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const playerCount = matchType === '1v1' ? 2 : matchType === '2v2' ? 4 : 6;

  // Render slots for the chosen format
  const renderSlots = () => {
    const oppDisplayName = peerName || opponentName;

    if (matchType === '1v1') {
      return (
        <div className="lobby-slots">
          <div className="slot-player">
            <div className="slot-left">
              <div className="slot-avatar">🤠</div>
              <div>
                <div className="slot-name">{playerName} {isHost ? '(Anfitrión)' : '(Vos)'}</div>
                <div className="slot-tag">Mano • Nosotros</div>
              </div>
            </div>
            <div className="slot-status ready">Conectado</div>
          </div>

          <div className="slot-player">
            <div className="slot-left">
              <div className="slot-avatar" style={{ borderColor: oppDisplayName ? 'var(--gold)' : '#555' }}>
                {oppDisplayName ? '😎' : fillBots ? '🤖' : '⏳'}
              </div>
              <div>
                <div className="slot-name">
                  {oppDisplayName ? oppDisplayName : fillBots ? 'Don Florencio (Bot)' : 'Esperando a tu amigo...'}
                </div>
                <div className="slot-tag" style={{ color: oppDisplayName ? 'var(--gold-light)' : '#888' }}>
                  {oppDisplayName ? 'Listo para jugar' : fillBots ? 'Bot de Reemplazo' : 'Pie • Ellos'}
                </div>
              </div>
            </div>
            <div className={`slot-status ${oppDisplayName || fillBots ? 'ready' : 'waiting'}`}>
              {oppDisplayName ? 'En la mesa' : fillBots ? 'Listo (Bot)' : 'Esperando...'}
            </div>
          </div>
        </div>
      );
    }

    if (matchType === '2v2') {
      return (
        <div className="lobby-slots">
          <div className="slot-player">
            <div className="slot-left">
              <div className="slot-avatar">🤠</div>
              <div>
                <div className="slot-name">{playerName} {isHost ? '(Anfitrión)' : '(Vos)'}</div>
                <div className="slot-tag" style={{ color: '#2563eb' }}>Equipo 1: Nosotros</div>
              </div>
            </div>
            <div className="slot-status ready">Conectado</div>
          </div>

          <div className="slot-player">
            <div className="slot-left">
              <div className="slot-avatar" style={{ borderColor: oppDisplayName ? 'var(--gold)' : '#555' }}>
                {oppDisplayName ? '😎' : '🤖'}
              </div>
              <div>
                <div className="slot-name">
                  {oppDisplayName ? oppDisplayName : 'Don Florencio (Bot)'}
                </div>
                <div className="slot-tag" style={{ color: '#dc2626' }}>
                  Equipo 2: Rival 1
                </div>
              </div>
            </div>
            <div className="slot-status ready">
              {oppDisplayName ? 'En la mesa' : 'Listo (Bot)'}
            </div>
          </div>

          <div className="slot-player">
            <div className="slot-left">
              <div className="slot-avatar">🤠</div>
              <div>
                <div className="slot-name">El Chaja (Bot)</div>
                <div className="slot-tag" style={{ color: '#2563eb' }}>Equipo 1: Tu Compañero</div>
              </div>
            </div>
            <div className="slot-status ready">Listo (Bot)</div>
          </div>

          <div className="slot-player">
            <div className="slot-left">
              <div className="slot-avatar">😼</div>
              <div>
                <div className="slot-name">El Zorro (Bot)</div>
                <div className="slot-tag" style={{ color: '#dc2626' }}>Equipo 2: Rival 2</div>
              </div>
            </div>
            <div className="slot-status ready">Listo (Bot)</div>
          </div>
        </div>
      );
    }

    // 3v3 Sexteto
    return (
      <div className="lobby-slots">
        <div className="slot-player">
          <div className="slot-left">
            <div className="slot-avatar">🤠</div>
            <div>
              <div className="slot-name">{playerName} {isHost ? '(Anfitrión)' : '(Vos)'}</div>
              <div className="slot-tag" style={{ color: '#2563eb' }}>Equipo 1: Nosotros (Mano)</div>
            </div>
          </div>
          <div className="slot-status ready">Conectado</div>
        </div>

        <div className="slot-player">
          <div className="slot-left">
            <div className="slot-avatar">{oppDisplayName ? '😎' : '🤖'}</div>
            <div>
              <div className="slot-name">{oppDisplayName ? oppDisplayName : 'Don Florencio (Bot)'}</div>
              <div className="slot-tag" style={{ color: '#dc2626' }}>Equipo 2: Rival 1</div>
            </div>
          </div>
          <div className="slot-status ready">{oppDisplayName ? 'En la mesa' : 'Listo (Bot)'}</div>
        </div>

        <div className="slot-player">
          <div className="slot-left">
            <div className="slot-avatar">🤠</div>
            <div>
              <div className="slot-name">El Chaja (Bot)</div>
              <div className="slot-tag" style={{ color: '#2563eb' }}>Equipo 1: Compañero 1</div>
            </div>
          </div>
          <div className="slot-status ready">Listo (Bot)</div>
        </div>

        <div className="slot-player">
          <div className="slot-left">
            <div className="slot-avatar">😼</div>
            <div>
              <div className="slot-name">El Zorro (Bot)</div>
              <div className="slot-tag" style={{ color: '#dc2626' }}>Equipo 2: Rival 2</div>
            </div>
          </div>
          <div className="slot-status ready">Listo (Bot)</div>
        </div>

        <div className="slot-player">
          <div className="slot-left">
            <div className="slot-avatar">🧉</div>
            <div>
              <div className="slot-name">Martín Fierro (Bot)</div>
              <div className="slot-tag" style={{ color: '#2563eb' }}>Equipo 1: Compañero 2</div>
            </div>
          </div>
          <div className="slot-status ready">Listo (Bot)</div>
        </div>

        <div className="slot-player">
          <div className="slot-left">
            <div className="slot-avatar">🐎</div>
            <div>
              <div className="slot-name">Don Segundo (Bot)</div>
              <div className="slot-tag" style={{ color: '#dc2626' }}>Equipo 2: Rival 3</div>
            </div>
          </div>
          <div className="slot-status ready">Listo (Bot)</div>
        </div>
      </div>
    );
  };

  return (
    <div className="lobby-screen">
      <div className="view-header">
        <button className="btn-back" onClick={onCancel}>←</button>
        <div className="view-title">{isHost ? 'Crear Sala Online' : 'Sala Online'}</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="lobby-content">
        {/* Room Code Card */}
        <div className="room-code-badge">
          <div className="code-title">Código de tu Sala ({matchType})</div>
          <div className="code-val">{roomCode}</div>
          <div className="room-actions-row">
            <button className="btn-copy-code" onClick={handleCopyLink}>
              <span>{copied ? '✓ ¡Copiado!' : '📋 Copiar Enlace'}</span>
            </button>
            <button className="btn-copy-code wp-btn" onClick={handleShareWhatsApp}>
              <span>💬 Enviar por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Format Selector (Host only) */}
        {isHost && onSetMatchType && (
          <div className="lobby-section">
            <div className="section-label">Modalidad de Partida</div>
            <div className="matchtype-buttons-row">
              <button
                className={`btn-matchtype ${matchType === '1v1' ? 'active' : ''}`}
                onClick={() => { soundButton(); onSetMatchType('1v1'); }}
              >
                ⚔️ 1 vs 1
              </button>
              <button
                className={`btn-matchtype ${matchType === '2v2' ? 'active' : ''}`}
                onClick={() => { soundButton(); onSetMatchType('2v2'); }}
              >
                👥 2 vs 2
              </button>
              <button
                className={`btn-matchtype ${matchType === '3v3' ? 'active' : ''}`}
                onClick={() => { soundButton(); onSetMatchType('3v3'); }}
              >
                🎪 3 vs 3
              </button>
            </div>
          </div>
        )}

        {/* Players in lobby */}
        <div className="lobby-section">
          <div className="section-label-row">
            <span className="section-label">Jugadores ({playerCount} en la Mesa)</span>
            {isHost && (
              <label className="fill-bots-toggle">
                <input
                  type="checkbox"
                  checked={fillBots}
                  onChange={e => setFillBots(e.target.checked)}
                />
                <span>Completar con Bots</span>
              </label>
            )}
          </div>
          {renderSlots()}
        </div>

        {/* Game Rules Config (Host only) */}
        {isHost && (
          <div className="lobby-section">
            <div className="section-label">Configuración de Tantos</div>
            <div className="option-grid">
              <div
                className={`option-card ${goal === 15 ? 'selected' : ''}`}
                onClick={() => { soundButton(); onSetGoal(15); }}
              >
                <div className="opt-emoji">⚡</div>
                <div className="opt-name">A 15 Tantos</div>
                <div className="opt-sub">Partida rápida</div>
              </div>
              <div
                className={`option-card ${goal === 30 ? 'selected' : ''}`}
                onClick={() => { soundButton(); onSetGoal(30); }}
              >
                <div className="opt-emoji">🏆</div>
                <div className="opt-name">A 30 Tantos</div>
                <div className="opt-sub">Malas y Buenas</div>
              </div>
            </div>

            <div className="toggle-row" style={{ marginTop: '12px' }}>
              <div className="toggle-info">
                <h4>Jugar con Flor</h4>
                <p>3 cartas del mismo palo valen 3 puntos</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={withFlor}
                  onChange={e => onSetFlor(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        )}

        {/* Status text */}
        <div className="network-status-box">
          <span className="status-dot pulsing">●</span>
          <span className="status-text">{statusInfo}</span>
        </div>
      </div>

      {/* Start Button */}
      {isHost ? (
        <button
          className="btn-launch"
          disabled={!peerName && !fillBots}
          onClick={() => {
            soundButton();
            onStartMatch();
          }}
        >
          <span>
            {peerName || fillBots ? `¡Comenzar Partida ${matchType}! 🃏` : 'Esperando que entre tu amigo...'}
          </span>
        </button>
      ) : (
        <div className="guest-waiting-box">
          <p>Esperando que el anfitrión comience la partida {matchType}...</p>
        </div>
      )}
    </div>
  );
}
