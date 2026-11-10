export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animate(element, frames, options = {}) {
    if (!element || reducedMotion()) return null;
    return element.animate(frames, {duration: 320, easing: 'cubic-bezier(.2,.8,.3,1)', ...options});
}

export function press(element) {
    return animate(element, [
        {transform: 'translateY(0)'},
        {transform: 'translateY(3px) scale(.97)', boxShadow: 'none', offset: .35},
        {transform: 'translateY(0)'}
    ], {duration: 180});
}

export function land(element, delay = 0) {
    return animate(element, [
        {transform: 'translateY(-6px) scale(.9)'},
        {transform: 'translateY(2px) scale(1.04)', offset: .6},
        {transform: 'translateY(0) scale(1)'}
    ], {duration: 340, delay});
}

const flights = new Map();
export function clearFlights() {
    for (const cancel of [...flights.values()]) cancel();
}

export function createGhost(source, letter, rect = source.getBoundingClientRect()) {
    const style = getComputedStyle(source);
    const ghost = document.createElement('div');
    ghost.className = 'flying-tile';
    ghost.textContent = letter;
    ghost.setAttribute('aria-hidden', 'true');
    // Resolve the destination color directly, even during its background transition.
    const tone = source.classList.contains('start') ? 'start' : source.classList.contains('end') ? 'end' : 'misc';
    Object.assign(ghost.style, {
        position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
        display: 'grid', placeItems: 'center', boxSizing: 'border-box',
        background: style.getPropertyValue(`--${tone}`),
        color: style.getPropertyValue(`--${tone}-ink`),
        borderRadius: style.borderRadius, boxShadow: style.boxShadow,
        fontFamily: style.fontFamily, fontWeight: '750', fontSize: style.fontSize,
        textTransform: 'uppercase', pointerEvents: 'none', zIndex: '100'
    });
    document.body.append(ghost);
    return ghost;
}

export function fly(source, target, letter, origin) {
    flights.get(target)?.();
    if (!source || !target || reducedMotion()) return;
    const start = origin || source.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const ghost = createGhost(target, letter, start);
    const dx = end.left + end.width / 2 - start.left - start.width / 2;
    const dy = end.top + end.height / 2 - start.top - start.height / 2;
    const scale = `scale(${end.width / start.width}, ${end.height / start.height})`;
    const flight = animate(ghost, [
        {transform: 'translate(0, 0) rotate(-6deg)'},
        {transform: `translate(${dx * .5}px, ${dy * .5 - 24}px) rotate(3deg) ${scale}`, offset: .5},
        {transform: `translate(${dx}px, ${dy}px) rotate(0) ${scale}`}
    ], {duration: 250});
    const glyph = animate(target.querySelector('.glyph'), [{opacity: 0}, {opacity: 0}], {duration: 225});
    const landing = land(target, 215);
    const cancel = () => {
        flight.cancel();
        glyph?.cancel();
        landing?.cancel();
        ghost.remove();
        if (flights.get(target) === cancel) flights.delete(target);
    };
    flights.set(target, cancel);
    flight.finished.then(() => ghost.remove(), () => ghost.remove());
    landing.finished.then(() => {
        if (flights.get(target) === cancel) flights.delete(target);
    }, () => {});
}

export function rowFeedback(board, y, invalid = false) {
    const cells = board?.querySelectorAll(`[data-y="${y}"]`) || [];
    cells.forEach((cell, x) => {
        if (invalid) animate(cell, [
            {transform: 'translateX(0)'}, {transform: 'translateX(-3px)'},
            {transform: 'translateX(3px)'}, {transform: 'translateX(-3px)'},
            {transform: 'translateX(0)'}
        ], {duration: 260});
        else land(cell, x * 40);
    });
}
