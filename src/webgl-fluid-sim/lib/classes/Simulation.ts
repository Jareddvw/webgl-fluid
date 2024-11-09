import { ColorMode, SimulationSettings } from "../utils/types";
import { colors, makeTextureFromImage } from "../utils/utils";
import { Renderer } from "./Renderer";

export class Simulation {
    private texelDims = [0, 0];

    private gl: WebGL2RenderingContext;
    private renderer: Renderer;

    private settings: SimulationSettings;
    private imageTexture: WebGLTexture | null = null;
    private deltaT = 1 / 60;

    constructor(canvas: HTMLCanvasElement, settings: Partial<SimulationSettings> = {}) {
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        this.gl = gl;
        this.texelDims = [1 / canvas.width, 1 / canvas.height];
        
        // Default settings
        const defaultSettings: SimulationSettings = {
            visField: 'velocity',
            jacobiIterations: 25,
            gridScale: 0.5,
            manualBilerp: true,
            applyDiffusion: false,
            diffusionCoefficient: 1,
            advectionDissipation: 0.001,
            advectBackward: false,
            regenerateParticles: true,
            image: null,
            particleDensity: 0.5,
            showParticleTrails: true,
            particleTrailSize: 0.95,
            particleSize: 1,
            colorMode: ColorMode.Rainbow,
            externalForces: [],
            addDye: false,
            drawImage: false,
            screenshot: false,
            paused: false,
            reset: false,
            halt: false,
            callbacks: {
                postForce: [],
                postAdvect: [],
                postJacobi: [],
                postColor: [],
            },
        };

        this.settings = { ...defaultSettings, ...settings };
        this.renderer = new Renderer(gl);
        this.resetAll();
    }

    private applyExternalForce() {
        // apply external forces to the simulation, also maybe dye
        const { settings, renderer, gl } = this;
        const { externalForceProgram } = renderer.getPrograms();
        const { velocityFBO, dyeFBO } = renderer.getFBOs();
        const { visField, addDye, externalForces } = settings;
        // External force
        externalForceProgram.use()
        externalForceProgram.setUniforms({
            impulseDirections: externalForces.map(f => f.impulseDirection),
            impulsePositions: externalForces.map(f => f.impulsePosition),
            impulseMagnitudes: externalForces.map(f => f.impulseMagnitude),
            impulseRadii: externalForces.map(f => f.impulseRadius),
            impulseCount: externalForces.length,
            aspectRatio: gl.canvas.width / gl.canvas.height,
            velocityTexture: velocityFBO.readFBO.texture,
            impulseTypes: externalForces.map(f => f.impulseType),
        }, {
            impulseDirections: 'vec2Array',
            impulsePositions: 'vec2Array',
            impulseMagnitudes: 'floatArray',
            impulseRadii: 'floatArray',
            impulseCount: 'int',
            impulseTypes: 'intArray',
        })
        if (visField === 'dye' && addDye) {
            externalForceProgram.setTexture('velocityTexture', dyeFBO.readFBO.texture, 0)
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
        const { advectionProgram, advectParticleProgram } = renderer.getPrograms();
        const { particlesFBO, velocityFBO, dyeFBO, imageFBO } = renderer.getFBOs();
        const { visField, gridScale, manualBilerp, advectionDissipation, regenerateParticles } = settings;
        advectionProgram.use()
        advectionProgram.setUniforms({
            dt: deltaT,
            gridScale,
            texelDims,
            useBilerp: manualBilerp ? 1 : 0,
            velocity: velocityFBO.readFBO.texture,
            dissipation: advectionDissipation,
        })
        if (visField === 'dye' || visField === 'image') {
            const fbo = visField === 'dye' ? dyeFBO : imageFBO
            advectionProgram.setTexture('quantity', fbo.readFBO.texture, 1)
            renderer.drawQuad(fbo.writeFBO)
            fbo.swap()
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
                regenerateParticles,
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
        const { jacobiProgram, copyProgram } = renderer.getPrograms();
        const { velocityFBO, temp } = renderer.getFBOs();
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
        const { copyProgram, boundaryProgram } = renderer.getPrograms();
        const { velocityFBO, pressureFBO, temp } = renderer.getFBOs();
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
        const { particlesFBO, prevParticlesFBO, temp } = renderer.getFBOs();
        const { colorMode, showParticleTrails, particleDensity, particleSize, particleTrailSize } = settings;
        const bgColor = (
            colorMode === ColorMode.Silk ? 
                colors.deepNavy :
                colors.black
        )
        if (showParticleTrails) {
            renderer.drawParticles(
                particlesFBO.readFBO.texture,
                drawParticleProgram,
                colorMode,
                prevParticlesFBO,
                particleDensity,
                particleSize,
                this.imageTexture
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
                drawParticleProgram,
                colorMode,
                null,
                particleDensity,
                particleSize,
                this.imageTexture
            )
        }
    }

    /**
     * If the user has uploaded an image, draw it to the image FBO.
     */
    private maybeDrawImage() {
        const { settings, renderer } = this;
        const { copyProgram } = renderer.getPrograms();
        const imageFBO = renderer.getFBOs().imageFBO;
        const { image, drawImage } = settings;

        const imageTexture = this.imageTexture;
        if (!image || !drawImage || !imageTexture) {
            return;
        };

        copyProgram.use();
        copyProgram.setTexture('tex', imageTexture, 0);
        renderer.drawQuad(imageFBO.writeFBO);
        imageFBO.swap();
    }

    private drawToScreen() {
        // draw the simulation to the screen
        const { renderer, settings, texelDims } = this;
        const { colorFieldProgram } = renderer.getPrograms();
        const { dyeFBO, velocityFBO, pressureFBO, imageFBO } = renderer.getFBOs();
        const { visField, colorMode: externalColorMode } = settings;
        let fieldTexture: WebGLTexture | null = null;
        const colorMode = visField === 'image' ? ColorMode.PassThrough : externalColorMode
        switch (visField) {
            case 'particles':
                this.drawParticles();
                return;
            case 'dye':
                fieldTexture = dyeFBO.readFBO.texture;
                break;
            case 'velocity':
                fieldTexture = velocityFBO.readFBO.texture;
                break;
            case 'pressure':
                fieldTexture = pressureFBO.readFBO.texture;
                break;
            case 'image':
                fieldTexture = imageFBO.readFBO.texture;
                break;
        }
        colorFieldProgram.use();
        colorFieldProgram.setUniforms({
            field: fieldTexture,
            texelDims,
            colorMode,
        });
        renderer.drawQuad(null);
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
        const { writeParticleProgram, fillColorProgram } = renderer.getPrograms();
        writeParticleProgram.use()
        renderer.drawQuad(particlesFBO.writeFBO)
        particlesFBO.swap()
        fillColorProgram.use()
        fillColorProgram.setVec4('color', colors.black)
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

    resetImage() {
        const { renderer } = this;
        const { imageFBO } = renderer.getFBOs();
        const { fillColorProgram } = renderer.getPrograms();
        fillColorProgram.use()
        fillColorProgram.setVec4('color', colors.black)
        renderer.drawQuad(imageFBO.writeFBO)
        imageFBO.swap()
    }

    resetAll() {
        // reset the entire simulation
        this.halt()
        this.resetParticles()
        this.resetDye()
        this.resetImage()
    }

    maybeResize() {
        if (this.renderer.maybeResize()) {
            this.texelDims = [1 / this.gl.canvas.width, 1 / this.gl.canvas.height]
        }
    }

    public step(deltaT: number = this.deltaT): void {
        this.deltaT = deltaT;
        if (this.settings.paused) return;

        this.maybeResize()
        this.applyExternalForce()
        this.settings.callbacks.postForce.forEach(f => f())
        this.advect()
        this.settings.callbacks.postAdvect.forEach(f => f())
        this.applyDiffusion()
        this.applyBoundary('velocity')
        this.removeDivergence()
        this.settings.callbacks.postJacobi.forEach(f => f())
        this.maybeDrawImage()
        this.drawToScreen()
        this.settings.callbacks.postColor.forEach(f => f())
    }

    public updateSettings(newSettings: Partial<SimulationSettings>): void {
        if (newSettings.image && newSettings.image !== this.settings.image) {
            this.imageTexture = makeTextureFromImage(this.gl, newSettings.image);
        }
        this.settings = { ...this.settings, ...newSettings };
    }

    getFBOs() {
        return this.renderer.getFBOs()
    }

    getPrograms() {
        return this.renderer.getPrograms()
    }

    getSettings() {
        return this.settings
    }
}