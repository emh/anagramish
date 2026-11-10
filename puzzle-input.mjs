export const rowComplete = (board, position) => !!position && board[position.y]?.every(letter => letter !== null);

export function placeLetter(board, position, letter, column = position?.x, from = null) {
    if (!position || position.y < 1 || position.y >= board.length - 1) return false;
    const row = board[position.y];
    if (!Number.isInteger(column) || column < 0 || column >= row.length || !/^[a-z]$/.test(letter)) return false;
    if (from !== null) {
        if (!Number.isInteger(from) || from < 0 || from >= row.length || from === column || row[from] !== letter) return false;
        [row[column], row[from]] = [row[from], row[column]];
    } else row[column] = letter;
    const next = row.findIndex((value, x) => x > column && value === null);
    position.x = next === -1 ? row.indexOf(null) : next;
    if (position.x === -1) position.x = row.length;
    return true;
}

export function eraseLetter(board, position) {
    if (!position || position.y < 1 || position.y >= board.length - 1) return null;
    const row = board[position.y];
    let x = Math.min(row.length - 1, position.x);
    if (row[x] === null && x > 0) x -= 1;
    row[x] = null;
    position.x = x;
    return x;
}
