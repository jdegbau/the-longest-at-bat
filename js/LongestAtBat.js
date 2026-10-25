// Game-wide constants
var RECORD_PITCHES = 21; // Brandon Belt vs. Jaime Barría, April 22, 2018
var NEXT_PITCH_DELAY = 3000; // Milliseconds before the next pitch is delivered
var RELEASE_POINT = { x: 100, y: 8 }; // Where pitches leave the pitcher's hand in the strike zone view
var SECONDS_PER_PITCH_EMPTY = 16; // Estimate: 15-second pitch timer with the bases empty
var SECONDS_PER_PITCH_RUNNERS = 19; // Estimate: 18-second pitch timer with runners on

// League averages from the 2025 MLB regular season. Sources, derivations and the values that are
// approximations rather than published figures are documented in docs/mlb-averages.md.
var LEAGUE = {
	pitches: 710084,
	plateAppearances: 182838,
	pitchesPerPA: 3.9,
	strikeoutRate: 22.2, // Percent of plate appearances
	walkRate: 8.4,
	hitByPitchRate: 1.05,
	homeRunRate: 3.09,
	onBasePct: 0.315,
	singleShare: 65.1, // Percent of hits
	doubleShare: 19.3,
	tripleShare: 1.6,
	homeRunShare: 14.1
};
var HIT_BY_PITCH_CHANCE = 0.27; // Percent of pitches: 1,928 hit batters in 710,084 pitches

// Game-wide state
var pitches = 0;
var strikes = 0;
var balls = 0;
var outs = 0;
var bases = [false, false, false]; // Runners on first, second, third
var inning = 1;
var isTopInning = true;
var awayRuns = 0;
var homeRuns = 0;
var atBatSeconds = 0;
var nextPitchTimer = null;
var atBatId = 0; // Changes every at-bat so stale timers can tell they are out of date
var atBatActive = false;
var batter = null;
var pitcher = null;
var pitcherPitchCount = 0; // Pitches the pitcher has thrown today
var currentPitch = null; // The pitch that has been delivered and is waiting on the player's choice
var tiredNoted = false;
var fullCountNoted = false;

// Element targeting variables
var gameContentArea = document.getElementById("gameContent");
var swingOptionsArea = document.getElementById("swingOptions");
var pitchCountDisplay = document.getElementById("pitchCount");
var atBatTimeDisplay = document.getElementById("atBatTime");
var batterNameDisplay = document.getElementById("batterName");
var batterTypeDisplay = document.getElementById("batterType");
var batterLineDisplay = document.getElementById("batterLine");
var pitcherNameDisplay = document.getElementById("pitcherName");
var pitcherTypeDisplay = document.getElementById("pitcherType");
var pitcherLineDisplay = document.getElementById("pitcherLine");
var arsenalDisplay = document.getElementById("arsenal");
var awayRunsDisplay = document.getElementById("awayRuns");
var homeRunsDisplay = document.getElementById("homeRuns");
var inningArrowDisplay = document.getElementById("inningArrow");
var inningLabelDisplay = document.getElementById("inningLabel");
var basesDisplay = document.getElementById("bases");
var pitchMarksArea = document.getElementById("pitchMarks");
var pitchTrailArea = document.getElementById("pitchTrail");
var pitchLogList = document.getElementById("pitchLog");
var pitchLogEmpty = document.getElementById("pitchLogEmpty");
var hitPanel = document.getElementById("hitPanel");
var hitMarksArea = document.getElementById("hitMarks");
var hitInfoDisplay = document.getElementById("hitInfo");
var svgNamespace = "http://www.w3.org/2000/svg";

// Batter types. contact shifts the chance of making contact, xbhShift trades singles for extra-base hits,
// and eye is the chance of reading a pitch's location perfectly.
var batterTypes = [
	{ id: "contact", name: "Contact hitter", description: "Rarely misses and fouls off tough pitches. Fewer extra-base hits.", contact: 0.05, xbhShift: -6, eye: 0 },
	{ id: "power", name: "Power hitter", description: "Does damage when you connect, but you swing and miss more.", contact: -0.04, xbhShift: 12, eye: 0 },
	{ id: "eye", name: "Patient hitter", description: "Great pitch recognition, so your reads on each pitch are better.", contact: 0, xbhShift: 0, eye: 0.2 }
];

// What a swing or take can be. Each option says when it is available.
var approaches = {
	takePitch: { label: "Take the pitch", hint: "Let it go. Strikes still count against you." },
	normalSwing: { label: "Take a normal swing", hint: "A balanced swing." },
	swingForTheFences: { label: "Swing for the fences", hint: "More power, more misses." },
	protectPlate: { label: "Protect the plate", hint: "Spoil tough pitches with two strikes." },
	behindRunner: { label: "Hit behind the runner", hint: "A grounder to the right side moves runners up." },
	bunt: { label: "Bunt", hint: "Try to beat it out." }
};

// Pitch types. mean is the league-average velocity, usage the share of all pitches thrown, and whiff the
// share of swings that miss. deception is how much the pitch hides its location out of the hand.
var pitchLibrary = {
	fourSeam: { name: "Four-Seam Fastball", short: "4-Seam", mean: 94.0, usage: 28.3, whiff: 22.5, deception: 0, fastball: true },
	sinker: { name: "Sinker", short: "Sinker", mean: 92.5, usage: 11.7, whiff: 15, deception: 0.02, fastball: true },
	cutter: { name: "Cutter", short: "Cutter", mean: 88.5, usage: 9.1, whiff: 24, deception: 0.05 },
	slider: { name: "Slider", short: "Slider", mean: 84.8, usage: 22.4, whiff: 32, deception: 0.12 },
	sweeper: { name: "Sweeper", short: "Sweeper", mean: 82.0, usage: 7.5, whiff: 34, deception: 0.12 },
	curveball: { name: "Curveball", short: "Curve", mean: 80.5, usage: 8.5, whiff: 30, deception: 0.15 },
	changeup: { name: "Changeup", short: "Change", mean: 85.9, usage: 10.0, whiff: 32, deception: 0.08 },
	splitter: { name: "Splitter", short: "Splitter", mean: 86.0, usage: 2.5, whiff: 37, deception: 0.12 }
};
var LEAGUE_WHIFF = 25.3; // Percent of swings that miss, all pitches

// A pitch's whiff rate relative to the league mix shifts the chance of contact. The league mix averages out to zero.
(function() {
	var totalUsage = 0;
	var weightedWhiff = 0;
	Object.keys(pitchLibrary).forEach(function(key) {
		totalUsage += pitchLibrary[key].usage;
		weightedWhiff += pitchLibrary[key].usage * pitchLibrary[key].whiff;
	});
	var mixWhiff = weightedWhiff / totalUsage;
	Object.keys(pitchLibrary).forEach(function(key) {
		pitchLibrary[key].contact = -(pitchLibrary[key].whiff - mixWhiff) / 100;
	});
})();

// Fictional pitchers
var pitcherInitials = ["A", "B", "C", "D", "E", "G", "J", "K", "L", "M", "N", "P", "R", "S", "T", "W"];
var pitcherSurnames = ["Alvarez", "Brennan", "Castillo", "Donovan", "Ellison", "Fontaine", "Gallagher", "Hartwell", "Ibarra", "Jennings", "Kowalski", "Lindgren", "Montoya", "Nakamura", "Okafor", "Prescott", "Quintero", "Ramsey", "Sutherland", "Tavares", "Vasquez", "Whitfield"];

// How often the pitcher throws a strike by count: ZONE_RATE[balls][strikes]. The first pitch matches the league's
// 52-55% zone rate; the rest of the shape follows the usual pattern (more strikes when behind in the count,
// fewer when ahead) with the level set so a league-average hitter sees the 2025 zone rate of 50.6%.
var ZONE_RATE = [
	[0.54, 0.48, 0.45],
	[0.50, 0.48, 0.47],
	[0.52, 0.51, 0.50],
	[0.61, 0.57, 0.56]
];
var ZONE_RATE_OFFSET = 0;

// Where pitches go, in the strike zone view's coordinates (catcher's view; a right-handed batter stands on the
// left). About 4 units is an inch: the zone is a 20-inch-wide target.
var UNITS_PER_INCH = 4;
var zone = { left: 60, right: 140, top: 60, bottom: 170 };
var SHADOW_WIDTH = 8; // Statcast's "shadow" is the band around the edge of the zone, here 2 inches
var CHASE_WIDTH = 24; // Beyond the shadow, the "chase" band; past it is the "waste" zone
var heart = { left: zone.left + SHADOW_WIDTH, right: zone.right - SHADOW_WIDTH, top: zone.top + SHADOW_WIDTH, bottom: zone.bottom - SHADOW_WIDTH };
var shadowBox = { left: zone.left - SHADOW_WIDTH, right: zone.right + SHADOW_WIDTH, top: zone.top - SHADOW_WIDTH, bottom: zone.bottom + SHADOW_WIDTH };
var chaseBox = { left: zone.left - CHASE_WIDTH, right: zone.right + CHASE_WIDTH, top: zone.top - CHASE_WIDTH, bottom: zone.bottom + CHASE_WIDTH };
var plotBox = { left: 14, right: 186, top: 14, bottom: 200 };

// Pitch locations: Statcast attack zones are heart 27.5%, shadow 42.9%, chase 21.7% and waste 7.85% of pitches.
// Half of the shadow band is inside the zone ("edge") and half outside ("shadowOut").
var HEART_SHARE_OF_ZONE = 0.544; // 27.54 of the 50.6 percent of pitches in the zone

// What the player sees out of the hand and how likely each read is for each location
var READ_ODDS = {
	heart: { strike: 0.9, border: 0.1, ball: 0 },
	edge: { strike: 0.35, border: 0.55, ball: 0.1 },
	shadowOut: { strike: 0.15, border: 0.55, ball: 0.3 },
	chase: { strike: 0.05, border: 0.35, ball: 0.6 },
	waste: { strike: 0, border: 0.05, ball: 0.95 },
	hbp: { strike: 0, border: 0.1, ball: 0.9 }
};
var TRUE_READ = { heart: "strike", edge: "border", shadowOut: "border", chase: "ball", waste: "ball", hbp: "ball" };
var READ_LABELS = { strike: "Looks like a strike", border: "Borderline pitch", ball: "Looks like a ball" };

// Chance of making contact on a swing by approach and pitch location. A normal swing is set so a league-average
// hitter makes contact on 82.7% of swings at strikes and 55.3% of swings at pitches out of the zone.
var CONTACT = {
	normalSwing: { heart: 0.87, edge: 0.725, shadowOut: 0.625, chase: 0.455, waste: 0.27 },
	swingForTheFences: { heart: 0.785, edge: 0.62, shadowOut: 0.52, chase: 0.37, waste: 0.22 },
	protectPlate: { heart: 0.96, edge: 0.86, shadowOut: 0.79, chase: 0.65, waste: 0.44 },
	behindRunner: { heart: 0.865, edge: 0.72, shadowOut: 0.62, chase: 0.45, waste: 0.26 },
	bunt: { heart: 0.80, edge: 0.68, shadowOut: 0.55, chase: 0.33, waste: 0.12 }
};

// Share of contact that goes foul rather than in play. League-wide about 52% of contact is foul (a 17.2% of
// pitches are put in play on 47.8% swings), more on pitches off the plate.
var FOUL_SHARE = { heart: 0.46, edge: 0.54, shadowOut: 0.62, chase: 0.66, waste: 0.70 };
var FOUL_APPROACH_SHIFT = { normalSwing: 0, swingForTheFences: -0.04, protectPlate: 0.24, behindRunner: 0.02, bunt: -0.06 };
var TWO_STRIKE_FOUL_BONUS = 0.03; // Fouls per swing rise from about 41% to 43% with two strikes
var TWO_STRIKE_CONTACT_BONUS = 0.04; // Hitters shorten their swings with two strikes

// Balls in play: the share that are ground balls, line drives, fly balls and pop-ups, and how often each falls for
// a hit. Fly balls include home runs (15.6% of fly balls leave the park).
var BATTED_BALL_WEIGHTS = { gb: 42.4, ld: 23.9, fb: 26.6, pu: 7.1 };
var HIT_CHANCE = { gb: 0.244, ld: 0.650, fb: 0.093, pu: 0.02 }; // Fly balls: hits other than home runs
var HOME_RUN_PER_FLY = 0.156;
var HOME_RUN_PER_LINER = 0.016;
var HIT_KINDS = {
	gb: { single: 0.96, double: 0.035, triple: 0.005 },
	ld: { single: 0.66, double: 0.295, triple: 0.018 },
	fb: { single: 0.32, double: 0.60, triple: 0.08 },
	pu: { single: 1, double: 0, triple: 0 }
};
var INSIDE_PARK_SHARE = 0.002; // About 1 home run in 500
var BUNT_SINGLE_CHANCE = { heart: 0.26, edge: 0.20, shadowOut: 0.15, chase: 0.12, waste: 0.08 };

// Baserunning. Chance a runner takes the extra base on a hit or a ball in play.
var SCORE_FROM_SECOND_ON_SINGLE = 0.60;
var FIRST_TO_THIRD_ON_SINGLE = 0.28;
var SCORE_FROM_FIRST_ON_DOUBLE = 0.42;
var ADVANCE_ON_GROUNDOUT = { 3: 0.50, 2: 0.45, 1: 0.55 };
var TAG_UP_FROM_THIRD = 0.92;
var TAG_UP_FROM_SECOND = 0.30;
var DOUBLE_PLAY_CHANCE = 0.45; // About 10% of chances: ground-ball outs with a runner on first and fewer than two outs
var FIELDERS_CHOICE_CHANCE = 0.31;

// Game situations. Weights come from simulating a million half-innings with the league's 2025 plate-appearance
// results (plus errors, stolen bases and wild pitches, calibrated to the league's 0.49 runs per half-inning):
// REGULAR_STATE_WEIGHTS[outs * 8 + (first ? 1 : 0) + (second ? 2 : 0) + (third ? 4 : 0)] is how often a batter
// faces that situation. Extra innings start with a runner on second.
var REGULAR_STATE_WEIGHTS = [24.346, 6.138, 1.25, 1.466, 0.117, 0.425, 0.194, 0.33, 17.612, 7.833, 2.261, 2.79, 0.441, 0.971, 0.431, 0.809, 13.694, 7.974, 2.883, 3.678, 0.942, 1.482, 0.64, 1.292];
var EXTRA_STATE_WEIGHTS = [1.066, 2.563, 24.555, 3.107, 0.117, 1.932, 0.201, 0.789, 2.16, 4.09, 13.918, 4.217, 3.95, 2.78, 0.511, 1.493, 3.981, 5.089, 8.593, 4.638, 4.513, 3.01, 0.759, 1.966];
var HALF_INNING_RUNS = [{ runs: 0, weight: 72.82 }, { runs: 1, weight: 14.81 }, { runs: 2, weight: 6.9 }, { runs: 3, weight: 3.13 }, { runs: 4, weight: 1.39 }, { runs: 5, weight: 0.95 }];
var RUNS_ALREADY_SCORED = [{ runs: 0, weight: 83.51 }, { runs: 1, weight: 9.63 }, { runs: 2, weight: 4.03 }, { runs: 3, weight: 1.69 }, { runs: 4, weight: 1.15 }]; // Runs the batting team has scored so far this inning
var EXTRA_RUNS_ALREADY_SCORED = [{ runs: 0, weight: 60.89 }, { runs: 1, weight: 22.95 }, { runs: 2, weight: 9.25 }, { runs: 3, weight: 4.03 }, { runs: 4, weight: 2.88 }];
var EXTRA_INNING_SHARE = 0.02; // Rough share of plate appearances that come in extra innings
var EXTRA_INNING_WEIGHTS = [{ inning: 10, weight: 58 }, { inning: 11, weight: 24 }, { inning: 12, weight: 11 }, { inning: 13, weight: 7 }];
var BOTTOM_NINTH_SHARE = 0.55; // The home team only bats in the bottom of the 9th when it isn't already ahead

// Chance a starting pitcher is still in the game by inning (average starts last about five innings)
var STARTER_STILL_IN = { 1: 0.99, 2: 0.99, 3: 0.99, 4: 0.98, 5: 0.72, 6: 0.42, 7: 0.16, 8: 0.04, 9: 0.01 };
var PITCHES_PER_INNING = 16;

// What a ball in play can be: label, how the at-bat ended, and whether it was a hit
var playInfo = {
	single: { label: "Single", reason: "singled", result: "hit" },
	double: { label: "Double", reason: "doubled", result: "hit" },
	triple: { label: "Triple", reason: "tripled", result: "hit" },
	homeRun: { label: "Home Run", reason: "hit a home run", result: "homer" },
	insideParkHR: { label: "Inside-the-Park HR", reason: "hit an inside-the-park home run", result: "homer" },
	groundOut: { label: "Groundout", reason: "grounded out", result: "out" },
	fieldersChoice: { label: "Fielder's Choice", reason: "hit into a fielder's choice", result: "out" },
	shallowFly: { label: "Flyout", reason: "flew out", result: "out" },
	deepFly: { label: "Flyout", reason: "flew out", result: "out" },
	lineOut: { label: "Lineout", reason: "lined out", result: "out" },
	foulOut: { label: "Pop Out", reason: "fouled out", result: "out" },
	popOut: { label: "Pop Out", reason: "popped out", result: "out" },
	doublePlay: { label: "Double Play", reason: "grounded into a double play", result: "out" },
	advanceOut: { label: "Groundout", reason: "grounded out, moving the runners up", result: "out" },
	buntSingle: { label: "Bunt Single", reason: "bunted for a single", result: "hit" },
	buntOut: { label: "Bunt Groundout", reason: "were thrown out on a bunt", result: "out" },
	buntPop: { label: "Bunt Pop Out", reason: "popped out on a bunt", result: "out" }
};

// Narrative and landing spot (x, y on the field view) for each kind of ball in play
var inPlayPools = {
	single: [
		{ text: "You singled up the middle.", x: 150, y: 150 },
		{ text: "You singled to left.", x: 95, y: 125 },
		{ text: "You singled to right.", x: 205, y: 125 },
		{ text: "You singled through the right side.", x: 178, y: 172 },
		{ text: "You singled to left-center.", x: 115, y: 100 }
	],
	double: [
		{ text: "You doubled down the right field line.", x: 262, y: 120 },
		{ text: "You doubled down the left field line.", x: 40, y: 120 },
		{ text: "You doubled into the gap in right-center.", x: 200, y: 70 }
	],
	triple: [
		{ text: "You hit a triple to right field.", x: 252, y: 74 },
		{ text: "You hit a triple to left field.", x: 48, y: 74 }
	],
	homeRun: [
		{ text: "You hit a home run to center field.", x: 150, y: 24 },
		{ text: "You hit a home run to left field.", x: 60, y: 48 },
		{ text: "You hit a home run to right field.", x: 240, y: 48 }
	],
	insideParkHR: [
		{ text: "You hit an inside-the-park home run.", x: 205, y: 56 }
	],
	groundOut: [
		{ text: "You grounded out to short.", x: 128, y: 165 },
		{ text: "You grounded out to second.", x: 172, y: 165 },
		{ text: "You grounded out to third.", x: 110, y: 188 },
		{ text: "You grounded out to first.", x: 190, y: 188 }
	],
	fieldersChoice: [
		{ text: "You hit a grounder to short. The runner was forced out at second, and you beat the relay to first.", x: 128, y: 165 },
		{ text: "You hit a grounder to third. The runner was forced out at second, and you reached first.", x: 110, y: 188 }
	],
	shallowFly: [
		{ text: "You flew out to shallow left field.", x: 92, y: 120 },
		{ text: "You flew out to shallow center field.", x: 150, y: 110 },
		{ text: "You flew out to shallow right field.", x: 208, y: 120 }
	],
	deepFly: [
		{ text: "You flew out to deep left field.", x: 72, y: 70 },
		{ text: "You flew out to deep center field.", x: 150, y: 50 },
		{ text: "You flew out to deep right field.", x: 228, y: 70 }
	],
	lineOut: [
		{ text: "You lined out to short.", x: 125, y: 163 },
		{ text: "You lined out to center field.", x: 150, y: 105 },
		{ text: "You lined out sharply to right.", x: 210, y: 118 }
	],
	foulOut: [
		{ text: "You fouled out to the first baseman.", x: 225, y: 200 },
		{ text: "You fouled out to the third baseman.", x: 80, y: 215 },
		{ text: "You popped up in foul territory and the catcher squeezed it.", x: 150, y: 238 }
	],
	popOut: [
		{ text: "You popped up to shortstop.", x: 135, y: 150 },
		{ text: "You popped up to second base.", x: 168, y: 150 },
		{ text: "You popped up to the third baseman.", x: 108, y: 175 }
	],
	doublePlay: [
		{ text: "You grounded into a 5-4-3 double play.", x: 110, y: 188 },
		{ text: "You grounded into a 4-6-3 double play.", x: 172, y: 163 },
		{ text: "You grounded into a 6-4-3 double play.", x: 128, y: 165 }
	],
	advanceOut: [
		{ text: "You hit a grounder to the right side.", x: 178, y: 172 },
		{ text: "You rolled a grounder to second base.", x: 172, y: 165 }
	],
	buntSingle: [
		{ text: "You beat out a bunt down the third base line for a single.", x: 134, y: 208 }
	],
	buntOut: [
		{ text: "You dropped a bunt, but were thrown out at first.", x: 146, y: 210 }
	],
	buntPop: [
		{ text: "You popped your bunt up to the catcher.", x: 150, y: 215 }
	]
};

var foulNarratives = [
	"You were inches away from a home run down the left field line. Foul ball.",
	"You popped the ball up behind home plate and into the stands.",
	"You fouled the pitch straight back."
];

// Create game-wide functions
function randomItem(items) {
	return items[Math.floor(Math.random() * items.length)];
}

function randomWeighted(items) {
	var totalWeight = items.reduce(function(total, item) { return total + item.weight; }, 0);
	var roll = Math.random() * totalWeight;
	for (var i = 0; i < items.length; i++) {
		roll -= items[i].weight;
		if (roll < 0) {
			return items[i];
		}
	}
	return items[0];
}

function randomBetween(min, max) {
	return min + Math.random() * (max - min);
}

function randomInt(min, max) {
	return Math.floor(randomBetween(min, max + 1));
}

// A normal (bell curve) random number using the Box-Muller transform
function randomNormal(mean, spread) {
	var u = 1 - Math.random();
	var v = Math.random();
	return mean + spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function shuffle(items) {
	var copy = items.slice();
	for (var i = copy.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = copy[i];
		copy[i] = copy[j];
		copy[j] = temp;
	}
	return copy;
}

function pluralize(number, singular, plural) {
	return number + " " + (number == 1 ? singular : plural);
}

function ordinal(number) {
	var suffixes = { 1: "st", 2: "nd", 3: "rd" };
	var lastTwo = number % 100;
	return number + ((lastTwo >= 11 && lastTwo <= 13) ? "th" : (suffixes[number % 10] || "th"));
}

function formatTime(totalSeconds) {
	var minutes = Math.floor(totalSeconds / 60);
	var seconds = totalSeconds % 60;
	return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

// Balls and strikes as shown to the player; the count never reads four balls or three strikes
function countText() {
	return Math.min(balls, 3) + "-" + Math.min(strikes, 2);
}

function runnersOn() {
	return bases[0] || bases[1] || bases[2];
}

function secondsPerPitch() {
	return runnersOn() ? SECONDS_PER_PITCH_RUNNERS : SECONDS_PER_PITCH_EMPTY;
}

function canTurnDoublePlay() {
	return bases[0] && outs < 2;
}

function battingRuns() {
	return isTopInning ? awayRuns : homeRuns;
}

function fieldingRuns() {
	return isTopInning ? homeRuns : awayRuns;
}

function battingTeamName() {
	return isTopInning ? "Away" : "Home";
}

function runnersText() {
	var names = ["first", "second", "third"].filter(function(base, i) { return bases[i]; });
	if (names.length == 0) {
		return "bases empty";
	}
	if (names.length == 3) {
		return "bases loaded";
	}
	return (names.length == 1 ? "runner on " : "runners on ") + names.join(" and ");
}

function scoreText() {
	var ours = battingRuns();
	var theirs = fieldingRuns();
	if (ours == theirs) {
		return "The game is tied " + ours + "-" + theirs + ".";
	}
	return "Your team " + (ours > theirs ? "leads " : "trails ") + Math.max(ours, theirs) + "-" + Math.min(ours, theirs) + ".";
}

function situationText() {
	return (isTopInning ? "Top" : "Bottom") + " of the " + ordinal(inning) + ", " + pluralize(outs, "out", "outs") + ", " + runnersText() + ". " + scoreText();
}

function createParagraph(text, className) {
	var paragraph = document.createElement("p");
	paragraph.textContent = text;
	if (className) {
		paragraph.className = className;
	}
	return paragraph;
}

function addParagraph(text, className) {
	var paragraph = createParagraph(text, className);
	gameContentArea.appendChild(paragraph);
	return paragraph;
}

// Runs scored in one complete half-inning
function halfInningRuns() {
	return randomWeighted(HALF_INNING_RUNS).runs;
}

function totalRuns(halfInnings) {
	var runs = 0;
	for (var i = 0; i < halfInnings; i++) {
		runs += halfInningRuns();
	}
	return runs;
}

function stateFromIndex(index) {
	var base = index % 8;
	return { outs: Math.floor(index / 8), bases: [!!(base & 1), !!(base & 2), !!(base & 4)] };
}

function randomState(weights) {
	var states = weights.map(function(weight, index) {
		var state = stateFromIndex(index);
		state.weight = weight;
		return state;
	});
	return randomWeighted(states);
}

function pickInning() {
	if (Math.random() < EXTRA_INNING_SHARE) {
		return { inning: randomWeighted(EXTRA_INNING_WEIGHTS).inning, top: Math.random() < 0.5, extra: true };
	}
	var halves = [];
	for (var i = 1; i <= 9; i++) {
		halves.push({ inning: i, top: true, weight: 1 });
		halves.push({ inning: i, top: false, weight: i == 9 ? BOTTOM_NINTH_SHARE : 1 });
	}
	return randomWeighted(halves);
}

function generateSituation() {
	var spot = pickInning();
	inning = spot.inning;
	isTopInning = spot.top;
	var state = randomState(spot.extra ? EXTRA_STATE_WEIGHTS : REGULAR_STATE_WEIGHTS);
	outs = state.outs;
	bases = state.bases.slice();

	// The bottom of the 9th or later is only played while the home team isn't ahead
	do {
		if (inning > 9) {
			// Extra innings mean the game was tied after every completed inning
			awayRuns = homeRuns = totalRuns(9);
			if (!isTopInning) {
				awayRuns += halfInningRuns();
			}
		} else {
			awayRuns = totalRuns(inning - 1 + (isTopInning ? 0 : 1));
			homeRuns = totalRuns(inning - 1);
		}
		// Runs the batting team has already scored this half-inning
		var alreadyScored = randomWeighted(spot.extra ? EXTRA_RUNS_ALREADY_SCORED : RUNS_ALREADY_SCORED).runs;
		if (isTopInning) {
			awayRuns += alreadyScored;
		} else {
			homeRuns += alreadyScored;
		}
	} while (!isTopInning && inning >= 9 && homeRuns > awayRuns);
}

// Move runners and the batter, returning the runs that scored.
// advanceBy(base) says how many bases the runner on that base (1-3) moves; batterBase is 0 when the batter is out.
// Runners never pass or share a base: one blocked by a runner ahead stops behind them.
function advanceRunners(advanceBy, batterBase) {
	var newBases = [false, false, false];
	var runs = 0;
	for (var base = 3; base >= 1; base--) {
		if (bases[base - 1]) {
			var destination = base + advanceBy(base);
			while (destination > base && destination < 4 && newBases[destination - 1]) {
				destination--;
			}
			if (destination >= 4) {
				runs++;
			} else {
				newBases[destination - 1] = true;
			}
		}
	}
	if (batterBase >= 4) {
		runs++;
	} else if (batterBase > 0) {
		newBases[batterBase - 1] = true;
	}
	bases = newBases;
	return runs;
}

// Walks and hit batters only move runners who are forced
function forceRunners() {
	var runs = 0;
	if (bases[0]) {
		if (bases[1]) {
			if (bases[2]) {
				runs++;
			}
			bases[2] = true;
		}
		bases[1] = true;
	}
	bases[0] = true;
	return runs;
}

// Apply a ball in play to the bases and outs; returns the runs scored and any extra narrative
function resolvePlay(play) {
	var runs = 0;
	var note = "";
	var outsBefore = outs;
	if (play == "single") {
		runs = advanceRunners(function(base) {
			if (base == 3) {
				return 1;
			}
			if (base == 2) {
				return Math.random() < SCORE_FROM_SECOND_ON_SINGLE ? 2 : 1;
			}
			return Math.random() < FIRST_TO_THIRD_ON_SINGLE ? 2 : 1;
		}, 1);
	} else if (play == "buntSingle") {
		runs = advanceRunners(function() { return 1; }, 1);
	} else if (play == "double") {
		runs = advanceRunners(function(base) {
			if (base == 1) {
				return Math.random() < SCORE_FROM_FIRST_ON_DOUBLE ? 3 : 2;
			}
			return 3;
		}, 2);
	} else if (play == "triple") {
		runs = advanceRunners(function() { return 3; }, 3);
	} else if (play == "homeRun" || play == "insideParkHR") {
		runs = advanceRunners(function() { return 4; }, 4);
	} else if (play == "doublePlay") {
		outs += 2;
		bases[0] = false;
		if (outs < 3) {
			runs = advanceRunners(function() { return 1; }, 0);
		}
	} else if (play == "fieldersChoice") {
		// The lead runner is forced out at second and the batter reaches first; a runner on third can score
		outs++;
		bases[0] = false;
		if (outs < 3) {
			runs = advanceRunners(function(base) { return base == 3 && Math.random() < ADVANCE_ON_GROUNDOUT[3] ? 1 : 0; }, 1);
		}
	} else if (play == "groundOut") {
		outs++;
		if (outs < 3) {
			runs = advanceRunners(function(base) { return Math.random() < ADVANCE_ON_GROUNDOUT[base] ? 1 : 0; }, 0);
			if (runs > 0) {
				note = "The runner scored on the groundout.";
			}
		}
	} else if (play == "deepFly") {
		outs++;
		if (outs < 3) {
			runs = advanceRunners(function(base) {
				if (base == 3) {
					return Math.random() < TAG_UP_FROM_THIRD ? 1 : 0;
				}
				return base == 2 && Math.random() < TAG_UP_FROM_SECOND ? 1 : 0;
			}, 0);
			if (runs > 0) {
				note = "The runner tagged up from third and scored on the sacrifice fly.";
			}
		}
	} else if (play == "advanceOut") {
		outs++;
		runs = advanceRunners(function() { return 1; }, 0);
		note = runs > 0 ? "The runner scored on the groundout." : "The runners moved up on the groundout.";
	} else if (play == "buntOut" && runnersOn() && outsBefore < 2) {
		outs++;
		runs = advanceRunners(function() { return 1; }, 0);
		note = "It was a sacrifice. The runners moved up.";
	} else {
		outs++;
	}
	return { runs: runs, note: note };
}

// Pitcher and batter profiles
function generatePitcher() {
	// A primary fastball, then secondary pitches chosen by how often the league throws them
	var primary = Math.random() < pitchLibrary.fourSeam.usage / (pitchLibrary.fourSeam.usage + pitchLibrary.sinker.usage) ? "fourSeam" : "sinker";
	var pool = Object.keys(pitchLibrary).filter(function(key) { return key != primary; }).map(function(key) {
		return { key: key, weight: pitchLibrary[key].usage };
	});
	var mix = [{ type: pitchLibrary[primary], weight: pitchLibrary[primary].usage * randomBetween(0.7, 1.6) }];
	var secondaryCount = randomWeighted([{ count: 2, weight: 3 }, { count: 3, weight: 5 }, { count: 4, weight: 2 }]).count;
	for (var i = 0; i < secondaryCount && pool.length; i++) {
		var pick = randomWeighted(pool);
		pool.splice(pool.indexOf(pick), 1);
		mix.push({ type: pitchLibrary[pick.key], weight: pitchLibrary[pick.key].usage * randomBetween(0.6, 1.6) });
	}
	var starterChance = STARTER_STILL_IN[inning] || 0;
	return {
		name: randomItem(pitcherInitials) + ". " + randomItem(pitcherSurnames),
		hand: Math.random() < 0.28 ? "L" : "R",
		role: Math.random() < starterChance ? "Starter" : "Reliever",
		mix: mix,
		control: clamp(randomNormal(0, 0.025), -0.05, 0.05), // Shifts how often pitches are strikes
		stuff: clamp(randomNormal(0, 0.02), -0.04, 0.04), // Shifts how hard the pitcher is to hit
		velo: clamp(randomNormal(0, 2), -4, 4) // Mph above or below the league average for each pitch
	};
}

function scoutingText() {
	var control = pitcher.control > 0.02 ? "Pinpoint control" : (pitcher.control < -0.02 ? "Wild at times" : "Average control");
	var stuff = pitcher.stuff > 0.015 ? "nasty stuff" : (pitcher.stuff < -0.015 ? "hittable stuff" : "solid stuff");
	return control + ", " + stuff + ".";
}

// Starters have thrown about 16 pitches an inning; relievers have just come in
function startingPitchCount() {
	if (pitcher.role == "Starter") {
		return Math.max(0, (inning - 1) * PITCHES_PER_INNING + outs * 5 + randomInt(-6, 8));
	}
	return randomInt(0, 16);
}

// How tired the pitcher is, from 0 (fresh) to 1 (gassed)
function pitcherFatigue() {
	return clamp((pitcherPitchCount - 80) / 35, 0, 1);
}

function fatigueLabel() {
	if (pitcherPitchCount >= 100) {
		return "Gassed";
	}
	return pitcherPitchCount >= 85 ? "Tiring" : "Fresh";
}

// Pitch generation
function zoneChance() {
	var chance = ZONE_RATE[Math.min(balls, 3)][Math.min(strikes, 2)] + ZONE_RATE_OFFSET + pitcher.control - 0.04 * pitcherFatigue();
	return clamp(chance, 0.25, 0.75);
}

function pickLocationClass() {
	if (Math.random() * 100 < HIT_BY_PITCH_CHANCE) {
		return "hbp";
	}
	if (Math.random() < zoneChance()) {
		// Pitchers who are behind in the count throw it down the middle; with two strikes they nibble the edges
		var heartShare = HEART_SHARE_OF_ZONE + (balls > strikes ? 0.04 : 0) - (strikes == 2 ? 0.04 : 0);
		return Math.random() < heartShare ? "heart" : "edge";
	}
	// Out of the zone: shadow 19.8%, chase 21.7% and waste 7.85% of all pitches; with two strikes pitchers go for chases
	var shares = strikes == 2 ?
		[{ cls: "shadowOut", weight: 0.36 }, { cls: "chase", weight: 0.50 }, { cls: "waste", weight: 0.14 }] :
		[{ cls: "shadowOut", weight: 0.41 }, { cls: "chase", weight: 0.435 }, { cls: "waste", weight: 0.155 }];
	return randomWeighted(shares).cls;
}

function inRect(x, y, rect) {
	return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function locationFor(locClass) {
	var x;
	var y;
	if (locClass == "hbp") {
		return { x: randomBetween(12, 30), y: randomBetween(80, 150) };
	}
	var area = { heart: heart, edge: zone, shadowOut: shadowBox, chase: chaseBox, waste: plotBox }[locClass];
	do {
		x = randomBetween(area.left, area.right);
		y = randomBetween(area.top, area.bottom);
	} while ((locClass == "edge" && inRect(x, y, heart)) ||
		(locClass == "shadowOut" && inRect(x, y, zone)) ||
		(locClass == "chase" && inRect(x, y, shadowBox)) ||
		(locClass == "waste" && inRect(x, y, chaseBox)));
	return { x: x, y: y };
}

// What the player sees as the pitch leaves the pitcher's hand
function readPitch(locClass, type) {
	if (Math.random() < batter.eye) {
		return TRUE_READ[locClass];
	}
	var odds = READ_ODDS[locClass];
	// Breaking balls and offspeed pitches hide their location: balls look more like strikes
	var hidden = Math.min(odds.ball, type.deception);
	var strikeOdds = odds.strike + hidden * 0.4;
	var borderOdds = odds.border + hidden * 0.6;
	var roll = Math.random();
	if (roll < strikeOdds) {
		return "strike";
	}
	return roll < strikeOdds + borderOdds ? "border" : "ball";
}

function isInZone(p) {
	return p.locClass == "heart" || p.locClass == "edge";
}

// Inches from the edge of the strike zone: positive outside it, negative inside it
function distanceToEdge(p) {
	var dx = Math.max(zone.left - p.x, 0, p.x - zone.right);
	var dy = Math.max(zone.top - p.y, 0, p.y - zone.bottom);
	if (dx > 0 || dy > 0) {
		return Math.sqrt(dx * dx + dy * dy) / UNITS_PER_INCH;
	}
	return -Math.min(p.x - zone.left, zone.right - p.x, p.y - zone.top, zone.bottom - p.y) / UNITS_PER_INCH;
}

function describeLocation(p) {
	if (p.locClass == "heart") {
		return "right down the middle";
	}
	if (p.locClass == "edge") {
		if (p.x < zone.left + 16) {
			return "on the inside corner";
		}
		if (p.x > zone.right - 16) {
			return "on the outside corner";
		}
		return p.y < zone.top + 20 ? "at the top of the zone" : "at the knees";
	}
	var vertical = p.y < zone.top ? "high" : (p.y > zone.bottom ? "low" : "");
	var horizontal = p.x < zone.left ? "inside" : (p.x > zone.right ? "outside" : "");
	var close = p.locClass == "shadowOut" ? "just " : "";
	if (vertical && horizontal) {
		return close + vertical + " and " + horizontal;
	}
	if (vertical) {
		return p.y > 190 ? "in the dirt" : close + vertical;
	}
	return close + "off the plate " + horizontal;
}

function pitchTypeName(p) {
	return p.type.name.toLowerCase();
}

// Swing math
function availableApproaches() {
	var available = ["takePitch", "normalSwing", "swingForTheFences"];
	if (strikes == 2) {
		available.push("protectPlate");
	}
	if (runnersOn() && outs < 2) {
		available.push("behindRunner");
	}
	available.push("bunt");
	return available;
}

function approachLabel(id) {
	if (id == "bunt") {
		return runnersOn() && outs < 2 ? "Sacrifice bunt" : "Bunt for a hit";
	}
	return approaches[id].label;
}

function approachHint(id) {
	if (id == "bunt") {
		return runnersOn() && outs < 2 ? "Give yourself up to move the runners over." : "Try to beat it out.";
	}
	return approaches[id].hint;
}

function contactChance(swingType, p) {
	var chance = CONTACT[swingType][p.locClass] + p.type.contact + batter.contact - pitcher.stuff + 0.04 * pitcherFatigue();
	if (p.type.fastball) {
		// Harder fastballs are harder to catch up to
		chance -= (p.speed - 94) * 0.005;
	}
	if (strikes == 2) {
		chance += TWO_STRIKE_CONTACT_BONUS;
	}
	return clamp(chance, 0.03, 0.97);
}

function foulShare(swingType, p) {
	return clamp(FOUL_SHARE[p.locClass] + FOUL_APPROACH_SHIFT[swingType] + (strikes == 2 ? TWO_STRIKE_FOUL_BONUS : 0), 0.1, 0.92);
}

// Umpires call a strike more often the closer a pitch is to the zone. FanGraphs measured the odds outside the zone
// in 2020-21 (43% within half an inch of the edge, falling to about 8% three inches out). Umpires were more
// accurate on those pitches in 2025, so they are scaled down here until the game matches the 2025 league
// accuracy of 92.8% and about 16% of pitches called strikes. The odds just inside the zone mirror the curve.
var OUTSIDE_CALLED_STRIKE_SCALE = 0.8;
function calledStrikeChance(p) {
	var distance = distanceToEdge(p);
	var chance;
	if (distance > 0) {
		chance = OUTSIDE_CALLED_STRIKE_SCALE * (distance <= 0.5 ? 0.43 : (distance <= 1.5 ? 0.345 : (distance <= 2.5 ? 0.18 : (distance <= 3.5 ? 0.075 : (distance <= 5 ? 0.02 : 0)))));
	} else {
		var inside = -distance;
		chance = inside <= 0.5 ? 0.62 : (inside <= 1.5 ? 0.74 : (inside <= 2.5 ? 0.86 : (inside <= 3.5 ? 0.94 : (inside <= 5 ? 0.98 : 0.995))));
	}
	// Borderline pitches lean toward the side of the count: more strikes at 3-0, fewer at 0-2
	if (Math.abs(distance) <= 2.5) {
		chance += (balls == 3 ? 0.05 : 0) - (strikes == 2 ? 0.05 : 0);
	}
	return clamp(chance, 0, 1);
}

// A call only counts as missed when it is more than three-quarters of an inch from the zone's edge
function takeCall(p) {
	var strike = Math.random() < calledStrikeChance(p);
	var wrong = strike != isInZone(p);
	return { strike: strike, missed: wrong && Math.abs(distanceToEdge(p)) > 0.75 };
}

// A ball in play: how it was hit, whether it fell in, and what kind of hit or out it was
function pickBattedBall(swingType, p) {
	var weights = { gb: BATTED_BALL_WEIGHTS.gb, ld: BATTED_BALL_WEIGHTS.ld, fb: BATTED_BALL_WEIGHTS.fb, pu: BATTED_BALL_WEIGHTS.pu };
	// Pitches down in the zone get hit on the ground, pitches up in the air
	var height = clamp((p.y - 115) / 55, -1, 1);
	weights.gb += 7 * height;
	weights.fb -= 5 * height;
	weights.pu -= 2 * height;
	// Pitches off the plate get weak contact
	if (p.locClass == "chase") {
		weights.gb += 4; weights.pu += 4; weights.ld -= 5; weights.fb -= 3;
	} else if (p.locClass == "waste") {
		weights.gb += 6; weights.pu += 6; weights.ld -= 8; weights.fb -= 4;
	}
	if (swingType == "swingForTheFences") {
		weights.gb -= 8; weights.fb += 8;
	} else if (swingType == "protectPlate") {
		weights.gb += 5; weights.ld -= 2; weights.fb -= 3;
	} else if (swingType == "behindRunner") {
		weights.gb += 25; weights.fb -= 15; weights.ld -= 5; weights.pu -= 5;
	}
	if (batter.id == "contact") {
		weights.ld += 3; weights.fb -= 2; weights.gb -= 1;
	} else if (batter.id == "power") {
		weights.fb += 4; weights.gb -= 3; weights.ld -= 1;
	}
	var items = Object.keys(weights).map(function(kind) { return { kind: kind, weight: Math.max(0.5, weights[kind]) }; });
	return randomWeighted(items).kind;
}

function chooseInPlay(swingType, p) {
	if (swingType == "bunt") {
		if (Math.random() < BUNT_SINGLE_CHANCE[p.locClass]) {
			return { play: "buntSingle", kind: "bunt" };
		}
		return { play: Math.random() < 0.7 ? "buntOut" : "buntPop", kind: "bunt" };
	}
	var kind = pickBattedBall(swingType, p);
	var power = 1 + batter.xbhShift * 0.02;
	if (swingType == "swingForTheFences") {
		power *= 1.35;
	} else if (swingType == "protectPlate") {
		power *= 0.6;
	} else if (swingType == "behindRunner") {
		power *= 0.5;
	}
	var homeRunChance = kind == "fb" ? HOME_RUN_PER_FLY * power : (kind == "ld" ? HOME_RUN_PER_LINER * power : 0);
	if (Math.random() < homeRunChance) {
		return { play: Math.random() < INSIDE_PARK_SHARE ? "insideParkHR" : "homeRun", kind: kind };
	}
	if (Math.random() < HIT_CHANCE[kind]) {
		var kinds = HIT_KINDS[kind];
		var roll = Math.random() * (kinds.single + kinds.double + kinds.triple);
		if (roll < kinds.single) {
			return { play: "single", kind: kind };
		}
		return { play: roll < kinds.single + kinds.double ? "double" : "triple", kind: kind };
	}
	if (kind == "gb") {
		if (swingType == "behindRunner" && runnersOn() && Math.random() < 0.85) {
			return { play: "advanceOut", kind: kind };
		}
		if (canTurnDoublePlay() && Math.random() < (swingType == "behindRunner" ? 0.1 : DOUBLE_PLAY_CHANCE)) {
			return { play: "doublePlay", kind: kind };
		}
		if (bases[0] && !bases[1] && outs < 2 && Math.random() < FIELDERS_CHOICE_CHANCE / (1 - DOUBLE_PLAY_CHANCE)) {
			return { play: "fieldersChoice", kind: kind };
		}
		return { play: "groundOut", kind: kind };
	}
	if (kind == "ld") {
		return { play: "lineOut", kind: kind };
	}
	if (kind == "fb") {
		return { play: Math.random() < 0.5 + batter.xbhShift * 0.01 ? "deepFly" : "shallowFly", kind: kind };
	}
	return { play: Math.random() < 0.4 ? "foulOut" : "popOut", kind: kind };
}

// Statcast-style batted ball data. Launch angle bands follow MLB's definitions (ground ball under 10 degrees,
// line drive 10 to 25, fly ball 25 to 50, pop-up over 50); exit velocities average about 88 mph across all
// balls in play and about 103 mph on home runs.
function battedBallData(kind, play) {
	var ev;
	var la;
	var dist = null;
	if (kind == "bunt") {
		return { ev: clamp(randomNormal(22, 5), 12, 38).toFixed(1), la: Math.round(randomBetween(-20, 10)), dist: null };
	}
	if (play == "homeRun") {
		return {
			ev: clamp(randomNormal(103.5, 4.5), 95, 116).toFixed(1),
			la: Math.round(clamp(randomNormal(28, 4.5), 19, 40)),
			dist: Math.round(clamp(randomNormal(400, 24), 340, 480))
		};
	}
	if (play == "insideParkHR") {
		return { ev: clamp(randomNormal(98, 5), 88, 108).toFixed(1), la: Math.round(randomBetween(8, 26)), dist: Math.round(randomBetween(330, 395)) };
	}
	var spec = {
		gb: { ev: [84, 11], la: function() { return clamp(randomNormal(-6, 9), -30, 9.9); } },
		ld: { ev: [95, 7], la: function() { return randomBetween(10, 25); } },
		fb: { ev: [93, 9], la: function() { return clamp(randomNormal(33, 5), 25, 49); } },
		pu: { ev: [70, 9], la: function() { return clamp(randomNormal(62, 8), 51, 85); } }
	}[kind];
	ev = clamp(randomNormal(spec.ev[0], spec.ev[1]), 40, 112);
	la = Math.round(spec.la());
	if (la >= 8) {
		dist = { ld: 7.2, fb: 9.3, pu: 2.4, gb: 7.2 }[kind] * (ev - 58) * randomBetween(0.9, 1.1);
		if (play == "deepFly") {
			dist = clamp(randomNormal(340, 25), 295, 400);
		} else if (play == "shallowFly") {
			dist = clamp(randomNormal(215, 35), 130, 275);
		} else if (play == "double") {
			dist = Math.max(dist, randomBetween(250, 330));
		} else if (play == "triple") {
			dist = Math.max(dist, randomBetween(310, 390));
		} else if (play == "single") {
			dist = Math.min(dist, randomBetween(150, 250));
		}
		dist = Math.round(clamp(dist, 60, 420));
	}
	return { ev: ev.toFixed(1), la: la, dist: dist };
}

function hitDataText(data) {
	return data.ev + " mph, " + data.la + "°" + (data.dist ? ", " + data.dist + " ft" : "");
}

// Announcer-style context for the pitch that just happened
function commentary() {
	if (pitches == RECORD_PITCHES - 1) {
		return "One more pitch ties the record!";
	}
	if (pitches == RECORD_PITCHES) {
		return "That's pitch " + RECORD_PITCHES + ". You've tied the longest at-bat in MLB history!";
	}
	if (pitches == RECORD_PITCHES + 1) {
		return "You've passed Brandon Belt. This is the longest at-bat in MLB history!";
	}
	if (pitches == 10) {
		return "Ten pitches in. " + pitcher.name + " is working hard out there.";
	}
	if (pitches == 15) {
		return "Fifteen pitches! Only a handful of at-bats have ever lasted this long.";
	}
	if (pitcherFatigue() > 0.5 && !tiredNoted) {
		tiredNoted = true;
		return pitcher.name + " is starting to labor. Watch the command.";
	}
	if (balls == 3 && strikes == 2 && !fullCountNoted) {
		fullCountNoted = true;
		return "Full count. The whole park is on its feet.";
	}
	return "";
}

// A league-average fact that fits how the at-bat ended
function leagueFact(reason) {
	var average = "The average MLB plate appearance lasts " + LEAGUE.pitchesPerPA + " pitches. ";
	if (reason == "struck out") {
		return average + "Hitters struck out in " + LEAGUE.strikeoutRate + "% of plate appearances in 2025.";
	}
	if (reason == "were walked" || reason == "walked in a run") {
		return average + LEAGUE.walkRate + "% of plate appearances in 2025 ended in a walk.";
	}
	if (reason == "were hit by a pitch") {
		return average + "Batters were hit by a pitch in about " + LEAGUE.hitByPitchRate + "% of plate appearances in 2025, or " + HIT_BY_PITCH_CHANCE + "% of pitches.";
	}
	if (reason == "hit a home run" || reason == "hit an inside-the-park home run") {
		return average + "Home runs ended " + LEAGUE.homeRunRate + "% of plate appearances in 2025.";
	}
	if (reason == "singled" || reason == "bunted for a single") {
		return average + "Singles were " + LEAGUE.singleShare + "% of hits in 2025.";
	}
	if (reason == "doubled") {
		return average + "Doubles were " + LEAGUE.doubleShare + "% of hits in 2025.";
	}
	if (reason == "tripled") {
		return average + "Only " + LEAGUE.tripleShare + "% of hits in 2025 were triples.";
	}
	return average + "With a league on-base percentage of about " + LEAGUE.onBasePct.toFixed(3).slice(1) + ", about " + Math.round((1 - LEAGUE.onBasePct) * 100) + "% of plate appearances ended in an out.";
}

function startGame() {
	// Choose a batter, then begin the at-bat
	atBatId++;
	atBatActive = false;
	currentPitch = null;
	resetAtBat();
	updateCount();
	gameContentArea.innerHTML = "";
	swingOptionsArea.innerHTML = "";
	addParagraph("Choose your batter for this at-bat.", "situation");
	var choices = document.createElement("div");
	choices.id = "batterChoices";
	batterTypes.forEach(function(type) {
		var button = document.createElement("button");
		button.className = "batterChoice";
		button.type = "button";
		var name = document.createElement("span");
		name.className = "optionLabel";
		name.textContent = type.name;
		var description = document.createElement("small");
		description.textContent = type.description;
		button.appendChild(name);
		button.appendChild(description);
		button.addEventListener("click", function() {
			beginAtBat(type.id);
		});
		choices.appendChild(button);
	});
	gameContentArea.appendChild(choices);
}

function beginAtBat(typeId) {
	batter = batterTypes.filter(function(type) { return type.id == typeId; })[0] || batterTypes[0];
	atBatId++;
	atBatActive = true;
	resetAtBat();
	generateSituation();
	pitcher = generatePitcher();
	pitcherPitchCount = startingPitchCount();
	updateScoreboard();
	updateMatchup();
	gameContentArea.innerHTML = "";
	addParagraph(situationText(), "situation");
	addParagraph(pitcher.name + " (" + pitcher.hand + "HP) is on the mound. " + scoutingText());
	addParagraph("Step into the box. The pitcher is ready.");
	throwPitch();
}

// Deliver the next pitch: the player sees its type, speed and a read on where it is headed
function throwPitch() {
	var type = randomWeighted(pitcher.mix).type;
	var locClass = pickLocationClass();
	var location = locationFor(locClass);
	currentPitch = {
		type: type,
		speed: type.mean + pitcher.velo + randomNormal(0, 1.3) - 1.5 * pitcherFatigue(),
		locClass: locClass,
		x: location.x,
		y: location.y,
		read: readPitch(locClass, type)
	};
	renderOptions();
}

function renderOptions() {
	swingOptionsArea.innerHTML = "";
	var incoming = document.createElement("div");
	incoming.id = "incomingPitch";
	incoming.setAttribute("aria-live", "polite");
	var heading = document.createElement("span");
	heading.className = "incomingHeading";
	heading.textContent = "Pitch " + (pitches + 1) + ": " + currentPitch.speed.toFixed(1) + " mph " + currentPitch.type.name;
	var chip = document.createElement("span");
	chip.className = "readChip read-" + currentPitch.read;
	chip.textContent = READ_LABELS[currentPitch.read];
	incoming.appendChild(heading);
	incoming.appendChild(chip);
	swingOptionsArea.appendChild(incoming);

	var buttons = document.createElement("div");
	buttons.id = "optionButtons";
	availableApproaches().forEach(function(id, i) {
		var button = document.createElement("button");
		button.id = id;
		button.className = "swingOption";
		button.type = "button";
		var label = document.createElement("span");
		label.className = "optionLabel";
		label.textContent = (i + 1) + ". " + approachLabel(id);
		var hint = document.createElement("small");
		hint.textContent = approachHint(id);
		button.appendChild(label);
		button.appendChild(hint);
		button.addEventListener("click", function() {
			calcHit(id);
		});
		buttons.appendChild(button);
	});
	swingOptionsArea.appendChild(buttons);
}

function showWaiting() {
	var incoming = document.getElementById("incomingPitch");
	if (incoming) {
		incoming.innerHTML = "";
		var waiting = document.createElement("span");
		waiting.className = "incomingHeading";
		waiting.textContent = "Here comes the next pitch...";
		incoming.appendChild(waiting);
	}
}

function gameOver(reason, runs, note) {
	var result;
	var message;
	var seen = pluralize(pitches, "pitch", "pitches");
	if (pitches > RECORD_PITCHES) {
		result = "Broke the Record";
		message = "Congratulations! You saw " + seen + " before you " + reason + "! You broke the record!";
	} else if (pitches == RECORD_PITCHES) {
		result = "Tied the Record";
		message = "You saw " + seen + " before you " + reason + "! You tied the record!";
	} else {
		result = "Did Not Break the Record";
		message = "You only saw " + seen + " before you " + reason + "! You didn't break the record!";
	}
	window.dataLayer = window.dataLayer || [];
	window.dataLayer.push({ 'event': 'gameEnd', 'gameEndResult': result, 'gameEndReason': reason });

	atBatActive = false;
	currentPitch = null;
	clearTimeout(nextPitchTimer);
	swingOptionsArea.innerHTML = "";
	updateScoreboard();

	if (note) {
		addParagraph(note);
	}
	if (!isTopInning && inning >= 9 && runs > 0 && homeRuns > awayRuns) {
		addParagraph("Walk-off! Your team wins " + homeRuns + "-" + awayRuns + ".", "situation");
	} else if (runs > 0) {
		addParagraph((runs == 1 ? "A run scores. " : runs + " runs score. ") + scoreText(), "situation");
	}
	if (outs >= 3) {
		addParagraph("That's the third out. The inning is over.", "situation");
	}

	var gameOverArea = document.createElement("div");
	gameOverArea.id = "gameOver";
	gameContentArea.appendChild(gameOverArea);
	gameOverArea.appendChild(createParagraph(message));
	gameOverArea.appendChild(createParagraph(leagueFact(reason)));
	gameOverArea.appendChild(createParagraph("At the pitch clock's pace of about " + secondsPerPitch() + " seconds between pitches with " + (runnersOn() ? "runners on" : "the bases empty") + ", your at-bat would have lasted about " + formatTime(atBatSeconds) + ". Brandon Belt's 21-pitch at-bat took nearly 13 minutes, before the pitch clock."));

	var resetButton = document.createElement("button");
	resetButton.id = "resetGame";
	resetButton.textContent = "Want to try again?";
	resetButton.addEventListener("click", startGame);
	gameContentArea.appendChild(resetButton);
}

function updateCount() {
	pitchCountDisplay.textContent = pitches;
	atBatTimeDisplay.textContent = formatTime(atBatSeconds);
	batterLineDisplay.textContent = "Count: " + countText();
	if (pitcher) {
		pitcherLineDisplay.textContent = "P: " + pitcherPitchCount + " · " + fatigueLabel();
	}
	for (var i = 1; i <= 3; i++) {
		document.getElementById("ball" + i).className = "ball" + (balls >= i ? " active" : "");
	}
	for (var j = 1; j <= 2; j++) {
		document.getElementById("strike" + j).className = "strike" + (strikes >= j ? " active" : "");
		document.getElementById("out" + j).className = "out" + (outs >= j ? " active" : "");
	}
}

function updateMatchup() {
	batterTypeDisplay.textContent = batter.name;
	pitcherNameDisplay.textContent = pitcher.name;
	pitcherTypeDisplay.textContent = pitcher.role + " · " + (pitcher.hand == "L" ? "Left" : "Right") + "-handed · " + scoutingText();
	var total = pitcher.mix.reduce(function(sum, entry) { return sum + entry.weight; }, 0);
	arsenalDisplay.innerHTML = "";
	pitcher.mix.slice().sort(function(a, b) { return b.weight - a.weight; }).forEach(function(entry) {
		var share = document.createElement("span");
		share.className = "arsenalPitch";
		share.textContent = entry.type.short + " " + Math.round(entry.weight / total * 100) + "%";
		arsenalDisplay.appendChild(share);
	});
	updateCount();
}

function updateScoreboard() {
	updateCount();
	awayRunsDisplay.textContent = awayRuns;
	homeRunsDisplay.textContent = homeRuns;
	document.getElementById("awayTeam").className = "team" + (isTopInning ? " batting" : "");
	document.getElementById("homeTeam").className = "team" + (isTopInning ? "" : " batting");
	inningArrowDisplay.innerHTML = isTopInning ? "&#9650;" : "&#9660;";
	inningLabelDisplay.textContent = ordinal(inning);
	batterNameDisplay.textContent = "You (" + battingTeamName() + ")";
	for (var i = 1; i <= 3; i++) {
		var occupied = bases[i - 1] ? " occupied" : "";
		document.getElementById("base" + i).className = "base " + ["first", "second", "third"][i - 1] + occupied;
		document.getElementById("fieldBase" + i).setAttribute("class", "fieldBase" + occupied);
	}
	var runnerLabel = runnersText();
	basesDisplay.setAttribute("aria-label", runnerLabel.charAt(0).toUpperCase() + runnerLabel.slice(1));
}

function scoreRuns(runs) {
	if (isTopInning) {
		awayRuns += runs;
	} else {
		homeRuns += runs;
	}
}

// Show the result of a pitch, with optional extra lines (umpire call, announcer commentary)
function showPitch(heading, narrative, extras) {
	gameContentArea.innerHTML = "";
	addParagraph(heading + " " + countText(), "pitchResult");
	addParagraph(narrative);
	(extras || []).forEach(function(extra) {
		if (extra[0]) {
			addParagraph(extra[0], extra[1]);
		}
	});
}

function nextPitch() {
	var id = atBatId;
	showWaiting();
	nextPitchTimer = setTimeout(function() {
		if (id == atBatId && atBatActive) {
			throwPitch();
		}
	}, NEXT_PITCH_DELAY);
}

function svgElement(name, attributes) {
	var element = document.createElementNS(svgNamespace, name);
	Object.keys(attributes).forEach(function(key) {
		element.setAttribute(key, attributes[key]);
	});
	return element;
}

// Log the pitch in the strike zone and the pitch-by-pitch list
function recordPitch(p, description, colorClass, options) {
	options = options || {};
	atBatSeconds += secondsPerPitch();
	pitcherPitchCount++;

	// Strike zone mark and the pitch's path from the pitcher's hand
	var previous = pitchMarksArea.querySelector(".latest");
	if (previous) {
		previous.classList.remove("latest");
	}
	pitchTrailArea.innerHTML = "";
	pitchTrailArea.appendChild(svgElement("line", { "class": "pitchPath", x1: RELEASE_POINT.x, y1: RELEASE_POINT.y, x2: p.x.toFixed(1), y2: p.y.toFixed(1) }));
	var mark = svgElement("g", { "class": "pitchMark latest " + colorClass });
	mark.appendChild(svgElement("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 9 }));
	var number = svgElement("text", { x: p.x.toFixed(1), y: (p.y + 3.5).toFixed(1) });
	number.textContent = pitches;
	mark.appendChild(number);
	pitchMarksArea.appendChild(mark);

	// Pitch-by-pitch log entry, newest first
	var entry = document.createElement("li");
	entry.className = "pitchLogEntry";
	var badge = document.createElement("span");
	badge.className = "pitchNumber " + colorClass;
	badge.textContent = pitches;
	var details = document.createElement("span");
	details.className = "pitchDetails";
	var descriptionLine = document.createElement("span");
	descriptionLine.className = "pitchDescription";
	descriptionLine.textContent = description;
	if (options.missedCall) {
		var missed = document.createElement("span");
		missed.className = "missedCall";
		missed.textContent = "Missed call";
		descriptionLine.appendChild(missed);
	}
	var infoLine = document.createElement("span");
	infoLine.className = "pitchInfo";
	infoLine.textContent = p.speed.toFixed(1) + " mph " + p.type.name;
	details.appendChild(descriptionLine);
	details.appendChild(infoLine);
	if (options.hitData) {
		var hitLine = document.createElement("span");
		hitLine.className = "pitchInfo hitStats";
		hitLine.textContent = options.hitData;
		details.appendChild(hitLine);
	}
	var count = document.createElement("span");
	count.className = "pitchCount";
	count.textContent = countText();
	entry.appendChild(badge);
	entry.appendChild(details);
	entry.appendChild(count);
	pitchLogList.insertBefore(entry, pitchLogList.firstChild);
	pitchLogEmpty.hidden = true;
}

// Draw where a ball in play went on the field view
function showHit(result, play, data) {
	var info = playInfo[play];
	hitPanel.hidden = false;
	hitMarksArea.innerHTML = "";
	hitMarksArea.appendChild(svgElement("line", { "class": "hitPath", x1: 150, y1: 225, x2: result.x, y2: result.y }));
	if (info.result == "homer") {
		hitMarksArea.appendChild(svgElement("circle", { "class": "hitRing", cx: result.x, cy: result.y, r: 11 }));
	}
	hitMarksArea.appendChild(svgElement("circle", { "class": "hitDot " + info.result, cx: result.x, cy: result.y, r: 5 }));
	hitInfoDisplay.textContent = info.label + " · " + hitDataText(data);
}

function addBall(swingType, p, missedCall) {
	balls = balls + 1;
	pitches = pitches + 1;
	recordPitch(p, "Ball", "ballColor", { missedCall: missedCall });
	var umpire = missedCall ? ["Replay shows that pitch was in the zone. The umpire missed the call!", "umpire"] : [];
	if (balls == 4) {
		var runs = forceRunners();
		scoreRuns(runs);
		showPitch("Ball four!", "You took a " + pitchTypeName(p) + " " + describeLocation(p) + " for ball four, earning a walk.", [umpire]);
		gameOver(runs > 0 ? "walked in a run" : "were walked", runs);
		return;
	}
	updateCount();
	showPitch("Ball!", "You took a " + pitchTypeName(p) + " " + describeLocation(p) + ".", [umpire, [commentary(), "ticker"]]);
	nextPitch();
}

function addStrike(swingType, p, missedCall) {
	strikes = strikes + 1;
	pitches = pitches + 1;
	var narrative;
	if (swingType == "takePitch") {
		recordPitch(p, "Called Strike", "strikeColor", { missedCall: missedCall });
		narrative = "You took a " + pitchTypeName(p) + " " + describeLocation(p) + " for a called strike.";
	} else if (swingType == "bunt") {
		recordPitch(p, "Missed Bunt", "strikeColor");
		narrative = "You squared to bunt on a " + pitchTypeName(p) + " " + describeLocation(p) + ", but missed it.";
	} else {
		recordPitch(p, "Swinging Strike", "strikeColor");
		narrative = "You swung through a " + pitchTypeName(p) + " " + describeLocation(p) + ".";
	}
	var umpire = missedCall ? ["That pitch looked off the plate, but the umpire rang you up.", "umpire"] : [];
	if (strikes == 3) {
		outs++;
		showPitch("Strike three!", narrative, [umpire]);
		gameOver("struck out", 0);
		return;
	}
	updateCount();
	showPitch("Strike!", narrative, [umpire, [commentary(), "ticker"]]);
	nextPitch();
}

function addFoul(swingType, p) {
	pitches = pitches + 1;
	if (strikes == 2 && swingType == "bunt") {
		// A foul bunt with two strikes is a strikeout
		strikes = 3;
		outs++;
		recordPitch(p, "Foul Bunt", "strikeColor");
		showPitch("Strike three!", "Your bunt rolled foul. Strike three.");
		gameOver("struck out", 0);
		return;
	}
	if (strikes < 2) {
		strikes = strikes + 1;
	}
	recordPitch(p, swingType == "bunt" ? "Foul Bunt" : "Foul", "strikeColor");
	updateCount();
	var narrative = swingType == "bunt" ? "Your bunt rolled foul." : (Math.random() < 0.4 ? "You got just enough of a " + pitchTypeName(p) + " to foul it off." : randomItem(foulNarratives));
	showPitch("Foul!", narrative, [[commentary(), "ticker"]]);
	nextPitch();
}

function addInPlay(swingType, p) {
	var choice = chooseInPlay(swingType, p);
	var play = choice.play;
	var info = playInfo[play];
	var result = randomItem(inPlayPools[play]);
	var data = battedBallData(choice.kind, play);
	var outsBefore = outs;
	pitches = pitches + 1;
	var outcome = resolvePlay(play);
	scoreRuns(outcome.runs);
	var reason = info.reason;
	if (play == "deepFly" && outcome.runs > 0) {
		reason = "hit a sacrifice fly";
	} else if ((play == "advanceOut" || play == "groundOut") && outcome.runs > 0) {
		reason = "drove in a run with a groundout";
	} else if (play == "buntOut" && outcome.note) {
		reason = "laid down a sacrifice bunt";
	}
	var description = "In play, no out";
	if (outcome.runs > 0) {
		description = "In play, run(s)";
	} else if (outs > outsBefore) {
		description = "In play, out(s)";
	}
	recordPitch(p, description, "inPlayColor", { hitData: hitDataText(data) });
	showHit(result, play, data);
	showPitch("In play!", result.text);
	gameOver(reason, outcome.runs, outcome.note);
}

function addHBP(p) {
	pitches = pitches + 1;
	recordPitch(p, "Hit By Pitch", "inPlayColor");
	var runs = forceRunners();
	scoreRuns(runs);
	showPitch("Hit by pitch!", "You got hit by a pitch!");
	gameOver("were hit by a pitch", runs);
}

function calcHit(swingType) {
	if (!atBatActive || availableApproaches().indexOf(swingType) < 0) {
		return;
	}
	swingOptionButtonsToggle(true);
	if (!currentPitch) {
		throwPitch();
	}
	var p = currentPitch;
	currentPitch = null;
	if (p.locClass == "hbp") {
		addHBP(p);
		return;
	}
	if (swingType == "takePitch") {
		var call = takeCall(p);
		if (call.strike) {
			addStrike(swingType, p, call.missed);
		} else {
			addBall(swingType, p, call.missed);
		}
		return;
	}
	if (Math.random() >= contactChance(swingType, p)) {
		addStrike(swingType, p, false);
	} else if (Math.random() < foulShare(swingType, p)) {
		addFoul(swingType, p);
	} else {
		addInPlay(swingType, p);
	}
}

function swingOptionButtonsToggle(disabled) {
	var swingOptionButtons = document.querySelectorAll(".swingOption");
	for (var i = 0; i < swingOptionButtons.length; i++) {
		swingOptionButtons[i].disabled = disabled;
	}
}

function resetAtBat() {
	clearTimeout(nextPitchTimer);
	pitches = 0;
	strikes = 0;
	balls = 0;
	atBatSeconds = 0;
	tiredNoted = false;
	fullCountNoted = false;
	pitchMarksArea.innerHTML = "";
	pitchTrailArea.innerHTML = "";
	pitchLogList.innerHTML = "";
	pitchLogEmpty.hidden = false;
	hitMarksArea.innerHTML = "";
	hitInfoDisplay.textContent = "";
	hitPanel.hidden = true;
}

// Number keys choose a pitch approach
document.addEventListener("keydown", function(event) {
	if (event.ctrlKey || event.metaKey || event.altKey) {
		return;
	}
	var buttons = document.querySelectorAll(".swingOption");
	var number = parseInt(event.key, 10);
	if (number >= 1 && number <= buttons.length && !buttons[number - 1].disabled) {
		buttons[number - 1].click();
	}
});

document.getElementById("recordPitches").textContent = RECORD_PITCHES;
document.getElementById("startGame").addEventListener("click", startGame);
