/**
 * The main simulation logic.
 */
import { getSettings, setSettings } from './controls'
import { getFBOs, getPrograms } from './lib/utils/programs'
import { ColorMode } from './lib/utils/types'
import { colors, draw, drawParticles, getFpsCallback } from './lib/utils/utils'
import './style.css'

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
} = getPrograms(gl)

const {
    particlesFBO,
    divergenceFBO,
    pressureFBO,
    velocityFBO,
    dyeFBO,

    prevParticlesFBO,
    temp: tempTex,
} = getFBOs(gl)

const getFPS = getFpsCallback()

const resetParticles = () => {
    writeParticleProgram.use()
    draw(gl, particlesFBO.writeFBO)
    particlesFBO.swap()

    fillColorProgram.use()
    fillColorProgram.setVec4('color', colors.black)
    draw(gl, prevParticlesFBO)
}
const resetDye = () => {
    fillColorProgram.use()
    fillColorProgram.setVec4('color', colors.black)
    draw(gl, dyeFBO.writeFBO)
    dyeFBO.swap()
}

const haltFluid = () => {
    // Make a fullscreen black quad texture as a starting point
    fillColorProgram.use()
    fillColorProgram.setVec4('color', colors.black)
    draw(gl, velocityFBO.writeFBO)
    draw(gl, pressureFBO.writeFBO)
    draw(gl, divergenceFBO.writeFBO)
    draw(gl, tempTex)
    velocityFBO.swap()
    pressureFBO.swap()
    divergenceFBO.swap()
}
const resetFields = () => {
    haltFluid()
    resetParticles()
    resetDye()
}
resetFields()

let prev = performance.now()

const applyVelocityBoundary = (texelDims: [number, number]) => {
    copyProgram.use()
    copyProgram.setTexture('tex', velocityFBO.readFBO.texture, 0)
    draw(gl, tempTex)
    boundaryProgram.use()
    boundaryProgram.setUniforms({
        scale: -1,
        x: tempTex.texture,
        texelDims,
    })
    draw(gl, velocityFBO.readFBO)
}

const applyPressureBoundary = (texelDims: [number, number]) => {
    copyProgram.use()
    copyProgram.setTexture('tex', pressureFBO.readFBO.texture, 0)
    draw(gl, tempTex)
    boundaryProgram.use()
    boundaryProgram.setUniforms({
        scale: 1,
        x: tempTex.texture,
        texelDims,
    })
    draw(gl, pressureFBO.readFBO)
}

const render = (now: number) => {
    const diff = now - prev
    const deltaT = diff === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)
    prev = now
    const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height] as [number, number]
    const { 
        visField,
        jacobiIterations,
        gridScale,
        manualBilerp,
        rightClick,

        applyDiffusion,
        diffusionCoefficient,

        advectionDissipation,

        particleDensity,
        showParticleTrails,
        advectBackward,
        particleTrailSize,
        particleSize,

        impulseDirection,
        impulsePosition,
        impulseRadius,
        impulseMagnitude,

        colorMode,
        paused,
        reset,
        halt,
    } = getSettings()

    if (paused) {
        requestAnimationFrame(render)
        return
    } else if (halt) {
        haltFluid()
        setSettings({ halt: false })
    } else if (reset) {
        resetFields()
        setSettings({ reset: false })
    }

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
    if (visField === 'dye' && rightClick) {
        externalForceProgram.setTexture('velocity', dyeFBO.readFBO.texture, 0)
        externalForceProgram.setFloat('impulseRadius', 0.0005)
        draw(gl, dyeFBO.writeFBO)
        dyeFBO.swap()
    } else {
        draw(gl, velocityFBO.writeFBO)
        velocityFBO.swap()
    }
    
    // Advection
    advectionProgram.use()
    advectionProgram.setUniforms({
        dt: deltaT,
        gridScale,
        texelDims,
        useBilerp: manualBilerp ? 1 : 0,
        velocity: velocityFBO.readFBO.texture,
        dissipation: advectionDissipation,
    })
    if (visField === 'dye') {
        advectionProgram.setTexture('quantity', dyeFBO.readFBO.texture, 1)
        draw(gl, dyeFBO.writeFBO)
        dyeFBO.swap()
    }
    advectionProgram.setTexture('quantity', velocityFBO.readFBO.texture, 1)
    draw(gl, velocityFBO.writeFBO)
    velocityFBO.swap()

    if (visField === 'particles') {
        if (advectBackward) {
            // use backward advection for particles
            advectionProgram.use()
            advectionProgram.setUniforms({
                dt: -deltaT,
                gridScale,
                texelDims,
                useBilerp: manualBilerp ? 1 : 0,
                velocity: velocityFBO.readFBO.texture,
                quantity: particlesFBO.readFBO.texture,
                dissipation: 0,
            })
            draw(gl, particlesFBO.writeFBO)
            particlesFBO.swap()
        } else {
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
    }

    if (applyDiffusion) {
        // viscous diffusion with jacobi method
        const alpha = (gridScale * gridScale) / (diffusionCoefficient * deltaT)
        jacobiProgram.use()
        jacobiProgram.setUniforms({
            alpha,
            rBeta: 1 / (4 + alpha),
            texelDims,
            bTexture: velocityFBO.readFBO.texture,
        })
        for (let i = 0; i < jacobiIterations; i += 1) {
            jacobiProgram.setTexture('xTexture', velocityFBO.readFBO.texture, 1)
            draw(gl, velocityFBO.writeFBO)
            velocityFBO.swap()
        }
    }

    applyVelocityBoundary(texelDims)

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
    for (let i = 0; i < jacobiIterations; i += 1) {
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

    // visualization
    if (visField === 'particles') {
        if (showParticleTrails) {
            drawParticles(
                gl,
                particlesFBO.readFBO.texture,
                velocityFBO.readFBO.texture,
                particleProgram,
                colorMode,
                prevParticlesFBO,
                particleDensity,
                particleSize
            )
            copyProgram.use()
            copyProgram.setTexture('tex', prevParticlesFBO.texture, 0)
            draw(gl, null)
            draw(gl, tempTex)
            fadeProgram.use()
            fadeProgram.setUniforms({
                tex: tempTex.texture,
                fadeFactor: particleTrailSize,
                bgColor: (
                    colorMode === ColorMode.Pink ? 
                    colors.pink : 
                    colors.black
                )
            })
            draw(gl, prevParticlesFBO)
        } else {
            fillColorProgram.use()
            fillColorProgram.setVec4(
                'color',
                colorMode === ColorMode.Pink ? colors.pink : colors.black
            )
            draw(gl, null)
            drawParticles(
                gl,
                particlesFBO.readFBO.texture,
                velocityFBO.readFBO.texture,
                particleProgram,
                colorMode,
                null,
                particleDensity,
                particleSize
            )
        }
    } else {
        colorVelProgram.use()
        colorVelProgram.setFloat('colorMode', colorMode)
        switch (visField) {
            case 'velocity':
                colorVelProgram.setTexture('velocity', velocityFBO.readFBO.texture, 0)
                break;
            case 'pressure':
                colorVelProgram.setTexture('velocity', pressureFBO.readFBO.texture, 0)
                break;
            case 'dye':
                colorVelProgram.setTexture('velocity', dyeFBO.readFBO.texture, 0)
                break;
        }
        draw(gl, null)
    }

    const fps = getFPS()
    document.getElementById('fps')!.innerText = `FPS: ${fps.toFixed(1)}, iterations: ${jacobiIterations}`
    requestAnimationFrame(render)
}

render(prev)