/** A wrapper to make it easier to compile shaders */
export class Shader {
    gl: WebGLRenderingContext;
    type: number;
    source: string;
    shader: WebGLShader;

    constructor(gl: WebGLRenderingContext, type: number, source: string) {
        this.gl = gl
        this.type = type
        this.source = source
        const newShader = gl.createShader(type)
        if (!newShader) {
            throw new Error('Error creating shader')
        }
        this.shader = newShader
        gl.shaderSource(this.shader, source)
        gl.compileShader(this.shader)
        if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
            throw new Error(`Error compiling shader: ${gl.getShaderInfoLog(this.shader)}, source: ${source}`)
        }
    }

    getShader(): WebGLShader {
        return this.shader
    }

    getType() {
        return this.type
    }

    getSource() { 
        return this.source
    }
} 