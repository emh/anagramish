import {createGhost, fly, reducedMotion} from './tile-motion.mjs';

export function setupTileDrag(root, {canInteract, position, onDrop}) {
    let drag = null, suppressClick = false, suppressTimer, frame;
    const clearTarget = () => root.querySelectorAll('.drop-target').forEach(cell => cell.classList.remove('drop-target'));
    const targetAt = () => {
        const cell = document.elementFromPoint(drag.clientX, drag.clientY)?.closest('.board.interactive .cell');
        return cell && Number(cell.dataset.y) === position()?.y ? cell : null;
    };
    const highlight = () => {clearTarget(); targetAt()?.classList.add('drop-target');};
    function scroll() {
        if (!drag?.ghost) return;
        const bounds = root.getBoundingClientRect();
        const distance = drag.clientY < bounds.top + 40 ? drag.clientY - bounds.top - 40 : drag.clientY > bounds.bottom - 40 ? drag.clientY - bounds.bottom + 40 : 0;
        if (distance) {root.scrollTop += Math.max(-10, Math.min(10, distance / 4)); highlight();}
        frame = requestAnimationFrame(scroll);
    }
    function end(cancelled = true) {
        if (!drag) return;
        const current = drag;
        const target = !cancelled && canInteract() ? targetAt() : null;
        drag = null;
        cancelAnimationFrame(frame);
        clearTarget();
        current.cell.classList.remove('dragging');
        if (current.cell.hasPointerCapture(current.id)) current.cell.releasePointerCapture(current.id);
        if (!current.ghost) return;
        suppressClick = true;
        clearTimeout(suppressTimer);
        suppressTimer = setTimeout(() => {suppressClick = false;}, 0);
        const origin = current.ghost.getBoundingClientRect();
        current.ghost.remove();
        if (target && !(current.y === position()?.y && Number(target.dataset.x) === current.x)) {
            onDrop({letter: current.letter, source: current.cell, origin,
                x: Number(target.dataset.x), from: current.y === position()?.y ? current.x : null});
        } else if (current.cell.isConnected) fly(current.cell, current.cell, current.letter, origin);
    }
    root.addEventListener('pointerdown', event => {
        const cell = event.target.closest('.board.interactive .cell.source');
        if (!cell || !canInteract() || event.button !== 0 || drag) return;
        drag = {cell, x: Number(cell.dataset.x), y: Number(cell.dataset.y), letter: cell.textContent,
            startX: event.clientX, startY: event.clientY, clientX: event.clientX, clientY: event.clientY, id: event.pointerId};
        cell.setPointerCapture(event.pointerId);
    });
    root.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        drag.clientX = event.clientX;
        drag.clientY = event.clientY;
        if (!drag.ghost && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 7) return;
        event.preventDefault();
        if (!drag.ghost) {
            drag.ghost = createGhost(drag.cell, drag.letter);
            drag.ghost.style.boxShadow = '0 12px 24px #172e2540';
            drag.cell.classList.add('dragging');
            frame = requestAnimationFrame(scroll);
        }
        drag.ghost.style.left = `${event.clientX - drag.cell.offsetWidth / 2}px`;
        drag.ghost.style.top = `${event.clientY - drag.cell.offsetHeight * .65}px`;
        drag.ghost.style.transform = reducedMotion() ? 'none' : 'rotate(-7deg) scale(1.08)';
        highlight();
    });
    root.addEventListener('pointerup', event => {
        if (!drag || event.pointerId !== drag.id) return;
        drag.clientX = event.clientX; drag.clientY = event.clientY;
        end(false);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) root.addEventListener(type, event => {
        if (drag?.id === event.pointerId) end();
    });
    window.addEventListener('blur', () => end());
    document.addEventListener('keydown', event => {if (event.key === 'Escape') end();});
    return {cancel: () => end(), isDragging: () => !!drag, suppressClick: () => suppressClick};
}
