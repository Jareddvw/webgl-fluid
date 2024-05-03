/** 
 * A framebuffer object wrapper class that uses a render buffer.
 */
export class RenderBufferFBO {
    gl: WebGL2RenderingContext
    width: number
    height: number
    framebuffer: WebGLFramebuffer
    renderBuffer: WebGLRenderbuffer

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl
        this.width = width
        this.height = height
        const newFB = gl.createFramebuffer()
        if (!newFB) {
            throw new Error('Error creating framebuffer')
        }
        this.framebuffer = newFB
        const newRenderBuffer = gl.createRenderbuffer()
        if (!newRenderBuffer) {
            throw new Error('Error creating render buffer')
        }
        this.renderBuffer = newRenderBuffer
        this.attachRenderBuffer()

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Error creating framebuffer')
        }
    }

    attachRenderBuffer() {
        const { gl, framebuffer, renderBuffer, width, height } = this
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer)
        const MAX_SAMPLES = gl.getParameter(gl.MAX_SAMPLES)
        console.log('gl MAX_SAMPLES: ', MAX_SAMPLES)
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, MAX_SAMPLES, gl.RGBA8, width, height)
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderBuffer)
        // check if the framebuffer is complete
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Error creating framebuffer')
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    bind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer)
        this.gl.viewport(0, 0, this.width, this.height)
    }

    unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
    }
}