// Game-wide constants
var RECORD_PITCHES = 21; // Brandon Belt vs. Jaime Barría, April 22, 2018
var HIT_BY_PITCH_CHANCE = 0.23; // Percent chance per pitch
var SECONDS_PER_PITCH_EMPTY = 16; // Approximate MLB average between pitches with the bases empty under the pitch clock
var SECONDS_PER_PITCH_RUNNERS = 19; // Approximate MLB average between pitches with runners on under the pitch clock
var NEXT_PITCH_DELAY = 3000; // Milliseconds before the next pitch can be chosen

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

// Element targeting variables
var gameContentArea = document.getElementById("gameContent");
var swingOptionsArea = document.getElementById("swingOptions");
var pitchCountDisplay = document.getElementById("pitchCount");
var atBatTimeDisplay = document.getElementById("atBatTime");
var batterNameDisplay = document.getElementById("batterName");
var batterLineDisplay = document.getElementById("batterLine");
var pitcherLineDisplay = document.getElementById("pitcherLine");
var awayRunsDisplay = document.getElementById("awayRuns");
var homeRunsDisplay = document.getElementById("homeRuns");
var inningArrowDisplay = document.getElementById("inningArrow");
var inningLabelDisplay = document.getElementById("inningLabel");
var basesDisplay = document.getElementById("bases");
var pitchMarksArea = document.getElementById("pitchMarks");
var pitchLogList = document.getElementById("pitchLog");
var pitchLogEmpty = document.getElementById("pitchLogEmpty");

// At-bat options
var swingOptions = [
	{ id: "takePitch", label: "Take the pitch" },
	{ id: "swingForTheFences", label: "Swing for the fences" },
	{ id: "normalSwing", label: "Take a normal swing" },
	{ id: "bunt", label: "Bunt" }
];

// Pitch arsenal: how often each pitch is thrown and its velocity range in mph
var pitchTypes = [
	{ name: "Four-Seam Fastball", weight: 35, minSpeed: 92, maxSpeed: 98 },
	{ name: "Sinker", weight: 15, minSpeed: 91, maxSpeed: 96 },
	{ name: "Slider", weight: 20, minSpeed: 83, maxSpeed: 89 },
	{ name: "Changeup", weight: 12, minSpeed: 83, maxSpeed: 89 },
	{ name: "Curveball", weight: 10, minSpeed: 76, maxSpeed: 82 },
	{ name: "Cutter", weight: 8, minSpeed: 87, maxSpeed: 92 }
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

// Strike zone bounds in the SVG's coordinates (catcher's view)
var zone = { left: 60, right: 140, top: 60, bottom: 170 };

// Narrative templates
var narratives = {
	takenBall: [
		"You took a ball low and inside.",
		"You took a ball high and outside.",
		"You took a ball high and inside."
	],
	checkedSwing: [
		"You started to swing, but held up on a pitch out of the zone.",
		"You checked your swing in time. The umpire calls it a ball."
	],
	buntBall: [
		"You squared to bunt, but pulled the bat back on a pitch outside."
	],
	takenStrike: [
		"You took a strike.",
		"It was close, but you took a strike."
	],
	swingAndMiss: [
		"You swung and missed.",
		"You tried to check your swing, but couldn't hold up."
	],
	buntMiss: [
		"You squared to bunt, but missed the ball."
	],
	foulBall: [
		"You were inches away from a home run down the left field line. Foul ball.",
		"You popped the ball up behind home plate and into the stands.",
		"You fouled the pitch straight back."
	],
	buntFoul: [
		"Your bunt rolled foul."
	],
	takenWalk: "You took ball four, earning a walk.",
	strikeOutLooking: "You thought it was a ball, but the umpire called strike three.",
	strikeOutSwinging: "You took a desperate swing, but missed. Strikeout.",
	foulBuntStrikeout: "Your bunt rolled foul. Strike three.",
	hitByPitch: "You got hit by a pitch!"
};

// Balls in play: the narrative, how the at-bat ended, and what kind of play it was.
// Plays with a "requires" check can only happen in the right game situation.
var inPlayResults = {
	swing: [
		{ text: "You singled up the middle.", reason: "singled", play: "single" },
		{ text: "You singled to left.", reason: "singled", play: "single" },
		{ text: "You doubled down the right field line.", reason: "doubled", play: "double" },
		{ text: "You doubled down the left field line.", reason: "doubled", play: "double" },
		{ text: "You hit a triple to right field.", reason: "tripled", play: "triple" },
		{ text: "You hit a triple to left field.", reason: "tripled", play: "triple" },
		{ text: "You hit a home run to center field.", reason: "hit a home run", play: "homeRun" },
		{ text: "You hit a home run to left field.", reason: "hit a home run", play: "homeRun" },
		{ text: "You hit a home run to right field.", reason: "hit a home run", play: "homeRun" },
		{ text: "You hit an inside-the-park home run.", reason: "hit an inside-the-park home run", play: "homeRun" },
		{ text: "You grounded out to short.", reason: "grounded out", play: "out" },
		{ text: "You grounded out to second.", reason: "grounded out", play: "out" },
		{ text: "You grounded into a 5-4-3 double play.", reason: "grounded into a double play", play: "doublePlay", requires: canTurnDoublePlay },
		{ text: "You grounded into a 4-6-3 double play.", reason: "grounded into a double play", play: "doublePlay", requires: canTurnDoublePlay },
		{ text: "You grounded into a 6-4-3 double play.", reason: "grounded into a double play", play: "doublePlay", requires: canTurnDoublePlay },
		{ text: "You flew out to deep left field.", reason: "flew out", play: "deepFly" },
		{ text: "You flew out to shallow left field.", reason: "flew out", play: "out" },
		{ text: "You flew out to deep right field.", reason: "flew out", play: "deepFly" },
		{ text: "You flew out to shallow right field.", reason: "flew out", play: "out" },
		{ text: "You flew out to deep center field.", reason: "flew out", play: "deepFly" },
		{ text: "You flew out to shallow center field.", reason: "flew out", play: "out" },
		{ text: "You fouled out.", reason: "fouled out", play: "out" }
	],
	bunt: [
		{ text: "You beat out a bunt down the third base line for a single.", reason: "bunted for a single", play: "buntSingle" },
		{ text: "You dropped a bunt, but were thrown out at first.", reason: "were thrown out on a bunt", play: "buntOut" },
		{ text: "You popped your bunt up to the catcher.", reason: "popped out on a bunt", play: "out" }
	]
};

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

function createParagraph(text) {
	var paragraph = document.createElement("p");
	paragraph.textContent = text;
	return paragraph;
}

function addParagraph(text, className) {
	var paragraph = createParagraph(text);
	if (className) {
		paragraph.className = className;
	}
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
	} else if (play == "homeRun") {
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
	} else if (play == "buntOut" && runnersOn() && outsBefore < 2) {
		outs++;
		runs = advanceRunners(function() { return 1; }, 0);
		note = "It was a sacrifice. The runners moved up.";
	} else {
		outs++;
	}
	return { runs: runs, note: note };
}

function startGame() {
	resetAtBat();
	generateSituation();
	updateScoreboard();
	gameContentArea.innerHTML = "";
	addParagraph(situationText(), "situation");
	addParagraph("Step into the box. The pitcher is ready.");
	swingOptionsArea.innerHTML = "<h3 id=\"swingOptionsHeading\">How would you like to approach the next pitch?</h3>";
	swingOptions.forEach(function(option) {
		var button = document.createElement("button");
		button.id = option.id;
		button.className = "swingOption";
		button.textContent = option.label;
		button.addEventListener("click", function() {
			calcHit(option.id);
		});
		swingOptionsArea.appendChild(button);
	});
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
	pitcherLineDisplay.textContent = "P: " + pitches;
	for (var i = 1; i <= 3; i++) {
		document.getElementById("ball" + i).className = "ball" + (balls >= i ? " active" : "");
	}
	for (var j = 1; j <= 2; j++) {
		document.getElementById("strike" + j).className = "strike" + (strikes >= j ? " active" : "");
		document.getElementById("out" + j).className = "out" + (outs >= j ? " active" : "");
	}
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
		document.getElementById("base" + i).className = "base " + ["first", "second", "third"][i - 1] + (bases[i - 1] ? " occupied" : "");
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

function showPitch(heading, narrative) {
	gameContentArea.innerHTML = "";
	addParagraph(heading + " " + countText(), "pitchResult");
	addParagraph(narrative);
}

function nextPitch() {
	nextPitchTimer = setTimeout(function() {
		swingOptionButtonsToggle(false);
	}, NEXT_PITCH_DELAY);
}

// Where the pitch crossed the plate, based on what happened to it
function pitchLocation(category) {
	var x;
	var y;
	if (category == "hbp") {
		return { x: randomBetween(12, 30), y: randomBetween(80, 150) };
	}
	if (category == "ball") {
		// Anywhere near the zone, but outside of it
		do {
			x = randomBetween(25, 175);
			y = randomBetween(25, 200);
		} while (x > zone.left - 5 && x < zone.right + 5 && y > zone.top - 5 && y < zone.bottom + 5);
		return { x: x, y: y };
	}
	if (category == "calledStrike") {
		return { x: randomBetween(zone.left + 4, zone.right - 4), y: randomBetween(zone.top + 4, zone.bottom - 4) };
	}
	// Swings: mostly in or around the zone
	return { x: randomBetween(zone.left - 12, zone.right + 12), y: randomBetween(zone.top - 12, zone.bottom + 12) };
}

function recordPitch(category, description, colorClass) {
	var pitchType = randomWeighted(pitchTypes);
	var speed = randomBetween(pitchType.minSpeed, pitchType.maxSpeed).toFixed(1);
	var location = pitchLocation(category);
	atBatSeconds += secondsPerPitch();

	// Strike zone mark
	var svgNamespace = "http://www.w3.org/2000/svg";
	var previous = pitchMarksArea.querySelector(".latest");
	if (previous) {
		previous.classList.remove("latest");
	}
	var mark = document.createElementNS(svgNamespace, "g");
	mark.setAttribute("class", "pitchMark latest " + colorClass);
	var circle = document.createElementNS(svgNamespace, "circle");
	circle.setAttribute("cx", location.x.toFixed(1));
	circle.setAttribute("cy", location.y.toFixed(1));
	circle.setAttribute("r", 9);
	var number = document.createElementNS(svgNamespace, "text");
	number.setAttribute("x", location.x.toFixed(1));
	number.setAttribute("y", (location.y + 3.5).toFixed(1));
	number.textContent = pitches;
	mark.appendChild(circle);
	mark.appendChild(number);
	pitchMarksArea.appendChild(mark);

	// Pitch-by-pitch log entry, newest first
	var entry = document.createElement("li");
	entry.className = "pitchLogEntry";
	entry.innerHTML = "<span class=\"pitchNumber " + colorClass + "\"></span><span class=\"pitchDetails\"><span class=\"pitchDescription\"></span><span class=\"pitchInfo\"></span></span><span class=\"pitchCount\"></span>";
	entry.querySelector(".pitchNumber").textContent = pitches;
	entry.querySelector(".pitchDescription").textContent = description;
	entry.querySelector(".pitchInfo").textContent = speed + " mph " + pitchType.name;
	entry.querySelector(".pitchCount").textContent = countText();
	pitchLogList.insertBefore(entry, pitchLogList.firstChild);
	pitchLogEmpty.hidden = true;
}

function addBall(swingType) {
	balls = balls + 1;
	pitches = pitches + 1;
	recordPitch("ball", "Ball", "ballColor");
	if (balls == 4) {
		var runs = forceRunners();
		scoreRuns(runs);
		showPitch("Ball four!", narratives.takenWalk);
		gameOver(runs > 0 ? "walked in a run" : "were walked", runs);
		return;
	}
	updateCount();
	if (swingType == "takePitch") {
		showPitch("Ball!", randomItem(narratives.takenBall));
	} else if (swingType == "bunt") {
		showPitch("Ball!", randomItem(narratives.buntBall));
	} else {
		showPitch("Ball!", randomItem(narratives.checkedSwing));
	}
	nextPitch();
}

function addStrike(swingType) {
	strikes = strikes + 1;
	pitches = pitches + 1;
	if (swingType == "takePitch") {
		recordPitch("calledStrike", "Called Strike", "strikeColor");
	} else if (swingType == "bunt") {
		recordPitch("swing", "Missed Bunt", "strikeColor");
	} else {
		recordPitch("swing", "Swinging Strike", "strikeColor");
	}
	if (strikes == 3) {
		outs++;
		showPitch("Strike three!", swingType == "takePitch" ? narratives.strikeOutLooking : narratives.strikeOutSwinging);
		gameOver("struck out", 0);
		return;
	}
	updateCount();
	if (swingType == "takePitch") {
		showPitch("Strike!", randomItem(narratives.takenStrike));
	} else if (swingType == "bunt") {
		showPitch("Strike!", randomItem(narratives.buntMiss));
	} else {
		showPitch("Strike!", randomItem(narratives.swingAndMiss));
	}
	nextPitch();
}

function addFoul(swingType) {
	pitches = pitches + 1;
	if (strikes == 2 && swingType == "bunt") {
		// A foul bunt with two strikes is a strikeout
		strikes = 3;
		outs++;
		recordPitch("swing", "Foul Bunt", "strikeColor");
		showPitch("Strike three!", narratives.foulBuntStrikeout);
		gameOver("struck out", 0);
		return;
	}
	if (strikes < 2) {
		strikes = strikes + 1;
	}
	recordPitch("swing", swingType == "bunt" ? "Foul Bunt" : "Foul", "strikeColor");
	updateCount();
	showPitch("Foul!", randomItem(swingType == "bunt" ? narratives.buntFoul : narratives.foulBall));
	nextPitch();
}

function addInPlay(swingType) {
	var possible = (swingType == "bunt" ? inPlayResults.bunt : inPlayResults.swing).filter(function(result) {
		return !result.requires || result.requires();
	});
	var inPlay = randomItem(possible);
	var outsBefore = outs;
	pitches = pitches + 1;
	var outcome = resolvePlay(inPlay.play);
	scoreRuns(outcome.runs);
	var reason = inPlay.reason;
	if (inPlay.play == "deepFly" && outcome.runs > 0) {
		reason = "hit a sacrifice fly";
	} else if (inPlay.play == "buntOut" && outcome.note) {
		reason = "laid down a sacrifice bunt";
	}
	var description = "In play, no out";
	if (outcome.runs > 0) {
		description = "In play, run(s)";
	} else if (outs > outsBefore) {
		description = "In play, out(s)";
	}
	recordPitch("swing", description, "inPlayColor");
	showPitch("In play!", inPlay.text);
	gameOver(reason, outcome.runs, outcome.note);
}

function addHBP() {
	pitches = pitches + 1;
	recordPitch("hbp", "Hit By Pitch", "inPlayColor");
	var runs = forceRunners();
	scoreRuns(runs);
	showPitch("Hit by pitch!", narratives.hitByPitch);
	gameOver("were hit by a pitch", runs);
}

function calcHit(swingType) {
	swingOptionButtonsToggle(true);
	var hitResult = Math.random() * 100;
	if (hitResult <= HIT_BY_PITCH_CHANCE) { // Super rare chance to get hit by a pitch
		addHBP();
		return;
	}
	hitResult = Math.random() * 100;
	if (swingType == "normalSwing") {
		if (hitResult >= 82) {
			addFoul(swingType);
		} else if (hitResult >= 45) {
			addBall(swingType);
		} else if (hitResult >= 6) {
			addStrike(swingType);
		} else {
			addInPlay(swingType);
		}
	} else if (swingType == "swingForTheFences" || swingType == "bunt") {
		if (hitResult >= 66) {
			addStrike(swingType);
		} else if (hitResult >= 33) {
			addFoul(swingType);
		} else if (hitResult >= 6) {
			addBall(swingType);
		} else {
			addInPlay(swingType);
		}
	} else if (swingType == "takePitch") {
		if (hitResult >= 68) {
			addStrike(swingType);
		} else {
			addBall(swingType);
		}
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
	pitchMarksArea.innerHTML = "";
	pitchLogList.innerHTML = "";
	pitchLogEmpty.hidden = false;
}

document.getElementById("recordPitches").textContent = RECORD_PITCHES;
document.getElementById("startGame").addEventListener("click", startGame);
