

export type VisField = 'velocity' | 'pressure' | 'particles' | 'dye'

export type SimulationSettings = {
    // fluid settings
    visField: VisField,
    jacobiIterations: number,
    gridScale: number,
    manualBilerp: boolean,

    // diffusion settings (unused)
    applyDiffusion: boolean,
    diffusionCoefficient: number,

    // advect settings
    advectionDissipation: number,

    // force settings
    rightClick: boolean,
    impulseDirection: [number, number],
    impulsePosition: [number, number],
    impulseRadius: number,
    impulseMagnitude: number,

    // particle settings
    particleDensity: number,
    showParticleTrails: boolean,
    particleTrailSize: number,
    particleSize: number,
    advectBackward: boolean,

    // image
    image: HTMLImageElement | null,

    // global settings
    colorMode: ColorMode,
    paused: boolean,
    // reset the entire simulation in the next frame
    reset: boolean,
    // reset the velocity/pressure fields in the next frame
    halt: boolean,
}

export enum ColorMode {
    Rainbow = 0,
    BlackAndWhite = 1,
    BlueGreen = 2,
    Pink = 3,
}
