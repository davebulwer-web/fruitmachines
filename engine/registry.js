// Every plug-in the engine knows about. To add a feature kind, write engine/features/<kind>.js
// and list it here; any machine config can then use it with { kind: '<kind>', ... }.
import nudges from './features/nudges.js';
import winSpin from './features/winSpin.js';
import ladder from './features/ladder.js';
import boardStop from './features/boardStop.js';
import freeSpins from './features/freeSpins.js';
import mystery from './features/mystery.js';
import streak from './features/streak.js';
import jackpot from './features/jackpot.js';
import diceBoard from './features/diceBoard.js';
import loopBoard from './features/loopBoard.js';
import hiLo from './features/hiLo.js';
import pick from './features/pick.js';
import cashPot from './features/cashPot.js';
import stepper from './features/stepper.js';
import penalty from './features/penalty.js';
import trail from './progressions/trail.js';

export const featureKinds = { nudges, winSpin, ladder, boardStop, freeSpins, mystery, streak, jackpot, diceBoard, loopBoard, hiLo, pick, cashPot, stepper, penalty };
export const progressions = { trail };
