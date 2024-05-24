/**
 * A double-FBO class.
 * This lets us write to one FBO while reading from another,
 * then swap them.
 */

import { FBO } from "./FBO";

export class DoubleFBO {
    gl: WebGL2RenderingContext;
    width: number;
    height: number;
    readFBO: FBO;
    writeFBO: FBO;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl
        this.width = width
        this.height = height
        this.readFBO = new FBO(gl, width, height)
        this.writeFBO = new FBO(gl, width, height)
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