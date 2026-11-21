// ─── Online Room Host / Guest Lobby with Real Multi-Player Seats ──────────────────
import React, { useState } from 'react';
import { soundButton } from '../engine/audio';
import type { NetworkStatus } from '../engine/network';
import type { MatchType, RoomSeat } from '../engine/types';

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
  seats?: RoomSeat[];
  myPeerId?: string;
  onSetGoal: (g: 15 | 30) => void;
  onSetFlor: (f: boolean) => void;
  onSetMatchType?: (m: MatchType) => void;
  onChangeSeat?: (targetSeatIndex: number) => void;
  onStartMatch: (fillWithBots?: boolean) => void;
  onCancel: () => void;
}

const DEFAULT_AVATARS = ['🤠', '😎', '🧉', '😼', '🐎', '🎭'];

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
  seats,
  myPeerId,
  onSetGoal,
  onSetFlor,
  onSetMatchType,
  onChangeSeat,
  onStartMatch,
  onCancel,
}: OnlineLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [fillBots, setFillBots] = useState(false);

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

  const totalSeats = matchType === '1v1' ? 2 : matchType === '2v2' ? 4 : 6;

  // Build the live seat list
  const currentSeats: RoomSeat[] = Array.from({ length: totalSeats }, (_, i) => {
    const existing = seats?.find(s => s.seatIndex === i);
    if (existing) return existing;
    return {
      seatIndex: i,
      peerId: i === 0 && isHost ? (myPeerId || 'host') : '',
      name: i === 0 && isHost ? playerName : '',
      team: (i % 2 === 0 ? 0 : 1) as 0 | 1,
      avatar: DEFAULT_AVATARS[i] || '🤠',
      isHost: i === 0 && isHost,
      isConnected: i === 0 && isHost,
    };
  });

  const connectedCount = currentSeats.filter(s => Boolean(s.peerId && s.isConnected !== false)).length;
  const isFull = connectedCount >= totalSeats;

  // Teams breakdown: Team 0 (Nosotros) = even seat indices; Team 1 (Ellos) = odd seat indices
  const team0Seats = currentSeats.filter(s => s.seatIndex % 2 === 0);
  const team1Seats = currentSeats.filter(s => s.seatIndex % 2 === 1);

  const renderSeatCard = (seat: RoomSeat) => {
    const isOccupied = Boolean(seat.peerId && seat.name);
    const isMe = seat.peerId === myPeerId || (seat.isHost && isHost);
    const seatRoleLabel =
      matchType === '1v1'
        ? (seat.seatIndex === 0 ? 'Mano • Nosotros' : 'Pie • Ellos')
        : matchType === '2v2'
        ? (seat.seatIndex === 0 ? 'Mano • Tu Equipo' : seat.seatIndex === 2 ? 'Tu Compañero' : `Rival ${seat.seatIndex === 1 ? '1' : '2'}`)
        : (seat.seatIndex === 0 ? 'Mano • Tu Equipo' : seat.team === 0 ? `Compañero ${seat.seatIndex === 2 ? '1' : '2'}` : `Rival ${seat.seatIndex === 1 ? '1' : seat.seatIndex === 3 ? '2' : '3'}`);

    return (
      <div
        key={seat.seatIndex}
        className={`slot-player team-${seat.team} ${isOccupied ? 'occupied' : 'empty'} ${isMe ? 'is-me' : ''}`}
      >
        <div className="slot-left">
          <div className="slot-avatar">
            {isOccupied ? seat.avatar : '⏳'}
          </div>
          <div>
            <div className="slot-name">
              {isOccupied ? (
                <>
                  {seat.name} {isMe ? '(Vos)' : ''} {seat.isHost ? '👑' : ''}
                </>
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Asiento {seat.seatIndex + 1} Libre
                </span>
              )}
            </div>
            <div className="slot-tag" style={{ color: seat.team === 0 ? '#60a5fa' : '#f87171' }}>
              {seatRoleLabel}
            </div>
          </div>
        </div>

        <div className="slot-right-actions">
          {isOccupied ? (
            <div className="slot-status ready">
              {seat.isHost ? 'Anfitrión' : 'Listo'}
            </div>
          ) : (
            <button
              className="btn-sit-here"
              onClick={() => {
                soundButton();
                onChangeSeat?.(seat.seatIndex);
              }}
              title="Cambiarte a este asiento y equipo"
            >
              Sentarme acá
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="lobby-screen">
      <div className="view-header">
        <button className="btn-back" onClick={onCancel} title="Salir al menú principal">←</button>
        <div className="view-title">
          {isHost ? `Crear Mesa Online (${matchType})` : `Mesa Online (${matchType})`}
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="lobby-content">
        {/* Room Code Card with WhatsApp Invite */}
        <div className="room-code-badge">
          <div className="code-title">Código de la Mesa ({matchType.toUpperCase()})</div>
          <div className="code-val">{roomCode}</div>
          <div className="room-actions-row">
            <button className="btn-copy-code" onClick={handleCopyLink}>
              <span>{copied ? '✓ ¡Enlace Copiado!' : '📋 Copiar Enlace'}</span>
            </button>
            <button className="btn-copy-code wp-btn" onClick={handleShareWhatsApp}>
              <span>💬 Invitar por WhatsApp</span>
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
                ⚔️ 1 vs 1 (2 Jugadores)
              </button>
              <button
                className={`btn-matchtype ${matchType === '2v2' ? 'active' : ''}`}
                onClick={() => { soundButton(); onSetMatchType('2v2'); }}
              >
                👥 2 vs 2 (4 Jugadores)
              </button>
              <button
                className={`btn-matchtype ${matchType === '3v3' ? 'active' : ''}`}
                onClick={() => { soundButton(); onSetMatchType('3v3'); }}
              >
                🎪 3 vs 3 (6 Jugadores)
              </button>
            </div>
          </div>
        )}

        {/* Real Player Seats by Team */}
        <div className="lobby-section">
          <div className="section-label-row">
            <span className="section-label">
              Mesa ({connectedCount} de {totalSeats} Personas Conectadas)
            </span>
            {isHost && !isFull && (
              <label className="fill-bots-toggle" title="Si tus amigos no llegan, completarás los asientos vacíos con Bots inteligentes">
                <input
                  type="checkbox"
                  checked={fillBots}
                  onChange={e => setFillBots(e.target.checked)}
                />
                <span>Completar vacíos con Bots</span>
              </label>
            )}
          </div>

          {/* Team 1: Nosotros */}
          <div className="lobby-team-group team-nosotros">
            <div className="team-group-header blue">
              <span>🤝 Equipo 1 (Nosotros)</span>
              <span className="team-count">
                {team0Seats.filter(s => s.peerId).length} / {team0Seats.length}
              </span>
            </div>
            <div className="lobby-slots">
              {team0Seats.map(renderSeatCard)}
            </div>
          </div>

          {/* Team 2: Ellos */}
          <div className="lobby-team-group team-ellos" style={{ marginTop: '10px' }}>
            <div className="team-group-header red">
              <span>⚔️ Equipo 2 (Ellos)</span>
              <span className="team-count">
                {team1Seats.filter(s => s.peerId).length} / {team1Seats.length}
              </span>
            </div>
            <div className="lobby-slots">
              {team1Seats.map(renderSeatCard)}
            </div>
          </div>
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

        {/* Live Network Status */}
        <div className="network-status-box">
          <span className="status-dot pulsing">●</span>
          <span className="status-text">{statusInfo}</span>
        </div>
      </div>

      {/* Start Button */}
      {isHost ? (
        <button
          className={`btn-launch ${isFull || fillBots ? 'ready-to-launch' : ''}`}
          disabled={!isFull && !fillBots}
          onClick={() => {
            soundButton();
            onStartMatch(fillBots);
          }}
        >
          <span>
            {isFull
              ? `¡Comenzar Partida ${matchType} (${connectedCount}/${totalSeats} Jugadores)! 🃏`
              : fillBots
              ? `¡Comenzar Partida ${matchType} (${connectedCount} personas + ${totalSeats - connectedCount} bots)! 🤖`
              : `Esperando que entren más amigos (${connectedCount}/${totalSeats})... ⏳`}
          </span>
        </button>
      ) : (
        <div className="guest-waiting-box">
          <p>
            {isFull
              ? `¡Todos conectados (${connectedCount}/${totalSeats})! Esperando que el anfitrión inicie...`
              : `Esperando que se sumen más jugadores (${connectedCount}/${totalSeats})...`}
          </p>
        </div>
      )}
    </div>
  );
}
