import { advectParticleFrag } from "../shaders/particles/advectParticle.frag";
import { drawParticleFrag } from "../shaders/particles/drawParticles.frag";
import { drawParticlesVert } from "../shaders/particles/drawParticles.vert";
import { fadeFrag } from "../shaders/particles/fade.frag";
import { writeParticlesFrag } from "../shaders/particles/writeParticles.frag";
import { advectFrag } from "../shaders/simulation/advection.frag";
import { boundaryCondVert } from "../shaders/simulation/boundary.vert";
import { boundaryCondFrag } from "../shaders/simulation/boundaryCond.frag";
import { divergenceFrag } from "../shaders/simulation/divergence.frag";
import { externalForceFrag } from "../shaders/simulation/externalForce.frag";
import { fillColorFrag } from "../shaders/simulation/fillColor.frag";
import { gradientSubtractFrag } from "../shaders/simulation/gradientSubtract.frag";
import { jacobiFrag } from "../shaders/simulation/jacobi.frag";
import { passThroughFrag } from "../shaders/simulation/passThrough.frag";
import { passThroughVert } from "../shaders/simulation/passThrough.vert";
import { passThroughWithNeightborsVert } from "../shaders/simulation/passThrough5.vert";
import { fieldToColorFrag } from "../shaders/simulation/fieldToColor.frag";
import { FBORecord, ProgramRecord } from "../utils/types";
import { DoubleFBO } from "./DoubleFBO";
import { FBO } from "./FBO";
import { Shader } from "./Shader";
import { Program } from "./ShaderProgram";


/**
 * Class responsible for making draw calls and 
 * managing fbos and programs.
 */
export class Renderer {
    private gl: WebGL2RenderingContext;
    private fbos: FBORecord;
    private programs: ProgramRecord;

    private quadObjects: {
        quadIndexBuffer: WebGLBuffer | null;
        quadVertexBuffer: WebGLBuffer | null;
        quadIndices: Uint16Array;
        quadVertices: Float32Array;
    }

    private particleObjects: {
        particleBuffer: WebGLBuffer | null;
        particleIndices: Float32Array;
    }

    private prevWidth = 0;
    private prevHeight = 0;

    constructor(gl: WebGL2RenderingContext) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        this.gl = gl;
        this.fbos = this.getFBOs();
        this.programs = this.getPrograms();
        this.prevHeight = gl.canvas.height;
        this.prevWidth = gl.canvas.width;

        this.quadObjects = {
            quadIndexBuffer: gl.createBuffer(),
            quadVertexBuffer: gl.createBuffer(),
            quadIndices: new Uint16Array([3, 2, 0, 0, 1, 2]),
            quadVertices: new Float32Array([
                -1, -1,
                -1, 1,
                1, 1,
                1, -1,
            ])
        }
        if (!this.quadObjects.quadIndexBuffer || !this.quadObjects.quadVertexBuffer) {
            throw new Error('Failed to create buffers')
        }

        this.particleObjects = {
            particleBuffer: gl.createBuffer(),
            particleIndices: new Float32Array()
        }
        if (!this.particleObjects.particleBuffer) {
            throw new Error('Failed to create particle buffer')
        }
    }

    public getFBOs(): FBORecord {
        if (this.fbos) {
            return this.fbos;
        }
        const { gl } = this;
        return {
            particlesFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            pressureFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            divergenceFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            velocityFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            dyeFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            prevParticlesFBO: new FBO(gl, gl.canvas.width, gl.canvas.height),
            temp: new FBO(gl, gl.canvas.width, gl.canvas.height)
        }
    }

    public getPrograms(): ProgramRecord {
        if (this.programs) {
            return this.programs;
        }
        const { gl } = this;
        // vertex shaders
        const passThroughV = new Shader(gl, gl.VERTEX_SHADER, passThroughVert)
        const passThrough5V = new Shader(gl, gl.VERTEX_SHADER, passThroughWithNeightborsVert)
        const particleV = new Shader(gl, gl.VERTEX_SHADER, drawParticlesVert)
        const boundaryV = new Shader(gl, gl.VERTEX_SHADER, boundaryCondVert)

        // programs
        const fillColorF = new Shader(gl, gl.FRAGMENT_SHADER, fillColorFrag)
        const fillColorProgram = new Program(gl, [passThroughV, fillColorF])

        const passThroughF = new Shader(gl, gl.FRAGMENT_SHADER, passThroughFrag)
        const copyProgram = new Program(gl, [passThroughV, passThroughF])

        const externalForceF = new Shader(gl, gl.FRAGMENT_SHADER, externalForceFrag)
        const externalForceProgram = new Program(gl, [passThrough5V, externalForceF])

        const advectionShader = new Shader(gl, gl.FRAGMENT_SHADER, advectFrag)
        const advectionProgram = new Program(gl, [passThrough5V, advectionShader])

        const colorFrag = new Shader(gl, gl.FRAGMENT_SHADER, fieldToColorFrag)
        const colorFieldProgram = new Program(gl, [passThrough5V, colorFrag])

        const drawParticle = new Shader(gl, gl.FRAGMENT_SHADER, drawParticleFrag)
        const drawParticleProgram = new Program(gl, [particleV, drawParticle])

        const jacobiFragShader = new Shader(gl, gl.FRAGMENT_SHADER, jacobiFrag)
        const jacobiProgram = new Program(gl, [passThrough5V, jacobiFragShader])

        const writeParticleFrag = new Shader(gl, gl.FRAGMENT_SHADER, writeParticlesFrag)
        const writeParticleProgram = new Program(gl, [passThrough5V, writeParticleFrag])

        const divergenceFragShader = new Shader(gl, gl.FRAGMENT_SHADER, divergenceFrag)
        const divergenceProgram = new Program(gl, [passThrough5V, divergenceFragShader])

        const gradientSubtraction = new Shader(gl, gl.FRAGMENT_SHADER, gradientSubtractFrag)
        const gradientSubtractionProgram = new Program(gl, [passThrough5V, gradientSubtraction])

        const boundaryFragShader = new Shader(gl, gl.FRAGMENT_SHADER, boundaryCondFrag)
        const boundaryProgram = new Program(gl, [boundaryV, boundaryFragShader])

        const advectParticleFragShader = new Shader(gl, gl.FRAGMENT_SHADER, advectParticleFrag)
        const advectParticleProgram = new Program(gl, [passThrough5V, advectParticleFragShader])

        const fadeFragShader = new Shader(gl, gl.FRAGMENT_SHADER, fadeFrag)
        const fadeProgram = new Program(gl, [passThrough5V, fadeFragShader])

        return {
            // fills the screen with a color
            fillColorProgram,
            // applies an external force to the simulation
            externalForceProgram,
            // advects the simulation
            advectionProgram,
            // copies a texture to a destination
            copyProgram,
            // colors the velocity (or any other) field
            colorFieldProgram,
            // writes initial particles to a texture
            writeParticleProgram,
            // draws particles
            drawParticleProgram,
            // jacobi iteration
            jacobiProgram,
            // divergence of w (divergent velocity field)
            divergenceProgram,
            // calculate grad(P), subtract from w
            gradientSubtractionProgram,
            // boundary conditions
            boundaryProgram,
            // forward advection of particles
            advectParticleProgram,
            // fade the particles
            fadeProgram,
        }
    }

    /**
     * Draws a full-screen quad.
     * @param target The FBO to draw to, or null to draw to the screen.
     */
    public drawQuad(target: FBO | null = null) {
        if (target) {
            target.bind()
        } else {
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
        }
        const { gl, quadObjects } = this;
        const { quadIndexBuffer, quadVertexBuffer, quadIndices, quadVertices } = quadObjects;
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW)

        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }

    /**
     * Draws particles.
     * @param particleTexture The texture containing the particles.
     * @param velocityTexture The texture containing the velocity field.
     * @param colorMode The color mode for the particles.
     * @param target The FBO to draw to, or null to draw to the screen.
     * @param particleDensity The particle density, between 0 and 1.
     * @param pointSize The point size, between 1 and 10.
     */
    public drawParticles(
        particleTexture: WebGLTexture,
        particleProgram: Program,
        colorMode: number,
        target: FBO | null,
        particleDensity = 0.1,
        pointSize = 1,
    ) {
        if (target) {
            target.bind()
        } else {
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
        }
        const { gl, particleObjects } = this;
        const { particleBuffer, particleIndices } = particleObjects;
        const numParticles = gl.canvas.width * gl.canvas.height * particleDensity
        particleProgram.use()
        particleProgram.setUniforms({
            particles: particleTexture,
            canvasSize: [gl.canvas.width, gl.canvas.height],
            colorMode,
            pointSize,
        })

        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
        if (particleIndices.length !== numParticles) {
            const newIndices = new Float32Array(numParticles)
            for (let i = 0; i < numParticles; i += 1) {
                newIndices[i] = i / particleDensity
            }
            this.particleObjects.particleIndices = newIndices
            gl.bufferData(gl.ARRAY_BUFFER, newIndices, gl.STATIC_DRAW)
        } else {
            gl.bufferData(gl.ARRAY_BUFFER, particleIndices, gl.STATIC_DRAW)
        }

        gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)
        gl.drawArrays(gl.POINTS, 0, numParticles)
    }

    public maybeResize() {
        if (this.gl.canvas.width === this.prevWidth && this.gl.canvas.height === this.prevHeight) {
            return false
        }
        const { gl, fbos, programs: { copyProgram } } = this;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // copy the fbos to new ones with the new size
        const newFbos = {
            particlesFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            pressureFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            divergenceFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            velocityFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),
            dyeFBO: new DoubleFBO(gl, gl.canvas.width, gl.canvas.height),

            prevParticlesFBO: new FBO(gl, gl.canvas.width, gl.canvas.height),
            temp: new FBO(gl, gl.canvas.width, gl.canvas.height)
        }
        if (Object.values(newFbos).some(fbo => !fbo)) {
            throw new Error('Failed to create FBOs')
        }
        Object.keys(fbos).forEach((fboType) => {
            const prevFBO = fbos[fboType as keyof FBORecord]
            const newFBO = newFbos[fboType as keyof FBORecord]
            copyProgram.use()
            if (prevFBO instanceof DoubleFBO && newFBO instanceof DoubleFBO) {
                copyProgram.setTexture('tex', prevFBO.readFBO.texture, 0)
                this.drawQuad(newFBO.readFBO)
                copyProgram.setTexture('tex', prevFBO.writeFBO.texture, 0)
                this.drawQuad(newFBO.writeFBO)
            } else if (prevFBO instanceof FBO && newFBO instanceof FBO) {
                copyProgram.setTexture('tex', prevFBO.texture, 0)
                this.drawQuad(newFBO)
            }
        })

        this.fbos = newFbos
        this.prevWidth = gl.canvas.width
        this.prevHeight = gl.canvas.height
        return true;
    }
}