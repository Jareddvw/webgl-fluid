import { getSettings, setSettings } from "./controls";
import { Simulation } from "./lib/classes/Simulation";
import { getFpsCallback } from "./lib/utils/utils";
import "./style.css"

const canvas = document.getElementById("waves") as HTMLCanvasElement;
const MAX_HEIGHT = 1080 / 1.5
const MAX_WIDTH = 1920 / 1.5
const getWidth = () => Math.min(MAX_WIDTH, window.innerWidth)
const getHeight = () => Math.min(MAX_HEIGHT, window.innerHeight)

const setDimensions = () => {
    canvas.width = getWidth()
    canvas.height = getHeight()

    canvas.style.setProperty('width', `${getWidth()}px`)
    canvas.style.setProperty('height', `${getHeight()}px`)
}
setDimensions()

addEventListener('resize', () => {
    setDimensions()
})

if (!canvas) {
    throw new Error('No canvas found')
}

const fpsDiv = document.getElementById('fps') as HTMLDivElement
const getFPS = getFpsCallback()

const saveBlob = function() {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    return function saveData(blob: Blob, fileName: string) {
       const url = window.URL.createObjectURL(blob);
       a.href = url;
       a.download = fileName;
       a.click();
    };
}()

const simulation = new Simulation(canvas, getSettings());
let prev = performance.now();
const render = (now: number) => {
    const deltaT = (now - prev) === 0 ? 0.016 : Math.min((now - prev) / 1000, 0.033)
    prev = now;

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

    const settingsPreStep = getSettings();
    simulation.updateSettings(settingsPreStep);
    simulation.step(deltaT);
    if (settingsPreStep.drawImage) {
        setSettings({ drawImage: false });
    }
    
    if (settings.screenshot) {
        canvas.toBlob(blob => {
            if (!blob) {
                throw new Error('Could not take screenshot')
            }
            saveBlob(blob, 'screenshot.png');
        })
        setSettings({ screenshot: false });
    }

    requestAnimationFrame(render);
    fpsDiv.innerText = `FPS: ${fps.toFixed(1)}`
    if (fps < 50) {
        setSettings({ jacobiIterations: 15 })
    } else if (fps < 60) {
        setSettings({ jacobiIterations: 20 })
    } else {
        setSettings({ jacobiIterations: 25 })
    }
}
requestAnimationFrame(render);