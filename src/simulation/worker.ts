/** 
 * The webworker runs the simulation using OffscreeCanvas,
 * then sends the result back to the main thread.
 */

import { FBO } from "../lib/classes/FBO"
import { getFBOs, getPrograms } from "../lib/utils/programs"
import { SimulationSettings } from "../lib/utils/types"
import { colors, draw, drawParticles } from "../lib/utils/utils"

const gridScale = 1.0
const DIFFUSION_COEFFICIENT = 1.0
const DIFFUSE = false
const ADVECTION_DISSIPATION = 0.1

let settings: SimulationSettings | null = null

self.onmessage = (e: MessageEvent) => {
    console.log('worker received message!')
    if (e.data.canvas) {
        console.log('canvas received!')
        const canvas = e.data.canvas as OffscreenCanvas
        const gl = canvas.getContext('webgl2')
        if (!gl) {
            throw new Error('Failed to get WebGL2 context!')
        }
        runSimulation(gl)
    }
    if (e.data.settings) {
        console.log('settings received!')
        settings = e.data.settings
    }
}

const runSimulation = (gl: WebGL2RenderingContext) => {   
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
    } = getFBOs(gl)
    
    const prevParticlesFBO = new FBO(gl, gl.canvas.width, gl.canvas.height)
    const tempTex = new FBO(gl, gl.canvas.width, gl.canvas.height)
    
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
        if (!settings) {
            requestAnimationFrame(render)
            return
        }
        const diff = now - prev
        const deltaT = diff === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)
        prev = now
        const texelDims = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height] as [number, number]
        const { 
            visField,
            jacobiIterations,
            manualBilerp,
            colorMode,
            particleDensity,
            showParticleTrails,
            particleTrailSize,
            particleSize,
            paused,
            impulseDirection,
            impulsePosition,
            impulseRadius,
            impulseMagnitude,
        } = settings
    
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
            useBilerp: manualBilerp ? 1 : 0,
            velocity: velocityFBO.readFBO.texture,
            quantity: velocityFBO.readFBO.texture,
            dissipation: ADVECTION_DISSIPATION,
        })
        draw(gl, velocityFBO.writeFBO)
        velocityFBO.swap()
    
        if (visField === 'particles') {
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
            for (let i = 0; i < jacobiIterations; i += 1) {
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
    
        applyVelocityBoundary(texelDims)
    
        // visualization
        if (visField === 'particles') {
            console.log('pointSize', particleSize)
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
                    particleSize
                )
            }
        } else {
            colorVelProgram.use()
            switch (visField) {
                case 'velocity':
                    colorVelProgram.setTexture('velocity', velocityFBO.readFBO.texture, 0)
                    break;
                case 'pressure':
                    colorVelProgram.setTexture('velocity', pressureFBO.readFBO.texture, 0)
                    break;
            }
            draw(gl, null)
        }
        
        if (paused) {
            return
        }
        requestAnimationFrame(render)
    }
    
    render(prev)
}