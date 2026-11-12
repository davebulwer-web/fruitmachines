// Entry point for the standalone roll-up page.
import config from './config.js';
import skin from './skin.js';
import { startMachine } from '../../ui/shell.js';
startMachine(config, skin);
