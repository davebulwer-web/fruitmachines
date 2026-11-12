// Entry point for the standalone golden-goal page.
import config from './config.js';
import skin from './skin.js';
import { startMachine } from '../../ui/shell.js';
startMachine(config, skin);
