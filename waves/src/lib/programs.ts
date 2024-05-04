import { DoubleFBO } from "./classes/DoubleFBO"
import { Shader } from "./classes/Shader"
import { ShaderProgram } from "./classes/ShaderProgram"
import { advectFrag } from "./shaders/simShaders/advection.frag"
import { externalForceFrag } from "./shaders/simShaders/externalForce.frag"
import { simpleVert } from "./shaders/simShaders/simple.vert"
import { velocityToColorFrag } from "./shaders/simShaders/velocityToColor.frag"
import { fillColorFrag } from "./shaders/testShaders/fillColor.frag"
import { textureDisplayVert } from "./shaders/testShaders/textureDisplay.vert"
import { textureDisplayFrag } from "./shaders/testShaders/texureDisplay.frag"
import { particlesFrag } from "./shaders/visShaders/particles.frag"
import { particlesVert } from "./shaders/visShaders/particles.vert"

export const makePrograms = (gl: WebGL2RenderingContext): { [key in string]: ShaderProgram } => {
    
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
        // draws particles
        particleProgram,
    }
}

export const makeFBOs = (gl: WebGL2RenderingContext): { [key in string]: DoubleFBO } => {
    const fillColorFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const externalForceFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
    const advectionFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)

    return {
        fillColorFBO,
        externalForceFBO,
        advectionFBO,
    }
}