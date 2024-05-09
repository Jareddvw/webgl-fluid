/**
 * The main simulation logic.
 */

import { makeFBOs, makePrograms } from './lib/programs'
import { colors, draw, drawLines, drawParticles, getFPS, solvePoisson } from './lib/utils'
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
const gridScale = 0.8
const JACOBI_ITERATIONS = 30
const DIFFUSION_COEFFICIENT = 1.0
const DIFFUSE = false

const ADVECT_PARTICLES = true
let DRAW_PARTICLES = false

type Field = 'velocity' | 'pressure' | 'particles'
const selectedField = document.getElementById('field') as HTMLSelectElement

const bilerpCheckbox = document.getElementById('bilerp') as HTMLInputElement

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
        const normalizedDiff = (len === 0 || len < 0.002) ? [0, 0] : [diff[0] / len, diff[1] / len]
        impulseDirection = normalizedDiff
        lastMousePos =  [x, y]
        impulsePosition = [x, y]
        impulseMagnitude = 1
        impulseRadius = .0002
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
    boundaryProgram,
    advectParticleProgram
} = makePrograms(gl)

const {
    particlesFBO,
    divergenceFBO,
    pressureFBO,
    velocityFBO,
} = makeFBOs(gl)

// Make a fullscreen black quad texture as a starting point
fillColorProgram.use()
gl.uniform4fv(fillColorProgram.uniforms.color, colors.black)
draw(gl, velocityFBO.writeFBO)
draw(gl, particlesFBO.writeFBO)
velocityFBO.swap()

writeParticleProgram.use()
draw(gl, particlesFBO.writeFBO)
particlesFBO.swap()

let inputFBO = velocityFBO.readFBO
let prev = performance.now()

// TODO: draw lines in the direction of the velocity field.

const render = (now: number) => {
    if (selectedField.value === 'particles') {
        DRAW_PARTICLES = true
    } else {
        DRAW_PARTICLES = false
    }
    const diff = now - prev
    const deltaT = diff === 0 ? 0.016 : (now - prev) / 1000
    prev = now
    const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height]

    // External force shader
    externalForceProgram.use()
    externalForceProgram.setUniforms({
        impulseDirection,
        impulsePosition,
        impulseMagnitude,
        impulseRadius,
        aspectRatio: gl.canvas.width / gl.canvas.height,
        velocity: velocityFBO.readFBO.texture,
    })
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()
    inputFBO = velocityFBO.readFBO
    
    // Advection shader
    advectionProgram.use()
    advectionProgram.setUniforms({
        dt: deltaT,
        gridScale,
        texelDims,
        useBilerp: bilerpCheckbox.checked ? 1 : 0,
        velocity: inputFBO.texture,
        quantity: inputFBO.texture,
    })
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()

    if (ADVECT_PARTICLES) {
        advectParticleProgram.use()
        advectParticleProgram.setUniforms({
            dt: deltaT,
            gridScale,
            texelDims,
            velocity: velocityFBO.readFBO.texture,
            quantity: particlesFBO.readFBO.texture,
        })
        draw(gl, particlesFBO.writeFBO)
        particlesFBO.swap()
    }

    boundaryProgram.use()
    boundaryProgram.setUniforms({
        scale: -1,
        x: velocityFBO.readFBO.texture,
        texelDims,
        threshold: 0.001,
    })
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()

    boundaryProgram.use()
    boundaryProgram.setUniforms({
        scale: 1,
        x: pressureFBO.readFBO.texture,
        texelDims
    })
    draw(gl, pressureFBO.writeFBO)
    pressureFBO.swap()

    

    // Solve for viscous diffusion with jacobi method
    if (DIFFUSE) {
        const alpha = (gridScale * gridScale) / (DIFFUSION_COEFFICIENT * deltaT)
        jacobiProgram.use()
        jacobiProgram.setUniforms({
            alpha,
            rBeta: 1 / (4 + alpha),
            texelDims,
            bTexture: velocityFBO.readFBO.texture,
        })
        for (let i = 0; i < JACOBI_ITERATIONS; i++) {
            jacobiProgram.setTexture('xTexture', velocityFBO.readFBO.texture, 1)
            draw(gl, velocityFBO.writeFBO)
            velocityFBO.swap()
        }
        inputFBO = velocityFBO.readFBO
    }

    // get divergence of velocity field
    divergenceProgram.use()
    divergenceProgram.setUniforms({
        velocity: inputFBO.texture,
        gridScale,
        texelDims,
    })
    draw(gl, divergenceFBO.writeFBO)
    divergenceFBO.swap()

    // solve for pressure
    jacobiProgram.use()
    jacobiProgram.setUniforms({
        alpha: -gridScale * gridScale,
        rBeta: 0.25,
        texelDims,
        bTexture: divergenceFBO.readFBO.texture,
    })
    for (let i = 0; i < JACOBI_ITERATIONS; i++) {
        jacobiProgram.setTexture('xTexture', pressureFBO.readFBO.texture, 1)
        draw(gl, pressureFBO.writeFBO)
        pressureFBO.swap()
    }

    // u = w - grad(P)
    gradientSubtractionProgram.use()
    gradientSubtractionProgram.setUniforms({
        pressure: pressureFBO.readFBO.texture,
        divergentVelocity: inputFBO.texture,
        halfrdx: 0.5 / gridScale,
        texelDims,
    })
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()
    inputFBO = velocityFBO.readFBO

    if (DRAW_PARTICLES) {
        drawParticles(
            gl,
            particlesFBO.readFBO.texture, 
            inputFBO.texture,
            particleProgram,
            null
        )
    } else {
        colorVelProgram.use()
        switch (selectedField.value as Field) {
            case 'velocity':
                colorVelProgram.setTexture('velocity', inputFBO.texture, 0)
                break;
            case 'pressure':
                colorVelProgram.setTexture('velocity', pressureFBO.readFBO.texture, 0)
                break;
        }
        draw(gl, null)
    }
    
    fpsDiv.innerText = `FPS: ${getFPS().toPrecision(3)}`
    requestAnimationFrame(render)
}

render(prev)