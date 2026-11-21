import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrucoNetwork } from '../src/engine/network.ts';
import { dealMultiHands } from '../src/engine/deck.ts';
import { evaluateTeamTrick, checkTeamRoundWinner } from '../src/engine/rules.ts';
import { chooseMultiBotCard } from '../src/engine/ai.ts';
import type { Card } from '../src/engine/types.ts';

test('dealMultiHands generates 3 cards per player for 4 and 6 players', () => {
  const hands4 = dealMultiHands(4);
  assert.equal(hands4.length, 4);
  hands4.forEach(h => assert.equal(h.length, 3));

  const hands6 = dealMultiHands(6);
  assert.equal(hands6.length, 6);
  hands6.forEach(h => assert.equal(h.length, 3));

  // No duplicate cards in the entire deal
  const allCardIds = hands6.flat().map(c => c.id);
  const uniqueCardIds = new Set(allCardIds);
  assert.equal(uniqueCardIds.size, 18);
});

test('TrucoNetwork seat initialization and team assignments', () => {
  const net = new TrucoNetwork({
    onStatusChange: () => {},
    onMessage: () => {},
  });

  // 2v2 has 4 seats: 0, 2 are Team 0 (Nosotros); 1, 3 are Team 1 (Ellos)
  net.createRoom('TEST2V2', 'HostPlayer', '2v2', 15, false);
  assert.equal(net.seats.length, 4);
  assert.equal(net.seats[0].team, 0);
  assert.equal(net.seats[1].team, 1);
  assert.equal(net.seats[2].team, 0);
  assert.equal(net.seats[3].team, 1);
  assert.equal(net.seats[0].isHost, true);
  assert.equal(net.seats[0].name, 'HostPlayer');

  // 3v3 has 6 seats: 0, 2, 4 are Team 0; 1, 3, 5 are Team 1
  net.createRoom('TEST3V3', 'HostPlayer', '3v3', 15, false);
  assert.equal(net.seats.length, 6);
  assert.equal(net.seats[0].team, 0);
  assert.equal(net.seats[1].team, 1);
  assert.equal(net.seats[2].team, 0);
  assert.equal(net.seats[3].team, 1);
  assert.equal(net.seats[4].team, 0);
  assert.equal(net.seats[5].team, 1);

  net.destroy();
});

test('Relative seat perspective calculation preserves clockwise order for any seat', () => {
  const seatCount = 6;
  // If player is sitting at seat 2 (Team 0, compañero)
  const mySeatIdx = 2;
  const getRelativeSeat = (offset: number) => (mySeatIdx + offset) % seatCount;

  // Offset 0 is bottom (my own seat)
  assert.equal(getRelativeSeat(0), 2);
  // Offset 1 is left (next player clockwise: seat 3)
  assert.equal(getRelativeSeat(1), 3);
  // Offset 2 is top-left (seat 4)
  assert.equal(getRelativeSeat(2), 4);
  // Offset 3 is top-center (seat 5)
  assert.equal(getRelativeSeat(3), 5);
  // Offset 4 is top-right (seat 0)
  assert.equal(getRelativeSeat(4), 0);
  // Offset 5 is right (seat 1)
  assert.equal(getRelativeSeat(5), 1);
});

test('Seat switching updates host seats array and preserves role', () => {
  const net = new TrucoNetwork({
    onStatusChange: () => {},
    onMessage: () => {},
  });

  net.createRoom('SEATSW', 'HostPlayer', '2v2', 15, false);
  assert.equal(net.mySeatIndex, 0);
  assert.equal(net.seats[0].name, 'HostPlayer');
  assert.equal(net.seats[2].name, '');

  // Host moves from seat 0 to seat 2 (same team, partner seat)
  net.requestChangeSeat(2);
  assert.equal(net.mySeatIndex, 2);
  assert.equal(net.seats[2].name, 'HostPlayer');
  assert.equal(net.seats[2].isHost, true);
  assert.equal(net.seats[0].name, '');

  net.destroy();
});

test('evaluateTeamTrick determines correct winner when team plays cards', () => {
  const c1Espada: Card = { id: 'e1', num: 1, suit: 'espada', power: 14, envidoVal: 1, label: '1 Espada' };
  const c7Espada: Card = { id: 'e7', num: 7, suit: 'espada', power: 12, envidoVal: 7, label: '7 Espada' };
  const c3Basto: Card = { id: 'b3', num: 3, suit: 'basto', power: 10, envidoVal: 3, label: '3 Basto' };
  const c4Oro: Card = { id: 'o4', num: 4, suit: 'oro', power: 1, envidoVal: 4, label: '4 Oro' };

  // 2v2 trick plays: Seat 0 (Team 0), Seat 1 (Team 1), Seat 2 (Team 0), Seat 3 (Team 1)
  const plays = [
    { seatIndex: 0, team: 0 as const, card: c4Oro, playerName: 'Vos' },
    { seatIndex: 1, team: 1 as const, card: c3Basto, playerName: 'Rival 1' },
    { seatIndex: 2, team: 0 as const, card: c1Espada, playerName: 'Compañero' },
    { seatIndex: 3, team: 1 as const, card: c7Espada, playerName: 'Rival 2' },
  ];

  const result = evaluateTeamTrick(plays);
  // Team 0 should win with 1 de Espada (power 14)
  assert.equal(result.winnerTeam, 0);
  assert.equal(result.winningPlay?.card.id, 'e1');
  assert.equal(result.winningPlay?.seatIndex, 2);
});
