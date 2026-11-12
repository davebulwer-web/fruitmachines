// Entry point for the standalone supermarket page.
import config from './config.js';
import skin from './skin.js';
import { startMachine } from '../../ui/shell.js';
startMachine(config, skin);
