import { Shader } from "./Shader";

/** A wrapper around the WegGL2 shader program */
export class Program {
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

    /** Get all the uniforms from the program and fill its map with { name: location } */
    fillUniforms() {
        const count = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS)
        for (let i = 0; i < count; i += 1) {
            const activeUniform = this.gl.getActiveUniform(this.program, i)
            if (!activeUniform) {
                throw new Error('Error getting uniform info')
            }
            const { name } = activeUniform
            const baseName = name.replace(/\[.*?\]$/, '')
            const location = this.gl.getUniformLocation(this.program, name)
            if (!location) {
                throw new Error('Error getting uniform location')
            }
            this.uniforms[baseName] = location
        }
    }

    getProgram() {
        return this.program
    }

    use() {
        this.gl.useProgram(this.program)
    }

    setFloat(name: string, value: number) {
        this.gl.uniform1f(this.uniforms[name], value)
    }

    setBool(name: string, value: boolean) {
        if (value) {
            this.setFloat(name, 1)
        } else {
            this.setFloat(name, 0)
        }
    }

    setVec2(name: string, value: number[]) {
        this.gl.uniform2fv(this.uniforms[name], value)
    }

    setVec4(name: string, value: number[]) {
        this.gl.uniform4fv(this.uniforms[name], value)
    }

    setTexture(name: string, texture: WebGLTexture, index: number) {
        this.gl.activeTexture(this.gl.TEXTURE0 + index)
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.uniform1i(this.uniforms[name], index)
    }

    setFloatArray(name: string, value: number[]) {
        this.gl.uniform1fv(this.uniforms[name], new Float32Array(value))
    }

    setVec2Array(name: string, value: [number, number][]) {
        const flatArray = new Float32Array(value.flat());
        this.gl.uniform2fv(this.uniforms[name], flatArray);
    }

    setInt(name: string, value: number) {
        this.gl.uniform1i(this.uniforms[name], value)
    }

    setUniforms(uniforms: {[key: string]: any}, types?: {[key: string]: string}) {
        let numTextures = 0
        for (const [key, value] of Object.entries(uniforms)) {
            const type = types?.[key]
            if (!this.uniforms[key]) {
                throw new Error(`Uniform '${key}' not found in program:` + JSON.stringify(this.uniforms))
            }
            if (type === 'int') {
                this.setInt(key, value)
            } else if (typeof value === 'number' || type === 'float') {
                this.setFloat(key, value)
            } else if (typeof value === 'boolean' || type === 'bool') {
                this.setBool(key, value)
            } else if (Array.isArray(value)) {
                if (type === 'floatArray') {
                    this.setFloatArray(key, value)
                    continue
                }
                if (type === 'vec2Array') {
                    this.setVec2Array(key, value)
                    continue
                }
                switch (value.length) {
                    case 2:
                        this.setVec2(key, value)
                        break
                    case 4:
                        this.setVec4(key, value)
                        break
                    default:
                        throw new Error(`Unsupported vec length ${value.length} for uniform ${key}`)
                }
            } else if (value instanceof WebGLTexture) {
                this.setTexture(key, value, numTextures)
                numTextures += 1
            }
        }
    }
}