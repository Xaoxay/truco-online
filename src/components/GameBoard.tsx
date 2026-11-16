import React, { useState, useEffect } from 'react';
import type { Card as CardType, PlayerId, TrucoLevel, EnvidoType, RoomConfig } from '../engine/types';
import { CardFace, CardBack } from './Card';
import ScoreSheet, { PhaseDisplay } from './ScoreSheet';
import {
  soundCardPlay,
  soundCall,
  soundTruco,
  soundWinRound,
  soundLoseRound,
  soundMatchWin,
  soundButton,
} from '../engine/audio';
import { dealHands } from '../engine/deck';
import {
  compareTrickCards,
  calculateEnvido,
  hasFlor,
  checkRoundWinner,
  canCallEnvido,
  canCallTruco,
  nextTrucoLevel,
  whoGoesFirst,
  envidoQuieroPoints,
  envidoNoQuieroPoints,
  trucoWinPoints,
  trucoNoQuieroPoints,
  faltaEnvidoPoints,
} from '../engine/rules';
import {
  botChooseCard,
  botShouldCallEnvido,
  botRespondEnvido,
  botShouldCallTruco,
  botRespondTruco,
  botPhrase,
} from '../engine/bot';
import type { TrucoNetwork } from '../engine/network';

interface GameBoardProps {
  config: RoomConfig;
  network?: TrucoNetwork | null;
  onExit: () => void;
  isDesktop?: boolean;
  onToggleLayout?: () => void;
}

interface PlayedSlot {
  playerCard: CardType | null;
  oppCard: CardType | null;
  winner: PlayerId | 'tie' | null;
}

export default function GameBoard({ config, network, onExit, isDesktop = false, onToggleLayout }: GameBoardProps) {
  // Score state
  const [scorePlayer, setScorePlayer] = useState(0);
  const [scoreOpp, setScoreOpp] = useState(0);
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);

  // Round / Hand state
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [oppHandCards, setOppHandCards] = useState<CardType[]>([]);
  const [oppCardsCount, setOppCardsCount] = useState(3);
  const [currentTrick, setCurrentTrick] = useState(0);
  const [tricks, setTricks] = useState<PlayedSlot[]>([
    { playerCard: null, oppCard: null, winner: null },
    { playerCard: null, oppCard: null, winner: null },
    { playerCard: null, oppCard: null, winner: null },
  ]);

  // Turn & phase
  const [mano, setMano] = useState<PlayerId>('player');
  const [turn, setTurn] = useState<PlayerId>('player');
  const [pendingCall, setPendingCall] = useState<{
    type: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4' | 'flor';
    caller: PlayerId;
  } | null>(null);

  const [trucoLevel, setTrucoLevel] = useState<TrucoLevel>('none');
  const [trucoCaller, setTrucoCaller] = useState<PlayerId | null>(null);
  const [envidoPlayed, setEnvidoPlayed] = useState(false);
  const [firstCardPlayed, setFirstCardPlayed] = useState(false);

  // UI speech & alerts
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<PlayerId | null>(null);

  // Keyboard Shortcuts for PC Desktop Play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // [1], [2], [3] play cards
      if (key === '1' && playerHand.length >= 1 && turn === 'player' && !pendingCall) {
        handlePlayCard(0);
      } else if (key === '2' && playerHand.length >= 2 && turn === 'player' && !pendingCall) {
        handlePlayCard(1);
      } else if (key === '3' && playerHand.length >= 3 && turn === 'player' && !pendingCall) {
        handlePlayCard(2);
      }
      // [E] Envido
      else if (key === 'e' && !envidoPlayed && !firstCardPlayed && currentTrick === 0 && !pendingCall) {
        handlePlayerCall('envido');
      }
      // [T] Truco / Retruco / Vale 4
      else if (key === 't') {
        if (pendingCall && pendingCall.caller === 'opponent' && pendingCall.type === 'truco') {
          handlePlayerCall('retruco');
        } else if (pendingCall && pendingCall.caller === 'opponent' && pendingCall.type === 'retruco') {
          handlePlayerCall('vale4');
        } else if (!pendingCall) {
          if (trucoLevel === 'none') handlePlayerCall('truco');
          else if (trucoLevel === 'truco' && trucoCaller === 'opponent') handlePlayerCall('retruco');
          else if (trucoLevel === 'retruco' && trucoCaller === 'opponent') handlePlayerCall('vale4');
        }
      }
      // [Q] Quiero
      else if (key === 'q' && pendingCall && pendingCall.caller === 'opponent') {
        handleCallResponse('player', 'quiero', pendingCall.type);
      }
      // [N] No Quiero
      else if (key === 'n' && pendingCall && pendingCall.caller === 'opponent') {
        handleCallResponse('player', 'no_quiero', pendingCall.type);
      }
      // [M] Mazo
      else if (key === 'm') {
        handleMazo();
      }
      // [S] ScoreSheet
      else if (key === 's') {
        setScoreSheetOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerHand, turn, pendingCall, currentTrick, envidoPlayed, firstCardPlayed, trucoLevel, trucoCaller]);

  // Pass & Play curtain state (for local 2-player on same device)
  const isPassAndPlay = config.mode === 'local';
  const [passPlayCurtain, setPassPlayCurtain] = useState(false);
  const [passPlayFor, setPassPlayFor] = useState<PlayerId>('player');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const showSpeech = (text: string) => {
    setSpeechText(text);
    setTimeout(() => setSpeechText(null), 2800);
  };

  // ─── Start a new round ──────────────────────────────────────────
  const startNewRound = (nextMano: PlayerId) => {
    const { playerHand: pHand, opponentHand: oHand } = dealHands();
    setMano(nextMano);
    setTurn(nextMano);
    setCurrentTrick(0);
    setTricks([
      { playerCard: null, oppCard: null, winner: null },
      { playerCard: null, oppCard: null, winner: null },
      { playerCard: null, oppCard: null, winner: null },
    ]);
    setPendingCall(null);
    setTrucoLevel('none');
    setTrucoCaller(null);
    setEnvidoPlayed(false);
    setFirstCardPlayed(false);

    if (config.mode === 'online' && network && network.isHost) {
      // Host deals and sends guest's hand
      setPlayerHand(pHand);
      setOppCardsCount(3);
      setOppHandCards(oHand);
      network.sendMessage({
        type: 'START_ROUND',
        hand: oHand,
        oppHandCount: 3,
        mano: nextMano === 'player' ? 'opponent' : 'player', // from guest perspective
        roundNum: 1,
      });
    } else if (config.mode !== 'online') {
      setPlayerHand(pHand);
      setOppHandCards(oHand);
      setOppCardsCount(3);
    }

    if (isPassAndPlay) {
      setPassPlayFor(nextMano);
      setPassPlayCurtain(true);
    } else {
      soundWinRound();
      showToast('¡Nueva mano repartida!');
    }
  };

  // Initialize first round on mount
  useEffect(() => {
    if (config.mode === 'online' && network && !network.isHost) {
      // Guest waits for START_ROUND from host
      return;
    }
    startNewRound('player');
  }, []);

  // ─── Network Message Listener ──────────────────────────────────
  useEffect(() => {
    if (config.mode !== 'online' || !network) return;

    // Listen for incoming messages from peer
    const handleNetMsg = (msg: any) => {
      if (msg.type === 'START_ROUND') {
        setPlayerHand(msg.hand);
        setOppCardsCount(msg.oppHandCount);
        setMano(msg.mano);
        setTurn(msg.mano);
        setCurrentTrick(0);
        setTricks([
          { playerCard: null, oppCard: null, winner: null },
          { playerCard: null, oppCard: null, winner: null },
          { playerCard: null, oppCard: null, winner: null },
        ]);
        setPendingCall(null);
        setTrucoLevel('none');
        setTrucoCaller(null);
        setEnvidoPlayed(false);
        setFirstCardPlayed(false);
        soundWinRound();
        showToast('¡Nueva mano repartida por el anfitrión!');
      } else if (msg.type === 'PLAY_CARD') {
        soundCardPlay();
        setOppCardsCount(prev => Math.max(0, prev - 1));
        applyOpponentCard(msg.card, msg.trickIndex);
      } else if (msg.type === 'CALL') {
        soundTruco();
        setPendingCall({ type: msg.call, caller: 'opponent' });
        showSpeech(`¡${msg.call.toUpperCase().replace('_', ' ')}!`);
      } else if (msg.type === 'RESPONSE') {
        handleCallResponse('opponent', msg.resp, msg.toCall);
      } else if (msg.type === 'GO_MAZO') {
        showToast(`${config.opponentName} se fue al mazo`);
        awardTrucoTo('player');
      } else if (msg.type === 'SENA') {
        showToast(`${config.opponentName} hizo seña: ${msg.sena}`);
      } else if (msg.type === 'CHAT') {
        showSpeech(msg.text);
      } else if (msg.type === 'REVANCHE') {
        setScorePlayer(0);
        setScoreOpp(0);
        setMatchWinner(null);
        startNewRound('player');
      }
    };

    (network as any).callbacks.onMessage = handleNetMsg;
  }, [config.mode, network]);

  // ─── Playing a card ─────────────────────────────────────────────
  const handlePlayCard = (index: number) => {
    if (turn !== 'player' || pendingCall !== null || currentTrick >= 3) return;

    soundCardPlay();
    const card = playerHand[index];
    const newHand = playerHand.filter((_, i) => i !== index);
    setPlayerHand(newHand);
    setFirstCardPlayed(true);

    // Record on table
    const updated = [...tricks];
    updated[currentTrick] = { ...updated[currentTrick], playerCard: card };
    setTricks(updated);

    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'PLAY_CARD', card, trickIndex: currentTrick });
    }

    // Check if opponent already played in this trick
    if (updated[currentTrick].oppCard !== null) {
      resolveTrick(updated, currentTrick);
    } else {
      // Opponent's turn
      setTurn('opponent');
      if (config.mode === 'bot') {
        setTimeout(() => runBotTurn(updated, currentTrick, newHand), 800);
      } else if (isPassAndPlay) {
        setPassPlayFor('opponent');
        setPassPlayCurtain(true);
      }
    }
  };

  const applyOpponentCard = (card: CardType, trickIdx: number) => {
    setTricks(prev => {
      const updated = [...prev];
      updated[trickIdx] = { ...updated[trickIdx], oppCard: card };
      if (updated[trickIdx].playerCard !== null) {
        setTimeout(() => resolveTrick(updated, trickIdx), 400);
      } else {
        setTurn('player');
      }
      return updated;
    });
    setFirstCardPlayed(true);
  };

  // ─── Resolve Trick ──────────────────────────────────────────────
  const resolveTrick = (currentTricks: PlayedSlot[], trickIdx: number) => {
    const slot = currentTricks[trickIdx];
    if (!slot.playerCard || !slot.oppCard) return;

    const winner = compareTrickCards(slot.playerCard, slot.oppCard);
    const updated = [...currentTricks];
    updated[trickIdx] = { ...slot, winner };
    setTricks(updated);

    if (winner === 'player') {
      showToast(`¡Ganaste la ${trickIdx + 1}ª mano!`);
    } else if (winner === 'opponent') {
      showToast(`${config.opponentName} ganó la ${trickIdx + 1}ª mano`);
    } else {
      showToast(`¡Parda en la ${trickIdx + 1}ª mano!`);
    }

    // Check if round winner is decided
    const convertedTricks = updated.map(t => ({
      cards: [],
      winner: t.winner,
    }));
    const roundWinner = checkRoundWinner(convertedTricks, mano);

    if (roundWinner !== null) {
      setTimeout(() => finishRound(roundWinner), 1000);
    } else {
      // Next trick
      const nextTrickIdx = trickIdx + 1;
      setCurrentTrick(nextTrickIdx);

      // Winner of previous trick leads next
      const nextLeader: PlayerId = winner === 'tie' ? mano : winner;
      setTurn(nextLeader);

      if (nextLeader === 'opponent') {
        if (config.mode === 'bot') {
          setTimeout(() => runBotTurn(updated, nextTrickIdx, playerHand), 900);
        } else if (isPassAndPlay) {
          setPassPlayFor('opponent');
          setPassPlayCurtain(true);
        }
      } else if (isPassAndPlay && nextLeader === 'player') {
        setPassPlayFor('player');
        setPassPlayCurtain(true);
      }
    }
  };

  // ─── Finish Round ───────────────────────────────────────────────
  const finishRound = (roundWinner: PlayerId) => {
    const pts = trucoWinPoints(trucoLevel);
    let newPScore = scorePlayer;
    let newOScore = scoreOpp;

    if (roundWinner === 'player') {
      newPScore += pts;
      setScorePlayer(newPScore);
      soundWinRound();
      showToast(`¡Ganaste la mano! (+${pts} tantos)`);
    } else {
      newOScore += pts;
      setScoreOpp(newOScore);
      soundLoseRound();
      showToast(`${config.opponentName} se lleva la mano (+${pts} tantos)`);
    }

    // Check match winner
    if (newPScore >= config.goal) {
      soundMatchWin();
      setMatchWinner('player');
      return;
    }
    if (newOScore >= config.goal) {
      soundLoseRound();
      setMatchWinner('opponent');
      return;
    }

    // Alternate dealer (mano)
    setTimeout(() => {
      startNewRound(mano === 'player' ? 'opponent' : 'player');
    }, 1800);
  };

  // ─── Award Truco points on Mazo or Rejection ─────────────────────
  const awardTrucoTo = (winner: PlayerId) => {
    const pts = trucoNoQuieroPoints(trucoLevel);
    let newPScore = scorePlayer;
    let newOScore = scoreOpp;

    if (winner === 'player') {
      newPScore += pts;
      setScorePlayer(newPScore);
      showToast(`¡Ganaste los puntos de la mano! (+${pts} tantos)`);
    } else {
      newOScore += pts;
      setScoreOpp(newOScore);
      showToast(`${config.opponentName} sumó ${pts} tantos`);
    }

    if (newPScore >= config.goal) {
      soundMatchWin();
      setMatchWinner('player');
      return;
    }
    if (newOScore >= config.goal) {
      soundLoseRound();
      setMatchWinner('opponent');
      return;
    }

    setTimeout(() => {
      startNewRound(mano === 'player' ? 'opponent' : 'player');
    }, 1500);
  };

  // ─── Bot Turn Logic ─────────────────────────────────────────────
  const runBotTurn = (
    currentTricks: PlayedSlot[],
    trickIdx: number,
    curPlayerHand: CardType[]
  ) => {
    if (oppHandCards.length === 0) return;

    // 1. Should bot call Envido?
    if (
      !envidoPlayed &&
      !firstCardPlayed &&
      trickIdx === 0 &&
      botShouldCallEnvido(oppHandCards, {
        playerHand: curPlayerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick: 0,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, scoreOpp, scorePlayer)
    ) {
      soundCall();
      setPendingCall({ type: 'envido', caller: 'opponent' });
      showSpeech(botPhrase('envido'));
      return;
    }

    // 2. Should bot call Truco?
    if (
      canCallTruco({
        playerHand: curPlayerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick: trickIdx,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, 'opponent') &&
      botShouldCallTruco(oppHandCards, {
        playerHand: curPlayerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick: trickIdx,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, scoreOpp, scorePlayer)
    ) {
      soundTruco();
      const nextLevel = nextTrucoLevel(trucoLevel);
      if (nextLevel && nextLevel !== 'none') {
        setPendingCall({ type: nextLevel, caller: 'opponent' });
        showSpeech(botPhrase(nextLevel as any));
        return;
      }
    }

    // 3. Play card
    const cardIdx = botChooseCard(oppHandCards, {
      playerHand: curPlayerHand,
      opponentHand: oppHandCards,
      tricks: currentTricks.map(t => ({
        cards: [
          ...(t.playerCard ? [{ player: 'player' as PlayerId, card: t.playerCard }] : []),
          ...(t.oppCard ? [{ player: 'opponent' as PlayerId, card: t.oppCard }] : []),
        ],
        winner: t.winner,
      })),
      currentTrick: trickIdx,
      mano,
      trucoLevel,
      trucoCaller,
      envidoPlayed,
      firstCardPlayed,
    });

    const botCard = oppHandCards[cardIdx];
    const newOppHand = oppHandCards.filter((_, i) => i !== cardIdx);
    setOppHandCards(newOppHand);
    setOppCardsCount(newOppHand.length);
    soundCardPlay();
    applyOpponentCard(botCard, trickIdx);
  };

  // ─── Call Handlers (Envido, Truco, Mazo) ─────────────────────────
  const handlePlayerCall = (callType: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4') => {
    soundTruco();
    setPendingCall({ type: callType, caller: 'player' });

    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'CALL', call: callType });
    } else if (config.mode === 'bot') {
      setTimeout(() => botRespondToCall(callType), 1000);
    } else if (isPassAndPlay) {
      setPassPlayFor('opponent');
      setPassPlayCurtain(true);
    }
  };

  const botRespondToCall = (callType: string) => {
    if (callType === 'envido' || callType === 'real_envido' || callType === 'falta_envido') {
      const resp = botRespondEnvido(oppHandCards, callType, scoreOpp, scorePlayer, config.goal);
      showSpeech(botPhrase(resp));
      handleCallResponse('opponent', resp, callType);
    } else {
      // Truco response
      const resp = botRespondTruco(oppHandCards, callType as TrucoLevel, {
        playerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, scoreOpp, scorePlayer);

      if (resp === 'retruco' || resp === 'vale4') {
        showSpeech(botPhrase(resp));
        setPendingCall({ type: resp, caller: 'opponent' });
      } else {
        showSpeech(botPhrase(resp));
        handleCallResponse('opponent', resp, callType);
      }
    }
  };

  // ─── Resolve Call Response (Quiero / No Quiero) ───────────────────
  const handleCallResponse = (responder: PlayerId, resp: 'quiero' | 'no_quiero', callType: string) => {
    const caller: PlayerId = responder === 'player' ? 'opponent' : 'player';

    if (config.mode === 'online' && network && responder === 'player') {
      network.sendMessage({ type: 'RESPONSE', resp, toCall: callType });
    }

    setPendingCall(null);

    // 1. Envido Resolution
    if (callType === 'envido' || callType === 'real_envido' || callType === 'falta_envido') {
      setEnvidoPlayed(true);
      if (resp === 'no_quiero') {
        const pts = envidoNoQuieroPoints(callType);
        if (caller === 'player') {
          setScorePlayer(prev => prev + pts);
          showToast(`¡Ganaste el Envido! (+${pts} tantos)`);
        } else {
          setScoreOpp(prev => prev + pts);
          showToast(`${config.opponentName} sumó ${pts} tantos de Envido`);
        }
      } else {
        // Both want Envido: compare scores
        const pEnvido = calculateEnvido(playerHand);
        const oEnvido = calculateEnvido(oppHandCards);

        showSpeech(`Tengo ${oEnvido}`);
        setTimeout(() => {
          let pts = envidoQuieroPoints(callType);
          if (callType === 'falta_envido') {
            pts = faltaEnvidoPoints(scorePlayer, scoreOpp, config.goal);
          }

          if (pEnvido > oEnvido || (pEnvido === oEnvido && mano === 'player')) {
            setScorePlayer(prev => prev + pts);
            showToast(`¡Ganaste el Envido con ${pEnvido} tantos! (+${pts})`);
            soundWinRound();
          } else {
            setScoreOpp(prev => prev + pts);
            showToast(`${config.opponentName} ganó el Envido con ${oEnvido} tantos (+${pts})`);
          }
        }, 1200);
      }
    }

    // 2. Truco Resolution
    if (callType === 'truco' || callType === 'retruco' || callType === 'vale4') {
      if (resp === 'no_quiero') {
        awardTrucoTo(caller);
      } else {
        setTrucoLevel(callType as TrucoLevel);
        setTrucoCaller(caller);
        showToast(`¡${callType.toUpperCase()} aceptado!`);
      }
    }
  };

  const handleMazo = () => {
    soundButton();
    showToast('Te fuiste al mazo');
    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'GO_MAZO' });
    }
    awardTrucoTo('opponent');
  };

  const handleSendSena = (sena: string) => {
    soundButton();
    showToast(`Hiciste la seña: ${sena}`);
    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'SENA', sena });
    }
  };

  const handleSendChat = (text: string) => {
    soundButton();
    showSpeech(text);
    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'CHAT', text, from: config.playerName });
    }
  };

  return (
    <div className={`game-layout-wrapper ${isDesktop ? 'desktop-board-layout' : ''}`}>
      {/* Desktop Matchstick Sidebar */}
      {isDesktop && (
        <aside className="desktop-scoreboard-sidebar">
          <div className="desktop-scoreboard-header">
            <div className="home-badge" style={{ marginBottom: 6 }}>🇦🇷 ANOTADOR CRIOLLO</div>
            <h3>Fósforos en Vivo</h3>
            <span className="desktop-goal-text">Partida a {config.goal} tantos</span>
          </div>

          <div className="desktop-stick-cols">
            <div className="desktop-stick-col">
              <div className="desktop-stick-name">{config.playerName}</div>
              <div className="desktop-stick-pts">{scorePlayer}</div>
              <PhaseDisplay
                label={config.goal === 30 ? 'Malas' : 'Tantos'}
                score={Math.min(scorePlayer, 15)}
                max={15}
                active={true}
              />
              {config.goal === 30 && (
                <PhaseDisplay
                  label="Buenas"
                  score={Math.max(0, scorePlayer - 15)}
                  max={15}
                  active={scorePlayer >= 15}
                />
              )}
            </div>

            <div className="desktop-stick-divider" />

            <div className="desktop-stick-col">
              <div className="desktop-stick-name">{config.opponentName}</div>
              <div className="desktop-stick-pts">{scoreOpp}</div>
              <PhaseDisplay
                label={config.goal === 30 ? 'Malas' : 'Tantos'}
                score={Math.min(scoreOpp, 15)}
                max={15}
                active={true}
              />
              {config.goal === 30 && (
                <PhaseDisplay
                  label="Buenas"
                  score={Math.max(0, scoreOpp - 15)}
                  max={15}
                  active={scoreOpp >= 15}
                />
              )}
            </div>
          </div>

          <div className="desktop-shortcuts-guide">
            <h5>⌨️ Atajos de Teclado PC</h5>
            <div className="shortcut-row"><span>Tirar carta:</span> <b>[1] [2] [3]</b></div>
            <div className="shortcut-row"><span>Cantar Truco:</span> <b>[T]</b></div>
            <div className="shortcut-row"><span>Cantar Envido:</span> <b>[E]</b></div>
            <div className="shortcut-row"><span>Quiero / No Quiero:</span> <b>[Q] / [N]</b></div>
            <div className="shortcut-row"><span>Irse al Mazo:</span> <b>[M]</b></div>
          </div>
        </aside>
      )}

      {/* Main Table */}
      <div className="game-table-container">
        {/* Top HUD */}
        <div className="game-hud">
          <div className="anotador-mini" onClick={() => setScoreSheetOpen(true)}>
            <div className="score-team">
              <span className="team-lbl">{config.playerName}</span>
              <span className="team-pts">{scorePlayer}</span>
            </div>
            <div className="score-divider"></div>
            <div className="score-team">
              <span className="team-lbl">{config.opponentName}</span>
              <span className="team-pts">{scoreOpp}</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--gold)' }}>📋</span>
          </div>

          <div className="round-info-pill">
            Mano {currentTrick + 1} • A {config.goal} pts {trucoLevel !== 'none' && `• ${trucoLevel.toUpperCase()}`}
          </div>

          <div className="hud-actions-right">
            {onToggleLayout && (
              <button
                className="btn-layout-toggle"
                onClick={onToggleLayout}
                title={isDesktop ? "Cambiar a vista celular" : "Cambiar a vista pantalla completa PC"}
              >
                {isDesktop ? "📱 Vista Móvil" : "🖥️ Vista PC"}
              </button>
            )}
            <button className="btn-game-menu" onClick={onExit} title="Salir al menú">
              ✕
            </button>
          </div>
        </div>

        {/* Opponent Area */}
        <div className="opponent-area">
          <div className="opponent-badge">
            <span className="opponent-avatar">
              {config.mode === 'bot' ? '🤠' : '😎'}
            </span>
            <span className="opponent-name">{config.opponentName}</span>
            {turn === 'opponent' && <span className="turn-indicator-pulse"></span>}
          </div>

          {/* Speech Balloon */}
          {speechText && <div className="speech-bubble active">{speechText}</div>}

          {/* Opponent Hand (Card backs) */}
          <div className="opponent-hand">
            {Array.from({ length: oppCardsCount }).map((_, idx) => (
              <CardBack key={idx} small />
            ))}
          </div>
        </div>

        {/* The Felt Table (Center) */}
        <div className="felt-center">
          <div className="trick-slots-container">
            {tricks.map((trick, idx) => (
              <div key={idx} className="trick-column">
                <span className="trick-label">{idx + 1}ª</span>
                <div className="trick-slot-opp">
                  {trick.oppCard && <CardFace card={trick.oppCard} small disabled />}
                </div>
                <div className="trick-slot-me">
                  {trick.playerCard && <CardFace card={trick.playerCard} small disabled />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player Area (Bottom) */}
        <div className="player-area">
          {/* Callouts Bar */}
          <div className="player-callouts-bar">
            {pendingCall && pendingCall.caller === 'opponent' ? (
              <>
                <button
                  className="btn-callout quiero-action"
                  onClick={() => handleCallResponse('player', 'quiero', pendingCall.type)}
                >
                  <span>¡Quiero!</span> {isDesktop && <kbd className="btn-kbd">Q</kbd>}
                </button>
                <button
                  className="btn-callout no-quiero-action"
                  onClick={() => handleCallResponse('player', 'no_quiero', pendingCall.type)}
                >
                  <span>No Quiero</span> {isDesktop && <kbd className="btn-kbd">N</kbd>}
                </button>
                {pendingCall.type === 'truco' && (
                  <button
                    className="btn-callout truco-action"
                    onClick={() => handlePlayerCall('retruco')}
                  >
                    <span>¡Retruco!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
                {pendingCall.type === 'retruco' && (
                  <button
                    className="btn-callout truco-action"
                    onClick={() => handlePlayerCall('vale4')}
                  >
                    <span>¡Vale Cuatro!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
              </>
            ) : (
              <>
                {!envidoPlayed && !firstCardPlayed && currentTrick === 0 && (
                  <>
                    <button className="btn-callout" onClick={() => handlePlayerCall('envido')}>
                      <span>Envido</span> {isDesktop && <kbd className="btn-kbd">E</kbd>}
                    </button>
                    <button className="btn-callout" onClick={() => handlePlayerCall('real_envido')}>
                      <span>Real Envido</span>
                    </button>
                    <button className="btn-callout" onClick={() => handlePlayerCall('falta_envido')}>
                      <span>Falta Envido</span>
                    </button>
                  </>
                )}

                {trucoLevel === 'none' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('truco')}>
                    <span>¡Truco!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
                {trucoLevel === 'truco' && trucoCaller === 'opponent' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('retruco')}>
                    <span>¡Retruco!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
                {trucoLevel === 'retruco' && trucoCaller === 'opponent' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('vale4')}>
                    <span>¡Vale Cuatro!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}

                <button className="btn-callout mazo-btn" onClick={handleMazo}>
                  <span>Al Mazo</span> {isDesktop && <kbd className="btn-kbd">M</kbd>}
                </button>
              </>
            )}
          </div>

          {/* Player's Cards Hand */}
          <div className="player-hand">
            {playerHand.map((card, idx) => (
              <div key={card.id} className="player-card-wrapper">
                {isDesktop && <div className="card-key-badge">[{idx + 1}]</div>}
                <CardFace
                  card={card}
                  onClick={() => handlePlayCard(idx)}
                  disabled={turn !== 'player' || pendingCall !== null}
                />
              </div>
            ))}
          </div>

          {/* Quick Señas Drawer */}
          <div className="senas-drawer">
            <span className="senas-label">SEÑAS:</span>
            <button className="btn-sena" onClick={() => handleSendSena('😉 1 Espada')}>
              😉 1 Espada
            </button>
            <button className="btn-sena" onClick={() => handleSendSena('🤨 1 Basto')}>
              🤨 1 Basto
            </button>
            <button className="btn-sena" onClick={() => handleSendSena('😏 7 Espada')}>
              😏 7 Espada
            </button>
            <button className="btn-sena" onClick={() => handleSendSena('😮 7 Oro')}>
              😮 7 Oro
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && <div className="game-toast-popup show">{toastMsg}</div>}

      {/* Matchstick Score Sheet Modal */}
      <ScoreSheet
        open={scoreSheetOpen}
        onClose={() => setScoreSheetOpen(false)}
        scorePlayer={scorePlayer}
        scoreOpponent={scoreOpp}
        goal={config.goal}
        playerName={config.playerName}
        opponentName={config.opponentName}
      />

      {/* Match Over Victory Modal */}
      {matchWinner && (
        <div className="match-over-overlay">
          <div className="match-over-card">
            <div className="trophy-icon">🏆</div>
            <h2>
              {matchWinner === 'player'
                ? `¡Felicitaciones ${config.playerName}!`
                : `¡Ganó ${config.opponentName}!`}
            </h2>
            <p className="final-score-text">
              Marcador Final: {scorePlayer} a {scoreOpp}
            </p>
            <div className="match-over-buttons">
              <button
                className="btn-primary-action full-width"
                onClick={() => {
                  setScorePlayer(0);
                  setScoreOpp(0);
                  setMatchWinner(null);
                  startNewRound('player');
                  if (config.mode === 'online' && network) {
                    network.sendMessage({ type: 'REVANCHE' });
                  }
                }}
              >
                🔥 Jugar Revancha
              </button>
              <button className="btn-secondary-action full-width" onClick={onExit}>
                Volver al Menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pass & Play Privacy Screen */}
      {isPassAndPlay && passPlayCurtain && (
        <div className="pass-play-curtain">
          <div className="curtain-card">
            <div className="curtain-icon">📱</div>
            <h3>Pasale el celular a:</h3>
            <h2 className="curtain-player-name">
              {passPlayFor === 'player' ? config.playerName : config.opponentName}
            </h2>
            <p className="curtain-warning">
              (No mires las cartas del rival para jugar limpio)
            </p>
            <button
              className="btn-primary-action full-width"
              onClick={() => setPassPlayCurtain(false)}
            >
              Listo, tengo el celu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
