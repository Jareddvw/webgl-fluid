/**
 * Here we'll combine the advection with external force shaders
 * to see what happens.
 */

import { makeFBOs, makePrograms } from '../lib/programs'
import { draw, getFPS } from '../lib/utils'
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
const gridScale = 0.3

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
        impulseMagnitude = 500
        impulseRadius = .0001
    }
})
window.addEventListener('mouseup', () => {
    mouseDown = false
    impulseMagnitude = 0
    impulseRadius = 0
})

gl.clearColor(0.0, 0.0, 0.0, 0.0)
gl.clear(gl.COLOR_BUFFER_BIT)

const {
    fillColorProgram,
    externalForceProgram,
    advectionProgram,
    colorVelProgram
} = makePrograms(gl)

const {
    fillColorFBO,
    externalForceFBO,
    advectionFBO,
} = makeFBOs(gl)

const purple = [0.6, 0.1, 0.4, 1.0]
const black = [0.0, 0.0, 0.0, 1.0]
const empty = [0.0, 0.0, 0.0, 0.0]
// Make a fullscreen purple quad texture as a starting point
fillColorProgram.use()
gl.uniform4fv(fillColorProgram.uniforms.color, empty)
draw(gl, fillColorFBO.getWriteFBO())
fillColorFBO.swap()

let inputFBO = fillColorFBO.getReadFBO()
let time = performance.now()

const render = () => {
    // External force shader
    externalForceProgram.use()
    gl.uniform2fv(externalForceProgram.uniforms.force, force)
    gl.uniform2fv(externalForceProgram.uniforms.impulsePosition, impulsePosition)
    gl.uniform1f(externalForceProgram.uniforms.impulseMagnitude, impulseMagnitude)
    gl.uniform1f(externalForceProgram.uniforms.impulseRadius, impulseRadius)
    gl.uniform1f(externalForceProgram.uniforms.aspectRatio, gl.canvas.width / gl.canvas.height)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    gl.uniform1i(externalForceProgram.uniforms.velocity, 0)

    draw(gl, externalForceFBO.getWriteFBO())
    externalForceFBO.swap()
    // inputFBO = externalForceFBO.getReadFBO()

    // Advection shader
    advectionProgram.use()
    // set dt, rdx, and texelDims
    gl.uniform1f(advectionProgram.uniforms.dt, (performance.now() - time) / 1000)
    gl.uniform1f(advectionProgram.uniforms.gridScale, gridScale)
    gl.uniform2fv(advectionProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, externalForceFBO.getReadFBO().texture)
    gl.uniform1i(advectionProgram.uniforms.velocity, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, externalForceFBO.getReadFBO().texture)
    gl.uniform1i(advectionProgram.uniforms.quantity, 1)

    draw(gl, advectionFBO.getWriteFBO())
    advectionFBO.swap()
    inputFBO = advectionFBO.getReadFBO()

    // Render the velocity texture to the screen
    colorVelProgram.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    gl.uniform1i(colorVelProgram.uniforms.velocity, 0)
    draw(gl, null)

    time = performance.now()
    requestAnimationFrame(render)
}

render()
