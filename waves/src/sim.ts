/**
 * The main simulation logic.
 */

import { TextureFBO } from './lib/classes/TextureFBO'
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
const gridScale = 0.8
let JACOBI_ITERATIONS = 30
const DIFFUSION_COEFFICIENT = 1.0
const DIFFUSE = false
const ADVECTION_DISSIPATION = 0.1

type Field = 'velocity' | 'pressure' | 'particles'
const selectedField = document.getElementById('field') as HTMLSelectElement
const particleLinesCheckbox = document.getElementById('particleLines') as HTMLInputElement
const bilerpCheckbox = document.getElementById('bilerp') as HTMLInputElement
const pauseCheckbox = document.getElementById('pause') as HTMLInputElement
const particleDensityInput = document.getElementById('particleDensity') as HTMLInputElement
const particleTrailSizeInput = document.getElementById('particleTrailSize') as HTMLInputElement
const pointSizeInput = document.getElementById('pointSize') as HTMLInputElement
const colorModeInput = document.getElementById('colorMode') as HTMLInputElement

let DRAW_PARTICLES = selectedField.value === 'particles'
let DRAW_PARTICLE_LINES = particleLinesCheckbox.checked
let PAUSED = pauseCheckbox.checked
let particleDensity = parseFloat(particleDensityInput.value) / 100.0
let particleTrailSize = parseFloat(particleTrailSizeInput.value) / 100.0
let pointSize = Math.max(1, Math.min(5, parseFloat(pointSizeInput.value)))
let FIELD = selectedField.value as Field
let colorMode = Math.max(1, Math.min(5, parseInt(colorModeInput.value, 10)))

particleDensityInput.addEventListener('change', () => {
    particleDensity = parseFloat(particleDensityInput.value) / 100.0
})
particleTrailSizeInput.addEventListener('change', () => {
    particleTrailSize = parseFloat(particleTrailSizeInput.value) / 100.0
})
pointSizeInput.addEventListener('change', () => {
    // clamp point size to [1, 5]
    pointSize = Math.max(1, Math.min(5, parseFloat(pointSizeInput.value)))
})
colorModeInput.addEventListener('change', () => {
    colorMode = Math.max(1, Math.min(5, parseInt(colorModeInput.value, 10)))
})
pauseCheckbox.addEventListener('change', () => {
    if (pauseCheckbox.checked) {
        PAUSED = true
    } else {
        PAUSED = false
        render(performance.now())
    }
})
selectedField.addEventListener('change', () => {
    if (selectedField.value === 'particles') {
        DRAW_PARTICLES = true
    } else {
        DRAW_PARTICLES = false
    }
    if (selectedField.value === 'velocity') {
        FIELD = 'velocity'
    } else if (selectedField.value === 'pressure') {
        FIELD = 'pressure'
    }
    render(performance.now())
})
particleLinesCheckbox.addEventListener('change', () => {
    if (particleLinesCheckbox.checked) {
        DRAW_PARTICLE_LINES = true
    } else {
        DRAW_PARTICLE_LINES = false
    }
})

let mouseDown = false
let impulseDirection = [0, 0]
let lastMousePos = [0, 0]
let impulsePosition = [0, 0]
let impulseMagnitude = 0
let impulseRadius = 0
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX / gl.canvas.width
    const y = 1 - e.clientY / gl.canvas.height
    mouseDown = true
    lastMousePos = [x, y]
})
canvas.addEventListener('mousemove', (e) => {
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
canvas.addEventListener('mouseup', () => {
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
} = makeFBOs(gl)

const prevParticlesFBO = new TextureFBO(gl, gl.canvas.width, gl.canvas.height)
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
    const diff = now - prev
    const deltaT = diff === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)
    prev = now
    const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height] as [number, number]

    // External force
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
    
    // Advection
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

    if (DRAW_PARTICLES) {
        // use forward advection for particles
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

    if (DIFFUSE) {
        // viscous diffusion with jacobi method
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

    // poisson-pressure, laplacian(P) = div(w)
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
                colorMode,
                prevParticlesFBO,
                particleDensity,
                pointSize
            )
            copyProgram.use()
            copyProgram.setTexture('tex', prevParticlesFBO.texture, 0)
            draw(gl, null)
            draw(gl, tempTex)
            fadeProgram.use()
            fadeProgram.setUniforms({
                tex: tempTex.texture,
                fadeFactor: particleTrailSize,
            })
            draw(gl, prevParticlesFBO)
        } else {
            drawParticles(
                gl,
                particlesFBO.readFBO.texture, 
                velocityFBO.readFBO.texture,
                particleProgram,
                colorMode,
                null,
                particleDensity,
                pointSize
            )
        }
    } else {
        colorVelProgram.use()
        switch (FIELD) {
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
    if (PAUSED) {
        return
    }
    requestAnimationFrame(render)
}

render(prev)