export const numStars = (s) => Math.max(0, 5 - Math.floor(s / 60));

export const loadFile = (file) => fetch(file).then((response) => response.text()).then((text) => text.split('\n'));

export const key = () => {
    const d = new Date(); // local time

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const getHistory = () => JSON.parse(localStorage.getItem('history')) ?? {};

export const putHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

export const isEmpty = (obj) => Object.keys(obj).length === 0;

export const isFinished = (words) => words.every((w) => w.every((l) => l !== ' '));
