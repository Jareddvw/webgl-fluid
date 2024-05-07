import { DoubleFBO } from "./classes/DoubleFBO"
import { RenderBufferFBO } from "./classes/RenderBufferFBO"
import { ShaderProgram } from "./classes/ShaderProgram"
import { TextureFBO } from "./classes/TextureFBO"

/**
 * Draws a full-screen quad to the given FBO,
 * or, if null, to the screen.
 * 
 * @param fbo The FBO to draw to, or null to draw to the screen.
 */
export const draw = (gl: WebGL2RenderingContext, fbo: RenderBufferFBO | TextureFBO | null) => {
    if (fbo) {
        fbo.bind()
    } else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    const quadVertices = new Float32Array([
        -1, -1,
        -1, 1,
        1, 1,
        1, -1,
    ])
    const quadBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW)

    const vertexOrder = new Uint16Array([3, 2, 0, 0, 1, 2])
    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertexOrder, gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
}

export const drawParticles = (
    gl: WebGL2RenderingContext, 
    particleTexture: WebGLTexture,
    velocityTexture: WebGLTexture,
    particleProgram: ShaderProgram,
    fbo: RenderBufferFBO | TextureFBO | null,
) => {
    if (fbo) {
        fbo.bind()
    } else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    // draw canvas.width * canvas.height number of points
    particleProgram.use()
    const numParticles = gl.canvas.width * gl.canvas.height
    const indexList = [];
    for (let i = 0; i < numParticles; i++) {
        indexList.push(i)
    }
    const indices = new Float32Array(indexList)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleTexture)
    gl.uniform1i(particleProgram.uniforms.particles, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocityTexture)
    gl.uniform1i(particleProgram.uniforms.velocityTexture, 1)
    gl.uniform2fv(particleProgram.uniforms.canvasSize, [gl.canvas.width, gl.canvas.height])
    // assign an index to each particle with an attribute array

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.POINTS, 0, numParticles)
}

export const maybeResize = (canvas: HTMLCanvasElement, fbos: (DoubleFBO | TextureFBO)[]) => {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        fbos.forEach(fbo => fbo.resize(canvas.width, canvas.height))
    }
}

let lastCalledTime = 0
let fps = 0
const deltaArray: number[] = []

export const getFPS = () => {
    if (!lastCalledTime) {
        lastCalledTime = Date.now()
        fps = 0
        return fps
    }
    const delta = (Date.now() - lastCalledTime) / 1000
    lastCalledTime = Date.now()
    deltaArray.push(delta)
    if (deltaArray.length > 60) {
        deltaArray.shift()
    }
    const sum = deltaArray.reduce((acc, curr) => acc + curr, 0)
    fps = deltaArray.length / sum
    return fps
}

export const colors = {
    purple: [0.6, 0.1, 0.4, 1.0],
    black: [0.0, 0.0, 0.0, 1.0],
    empty: [0.0, 0.0, 0.0, 0.0],
}