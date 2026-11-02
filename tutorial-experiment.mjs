export const TUTORIAL_EXPERIMENT = 'tutorial-short-v1';
export const TUTORIAL_VARIANTS = ['control', 'short'];

// Stable 50/50 allocation from the existing browser identity. No extra cookies,
// database lookups, analytics vendor, or reassignment on reload.
export async function tutorialVariant(player) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${TUTORIAL_EXPERIMENT}:${player}`));
    return TUTORIAL_VARIANTS[new Uint8Array(hash)[0] % 2];
}

export function tutorialChoice(config, search = '') {
    const forced = config.trafficEnvironment === 'preview'
        ? new URLSearchParams(search).get('tutorial-variant') : null;
    if (TUTORIAL_VARIANTS.includes(forced)) return {variant: forced, experiment: null};
    const assignment = config.tutorialExperiment;
    if (assignment?.id === TUTORIAL_EXPERIMENT && TUTORIAL_VARIANTS.includes(assignment.variant)) {
        return {variant: assignment.variant, experiment: assignment.id};
    }
    return {variant: 'control', experiment: null};
}
