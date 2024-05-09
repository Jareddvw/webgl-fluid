/**
 * A test to check that the external force shader works.
 * We use a shader to fill the texture with a color.
 * Then we use the external force shader to add a force to the texture,
 * then we render the texture to the screen and see if the force was applied.
 */
import { makeFBOs, makePrograms } from '../lib/programs'
import { colors, draw } from '../lib/utils'

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

const {
    fillColorProgram,
    externalForceProgram,
    colorVelProgram,
} = makePrograms(gl)

const {
    fillColorFBO,
    externalForceFBO
} = makeFBOs(gl)

let mouseDown = false
let force = [0, 0]
let lastMousePos = [0, 0]
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
        if (lastMousePos[0] === 0 && lastMousePos[1] === 0) {
            lastMousePos = [x, y]
        }
        const diff = {x: x - lastMousePos[0], y: y - lastMousePos[1]}
        // force direction is the direction of the mouse movement
        force = [diff.x, diff.y]
        lastMousePos =  [x, y]
        impulsePosition = [x, y]
        impulseMagnitude = 1000
        impulseRadius = .0001
    }
})
window.addEventListener('mouseup', () => {
    mouseDown = false
    impulseMagnitude = 0
    impulseRadius = 0
})

// Make a fullscreen purple quad texture as a starting point
fillColorProgram.use()
gl.uniform4fv(fillColorProgram.uniforms.color, colors.black)
draw(gl, fillColorFBO.writeFBO)
fillColorFBO.swap()

// Now we can start using the external force shader, with the purple quad as the input texture
externalForceProgram.use()
gl.uniform2fv(externalForceProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
gl.uniform2fv(externalForceProgram.uniforms.impulsePosition, impulsePosition)
gl.uniform1f(externalForceProgram.uniforms.impulseMagnitude, impulseMagnitude)
gl.uniform1f(externalForceProgram.uniforms.impulseRadius, impulseRadius)
gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, fillColorFBO.readFBO.texture)
gl.uniform1i(externalForceProgram.uniforms.velocity, 0)

draw(gl, externalForceFBO.writeFBO)
externalForceFBO.swap()

const render = () => {
    // maybeResize(canvas, [fillColorFBO, externalForceFBO])

    externalForceProgram.use()
    gl.uniform2fv(externalForceProgram.uniforms.force, force)
    gl.uniform2fv(externalForceProgram.uniforms.impulsePosition, impulsePosition)
    gl.uniform1f(externalForceProgram.uniforms.impulseMagnitude, impulseMagnitude)
    gl.uniform1f(externalForceProgram.uniforms.impulseRadius, impulseRadius)
    gl.uniform1f(externalForceProgram.uniforms.aspectRatio, gl.canvas.width / gl.canvas.height)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, externalForceFBO.readFBO.texture)
    gl.uniform1i(externalForceProgram.uniforms.velocity, 0)

    draw(gl, externalForceFBO.writeFBO)
    externalForceFBO.swap()

    colorVelProgram.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, externalForceFBO.readFBO.texture)
    gl.uniform1i(colorVelProgram.uniforms.velocity, 0)
    draw(gl, null)
    requestAnimationFrame(render)
}

requestAnimationFrame(render)
