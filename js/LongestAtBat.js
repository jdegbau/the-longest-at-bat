// Game-wide constants
var RECORD_PITCHES = 21; // Brandon Belt vs. Jaime Barría, April 22, 2018
var HIT_BY_PITCH_CHANCE = 0.23; // Percent chance per pitch
var SECONDS_PER_PITCH_EMPTY = 16; // Approximate MLB average between pitches with the bases empty under the pitch clock
var SECONDS_PER_PITCH_RUNNERS = 19; // Approximate MLB average between pitches with runners on under the pitch clock
var NEXT_PITCH_DELAY = 3000; // Milliseconds before the next pitch is delivered
var RELEASE_POINT = { x: 100, y: 8 }; // Where pitches leave the pitcher's hand in the strike zone view

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

// Pitch types: velocity range, how much they cut contact, and how much they hide their location out of the hand
var pitchLibrary = {
	fourSeam: { name: "Four-Seam Fastball", short: "4-Seam", minSpeed: 92, maxSpeed: 98, contact: -0.02, deception: 0, fastball: true },
	sinker: { name: "Sinker", short: "Sinker", minSpeed: 91, maxSpeed: 96, contact: 0, deception: 0.02, fastball: true },
	cutter: { name: "Cutter", short: "Cutter", minSpeed: 87, maxSpeed: 92, contact: -0.03, deception: 0.05 },
	slider: { name: "Slider", short: "Slider", minSpeed: 83, maxSpeed: 89, contact: -0.07, deception: 0.12 },
	curveball: { name: "Curveball", short: "Curve", minSpeed: 76, maxSpeed: 82, contact: -0.06, deception: 0.15 },
	changeup: { name: "Changeup", short: "Change", minSpeed: 83, maxSpeed: 89, contact: -0.05, deception: 0.08 },
	splitter: { name: "Splitter", short: "Splitter", minSpeed: 84, maxSpeed: 90, contact: -0.08, deception: 0.12 }
};

// Fictional pitchers
var pitcherInitials = ["A", "B", "C", "D", "E", "G", "J", "K", "L", "M", "N", "P", "R", "S", "T", "W"];
var pitcherSurnames = ["Alvarez", "Brennan", "Castillo", "Donovan", "Ellison", "Fontaine", "Gallagher", "Hartwell", "Ibarra", "Jennings", "Kowalski", "Lindgren", "Montoya", "Nakamura", "Okafor", "Prescott", "Quintero", "Ramsey", "Sutherland", "Tavares", "Vasquez", "Whitfield"];

// How often the pitcher throws a strike by count: ZONE_RATE[balls][strikes]
var ZONE_RATE = [
	[0.55, 0.48, 0.38],
	[0.50, 0.48, 0.42],
	[0.52, 0.52, 0.46],
	[0.62, 0.56, 0.54]
];

// Runner setups and how often each comes up, roughly in line with how often MLB batters see them
var baseStates = [
	{ bases: [false, false, false], weight: 40 },
	{ bases: [true, false, false], weight: 20 },
	{ bases: [false, true, false], weight: 9 },
	{ bases: [false, false, true], weight: 4 },
	{ bases: [true, true, false], weight: 10 },
	{ bases: [true, false, true], weight: 6 },
	{ bases: [false, true, true], weight: 4 },
	{ bases: [true, true, true], weight: 7 }
];

// Strike zone bounds in the SVG's coordinates (catcher's view; a right-handed batter stands on the left)
var zone = { left: 60, right: 140, top: 60, bottom: 170 };
var heart = { left: 76, right: 124, top: 80, bottom: 150 };

// Where a pitch is headed and how likely the player is to read it correctly
var READ_ODDS = {
	heart: { strike: 0.9, border: 0.1, ball: 0 },
	edge: { strike: 0.3, border: 0.55, ball: 0.15 },
	chase: { strike: 0.1, border: 0.5, ball: 0.4 },
	waste: { strike: 0, border: 0.1, ball: 0.9 },
	hbp: { strike: 0, border: 0.1, ball: 0.9 }
};
var TRUE_READ = { heart: "strike", edge: "border", chase: "ball", waste: "ball", hbp: "ball" };
var READ_LABELS = { strike: "Looks like a strike", border: "Borderline pitch", ball: "Looks like a ball" };

// Chance of making contact by approach and pitch location
var CONTACT = {
	normalSwing: { heart: 0.90, edge: 0.78, chase: 0.50, waste: 0.18 },
	swingForTheFences: { heart: 0.78, edge: 0.62, chase: 0.34, waste: 0.08 },
	protectPlate: { heart: 0.97, edge: 0.94, chase: 0.80, waste: 0.45 },
	behindRunner: { heart: 0.88, edge: 0.76, chase: 0.48, waste: 0.16 },
	bunt: { heart: 0.78, edge: 0.66, chase: 0.35, waste: 0.10 }
};

// Share of contact that goes foul rather than in play
var FOUL_SHARE = { normalSwing: 0.40, swingForTheFences: 0.36, protectPlate: 0.84, behindRunner: 0.44, bunt: 0.38 };
var FOUL_LOCATION_BONUS = { heart: -0.06, edge: 0.02, chase: 0.12, waste: 0.18 };

// Chance a ball in play falls for a hit, by pitch location and approach
var HIT_CHANCE = { heart: 0.36, edge: 0.31, chase: 0.20, waste: 0.12 };
var HIT_APPROACH_BONUS = { normalSwing: 0, swingForTheFences: 0.03, protectPlate: -0.07, behindRunner: -0.04 };
var BUNT_SINGLE_CHANCE = { heart: 0.26, edge: 0.20, chase: 0.12, waste: 0.08 };

// What a ball in play can be: label, how the at-bat ended, Statcast-style hit data, and where it landed on the field.
var playInfo = {
	single: { label: "Single", reason: "singled", ev: [72, 100], la: [-3, 18], dist: [110, 240], result: "hit" },
	double: { label: "Double", reason: "doubled", ev: [92, 106], la: [10, 24], dist: [280, 380], result: "hit" },
	triple: { label: "Triple", reason: "tripled", ev: [95, 108], la: [12, 24], dist: [340, 400], result: "hit" },
	homeRun: { label: "Home Run", reason: "hit a home run", ev: [98, 113], la: [24, 34], dist: [365, 455], result: "homer" },
	insideParkHR: { label: "Inside-the-Park HR", reason: "hit an inside-the-park home run", ev: [95, 105], la: [10, 20], dist: [330, 400], result: "homer" },
	groundOut: { label: "Groundout", reason: "grounded out", ev: [65, 98], la: [-14, 2], dist: null, result: "out" },
	shallowFly: { label: "Flyout", reason: "flew out", ev: [70, 92], la: [30, 50], dist: [150, 270], result: "out" },
	deepFly: { label: "Flyout", reason: "flew out", ev: [88, 103], la: [28, 40], dist: [330, 400], result: "out" },
	lineOut: { label: "Lineout", reason: "lined out", ev: [90, 105], la: [8, 20], dist: [180, 290], result: "out" },
	foulOut: { label: "Pop Out", reason: "fouled out", ev: [60, 85], la: [50, 75], dist: [100, 220], result: "out" },
	doublePlay: { label: "Double Play", reason: "grounded into a double play", ev: [70, 98], la: [-14, 2], dist: null, result: "out" },
	advanceOut: { label: "Groundout", reason: "grounded out, moving the runners up", ev: [65, 95], la: [-12, 2], dist: null, result: "out" },
	buntSingle: { label: "Bunt Single", reason: "bunted for a single", ev: [15, 32], la: [-20, -2], dist: null, result: "hit" },
	buntOut: { label: "Bunt Groundout", reason: "were thrown out on a bunt", ev: [15, 32], la: [-20, -2], dist: null, result: "out" },
	buntPop: { label: "Bunt Pop Out", reason: "popped out on a bunt", ev: [18, 34], la: [25, 55], dist: null, result: "out" }
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

// Runs scored in one half-inning, weighted toward how often MLB teams score each amount
function halfInningRuns() {
	return randomWeighted([
		{ runs: 0, weight: 72 },
		{ runs: 1, weight: 15 },
		{ runs: 2, weight: 7 },
		{ runs: 3, weight: 3.5 },
		{ runs: 4, weight: 1.5 },
		{ runs: 5, weight: 1 }
	]).runs;
}

function totalRuns(halfInnings) {
	var runs = 0;
	for (var i = 0; i < halfInnings; i++) {
		runs += halfInningRuns();
	}
	return runs;
}

function generateSituation() {
	inning = Math.random() < 0.06 ? randomInt(10, 12) : randomInt(1, 9);
	isTopInning = Math.random() < 0.5;
	outs = randomInt(0, 2);
	bases = randomWeighted(baseStates).bases.slice();

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
		if (isTopInning) {
			awayRuns += halfInningRuns();
		} else {
			homeRuns += halfInningRuns();
		}
	} while (!isTopInning && inning >= 9 && homeRuns > awayRuns);
}

// Move runners and the batter, returning the runs that scored.
// advanceBy(base) says how many bases the runner on that base (1-3) moves; batterBase is 0 when the batter is out.
function advanceRunners(advanceBy, batterBase) {
	var newBases = [false, false, false];
	var runs = 0;
	for (var base = 3; base >= 1; base--) {
		if (bases[base - 1]) {
			var destination = base + advanceBy(base);
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
	if (play == "single" || play == "buntSingle") {
		// On a single, a runner on second comes around to score
		runs = advanceRunners(function(base) { return play == "single" && base == 2 ? 2 : 1; }, 1);
	} else if (play == "double") {
		runs = advanceRunners(function() { return 2; }, 2);
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
	} else if (play == "deepFly" && bases[2] && outsBefore < 2) {
		outs++;
		bases[2] = false;
		runs = 1;
		note = "The runner tagged up from third and scored on the sacrifice fly.";
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
	var fastball = Math.random() < 0.65 ? "fourSeam" : "sinker";
	var others = shuffle(["slider", "curveball", "changeup", "cutter", "splitter"]).slice(0, randomInt(2, 3));
	var mix = [{ type: pitchLibrary[fastball], weight: randomInt(40, 58) }];
	var remaining = 100 - mix[0].weight;
	var shares = others.map(function() { return randomInt(1, 3); });
	var shareTotal = shares.reduce(function(total, share) { return total + share; }, 0);
	others.forEach(function(key, i) {
		mix.push({ type: pitchLibrary[key], weight: remaining * shares[i] / shareTotal });
	});
	return {
		name: randomItem(pitcherInitials) + ". " + randomItem(pitcherSurnames),
		hand: Math.random() < 0.27 ? "L" : "R",
		mix: mix,
		control: randomBetween(-0.06, 0.06), // Shifts how often pitches are strikes
		stuff: randomBetween(-0.04, 0.04), // Shifts how hard the pitcher is to hit
		velo: randomBetween(-1.5, 1.5)
	};
}

function scoutingText() {
	var control = pitcher.control > 0.03 ? "Pinpoint control" : (pitcher.control < -0.03 ? "Wild at times" : "Average control");
	var stuff = pitcher.stuff > 0.02 ? "nasty stuff" : (pitcher.stuff < -0.02 ? "hittable stuff" : "solid stuff");
	return control + ", " + stuff + ".";
}

// Late innings mean relievers who have thrown fewer pitches
function startingPitchCount() {
	if (inning >= 7) {
		return randomInt(5, 28);
	}
	return (inning - 1) * 14 + randomInt(0, 12);
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
	var chance = ZONE_RATE[Math.min(balls, 3)][Math.min(strikes, 2)] + pitcher.control - 0.10 * pitcherFatigue();
	return clamp(chance, 0.25, 0.75);
}

function pickLocationClass() {
	if (Math.random() * 100 < HIT_BY_PITCH_CHANCE) {
		return "hbp";
	}
	if (Math.random() < zoneChance()) {
		// Pitchers who are behind in the count throw it down the middle; with two strikes they nibble the edges
		var heartShare = 0.35 + (balls > strikes ? 0.12 : 0) - (strikes == 2 && balls < 3 ? 0.12 : 0);
		return Math.random() < heartShare ? "heart" : "edge";
	}
	// With two strikes pitchers try to get a chase just off the plate
	return Math.random() < (strikes == 2 ? 0.58 : 0.38) ? "chase" : "waste";
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
	do {
		if (locClass == "heart") {
			x = randomBetween(heart.left, heart.right);
			y = randomBetween(heart.top, heart.bottom);
		} else if (locClass == "edge") {
			x = randomBetween(zone.left, zone.right);
			y = randomBetween(zone.top, zone.bottom);
		} else if (locClass == "chase") {
			x = randomBetween(zone.left - 14, zone.right + 14);
			y = randomBetween(zone.top - 14, zone.bottom + 14);
		} else {
			x = randomBetween(22, 178);
			y = randomBetween(22, 206);
		}
	} while ((locClass == "edge" && inRect(x, y, heart)) ||
		(locClass == "chase" && inRect(x, y, zone)) ||
		(locClass == "waste" && inRect(x, y, { left: zone.left - 14, right: zone.right + 14, top: zone.top - 14, bottom: zone.bottom + 14 })));
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
	if (vertical && horizontal) {
		return vertical + " and " + horizontal;
	}
	if (vertical) {
		return p.y > 190 ? "in the dirt" : vertical;
	}
	return "off the plate " + horizontal;
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
	var chance = CONTACT[swingType][p.locClass] + p.type.contact + batter.contact - pitcher.stuff + 0.05 * pitcherFatigue();
	if (p.type.fastball) {
		// Harder fastballs are harder to catch up to
		chance -= (p.speed - 94) * 0.006;
	}
	if (strikes == 2 && swingType != "protectPlate") {
		chance -= 0.04;
	}
	return clamp(chance, 0.03, 0.97);
}

function foulShare(swingType, p) {
	return clamp(FOUL_SHARE[swingType] + FOUL_LOCATION_BONUS[p.locClass] + (strikes == 2 ? 0.04 : 0), 0.1, 0.9);
}

// Does a taken pitch get called a strike? Umpires miss borderline calls now and then.
function takeCall(p) {
	var strikeChance = { heart: 0.99, edge: 0.84, chase: 0.10, waste: 0 }[p.locClass];
	var strike = Math.random() < strikeChance;
	return { strike: strike, missed: strike != isInZone(p) };
}

function chooseInPlay(swingType, p) {
	var play;
	if (swingType == "bunt") {
		if (Math.random() < BUNT_SINGLE_CHANCE[p.locClass]) {
			return "buntSingle";
		}
		return Math.random() < 0.7 ? "buntOut" : "buntPop";
	}
	var hitChance = clamp(HIT_CHANCE[p.locClass] + HIT_APPROACH_BONUS[swingType] + batter.contact * 0.4, 0.05, 0.6);
	if (Math.random() < hitChance) {
		var power = approachesPower(swingType);
		var weights = {
			single: Math.max(1, power.single - batter.xbhShift * 0.9),
			double: Math.max(1, power.double + batter.xbhShift * 0.3),
			triple: power.triple,
			homeRun: Math.max(1, power.homeRun + batter.xbhShift * 0.6)
		};
		var roll = Math.random() * (weights.single + weights.double + weights.triple + weights.homeRun);
		if (roll < weights.single) {
			return "single";
		}
		roll -= weights.single;
		if (roll < weights.double) {
			return "double";
		}
		roll -= weights.double;
		if (roll < weights.triple) {
			return "triple";
		}
		return Math.random() < 0.08 ? "insideParkHR" : "homeRun";
	}
	if (swingType == "behindRunner" && Math.random() < 0.85) {
		return "advanceOut";
	}
	play = randomWeighted([
		{ play: "groundOut", weight: 42 },
		{ play: "shallowFly", weight: 16 },
		{ play: "deepFly", weight: 18 },
		{ play: "lineOut", weight: 10 },
		{ play: "foulOut", weight: 9 }
	]).play;
	if (play == "groundOut" && canTurnDoublePlay() && Math.random() < (swingType == "behindRunner" ? 0.1 : 0.5)) {
		return "doublePlay";
	}
	return play;
}

// Mix of hits by approach: the weight given to each kind of hit
function approachesPower(swingType) {
	if (swingType == "swingForTheFences") {
		return { single: 44, double: 24, triple: 2, homeRun: 30 };
	}
	if (swingType == "protectPlate") {
		return { single: 80, double: 16, triple: 1, homeRun: 3 };
	}
	if (swingType == "behindRunner") {
		return { single: 76, double: 18, triple: 1, homeRun: 5 };
	}
	return { single: 64, double: 21, triple: 2, homeRun: 13 };
}

// Statcast-style batted ball data
function hitData(play) {
	var info = playInfo[play];
	var launchAngle = Math.round(randomBetween(info.la[0], info.la[1]));
	return {
		ev: randomBetween(info.ev[0], info.ev[1]).toFixed(1),
		la: launchAngle,
		dist: info.dist && launchAngle >= 8 ? Math.round(randomBetween(info.dist[0], info.dist[1])) : null
	};
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
		speed: randomBetween(type.minSpeed, type.maxSpeed) + pitcher.velo - 3 * pitcherFatigue(),
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
	gameOverArea.appendChild(createParagraph("At MLB's average pace of about " + secondsPerPitch() + " seconds between pitches with " + (runnersOn() ? "runners on" : "the bases empty") + ", your at-bat would have lasted about " + formatTime(atBatSeconds) + ". Brandon Belt's 21-pitch at-bat took nearly 13 minutes, before the pitch clock."));
	if (reason == "were hit by a pitch") {
		gameOverArea.appendChild(createParagraph("If it's any consolation, you only had a " + HIT_BY_PITCH_CHANCE + "% chance to get hit by a pitch for every pitch you saw. That's pretty impressive."));
	}

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
	pitcherTypeDisplay.textContent = (pitcher.hand == "L" ? "Left" : "Right") + "-handed · " + scoutingText();
	var total = pitcher.mix.reduce(function(sum, entry) { return sum + entry.weight; }, 0);
	arsenalDisplay.innerHTML = "";
	pitcher.mix.forEach(function(entry) {
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
	var play = chooseInPlay(swingType, p);
	var info = playInfo[play];
	var result = randomItem(inPlayPools[play]);
	var data = hitData(play);
	var outsBefore = outs;
	pitches = pitches + 1;
	var outcome = resolvePlay(play);
	scoreRuns(outcome.runs);
	var reason = info.reason;
	if (play == "deepFly" && outcome.runs > 0) {
		reason = "hit a sacrifice fly";
	} else if (play == "advanceOut" && outcome.runs > 0) {
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
