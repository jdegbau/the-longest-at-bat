// Set game-wide variables
var pitches = 0;
	strikes = 0;
	balls = 0;
	count = balls + "-" + strikes;
	wasHit = false;
	playerFirstName = "No first name assigned"; // Not used yet
	playerLastName = "No last name assigned"; // Not used yet
	playerPosition = "No position assigned"; // Not used yet
	teamName = "No city assigned"; // Not used yet
	teamCity = "No team assigned"; // Not used yet
	lastPitch = ""

// Set element targeting variables
var gameContentArea = document.getElementById("gameContent");
	swingOptionsArea = document.getElementById("swingOptions")

// At-Bat option template
var swingOptions = "<h3 id=\"swingOptionsHeading\">How would you like to approach the next pitch?</h3><button id=\"takePitch\" class=\"swingOption\" onclick=\"calcHit('takePitch')\">Take the pitch</button><button id=\"swingForTheFences\" class=\"swingOption\" onclick=\"calcHit('swingForTheFences')\">Swing for the fences</button><button id=\"normalSwing\" class=\"swingOption\" onclick=\"calcHit('normalSwing')\">Take a normal swing</button><button id=\"bunt\" class=\"swingOption\" onclick=\"calcHit('bunt')\">Bunt</button>";
	
// Narrative templates
var single1 = "<p>You singled up the middle.</p>";
	single2 = "<p>You singled to left.</p>";
	double1 = "<p>You doubled down the right field line.</p>";
	double2 = "<p>You doubled down the left field line.</p>";
	triple1 = "<p>You hit a triple to right field.</p>";
	triple2 = "<p>You hit a triple to left field.</p>";
	homeRun1 = "<p>You hit a home run to center field.</p>";
	homeRun2 = "<p>You hit a home run to left field.</p>";
	homeRun3 = "<p>You hit a home run to right field.</p>";
	insideTheParkHomeRun = "<p>You hit an inside-the-park home run.</p>";
	doublePlay1 = "<p>You ground into a 5-4-3 double play.</p>";
	doublePlay2 = "<p>You ground into a 4-6-3 double play.</p>";
	doublePlay3 = "<p>You ground into a 6-4-3 double play.</p>";
	flyOutLeftField1 = "<p>You flew out to deep left field.</p>";
	flyOutLeftField2 =  "<p>You flew out to shallow left field.</p>";
	fltOutRightField1 = "<p>You flew out to deep right field.</p>";
	fltOutRightField2 = "<p>You flew out to shallow right field.</p>";
	flyOutCenterField1 = "<p>You flew out to deep center field.</p>";
	flyOutCenterField2 = "<p>You flew out to shallow center field.</p>";
	foulOut1 = "<p>You fouled out.</p>";
	swingAndMiss1 = "<p>You swiun and missed.</p>";
	swingAndMiss2 = "<p>You tried to check your swing, but couldn't hold up.</p>";
	takenBall1 = "<p>You took a ball low and inside.</p>";
	takenBall2 = "<p> You took a ball high and outside</p>";
	takenBall3 = "<p>You took a ball high and inside.</p>";
	takenWalk = "<p>You took ball four, earning a walk.</p>";
	takenStrike1 = "<p>You took a strike.</p>";
	takenStrike2 = "<p>It was close, but you took a strike.</p>";
	strikeOutLooking = "<p>You thought it was a ball, but the umpire called strike three.</p>";
	strikeOutSwinging = "<p>You took a desperate swing, but missed. Strikeout.</p>";
	foulBall1 = "<p>You were inches away from a home run down the left field line. Foul ball.</p>";
	foulBall2 = "<p>You popped the ball up behind home plate and into the stands.</p>";
	foulStrikeout = "<p>Your bunt rolls foul. Strike three.</p>";
	hitByPitch = "<p>You got hit by a pitch!</p>"

// Create game-wide functions
function startGame() {
	gameContentArea.innerHTML = "" // REPLACE WITH START GAME NARATIVE
	swingOptionsArea.innerHTML = swingOptions
}

function gameOver(reason) {
	var pitchPlural;
	if (pitches == 1) {
		pitchPlural = " pitch";
	} else {
		pitchPlural = " pitches";
	}
	if (pitches > 20) {
		dataLayer.push({ 'event': 'gameEnd', 'gameEndResult': 'Broke the Record' }); 
		gameContentArea.innerHTML += "<div id=\"gameOver\"><p>Congratulations! You saw " + pitches + pitchPlural + " before you " + reason + "! You broke the record!</p></div>";
		swingOptionsArea.innerHTML = "";
		console.log("You win!");
	} else if (pitches == 20) {
		dataLayer.push({ 'event': 'gameEnd', 'gameEndResult': 'Tied the Record' }); 
		gameContentArea.innerHTML += "<div id=\"gameOver\"><p>You saw " + pitches  + pitchPlural + " before you " + reason + "! You tied the record!</p></div>";
		swingOptionsArea.innerHTML = "";
		console.log("You win!");
	} else {
		dataLayer.push({ 'event': 'gameEnd', 'gameEndResult': 'Did Not Break the Record' }); 
		gameContentArea.innerHTML += "<div id=\"gameOver\"><p>You only saw " + pitches + pitchPlural + " before you " + reason + "! You didn't break the record!</p></div>";
		swingOptionsArea.innerHTML = "";
		console.log("You lose!");
	}
	if (reason == "were hit by a pitch") { // Maybe split into funFact() function for clarity?
		dataLayer.push({ 'event': 'gameEnd', 'gameEndResult': 'Hit by Pitch' }); 
		gameContentArea.innerHTML += "<p>If it's any consolation, you only had a 0.23% chance to get hit by a pitch for every pitch you saw. That's pretty impressive.</p>";
	}
    sendHighScore(pitches);
	gameContentArea.innerHTML += "<button id='resetGame' onclick='resetGame()'>Want to try again?</button>";
}

function updateCount() {
	count = balls + "-" + strikes;
	document.getElementById("pitchCount").innerHTML = pitches
}

function addBall(swingType) {
	balls = balls + 1;
	pitches = pitches + 1;
	lastPitch = "Ball";
	updateCount();
	if (balls <= 3) {
		document.getElementById("ball"+balls).className += " active";
	}
	addNarrative(lastPitch, swingType);
	checkCount();
}

function addStrike(swingType) {
	strikes = strikes + 1;
	pitches = pitches + 1;
	lastPitch = "Strike";
	updateCount();
	if (strikes <= 2) {
		document.getElementById("strike"+strikes).className += " active";
	}
	addNarrative(lastPitch, swingType);
	checkCount();
	
}

function addFoul(swingType) {
	lastPitch = "Foul";
	if (strikes < 2) {
		addStrike();
	} else if (strikes == 2 && swingType == 'bunt') {
		addStrike();
	} else {
		pitches = pitches + 1;
		updateCount();
		addNarrative(lastPitch, swingType);
		checkCount();
	}
}

function addInPlay(swingType) {
	lastPitch = "Hit";
	wasHit = true;
	pitches = pitches + 1;
	updateCount();
	addNarrative(lastPitch, swingType);
	checkCount();
}

function addHPB(swingType) {
	lastPitch = "Hit By Pitch";
	pitches = pitches + 1;
	gameContentArea.innerHTML = hitByPitch;
	updateCount();
	addNarrative(lastPitch, swingType);
	gameOver('were hit by a pitch');
}

function checkCount() {
	if (balls == 4) {
		gameOver('were walked'); // Transition to walk function?
	} else if (strikes == 3) {
		gameOver('struck out'); // Transition to strikeout function?
	} else if (wasHit == true) {
		gameOver('got a hit'); // Transition to hit function?
	} else {
		console.log(lastPitch + " | " + count + " | The at-bat continues..."); // Transition to next pitch function?
		setTimeout(function() {
			swingOptionButtonsToggle(false);
			},3000);
	}
}

function calcHit(swingType) {
	swingOptionButtonsToggle(true);
	hitResult = Math.random() * 100;
	if (hitResult <= .23) { // Super rare chance to get hit by a pitch
		addHPB(swingType);
	} else {
		hitResult = Math.random() * 100;
		if (swingType == 'normalSwing') {
			if (hitResult >= 82) {
				addFoul(swingType);
			} else if (hitResult >= 45) {
				addBall(swingType);
			} else if (hitResult >= 6) {
				addStrike(swingType);
			} else {
				addInPlay(swingType);
			}
		} else if (swingType == 'swingForTheFences') {
			if (hitResult >= 66) {
				addStrike(swingType);
			} else if (hitResult >= 33) {
				addFoul(swingType);
			} else if (hitResult >= 6) {
				addBall(swingType);
			} else {
				addInPlay(swingType);
			}
		} else if (swingType == 'bunt') {
			if (hitResult >= 66) {
				addStrike(swingType);
			} else if (hitResult >= 33) {
				addFoul(swingType);
			} else if (hitResult >= 6) {
				addBall(swingType);
			} else {
				addInPlay(swingType);
			}
		}  else if (swingType == 'takePitch') {
			if (hitResult >= 68) {
				addStrike(swingType);
			} else {
				addBall(swingType);
			}
		}
	}
}

function addNarrative(lastPitch, swingType) {
	gameContentArea.innerHTML = "<p>" + lastPitch + "! " + count + "</p>";
	if (swingType == 'takePitch' && lastPitch == 'Strike') {
		gameContentArea.innerHTML += takenStrike1;
	} else if (swingType == 'takePitch' && lastPitch == 'Ball') {
		gameContentArea.innerHTML += takenBall1;
	}
}

function swingOptionButtonsToggle(toggle) {
	var swingOptionButtons = document.querySelectorAll(".swingOption");
		i = "";
	for (i = 0; i < swingOptionButtons.length; i++) { 
		swingOptionButtons[i].disabled = toggle;
	}
}

function resetCount() {
	var i = "";
	for (i = 1; i < 4; i++) { 
		document.getElementById('ball' + i).className = 'ball';
	}
	i = "";
	for (i = 1; i < 3; i++) { 
		document.getElementById('strike' + i).className = 'strike';
	}
}

function resetGame() {
	pitches = 0;
	strikes = 0;
	balls = 0;
	count = balls + "-" + strikes;
	wasHit = false;
	resetCount();
	updateCount();
	getHighScore();
	startGame();
}

function sendHighScore(pitches) {
	if (pitches == "") {
	  return;
	}
	const xhttp = new XMLHttpRequest();
	xhttp.open("GET", "sendscore.php?pitches="+pitches);
	xhttp.send();
	getHighScore();
  }

function getHighScore() {
  const xhttp = new XMLHttpRequest();
  xhttp.onload = function() {
    document.getElementById("high-score").innerHTML = this.responseText;
  }
  xhttp.open("GET", "getscore.php");
  xhttp.send();
}