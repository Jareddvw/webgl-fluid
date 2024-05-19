import { DoubleFBO } from "../classes/DoubleFBO"
import { Shader } from "../classes/Shader"
import { ShaderProgram } from "../classes/ShaderProgram"
import { advectParticleFrag } from "../shaders/particles/advectParticle.frag"
import { advectFrag } from "../shaders/simulation/advection.frag"
import { boundaryCondVert } from "../shaders/simulation/boundary.vert"
import { boundaryCondFrag } from "../shaders/simulation/boundaryCond.frag"
import { divergenceFrag } from "../shaders/simulation/divergence.frag"
import { externalForceFrag } from "../shaders/simulation/externalForce.frag"
import { gradientSubtractFrag } from "../shaders/simulation/gradientSubtract.frag"
import { jacobiFrag } from "../shaders/simulation/jacobi.frag"
import { passThroughWithNeightborsVert } from "../shaders/simulation/passThrough5.vert"
import { velocityToColorFrag } from "../shaders/simulation/velocityToColor.frag"
import { fillColorFrag } from "../shaders/simulation/fillColor.frag"
import { passThroughVert } from "../shaders/simulation/passThrough.vert"
import { passThroughFrag } from "../shaders/simulation/passThrough.frag"
import { fadeFrag } from "../shaders/particles/fade.frag"
import { drawParticleFrag } from "../shaders/particles/drawParticles.frag"
import { drawParticlesVert } from "../shaders/particles/drawParticles.vert"
import { writeParticlesFrag } from "../shaders/particles/writeParticles.frag"
import { redBlackJacobiFrag } from "../shaders/simulation/redBlackJacobi.frag"

type ProgramRecord = { [key in string]: ShaderProgram }
type FBORecord = { [key in string]: DoubleFBO }

const cachedPrograms = new Map<WebGL2RenderingContext, ProgramRecord>()
const cachedFBOs = new Map<WebGL2RenderingContext, FBORecord>()

/**
 * Get all the programs used in the simulation. If they've already been created,
 * return the existing ones.
 */
export const getPrograms = (gl: WebGL2RenderingContext): ProgramRecord => {
    if (cachedPrograms.has(gl)) {
        return cachedPrograms.get(gl) as ProgramRecord
    }
    // vertex shaders
    const passThroughV = new Shader(gl, gl.VERTEX_SHADER, passThroughVert)
    const passThrough5V = new Shader(gl, gl.VERTEX_SHADER, passThroughWithNeightborsVert)
    const particleV = new Shader(gl, gl.VERTEX_SHADER, drawParticlesVert)
    const boundaryV = new Shader(gl, gl.VERTEX_SHADER, boundaryCondVert)

    // programs
    const fillColorF = new Shader(gl, gl.FRAGMENT_SHADER, fillColorFrag)
    const fillColorProgram = new ShaderProgram(gl, [passThroughV, fillColorF])

    const passThroughF = new Shader(gl, gl.FRAGMENT_SHADER, passThroughFrag)
    const copyProgram = new ShaderProgram(gl, [passThroughV, passThroughF])

    const externalForceShader = new Shader(gl, gl.FRAGMENT_SHADER, externalForceFrag)
    const externalForceProgram = new ShaderProgram(gl, [passThrough5V, externalForceShader])

    const advectionShader = new Shader(gl, gl.FRAGMENT_SHADER, advectFrag)
    const advectionProgram = new ShaderProgram(gl, [passThrough5V, advectionShader])

    const colorFrag = new Shader(gl, gl.FRAGMENT_SHADER, velocityToColorFrag)
    const colorVelProgram = new ShaderProgram(gl, [passThrough5V, colorFrag])

    const drawParticle = new Shader(gl, gl.FRAGMENT_SHADER, drawParticleFrag)
    const drawParticleProgram = new ShaderProgram(gl, [particleV, drawParticle])

    const jacobiFragShader = new Shader(gl, gl.FRAGMENT_SHADER, jacobiFrag)
    const jacobiProgram = new ShaderProgram(gl, [passThrough5V, jacobiFragShader])

    const writeParticleFrag = new Shader(gl, gl.FRAGMENT_SHADER, writeParticlesFrag)
    const writeParticleProgram = new ShaderProgram(gl, [passThrough5V, writeParticleFrag])

    const divergenceFragShader = new Shader(gl, gl.FRAGMENT_SHADER, divergenceFrag)
    const divergenceProgram = new ShaderProgram(gl, [passThrough5V, divergenceFragShader])

    const gradientSubtraction = new Shader(gl, gl.FRAGMENT_SHADER, gradientSubtractFrag)
    const gradientSubtractionProgram = new ShaderProgram(gl, [passThrough5V, gradientSubtraction])

    const boundaryFragShader = new Shader(gl, gl.FRAGMENT_SHADER, boundaryCondFrag)
    const boundaryProgram = new ShaderProgram(gl, [boundaryV, boundaryFragShader])

    const advectParticleFragShader = new Shader(gl, gl.FRAGMENT_SHADER, advectParticleFrag)
    const advectParticleProgram = new ShaderProgram(gl, [passThrough5V, advectParticleFragShader])

    const fadeFragShader = new Shader(gl, gl.FRAGMENT_SHADER, fadeFrag)
    const fadeProgram = new ShaderProgram(gl, [passThrough5V, fadeFragShader])

    const redBlackJacobiFragShader = new Shader(gl, gl.FRAGMENT_SHADER, redBlackJacobiFrag)
    const redBlackJacobiProgram = new ShaderProgram(gl, [passThrough5V, redBlackJacobiFragShader])

    const record = {
        // fills the screen with a color
        fillColorProgram,
        // applies an external force to the simulation
        externalForceProgram,
        // advects the simulation
        advectionProgram,
        // copies a texture to a destination
        copyProgram,
        // renders the velocity texture to the screen
        colorVelProgram,
        // writes initial particles to a texture
        writeParticleProgram,
        // draws particles
        particleProgram: drawParticleProgram,
        // jacobi iteration
        jacobiProgram,
        // red-black jacobi iteration
        redBlackJacobiProgram,
        // divergence of w (divergent velocity field)
        divergenceProgram,
        // calculate grad(P), subtract from w
        gradientSubtractionProgram,
        // boundary conditions
        boundaryProgram,
        // forward advection of particles
        advectParticleProgram,
        // fade the particles
        fadeProgram,
    }
    cachedPrograms.set(gl, record)
    return record
}

export const getFBOs = (gl: WebGL2RenderingContext): FBORecord => {
    if (cachedFBOs.has(gl)) {
        return cachedFBOs.get(gl) as FBORecord
    }
    const particlesFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const pressureFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const divergenceFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const velocityFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)

    const record = {
        particlesFBO,
        pressureFBO,
        divergenceFBO,
        velocityFBO,
    }
    cachedFBOs.set(gl, record)
    return record
}