/**
 * A test to check that the external force shader works.
 * We use a shader to fill the texture with a color.
 * Then we use the external force shader to add a force to the texture,
 * then we render the texture to the screen and see if the force was applied.
 */
import { Shader } from '../lib/classes/Shader'
import { ShaderProgram } from '../lib/classes/ShaderProgram'
import { TextureFBO } from '../lib/classes/TextureFBO'
