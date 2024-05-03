import { Shader } from './lib/classes/Shader'
import { ShaderProgram } from './lib/classes/ShaderProgram'
import { fillColorFrag } from './lib/shaders/testShaders/fillColor.frag'
import { passThroughVert } from './lib/shaders/testShaders/passThrough.vert'
import './style.css'

const canvas = document.getElementById('waves') as HTMLCanvasElement
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

const gl = canvas.getContext('webgl2')

if (!gl) {
    throw new Error('WebGL2 not supported')
}

const vertexData = new Float32Array([
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
])
const buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)

const passThrough = new Shader(gl, gl.VERTEX_SHADER, passThroughVert);
const fillColor = new Shader(gl, gl.FRAGMENT_SHADER, fillColorFrag);
const fillColorProgram = new ShaderProgram(gl, [passThrough, fillColor]);
fillColorProgram.use();
gl.uniform4fv(fillColorProgram.uniforms.color, [0.6, 0.1, 0.4, 1.0]);

// Get attribute location and enable it
var positionAttributeLocation = gl.getAttribLocation(fillColorProgram.getProgram(), "position");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const texCoordAttributeLocation = gl.getAttribLocation(fillColorProgram.getProgram(), "texCoord");
gl.enableVertexAttribArray(texCoordAttributeLocation);
gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

gl.viewport(0, 0, canvas.width, canvas.height)
console.log('running', gl.canvas.width, gl.canvas.height)
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)
gl.drawArrays(gl.TRIANGLES, 0, 3)