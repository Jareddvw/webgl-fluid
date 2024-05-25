import { DoubleFBO } from "../classes/DoubleFBO"
import { FBO } from "../classes/FBO"
import { ShaderProgram } from "../classes/ShaderProgram"


const ShaderTypes = [
    'fillColorProgram', 
    'externalForceProgram', 
    'advectionProgram', 
    'copyProgram', 
    'colorFieldProgram', 
    'drawParticleProgram', 
    'jacobiProgram', 
    'writeParticleProgram', 
    'divergenceProgram', 
    'gradientSubtractionProgram', 
    'boundaryProgram', 
    'advectParticleProgram', 
    'fadeProgram', 
    'redBlackJacobiProgram'
] as const
type ShaderType = typeof ShaderTypes[number]
export type ProgramRecord = { [key in ShaderType]: ShaderProgram }

export type FBORecord = {
    particlesFBO: DoubleFBO,
    pressureFBO: DoubleFBO,
    divergenceFBO: DoubleFBO,
    velocityFBO: DoubleFBO,
    dyeFBO: DoubleFBO,

    prevParticlesFBO: FBO,
    temp: FBO,
}

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

    // dye settings
    addDye: boolean,

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
