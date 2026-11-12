# Fruit Machines

A shared engine for retro UK pub fruit machines (10p a go, holds, nudges, feature trails, gambles,
dice boards) and the series of machines built on it. Play money only.

| Machine | Theme | What makes it different | Payout (sensible player) |
| --- | --- | --- | --- |
| Oche Cash | Pub darts | 12-rung Checkout trail round a dartboard. Offers can be spun on to climb, but only Feature Held keeps them. | 90.8% |
| Roll Up | Funfair | 10-step trail into the Fairground, a looping dice board with money, features, nudges and levels as squares. | 90.8% |

## Play

Open `dist/index.html` (the arcade lobby) or one machine's page, such as `dist/roll-up.html`. They work offline.
Controls: START or Space to play, the buttons under the reels (keys 1 to 3) to hold and to nudge,
C to collect or take, G to gamble or roll, M to mute, Esc back to the lobby.

## Layout

- `engine/`: the game engine. No screen code.
  - `machine.js`: the core (reels, stakes, holds, nudges, pays, running lamps, feature queue, phases and actions)
  - `registry.js`: every plug-in the engine knows
  - `progressions/trail.js`: the number trail that offers features (spin-on or gamble style)
  - `features/*.js`: one file per feature kind (nudges, winSpin, ladder, boardStop, freeSpins, mystery, streak, jackpot, diceBoard, loopBoard, hiLo, pick)
- `machines/<id>/`: one folder per machine
  - `config.js`: reels, paytable, assist rates, trail, features, payout test band (all the maths)
  - `skin.js`: draws the top glass
  - `art.js`: which images to inline
  - `main.js`: entry point for the machine's own page
  - `art/`: images only this machine uses
- `machines/index.js`: the list of machines (for the build and the payout test)
- `ui/`: the shared cabinet screen (`shell.js`), the 16-segment message display and meters (`segments.js`), the big board screen for looping boards (`loop-board.js`), arcade lobby (`arcade.js`, `arcade.html`), font, sound, placeholder symbols
- `art/`: shared art (the fruit symbol set) and `gen.py`, the Pixellab sprite maker (prompts logged in `art/prompts/`)
- `sim/`: payout simulator, player profiles, feature values and the payout test

## Commands (Node 18 or newer)

- `npm install`, then `node build.mjs`: builds `dist/` (a page per machine, the arcade, and the arcade artifact page)
- `node sim/rtp-test.js`: payout test for every machine (or name one: `node sim/rtp-test.js roll-up`)
- `node sim/simulate.js --machine roll-up --plays 10000000`: full payout report (add `--strategy lazy` or `--strategy gambler`)
- `node sim/feature-values.js --machine roll-up`: the average pay of each feature when taken

To add a machine, read [ADDING-A-MACHINE.md](ADDING-A-MACHINE.md).

## Notes

- 12 Nov 2026: a question mark no longer offers Feature Held when the trail is empty, and the lamp goes out if the trail is empty. To keep the payout near 90%, hold chance went from 12% to 9% and nudge chance from 4% to 3.5% on both machines. The detailed payout figures below are from before that change.

## Oche Cash rules

- Some symbols carry a dart number (1, 2 or 3). After a spin the numbers on the win line add to the 12-rung Checkout trail round the dartboard. A number on all three reels enters the feature at once; three question marks go to the top.
- The trail is at risk: between spins it only survives if the FEATURE HELD lamp lights (30% plus 4% per rung).
- From rung 4 a feature is offered: TAKE it, or SPIN ON to climb. Spinning on and adding nothing loses the trail unless held.
- A single question mark gives a random helper: Feature Held, Numbers in View, Trail Boost, Skill Stop (rungs 1 to 8), Add Again or Nudges.
- Features by rung: 4 Arrows (nudge bank), 5 Double Top (win spin, paid double), 6 Checkout (cash ladder gamble), 7 Round the Board (random stop, up to £4), 8 Treble Top (true skill stop, up to £2), 9 Super Holds (3 free spins with holds), 10 Shanghai (mystery feature with repeat chance), 11 Cash Pot (win streak), 12 Nine Darter (£4 jackpot, 1 in 5 repeat).

Payout, 10 million plays: sensible 90.5% ±0.2%, gambler 79%, lazy 66%. A feature is offered about 1 play in 10 and taken about 1 in 35. £5 lasts a median of about 260 plays.

## Roll Up rules

- Same reel maths and paytable as Oche Cash, with funfair symbols (duck, toffee apple, candy floss, ice cream, coconut, goldfish, ticket, big wheel) and a 10-step trail. From step 5 the Fairground board is offered: TAKE it or GAMBLE up a step at evens (a lost gamble loses the trail).
- Every step enters the same board; higher steps give more tokens (shots): 2, 3, 4, 5, 6 (starting on level 1) and 10 (starting on level 2).
- The Fairground is a loop of 20 squares that takes over the top of the screen. Each ROLL spends a shot and moves the counter round. Cash squares add to the bank, feature squares win Hook a Duck (a win spin), Hi Lo, Coconut Shy (pick a prize), Dodgems (spins paid double) or Free Rides (free spins with holds), NUDGE squares add banked nudges, LEVEL UP climbs the level prizes (20p, a Nudge Bank, Free Rides, £1.50), +1 TOKEN gives a token back, LOSE A TOKEN takes one, HALF BANK halves the bank and END finishes the board. COLLECT ends it at any time.
- When the board ends you get the bank, the level prize, the banked nudges, then each feature you won, one after another.
- Banked nudges stay with you and come up after any losing spin until you use them.

Payout, 5 million plays: sensible 89.7% ±0.3%, gambler 69%, lazy 64%. A board is taken about 1 play in 22.

## Arcade previews
Each machine's lobby screenshot lives in `machines/<id>/preview.png`. After changing a machine's look, refresh them with:
`node build.mjs && node previews.cjs && node build.mjs`

## Big wins
Any win of a quarter of the jackpot or more gets a short BIG WIN show; a jackpot win gets about five seconds of chasing cabinet lights, falling coins, a flashing JACKPOT sign and a tune (ui/shell.js `startParty`/`drawParty`, `sound.jackpot`). It is shared, so every machine gets it.

## Night Cab
Late-night taxi machine. An 8-stop cab route: from stop 5 the City Round board is offered (take it, or spin on for more fares).
The City Round is a looping board with two new squares: **TAXI** (a lamp races round the board and you press STOP to ride to the square you want) and **POT** (wins the Cash Pot).
The **Cash Pot** is a fare meter on the top glass that starts at 20p and may tick up 10p after a losing play, to £4; a ? can also award it, and so can Lost Property.
**Repeat chance:** any reel win of £1.50 or more lights REPEAT and may pay again.
Payout: sensible 91.05%, gambler 84.52%, lazy 69.70%, a feature every 24 plays.

## Golden Goal
Pub football machine. A 10-place league table trail: from place 5 a feature is offered, take it or gamble up a place at evens.
Features by place: **Free Kick** and **Free Kick ×2** (steppers: the reels step up and down, press SHOOT while a win shows),
**Cup Run** and **Cup Run Plus** (snakes and ladders up the pitch: through balls jump forward, tackles knock you back, a red card ends it; collect any time; the last square wins £4), **Hat Trick** free spins and the **Trophy** jackpot.
**Penalty:** any reel win of £1 or more earns a spot kick; shoot left, middle or right and a goal pays the win again.
Payout: sensible 90.18%, gambler 84.79%, lazy 54.85% (Free Kicks reward timing), a feature every 28 plays.
