import { DoubleFBO } from "../classes/DoubleFBO"
import { FBO } from "../classes/FBO"
import { Program } from "../classes/ShaderProgram"


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
] as const
type ShaderType = typeof ShaderTypes[number]
export type ProgramRecord = { [key in ShaderType]: Program }

export type FBORecord = {
    particlesFBO: DoubleFBO,
    pressureFBO: DoubleFBO,
    divergenceFBO: DoubleFBO,
    velocityFBO: DoubleFBO,
    dyeFBO: DoubleFBO,
    imageFBO: DoubleFBO,

    prevParticlesFBO: FBO,
    temp: FBO,
}

export type VisField = 'velocity' | 'pressure' | 'particles' | 'dye' | 'image'

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
    regenerateParticles: boolean, // whether to randomly reset particles to their original position

    // dye settings
    addDye: boolean,

    // the image to draw
    image: HTMLImageElement | null,
    // whether to draw the image to the image FBO in the next frame. Needs to be manually set to false afterwards
    drawImage: boolean,
    // whether to screenshot the next frame
    screenshot: boolean,

    // global settings
    colorMode: ColorMode, // ColorMode.Image is only used for particles where image is non-null.
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
    PassThrough = 4,
    // Only used for particles. Whether to color the particles based on an image.
    Image = 5,
}
