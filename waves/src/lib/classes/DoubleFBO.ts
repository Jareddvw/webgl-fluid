/**
 * A double-FBO class.
 * This lets us write to one FBO while reading from another,
 * then swap them.
 */

import { TextureFBO } from "./TextureFBO";

export class DoubleFBO {
    gl: WebGL2RenderingContext;
    width: number;
    height: number;
    readFBO: TextureFBO;
    writeFBO: TextureFBO;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl
        this.width = width
        this.height = height
        this.readFBO = new TextureFBO(gl, width, height)
        this.writeFBO = new TextureFBO(gl, width, height)
    }

    swap() {
        const temp = this.readFBO
        this.readFBO = this.writeFBO
        this.writeFBO = temp
    }

    bind() {
        this.writeFBO.bind()
    }

    resize(width: number, height: number) {
        this.width = width
        this.height = height
        this.readFBO.resize(width, height)
        this.writeFBO.resize(width, height)
    }
}