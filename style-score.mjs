// Use the same palette for the board, share squares, and style scoring.
export const getTileKind = (pair, char) => char == null || char === '' ? 'normal'
    : pair[0].includes(char) ? 'start' : pair[1].includes(char) ? 'end' : 'misc';

const swapColor = color => color === 'start' ? 'end' : color === 'end' ? 'start' : color;

const symmetry = grid => {
    const height = grid.length, width = grid[0].length;
    const transforms = [
        (y, x) => [y, width - 1 - x],
        (y, x) => [height - 1 - y, x],
        (y, x) => [height - 1 - y, width - 1 - x]
    ];
    if (height === width) transforms.push((y, x) => [x, y], (y, x) => [height - 1 - x, width - 1 - y]);
    let best = 0;
    for (const transform of transforms) {
        for (const swap of [false, true]) {
            let matches = 0, comparisons = 0;
            grid.forEach((row, y) => row.forEach((color, x) => {
                const [otherY, otherX] = transform(y, x);
                // A tile sitting on the axis is not evidence of symmetry.
                if (otherY === y && otherX === x) return;
                comparisons++;
                if (color === (swap ? swapColor(grid[otherY][otherX]) : grid[otherY][otherX])) matches++;
            }));
            if (comparisons) best = Math.max(best, matches / comparisons);
        }
    }
    return best;
};

const flow = grid => {
    const columns = grid[0].map((_, x) => grid.map(row => row[x]));
    let transitions = 0, minimum = 0;
    for (const line of [...grid, ...columns]) {
        minimum += new Set(line).size - 1;
        for (let i = 1; i < line.length; i++) {
            if (line[i] !== line[i - 1]) transitions++;
        }
    }
    return transitions ? minimum / transitions : 1;
};

const cohesion = grid => {
    const height = grid.length, width = grid[0].length;
    const visited = new Set(), largest = new Map();
    grid.forEach((row, y) => row.forEach((color, x) => {
        const first = y * width + x;
        if (visited.has(first)) return;
        const pending = [first];
        visited.add(first);
        let size = 0;
        while (pending.length) {
            const cell = pending.pop(), cy = Math.floor(cell / width), cx = cell % width;
            size++;
            for (const [ny, nx] of [[cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1]]) {
                if (ny < 0 || ny >= height || nx < 0 || nx >= width || grid[ny][nx] !== color) continue;
                const next = ny * width + nx;
                if (visited.has(next)) continue;
                visited.add(next);
                pending.push(next);
            }
        }
        largest.set(color, Math.max(largest.get(color) ?? 0, size));
    }));
    return [...largest.values()].reduce((sum, size) => sum + size, 0) / (height * width);
};

// Score only the intermediate rows visible in a share, never the fixed endpoints.
// All measures are proportions, so extra rows do not earn points by themselves.
export const getStyleScore = (board, pair) => {
    const rows = board.slice(1, -1);
    const width = rows[0]?.length ?? 0;
    if (!width || !rows.every(row => row.length === width && row.every(char => typeof char === 'string' && char.length === 1))) return 0;
    const grid = rows.map(row => row.map(char => getTileKind(pair, char)));
    const colors = grid.flat();
    // A single-color rectangle has no color pattern to reward.
    if (new Set(colors).size < 2) return 0;
    const blue = colors.filter(color => color === 'start').length;
    const orange = colors.filter(color => color === 'end').length;
    const balance = 2 * Math.min(blue, orange) / colors.length;
    return Math.round(40 * symmetry(grid)) + Math.round(20 * balance)
        + Math.round(25 * flow(grid)) + Math.round(15 * cohesion(grid));
};

// Five equal bands; the underlying points are only used to choose the emoji count.
export const getStyleRating = (board, pair) => Math.min(5, Math.floor(getStyleScore(board, pair) / 20) + 1);
