import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TUTORIAL_LESSONS,checkTutorialWord} from '../../../tutorial.mjs';
import {compareWords,emptyBoard} from '../../../utils.js';

test('tutorial paths teach legal transitions and connect to their end words',()=>{
 assert.deepEqual(TUTORIAL_LESSONS.map(l=>l.path[0].length),[3,3,4]);
 TUTORIAL_LESSONS.forEach((lesson,index)=>{
  const n=lesson.path[0].length;
  assert.equal(lesson.prompts.length,lesson.path.length-2);
  for(let i=1;i<lesson.path.length;i++) {
   assert.equal(lesson.path[i].length,n);
   assert.equal(compareWords(lesson.path[i-1],lesson.path[i]),n-1);
   if(i<lesson.path.length-1)assert.equal(checkTutorialWord(index,i-1,lesson.path[i]),null);
  }
 });
});
test('rearranging letters alone does not count as replacing a letter',()=>{
 assert.match(checkTutorialWord(1,0,'act'),/exactly one letter/);
 assert.equal(checkTutorialWord(1,0,'tar'),null);
 assert.match(checkTutorialWord(0,0,'cap'),/guided step/);
});
test('variable-size boards preserve the five-letter default and independent rows',()=>{
 const normal=emptyBoard();assert.equal(normal.length,6);assert.equal(normal[0].length,5);
 const tutorial=emptyBoard(3,4);assert.equal(tutorial.length,4);assert.equal(tutorial[0].length,3);
 tutorial[0][0]='c';assert.equal(tutorial[1][0],null);
});
