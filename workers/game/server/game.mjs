import dictionaryText from '../data/dictionary.txt';
import pairsText from '../data/pairs.txt';
import { compareWords } from '../../../utils.js';

const dictionary = new Set(dictionaryText.split('\n'));
// Preserve the original array length and ordering: both determine daily puzzles.
const pairs = pairsText.split('\n');
export const pairCount = pairs.length;
export const calcIndex = (date) => {
 const s = new Date(date).valueOf() / 1000;
 const r = s * (Math.PI - 3) - Math.floor(s * (Math.PI - 3));
 return Math.floor(pairs.length * r);
};
export function validDate(date) {
 return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date && date <= new Date(Date.now()+86400000).toISOString().slice(0,10);
}
export function puzzle(date) {
 if (!validDate(date)) throw new Error('Choose a valid puzzle date.');
 const puzzleNumber = calcIndex(date);
 const pair = pairs[puzzleNumber]?.split(',').slice(0,2);
 if (pair?.length !== 2 || !pair.every(w=>/^[a-z]{5}$/.test(w))) throw new Error('This puzzle is unavailable.');
 return {pair,puzzleNumber};
}
export function practicePair(saved) {
 if (Array.isArray(saved)) { const pair=saved.slice(0,2); if(pair.length===2&&pair.every(w=>/^[a-z]{5}$/.test(w))&&pairs.some(row=>row.startsWith(pair.join(',')+',')))return pair; }
 let pair;
 do { pair=pairs[crypto.getRandomValues(new Uint32Array(1))[0] % pairs.length].split(',').slice(0,2); } while(pair.length!==2 || !pair.every(w=>/^[a-z]{5}$/.test(w)));
 return pair;
}
export function checkStep(word, previous, pair, hard, row) {
 if (!/^[a-z]{5}$/.test(word) || !dictionary.has(word)) return `${word} is not in our dictionary`;
 if (compareWords(word,previous)!==4) return `${word} can only differ by one letter from ${previous}`;
 if (hard && (!Array.from(word).every(c=>pair.join('').includes(c)) || compareWords(word,pair[1])!==row)) return `${word} must have ${5-row} blue letters and ${row} orange letters`;
 return null;
}
export function checkLadder(words,pair,hard,complete=false) {
 if(!Array.isArray(words)||words.length>200||words.some(w=>typeof w!=='string')) return 'Invalid ladder.';
 if(hard&&words.length>4) return 'Hard mode allows four words.';
 let previous=pair[0];
 for(let i=0;i<words.length;i++) {const error=checkStep(words[i],previous,pair,hard,i+1);if(error)return error;previous=words[i];}
 if(complete && (words.length<4 || (hard&&words.length!==4) || compareWords(previous,pair[1])!==4)) return 'The ladder does not reach the end word.';
 return null;
}
