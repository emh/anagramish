import { compareWords } from './utils.js';

export const TUTORIAL_LESSONS = [
    {
        title: 'Change one letter',
        description: 'Connect CAT to DOG. Each new word changes exactly one letter.',
        path: ['cat', 'cot', 'dot', 'dog'],
        prompts: [
            'Type COT, then press Enter. Swap the A in CAT for an O.',
            'Now type DOT. Swap the C in COT for a D.'
        ],
        hints: ['COT is a small bed.', 'DOT is a small round mark.'],
        success: 'You made a ladder! DOT connects to DOG by changing T to G. The orange end word is already filled in.'
    },
    {
        title: 'Move the letters around',
        description: 'The letters can change places, too. Connect CAT to OAR.',
        path: ['cat', 'tar', 'oar'],
        prompts: ['Replace C with R, then rearrange the letters to spell TAR. Type it and press Enter.'],
        hints: ['Keep A and T. Add R, then put the letters in the order T–A–R.'],
        success: 'CAT → TAR changes one letter, even though the letters move. TAR connects to OAR by changing T to O.'
    },
    {
        title: 'Try a four-letter ladder',
        description: 'Connect COLD to WARM. Follow the clues, or ask for a hint.',
        path: ['cold', 'cord', 'card', 'ward', 'warm'],
        prompts: [
            'Change one letter in COLD to make a word for a thin rope.',
            'Change one letter in CORD to make something you might send on a birthday.',
            'Change one letter in CARD to make a word for a section of a hospital.'
        ],
        hints: ['Change L to R: CORD.', 'Change O to A: CARD.', 'Change C to W: WARD.'],
        success: 'WARD connects to WARM. You’re ready for five-letter puzzles! In the daily game you can choose your own valid words.'
    }
];

export const SHORT_TUTORIAL_LESSONS = [{
    title: 'Change a letter. Move the letters.',
    description: 'Connect CAT to OAR. Each step replaces exactly one letter, and you can rearrange the letters.',
    path: ['cat', 'tar', 'oar'],
    prompts: ['Replace C with R, then rearrange A, T and R to make TAR. Type TAR and press Enter.'],
    hints: ['Keep A and T. Add R. Your next word is TAR.'],
    success: 'That’s it! CAT → TAR replaces C with R and rearranges the letters. TAR → OAR replaces T with O. The orange end word is already filled in. In today’s five-letter puzzle, build your own ladder of valid words.'
}];

export const tutorialLessons = variant => variant === 'short' ? SHORT_TUTORIAL_LESSONS : TUTORIAL_LESSONS;

export function checkTutorialWord(lessonIndex, stepIndex, word, variant = 'control') {
    const lesson = tutorialLessons(variant)[lessonIndex];
    const previous = lesson.path[stepIndex];
    const expected = lesson.path[stepIndex + 1];
    if (word.length !== previous.length) return `Fill all ${previous.length} letters, then press Enter.`;
    if (compareWords(word, previous) !== previous.length - 1) {
        return 'Change exactly one letter. Moving the same letters around on its own doesn’t count.';
    }
    if (word !== expected) return `For this guided step, use ${expected.toUpperCase()}. You can try your own words in the daily game.`;
    return null;
}
