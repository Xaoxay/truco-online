// ─── Join Room Modal with PIN Input ──────────────────────────────
import React, { useState } from 'react';
import { soundButton } from '../engine/audio';

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (roomCode: string, playerName: string) => void;
  initialCode?: string;
}

export default function JoinModal({ open, onClose, onJoin, initialCode = '' }: JoinModalProps) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('Jugador');

  if (!open) return null;

  const handleKey = (ch: string) => {
    soundButton();
    if (code.length < 6) {
      setCode(prev => (prev + ch).toUpperCase());
    }
  };

  const handleBackspace = () => {
    soundButton();
    setCode(prev => prev.slice(0, -1));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.trim().length >= 3) {
      soundButton();
      onJoin(code.trim().toUpperCase(), name.trim() || 'Jugador');
    }
  };

  return (
    <div className="score-modal-overlay" onClick={onClose}>
      <div className="join-modal" onClick={e => e.stopPropagation()}>
        <div className="score-modal-header">
          <h3>Unirse a Sala Online</h3>
          <button className="btn-close-sheet" onClick={onClose}>✕</button>
        </div>

        <p className="join-desc">
          Ingresá el código de sala que te pasó tu amigo para sentarte a la mesa.
        </p>

        <div className="join-name-row">
          <label htmlFor="joinPlayerName">Tu Apodo:</label>
          <input
            id="joinPlayerName"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={16}
            placeholder="Tu nombre"
          />
        </div>

        <div className="join-code-display">
          {[0, 1, 2, 3, 4].map(idx => (
            <div key={idx} className={`pin-digit ${code[idx] ? 'filled' : ''}`}>
              {code[idx] || '·'}
            </div>
          ))}
        </div>

        {/* Quick alphanumeric keypad */}
        <div className="join-keypad">
          {['1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','0'].map(k => (
            <button key={k} className="btn-keypad" onClick={() => handleKey(k)}>
              {k}
            </button>
          ))}
          <button className="btn-keypad key-action" onClick={handleBackspace}>
            ⌫
          </button>
          <button
            className="btn-keypad key-action join-enter"
            disabled={code.length < 3}
            onClick={() => handleSubmit()}
          >
            ➔
          </button>
        </div>

        <button
          className="btn-primary-action full-width"
          disabled={code.length < 3}
          onClick={() => handleSubmit()}
          style={{ marginTop: '16px' }}
        >
          Entrar a la Mesa
        </button>
      </div>
    </div>
  );
}
