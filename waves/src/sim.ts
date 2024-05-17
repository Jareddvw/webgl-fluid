/**
 * The main simulation logic.
 */

import { TextureFBO } from './lib/classes/TextureFBO'
import { makeFBOs, makePrograms } from './lib/programs'
import { colors, draw, drawLine, drawLines, drawParticles, getFPS } from './lib/utils'
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
let JACOBI_ITERATIONS = 30
const DIFFUSION_COEFFICIENT = 1.0
const DIFFUSE = false
const ADVECTION_DISSIPATION = 0.1

let ADVECT_PARTICLES = false
let DRAW_PARTICLES = false
let DRAW_PARTICLE_LINES = false

type Field = 'velocity' | 'pressure' | 'particles'
const selectedField = document.getElementById('field') as HTMLSelectElement
const particleLinesCheckbox = document.getElementById('particleLines') as HTMLInputElement
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
    boundaryProgram,
    copyProgram,
    advectParticleProgram,
    fadeProgram,
} = makePrograms(gl)

const {
    particlesFBO,
    divergenceFBO,
    pressureFBO,
    velocityFBO,
    prevParticlesFBO
} = makeFBOs(gl)

const tempTex = new TextureFBO(gl, gl.canvas.width, gl.canvas.height)

// Make a fullscreen black quad texture as a starting point
fillColorProgram.use()
gl.uniform4fv(fillColorProgram.uniforms.color, colors.black)
draw(gl, velocityFBO.writeFBO)
draw(gl, particlesFBO.writeFBO)
velocityFBO.swap()

writeParticleProgram.use()
draw(gl, particlesFBO.writeFBO)
particlesFBO.swap()

let prev = performance.now()

const applyVelocityBoundary = (texelDims: [number, number]) => {
    boundaryProgram.use()
    boundaryProgram.setUniforms({
        scale: -1,
        x: velocityFBO.readFBO.texture,
        texelDims,
    })
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()
}

const applyPressureBoundary = (texelDims: [number, number]) => {
    boundaryProgram.use()
    boundaryProgram.setUniforms({
        scale: 1,
        x: pressureFBO.readFBO.texture,
        texelDims
    })
    draw(gl, pressureFBO.writeFBO)
    pressureFBO.swap()
}

// TODO: draw lines in the direction of the velocity field.

const render = (now: number) => {
    if (particleLinesCheckbox.checked) {
        DRAW_PARTICLE_LINES = true
    } else {
        DRAW_PARTICLE_LINES = false
    }
    if (selectedField.value === 'particles') {
        DRAW_PARTICLES = true
        ADVECT_PARTICLES = true
    } else {
        DRAW_PARTICLES = false
        ADVECT_PARTICLES = false
    }
    const diff = now - prev
    const deltaT = diff === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)
    prev = now
    const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height] as [number, number]

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

    applyVelocityBoundary(texelDims)
    
    // Advection shader
    advectionProgram.use()
    advectionProgram.setUniforms({
        dt: deltaT,
        gridScale,
        texelDims,
        useBilerp: bilerpCheckbox.checked ? 1 : 0,
        velocity: velocityFBO.readFBO.texture,
        quantity: velocityFBO.readFBO.texture,
        dissipation: ADVECTION_DISSIPATION,
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

    applyVelocityBoundary(texelDims)

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
        applyVelocityBoundary(texelDims)
    }

    // get divergence of velocity field
    divergenceProgram.use()
    divergenceProgram.setUniforms({
        velocity: velocityFBO.readFBO.texture,
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

    applyPressureBoundary(texelDims)

    // u = w - grad(P)
    gradientSubtractionProgram.use()
    gradientSubtractionProgram.setUniforms({
        pressure: pressureFBO.readFBO.texture,
        divergentVelocity: velocityFBO.readFBO.texture,
        halfrdx: 0.5 / gridScale,
        texelDims,
    })
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()

    applyVelocityBoundary(texelDims)

    // visualization
    if (DRAW_PARTICLES) {
        if (DRAW_PARTICLE_LINES) {
            drawParticles(
                gl,
                particlesFBO.readFBO.texture,
                velocityFBO.readFBO.texture,
                particleProgram,
                3.0,
                prevParticlesFBO.writeFBO,
                0.1
            )
            copyProgram.use()
            copyProgram.setTexture('tex', prevParticlesFBO.writeFBO.texture, 0)
            draw(gl, null)
            draw(gl, tempTex)
            fadeProgram.use()
            fadeProgram.setUniforms({
                tex: tempTex.texture,
                fadeFactor: 0.90,
            })
            draw(gl, prevParticlesFBO.writeFBO)
        } else {
            // fillColorProgram.use()
            // gl.uniform4fv(fillColorProgram.uniforms.color, colors.black)
            // draw(gl, null)
            drawParticles(
                gl,
                particlesFBO.readFBO.texture, 
                velocityFBO.readFBO.texture,
                particleProgram,
                0.0,
                null,
                1.0
            )
        }

    } else {
        colorVelProgram.use()
        switch (selectedField.value as Field) {
            case 'velocity':
                colorVelProgram.setTexture('velocity', velocityFBO.readFBO.texture, 0)
                break;
            case 'pressure':
                colorVelProgram.setTexture('velocity', pressureFBO.readFBO.texture, 0)
                break;
        }
        draw(gl, null)
    }
    
    const fps = getFPS()
    fpsDiv.innerText = `FPS: ${fps.toPrecision(3)}, iterations: ${JACOBI_ITERATIONS}`
    if (fps < 50) {
        JACOBI_ITERATIONS = 15
    } else if (fps < 60) {
        JACOBI_ITERATIONS = 20
    } else if (fps < 70) {
        JACOBI_ITERATIONS = 25
    } else {
        JACOBI_ITERATIONS = 30
    }
    requestAnimationFrame(render)
}

render(prev)