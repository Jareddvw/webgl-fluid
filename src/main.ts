import { getSettings, setSettings } from "./controls";
import { Simulation } from "./lib/classes/Simulation";
import { getFpsCallback } from "./lib/utils/utils";
import "./style.css"

const canvas = document.getElementById("waves") as HTMLCanvasElement;
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

addEventListener('resize', () => {
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height
})

if (!canvas) {
    throw new Error('No canvas found')
}

const fpsDiv = document.getElementById('fps') as HTMLDivElement
const getFPS = getFpsCallback()

const simulation = new Simulation(canvas, getSettings());
let prev = performance.now();
const render = (now: number) => {
    const deltaT = (now - prev) === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)

    const fps = getFPS();
    const settings = getSettings();
    const { paused, reset, halt } = settings;
    if (paused) {
        requestAnimationFrame(render);
        return;
    } else if (halt) {
        simulation.halt();
        setSettings({ halt: false });
    } else if (reset) {
        simulation.resetAll();
        setSettings({ reset: false });
    }

    simulation.updateSettings(getSettings());
    simulation.step(deltaT);
    requestAnimationFrame(render);
    fpsDiv.innerText = `FPS: ${fps.toFixed(1)}`
}
requestAnimationFrame(render);