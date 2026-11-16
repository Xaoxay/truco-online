// ─── Truco Criollo – Game Rules ─────────────────────────────────
import type { Card, Trick, TrickWinner, PlayerId, RoundState, TrucoLevel } from './types';

// ─── Trick evaluation ───────────────────────────────────────────

/** Compare two cards. Returns the winner or 'tie'. */
export function compareTrickCards(
  playerCard: Card,
  opponentCard: Card,
): TrickWinner {
  if (playerCard.power > opponentCard.power) return 'player';
  if (opponentCard.power > playerCard.power) return 'opponent';
  return 'tie';
}

/** Evaluate who won a single trick given the two cards played. */
export function evaluateTrick(trick: Trick): TrickWinner {
  if (trick.cards.length < 2) return null as unknown as TrickWinner;
  const pCard = trick.cards.find(c => c.player === 'player')!.card;
  const oCard = trick.cards.find(c => c.player === 'opponent')!.card;
  return compareTrickCards(pCard, oCard);
}

// ─── Round winner (best of 3 tricks with parda rules) ───────────

/**
 * Argentine Truco parda (tie) rules:
 * - If trick 1 is a tie:
 *   - Whoever wins trick 2 wins the round
 *   - If trick 2 also ties, whoever wins trick 3 wins
 *   - If all 3 tie, the "mano" (dealer's opponent) wins
 * - If trick 1 has a winner:
 *   - That player needs trick 2 OR trick 3 to win
 *   - The other player needs BOTH trick 2 AND trick 3
 *   - If trick 2 ties, trick 1 winner wins
 */
export function checkRoundWinner(
  tricks: Trick[],
  mano: PlayerId,
): PlayerId | null {
  const results = tricks.map(t => t.winner).filter(w => w !== null);
  if (results.length === 0) return null;

  const [r1, r2, r3] = results;
  const pWins = results.filter(r => r === 'player').length;
  const oWins = results.filter(r => r === 'opponent').length;

  // Someone won 2 tricks -> they win
  if (pWins >= 2) return 'player';
  if (oWins >= 2) return 'opponent';

  // Only check after at least 2 tricks are resolved
  if (results.length < 2) return null;

  // Trick 1 was a tie
  if (r1 === 'tie') {
    if (r2 === 'player') return 'player';
    if (r2 === 'opponent') return 'opponent';
    // r2 is also tie
    if (results.length >= 3) {
      if (r3 === 'player') return 'player';
      if (r3 === 'opponent') return 'opponent';
      return mano; // All 3 ties -> mano wins
    }
    return null; // Need trick 3
  }

  // Trick 1 had a winner
  if (results.length >= 2) {
    // Trick 2 is a tie -> trick 1 winner wins
    if (r2 === 'tie') return r1 as PlayerId;
    // If trick 2 winner differs from trick 1 winner, need trick 3
    if (r1 !== r2 && results.length < 3) return null;
    // Trick 3 is a tie -> trick 1 winner wins
    if (results.length >= 3 && r3 === 'tie') return r1 as PlayerId;
  }

  if (results.length >= 3) {
    // After 3 tricks, whoever won more tricks wins; ties go to mano
    if (pWins > oWins) return 'player';
    if (oWins > pWins) return 'opponent';
    return mano;
  }

  return null;
}

// ─── Envido calculation ─────────────────────────────────────────

/**
 * Calculate envido points for a hand of 3 cards.
 *
 * Rules:
 * - Cards 1-7 = their number for envido
 * - Cards 10, 11, 12 = 0 for envido
 * - Two or three cards of same suit: 20 + sum of two highest envido values
 * - No pair of same suit: highest single card envido value
 * - Maximum possible: 33 (7 + 6 of same suit = 20 + 7 + 6)
 */
export function calculateEnvido(hand: Card[]): number {
  const bySuit: Record<string, number[]> = {};
  for (const card of hand) {
    if (!bySuit[card.suit]) bySuit[card.suit] = [];
    bySuit[card.suit].push(card.envidoVal);
  }

  let maxEnvido = 0;

  for (const suit in bySuit) {
    const vals = bySuit[suit].sort((a, b) => b - a);
    if (vals.length >= 2) {
      const envido = 20 + vals[0] + vals[1];
      maxEnvido = Math.max(maxEnvido, envido);
    } else {
      maxEnvido = Math.max(maxEnvido, vals[0]);
    }
  }

  return maxEnvido;
}

/** Check if hand has flor (3 cards of same suit) */
export function hasFlor(hand: Card[]): boolean {
  return hand[0].suit === hand[1].suit && hand[1].suit === hand[2].suit;
}

// ─── Scoring tables ─────────────────────────────────────────────

/** Points awarded for envido when accepted (quiero) */
export function envidoQuieroPoints(envidoType: string): number {
  switch (envidoType) {
    case 'envido':       return 2;
    case 'real_envido':  return 3;
    case 'falta_envido': return 0; // Special: points needed to win
    default: return 2;
  }
}

/** Points awarded for envido when rejected (no quiero) */
export function envidoNoQuieroPoints(envidoType: string): number {
  switch (envidoType) {
    case 'envido':       return 1;
    case 'real_envido':  return 1;
    case 'falta_envido': return 1;
    default: return 1;
  }
}

/** Points the round is worth based on truco level (when someone wins tricks) */
export function trucoWinPoints(level: TrucoLevel): number {
  switch (level) {
    case 'none':    return 1;
    case 'truco':   return 2;
    case 'retruco': return 3;
    case 'vale4':   return 4;
  }
}

/** Points for truco when rejected (no quiero) */
export function trucoNoQuieroPoints(level: TrucoLevel): number {
  switch (level) {
    case 'none':    return 1;
    case 'truco':   return 1;
    case 'retruco': return 2;
    case 'vale4':   return 3;
  }
}

/** Falta envido: points needed by the LOSER to reach goal */
export function faltaEnvidoPoints(
  winnerScore: number,
  loserScore: number,
  goal: number,
): number {
  // In "malas" (first 15), falta envido is worth 15
  // In "buenas" (above 15), falta envido is what the loser needs to win
  if (goal === 15) {
    return goal - loserScore;
  }
  // A 30: if the loser is in malas (< 15), falta = 15
  // If the loser is in buenas (>= 15), falta = goal - loserScore
  if (loserScore < 15) return 15;
  return goal - loserScore;
}

/** Can envido still be called in this round? */
export function canCallEnvido(round: RoundState): boolean {
  return !round.envidoPlayed && !round.firstCardPlayed && round.currentTrick === 0;
}

/** Can truco be called / escalated? */
export function canCallTruco(round: RoundState, caller: PlayerId): boolean {
  // Can't call if already at vale4
  if (round.trucoLevel === 'vale4') return false;
  // Can't re-escalate your own truco
  if (round.trucoCaller === caller && round.trucoLevel !== 'none') return false;
  return true;
}

/** Get next truco escalation level */
export function nextTrucoLevel(current: TrucoLevel): TrucoLevel | null {
  switch (current) {
    case 'none':    return 'truco';
    case 'truco':   return 'retruco';
    case 'retruco': return 'vale4';
    case 'vale4':   return null;
  }
}

/** Who goes first in a trick? */
export function whoGoesFirst(
  trickIndex: number,
  mano: PlayerId,
  tricks: Trick[],
): PlayerId {
  if (trickIndex === 0) return mano;
  const prevTrick = tricks[trickIndex - 1];
  if (!prevTrick || !prevTrick.winner || prevTrick.winner === 'tie') return mano;
  return prevTrick.winner;
}
