/**
 * The main simulation logic.
 */
import { getSettings, setSettings } from './controls'
import { FBO } from './lib/classes/FBO'
import { Renderer } from './lib/classes/Renderer'
import { ShaderProgram } from './lib/classes/ShaderProgram'
import { ColorMode } from './lib/utils/types'
import { colors, getFpsCallback } from './lib/utils/utils'
import './style.css'

const canvas = document.getElementById('waves') as HTMLCanvasElement
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

addEventListener('resize', () => {
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height
})

if (!canvas) {
    throw new Error('No canvas found')
}
const gl = canvas.getContext('webgl2')
if (!gl) {
    throw new Error('WebGL2 not supported')
}

const renderer = new Renderer(gl)

const {
    particlesFBO: pFBO,
    divergenceFBO: dFBO,
    pressureFBO: prFBO,
    velocityFBO: vFBO,
    dyeFBO: dyFBO,

    prevParticlesFBO: ppFBO,
    temp: tFBO,
} = renderer.getFBOs()

const {
    fillColorProgram,
    writeParticleProgram,
} = renderer.getPrograms()

const { drawQuad, drawParticles: drawP } = renderer
const draw = (gl: WebGL2RenderingContext, fbo: FBO | null) => {
    drawQuad.call(renderer, fbo)
}
const drawParticles = (
    particleTexture: WebGLTexture,
    velocityTexture: WebGLTexture,
    particleProgram: ShaderProgram,
    colorMode: number,
    fbo: FBO | null,
    particleDensity = 0.1,
    pointSize = 1,
) => {
    drawP.call(renderer, particleTexture, velocityTexture, particleProgram, colorMode, fbo, particleDensity, pointSize)
}

const getFPS = getFpsCallback()

const resetParticles = () => {
    writeParticleProgram.use()
    draw(gl, pFBO.writeFBO)
    pFBO.swap()

    fillColorProgram.use()
    fillColorProgram.setVec4('color', colors.black)
    draw(gl, ppFBO)
}
const resetDye = () => {
    fillColorProgram.use()
    fillColorProgram.setVec4('color', colors.black)
    draw(gl, dyFBO.writeFBO)
    dyFBO.swap()
}

const haltFluid = () => {
    // Make a fullscreen black quad texture as a starting point
    fillColorProgram.use()
    fillColorProgram.setVec4('color', colors.black)
    draw(gl, vFBO.writeFBO)
    draw(gl, prFBO.writeFBO)
    draw(gl, dFBO.writeFBO)
    draw(gl, tFBO)
    vFBO.swap()
    prFBO.swap()
    dFBO.swap()
}
const resetFields = () => {
    haltFluid()
    resetParticles()
    resetDye()
}
resetFields()

let prev = performance.now()

const render = (now: number) => {
    const {
        fillColorProgram,
        externalForceProgram,
        advectionProgram,
        colorFieldProgram,
        writeParticleProgram,
        drawParticleProgram,
        jacobiProgram,
        divergenceProgram,
        gradientSubtractionProgram,
        boundaryProgram,
        copyProgram,
        advectParticleProgram,
        fadeProgram,
    } = renderer.getPrograms()
    
    const {
        particlesFBO,
        divergenceFBO,
        pressureFBO,
        velocityFBO,
        dyeFBO,
    
        prevParticlesFBO,
        temp: tempTex,
    } = renderer.getFBOs()

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

    renderer.maybeResize()
    const diff = now - prev
    const deltaT = diff === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)
    prev = now
    const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height] as [number, number]
    const { 
        visField,
        jacobiIterations,
        gridScale,
        manualBilerp,

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

        addDye,

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
    if (visField === 'dye' && addDye) {
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
            // only use backward advection for particles for really weird behavior lol
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
        const bgColor = (
            colorMode === ColorMode.Pink ? 
                colors.pink :
                colors.black
        )
        if (showParticleTrails) {
            drawParticles(
                particlesFBO.readFBO.texture,
                velocityFBO.readFBO.texture,
                drawParticleProgram,
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
                bgColor,
            })
            draw(gl, prevParticlesFBO)
        } else {
            fillColorProgram.use()
            fillColorProgram.setVec4('color', bgColor)
            draw(gl, null)
            drawParticles(
                particlesFBO.readFBO.texture,
                velocityFBO.readFBO.texture,
                drawParticleProgram,
                colorMode,
                null,
                particleDensity,
                particleSize
            )
        }
    } else {
        colorFieldProgram.use()
        colorFieldProgram.setFloat('colorMode', colorMode)
        if (visField === 'velocity') {
            colorFieldProgram.setTexture('velocity', velocityFBO.readFBO.texture, 0)
        } else if (visField === 'pressure') {
            colorFieldProgram.setTexture('velocity', pressureFBO.readFBO.texture, 0)
        } else if (visField === 'dye') {
            colorFieldProgram.setTexture('velocity', dyeFBO.readFBO.texture, 0)
        }
        draw(gl, null)
    }

    const fps = getFPS()
    document.getElementById('fps')!.innerText = `FPS: ${fps.toFixed(1)}, iterations: ${jacobiIterations}`
    requestAnimationFrame(render)
}

render(prev)


// const simulation = new Simulation(canvas, getSettings());
// const render2 = (time: number) => {
//     const settings = getSettings();
//     const { paused, reset, halt } = settings;
//     if (paused) {
//         requestAnimationFrame(render2);
//         return;
//     } else if (halt) {
//         simulation.halt();
//         setSettings({ halt: false });
//     } else if (reset) {
//         simulation.resetAll();
//         setSettings({ reset: false });
//     }

//     simulation.updateSettings(settings);
//     simulation.step();
//     requestAnimationFrame(render2);
// }
// requestAnimationFrame(render2);
