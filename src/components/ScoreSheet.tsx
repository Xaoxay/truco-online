// ─── Matchstick Score Sheet (Anotador de Fósforos) ──────────────
import React from 'react';

interface ScoreSheetProps {
  scorePlayer: number;
  scoreOpponent: number;
  goal: 15 | 30;
  playerName: string;
  opponentName: string;
  open: boolean;
  onClose: () => void;
}

export function MatchstickGroup({ count }: { count: number }) {
  const lines: [number, number, number, number][] = [
    [12, 10, 44, 10],
    [48, 12, 48, 44],
    [44, 48, 12, 48],
    [8, 44, 8, 12],
    [7, 50, 49, 7],
  ];

  const fullGroups = Math.floor(count / 5);
  const remainder = count % 5;
  const groups: number[] = [];
  for (let i = 0; i < fullGroups; i++) groups.push(5);
  if (remainder > 0) groups.push(remainder);
  if (groups.length === 0) groups.push(0);

  return (
    <div className="stick-groups">
      {groups.map((n, gi) => (
        <svg key={gi} viewBox="0 0 58 58" className="stick-svg">
          {lines.map(([x1, y1, x2, y2], i) => (
            <g key={i} className={i < n ? 'lit' : 'unlit'}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              <circle cx={x2} cy={y2} r="2.4" />
            </g>
          ))}
        </svg>
      ))}
    </div>
  );
}

export function PhaseDisplay({
  label,
  score,
  max,
  active,
}: {
  label: string;
  score: number;
  max: number;
  active: boolean;
}) {
  return (
    <div className={`score-phase ${active ? 'active' : ''}`}>
      <h4>
        {label} <span>{score}/{max}</span>
      </h4>
      <MatchstickGroup count={score} />
    </div>
  );
}

export default function ScoreSheet({
  scorePlayer,
  scoreOpponent,
  goal,
  playerName,
  opponentName,
  open,
  onClose,
}: ScoreSheetProps) {
  if (!open) return null;

  const is30 = goal === 30;

  return (
    <div className="score-modal-overlay" onClick={onClose}>
      <div className="score-modal" onClick={e => e.stopPropagation()}>
        <div className="score-modal-header">
          <h3>Anotador Gaucho</h3>
          <button className="btn-close-sheet" onClick={onClose}>✕</button>
        </div>

        <div className="score-columns-sheet">
          {/* Player column */}
          <div className="score-col">
            <div className="score-col-title">{playerName}</div>
            <div className="score-col-total">{scorePlayer}</div>
            <PhaseDisplay
              label={is30 ? 'Malas' : 'Tantos'}
              score={Math.min(scorePlayer, 15)}
              max={15}
              active={true}
            />
            {is30 && (
              <PhaseDisplay
                label="Buenas"
                score={Math.max(0, scorePlayer - 15)}
                max={15}
                active={scorePlayer >= 15}
              />
            )}
          </div>

          {/* Divider */}
          <div className="score-divider-v" />

          {/* Opponent column */}
          <div className="score-col">
            <div className="score-col-title">{opponentName}</div>
            <div className="score-col-total">{scoreOpponent}</div>
            <PhaseDisplay
              label={is30 ? 'Malas' : 'Tantos'}
              score={Math.min(scoreOpponent, 15)}
              max={15}
              active={true}
            />
            {is30 && (
              <PhaseDisplay
                label="Buenas"
                score={Math.max(0, scoreOpponent - 15)}
                max={15}
                active={scoreOpponent >= 15}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
