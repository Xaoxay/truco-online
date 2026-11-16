import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addPoints,
  initialState,
  newMatch,
  restore,
  scores,
  startNext,
  undo,
  winner,
} from "../src/game.ts";

test("15 malas pasan a buenas sin reiniciar el total", () => {
  let m = newMatch();
  m = addPoints(m, 0, 14);
  m = addPoints(m, 0, 1);
  assert.deepEqual(scores(m), [15, 0]);
  assert.equal(winner(m), null);
});
test("no supera el objetivo y bloquea tantos después de ganar", () => {
  let m = addPoints(newMatch(), 0, 29);
  m = addPoints(m, 0, 4);
  assert.deepEqual(scores(m), [30, 0]);
  assert.equal(winner(m), 0);
  assert.deepEqual(addPoints(m, 1, 4), m);
  assert.deepEqual(addPoints(m, 0, -1), m);
});
test("deshacer victoria devuelve el puntaje anterior exacto", () => {
  const m = addPoints(addPoints(newMatch(), 1, 28), 1, 4);
  const reverted = undo(m);
  assert.equal(winner(reverted), null);
  assert.deepEqual(scores(reverted), [0, 28]);
});
test("partida corta termina a 15", () => {
  const m = addPoints(newMatch(["Ana", "Leo"], 15), 1, 16);
  assert.equal(winner(m), 1);
  assert.deepEqual(scores(m), [0, 15]);
});
test("restar nunca produce negativos y se puede deshacer la corrección", () => {
  let m = addPoints(newMatch(), 0, -1);
  assert.equal(m.moves.length, 0);
  m = addPoints(m, 1, 2);
  m = addPoints(m, 1, -4);
  assert.deepEqual(scores(m), [0, 0]);
  assert.deepEqual(scores(undo(m)), [0, 2]);
});
test("rechaza puntos no enteros e inválidos", () => {
  const m = newMatch();
  for (const points of [NaN, Infinity, 0, 1.5])
    assert.deepEqual(addPoints(m, 0, points), m);
});
test("revancha archiva solo una vez y conserva los equipos", () => {
  let s = initialState();
  s.match = addPoints(s.match, 0, 30);
  s = startNext(s, s.match.names, s.match.goal);
  assert.equal(s.finished.length, 1);
  assert.deepEqual(scores(s.match), [0, 0]);
  s = startNext(s, s.match.names, s.match.goal);
  assert.equal(s.finished.length, 1);
});
test("partida incompleta no se registra como victoria", () => {
  let s = initialState();
  s.match = addPoints(s.match, 1, 14);
  s = startNext(s, ["Uno", "Dos"], 15);
  assert.equal(s.finished.length, 0);
  assert.equal(s.match.goal, 15);
  assert.deepEqual(s.match.names, ["Uno", "Dos"]);
});
test("guardado y restauración preservan puntos, historial y preferencias", () => {
  let s = initialState();
  s.match = addPoints(s.match, 0, 30);
  s = startNext(s, s.match.names, 30);
  s.match = addPoints(s.match, 1, 7);
  s.dark = true;
  assert.deepEqual(restore(JSON.stringify(s)), s);
});
test("datos corruptos, versiones desconocidas y marcadores imposibles no se cargan", () => {
  assert.equal(restore("{"), null);
  assert.equal(restore("null"), null);
  const s = initialState();
  assert.equal(restore(JSON.stringify({ ...s, version: 2 })), null);
  s.match.moves = [{ team: 0, points: -1, at: Date.now() }];
  assert.equal(restore(JSON.stringify(s)), null);
  s.match.moves = [
    { team: 0, points: 30, at: Date.now() },
    { team: 1, points: 1, at: Date.now() },
  ];
  assert.equal(restore(JSON.stringify(s)), null);
});
test("limita el archivo a las últimas 100 partidas", () => {
  let s = initialState();
  for (let i = 0; i < 102; i++) {
    s.match = addPoints(s.match, 0, 30);
    s = startNext(s, s.match.names, 30);
  }
  assert.equal(s.finished.length, 100);
});

import { calculateEnvido } from "../src/engine/rules.ts";
import type { Card } from "../src/engine/types.ts";

test("calcula el Envido correctamente en todos los casos criollos", () => {
  // Caso 1: 33 de espada (7 + 6 de espada)
  const hand33: Card[] = [
    { id: 'espada-7', num: 7, suit: 'espada', power: 12, envidoVal: 7, label: '7 Espada' },
    { id: 'espada-6', num: 6, suit: 'espada', power: 3, envidoVal: 6, label: '6 Espada' },
    { id: 'basto-1', num: 1, suit: 'basto', power: 13, envidoVal: 1, label: '1 Basto' },
  ];
  assert.equal(calculateEnvido(hand33), 33);

  // Caso 2: 21 con figura (1 de basto + 11 de basto)
  const hand21: Card[] = [
    { id: 'basto-1', num: 1, suit: 'basto', power: 13, envidoVal: 1, label: '1 Basto' },
    { id: 'basto-11', num: 11, suit: 'basto', power: 6, envidoVal: 0, label: '11 Basto' },
    { id: 'oro-5', num: 5, suit: 'oro', power: 2, envidoVal: 5, label: '5 Oro' },
  ];
  assert.equal(calculateEnvido(hand21), 21);

  // Caso 3: 20 con dos figuras del mismo palo (10 y 12 de copa)
  const hand20: Card[] = [
    { id: 'copa-10', num: 10, suit: 'copa', power: 5, envidoVal: 0, label: '10 Copa' },
    { id: 'copa-12', num: 12, suit: 'copa', power: 7, envidoVal: 0, label: '12 Copa' },
    { id: 'espada-3', num: 3, suit: 'espada', power: 10, envidoVal: 3, label: '3 Espada' },
  ];
  assert.equal(calculateEnvido(hand20), 20);

  // Caso 4: Palos distintos toma la carta más alta
  const handDistintos: Card[] = [
    { id: 'espada-7', num: 7, suit: 'espada', power: 12, envidoVal: 7, label: '7 Espada' },
    { id: 'basto-4', num: 4, suit: 'basto', power: 1, envidoVal: 4, label: '4 Basto' },
    { id: 'oro-12', num: 12, suit: 'oro', power: 7, envidoVal: 0, label: '12 Oro' },
  ];
  assert.equal(calculateEnvido(handDistintos), 7);

  // Caso 5: Tres figuras de distinto palo vale 0
  const handCero: Card[] = [
    { id: 'espada-10', num: 10, suit: 'espada', power: 5, envidoVal: 0, label: '10 Espada' },
    { id: 'basto-11', num: 11, suit: 'basto', power: 6, envidoVal: 0, label: '11 Basto' },
    { id: 'oro-12', num: 12, suit: 'oro', power: 7, envidoVal: 0, label: '12 Oro' },
  ];
  assert.equal(calculateEnvido(handCero), 0);
});
