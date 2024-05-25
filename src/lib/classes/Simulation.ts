import { getFBOs, getPrograms } from "../utils/programs";
import { FBORecord, ProgramRecord, SimulationSettings } from "../utils/types";

export class Simulation {
    private canvas: HTMLCanvasElement;

    private gl: WebGL2RenderingContext;
    private fbos: FBORecord;
    private programs: ProgramRecord;

    private settings: SimulationSettings;

    constructor(canvas: HTMLCanvasElement, settings: SimulationSettings) {
        this.canvas = canvas;
        this.settings = settings;
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        this.gl = gl;

        // create FBOs and programs
        this.fbos = getFBOs(gl);
        this.programs = getPrograms(gl);
    }

    step() {
        // step the simulation
    }

    resize() {
        // resize the simulation, fbos, canvas, etc.
    }

    updateSettings(settings: Partial<SimulationSettings>) {
        this.settings = { ...this.settings, ...settings };
    }

    draw() {
        // draw the simulation
    }
}