import test from 'node:test';
import assert from 'node:assert/strict';
import {getStyleScore, getStyleRating, getTileKind} from '../../../style-score.mjs';

const pair = ['bbbbb', 'ooooo'];
const score = rows => getStyleScore(['bbbbb', ...rows, 'ooooo'].map(row => [...row]), pair);
const staircase = ['bbbbo', 'bbboo', 'bbooo', 'boooo'];

test('style becomes one to five nails, with five for the reference board', () => {
    const rating = rows => getStyleRating(['bbbbb', ...rows, 'ooooo'].map(row => [...row]), pair);
    assert.equal(rating(staircase), 5);
    assert.equal(rating(['bbbbb', 'bbbbb', 'bbbbb', 'bbbbb']), 1);
    assert.equal(rating(['bobbb', 'obbob', 'oobob', 'ooobo']), 4);
});

test('the reference staircase earns full style points in either orientation or palette', () => {
    assert.equal(score(staircase), 100);
    assert.equal(score(staircase.map(row => [...row].reverse().join(''))), 100);
    assert.equal(score([...staircase].reverse()), 100);
    assert.equal(score(staircase.map(row => row.replace(/[bo]/g, color => color === 'b' ? 'o' : 'b'))), 100);
});

test('clean shapes beat scattered tiles with the same color counts in every row', () => {
    assert.ok(score(staircase) > score(['bobbb', 'obbob', 'oobob', 'ooobo']));
    assert.ok(score(staircase) > score(['bobob', 'obobo', 'bobob', 'obobo']));
    assert.ok(score(staircase) > score(['bbbbo', 'bbbbo', 'bbbbo', 'bbbbo']));
});

test('style uses the same three colors as the board and share, including start-letter precedence', () => {
    const overlappingPair = ['caulk', 'louse'];
    assert.equal(getTileKind(overlappingPair, 'l'), 'start');
    assert.equal(getTileKind(overlappingPair, 's'), 'end');
    assert.equal(getTileKind(overlappingPair, 'z'), 'misc');
    assert.equal(getTileKind(overlappingPair, null), 'normal');
    const realBoard = ['caulk', 'lacks', 'hacks', 'shake', 'share', 'horse'].map(row => [...row]);
    assert.equal(getStyleScore(realBoard, ['caulk', 'horse']), score(['bbbbo', 'obbbo', 'oobbo', 'ooboo']));
    assert.ok(score(['bbbbw', 'bbbwo', 'bbwoo', 'bwooo']) < score(staircase));
});

test('endpoints and repeated rows cannot add style points by themselves', () => {
    const board = ['bbbbb', ...staircase, 'ooooo'].map(row => [...row]);
    const expected = getStyleScore(board, pair);
    board[0] = [...'wwwww'];
    board[board.length - 1] = [...'wwwww'];
    assert.equal(getStyleScore(board, pair), expected);
    assert.equal(score(staircase.flatMap(row => [row, row])), expected);
    assert.equal(score(['bbbbo', 'bbbbo', 'bbboo', 'bbooo', 'boooo', 'boooo']), expected);
});

test('empty, incomplete, ragged, and single-color patterns earn no style points', () => {
    for (const rows of [[], [''], ['bbbbb'], ['ooooo'], ['wwwww'], ['bbbbo', 'bboo']]) assert.equal(score(rows), 0);
    assert.equal(getStyleScore([['b'], ['b', null], ['o']], pair), 0);
});

test('scores stay deterministic and within 0–100 for different sizes and neutral tiles', () => {
    let seed = 17;
    for (const height of [1, 3, 4, 5, 8, 20]) {
        for (const width of [3, 4, 5]) {
            const rows = Array.from({length: height}, () => Array.from({length: width}, () => {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                return 'bow'[seed % 3];
            }).join(''));
            const points = score(rows);
            assert.ok(Number.isInteger(points) && points >= 0 && points <= 100);
            assert.equal(score(rows), points);
            assert.equal(score(rows.map(row => [...row].reverse().join(''))), points);
            const rating = getStyleRating(['bbbbb', ...rows, 'ooooo'].map(row => [...row]), pair);
            assert.ok(Number.isInteger(rating) && rating >= 1 && rating <= 5);
        }
    }
});
