// ─── Truco Criollo – Type Definitions ───────────────────────────

export type Suit = 'espada' | 'basto' | 'oro' | 'copa';

export interface Card {
  id: string;       // e.g. "1-espada"
  num: number;      // 1–7, 10–12
  suit: Suit;
  power: number;    // 1–14 for trick comparison (higher wins)
  envidoVal: number; // 0–7 for envido calculation
  label: string;    // Human-readable name
}

export type MatchType = '1v1' | '2v2' | '3v3';

export type TeamId = 0 | 1; // 0 = Nosotros (Equipo A), 1 = Ellos (Equipo B)

export interface TablePlayer {
  id: string;
  name: string;
  team: TeamId;
  seatIndex: number;
  isBot: boolean;
  avatar: string;
}

export type PlayerId = 'player' | 'opponent';

export type TrucoLevel = 'none' | 'truco' | 'retruco' | 'vale4';

export type EnvidoType = 'envido' | 'real_envido' | 'falta_envido';

export type CallType =
  | EnvidoType
  | 'truco' | 'retruco' | 'vale4'
  | 'quiero' | 'no_quiero'
  | 'mazo' | 'flor';

export interface TrickCard {
  player: PlayerId;
  card: Card;
  seatIndex?: number;
  team?: TeamId;
}

export type TrickWinner = PlayerId | 'tie';

export interface Trick {
  cards: TrickCard[];
  winner: TrickWinner | null;
}

export type GamePhase =
  | 'idle'
  | 'dealing'
  | 'player_turn'
  | 'opponent_turn'
  | 'player_envido_response'
  | 'player_truco_response'
  | 'opponent_envido_response'
  | 'opponent_truco_response'
  | 'trick_result'
  | 'round_over'
  | 'match_over';

export interface RoundState {
  playerHand: Card[];
  opponentHand: Card[];
  tricks: Trick[];
  currentTrick: number;
  mano: PlayerId;
  trucoLevel: TrucoLevel;
  trucoCaller: PlayerId | null;
  envidoPlayed: boolean;
  firstCardPlayed: boolean;
}

export interface GameState {
  phase: GamePhase;
  scorePlayer: number;
  scoreOpponent: number;
  goal: 15 | 30;
  round: RoundState | null;
  roundNumber: number;
  message: string;
  messageFrom: PlayerId | null;
  withFlor: boolean;
  mode: 'bot' | 'local' | 'online';
  playerName: string;
  opponentName: string;
  lastEnvidoPlayer: number;
  lastEnvidoOpp: number;
}

export type GameAction =
  | { type: 'START_GAME'; config: RoomConfig }
  | { type: 'DEAL' }
  | { type: 'PLAY_CARD'; cardIndex: number }
  | { type: 'OPPONENT_PLAY_CARD'; cardIndex: number }
  | { type: 'CALL_ENVIDO'; envido: EnvidoType; caller: PlayerId }
  | { type: 'CALL_TRUCO'; level: TrucoLevel; caller: PlayerId }
  | { type: 'RESPOND_QUIERO'; responder: PlayerId; toCall: 'envido' | 'truco' }
  | { type: 'RESPOND_NO_QUIERO'; responder: PlayerId; toCall: 'envido' | 'truco' }
  | { type: 'GO_MAZO'; player: PlayerId }
  | { type: 'RESOLVE_TRICK' }
  | { type: 'NEXT_TRICK' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SET_MESSAGE'; text: string; from: PlayerId | null }
  | { type: 'CLEAR_MESSAGE' }
  | { type: 'BACK_TO_MENU' };

export interface RoomSeat {
  seatIndex: number;
  peerId: string;
  name: string;
  team: 0 | 1;
  avatar: string;
  isHost: boolean;
  isConnected: boolean;
  isBot?: boolean;
}

export interface RoomConfig {
  goal: 15 | 30;
  withFlor: boolean;
  mode: 'bot' | 'local' | 'online';
  playerName: string;
  opponentName: string;
  matchType?: MatchType;
  mySeatIndex?: number;
  seats?: RoomSeat[];
}

export function otherPlayer(p: PlayerId): PlayerId {
  return p === 'player' ? 'opponent' : 'player';
}
