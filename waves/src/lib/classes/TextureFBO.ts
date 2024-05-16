
/**
 * A class to create a framebuffer object with a texture attachment
 */
export class TextureFBO {
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
        // console.log(getRGBFormat(gl))
        gl.bindTexture(gl.TEXTURE_2D, texture)
        const color_buffer_float = gl.getExtension('EXT_color_buffer_float')
        if (!color_buffer_float) {
            console.error('No WEBGL_color_buffer_float support')
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null)

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        // use repeat if not enforcing boundary conditions:
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
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

    /** 
     * Resizes the textures
     * and copies the old texture data to the new texture
     */
    resize(width: number, height: number) {
        // TODO: copy the old texture data to the new texture with a copy shader
        const { gl, texture } = this
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        this.width = width
        this.height = height
    }
}