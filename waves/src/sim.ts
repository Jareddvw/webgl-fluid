/**
 * The main simulation logic.
 */

import { makeFBOs, makePrograms } from './lib/programs'
import { colors, draw, drawParticles, getFPS } from './lib/utils'
import './style.css'

const canvas = document.getElementById('waves') as HTMLCanvasElement
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

const fpsDiv = document.getElementById('fps') as HTMLDivElement

if (!canvas) {
    throw new Error('No canvas found')
}
const gl = canvas.getContext('webgl2')
if (!gl) {
    throw new Error('WebGL2 not supported')
}
const gridScale = 0.5
const JACOBI_ITERATIONS = 40
const DIFFUSION_COEFFICIENT = 0.001
const ADVECT_PARTICLES = true

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
        impulseRadius = .0005
    }
})
window.addEventListener('mouseup', () => {
    mouseDown = false
    impulseMagnitude = 0
    impulseRadius = 0
})

gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)

const {
    fillColorProgram,
    externalForceProgram,
    advectionProgram,
    colorVelProgram,
    writeParticleProgram,
    particleProgram,
} = makePrograms(gl)

const {
    fillColorFBO,
    externalForceFBO,
    advectionFBO,
    particlesFBO,
} = makeFBOs(gl)

// Make a fullscreen black quad texture as a starting point
fillColorProgram.use()
gl.uniform4fv(fillColorProgram.uniforms.color, colors.black)
draw(gl, fillColorFBO.getWriteFBO())
fillColorFBO.swap()

writeParticleProgram.use()
draw(gl, particlesFBO.getWriteFBO())
particlesFBO.swap()

let inputFBO = fillColorFBO.getReadFBO()
let time = performance.now()

const render = (now: number) => {
    const deltaT = (now - time) / 1000
    time = now
    // Advection shader
    advectionProgram.use()
    // set dt, gridScale, and texelDims
    gl.uniform1f(advectionProgram.uniforms.dt, deltaT)
    gl.uniform1f(advectionProgram.uniforms.gridScale, gridScale)
    gl.uniform2fv(advectionProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
    gl.uniform1i(advectionProgram.uniforms.useBilerp, 1)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    gl.uniform1i(advectionProgram.uniforms.velocity, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    gl.uniform1i(advectionProgram.uniforms.quantity, 1)

    draw(gl, advectionFBO.getWriteFBO())
    advectionFBO.swap()

    if (ADVECT_PARTICLES) {
        gl.bindTexture(gl.TEXTURE_2D, particlesFBO.getReadFBO().texture)
        gl.uniform1i(advectionProgram.uniforms.quantity, 1)

        draw(gl, particlesFBO.getWriteFBO())
        particlesFBO.swap()
    }

    // inputFBO = advectionFBO.getReadFBO()

    // External force shader
    externalForceProgram.use()
    gl.uniform2fv(externalForceProgram.uniforms.force, force)
    gl.uniform2fv(externalForceProgram.uniforms.impulsePosition, impulsePosition)
    gl.uniform1f(externalForceProgram.uniforms.impulseMagnitude, impulseMagnitude)
    gl.uniform1f(externalForceProgram.uniforms.impulseRadius, impulseRadius)
    gl.uniform1f(externalForceProgram.uniforms.aspectRatio, gl.canvas.width / gl.canvas.height)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, advectionFBO.getReadFBO().texture)
    gl.uniform1i(externalForceProgram.uniforms.velocity, 0)

    draw(gl, externalForceFBO.getWriteFBO())
    externalForceFBO.swap()
    inputFBO = externalForceFBO.getReadFBO()

    // Render the velocity texture to the screen
    // colorVelProgram.use()
    // gl.activeTexture(gl.TEXTURE0)
    // gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    // gl.uniform1i(colorVelProgram.uniforms.velocity, 0)
    // draw(gl, null)

    drawParticles(
        gl,
        particlesFBO.getReadFBO().texture, 
        inputFBO.texture,
        particleProgram,
        null
    )

    fpsDiv.innerText = `FPS: ${getFPS().toPrecision(3)}`
    requestAnimationFrame(render)
}

render(time)