

export type VisField = 'velocity' | 'pressure' | 'particles'

export type SimulationSettings = {
    // fluid settings
    visField: VisField,
    jacobiIterations: number,
    manualBilerp: boolean,

    // force settings
    impulseDirection: [number, number],
    impulsePosition: [number, number],
    impulseRadius: number,
    impulseMagnitude: number,

    // particle settings
    colorMode: number,
    particleDensity: number,
    showParticleTrails: boolean,
    particleTrailSize: number,
    particleSize: number,

    // global settings
    paused: boolean,
}
