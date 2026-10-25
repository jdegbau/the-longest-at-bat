// Game-wide constants
var RECORD_PITCHES = 21; // Brandon Belt vs. Jaime Barría, April 22, 2018
var HIT_BY_PITCH_CHANCE = 0.23; // Percent chance per pitch
var SECONDS_PER_PITCH = 16; // Approximate MLB average between pitches with the bases empty under the pitch clock
var NEXT_PITCH_DELAY = 3000; // Milliseconds before the next pitch can be chosen

// Game-wide state
var pitches = 0;
var strikes = 0;
var balls = 0;
var nextPitchTimer = null;

// Element targeting variables
var gameContentArea = document.getElementById("gameContent");
var swingOptionsArea = document.getElementById("swingOptions");
var pitchCountDisplay = document.getElementById("pitchCount");
var atBatTimeDisplay = document.getElementById("atBatTime");

// At-bat options
var swingOptions = [
	{ id: "takePitch", label: "Take the pitch" },
	{ id: "swingForTheFences", label: "Swing for the fences" },
	{ id: "normalSwing", label: "Take a normal swing" },
	{ id: "bunt", label: "Bunt" }
];

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

// Balls in play: the narrative and how the at-bat ended
var inPlayResults = {
	swing: [
		{ text: "You singled up the middle.", reason: "singled" },
		{ text: "You singled to left.", reason: "singled" },
		{ text: "You doubled down the right field line.", reason: "doubled" },
		{ text: "You doubled down the left field line.", reason: "doubled" },
		{ text: "You hit a triple to right field.", reason: "tripled" },
		{ text: "You hit a triple to left field.", reason: "tripled" },
		{ text: "You hit a home run to center field.", reason: "hit a home run" },
		{ text: "You hit a home run to left field.", reason: "hit a home run" },
		{ text: "You hit a home run to right field.", reason: "hit a home run" },
		{ text: "You hit an inside-the-park home run.", reason: "hit an inside-the-park home run" },
		{ text: "You grounded out to short.", reason: "grounded out" },
		{ text: "You grounded out to second.", reason: "grounded out" },
		{ text: "You flew out to deep left field.", reason: "flew out" },
		{ text: "You flew out to shallow left field.", reason: "flew out" },
		{ text: "You flew out to deep right field.", reason: "flew out" },
		{ text: "You flew out to shallow right field.", reason: "flew out" },
		{ text: "You flew out to deep center field.", reason: "flew out" },
		{ text: "You flew out to shallow center field.", reason: "flew out" },
		{ text: "You fouled out.", reason: "fouled out" }
	],
	bunt: [
		{ text: "You beat out a bunt down the third base line for a single.", reason: "bunted for a single" },
		{ text: "You dropped a bunt, but were thrown out at first.", reason: "were thrown out on a bunt" },
		{ text: "You popped your bunt up to the catcher.", reason: "popped out on a bunt" }
	]
};

// Create game-wide functions
function randomItem(items) {
	return items[Math.floor(Math.random() * items.length)];
}

function pluralize(number, singular, plural) {
	return number + " " + (number == 1 ? singular : plural);
}

function formatTime(totalSeconds) {
	var minutes = Math.floor(totalSeconds / 60);
	var seconds = totalSeconds % 60;
	return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function estimatedAtBatSeconds() {
	return pitches * SECONDS_PER_PITCH;
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

function startGame() {
	gameContentArea.innerHTML = "";
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

function gameOver(reason) {
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

	var gameOverArea = document.createElement("div");
	gameOverArea.id = "gameOver";
	gameContentArea.appendChild(gameOverArea);
	gameOverArea.appendChild(createParagraph(message));
	gameOverArea.appendChild(createParagraph("At MLB's average pace of about " + SECONDS_PER_PITCH + " seconds between pitches, your at-bat would have lasted about " + formatTime(estimatedAtBatSeconds()) + ". Brandon Belt's 21-pitch at-bat took nearly 13 minutes, before the pitch clock."));
	if (reason == "were hit by a pitch") {
		gameOverArea.appendChild(createParagraph("If it's any consolation, you only had a " + HIT_BY_PITCH_CHANCE + "% chance to get hit by a pitch for every pitch you saw. That's pretty impressive."));
	}

	var resetButton = document.createElement("button");
	resetButton.id = "resetGame";
	resetButton.textContent = "Want to try again?";
	resetButton.addEventListener("click", resetGame);
	gameContentArea.appendChild(resetButton);
}

function updateCount() {
	pitchCountDisplay.textContent = pitches;
	atBatTimeDisplay.textContent = formatTime(estimatedAtBatSeconds());
	for (var i = 1; i <= 3; i++) {
		document.getElementById("ball" + i).className = "ball" + (balls >= i ? " active" : "");
	}
	for (var j = 1; j <= 2; j++) {
		document.getElementById("strike" + j).className = "strike" + (strikes >= j ? " active" : "");
	}
}

function showPitch(heading, narrative) {
	gameContentArea.innerHTML = "";
	addParagraph(heading + " " + balls + "-" + strikes, "pitchResult");
	addParagraph(narrative);
}

function nextPitch() {
	nextPitchTimer = setTimeout(function() {
		swingOptionButtonsToggle(false);
	}, NEXT_PITCH_DELAY);
}

function addBall(swingType) {
	balls = balls + 1;
	pitches = pitches + 1;
	updateCount();
	if (balls == 4) {
		showPitch("Ball four!", narratives.takenWalk);
		gameOver("were walked");
		return;
	}
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
	updateCount();
	if (strikes == 3) {
		showPitch("Strike three!", swingType == "takePitch" ? narratives.strikeOutLooking : narratives.strikeOutSwinging);
		gameOver("struck out");
		return;
	}
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
		updateCount();
		showPitch("Strike three!", narratives.foulBuntStrikeout);
		gameOver("struck out");
		return;
	}
	if (strikes < 2) {
		strikes = strikes + 1;
	}
	updateCount();
	showPitch("Foul!", randomItem(swingType == "bunt" ? narratives.buntFoul : narratives.foulBall));
	nextPitch();
}

function addInPlay(swingType) {
	var inPlay = randomItem(swingType == "bunt" ? inPlayResults.bunt : inPlayResults.swing);
	pitches = pitches + 1;
	updateCount();
	showPitch("In play!", inPlay.text);
	gameOver(inPlay.reason);
}

function addHBP() {
	pitches = pitches + 1;
	updateCount();
	showPitch("Hit by pitch!", narratives.hitByPitch);
	gameOver("were hit by a pitch");
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

function resetGame() {
	clearTimeout(nextPitchTimer);
	pitches = 0;
	strikes = 0;
	balls = 0;
	updateCount();
	startGame();
}

document.getElementById("startGame").addEventListener("click", startGame);
