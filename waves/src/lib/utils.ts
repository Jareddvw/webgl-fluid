import { DoubleFBO } from "./classes/DoubleFBO"
import { RenderBufferFBO } from "./classes/RenderBufferFBO"
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

export const maybeResize = (canvas: HTMLCanvasElement, fbos: (DoubleFBO | TextureFBO)[]) => {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        fbos.forEach(fbo => fbo.resize(canvas.width, canvas.height))
    }
}

export function getSupportedFormat (gl: WebGL2RenderingContext, internalFormat: number, format: number, type: number)
{
    if (!supportRenderTextureFormat(gl, internalFormat, format, type))
    {
        switch (internalFormat)
        {
            case gl.R16F:
                return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
                return null;
        }
    }

    return {
        internalFormat,
        format
    }
}

export function supportRenderTextureFormat (gl: WebGL2RenderingContext, internalFormat: number, format: number, type: number) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status == gl.FRAMEBUFFER_COMPLETE;
}

export const getRGBFormat = (gl: WebGL2RenderingContext) => {
    return {
        rgba: getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT),
        rg: getSupportedFormat(gl, gl.RG16F, gl.RG, gl.HALF_FLOAT),
        r: getSupportedFormat(gl, gl.R16F, gl.RED, gl.HALF_FLOAT)
    }
}

let lastCalledTime = 0
let fps = 0

export const getFPS = () => {
    if (!lastCalledTime) {
        lastCalledTime = Date.now()
        fps = 0
        return fps
    }
    const delta = (Date.now() - lastCalledTime) / 1000
    lastCalledTime = Date.now()
    fps = 1 / delta
    return fps
}