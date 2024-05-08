import { Shader } from "./Shader";

/** A wrapper around the WegGL2 shader program */
export class ShaderProgram {
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    shaders: Shader[];
    uniforms: {[key: string]: WebGLUniformLocation} = {}

    constructor(gl: WebGL2RenderingContext, shaders: Shader[]) {
        this.gl = gl
        const newProgram = gl.createProgram()
        if (!newProgram) {
            throw new Error('Error creating program')
        }
        this.program = newProgram
        this.shaders = shaders
        shaders.forEach((shader) => {
            gl.attachShader(this.program, shader.getShader())
        })
        gl.linkProgram(this.program)
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error(`Error linking program: ${gl.getProgramInfoLog(this.program)}`)
        }
        this.fillUniforms()
    }

    /** Get all the uniforms from the program and fill our map with { name: location } */
    fillUniforms() {
        const count = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS)
        for (let i = 0; i < count; i++) {
            const activeUniform = this.gl.getActiveUniform(this.program, i)
            if (!activeUniform) {
                throw new Error('Error getting uniform info')
            }
            const { name } = activeUniform
            const location = this.gl.getUniformLocation(this.program, name)
            if (!location) {
                throw new Error('Error getting uniform location')
            }
            this.uniforms[name] = location
        }
    }

    getProgram() {
        return this.program
    }

    getShaders() {
        return this.shaders
    }

    use() {
        this.gl.useProgram(this.program)
    }

    setFloat(name: string, value: number) {
        this.gl.uniform1f(this.uniforms[name], value)
    }

    setVec2(name: string, value: number[]) {
        this.gl.uniform2fv(this.uniforms[name], value)
    }

    setVec3(name: string, value: number[]) {
        this.gl.uniform3fv(this.uniforms[name], value)
    }

    setTexture(name: string, texture: WebGLTexture, index: number) {
        this.gl.activeTexture(this.gl.TEXTURE0 + index)
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.uniform1i(this.uniforms[name], index)
    }

    setUniforms(uniforms: {[key: string]: any}) {
        let numTextures = 0
        for (const [key, value] of Object.entries(uniforms)) {
            if (typeof value === 'number') {
                this.setFloat(key, value)
            } else if (Array.isArray(value)) {
                if (value.length === 2) {
                    this.setVec2(key, value)
                } else if (value.length === 3) {
                    this.setVec3(key, value)
                }
            } else if (value instanceof WebGLTexture) {
                this.setTexture(key, value, numTextures)
                numTextures += 1
            }
        }
    }
}