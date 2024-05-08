/**
 * The main simulation logic.
 */

import { TextureFBO } from './lib/classes/TextureFBO'
import { makeFBOs, makePrograms } from './lib/programs'
import { colors, draw, drawParticles, getFPS, solvePoisson } from './lib/utils'
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
const JACOBI_ITERATIONS = 30
const DIFFUSION_COEFFICIENT = 1.0
const ADVECT_PARTICLES = false
const DRAW_PARTICLES = false
const USE_BILERP = true
const DIFFUSE = true

let mouseDown = false
let impulseDirection = [0, 0]
let lastMousePos = [0, 0]
let impulsePosition = [0, 0]
let impulseMagnitude = 0
let impulseRadius = 0
window.addEventListener('mousedown', (e) => {
    const x = e.clientX / gl.canvas.width
    const y = 1 - e.clientY / gl.canvas.height
    mouseDown = true
    lastMousePos = [x, y]
})
window.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        const x = e.clientX / gl.canvas.width
        const y = 1 - e.clientY / gl.canvas.height
        const diff = [x - lastMousePos[0], y - lastMousePos[1]]
        // force direction is the direction of the mouse movement
        // normalize diff for direction
        const len = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1])
        const normalizedDiff = (len === 0) ? [0, 0] : [diff[0] / len, diff[1] / len]
        impulseDirection = normalizedDiff
        lastMousePos =  [x, y]
        impulsePosition = [x, y]
        impulseMagnitude = 100
        impulseRadius = .0001
    }
})
window.addEventListener('mouseup', () => {
    mouseDown = false
    impulseMagnitude = 0
    impulseRadius = 0
    impulseDirection = [0, 0]
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
    jacobiProgram,
    divergenceProgram,
    gradientSubtractionProgram,
} = makePrograms(gl)

const {
    fillColorFBO,
    externalForceFBO,
    advectionFBO,
    particlesFBO,
    jacobiFBO,
    divergenceFBO,
    pressureFBO,
    divergenceFreeFBO,
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
    gl.uniform1i(advectionProgram.uniforms.useBilerp, USE_BILERP ? 1 : 0)
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

    // External force shader
    externalForceProgram.use()
    gl.uniform2fv(externalForceProgram.uniforms.impulseDirection, impulseDirection)
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

    // Solve for viscous diffusion with jacobi method
    if (DIFFUSE) {
        // deltaT of 0 can break the simulation, so we set it to 0.016
        const delta = deltaT < 0.001 ? 0.016 : deltaT
        const alpha = (gridScale * gridScale) / (DIFFUSION_COEFFICIENT * delta)
        const rBeta = 1 / (4 + alpha)
        inputFBO = solvePoisson(
            gl,
            jacobiProgram,
            jacobiFBO,
            externalForceFBO.getReadFBO(),
            inputFBO.texture,
            alpha,
            rBeta,
            JACOBI_ITERATIONS
        )
    }

    // get divergence of velocity field
    divergenceProgram.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    gl.uniform1i(divergenceProgram.uniforms.velocity, 0)
    gl.uniform1f(divergenceProgram.uniforms.gridScale, gridScale)
    gl.uniform2fv(divergenceProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
    draw(gl, divergenceFBO.getWriteFBO())
    divergenceFBO.swap()

    // solve for pressure
    const pressureAlpha = -gridScale * gridScale
    const pressureRBeta = 0.25
    jacobiProgram.use()
    gl.uniform1f(jacobiProgram.uniforms.alpha, pressureAlpha)
    gl.uniform1f(jacobiProgram.uniforms.rBeta, pressureRBeta)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, divergenceFBO.getReadFBO().texture)
    gl.uniform1i(jacobiProgram.uniforms.bTexture, 0)
    gl.uniform2fv(jacobiProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
    let pressureInputFBO = pressureFBO.getReadFBO()
    
    for (let i = 0; i < JACOBI_ITERATIONS; i++) {
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, pressureInputFBO.texture)
        gl.uniform1i(jacobiProgram.uniforms.xTexture, 1)
        draw(gl, pressureFBO.getWriteFBO())
        pressureFBO.swap()
        pressureInputFBO = pressureFBO.getReadFBO()
    }

    // subtract grad(P) from w
    gradientSubtractionProgram.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressureInputFBO.texture)
    gl.uniform1i(gradientSubtractionProgram.uniforms.pressure, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
    gl.uniform1i(gradientSubtractionProgram.uniforms.velocity, 1)
    gl.uniform1f(gradientSubtractionProgram.uniforms.halfrdx, 0.5 / gridScale)
    gl.uniform2fv(gradientSubtractionProgram.uniforms.texelDims, [1.0 / gl.canvas.width, 1.0 / gl.canvas.height])
    draw(gl, divergenceFreeFBO.getWriteFBO())
    divergenceFreeFBO.swap()
    // inputFBO = divergenceFreeFBO.getReadFBO()

    if (DRAW_PARTICLES) {
        drawParticles(
            gl,
            particlesFBO.getReadFBO().texture, 
            inputFBO.texture,
            particleProgram,
            null
        )
    } else {
        colorVelProgram.use()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, divergenceFreeFBO.getReadFBO().texture)
        gl.uniform1i(colorVelProgram.uniforms.velocity, 0)
        draw(gl, null)
    }
    
    fpsDiv.innerText = `FPS: ${getFPS().toPrecision(3)}`
    requestAnimationFrame(render)
}

render(time)