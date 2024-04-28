/** 
 * A framebuffer object wrapper class. We nee to be able to render to 
 * texture to use multiple frgment shaders in a single frame. We;re doing 2d
 * rendering so we don't need to worry about depth buffers.
 */
export class FBO {
    gl: WebGL2RenderingContext
    width: number
    height: number
    framebuffer: WebGLFramebuffer
    texture: WebGLTexture

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl
        this.width = width
        this.height = height
        const newFB = gl.createFramebuffer()
        if (!newFB) {
            throw new Error('Error creating framebuffer')
        }
        this.framebuffer = newFB
        this.texture = this.createTexture()
        this.attachTexture()
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Error creating framebuffer')
        }
    }

    createTexture(): WebGLTexture {
        const { gl, width, height } = this
        const texture = gl.createTexture()
        if (!texture) {
            throw new Error('Error creating texture')
        }
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

        // Set the filtering so we don't need mips and it's not blurry
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return texture
    }

    attachTexture() {
        const { gl, framebuffer, texture } = this
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
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