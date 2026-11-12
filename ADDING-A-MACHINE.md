# Adding a machine

A machine is a folder in `machines/` plus one line in `machines/index.js`. Most new machines need no engine
code at all: they reuse the trail and the feature kinds with new numbers, names and art.

## 1. Copy a machine

Copy `machines/roll-up/` to `machines/<your-id>/`, then add `'<your-id>'` to `machines/index.js`.
In `config.js` set `id`, `name` and `tagline`.

## 2. Reels and paytable (`config.js`)

- `reels`: one array of stops per reel (3 or 4 reels), listed top to bottom. A stop is a symbol code with an optional trail number: `'LE'`, `'LE2'`, `'QM'`.
- `paytable`: checked in order, first match pays. `'*'` matches anything. `{ pattern: ['CH', 'CH', '*'], pays: 30 }`.
- `stake`, `startCredit`, `jackpot` (no single pay is ever above it), all in pence.
- `holdChance`, `nudgeChance`, `nudgeCounts`: how often holds and nudges are given after a losing spin.
- `symbolNames` (optional): paytable labels, e.g. `{ CH: 'CHERRY' }`.

## 3. The trail (`progression: { type: 'trail' }`)

- `trail.length`, `trail.featureFrom` and `trail.rungs` (`{ rung: featureId }`).
- `trail.heldChance` and `trail.heldPerRung`: the Feature Held lamp.
- `trail.offer`: `'spinOn'` (take or spin on, like Oche Cash) or `'gamble'` (take or gamble, like Roll Up).
- `trail.gamble`: `{ to: 'next', chance: 0.5 }` to gamble up a rung at a time, or `{ to: 'top', chance: { 4: 0.08, ... } }` to gamble straight for the top.
- `questionSymbol` and `questionOptions`: what one or two question marks give (held, numbersInView, boost, skillStop, addAgain, nudges).

Leave `progression` out for a machine with no trail (line wins, holds and nudges only).

## 4. Features (`features: { id: { name, kind, ... } }`)

| kind | What it does | Settings |
| --- | --- | --- |
| `nudges` | Nudges now, or into the nudge bank (kept until used) | `counts`, `bank` |
| `winSpin` | Forces a winning line | `wins`, `multiplier` |
| `ladder` | Cash ladder, collect or gamble (fair) | `entry`, `steps` (or the machine's `ladder.steps`) |
| `boardStop` | A lamp runs round prize segments: random, or a skill stop | `board`, `skill` |
| `freeSpins` | Free spins, with holds and/or a win multiplier | `spins`, `holds`, `multiplier` |
| `mystery` | Runs another feature, may queue a repeat | `picks`, `repeatChance` |
| `streak` | Every free spin wins until the machine ends it | `wins`, `endChance` |
| `jackpot` | Pays the jackpot, may repeat | `repeatChance` |
| `diceBoard` | Snakes and Ladders: roll to improve, collect, or lose | `squares`, `die`, `maxRolls` |
| `loopBoard` | Round-and-round board game with shots, a bank and level prizes | `board`, `shots`, `level` |
| `hiLo` | Number 1 to 12: call higher or lower to climb a cash ladder | `steps`, `low`, `high` |
| `pick` | Pick one of three hidden prizes (cash or a feature) | `boxes`, `prizes` |

Looping boards live in `config.boards` (several features can share one, e.g. with different `shots`).
A board has `name`, `cols` and `rows` (the ring has 2 x (cols + rows) - 4 squares, clockwise from the top left),
`levels` (prizes paid at the end: `{ label, cash }` or `{ label, feature }`) and `squares`: `GO`, a number for cash,
`F:id` a feature won, `N2` nudges to the bank, `S1` an extra shot, `UP` level up, `MISS` lose a shot, `HALF` halve
the bank, `END` end the board, `BUST` lose the bank and end. A feature's `short` name (`'WIN|SPIN'`) labels its square.
While a looping board runs, the shared board screen takes over the top glass; a skin can restyle it with `loopTheme`.

Dice board squares are written as a string: a number is a cash prize, `GO:200` the start square, `L9` and `S2`
a ladder or snake to that square (counting from 0), `LOSE`, and `F:id` a feature square.

## 5. Tune the payout

1. `node sim/feature-values.js --machine <id>`: what each feature pays on average. Higher rungs should pay more.
2. `node sim/simulate.js --machine <id> --plays 1000000`: the payout and where it comes from.
3. Adjust the numbers. Usual levers: `holdChance`, `nudgeChance`, how many numbers the reels carry, `heldChance`, feature prizes.
4. `config.bots` tells the simulated players how to play this machine, e.g. when to take an offer (`takeAt`) or stop rolling a dice board (`diceCollectAt`). The sensible player should play well, because the advertised payout is measured against it.
5. Set `config.test` (`rtp` band and `featureEvery` range) and run `node sim/rtp-test.js`. It also fails if gambling or lazy play beats sensible play.

## 6. The top glass (`skin.js`)

The shared screen draws the paytable, reels, meters and buttons and plays every engine event. The skin draws
the top glass (y 3 to 232) from `g.disp` (trail, held lamp, running lamp, dice board state, banner) using the
helpers on `g`: `text`, `rect`, `frameBox`, `disc`, `blink`, `drawBanner`, `bannerBox`, `heldLamp`, `lampsLadder`.
Optional settings: `display` (segment display colours `{ on, off, bg }`), `loopIcons` (pictures for board squares),
`featureIcons` (pictures for feature panels). Optional hooks: `message(m, g)` for the display text, `onEvent(e, g)` to take over an event, `controls(m, g)` for buttons, `leds(g)` for the meters.

## 7. Art (`art.js`)

Map image keys to files. `sym_XX` replaces the placeholder for reel symbol `XX`; anything else is for the skin
(`g.images.key`). Make sprites with `python3 -I art/gen.py <out.png> <w> <h> "<description>"` (needs `PIXELLAB_API_KEY`).
Keep lettering out of AI art and draw it with the bitmap font instead.

## 8. Build

Add the machine to `MACHINES` in `ui/arcade.js`, then `node build.mjs`. You get `dist/<id>.html` and the machine in the arcade.

## A new kind of feature or trail

Write `engine/features/<kind>.js` (or `engine/progressions/<type>.js`) and list it in `engine/registry.js`.
A feature exports `start(m, f, id, events)`, and can add `init(m)` and `phases`. A phase says whether play is
allowed in it (`play: 'paid' | 'free' | false`), its `actions` (each `(m, arg, events)`), and a `bot(m, profile)`
that the simulator uses to choose an action. Finish with `m.afterFeature(events)`. `diceBoard.js` is a good model.
Then add any new events to `ui/shell.js` (playback) and the phase's buttons to `controlsFor` there.


## Taxi squares, Cash Pot and Repeat chance (added for Night Cab)
- Loop board squares `TAXI` (skill-stop lamp round the board, ride to where you stop it) and `POT` (wins the cash pot into the bank). Give them pictures with `loopIcons.taxi` / `loopIcons.pot` and colours with `loopTheme.taxi` / `loopTheme.pot`.
- `cashPot: { start, add, addChance, max }` in the config gives the machine a pot that grows after losing plays. Win it with a POT square, a feature `{ kind: 'cashPot' }`, or a ? option naming that feature id. The skin reads `g.disp.cashPot` to show it.
- `repeat: { from, chance, sources }` gives a repeat chance on any win of at least `from` pence (reel wins by default). The skin can show a lamp from `g.disp.repeat` ('try' or 'won').
- A ? option can now be any feature id; that feature plays straight away.


## Steppers, Penalty and the dice board screen (added for Golden Goal)
- `{ kind: 'stepper', steps, multiplier, button }`: the reels step up and down on their own; the player presses the button while a win shows. Uses the core skill-stop lamp (kind 'stepper').
- `repeat: { from, feature: 'penalty' }` with `{ kind: 'penalty', chance }`: big reel wins earn a spot kick (phase 'penalty', action shoot 0/1/2). The panel uses the art keys `keeper` and `ball` if the machine has them.
- Dice boards (`kind: 'diceBoard'`) can share squares from `config.boards[id]` (with `name`, `maxRolls`, `words` for the ladder/snake/lose banners) and start further up with `start`. They now have a big screen, ui/dice-board.js, styled with `skin.diceTheme` and `skin.diceIcons`.
- Bots may return `[action, arg]`.
- New machines must be imported in ui/arcade.js as well as listed in machines/index.js.


## Letter trails and feature selectors (added for Supermarket)
- `trail.keep: true` keeps the trail between games (no Feature Held lamp); `trail.auto: true` starts the top rung's feature as soon as it is reached; `trail.threeNumbersJump: false` stops a number on every reel jumping the trail. Put the letters in `config.trailLetters` for the skin.
- A `boardStop` segment can be `{ label, feature }`: the lamp picks a feature to play.
- Loop board square `DOUBLE` doubles the bank.
