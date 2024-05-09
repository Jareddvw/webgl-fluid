import { DoubleFBO } from "./classes/DoubleFBO"
import { Shader } from "./classes/Shader"
import { ShaderProgram } from "./classes/ShaderProgram"
import { advectFrag } from "./shaders/simShaders/advection.frag"
import { boundaryCondVert } from "./shaders/simShaders/boundary.vert"
import { boundaryCondFrag } from "./shaders/simShaders/boundaryCond.frag"
import { divergenceFrag } from "./shaders/simShaders/divergence.frag"
import { externalForceFrag } from "./shaders/simShaders/externalForce.frag"
import { gradientSubtractFrag } from "./shaders/simShaders/gradientSubtract.frag"
import { jacobiFrag } from "./shaders/simShaders/jacobi.frag"
import { simpleVert } from "./shaders/simShaders/simple.vert"
import { velocityToColorFrag } from "./shaders/simShaders/velocityToColor.frag"
import { fillColorFrag } from "./shaders/testShaders/fillColor.frag"
import { textureDisplayVert } from "./shaders/testShaders/textureDisplay.vert"
import { textureDisplayFrag } from "./shaders/testShaders/texureDisplay.frag"
import { particlesFrag } from "./shaders/visShaders/particles.frag"
import { particlesVert } from "./shaders/visShaders/particles.vert"
import { writeParticlesFrag } from "./shaders/visShaders/writeParticles.frag"

type ProgramRecord = { [key in string]: ShaderProgram }
type FBORecord = { [key in string]: DoubleFBO }


export const makePrograms = (gl: WebGL2RenderingContext): ProgramRecord => {
    
    const passThrough = new Shader(gl, gl.VERTEX_SHADER, textureDisplayVert)
    const fillColor = new Shader(gl, gl.FRAGMENT_SHADER, fillColorFrag)
    const fillColorProgram = new ShaderProgram(gl, [passThrough, fillColor])

    const simpleVertShader = new Shader(gl, gl.VERTEX_SHADER, simpleVert)
    const externalForceShader = new Shader(gl, gl.FRAGMENT_SHADER, externalForceFrag)
    const externalForceProgram = new ShaderProgram(gl, [simpleVertShader, externalForceShader])

    const advectionShader = new Shader(gl, gl.FRAGMENT_SHADER, advectFrag)
    const advectionProgram = new ShaderProgram(gl, [simpleVertShader, advectionShader])

    const copyVert = new Shader(gl, gl.VERTEX_SHADER, textureDisplayVert)
    const copyFrag = new Shader(gl, gl.FRAGMENT_SHADER, textureDisplayFrag)
    const copyProgram = new ShaderProgram(gl, [copyVert, copyFrag])

    const colorFrag = new Shader(gl, gl.FRAGMENT_SHADER, velocityToColorFrag)
    const colorVelProgram = new ShaderProgram(gl, [simpleVertShader, colorFrag])

    const particleVert = new Shader(gl, gl.VERTEX_SHADER, particlesVert)
    const particleFrag = new Shader(gl, gl.FRAGMENT_SHADER, particlesFrag)
    const particleProgram = new ShaderProgram(gl, [particleVert, particleFrag])

    const jacobiFragShader = new Shader(gl, gl.FRAGMENT_SHADER, jacobiFrag)
    const jacobiProgram = new ShaderProgram(gl, [simpleVertShader, jacobiFragShader])

    const writeParticleFrag = new Shader(gl, gl.FRAGMENT_SHADER, writeParticlesFrag)
    const writeParticleProgram = new ShaderProgram(gl, [simpleVertShader, writeParticleFrag])

    const divergenceFragShader = new Shader(gl, gl.FRAGMENT_SHADER, divergenceFrag)
    const divergenceProgram = new ShaderProgram(gl, [simpleVertShader, divergenceFragShader])

    const gradientSubtraction = new Shader(gl, gl.FRAGMENT_SHADER, gradientSubtractFrag)
    const gradientSubtractionProgram = new ShaderProgram(gl, [simpleVertShader, gradientSubtraction])

    const boundaryVertShader = new Shader(gl, gl.VERTEX_SHADER, boundaryCondVert)
    const boundaryFragShader = new Shader(gl, gl.FRAGMENT_SHADER, boundaryCondFrag)
    const boundaryProgram = new ShaderProgram(gl, [boundaryVertShader, boundaryFragShader])

    return {
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
        particleProgram,
        // jacobi iteration
        jacobiProgram,
        // divergence of w (divergent velocity field)
        divergenceProgram,
        // calculate grad(P), subtract from w
        gradientSubtractionProgram,
        // boundary conditions
        boundaryProgram,
    }
}

export const makeFBOs = (gl: WebGL2RenderingContext): FBORecord => {
    const particlesFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const pressureFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const divergenceFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const velocityFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)

    return {
        particlesFBO,
        pressureFBO,
        divergenceFBO,
        velocityFBO,
    }
}