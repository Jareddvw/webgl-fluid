import { DoubleFBO } from "../classes/DoubleFBO"
import { ShaderProgram } from "../classes/ShaderProgram"
import { FBO } from "../classes/FBO"

const quadVertices = new Float32Array([
    -1, -1,
    -1, 1,
    1, 1,
    1, -1,
])
let quadBuffer: WebGLBuffer | null = null
const vertexOrder = new Uint16Array([3, 2, 0, 0, 1, 2])
let indexBuffer: WebGLBuffer | null = null

/**
 * Draws a full-screen quad to the given FBO,
 * or, if null, to the screen.
 * 
 * @param fbo The FBO to draw to, or null to draw to the screen.
 */
export const draw = (gl: WebGL2RenderingContext, fbo: FBO | null) => {
    if (fbo) {
        fbo.bind()
    } else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    quadBuffer ??= gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW)

    indexBuffer ??= gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertexOrder, gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
}

let particleBuffer: WebGLBuffer | null = null
let particleIndices = new Float32Array()

export const drawParticles = (
    gl: WebGL2RenderingContext, 
    particleTexture: WebGLTexture,
    velocityTexture: WebGLTexture,
    particleProgram: ShaderProgram,
    colorMode: number,
    fbo: FBO | null,
    // particle density, between 0 and 1
    particleDensity = 0.1,
    // point size, between 1 and 10
    pointSize = 1,
) => {
    if (fbo) {
        fbo.bind()
    } else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    // draw canvas.width * canvas.height number of points
    particleProgram.use()
    const numParticles = gl.canvas.width * gl.canvas.height * particleDensity
    particleProgram.setUniforms({
        particles: particleTexture,
        velocityTexture,
        canvasSize: [gl.canvas.width, gl.canvas.height],
        numParticles,
        colorMode,
        pointSize,
    })
    
    particleBuffer ??= gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
    if (particleIndices.length !== numParticles) {
        particleIndices = new Float32Array(numParticles)
        for (let i = 0; i < numParticles; i += 1) {
            particleIndices[i] = i / particleDensity
        }
    }
    gl.bufferData(gl.ARRAY_BUFFER, particleIndices, gl.STATIC_DRAW)

    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0)

    gl.drawArrays(gl.POINTS, 0, numParticles)
}

export const maybeResize = (canvas: HTMLCanvasElement, fbos: (DoubleFBO | FBO)[]) => {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        fbos.forEach(fbo => fbo.resize(canvas.width, canvas.height))
    }
}

export const getFpsCallback = () => {
    let lastCalledTime = 0
    let totalFrameTimes = 0
    const deltaArray: number[] = []
    const getFPS = () => {
        // use a sliding window to calculate the average fps over the last 60 frames
        const now = performance.now()
        const delta = now - lastCalledTime
        lastCalledTime = now
        deltaArray.push(delta)
        totalFrameTimes += delta
        if (deltaArray.length > 60) {
            totalFrameTimes -= deltaArray.shift() as number
        }
        return 1000 / (totalFrameTimes / deltaArray.length)
    }
    return getFPS
}

export const colors = {
    black: [0.0, 0.0, 0.0, 1.0],
    empty: [0.0, 0.0, 0.0, 0.0],
    white: [1.0, 1.0, 1.0, 1.0],
    purple: [0.6, 0.1, 0.4, 1.0],
    pink: [1.0, 0.0, 1.0, 1.0],
}

export const clamp = (val: number, min: number, max: number) => {
    return Math.min(Math.max(val, min), max)
}


/** Generates a texture that's gl.canvas.width x gl.canvas.height and contains the given image */
export const makeTextureFromImage = (gl: WebGL2RenderingContext, image: HTMLImageElement): WebGLTexture => {
    const texture = gl.createTexture()
    if (!texture) {
        throw new Error('Could not create texture')
    }
    // flip image horizontally
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    return texture
}