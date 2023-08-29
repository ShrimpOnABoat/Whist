// Add this at the top of your main.js
// const socket = io("http://localhost:3000");
const socket = io(config.SERVER_URL);
const username = window.localStorage.getItem('username');
if (!username) {
  window.location.href = '/index.html'; 
}
let leftPlayer, rightPlayer, mainPlayer;
function setPlayerPositions(gameState) {
  const currentIndex = gameState.playOrder.indexOf(username);

  if (currentIndex === -1) {
    console.error('Username is not in the players list');
    return;
  }

  const leftUsername = gameState.playOrder[(currentIndex + 1) % 3]; // username of player to the left
  const rightUsername = gameState.playOrder[(currentIndex + 2) % 3]; // username of player to the right

  // Get the full player objects for the left and right players based on their usernames
  leftPlayer = gameState.players.find(player => player.username === leftUsername);
  rightPlayer = gameState.players.find(player => player.username === rightUsername);
  mainPlayer = gameState.players.find(player => player.username === username);

  // leftPlayer and rightPlayer are now the full player objects from the game state
  // you can access their username with leftPlayer.username or rightPlayer.username
  // you can access their connection status with leftPlayer.connected or rightPlayer.connected
}


document.addEventListener("DOMContentLoaded", () => {
  socket.emit('getGameState'); // ask for gameState
});

let styleSheet;
let yourStaticRulesCount;
document.getElementById('my-stylesheet').addEventListener('load', function() {
  styleSheet = document.styleSheets[0];
  yourStaticRulesCount = styleSheet.cssRules.length;
  // You can call your updateDeck function or other code here
});

let logoutButton = document.getElementById('Logout'); 

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    // Emit 'logout' event to the server when the button is clicked
    socket.emit('logout');
    window.location.href = "index.html";
    // Remove the JWT token from local storage
    localStorage.removeItem('token');
  });
}

var loginForm = document.getElementById("login-form");
if(loginForm){
  loginForm.addEventListener("submit", function (e) {
//document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();

  var enteredUsername = document.getElementById("username").value;
  var password = document.getElementById("password").value;

  fetch("http://localhost:3001/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify({
      username: enteredUsername,
      password: password,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        username = data.username; // Store the username in the variable
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        document.getElementById("login").style.display = "none";

        // When successfully logged in, emit playerJoined event
        socket.emit('playerJoined', { playerId: socket.id, username: username }); // Use socket ID as player ID and include username
      } else {
        alert("Login failed");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
})};

socket.on('connect', () => {
  // Emit playerJoined event with player data when a player logs in
  let storedUsername = localStorage.getItem("username");
  if (storedUsername) {
    socket.emit('playerJoined', { playerId: socket.id, username: username }); // Use socket ID as player ID and include username
  }
  else {
    window.location.href = '/index.html'
  }
});

// Event listener for the 'S' key
document.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') {
    toggleRoundsTable();
  }
});

function toggleRoundsTable() {
  const existingModal = document.getElementById('scoresModal');
  if (existingModal) {
    existingModal.remove();
    return;
  }

  // Create a modal div
  const modalDiv = document.createElement('div');
  modalDiv.id = 'scoresModal';
  modalDiv.style.position = 'fixed';
  modalDiv.style.top = '50%';
  modalDiv.style.left = '50%';
  modalDiv.style.transform = 'translate(-50%, -50%)';
  modalDiv.style.zIndex = 1000;  // to ensure it's on top
  modalDiv.style.border = '1px solid black';
  modalDiv.style.backgroundColor = 'white';

  // Add a title
  const title = document.createElement('h3');
  title.textContent = 'Scores';
  title.style.textAlign = 'center';
  modalDiv.appendChild(title);

  // Generate and add the table
  const table = generateRoundsTable();
  modalDiv.appendChild(table);

  // Append modal to the body
  document.body.appendChild(modalDiv);
}

function generateRoundsTable() {
  // Create new table and header row
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  
  const headerRow = table.insertRow();
  const roundHeader = headerRow.insertCell();
  roundHeader.textContent = 'Round';
  roundHeader.style.textAlign = 'center';
  
  const orderedPlayers = ['gg', 'dd', 'toto'].map(name => {
    return gameState.players.find(player => player.username === name);
  });
  
  orderedPlayers.forEach(player => {
    const cell = headerRow.insertCell();
    cell.colSpan = 3;  // Spanning 3 columns: Announced, Made, Score
    cell.textContent = player.username;
    cell.style.textAlign = 'center';
  });
  
  const totalCellHeader = headerRow.insertCell();
  totalCellHeader.textContent = 'Total';
  totalCellHeader.style.textAlign = 'center';
  
  const styleForCells = '2px solid white';  // Replace 'white' with your preferred border color

  // Populate table with round data
  const numberOfRounds = orderedPlayers[0].scores.length;
  for (let i = 0; i < numberOfRounds; i++) {
    const row = table.insertRow();
    const roundNumberCell = row.insertCell();
    const roundNumber = i < 3 ? 1 : (i - 1);
    roundNumberCell.textContent = roundNumber;
    roundNumberCell.style.textAlign = 'center';
    roundNumberCell.style.borderRight = '1px solid #000'; // Add a vertical line between players
    roundNumberCell.style.fontWeight = 'bold';  // Bold text

    let totalAnnouncedTricks = 0;
    const cellColors = ['#D3D3D3', '#F3F3F3', '#D3D3D3'];
    orderedPlayers.forEach((player, index) => {
      // Individual cells for Announced, Made, Score
      const announcedCell = row.insertCell();
      announcedCell.textContent = player.announcedTricks[i];
      announcedCell.style.textAlign = 'right';
      announcedCell.style.backgroundColor = cellColors[index];  // Light blue background
      announcedCell.style.border = styleForCells;
      
      const madeCell = row.insertCell();
      madeCell.textContent = player.madeTricks[i];
      madeCell.style.textAlign = 'right';
      madeCell.style.backgroundColor = cellColors[index];  // Light yellow background
      madeCell.style.border = styleForCells;

      const scoreCell = row.insertCell();
      scoreCell.textContent = player.scores[i];
      scoreCell.style.textAlign = 'right';
      scoreCell.style.backgroundColor = cellColors[index];  // Light green background
      scoreCell.style.border = styleForCells;

      totalAnnouncedTricks += player.announcedTricks[i];
    });

    const totalCell = row.insertCell();
    totalCell.textContent = totalAnnouncedTricks;
    totalCell.style.textAlign = 'center';

    const colorCode = getColorCode(totalAnnouncedTricks, roundNumber);
    totalCell.style.backgroundColor = colorCode;
  }

  return table;
}

let isTrickDisplayed = false;

document.addEventListener('keydown', function(event) {
  if (event.code === 'Space') {
    isTrickDisplayed = !isTrickDisplayed;  // Toggle the state
    if (isTrickDisplayed) {
      displayLastTrick();
    } else {
      hideLastTrick();
    }
  }
});

function displayLastTrick() {
  const lastTrickModal = document.getElementById('lastTrickModal');
  const lastTrickCardsDiv = document.getElementById('lastTrickCards');
  
  // Clear existing cards if any
  lastTrickCardsDiv.innerHTML = "";

  // Suppose gameState.lastTrick contains your last trick cards
  const lastTrick = gameState.lastTrick;

  // Suppose gameState.playOrder contains the order of players
  const playOrder = gameState.playOrder;

  if (lastTrick && lastTrick.length > 0 && playOrder && playOrder.length === lastTrick.length) {
    lastTrick.forEach((card, index) => {
      const cardDiv = document.createElement("div");
      cardDiv.style.display = "inline-block";
      cardDiv.style.textAlign = "center";

      const img = document.createElement("img");
      img.src = `res/${card.suit}_${card.rank}.svg`;
      img.classList.add("card");
      img.style.height = "160px"; // Adjust the height

      const playerName = document.createElement("p");
      playerName.textContent = playOrder[index];
      
      cardDiv.appendChild(img);
      cardDiv.appendChild(playerName);
      
      lastTrickCardsDiv.appendChild(cardDiv);
    });
  } else {
    const message = document.createElement("p");
    message.textContent = "Pas de dernier pli !";
    lastTrickCardsDiv.appendChild(message);
  }

  lastTrickModal.style.display = "block";
}

function hideLastTrick() {
  const lastTrickModal = document.getElementById('lastTrickModal');
  lastTrickModal.style.display = "none";
}

let gameButton = document.getElementById('game-button'); 

let gameButtonGrabFunction = () => {
  socket.emit('grabTrick');
  gameButton.disabled = true;
};

let gameButtonNewGameFunction = () => {
  // Emit 'newGame' event to the server when the button is clicked
  socket.emit('newGame');
    // Change button text and event
    gameButton.textContent = "Prochain tour";
    gameButton.disabled = true;
};

function gameButtonDiscard() {
}

function gameButtonFunction(onClickEvent) {
  let gameButtonClone = gameButton.cloneNode(true);

  gameButton.parentNode.replaceChild(gameButtonClone, gameButton);

  // Update the global variable to point to the new clone.
  gameButton = gameButtonClone;

  switch(onClickEvent) {
    case 'newGame':
      gameButton.addEventListener('click', gameButtonNewGameFunction);
      break;
    case 'grabTrick':
      gameButton.addEventListener('click', gameButtonGrabFunction);
      break;
    case 'discard':
      gameButton.addEventListener('click', gameButtonDiscard);
      break;
    default:
      break;
  }
}

function updateButtons(gameState) {
  let currentPlayerAction = gameState.players.find(player => player.username === username).action;
  // reset the game-button
    let gameButtonClone = gameButton.cloneNode(true);
    gameButton.parentNode.replaceChild(gameButtonClone, gameButton);
    gameButton = gameButtonClone;

    switch(currentPlayerAction) {
      case 'startNewGame': 
        gameButton.textContent = "Nouvelle partie";
        gameButton.disabled = false;
        gameButtonFunction('newGame');
        break;
      case 'waitForPlayer':
      case 'chooseTrump':
      case 'discard':
      case 'playCard':
        gameButton.style.display = 'none'; // Hide the button
        break;
      case 'bet':
        gameButton.textContent = "Choisis ta mise";
        gameButton.disabled = true; // Initially disable the button until a bet amount is selected
        gameButton.style.display = 'inline-block'; // Show the button
          break;
      case 'grabTrick':
        gameButton.textContent = "Ramasse le pli";
        gameButton.disabled = false;
        gameButtonFunction('grabTrick')
        gameButton.style.display = 'inline-block'; // Show the button
        break;
      default:
        console.error(`Unknown action: ${currentPlayerAction}`);
    }
  }

function chooseTrump() {
  const chooseTrumpDiv = document.getElementById("choose-trump");
  const gameButton = document.getElementById("game-button");
  
  // Display the div for choosing trump
  chooseTrumpDiv.style.display = "block";
  gameButton.textContent = "Choisis l'atout";
  gameButton.disabled = true;
  gameButton.style.display = "block"

  let chosenOption = null; // Variable to store the selected trump option
  
  // Fetch the trump options
  const trumpOptions = document.getElementsByClassName("trump-option");
  
  // Remove the 'selected' class from all options
      for (let j = 0; j < trumpOptions.length; j++) {
      trumpOptions[j].classList.remove('selected');
    }
  
    // Create clickable events for each trump option
  for (let i = 0; i < trumpOptions.length; i++) {
    console.log(trumpOptions[i]);
    trumpOptions[i].addEventListener("click", function () {
      // Fetch the suit and rank from the clicked option
      const chosenSuit = this.dataset.suit;
      const chosenRank = this.dataset.rank;
      chosenOption = {rank: chosenRank, suit: chosenSuit}; // Store the selected option in the variable
      gameButton.disabled = false;

      // Remove the 'selected' class from all options
      for (let j = 0; j < trumpOptions.length; j++) {
        trumpOptions[j].classList.remove('selected');
      }
      
      // Add 'selected' class to the clicked option
      this.classList.add('selected');
    });
  }

  // Create click event listener for the gameButton
  gameButton.addEventListener("click", function () {
    if (chosenOption !== null) {
      // Emit the 'ChooseTrump' event with the chosen bet
      socket.emit('choseTrumpCard', chosenOption);
      console.log('Trump card chosen: ' + chosenOption.rank + ' ' + chosenOption.suit)
      // Clear the trump options from the screen
      chooseTrumpDiv.style.display = "none";

      // Reset the game button
      gameButton.textContent = "Atout choisi";
      gameButton.style.display = "none";
      gameButton.disabled = true;

      // Remove the event listener to prevent multiple listeners on the button
      const clickEvent = arguments.callee;
      gameButton.removeEventListener('click', clickEvent);
    } else {
      console.log('No trump option chosen')
    }
  });
}


function discardExtraCards() {
  // Get bonus cards count
  let bonusCardsCount = mainPlayer.bonusCards;
  
  // Get player's cards
  let playerCards = document.querySelectorAll(".player-cards .card");
  
  playerCards.forEach(card => {
      card.addEventListener('click', () => {
          if (card.classList.contains("selected")) {
              card.classList.remove("selected");
          } else {
              // Count selected cards
              let selectedCards = document.querySelectorAll(".player-cards .card.selected").length;

              // If we haven't selected all necessary bonus cards, we can select another one
              if (selectedCards < bonusCardsCount) {
                  card.classList.add("selected");
              }
          }
          
          // Count selected cards
          let selectedCards = document.querySelectorAll(".player-cards .card.selected").length;

          // Enable the game button if the correct number of cards is selected, disable otherwise
          gameButton.disabled = !(selectedCards === bonusCardsCount);
      });
  });
  
  // Set game button
  if (bonusCardsCount === 1) {
    gameButton.textContent = "Jette une carte";
  } else {
    gameButton.textContent = "Jette deux cartes";
  }
  gameButton.style.display = "block"
  // gameButtonFunction('discard');
  // Get data of selected cards
  gameButton.addEventListener('click', function () {
    let selectedCardsData = Array.from(document.querySelectorAll(".player-cards .card.selected")).map(card => {
      // Extract the rank and suit from the card's id
      let [rank, suit] = card.id.split("_");  
      // Find the card object in the player's hand that matches this rank and suit
      return mainPlayer.hand.find(card => card.rank === rank && card.suit === suit);
    });
    // Emit 'discard' event to server
    socket.emit('discard', selectedCardsData);
    // Reset the game button
    gameButton.textContent = "Atout choisi";
    gameButton.style.display = "none";
    gameButton.disabled = true;

    // Remove the event listener to prevent multiple listeners on the button
    const clickEvent = arguments.callee;
    gameButton.removeEventListener('click', clickEvent);
    
  });  
}

function placeBet() {
  const betSelection = document.getElementById('bet-selection');
  const gameButton = document.getElementById('game-button');
  
  // clear the options
  betSelection.innerHTML = '';

  // Determine the max bet
  const maxBet = Math.max(gameState.round - 2, 1);

  // Check if the player's score is twice as high or higher than other players
  const playerIndex = gameState.players.findIndex((p) => p.username === username);
  const playerScore = gameState.players[playerIndex].scores[gameState.round - 2];
  const otherPlayerScores = gameState.players
    .filter((p, index) => index !== playerIndex)
    .map((p) => p.scores[gameState.round - 2]);
  const isScoreTwiceAsHigh = otherPlayerScores.every((score) => playerScore >= 2 * score);

  if (isScoreTwiceAsHigh && gameState.round > 3) {
    // Remove all bet options and display only the game button with "Roll a die" label
    gameButton.textContent = 'Tire ta mise au sort';
    gameButton.disabled = false;

    // Remove all previous placeBet event listeners
    let oldPlaceBetEvent = gameButton.placeBetEvent;
    if (oldPlaceBetEvent) {
      gameButton.removeEventListener('click', oldPlaceBetEvent);
    }

    // Create new placeBet event listener for rolling a die
    let newPlaceBetEvent = function() {
      // Emit the 'placeBet' event with the value -1 to indicate rolling a die
      socket.emit('placeBet', -1);

      // Clear the bet options from the screen
      betSelection.innerHTML = '';

      // Remove this event listener to prevent multiple listeners on the button
      gameButton.removeEventListener('click', newPlaceBetEvent);
    };

    // Add new placeBet event listener for rolling a die and save it for removal later
    gameButton.addEventListener('click', newPlaceBetEvent);
    gameButton.placeBetEvent = newPlaceBetEvent;
  } else {
    // Create clickable numbers for each possible bet
    for (let i = 0; i <= maxBet; i++) {
      let betOption = document.createElement('div');
      betOption.className = 'bet-option';
      betOption.textContent = i.toString();

      betOption.addEventListener('click', function() {
        // Remove selected class from all bet options
        document.querySelectorAll('.bet-option').forEach((el) => {
          el.classList.remove('selected');
        });

        // Add selected class to clicked bet option
        betOption.classList.add('selected');

        // Update the game-button text, enable it and set its action
        gameButton.textContent = 'Choisis ta mise';
        gameButton.disabled = false;

        // Remove all previous placeBet event listeners
        let oldPlaceBetEvent = gameButton.placeBetEvent;
        if (oldPlaceBetEvent) {
          gameButton.removeEventListener('click', oldPlaceBetEvent);
        }

        // Create new placeBet event listener
        let newPlaceBetEvent = function() {
          // Emit the 'placeBet' event with the chosen bet
          socket.emit('placeBet', i);

          // Clear the bet options from the screen
          betSelection.innerHTML = '';

          // Remove this event listener to prevent multiple listeners on the button
          gameButton.removeEventListener('click', newPlaceBetEvent);
        };

        // Add new placeBet event listener and save it for removal later
        gameButton.addEventListener('click', newPlaceBetEvent);
        gameButton.placeBetEvent = newPlaceBetEvent;
      });

      betSelection.appendChild(betOption);
    }
      }
}

function playCard() {
  let playableCards;

  const player = gameState.players.find(player => player.username === username);
  gameButton.textContent = 'Joue une carte';
  gameButton.style.display = 'inline-block'; // Show the button
  
  function handleCardSelection(cardElement, card) {
    // Remove the 'selected' class from all cards
    document.querySelectorAll('.card.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    
    // Add the 'selected' class to the clicked card
    cardElement.classList.add('selected');
    gameButton.disabled = false;

    // Remove any previously added event listener
    if (gameButton.playCardEvent) {
      gameButton.removeEventListener('click', gameButton.playCardEvent);
    }

    // Create new event listener and store it on the game button
    let playCardEvent = () => socket.emit('playCard', card);
    gameButton.addEventListener('click', playCardEvent);
    gameButton.playCardEvent = playCardEvent;
  }

  if (gameState.trickCards.length > 0) {
    const startingPlayerIndex = gameState.playOrder.indexOf(gameState.startingPlayer);
    const firstCardSuit = gameState.trickCards[startingPlayerIndex].suit;
    playableCards = player.hand.filter(card => card.suit === firstCardSuit);
    
    if (playableCards.length === 0) {
      playableCards = player.hand;
    }
  } else {
    playableCards = player.hand;
  }

  playableCards.forEach((card) => {
    const cardElement = document.querySelector(`.card[data-suit="${card.suit}"][data-rank="${card.rank}"]`);
    cardElement.classList.add('is-playable');

    cardElement.addEventListener('click', () => handleCardSelection(cardElement, card));

    // If there's only one playable card, automatically select it
    if (playableCards.length === 1) {
      handleCardSelection(cardElement, card);
    }
  });
}
    

function grabTrick() {
  // Update the game-button text, enable it, and set its action
  gameButton.textContent = 'Ramasse le pli';
  gameButton.disabled = false;
  gameButtonFunction('grabTrick');
}

function announceWinner() {
  // fireworks

}

function takeAction(gameState) {
  let currentPlayerAction = gameState.players.find(player => player.username === username).action;
  
  switch(currentPlayerAction) {
    case 'chooseTrump':
      chooseTrump();
      break;
    case 'discard':
      discardExtraCards();
      break;
    case 'bet':
      placeBet();
      break;
    case 'playCard':
      playCard();
      break;
    case 'announceWinner':
      announceWinner();
      break;
    default:
  }

};

// Listen for gameStateUpdate events
socket.on('updateGameState', (updatedGameState) => {
    // Update the game UI based on the new game state
console.log('received updated gameState')
  gameState = updatedGameState;
  updateGameUI(gameState);
  takeAction(gameState);
});

function animatePlayer(playerImage, duration) {
  const animationInterval = 500; // in milliseconds
  let isHighlighted = false;

  const animationIntervalId = setInterval(() => {
    if (isHighlighted) {
      playerImage.style.borderColor = "";
      playerImage.style.backgroundColor = "";
    } else {
      playerImage.style.borderColor = "gold"; // Change to the color you prefer
      playerImage.style.backgroundColor = "lightyellow"; // Change to the color you prefer
    }
    isHighlighted = !isHighlighted;
  }, animationInterval);

  setTimeout(() => {
    clearInterval(animationIntervalId);
    playerImage.style.borderColor = "";
    playerImage.style.backgroundColor = "";
  }, duration);
}

function updatePictures(gameState) {
  // Map of usernames to image names
  const playerImages = {
    "gg": "res/jerome.jpeg",
    "dd": "res/audrey.jpeg",
    "toto": "res/tony.jpeg"
  };

  // Get the player image and bet/trick elements
  const leftPlayerImage = document.getElementById("player1-image");
  const leftPlayerBet = document.getElementById("player1-bet");
  const leftPlayerTricks = document.getElementById("player1-tricks");

  const rightPlayerImage = document.getElementById("player2-image");
  const rightPlayerBet = document.getElementById("player2-bet");
  const rightPlayerTricks = document.getElementById("player2-tricks");

  const mainPlayerImage = document.getElementById("player3-image");
  const mainPlayerBet = document.getElementById("player3-bet");
  const mainPlayerTricks = document.getElementById("player3-tricks");

  // Set the images based on the current players
  setPlayerPositions(gameState)
  mainPlayerImage.src = playerImages[username] || "res/black_image.jpeg";
  leftPlayerImage.src = playerImages[leftPlayer.username] || "res/black_image.jpeg";
  rightPlayerImage.src = playerImages[rightPlayer.username] || "res/black_image.jpeg";
  
  // Set the bets and tricks
  mainPlayerBet.textContent = mainPlayer.announcedTricks[gameState.round-1] !== undefined ? 'Mise : ' + mainPlayer.announcedTricks[gameState.round-1] : 'Mise : ?';
  mainPlayerTricks.textContent = mainPlayer.madeTricks[gameState.round-1] !== undefined ? 'Plis : ' + mainPlayer.madeTricks[gameState.round-1] : 'Plis : ?';
    
  leftPlayerBet.textContent = leftPlayer.announcedTricks[gameState.round-1] !== undefined ? 'Mise : ' + leftPlayer.announcedTricks[gameState.round-1] : 'Mise : ?';
  leftPlayerTricks.textContent = leftPlayer.madeTricks[gameState.round-1] !== undefined ? 'Plis : ' + leftPlayer.madeTricks[gameState.round-1] : 'Plis : ?';
    
  rightPlayerBet.textContent = rightPlayer.announcedTricks[gameState.round-1] !== undefined ? 'Mise : ' + rightPlayer.announcedTricks[gameState.round-1] : 'Mise : ?';
  rightPlayerTricks.textContent = rightPlayer.madeTricks[gameState.round-1] !== undefined ? 'Plis : ' + rightPlayer.madeTricks[gameState.round-1] : 'Plis : ?';
  
  // Check if there's already a starting image and remove it
  const oldStartingImage = document.getElementById("starting-image");
  if (oldStartingImage) oldStartingImage.remove();

  // Determine first player
  const firstPlayerUsername = gameState.startingPlayer;
  
  // Set starting image for the player who starts the round
  let firstPlayerImage;
  if (firstPlayerUsername === username) {
    firstPlayerImage = mainPlayerImage;
  } else if (firstPlayerUsername === leftPlayer.username) {
    firstPlayerImage = leftPlayerImage;
  } else if (firstPlayerUsername === rightPlayer.username) {
    firstPlayerImage = rightPlayerImage;
  }
  
  // Add starting image if the player is determined
  if (firstPlayerImage) {
    const img = document.createElement("img");
    img.id = "starting-image"; // Add an id
    img.src = "res/first_to_start.jpeg";
    img.style.position = "absolute";
    img.style.top = "0";
    img.style.right = "0";
    img.style.height = "20px";
    img.style.width = "20px";
    firstPlayerImage.parentElement.style.position = "relative"; // Set the parent's position to relative
    firstPlayerImage.parentElement.appendChild(img);
  }

  if (mainPlayer.action === 'startNewGame' && gameState.lastGameWinners.length > 0) {
    // Animate the winners
    const animationDuration = 30000; // in milliseconds

    // Loop through each winner and animate their image
    for (const winnerUsername of gameState.lastGameWinners) {
      if (winnerUsername === username) {
        animatePlayer(mainPlayerImage, animationDuration);
      } else if (leftPlayer.username === winnerUsername) {
        animatePlayer(leftPlayerImage, animationDuration);
      } else if (rightPlayer.username === winnerUsername) {
        animatePlayer(rightPlayerImage, animationDuration);
      }
    }
  }
}

const suitOrder = ['hearts', 'clubs', 'diamonds', 'spades'];
const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace']; // Or whatever order of ranks you use

function adjustCardSpacingForBothZones() {
  // Adjust for player1-zone
  adjustCardSpacingForZone('player1');
  // Adjust for player2-zone
  adjustCardSpacingForZone('player2');
}

function adjustCardSpacingForZone(zoneId) {
  const zoneElement = document.getElementById(zoneId+'-zone');
  const zoneCardsElement = document.getElementById(zoneId+'-cards');
  const cardElements = zoneElement.querySelectorAll('.card');

  // Default card width and desired margin-right
  const cardWidth = 70.27;
  let desiredMarginRight = -50;
  
  const zoneWidth = zoneElement.offsetWidth;
  const estimatedMarginRight = (zoneWidth - cardWidth) / (cardElements.length - 1) - cardWidth;
  
  // If cards take more space than the zone width
  if (estimatedMarginRight < -50) {
    desiredMarginRight = estimatedMarginRight;
  }

  const totalWidth = 70 + (cardElements.length - 1) * (70 + desiredMarginRight)
  zoneCardsElement.style.width = `${totalWidth}px`;
  const zoneCardsWidth = zoneCardsElement.offsetWidth;
  
  // Update the margin-right for all cards in the zone
  cardElements.forEach(card => {
    card.style.marginRight = `${desiredMarginRight}px`;
  });
}

function updatePlayerCards(player) {
  let position = ""; // initialize position
  if (player.username === leftPlayer.username) {
    position = "1"; // left player
  } else if (player.username === rightPlayer.username) {
    position = "2"; // right player
  } else if (player.username === username) { // use username for bottom player
    position = "3"; // bottom player
  } else {
    console.error(`Invalid player: ${player.username}`);
    return;
  }

  // Sort hand by suit then rank
  player.hand.sort((a, b) => {
    if (suitOrder.indexOf(a.suit) !== suitOrder.indexOf(b.suit)) {
      // If suits are different, sort by suit
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    } else {
      // If suits are the same, sort by rank
      return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    }
  });

  const playerCardsDiv = document.getElementById(`player${position}-cards`);
  if (playerCardsDiv !== null) {
    playerCardsDiv.innerHTML = "";

    if (Array.isArray(player.hand)) {
      player.hand.forEach((card) => {
        const img = document.createElement("img");
        if (card.suit && card.rank) {
          img.src = `res/${card.suit}_${card.rank}.svg`;
          
          // Add a unique id to each card element based on its rank and suit
          img.id = `${card.rank}_${card.suit}`;
                    // Add data-suit and data-rank attributes
          img.setAttribute("data-suit", card.suit);
          img.setAttribute("data-rank", card.rank);
                } else {
          img.src = "res/Card_back.svg";
                  }
        img.classList.add("card");
        playerCardsDiv.appendChild(img);
      });
    } else {
      console.error(`hand is not an array for player ${player.username}`);
    }
  }
}

function updatePlayersCards(gameState) {
  gameState.players.forEach((player) => {
    if (player.hand) {
      updatePlayerCards(player);
    } else {
      console.error(`No hand for player ${player.username}`);
    }
  });
  adjustCardSpacingForBothZones();
}

function getColorCode(misesScore, roundNumber) {
  // Assuming you have the variable `round` defined
  roundNumber = Math.max(1, roundNumber - 2);
  console.log("Mises: " + misesScore + ", round: " + roundNumber)
  // Define color palette
  let colorPalette = [
    '#068fff',
    '#67a2fd',
    '#93b5fc',
    '#b6c9f9',
    '#d6def7',
    '#f3f3f3',
    '#f3d1d1',
    '#f0afaf',
    '#e98c8e',
    '#e0676f',
    '#d43d51'
  ];
  let difference = misesScore - roundNumber;
  if ((difference) > 5) {
    difference = 5
  } 
  if ((difference) < -5) {
    difference = -5
  } 
  return colorPalette[5 + difference]
}

function updateDeck(numberOfCards) {
  const deckContainer = document.getElementById('deck-container');
  deckContainer.innerHTML = ''; // Clear previous cards

  // Clear previous dynamic rules, assuming the dynamic rules are at the end of the stylesheet
  const styleSheet = document.styleSheets[0];
  while (styleSheet.cssRules.length > yourStaticRulesCount) { // Replace yourStaticRulesCount with the number of static rules you have
    styleSheet.deleteRule(styleSheet.cssRules.length - 1);
  }

  for (let i = 0; i < numberOfCards; i++) {
    const cardBack = document.createElement('div');
    cardBack.className = 'card-back';
    cardBack.style.zIndex = i + 1; // Stack cards in order
    deckContainer.appendChild(cardBack);

    // Add dynamic rule for each card
    styleSheet.insertRule(`
      .card-back:nth-child(${i + 1}) {
        transform: translate(-${.2 * i}px, -${.2 * i}px);
      }
    `, styleSheet.cssRules.length);
  }
}

function updateScoreZone(gameState) {
  // Assuming the gameState object has a 'round' property and a 'players' array
  // And each player object has a 'username' property and a 'scores' array

  // Update round number
  const roundNumber = gameState.round;
  const roundElement = document.getElementById('round-number');
  if (roundElement !== null) {
    if (roundNumber < 4) {
      roundElement.innerHTML = `${roundNumber}/3`;
    } else {
      roundElement.innerHTML = roundNumber - 2;
    }
  } else {
    console.error('Element with id "round-number" not found');
  }
  // If round is not 0, update scores and display trump card
  if (roundNumber !== 0) {
    // Update each player's score
    const orderedPlayers = ['gg', 'dd', 'toto'].map(name => {
    return gameState.players.find(player => player.username === name);
    });

    orderedPlayers.forEach((player, index) => {
      const playerScoreDiv = document.getElementById(`player${index + 1}-score`);
      const playerHeaderDiv = document.getElementById(`player${index + 1}-header`);
      if (playerScoreDiv !== null && playerHeaderDiv !== null) {
        // Assuming the last score in the player's score array is the current total score
        // Display 0 if score is not defined
        const currentScore = player.scores[player.scores.length - 1] || 0;

      // Calculate the sum of announcedTricks
      const totalAnnouncedTricks = player.announcedTricks.reduce((a, b) => a + b, 0);

      playerHeaderDiv.innerHTML = player.username;
      playerScoreDiv.innerHTML = `${totalAnnouncedTricks} | ${currentScore}`;
      } else {
        console.error(`Element with id "player${index + 1}-score" or "player${index + 1}-header" not found`);
      }
    });
  } else {
    // Initialize player scores to 0
    for(let i = 1; i <= 3; i++) {
      const playerScoreDiv = document.getElementById(`player${i}-score`);
      if (playerScoreDiv !== null) {
        playerScoreDiv.innerHTML = 0;
      } else {
        console.error(`Element with id "player${i}-score" not found`);
      }
    }
  }
  // Update mises score
  const misesElement = document.getElementById('mises-score');
  if (misesElement !== null) {
    const misesScore = gameState.players.reduce((total, player) => {
      const announcedTrick = player.announcedTricks[roundNumber - 1];
      if (announcedTrick === undefined || total === null) {
        return null; // Return null if any player hasn't announced anything yet or if the total was already null
      }
      return total + announcedTrick; // Add the announced trick to the total if all players have announced so far
    }, 0);

    misesElement.innerHTML = misesScore !== null ? `${misesScore}` : '';
    
    // If misesScore is defined, update the background color of the mises cell
    if (misesScore !== null) {
      misesElement.style.backgroundColor = getColorCode(misesScore, roundNumber);
    } 
    // If misesScore is not defined, reset the background color to neutral
    else {
      misesElement.style.backgroundColor = '#f3f3f3';
    }
  } else {
    console.error('Element with id "mises-score" not found');
  }
  
  
  // Receive gameState from the server...
  if (gameState.trumpCard) {
    let trumpCardDiv = document.getElementById("trump-card");
    let img;
    // Construct the image filename from the trumpCard data
    if (gameState.trumpCard.suit && gameState.trumpCard.rank) {
      img = `res/${gameState.trumpCard.suit}_${gameState.trumpCard.rank}.svg`;
    } else {
      img = "res/Card_back.svg";
    }
    
    // Update the div's contents with an img tag referencing the trumpCard's image
    trumpCardDiv.innerHTML = `<img class="trump-card-img" src="${img}" alt="Trump card: ${gameState.trumpCard.rank} of ${gameState.trumpCard.suit}" />`;
    
    updateDeck(gameState.deck);
  }

  
    // Display trick cards
    let trickCardsDiv = document.getElementById("trick-cards");
    trickCardsDiv.innerHTML = "";
    if (gameState.trickCards && gameState.trickCards.length) {
    
      // Create ordered array of players
      let orderedPlayers = [leftPlayer.username, mainPlayer.username, rightPlayer.username];
    
      // Create array of trick cards ordered by leftPlayer, mainPlayer, rightPlayer
      let orderedTrickCards = orderedPlayers.map(player => {
        let playerIndex = gameState.playOrder.indexOf(player);
        return gameState.trickCards[playerIndex];
      });
      console.log(orderedTrickCards);
      orderedTrickCards.forEach((card, index) => {
        let imgElement;
        if (card) {
          let cardImageFilename = `res/${card.suit}_${card.rank}.svg`;
          imgElement = `<img class="trick-card-img" src="${cardImageFilename}" alt="Card: ${card.rank} of ${card.suit}" />`;
        } else {
          imgElement = '<div class="trick-card-placeholder"></div>';
        }

        let playerWhoPlayed = orderedPlayers[index];
        if (playerWhoPlayed === 'mainPlayer') {
          playerWhoPlayed += ' middle';
        }

        let cardDiv = `<div class="trick-card ${playerWhoPlayed}">${imgElement}</div>`;
    
        trickCardsDiv.innerHTML += cardDiv;
      
      });
    }
  }

function updateGameUI(gameState) {
  console.log('Updating the game UI')
  console.log(gameState)

  updatePictures(gameState);
  updateButtons(gameState);
  updatePlayersCards(gameState);
  updateScoreZone(gameState);
  
}

document.getElementById('archive-scores').addEventListener('click', () => {
  window.location.href = "/scores.html";
});