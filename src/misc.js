// too expensive to run on full dict
// saving in case i wanna try optimizing it
function buildTrees(startWord, dictionary) {
    const buildTree = (word, n) => {
        const nextWords = dictionary.filter((nextWord) => compareWords(nextWord, word) === 4 && compareWords(nextWord, startWord) === (5 - n));

        if (nextWords.length === 0) return { word };

        return {
            word,
            nextWords: nextWords.map((nextWord) => buildTree(nextWord, n + 1))
        };
    };

    return buildTree(startWord, 1);
}
