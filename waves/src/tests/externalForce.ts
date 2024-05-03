/**
 * A test to check that the external force shader works.
 * We use a shader to fill the texture with a color.
 * Then we use the external force shader to add a force to the texture,
 * then we render the texture to the screen and see if the force was applied.
 */
import { DoubleFBO } from '../lib/classes/DoubleFBO'
import { Shader } from '../lib/classes/Shader'
import { ShaderProgram } from '../lib/classes/ShaderProgram'
import { TextureFBO } from '../lib/classes/TextureFBO'
import { externalForceFrag } from '../lib/shaders/simShaders/externalForce.frag'
import { simpleVert } from '../lib/shaders/simShaders/simple.vert'
import { fillColorFrag } from '../lib/shaders/testShaders/fillColor.frag'
import { textureDisplayVert } from '../lib/shaders/testShaders/textureDisplay.vert'
import { textureDisplayFrag } from '../lib/shaders/testShaders/texureDisplay.frag'
import { draw, maybeResize } from '../lib/utils'

import '../style.css'

const canvas = document.getElementById('waves') as HTMLCanvasElement
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

if (!canvas) {
    throw new Error('No canvas found')
}
const gl = canvas.getContext('webgl2')
if (!gl) {
    throw new Error('WebGL2 not supported')
}
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)

const fillColorFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
const passThrough = new Shader(gl, gl.VERTEX_SHADER, textureDisplayVert)
const fillColor = new Shader(gl, gl.FRAGMENT_SHADER, fillColorFrag)
const fillColorProgram = new ShaderProgram(gl, [passThrough, fillColor])

const externalForceFBO = new DoubleFBO(gl, gl.canvas.width, gl.canvas.height)
const simpleVertShader = new Shader(gl, gl.VERTEX_SHADER, simpleVert)
const externalForceShader = new Shader(gl, gl.FRAGMENT_SHADER, externalForceFrag)
const externalForceProgram = new ShaderProgram(gl, [simpleVertShader, externalForceShader])

let mouseDown = false
let impulsePosition = [0, 0]
let impulseMagnitude = 0
let impulseRadius = 0
window.addEventListener('mousedown', () => {
    mouseDown = true
})
window.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        const x = e.clientX / gl.canvas.width
        const y = 1 - e.clientY / gl.canvas.height
        impulsePosition = [x, y]
        impulseMagnitude = .001
        impulseRadius = .0001
    }
})
window.addEventListener('mouseup', () => {
    mouseDown = false
    impulseMagnitude = 0
    impulseRadius = 0
})

// Make a fullscreen quad texture
fillColorProgram.use()
// make the texture purple
gl.uniform4fv(fillColorProgram.uniforms.color, [0.6, 0.1, 0.4, 1.0])
draw(gl, fillColorFBO.getWriteFBO())
fillColorFBO.swap()

// now draw the filled texture to the screen
const quadTexture = new TextureFBO(gl, gl.canvas.width, gl.canvas.height)
const textureVertShader = new Shader(gl, gl.VERTEX_SHADER, textureDisplayVert)
const textureFragShader = new Shader(gl, gl.FRAGMENT_SHADER, textureDisplayFrag)
const textureProgram = new ShaderProgram(gl, [textureVertShader, textureFragShader])
textureProgram.use()

gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, fillColorFBO.getReadFBO().texture)
gl.uniform1i(textureProgram.uniforms.texture, 0)
draw(gl, quadTexture)

externalForceProgram.use()

gl.uniform2fv(externalForceProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
gl.uniform2fv(externalForceProgram.uniforms.impulsePosition, impulsePosition)
gl.uniform1f(externalForceProgram.uniforms.impulseMagnitude, impulseMagnitude)
gl.uniform1f(externalForceProgram.uniforms.impulseRadius, impulseRadius)
gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, fillColorFBO.getReadFBO().texture)
gl.uniform1i(externalForceProgram.uniforms.velocity, 0)

draw(gl, externalForceFBO.getWriteFBO())
externalForceFBO.swap()

const render = () => {
    maybeResize(canvas, [fillColorFBO, externalForceFBO])


    externalForceProgram.use()
    gl.uniform2fv(externalForceProgram.uniforms.impulsePosition, impulsePosition)
    gl.uniform1f(externalForceProgram.uniforms.impulseMagnitude, impulseMagnitude)
    gl.uniform1f(externalForceProgram.uniforms.impulseRadius, impulseRadius)
    gl.uniform1f(externalForceProgram.uniforms.aspectRatio, gl.canvas.width / gl.canvas.height)
    // set the velocity uniform to the texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, externalForceFBO.getReadFBO().texture)
    gl.uniform1i(externalForceProgram.uniforms.velocity, 0)

    // draw to the screen
    draw(gl, null)

    // draw to the FBO so that we have it for the next frame
    draw(gl, externalForceFBO.getWriteFBO())
    externalForceFBO.swap()

    requestAnimationFrame(render)
}

requestAnimationFrame(render)
