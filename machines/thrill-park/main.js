// Entry point for the standalone thrill-park page.
import config from './config.js';
import skin from './skin.js';
import { startMachine } from '../../ui/shell.js';
startMachine(config, skin);
