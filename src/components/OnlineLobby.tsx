// ─── Online Room Host / Guest Lobby ──────────────────────────────
import React, { useState } from 'react';
import { soundButton } from '../engine/audio';
import type { NetworkStatus } from '../engine/network';

interface OnlineLobbyProps {
  roomCode: string;
  isHost: boolean;
  networkStatus: NetworkStatus;
  statusInfo: string;
  peerName: string | null;
  goal: 15 | 30;
  withFlor: boolean;
  onSetGoal: (g: 15 | 30) => void;
  onSetFlor: (f: boolean) => void;
  onStartMatch: () => void;
  onCancel: () => void;
}

export default function OnlineLobby({
  roomCode,
  isHost,
  networkStatus,
  statusInfo,
  peerName,
  goal,
  withFlor,
  onSetGoal,
  onSetFlor,
  onStartMatch,
  onCancel,
}: OnlineLobbyProps) {
  const [copied, setCopied] = useState(false);

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
      prompt('Copia este enlace para enviarlo a tu amigo:', shareUrl);
    }
  };

  const handleShareWhatsApp = () => {
    soundButton();
    const shareUrl = getShareUrl();
    const text = encodeURIComponent(
      `¡Sale truco! Entrá a mi sala en el celu: ${shareUrl} o ingresá el código ${roomCode}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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
          <div className="code-title">Código de tu Sala</div>
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

        {/* Players in lobby */}
        <div className="lobby-section">
          <div className="section-label">Jugadores en la Mesa</div>
          <div className="lobby-slots">
            <div className="slot-player">
              <div className="slot-left">
                <div className="slot-avatar">🤠</div>
                <div>
                  <div className="slot-name">{isHost ? 'Vos (Anfitrión)' : 'Vos'}</div>
                  <div className="slot-tag">Mano</div>
                </div>
              </div>
              <div className="slot-status ready">Conectado</div>
            </div>

            <div className="slot-player">
              <div className="slot-left">
                <div className="slot-avatar" style={{ borderColor: peerName ? 'var(--gold)' : '#555' }}>
                  {peerName ? '😎' : '⏳'}
                </div>
                <div>
                  <div className="slot-name">
                    {peerName ? peerName : 'Esperando a tu amigo...'}
                  </div>
                  <div className="slot-tag" style={{ color: peerName ? 'var(--gold-light)' : '#888' }}>
                    {peerName ? 'Listo para jugar' : 'Pie'}
                  </div>
                </div>
              </div>
              <div className={`slot-status ${peerName ? 'ready' : 'waiting'}`}>
                {peerName ? 'En la mesa' : 'Esperando...'}
              </div>
            </div>
          </div>
        </div>

        {/* Game Rules Config (Host only) */}
        {isHost && (
          <div className="lobby-section">
            <div className="section-label">Configuración de la Partida</div>
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
          disabled={!peerName}
          onClick={() => {
            soundButton();
            onStartMatch();
          }}
        >
          <span>{peerName ? '¡Comenzar Partida!' : 'Esperando que entre tu amigo...'}</span>
          <span>🃏</span>
        </button>
      ) : (
        <div className="guest-waiting-box">
          <p>Esperando que el anfitrión comience la partida...</p>
        </div>
      )}
    </div>
  );
}
