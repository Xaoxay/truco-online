// ─── Join Room Modal with Native Phone Keyboard ───────────────────
import React, { useState, useEffect, useRef } from 'react';
import { soundButton } from '../engine/audio';

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (roomCode: string, playerName: string) => void;
  initialCode?: string;
}

export default function JoinModal({ open, onClose, onJoin, initialCode = '' }: JoinModalProps) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('truco-player-name') || 'Jugador';
    }
    return 'Jugador';
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initialCode) setCode(initialCode.toUpperCase());
      const saved = typeof window !== 'undefined' ? localStorage.getItem('truco-player-name') : null;
      if (saved) setName(saved);
      // Auto-focus input on mobile so native keyboard opens cleanly
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, initialCode]);

  if (!open) return null;

  const handlePasteCode = async () => {
    soundButton();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // If it's a URL like https://...?room=TRU74, extract param
        const match = text.match(/[?&]room=([A-Z0-9]+)/i);
        if (match && match[1]) {
          setCode(match[1].toUpperCase());
        } else {
          setCode(text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
        }
      }
    } catch {
      // Fallback: prompt
      const manual = prompt('Pegá acá el código o link de la sala:');
      if (manual) {
        const match = manual.match(/[?&]room=([A-Z0-9]+)/i);
        setCode(match ? match[1].toUpperCase() : manual.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanName = name.trim() || 'Jugador';
    if (cleanCode.length >= 3) {
      soundButton();
      if (typeof window !== 'undefined') {
        localStorage.setItem('truco-player-name', cleanName);
      }
      onJoin(cleanCode, cleanName);
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
          Ingresá el código de sala con el teclado de tu celu para sentarte a la mesa.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Nickname Input */}
          <div className="join-name-row">
            <label htmlFor="joinPlayerName">Tu Apodo:</label>
            <input
              id="joinPlayerName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={16}
              placeholder="Escribí tu apodo"
            />
          </div>

          {/* Native Room Code Input with Paste button */}
          <div className="join-code-input-container">
            <label htmlFor="joinRoomCode">Código de la Sala:</label>
            <div className="join-code-field-wrap">
              <input
                ref={inputRef}
                id="joinRoomCode"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Ej: TRU74"
                maxLength={8}
                className="input-native-room-code"
              />
              <button
                type="button"
                className="btn-paste-code"
                onClick={handlePasteCode}
                title="Pegar código del portapapeles"
              >
                📋 Pegar
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-action full-width"
            disabled={code.trim().length < 3}
            style={{ marginTop: '12px' }}
          >
            Entrar a la Mesa 🃏
          </button>
        </form>
      </div>
    </div>
  );
}
