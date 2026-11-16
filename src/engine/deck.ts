// ─── Spanish Deck (40 cards) with Argentine Truco hierarchy ─────
import type { Card, Suit } from './types';

// Power rankings (higher = better):
// 14: 1♠ Ancho de Espada
// 13: 1♣ Ancho de Basto
// 12: 7♠ Siete de Espada
// 11: 7♦ Siete de Oro
// 10: 3  (all suits)
//  9: 2  (all suits)
//  8: 1♥ 1♦ Anchos falsos
//  7: 12 Reyes (all suits)
//  6: 11 Caballos (all suits)
//  5: 10 Sotas (all suits)
//  4: 7♥ 7♣ Sietes falsos
//  3: 6  (all suits)
//  2: 5  (all suits)
//  1: 4  (all suits)

function power(num: number, suit: Suit): number {
  if (num === 1 && suit === 'espada') return 14;
  if (num === 1 && suit === 'basto')  return 13;
  if (num === 7 && suit === 'espada') return 12;
  if (num === 7 && suit === 'oro')    return 11;
  if (num === 3) return 10;
  if (num === 2) return 9;
  if (num === 1) return 8; // copa / oro
  if (num === 12) return 7;
  if (num === 11) return 6;
  if (num === 10) return 5;
  if (num === 7) return 4; // copa / basto
  if (num === 6) return 3;
  if (num === 5) return 2;
  if (num === 4) return 1;
  return 0;
}

function envidoValue(num: number): number {
  return num <= 7 ? num : 0;
}

const SUIT_NAMES: Record<Suit, string> = {
  espada: 'Espada',
  basto: 'Basto',
  oro: 'Oro',
  copa: 'Copa',
};

const NUM_NAMES: Record<number, string> = {
  1: 'Ancho', 2: 'Dos', 3: 'Tres', 4: 'Cuatro',
  5: 'Cinco', 6: 'Seis', 7: 'Siete',
  10: 'Sota', 11: 'Caballo', 12: 'Rey',
};

function makeCard(num: number, suit: Suit): Card {
  const p = power(num, suit);
  let label = `${NUM_NAMES[num]} de ${SUIT_NAMES[suit]}`;
  if (num === 1 && suit === 'espada') label = 'Ancho de Espada (El Macho)';
  else if (num === 1 && suit === 'basto') label = 'Ancho de Basto (La Hembra)';
  else if (num === 7 && suit === 'espada') label = 'Siete de Espada (Manilla)';
  else if (num === 7 && suit === 'oro') label = 'Siete de Oro (Manilla)';

  return {
    id: `${num}-${suit}`,
    num,
    suit,
    power: p,
    envidoVal: envidoValue(num),
    label,
  };
}

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const SUITS: Suit[] = ['espada', 'basto', 'oro', 'copa'];

/** Full 40-card Spanish deck */
export const FULL_DECK: Card[] = SUITS.flatMap(suit =>
  NUMBERS.map(num => makeCard(num, suit))
);

/** Fisher-Yates shuffle (returns new array) */
export function shuffle(deck: Card[]): Card[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal n cards from a shuffled deck */
export function deal(shuffled: Card[], count: number, offset = 0): Card[] {
  return shuffled.slice(offset, offset + count);
}

/** Deal two hands of 3 from a fresh shuffle */
export function dealHands(): { playerHand: Card[]; opponentHand: Card[] } {
  const s = shuffle(FULL_DECK);
  return {
    playerHand: deal(s, 3, 0),
    opponentHand: deal(s, 3, 3),
  };
}
