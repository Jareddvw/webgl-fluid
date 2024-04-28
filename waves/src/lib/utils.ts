import { FBO } from "./classes/FBO"

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