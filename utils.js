export const emptyRow = (wordLength = 5) => Array(wordLength).fill(null);

export const emptyBoard = (wordLength = 5, rowCount = 6) => Array.from({ length: rowCount }, () => emptyRow(wordLength));

const compare = (ch1, ch2) => {
    if (ch1.length === 0 || ch2.length === 0) return 0;

    if (ch1[0] < ch2[0]) return compare(ch1.slice(1), ch2);
    if (ch1[0] > ch2[0]) return compare(ch1, ch2.slice(1));

    return 1 + compare(ch1.slice(1), ch2.slice(1));
};

export const compareWords = (w1, w2) => compare([...w1].sort(), [...w2].sort());
