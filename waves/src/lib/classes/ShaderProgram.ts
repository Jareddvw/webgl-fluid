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
}