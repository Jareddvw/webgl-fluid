

export type VisField = 'velocity' | 'pressure' | 'particles' | 'dye'

export type SimulationSettings = {
    // fluid settings
    visField: VisField,
    jacobiIterations: number,
    manualBilerp: boolean,
    rightClick: boolean,

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
    advectBackward: boolean,

    // global settings
    paused: boolean,
}
