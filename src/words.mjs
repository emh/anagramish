const sortByCh = (str) => str.toUpperCase().split('').sort();

const compare = (ch1, ch2) => {
    if (ch1.length === 0 || ch2.length === 0) return 0;

    if (ch1[0] < ch2[0]) return compare(ch1.slice(1), ch2);
    if (ch1[0] > ch2[0]) return compare(ch1, ch2.slice(1));

    return 1 + compare(ch1.slice(1), ch2.slice(1));
};

export const compareWords = (w1, w2) => compare(sortByCh(w1), sortByCh(w2));

export const isLetter = (s) => s.length === 1 && ((s >= 'a' && s <= 'z') || (s >= 'A' && s <= 'Z'));
