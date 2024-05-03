/**
 * A double-FBO class.
 * This lets us write to one FBO while reading from another,
 * then swap them.
 */

import { RenderBufferFBO } from "./RenderBufferFBO";

export class DoubleFBO {
    gl: WebGL2RenderingContext;
    width: number;
    height: number;
    readFBO: RenderBufferFBO;
    writeFBO: RenderBufferFBO;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl
        this.width = width
        this.height = height
        this.readFBO = new RenderBufferFBO(gl, width, height)
        this.writeFBO = new RenderBufferFBO(gl, width, height)
    }

    swap() {
        const temp = this.readFBO
        this.readFBO = this.writeFBO
        this.writeFBO = temp
    }

    getReadFBO() {
        return this.readFBO
    }

    getWriteFBO() {
        return this.writeFBO
    }

    bind() {
        this.writeFBO.bind()
    }

    unbind() {
        this.writeFBO.unbind()
    }
}