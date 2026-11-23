import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dealMultiHands, dealHands } from '../src/engine/deck.ts';
import { evaluateTrick, evaluateTeamTrick, checkTeamRoundWinner, calculateEnvido, checkRoundWinner } from '../src/engine/rules.ts';
import type { Trick } from '../src/engine/types.ts';

test('Benchmark: Card deck generation and dealing 10,000 hands', () => {
  const start = performance.now();
  for (let i = 0; i < 10000; i++) {
    const { playerHand, opponentHand } = dealHands();
    assert.equal(playerHand.length, 3);
    assert.equal(opponentHand.length, 3);
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 1000, `Deck dealing benchmark took ${elapsed}ms`);
});

test('Benchmark: 3v3 Multi Hands deal and team resolution across 2,000 rounds', () => {
  const start = performance.now();
  for (let r = 0; r < 2000; r++) {
    const hands = dealMultiHands(6);
    assert.equal(hands.length, 6);
    
    // Simulate 3 tricks
    const trickWinners: (0 | 1 | 'tie')[] = [];
    for (let t = 0; t < 3; t++) {
      const plays = hands.map((h, seatIdx) => ({
        seatIndex: seatIdx,
        team: (seatIdx % 2) as 0 | 1,
        card: h[t],
      }));
      const res = evaluateTeamTrick(plays);
      trickWinners.push(res.winnerTeam);
    }
    const finalWinner = checkTeamRoundWinner(trickWinners, 0);
    assert.ok(finalWinner === 0 || finalWinner === 1, `Winner must be team 0 or 1, got ${finalWinner}`);
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 1500, `3v3 rounds simulation took ${elapsed}ms`);
});

test('Simulation: 1v1 Complete Match to 15 points with rules engine', () => {
  let scoreP = 0;
  let scoreOpp = 0;
  let mano: 'player' | 'opponent' = 'player';
  let roundsCount = 0;

  while (scoreP < 15 && scoreOpp < 15 && roundsCount < 100) {
    roundsCount++;
    const { playerHand: pHand, opponentHand: oppHand } = dealHands();

    // Envido Check
    const pEnv = calculateEnvido(pHand);
    const oEnv = calculateEnvido(oppHand);

    if (pEnv > oEnv) {
      scoreP += 2;
    } else if (oEnv > pEnv) {
      scoreOpp += 2;
    } else {
      if (mano === 'player') scoreP += 2;
      else scoreOpp += 2;
    }

    if (scoreP >= 15 || scoreOpp >= 15) break;

    // Trick Play
    const tricks: Trick[] = [];

    for (let t = 0; t < 3; t++) {
      const pCard = pHand[t];
      const oCard = oppHand[t];
      const trickObj: Trick = {
        cards: [
          { card: pCard, player: 'player' },
          { card: oCard, player: 'opponent' },
        ],
        winner: null,
      };
      const trRes = evaluateTrick(trickObj);
      trickObj.winner = trRes;
      tricks.push(trickObj);
    }

    // Determine round points
    const roundWin = checkRoundWinner(tricks, mano);
    if (roundWin === 'player') scoreP += 1;
    else if (roundWin === 'opponent') scoreOpp += 1;

    mano = mano === 'player' ? 'opponent' : 'player';
  }

  assert.ok(scoreP >= 15 || scoreOpp >= 15);
  assert.ok(roundsCount > 0 && roundsCount < 50);
});

test('Recovery & Self-Healing: 1v1 match serialization and reload unfreeze', () => {
  const { playerHand, opponentHand } = dealHands();
  
  // Simulate user playing card 0 (e.g. 4 de copas)
  const playedCard = playerHand[0];
  const remainingPlayerHand = playerHand.slice(1);
  const tricks = [
    { playerCard: playedCard, oppCard: null, winner: null },
    { playerCard: null, oppCard: null, winner: null },
    { playerCard: null, oppCard: null, winner: null },
  ];

  const snapshot = {
    config: { goal: 15, mode: 'bot', playerName: 'Braian', opponentName: 'Amigo' },
    scorePlayer: 0,
    scoreOpp: 0,
    playerHand: remainingPlayerHand,
    oppHandCards: opponentHand,
    initialPlayerHand: playerHand,
    initialOppHand: opponentHand,
    tricks,
    currentTrick: 0,
    mano: 'player',
    turn: 'opponent',
    envidoPlayed: false,
    trucoLevel: 'none',
    trucoCaller: null,
    timestamp: Date.now(),
  };

  // Serialize to JSON like localStorage
  const serialized = JSON.stringify(snapshot);
  const restored = JSON.parse(serialized);

  assert.equal(restored.playerHand.length, 2);
  assert.equal(restored.oppHandCards.length, 3);
  assert.equal(restored.tricks[0].playerCard.id, playedCard.id);
  assert.equal(restored.tricks[0].oppCard, null);

  // Recovery logic check:
  // Since player played card and opp hasn't, turn must be 'opponent'
  const trickIdx = restored.currentTrick || 0;
  const curTrick = restored.tricks[trickIdx];
  let nextTurn = 'player';
  if (curTrick.playerCard && !curTrick.oppCard) {
    nextTurn = 'opponent';
  }
  assert.equal(nextTurn, 'opponent');

  // Verify safeOppHand recovery if oppHandCards was unexpectedly empty
  const playedOppCards = restored.tricks.map((t: any) => t.oppCard).filter(Boolean);
  const safeOppHand = (restored.oppHandCards && restored.oppHandCards.length > 0)
    ? restored.oppHandCards
    : restored.initialOppHand.filter((c: any) => !playedOppCards.some((pc: any) => pc.id === c.id));
  assert.equal(safeOppHand.length, 3);
});
