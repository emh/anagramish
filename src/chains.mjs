import { compareWords } from "./words.mjs";

const buildWordMap = (words) => words.reduce((acc1, w1) => {
  acc1[w1] = words.reduce((acc2, w2) => {
    const n = compareWords(w1, w2);

    acc2[n] ||= [];
    acc2[n].push(w2);

    return acc2;
  }, {});

  return acc1;
}, {});

process.stdin.on('data', data => {
    const words = data.toString().split("\n");

    console.error("building wordmap...");
    const wordMap = buildWordMap(words);

    console.error("building trees...");

    const trees = words.reduce((trees, startWord) => {
        console.error("word:", startWord);
        const buildTree = (word, n) => {
            const nextWords = wordMap[word][4].filter((nextWord) => compareWords(startWord, nextWord) === (5-n));

            if (nextWords.length === 0) return { word };

            return {
                word,
                nextWords: nextWords.map((nextWord) => buildTree(nextWord, n+1))
            };
        };

        const nextWords = wordMap[startWord][4] ?? [];
  
        trees[startWord] = nextWords.map((word) => buildTree(word, 2));
  
        return trees;
    }, {}); 
    
    const chains = [];

    console.error("building chains...");
  
    words.forEach((word) => {
        console.error("word: ", word);

        const wordTrees = trees[word];
  
        const buildChain = (node, chain) => {
            const newChain = [...chain, node.word];

            if (!node.nextWords) {
                if (newChain.length === 6) chains.push(newChain);
            } else {
                node.nextWords.map((child) => buildChain(child, newChain));
            }
        };

        return wordTrees.map((tree) => buildChain(tree, [word]));
    });

    // this block of code takes infinite time to run (i let it run for days!)
    // i next ran the full chains.txt through awk -F, '{ print $1 "," $NF }' | sort | uniq in under a minute
    // const pairs = chains
    //     .map((chain) => [chain[0], chain[5]])
    //     .filter((pair, i, pairs) => i === pairs.findIndex((pair2) => pair[0] === pair2[0] && pair[1] === pair2[1]));

    // pairs.map((pair) => process.stdout.write(pair.join(",") + "\n"));
    chains.map((chain) => process.stdout.write(chain.join(",") + "\n"));

    process.exit();
});

