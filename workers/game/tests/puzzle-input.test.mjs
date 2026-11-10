import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBoard} from '../../../utils.js';
import {placeLetter, eraseLetter, rowComplete} from '../../../puzzle-input.mjs';

const puzzle = (length = 5, rows = 6) => ({board: emptyBoard(length, rows), position: {x: 0, y: 1}});

test('typing fills a row without overwriting a full draft', () => {
    const {board, position} = puzzle();
    for (const letter of 'lacks') assert.equal(placeLetter(board, position, letter), true);
    assert.equal(board[1].join(''), 'lacks');
    assert.equal(position.x, 5);
    assert.equal(rowComplete(board, position), true);
    assert.equal(placeLetter(board, position, 'h'), false);
});

test('dropping in the last square returns the cursor to earlier holes', () => {
    const {board, position} = puzzle();
    placeLetter(board, position, 's', 4);
    assert.equal(position.x, 0);
    for (const letter of 'lack') placeLetter(board, position, letter);
    assert.equal(board[1].join(''), 'lacks');
});

test('dragging swaps filled squares and moves into an empty square', () => {
    const {board, position} = puzzle();
    board[1] = ['a', 'c', null, 'l', 'k'];
    placeLetter(board, position, 'a', 1, 0);
    assert.deepEqual(board[1], ['c', 'a', null, 'l', 'k']);
    placeLetter(board, position, 'k', 2, 4);
    assert.deepEqual(board[1], ['c', 'a', 'k', 'l', null]);
    assert.equal(placeLetter(board, position, 'c', 0, 0), false);
    assert.equal(placeLetter(board, position, 'a', 0, 3), false);
});

test('selecting a filled square does not prevent submission', () => {
    const {board, position} = puzzle();
    board[1] = 'lacks'.split('');
    position.x = 0;
    assert.equal(rowComplete(board, position), true);
    placeLetter(board, position, 'h');
    assert.equal(board[1].join(''), 'hacks');
    assert.equal(rowComplete(board, position), true);
});

test('backspace handles full rows, selected letters and empty positions', () => {
    const {board, position} = puzzle();
    for (const letter of 'lacks') placeLetter(board, position, letter);
    assert.equal(eraseLetter(board, position), 4);
    assert.equal(eraseLetter(board, position), 3);
    position.x = 1;
    eraseLetter(board, position);
    assert.deepEqual(board[1], ['l', null, 'c', null, null]);
    placeLetter(board, position, 'a');
    assert.equal(position.x, 3);
});

test('input supports tutorial word lengths and growing normal ladders', () => {
    for (const word of ['cot', 'cord', 'lacks']) {
        const {board, position} = puzzle(word.length);
        for (const letter of word) placeLetter(board, position, letter);
        assert.equal(rowComplete(board, position), true);
        assert.equal(board[1].join(''), word);
    }
    const {board, position} = puzzle(5, 15);
    position.y = 13;
    for (const letter of 'share') placeLetter(board, position, letter);
    assert.equal(board[13].join(''), 'share');
});

test('fixed rows and completed games cannot be edited', () => {
    const {board, position} = puzzle();
    for (const p of [null, {x: 0, y: 0}, {x: 0, y: 5}]) {
        assert.equal(placeLetter(board, p, 'c'), false);
        assert.equal(eraseLetter(board, p), null);
    }
    for (const x of [-1, 5, 1.5]) assert.equal(placeLetter(board, position, 'c', x), false);
    assert.equal(placeLetter(board, position, 'Backspace'), false);
});
