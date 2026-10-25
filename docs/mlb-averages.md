# MLB averages behind the game

The game's odds come from 2025 MLB regular-season averages wherever the data was available. This page lists every
number, where it came from and how sure we are of it. Each value lives at the top of `js/LongestAtBat.js`.

**Status key**

- **Sourced**: a published 2025 figure.
- **Derived**: calculated from sourced totals.
- **Approximate**: a reasonable estimate that was not checked against a published table. Treat these as the weakest numbers.
- **Game mechanic**: not a league average. A knob that makes the game playable.

## Plate discipline and contact

| Constant | Value | Status | Source |
|---|---|---|---|
| Zone rate | 50.6% of pitches | Sourced | [Baseball Savant, 2025](https://baseballsavant.mlb.com/league?season=2025) |
| Swing rate / zone swing / chase | 47.8% / 66.9% / 28.2% | Sourced | Baseball Savant |
| Zone contact / chase contact | 82.7% / 55.3% | Sourced | Baseball Savant |
| Whiff rate | 25.3% of swings | Sourced | Baseball Savant |
| Pitch locations: heart / shadow / chase / waste | 27.5% / 42.9% / 21.7% / 7.85% | Sourced | [Baseball America](https://www.baseballamerica.com/stories/modern-mlb-players-are-better-than-past-players-here-are-5-reasons-why/) |
| Half of the shadow band inside the zone | 23.1% inside, 19.8% outside | Derived | Zone rate minus the heart share |
| `CONTACT` by location | tuned so the league-average hitter makes contact on 82.7% / 55.3% of swings | Derived | Savant rates above |
| Foul share of contact | about 52% | Derived | 17.2% of pitches in play on 47.8% swings, 25.3% whiffs |
| Two-strike fouls per swing | +2 points (41% to 43%) | Approximate | [Fox Sports](https://www.foxsports.com/stories/other/is-fouling-off-pitches-a-skill), 2014 data |
| Two-strike contact bonus | +4 points | Approximate | |
| Zone rate by count | 54% first pitch; shape by count | Approximate | First pitch from [Sam Miller](https://pebblehunting.substack.com/p/whats-even-possible-strikewise); level calibrated to 50.6% |
| Pitches per plate appearance | 3.9 | Sourced | [Pitcher List](https://pitcherlist.com/the-offensive-environment-is-changing-in-new-ways) |
| Balls in play per pitch | 17.2% | Sourced | Pitcher List |

## Pitch types

| Pitch | Usage | Velocity | Whiff/swing | Status |
|---|---|---|---|---|
| Four-seam | 28.3% | 94.0 mph | about 22.5% | Usage and velocity sourced ([Plate Disc](https://platedisc.substack.com/p/what-most-thrown-pitch-mlb), [RotoWire](https://www.rotowire.com/baseball/article/mlb-pitch-speed-and-usage-2002-to-2025-94262)); whiff approximate |
| Sinker | 11.7% | 92.5 mph | about 15% | Usage derived (fastballs 49.1% minus four-seam minus cutter); velocity from RotoWire; whiff approximate |
| Cutter | 9.1% | 88.5 mph | about 24% | Usage from [FanGraphs](https://blogs.fangraphs.com/lets-take-a-peek-at-some-early-2025-pitch-usage-trends/); velocity and whiff approximate |
| Slider | 22.4% | 84.8 mph | about 32% | Usage and velocity sourced (RotoWire); whiff approximate |
| Sweeper | 7.5% | 82.0 mph | about 34% | Usage from [MLBAnalytic](https://mlbanalytic.com/articles/pitch-design-revolution-sweepers.html); velocity and whiff approximate |
| Curveball | 8.5% | 80.5 mph | about 30% | Usage from an [AP summary](https://sports.mynorthwest.com/mlb/seattle-mariners/curveballs-mlb-velocity-obsession-pitching); velocity from RotoWire; whiff approximate |
| Changeup | 10.0% | 85.9 mph | about 32% | Usage and velocity sourced (RotoWire); whiff approximate |
| Splitter | 2.5% | 86.0 mph | about 37% | Usage derived (the remainder); velocity and whiff approximate |

Pitcher-to-pitcher spread (velocity SD of 2 mph, control SD of 2.5 points of zone rate) is approximate.

## Balls in play

| Constant | Value | Status | Source |
|---|---|---|---|
| Ground ball / line drive / fly ball / pop-up | 42.4% / 23.9% / 26.6% / 7.1% of 124,888 balls in play | Sourced | Baseball Savant |
| Launch angle bands | ground ball under 10, line drive 10-25, fly ball 25-50, pop-up over 50 | Sourced | [MLB glossary](https://www.mlb.com/glossary/statcast/launch-angle) |
| Hit rate by type | ground ball .244, line drive .650, fly ball .249 including home runs | Derived | Set so overall hits are 32.1% of balls in play (40,138 hits / 124,888) |
| Home runs per fly ball | 15.6% | Derived | 5,650 home runs |
| Hit mix: singles / doubles / triples / home runs | 65.1% / 19.3% / 1.6% / 14.1% of hits | Derived | 40,138 H, 7,745 2B, 628 3B, 5,650 HR ([StatMuse](https://www.statmuse.com/mlb/ask/mlb-league-batting-average-2025)) |
| Exit velocity, launch angle and distance by type | about 88 mph overall, about 103 mph on home runs | Approximate | Overall average from several sources; per-type values not checked |
| Inside-the-park home runs | 1 in 500 home runs | Approximate | |

## Plate-appearance results

| Constant | Value | Status | Source |
|---|---|---|---|
| Strikeouts / walks | 22.2% / 8.4% of plate appearances | Sourced | [Vertize](https://vertizesports.com/blog/mlb-strikeouts-by-season) |
| Hit by pitch | 1,928 in 710,084 pitches (0.27%; 1.05% of PA) | Derived | StatMuse and Baseball Savant |
| On-base percentage | about .315 | Sourced | StatMuse |
| Plate appearances / pitches | 182,838 / 710,084 | Sourced | StatMuse, Baseball Savant |

## Umpires

| Constant | Value | Status | Source |
|---|---|---|---|
| Overall accuracy | 92.83% | Sourced | [FanGraphs](https://blogs.fangraphs.com/your-final-pre-robo-zone-umpire-accuracy-update/) |
| Call counts as missed | more than 0.75 inch from the edge | Sourced | FanGraphs (the 2025 grading buffer) |
| Called-strike odds outside the zone | 43% within half an inch, 34.5% to 1.5 inches, 18% to 2.5 inches, 7.5% to 3.5 inches, scaled by 0.8 for 2025 | Sourced and adjusted | [FanGraphs](https://blogs.fangraphs.com/the-strike-zone-is-imperfect-but-mostly-unchanged/) (2020-21 data; the article that holds the table was not confirmed); scaled so accuracy matches 2025 |
| Called-strike odds just inside the zone | 62% to 99.5% by distance | Approximate | Mirrors the outside curve |
| Count effect on borderline calls | +5 points at 3-0, -5 at 0-2 | Approximate | Direction from a 2015-2024 study |

## Game situations

| Constant | Value | Status | Source |
|---|---|---|---|
| Runners and outs when a batter comes up | 24 base-out states | Derived | Simulated 1.2 million half-innings using the 2025 plate-appearance results above |
| Runs per half-inning | 0.49 (4.45 per team-game) | Derived | 21,614 runs in 4,860 team-games; the simulation also included errors (0.65% of plate appearances) and a 9% chance per plate appearance that a runner takes an extra base on a steal or wild pitch, set to match |
| Extra innings start with a runner on second | yes | Sourced | MLB rule |
| Plate appearances in extra innings | 2% | Approximate | |
| Bottom of the 9th played | 55% of games | Approximate | |
| Runner advances on hits and outs | single: 60% score from second, 28% first to third; double: 42% score from first; groundout: 50% / 45% / 55% for runners on third / second / first; tag-up from third: 92% | Approximate | |
| Double plays | 45% of ground-ball outs with a runner on first and fewer than two outs (about 10% of chances) | Approximate | |
| Starters still in the game by inning | 99% through the 4th, 72% in the 5th, 42% in the 6th, 16% in the 7th | Approximate | |
| Pitches per inning | 16 | Approximate | |
| Pitch clock | 15 seconds (bases empty), 18 seconds (runners on) | Sourced | Timer rules; the 16 and 19 second paces in the game are estimates |
| Average game time | 2:38 | Sourced | [ESPN](https://www.espn.com/mlb/story/_/id/46422703/average-mlb-game-2-minutes-3rd-year-pitch-clock) |

## Game mechanics, not league averages

The batter types, the "Protect the plate", "Swing for the fences", "Hit behind the runner" and bunt options, pitch
reads and how much each pitch type hides its location, fatigue (80 to 115 pitches), bunt success rates, and the
commentary are tuned for play. Protect the plate is deliberately strong so a skilled player can occasionally
approach the record.

## How the model compares to MLB

A league-average hitter (a bot that swings at the league's rates by pitch location and takes the rest) was run
through 120,000 plate appearances.

| | Model | MLB 2025 |
|---|---|---|
| Pitches per plate appearance | 3.88 | 3.9 |
| Strikeout rate | 24.1% | 22.2% |
| Walk rate | 8.8% | 8.4% |
| Balls in play per plate appearance | 66.1% | 68.3% |
| Zone rate | 50.2% | 50.6% |
| Swing / zone swing / chase | 48.8% / 67.5% / 30.2% | 47.8% / 66.9% / 28.2% |
| Zone contact / chase contact | 83.7% / 56.8% | 82.7% / 55.3% |
| Whiff per swing | 24.5% | 25.3% |
| Balls in play per pitch | 17.0% | 17.2% |
| Ground ball / line drive / fly ball / pop-up | 42.7 / 23.4 / 26.5 / 7.3 | 42.4 / 23.9 / 26.6 / 7.1 |
| Hits per ball in play | 32.0% | 32.1% |
| BABIP | .288 | about .289 (derived) |
| Home runs per ball in play | 4.5% | 4.5% |
| Hit mix (1B / 2B / 3B / HR) | 65.9 / 18.6 / 1.5 / 13.9 | 65.1 / 19.3 / 1.6 / 14.1 |
| Umpire accuracy | 93.0% | 92.8% |
| Swinging vs looking strikeouts | 75 / 25 | about 74 / 26 |

The model's strikeout rate runs about two points high and balls in play about two points low. Everything else is
within a point or two.

## Not modeled

- The automated ball-strike challenge system. ESPN reports the 2026 zone rate fell to 47.2% from 50.7% in 2025,
  tied to automated ball-strike calls. The game models 2025's human umpires.
- Platoon splits, ballparks and weather, and individual players.
