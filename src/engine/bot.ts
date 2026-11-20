// ─── Truco Bot AI ("Don Florencio") ─────────────────────────────
import type { Card, RoundState, TrucoLevel, PlayerId } from './types';
import { calculateEnvido, canCallEnvido } from './rules';

// ─── Card selection ─────────────────────────────────────────────

/**
 * Choose which card to play. Strategy:
 * - Trick 1: Play a medium card (save best for later)
 * - Trick 2: If we won trick 1, play weakest. If lost, play strongest.
 * - Trick 3: Play remaining card.
 */
export function botChooseCard(
  hand: Card[],
  round: RoundState,
): number {
  if (hand.length === 1) return 0;

  const sorted = hand
    .map((card, idx) => ({ card, idx }))
    .sort((a, b) => a.card.power - b.card.power);

  const trickIdx = round.currentTrick;
  const currentTrick = round.tricks[trickIdx];
  const playerPlayedCard = currentTrick?.cards.find(c => c.player === 'player');

  if (trickIdx === 0) {
    // First trick: play middle card if possible
    if (hand.length === 3) return sorted[1].idx;
    return sorted[0].idx;
  }

  if (trickIdx === 1) {
    // Second trick
    const prevWinner = round.tricks[0]?.winner;
    if (prevWinner === 'opponent') {
      // We won trick 1 -> play weakest to save best for trick 3
      return sorted[0].idx;
    }
    if (prevWinner === 'player') {
      // We lost trick 1 -> try to win this one
      if (playerPlayedCard) {
        // Try to beat the player's card with minimum waste
        const beater = sorted.find(s => s.card.power > playerPlayedCard.card.power);
        return beater ? beater.idx : sorted[0].idx; // If can't beat, throw weakest
      }
      return sorted[sorted.length - 1].idx; // Lead with strongest
    }
    // Tie in trick 1 -> play strongest
    return sorted[sorted.length - 1].idx;
  }

  // Trick 3: play remaining card
  if (playerPlayedCard) {
    // Try to beat
    const beater = sorted.find(s => s.card.power > playerPlayedCard.card.power);
    return beater ? beater.idx : sorted[sorted.length - 1].idx;
  }
  return sorted[sorted.length - 1].idx;
}

/**
 * Decisiones tácticas de naipes para compañeros y rivales en 2v2 y 3v3 (Truco Argentino criollo).
 * Sigue el patrón estratégico clásico:
 * 1. Si tu compañero ya va ganando la baza (su carta es la más alta en mesa): no quemar carta buena, achicar con la más baja.
 * 2. Si el rival va ganando la baza: matar con la menor carta posible que lo supere ("matar justo"). Si no se puede, achicar con la más baja.
 * 3. Si sale primero (líder de la baza):
 *    - 1ª mano: tantear con intermedia o buscar primera.
 *    - 2ª mano habiendo ganado 1ª: achicar para reservar la mejor para 3ª.
 *    - 2ª mano habiendo perdido 1ª o parda: tirar la más fuerte.
 *    - 3ª mano: tirar la mejor restante.
 */
export function chooseMultiBotCard(
  botHand: Card[],
  botSeat: number,
  botTeam: 0 | 1,
  trickIdx: number,
  currentPlays: { seatIndex: number; team: 0 | 1; card: Card; playerName: string }[],
  multiTrickWinners: (0 | 1 | 'tie')[]
): number {
  if (botHand.length <= 1) return 0;

  // Indexar y ordenar de menor a mayor poder
  const indexed = botHand.map((c, i) => ({ card: c, index: i }));
  indexed.sort((a, b) => a.card.power - b.card.power);

  // Caso A: El bot abre la baza (nadie tiró todavía)
  if (currentPlays.length === 0) {
    if (trickIdx === 0) {
      // 1ª Mano: con 3 cartas, tantear con la del medio para guardar la mayor
      if (indexed.length === 3) return indexed[1].index;
      return indexed[0].index;
    }
    if (trickIdx === 1) {
      // 2ª Mano:
      const wonTrick1 = multiTrickWinners[0] === botTeam;
      if (wonTrick1) {
        // Si ganamos la 1ª mano, guardamos la mejor y salimos con la más baja
        return indexed[0].index;
      }
      // Si perdimos la 1ª o fue parda, es a matar o morir: salir con la más alta
      return indexed[indexed.length - 1].index;
    }
    // 3ª Mano: salir con la mejor carta restante
    return indexed[indexed.length - 1].index;
  }

  // Caso B: Ya hay cartas jugadas en la mesa
  let highestPower = -1;
  let highestPlay: { seatIndex: number; team: 0 | 1; card: Card } | null = null;
  for (const p of currentPlays) {
    if (p.card.power > highestPower) {
      highestPower = p.card.power;
      highestPlay = p;
    }
  }

  // ¿Un compañero del bot ya tiene la carta más alta en la mesa?
  const isTeammateWinning = highestPlay !== null && (highestPlay as { team: 0 | 1 }).team === botTeam;

  if (isTeammateWinning) {
    // Compañero va ganando: achicamos con la más baja de la mano
    return indexed[0].index;
  }

  // El rival va ganando:
  // Buscamos la carta más baja que supere a la del rival
  const winningPlay = indexed.find(item => item.card.power > highestPower);
  if (winningPlay) {
    // Matar justo con la menor carta posible
    return winningPlay.index;
  }

  // No podemos superar al rival: achicar con la más baja sin quemar intermedias
  return indexed[0].index;
}

// ─── Envido decisions ───────────────────────────────────────────

/** Should the bot call envido? */
export function botShouldCallEnvido(
  hand: Card[],
  round: RoundState,
  myScore: number,
  oppScore: number,
): boolean {
  if (!canCallEnvido(round, hand)) return false;
  const envido = calculateEnvido(hand);
  // Call envido if we have decent points (27+)
  // Lower threshold when behind in score
  const threshold = myScore < oppScore ? 25 : 27;
  return envido >= threshold && Math.random() > 0.3;
}

/** Respond to envido call */
export function botRespondEnvido(
  hand: Card[],
  envidoType: string,
  myScore: number,
  oppScore: number,
  goal: number,
): 'quiero' | 'no_quiero' {
  const envido = calculateEnvido(hand);

  if (envidoType === 'falta_envido') {
    // Only accept falta envido with very strong hand
    return envido >= 31 ? 'quiero' : 'no_quiero';
  }

  if (envidoType === 'real_envido') {
    return envido >= 27 ? 'quiero' : 'no_quiero';
  }

  // Regular envido
  // Accept more liberally when behind
  const threshold = myScore < oppScore ? 24 : 26;
  return envido >= threshold ? 'quiero' : 'no_quiero';
}

// ─── Truco decisions ────────────────────────────────────────────

/** Evaluate hand strength (0-100) */
function handStrength(hand: Card[]): number {
  const totalPower = hand.reduce((sum, c) => sum + c.power, 0);
  const maxPossible = 14 + 13 + 12; // Best possible hand
  return (totalPower / maxPossible) * 100;
}

/** Should the bot call truco? */
export function botShouldCallTruco(
  hand: Card[],
  round: RoundState,
  myScore: number,
  oppScore: number,
): boolean {
  if (round.trucoLevel !== 'none') return false; // Already in truco
  const strength = handStrength(hand);

  // Strong hand -> call truco
  if (strength > 60) return Math.random() > 0.2;
  // Medium hand -> sometimes bluff
  if (strength > 40 && myScore < oppScore) return Math.random() > 0.6;
  // Weak hand -> rare bluff
  if (strength > 30) return Math.random() > 0.85;

  return false;
}

/** Respond to truco call */
export function botRespondTruco(
  hand: Card[],
  level: TrucoLevel,
  round: RoundState,
  myScore: number,
  oppScore: number,
): 'quiero' | 'no_quiero' | 'retruco' | 'vale4' {
  const strength = handStrength(hand);

  // Very strong hand -> escalate
  if (strength > 70) {
    if (level === 'truco' && Math.random() > 0.4) return 'retruco';
    if (level === 'retruco' && Math.random() > 0.5) return 'vale4';
    return 'quiero';
  }

  if (level === 'vale4') {
    return strength > 50 ? 'quiero' : 'no_quiero';
  }

  if (level === 'retruco') {
    return strength > 45 ? 'quiero' : 'no_quiero';
  }

  // Truco
  if (strength > 35) return 'quiero';
  // When behind, be more aggressive
  if (myScore < oppScore && strength > 25) return 'quiero';

  return 'no_quiero';
}

// ─── Bot phrases ────────────────────────────────────────────────

const ENVIDO_CALLS = [
  '¡Envido!', 'Envido, si te animás...', '¿Envido? ¡Dale!',
  'Envido, m\'hijo', 'Te canto el envido',
];

const TRUCO_CALLS = [
  '¡¡TRUCO!!', '¡Truco, paisano!', '¡TRUCO carajo!',
  'Trucazo te canto', '¡Truco o te vas pal\' rancho!',
];

const QUIERO_PHRASES = [
  '¡Quiero!', '¡Quiero, jugá callao!', 'Dale, quiero',
  'Quiero... y preparate', '¡Quieroooo!',
];

const NO_QUIERO_PHRASES = [
  'No quiero...', 'Me achico', 'No quiero, por ahora',
  'Esta la dejo pasar', 'No va...',
];

const WIN_PHRASES = [
  '¡Tomá mate!', 'Eso es tener calle', '¡Pa\' que aprendas!',
  '¿Sale otro partidito?', 'La mesa es mía',
];

const LOSE_PHRASES = [
  'Bien jugada esa...', 'Tuviste suerte, eh', 'La próxima no te salvas',
  'Esa me dolió', 'Ya va a ser mi turno',
];

const RETRUCO_PHRASES = [
  '¡¡RETRUCO!!', '¡RE-TRU-CO!', 'Ah sí? Retruco pá',
];

const VALE4_PHRASES = [
  '¡¡VALE CUATRO!!', 'Vale 4, a todo o nada', '¡VALE CUATRO carajo!',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function botPhrase(
  action: 'envido' | 'truco' | 'retruco' | 'vale4' | 'quiero' | 'no_quiero' | 'win_round' | 'lose_round',
): string {
  switch (action) {
    case 'envido':    return pick(ENVIDO_CALLS);
    case 'truco':     return pick(TRUCO_CALLS);
    case 'retruco':   return pick(RETRUCO_PHRASES);
    case 'vale4':     return pick(VALE4_PHRASES);
    case 'quiero':    return pick(QUIERO_PHRASES);
    case 'no_quiero': return pick(NO_QUIERO_PHRASES);
    case 'win_round': return pick(WIN_PHRASES);
    case 'lose_round':return pick(LOSE_PHRASES);
  }
}
