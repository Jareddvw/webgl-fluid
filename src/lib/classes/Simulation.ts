import { ColorMode, SimulationSettings } from "../utils/types";
import { colors } from "../utils/utils";
import { Renderer } from "./Renderer";

export class Simulation {
    private texelDims = [0, 0];

    private gl: WebGL2RenderingContext;
    private renderer: Renderer;

    private settings: SimulationSettings;
    private deltaT = 1 / 60;

    constructor(canvas: HTMLCanvasElement, settings: SimulationSettings) {
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        this.gl = gl;
        this.texelDims = [1 / canvas.width, 1 / canvas.height];
        this.settings = settings;

        this.renderer = new Renderer(gl);
        this.resetAll()
    }

    private applyExternalForce() {
        // apply external forces to the simulation, also maybe dye
        const { settings, renderer, gl } = this;
        const fbos = renderer.getFBOs();
        const programs = renderer.getPrograms();
        const { externalForceProgram } = programs;
        const { velocityFBO, dyeFBO } = fbos;
        const { visField, addDye, impulseDirection, impulsePosition, impulseMagnitude, impulseRadius } = settings;
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
            renderer.drawQuad(dyeFBO.writeFBO)
            dyeFBO.swap()
        } else {
            renderer.drawQuad(velocityFBO.writeFBO)
            velocityFBO.swap()
        }
    }


    private advect() {
        const { settings, texelDims, deltaT, renderer } = this;
        const fbos = renderer.getFBOs();
        const programs = renderer.getPrograms();
        const { advectionProgram, advectParticleProgram } = programs;
        const { particlesFBO, velocityFBO, dyeFBO } = fbos;
        const { visField, gridScale, manualBilerp, advectionDissipation } = settings;
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
            renderer.drawQuad(dyeFBO.writeFBO)
            dyeFBO.swap()
        }
        advectionProgram.setTexture('quantity', velocityFBO.readFBO.texture, 1)
        renderer.drawQuad(velocityFBO.writeFBO)
        velocityFBO.swap()
    
        if (visField === 'particles') {
            // use forward advection for particles. Only advect particles if the user is looking
            advectParticleProgram.use()
            advectParticleProgram.setUniforms({
                dt: deltaT,
                gridScale,
                texelDims,
                velocity: velocityFBO.readFBO.texture,
                quantity: particlesFBO.readFBO.texture,
            })
            renderer.drawQuad(particlesFBO.writeFBO)
            particlesFBO.swap()
        }
    }

    private applyDiffusion() {
        if (!this.settings.applyDiffusion) {
            return
        }
        // apply diffusion to the simulation
        const { settings, renderer, texelDims, deltaT } = this;
        const fbos = renderer.getFBOs();
        const programs = renderer.getPrograms();
        const { jacobiProgram, copyProgram } = programs;
        const { velocityFBO, temp } = fbos;
        const { gridScale, diffusionCoefficient, jacobiIterations } = settings;
        // viscous diffusion with jacobi method
        const alpha = (gridScale * gridScale) / (diffusionCoefficient * deltaT)
        copyProgram.use()
        copyProgram.setTexture('tex', velocityFBO.readFBO.texture, 0)
        renderer.drawQuad(temp)
        jacobiProgram.use()
        jacobiProgram.setUniforms({
            alpha,
            rBeta: 1 / (4 + alpha),
            texelDims,
            bTexture: temp.texture,
        })
        for (let i = 0; i < jacobiIterations; i += 1) {
            jacobiProgram.setTexture('xTexture', velocityFBO.readFBO.texture, 1)
            renderer.drawQuad(velocityFBO.writeFBO)
            velocityFBO.swap()
        }
    }

    private applyBoundary(type: 'velocity' | 'pressure') {
        // apply boundary conditions to the simulation.
        const { renderer, texelDims } = this;
        const fbos = renderer.getFBOs();
        const programs = renderer.getPrograms();
        const { copyProgram, boundaryProgram } = programs;
        const { velocityFBO, pressureFBO, temp } = fbos;
        if (type === 'velocity') {
            copyProgram.use()
            copyProgram.setTexture('tex', velocityFBO.readFBO.texture, 0)
            renderer.drawQuad(temp)
            boundaryProgram.use()
            boundaryProgram.setUniforms({
                scale: -1,
                x: temp.texture,
                texelDims,
            })
            renderer.drawQuad(velocityFBO.readFBO)
        } else {
            copyProgram.use()
            copyProgram.setTexture('tex', pressureFBO.readFBO.texture, 0)
            renderer.drawQuad(temp)
            boundaryProgram.use()
            boundaryProgram.setUniforms({
                scale: 1,
                x: temp.texture,
                texelDims,
            })
            renderer.drawQuad(pressureFBO.readFBO)
        }
    }

    private removeDivergence() {
        const { settings, renderer, texelDims } = this;
        const { divergenceProgram, jacobiProgram, gradientSubtractionProgram } = renderer.getPrograms();
        const { divergenceFBO, pressureFBO, velocityFBO } = renderer.getFBOs();
        const { gridScale, jacobiIterations } = settings;
        // get divergence of velocity field
        divergenceProgram.use()
        divergenceProgram.setUniforms({
            velocity: velocityFBO.readFBO.texture,
            gridScale,
            texelDims,
        })
        renderer.drawQuad(divergenceFBO.writeFBO)
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
            renderer.drawQuad(pressureFBO.writeFBO)
            pressureFBO.swap()
        }

        this.applyBoundary('pressure')

        // u = w - grad(P)
        gradientSubtractionProgram.use()
        gradientSubtractionProgram.setUniforms({
            pressure: pressureFBO.readFBO.texture,
            divergentVelocity: velocityFBO.readFBO.texture,
            halfrdx: 0.5 / gridScale,
            texelDims,
        })
        renderer.drawQuad(velocityFBO.writeFBO)
        velocityFBO.swap()
    }

    private drawParticles() {
        // draw the particles to the screen
        const { renderer, settings } = this;
        const { drawParticleProgram, fadeProgram, copyProgram, fillColorProgram } = renderer.getPrograms();
        const { particlesFBO, velocityFBO, prevParticlesFBO, temp } = renderer.getFBOs();
        const { colorMode, showParticleTrails, particleDensity, particleSize, particleTrailSize } = settings;
        const bgColor = (
            colorMode === ColorMode.Pink ? 
                colors.pink :
                colors.black
        )
        if (showParticleTrails) {
            renderer.drawParticles(
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
            renderer.drawQuad(null)
            renderer.drawQuad(temp)
            fadeProgram.use()
            fadeProgram.setUniforms({
                tex: temp.texture,
                fadeFactor: particleTrailSize,
                bgColor,
            })
            renderer.drawQuad(prevParticlesFBO)
        } else {
            fillColorProgram.use()
            fillColorProgram.setVec4('color', bgColor)
            renderer.drawQuad(null)
            renderer.drawParticles(
                particlesFBO.readFBO.texture,
                velocityFBO.readFBO.texture,
                drawParticleProgram,
                colorMode,
                null,
                particleDensity,
                particleSize
            )
        }
    }

    private drawToScreen() {
        // draw the simulation to the screen
        const { renderer, settings } = this;
        const { colorFieldProgram } = renderer.getPrograms();
        const { dyeFBO, velocityFBO } = renderer.getFBOs();
        const { visField, colorMode } = settings;
        let fieldTexture: WebGLTexture | null = null
        switch (visField) {
            case 'particles':
                this.drawParticles()
                return
            case 'dye':
                fieldTexture = dyeFBO.readFBO.texture
                break
            case 'velocity':
                fieldTexture = velocityFBO.readFBO.texture
                break
            case 'pressure':
                fieldTexture = renderer.getFBOs().pressureFBO.readFBO.texture
                break
        }
        colorFieldProgram.use()
        colorFieldProgram.setUniforms({
            field: fieldTexture,
            colorMode,
        })
        renderer.drawQuad(null)
    }

    halt() {
        // halt the simulation (ie, velocity and pressure go to 0 but dye + particles remain)
        const { renderer } = this;
        const { velocityFBO, pressureFBO, divergenceFBO, temp } = renderer.getFBOs();
        const { fillColorProgram } = renderer.getPrograms();
        fillColorProgram.use()
        fillColorProgram.setVec4('color', colors.black)
        renderer.drawQuad(velocityFBO.writeFBO)
        renderer.drawQuad(pressureFBO.writeFBO)
        renderer.drawQuad(divergenceFBO.writeFBO)
        renderer.drawQuad(temp)
        velocityFBO.swap()
        pressureFBO.swap()
        divergenceFBO.swap()
    }

    resetParticles() {
        // reset the particles
        const { renderer } = this;
        const { particlesFBO, prevParticlesFBO } = renderer.getFBOs();
        const { writeParticleProgram } = renderer.getPrograms();
        writeParticleProgram.use()
        renderer.drawQuad(particlesFBO.writeFBO)
        particlesFBO.swap()
        renderer.drawQuad(prevParticlesFBO)
    }

    resetDye() {
        // reset the dye
        const { renderer } = this;
        const { dyeFBO } = renderer.getFBOs();
        const { fillColorProgram } = renderer.getPrograms();
        fillColorProgram.use()
        fillColorProgram.setVec4('color', colors.black)
        renderer.drawQuad(dyeFBO.writeFBO)
        dyeFBO.swap()
    }

    resetAll() {
        // reset the entire simulation
        this.halt()
        this.resetParticles()
        this.resetDye()
    }

    maybeResize() {
        if (this.renderer.maybeResize()) {
            this.texelDims = [1 / this.gl.canvas.width, 1 / this.gl.canvas.height]
        }
    }

    step() {
        this.maybeResize()
        this.applyExternalForce()
        this.advect()
        this.applyDiffusion()
        this.applyBoundary('velocity')
        this.removeDivergence()
        this.drawToScreen()
    }

    updateSettings(newSettings: Partial<SimulationSettings>) {
        this.settings = { ...this.settings, ...newSettings };
    }
}