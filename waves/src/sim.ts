/**
 * The main simulation logic.
 */

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
const REMOVE_DIVERGENCE = true
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
let prev = performance.now()

const render = (now: number) => {
    const diff = now - prev
    const deltaT = diff === 0 ? 0.016 : (now - prev) / 1000
    prev = now
    const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height]
    
    // Advection shader
    advectionProgram.use()
    advectionProgram.setUniforms({
        dt: deltaT,
        gridScale,
        texelDims,
        useBilerp: USE_BILERP ? 1 : 0,
        velocity: inputFBO.texture,
        quantity: inputFBO.texture,
    })
    draw(gl, advectionFBO.getWriteFBO())
    advectionFBO.swap()

    if (ADVECT_PARTICLES) {
        advectionProgram.setTexture('quantity', particlesFBO.getReadFBO().texture, 1)
        draw(gl, particlesFBO.getWriteFBO())
        particlesFBO.swap()
    }

    // External force shader
    externalForceProgram.use()
    externalForceProgram.setUniforms({
        impulseDirection,
        impulsePosition,
        impulseMagnitude,
        impulseRadius,
        aspectRatio: gl.canvas.width / gl.canvas.height,
        velocity: advectionFBO.getReadFBO().texture,
    })
    draw(gl, externalForceFBO.getWriteFBO())
    externalForceFBO.swap()
    inputFBO = externalForceFBO.getReadFBO()

    // Solve for viscous diffusion with jacobi method
    if (DIFFUSE) {
        const alpha = (gridScale * gridScale) / (DIFFUSION_COEFFICIENT * deltaT)
        jacobiProgram.use()
        jacobiProgram.setUniforms({
            alpha,
            rBeta: 1 / (4 + alpha),
            texelDims,
            bTexture: inputFBO.texture,
        })
        let jacobiInputFBO = inputFBO
        for (let i = 0; i < JACOBI_ITERATIONS; i++) {
            jacobiProgram.setTexture('xTexture', jacobiInputFBO.texture, 1)
            draw(gl, jacobiFBO.getWriteFBO())
            jacobiFBO.swap()
            jacobiInputFBO = jacobiFBO.getReadFBO()
        }
        inputFBO = jacobiFBO.getReadFBO()
    }

    // get divergence of velocity field
    divergenceProgram.use()
    divergenceProgram.setUniforms({
        velocity: inputFBO.texture,
        gridScale,
        texelDims,
    })
    draw(gl, divergenceFBO.getWriteFBO())
    divergenceFBO.swap()

    // solve for pressure
    jacobiProgram.use()
    jacobiProgram.setUniforms({
        alpha: -gridScale * gridScale,
        rBeta: 0.25,
        texelDims,
        bTexture: divergenceFBO.getReadFBO().texture,
    })
    for (let i = 0; i < JACOBI_ITERATIONS; i++) {
        jacobiProgram.setTexture('xTexture', pressureFBO.getReadFBO().texture, 1)
        draw(gl, pressureFBO.getWriteFBO())
        pressureFBO.swap()
    }

    // u = w - grad(P)
    gradientSubtractionProgram.use()
    gradientSubtractionProgram.setUniforms({
        pressure: pressureFBO.getReadFBO().texture,
        divergentVelocity: inputFBO.texture,
        halfrdx: 0.5 / gridScale,
        texelDims,
    })
    draw(gl, divergenceFreeFBO.getWriteFBO())
    divergenceFreeFBO.swap()
    inputFBO = divergenceFreeFBO.getReadFBO()

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
        const velocityTexture = inputFBO.texture;
        colorVelProgram.setTexture('velocity', velocityTexture, 0)
        draw(gl, null)
    }
    
    fpsDiv.innerText = `FPS: ${getFPS().toPrecision(3)}`
    requestAnimationFrame(render)
}

render(prev)