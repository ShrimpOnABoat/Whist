// Add this at the top of your main.js
// const socket = io("http://localhost:3000");
const socket = io(config.SERVER_URL);
const username = window.localStorage.getItem('username');
if (!username) {
  window.location.href = '/index.html'; 
}
let leftPlayer, rightPlayer, mainPlayer;
let previousGameState;
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
      img.style.height = "100px"; // Adjust the height

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

function gameButtonUndoBet() {
  socket.emit('undoBet');
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
    case 'undoBet':
      gameButton.addEventListener('click', gameButtonUndoBet);
      break;
    default:
      break;
  }
}


const undoPhrases = [
  "Oups, fausse manœuvre !",
  "Retour en arrière ?",
  "Annuler 'announcedTrick' ?",
  "J'ai glissé, chef !",
  "On efface tout ?",
  "Pas sûr de 'announcedTrick'...",
  "Reculons un peu...",
  "Mauvaise idée, ça...",
  "Erreur de casting !",
  "Zut, mauvais clic !",
  "On rembobine ?",
  "Changement de plan !",
  "Trop précipité, non ?",
  "'announcedTrick', vraiment ?",
  "Joker, s'il te plaît !",
  "C'était pour rire !",
  "On peut négocier ?",
  "Autre choix, vite !",
  "Erreur 404, bet not found",
  "C'était un test...",
  "Mise à jour requise !",
  "Ctrl + Z, vite !",
  "C'était pas mon idée...",
  "Réfléchissons encore...",
  "Pouce, je change !",
  "Pas convaincu là...",
  "Je préfère annuler !",
  "Inversion de tendance ?",
  "Demi-tour tactique !",
  "C'était une blague ?",
  "Eille, mauvaise touche!",
  "On jase-tu de 'announcedTrick' ?",
  "Pas pire erreur, hein?",
  "Tsé, j'étais distrait!",
  "Faut qu'j'change ça!",
  "Pas l'temps d'niaiser!",
  "C't'une joke, 'announcedTrick' !",
  "J'ai dérapé su'la souris!",
  "V'là l'gosse!",
  "'announcedTrick'? Trop drôle!",
  "Oups, faute de frappe!",
  "Fallait pas cliquer là!",
  "Retourne su'tes pas!",
  "Révision d'mon bet là!",
  "Attends, j'réfléchis...",
  "C'était pas sérieux!",
  "Changeons d'idée, là!",
  "On r'fait l'coup!",
  "C'pas c'que j'voulais!",
  "Maudit doigt glissant!",
  "Ah non, pas ça!",
  "Vire-capot rapide!",
  "Sacré 'announcedTrick' !",
  "On s'reprend, ok?",
  "Clic erroné, tsé!",
  "Mauvaise pioche!",
  "'announcedTrick' ? Euh...",
  "J'ai tout mélangé!",
  "On annule, pis vite!",
  "Faisait pas exprès!",
  "J'voulais pas ça!",
  "C'était pas mon idée...",
  "On s'calme le pompon!",
  "C't'une erreur, là!",
  "J'reviens en arrière!",
  "Juste un p'tit oops!",
  "Hé, faut corriger!",
  "Ben voyons donc!",
  "C'tait juste pour voir!",
  "Ca l'a pas d'allure!",
  "'announcedTrick' ? Ca l'a pas d'bon sens!",
  "Allez, on refait ça!",
  "'announcedTrick', c'était pas sérieux !",
  "Hop là, mauvais coup ! On annule 'announcedTrick' !",
  "Oops, j'ai visé à côté ! Pas 'announcedTrick' !",
  "Erreur de parcours ! On oublie 'announcedTrick' !",
  "C'était pour la caméra cachée, 'announcedTrick' !",
  "Inversion de situation ! 'announcedTrick' annulé !",
  "Trompé de bouton, comme d'habitude!",
  "Oh là là, qu'est-ce que j'ai fait ? Pas 'announcedTrick' !",
  "Petit malentendu avec 'announcedTrick', on efface !",
  "Coup de théâtre ! 'announcedTrick' était une illusion !",
  "On fait semblant de rien et on change ?",
  "Et bam, erreur tactique! 'announcedTrick' à la poubelle!",
  "C'était un leurre, 'announcedTrick' !",
  "Maudit clavier glissant, pas 'announcedTrick' !",
  "Je me suis emmêlé les pinceaux, pas 'announcedTrick'!",
  "On annule, on respire, et on oublie 'announcedTrick' !",
  "C'était un mirage, ce 'announcedTrick' !",
  "Glissé sur un peau de banane, pas 'announcedTrick' !",
  "Comme dirait l'autre, c'était pour rire !",
  "Pas l'bon bouton, là!"
];

function updateButtons(gameState) {
  let currentPlayerAction = gameState.players.find(player => player.username === username).action;
  // reset the game-button
  gameButton.classList.remove('button-undo'); // Remove the undo styling
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
    case 'undoBet':
      let currentPlayerBet = gameState.players.find(player => player.username === username).announcedTricks[gameState.round - 1];
      const randomPhraseIndex = Math.floor(Math.random() * undoPhrases.length);
      const randomPhrase = undoPhrases[randomPhraseIndex].replace("'announcedTrick'", currentPlayerBet);
      gameButton.textContent = randomPhrase;
      gameButton.disabled = false;
      gameButtonFunction('undoBet');
      gameButton.style.display = 'inline-block'; // Show the button
      gameButton.classList.add('button-undo'); // Add the undo styling
      break;
    default:
      console.error(`Unknown action: ${currentPlayerAction}`);
  }
}

let selectedTrump = null;

function chooseTrump() {
  const chooseTrumpDiv = document.getElementById("choose-trump");
  const gameButton = document.getElementById("game-button");

  // Display the div for choosing trump
  if (selectedTrump === null) {
    chooseTrumpDiv.style.display = "block";
    gameButton.textContent = "Choisis l'atout";
    gameButton.disabled = true;
    gameButton.style.display = "block"
  }

  let chosenOption = null; // Variable to store the selected trump option
  
  // Fetch the trump options
  const trumpOptions = document.getElementsByClassName("trump-option");
  
  // Remove the 'selected' class from all options
      for (let j = 0; j < trumpOptions.length; j++) {
        if (j !== selectedTrump) {
          trumpOptions[j].classList.remove('selected');
        }
    }
  
    // Create clickable events for each trump option
  for (let i = 0; i < trumpOptions.length; i++) {
    // console.log(trumpOptions[i]);
    trumpOptions[i].addEventListener("click", function () {
      // Fetch the suit and rank from the clicked option
      const chosenSuit = this.dataset.suit;
      const chosenRank = this.dataset.rank;
      chosenOption = {rank: chosenRank, suit: chosenSuit}; // Store the selected option in the variable
      gameButton.disabled = false;

      // Store in case of refresh
      selectedTrump = i

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
      // console.log('Trump card chosen: ' + chosenOption.rank + ' ' + chosenOption.suit)
      // Clear the trump options from the screen
      chooseTrumpDiv.style.display = "none";

      // Reset the game button
      gameButton.textContent = "Atout choisi";
      gameButton.style.display = "none";
      gameButton.disabled = true;

      // Remove the event listener to prevent multiple listeners on the button
      const clickEvent = arguments.callee;
      gameButton.removeEventListener('click', clickEvent);
      selectedTrump = null;
    } else {
      // console.log('No trump option chosen')
    }
  });
}

let selectedDiscard = []

function discardExtraCards() {
  // Get bonus cards count
  let bonusCardsCount = mainPlayer.bonusCards;
  
  // Initially disable the gameButton
  // gameButton.disabled = true;
    
  // Get player's cards
  let playerCards = document.querySelectorAll(".player-cards .card");
  
  playerCards.forEach(card => {
        // Check if the card was previously selected
        const cardIdentifier = `${card.getAttribute('data-rank')}_${card.getAttribute('data-suit')}`;
        if (selectedDiscard.includes(cardIdentifier)) {
            card.classList.add("selected");
        }
        
        card.addEventListener('click', () => {
          if (card.classList.contains("selected")) {
              card.classList.remove("selected");
              selectedDiscard = selectedDiscard.filter(id => id !== cardIdentifier); // Remove from selectedDiscard
          } else {
              // Count selected cards
              let selectedCards = document.querySelectorAll(".player-cards .card.selected").length;

              // If we haven't selected all necessary bonus cards, we can select another one
              if (selectedCards < bonusCardsCount) {
                card.classList.add("selected");
                selectedDiscard.push(cardIdentifier); // Add to selectedDiscard
              }
            }
                
          // Count selected cards
          let selectedCards = document.querySelectorAll(".player-cards .card.selected").length;

          // Enable the game button if the correct number of cards is selected, disable otherwise
          gameButton.disabled = !(selectedCards === bonusCardsCount);
      });
  });
  
  let selectedCards = document.querySelectorAll(".player-cards .card.selected").length;
  gameButton.disabled = !(selectedCards === bonusCardsCount);

  // Set game button
  if (bonusCardsCount === 1) {
    gameButton.textContent = "Jette une carte";
  } else {
    gameButton.textContent = "Jette deux cartes";
  }
  gameButton.style.display = "block"
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
    selectedDiscard = [];
    // Reset the game button
    gameButton.textContent = "Atout choisi";
    gameButton.style.display = "none";
    gameButton.disabled = true;

    // Remove the event listener to prevent multiple listeners on the button
    const clickEvent = arguments.callee;
    gameButton.removeEventListener('click', clickEvent);
    
  });  
}

let selectedBet = null;

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

      if (selectedBet === i) {
        // Add selected class to clicked bet option
        betOption.classList.add('selected');        
      }

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

        // remember the choice
        selectedBet = i;

        // Create new placeBet event listener
        let newPlaceBetEvent = function() {
          // Emit the 'placeBet' event with the chosen bet
          socket.emit('placeBet', i);

          selectedBet = null;

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
  
  // Remove 'greyed-out' and 'is-playable' classes from all cards
  document.querySelectorAll('.card').forEach((el) => {
    el.classList.remove('greyed-out', 'is-playable');
  });

  function handleCardSelection(cardElement, card) {
    // Remove the 'selected' class from all cards
    document.querySelectorAll('.card.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    
    // Remove 'greyed-out' class from all cards after successfully playing a card
    // document.querySelectorAll('.card').forEach((el) => {
    //   el.classList.remove('greyed-out');
    // });

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

  // Add 'greyed-out' class to non-playable cards
  player.hand.forEach((card) => {
    if (!playableCards.includes(card)) {
      const cardElement = document.querySelector(`.card[data-suit="${card.suit}"][data-rank="${card.rank}"]`);
      cardElement.classList.add('greyed-out');
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

function textAction(action) {
  const actionMap = {
    'startNewGame': '',
    'waitForPlayer': 'En attente',
    'chooseTrump': "Choisis l'atout",
    'discard': 'Jette une carte',
    'playCard': 'Joue une carte',
    'bet': 'Choisis une mise',
    'grabTrick': 'Ramasse le pli'
  };

  return actionMap[action] || ''; // return empty string if action is not found
}

function betTextColor(madeTricksDisplay, announcedTricksDisplay, totalTricksToBeMade) {
  if (announcedTricksDisplay === '?') {
    return "green";
  }
  if (madeTricksDisplay === announcedTricksDisplay) {
    return "blue";
  }
  if ((madeTricksDisplay < announcedTricksDisplay) && (announcedTricksDisplay - madeTricksDisplay <= totalTricksToBeMade)){
    return "green"
  }
  return "red"
}

function updatePictures(gameState) {
  // Map of usernames to image names
  const playerImages = {
    "gg": "res/jerome.jpeg",
    "dd": "res/audrey.jpeg",
    "toto": "res/tony.jpeg"
  };

  // Get the player image and bet/trick and actions elements
  const leftPlayerImage = document.getElementById("player1-image");
  const leftPlayerBet = document.getElementById("player1-bet");

  const rightPlayerImage = document.getElementById("player2-image");
  const rightPlayerBet = document.getElementById("player2-bet");

  const mainPlayerImage = document.getElementById("player3-image");
  const mainPlayerBet = document.getElementById("player3-bet");

  const leftPlayerAction = document.getElementById("player1-action");
  const rightPlayerAction = document.getElementById("player2-action");

  // Update the actions
  setPlayerPositions(gameState)
  if (leftPlayer.action && leftPlayer.action.trim() !== '') {
    const actionText = textAction(leftPlayer.action);
    leftPlayerAction.innerHTML = `${actionText} <span class='ellipsis'>.<span>.<span>.</span></span></span>`;
  } else {
    leftPlayerAction.textContent = '';
  }
  
  if (rightPlayer.action && rightPlayer.action.trim() !== '') {
    const actionText = textAction(rightPlayer.action);
    rightPlayerAction.innerHTML = `${actionText} <span class='ellipsis'>.<span>.<span>.</span></span></span>`;
  } else {
    rightPlayerAction.textContent = '';
  }
  
// Set the images based on the current players
  mainPlayerImage.src = playerImages[username] || "res/black_image.jpeg";
  leftPlayerImage.src = playerImages[leftPlayer.username] || "res/black_image.jpeg";
  rightPlayerImage.src = playerImages[rightPlayer.username] || "res/black_image.jpeg";
  
  // Set the bets and tricks
  totalTricks = Math.max(1, gameState.round-2);
  const totalTricksToBeMade = totalTricks - (mainPlayer.madeTricks[gameState.round-1] + leftPlayer.madeTricks[gameState.round-1] + rightPlayer.madeTricks[gameState.round-1]);
  let madeTricks = mainPlayer.madeTricks[gameState.round-1];
  let announcedTricks = mainPlayer.announcedTricks[gameState.round-1];
  let madeTricksDisplay = madeTricks !== undefined ? madeTricks : '?';
  let announcedTricksDisplay = announcedTricks !== undefined ? announcedTricks : '?';
  mainPlayerBet.style.color = betTextColor(madeTricksDisplay, announcedTricksDisplay, totalTricksToBeMade);
  mainPlayerBet.textContent = `${madeTricksDisplay} / ${announcedTricksDisplay}`;

  madeTricks = leftPlayer.madeTricks[gameState.round-1];
  announcedTricks = leftPlayer.announcedTricks[gameState.round-1];
  madeTricksDisplay = madeTricks !== undefined ? madeTricks : '?';
  announcedTricksDisplay = announcedTricks !== undefined ? announcedTricks : '?';
  leftPlayerBet.style.color = betTextColor(madeTricksDisplay, announcedTricksDisplay, totalTricksToBeMade);
  leftPlayerBet.textContent = `${madeTricksDisplay} / ${announcedTricksDisplay}`;

  madeTricks = rightPlayer.madeTricks[gameState.round-1];
  announcedTricks = rightPlayer.announcedTricks[gameState.round-1];
  madeTricksDisplay = madeTricks !== undefined ? madeTricks : '?';
  announcedTricksDisplay = announcedTricks !== undefined ? announcedTricks : '?';
  rightPlayerBet.style.color = betTextColor(madeTricksDisplay, announcedTricksDisplay, totalTricksToBeMade);
  rightPlayerBet.textContent = `${madeTricksDisplay} / ${announcedTricksDisplay}`;
  
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
  if (firstPlayerImage && gameState.lastTrick.length === 0) {
    const img = document.createElement("img");
    img.id = "starting-image"; // Add an id
    img.src = "res/first_to_start.png";
    img.style.position = "absolute";
    img.style.top = "0";
    img.style.right = "0";
    img.style.height = "20px";
    img.style.width = "20px";
    img.style.transform = 'rotate(45deg)';
    firstPlayerImage.parentElement.style.position = "relative"; // Set the parent's position to relative
    if (firstPlayerUsername == username){
      firstPlayerImage.parentElement.style.position = "absolute"; // Set the parent's position to absolute for the main player
    }
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
  adjustCardSpacingForZone('player1');
  adjustCardSpacingForZone('player2');
  adjustCardSpacingForZone('player3');
}

function adjustCardSpacingForZone(zoneId) {
  const zoneElement = document.getElementById(zoneId+'-zone');
  const zoneCardsElement = document.getElementById(zoneId+'-cards');
  const cardElements = zoneElement.querySelectorAll('.card');

  // Default card width and desired margin-right
  let cardWidth = 70.265625;
  let desiredMarginRight = -50;
  let zoneWidth = zoneElement.offsetWidth - 20;
  if (zoneId === 'player3') {
    cardWidth = 98.375;
    desiredMarginRight = -70;
    zoneWidth = zoneElement.offsetWidth - 100;
  }
  
  const estimatedMarginRight = (zoneWidth - cardWidth) / (cardElements.length - 1) - cardWidth;
  
  // If cards take more space than the zone width
  if (estimatedMarginRight < desiredMarginRight) {
    desiredMarginRight = estimatedMarginRight;
  }

  const totalWidth = cardWidth + (cardElements.length - 1) * (cardWidth + desiredMarginRight)
  zoneCardsElement.style.width = `${totalWidth}px`;
  
  // console.log(zoneId, ': zoneWidth: ', zoneWidth, ', estimated: ', estimatedMarginRight, ', desired: ', desiredMarginRight, ', totalWidth: ', totalWidth)

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

function updateTrickCards(gameState) {
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
  
    // console.log(orderedTrickCards);
  
    orderedTrickCards.forEach((card, index) => {
      let imgElement;
      let rotation = 0; // Default rotation
      let position = ''; // Default vertical position
      let cardIdentifier = '';
      if (card) {
        cardIdentifier = `${card.suit}_${card.rank}`; // Unique identifier for the card
      }
      
      if (index === 0) { // First card
        rotation = 90;
        // position = 'style="bottom: 20%;"';
      } else if (index === 2) { // Last card
        rotation = -90;
        // position = 'style="bottom: 20%;"';
      } else if (index === 1) { // Middle card
        // position = 'style="bottom: 10%;"';
      }

      if (!cardRotations[cardIdentifier]) {
        // Random rotation variation between -10 and 10 degrees
        let randomRotation = Math.floor(Math.random() * 21) - 10;
        rotation += randomRotation; // Adding random variation
        cardRotations[cardIdentifier] = rotation;
      } else {
        rotation = cardRotations[cardIdentifier];
      }
  
      if (card) {
        let cardImageFilename = `res/${card.suit}_${card.rank}.svg`;
        imgElement = `<img class="trick-card-img" src="${cardImageFilename}" alt="Card: ${card.rank} of ${card.suit}" style="transform: rotate(${rotation}deg);" />`;
      } else {
        imgElement = '<div class="trick-card-placeholder"></div>';
      }
  
      let playerWhoPlayed = orderedPlayers[index];
      if (playerWhoPlayed === 'mainPlayer') {
        playerWhoPlayed += ' middle';
      }
  
      let cardDiv = `<div class="trick-card ${playerWhoPlayed}" ${position}>${imgElement}</div>`;
    
      trickCardsDiv.innerHTML += cardDiv;
    });
  } else {
    // no trick cards on the table
    cardRotations = {}; // reinitialize cards rotations
  }
}

let areCardsDealt = new Array(12).fill(false);

function updateCards(gameState) {
  updateTrickCards(gameState);

  // console.log(gameState.cardMovement[0])
  if ((gameState.cardMovement[0] === 'Deal') && (areCardsDealt[gameState.round-1] !== true)) {
    // Hide the button
    const gameButton = document.getElementById("game-button");
    gameButton.style.display = "none";
    // Animate card dealing and return the promise
    return dealCardsAnimation(gameState).then(() => {
      areCardsDealt[gameState.round-1] = true;
    });
  } else {
    // Update deck normally
    updateDeck(gameState.deck);

    gameState.players.forEach((player) => {
      if (player.hand) {
        updatePlayerCards(player);
      } else {
        console.error(`No hand for player ${player.username}`);
      }
    });
    adjustCardSpacingForBothZones();

    // Return a resolved promise for consistency
    return Promise.resolve();
  }
}

function getPlayerPosition(playerUsername) {
  if (playerUsername === leftPlayer.username) {
    return "1"; // left player
  } else if (playerUsername === rightPlayer.username) {
    return "2"; // right player
  } else if (playerUsername === username) { // use username for bottom player
    return "3"; // bottom player
  } else {
    console.error(`Invalid player: ${playerUsername}`);
    return;
  }
}

function insertPlaceholderCards(gameState) {
  gameState.players.forEach(player => {
    let position = getPlayerPosition(player.username); // getPlayerPosition should return 'player1', 'player2', or 'player3'
    const playerCardsDiv = document.getElementById(`player${position}-cards`);
    const zoneElement = document.getElementById(`player${position}-zone`);

    if (playerCardsDiv && zoneElement) {
      playerCardsDiv.innerHTML = ""; // Clear existing cards

      let cardWidth = position === "3" ? 98.375 : 70.265625;
      let cardHeight = position === "3" ? 140 : 100;
      let desiredMarginRight = position === "3" ? -70 : -50;
      let zoneWidth = zoneElement.offsetWidth - (position === "3" ? 100 : 20);

      const estimatedMarginRight = (zoneWidth - cardWidth) / (player.hand.length - 1) - cardWidth;
      if (estimatedMarginRight < desiredMarginRight) {
        desiredMarginRight = estimatedMarginRight;
      }

      // Set the width of the playerCardsDiv
      const totalWidth = cardWidth + (player.hand.length - 1) * (cardWidth + desiredMarginRight);
      playerCardsDiv.style.width = `${totalWidth}px`;
      
      // console.log(position, ': zoneWidth: ', zoneWidth, ', estimated: ', estimatedMarginRight, ', desired: ', desiredMarginRight, ', totalWidth: ', totalWidth)

      for (let i = 0; i < player.hand.length; i++) {
        const placeholderCard = document.createElement("img");
        placeholderCard.src = "res/transparent_picture.png"; // Path to your transparent image
        placeholderCard.classList.add("card", "placeholder");

        placeholderCard.style.width = `${cardWidth}px`;
        placeholderCard.style.height = `${cardHeight}px`;
        placeholderCard.style.marginRight = `${desiredMarginRight}px`;

        playerCardsDiv.appendChild(placeholderCard);
      }
    }
  });
}

function getOffset( el ) {
  var _x = 0;
  var _y = 0;
  while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
      _x += el.offsetLeft - el.scrollLeft;
      _y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
  }
  return { top: _y, left: _x };
}

function dealCardsAnimation(gameState) {
  return new Promise((resolve, reject) => {
    // fill the deck with 32 cards
    updateDeck(32);

    insertPlaceholderCards(gameState); // to fill the space

    let totalCardsToDeal = gameState.players.reduce((total, player) => total + player.hand.length, 0);

    let cardsDealt = gameState.players.map(player => ({ username: player.username, dealt: 0 }));
    let zIndexCounter = 0; // Start with a high z-index value
    
    // Precompute all animation data
    let animations = [];
    for (let dealIndex = 0; dealIndex < totalCardsToDeal; dealIndex++) {
      let playerIndex = dealIndex % gameState.players.length;
      let player = gameState.players[playerIndex];
      let dealtInfo = cardsDealt.find(p => p.username === player.username);

      let position = getPlayerPosition(player.username);

      if (dealtInfo.dealt < player.hand.length) {
        const cardElement = document.getElementById(`deck-card-${32-dealIndex}`);
        if (!cardElement) {
          console.error("No more cards in the deck to animate.");
          break;
        }

        // Get destination coordinates from the corresponding placeholder card
        const playerHandDiv = document.getElementById(`player${position}-cards`);
        const placeholderCard = playerHandDiv.getElementsByClassName("placeholder")[dealtInfo.dealt];
        if (placeholderCard) {
          let cardCoord = getOffset(cardElement)
          let placeholderCoord = getOffset(placeholderCard)
          let moveToX = placeholderCoord.left - cardCoord.left //- (position === "3" ? 23 : 37.5)
          let moveToY = (placeholderCoord.top - cardCoord.top) + (position === "3" ? 20 : 0)
          
          animations.push({
            cardElement: cardElement,
            moveToX: moveToX,
            moveToY: moveToY,
            scale: position === "3" ? 1.4 : 1,
            playerPosition: position,
            zIndex: zIndexCounter
          });

          zIndexCounter++;
        }

        dealtInfo.dealt++;
      }
    }

    function animateDeal(index) {
      return new Promise((resolve, reject) => {
        if (index >= animations.length) {
          resolve(); // Resolve the promise when no more animations are left
          return;
        }

        const animation = animations[index];
        animateCardMove(animation.cardElement, 0, 0, animation.moveToX, animation.moveToY, 1, animation.scale);

        function handleTransitionEnd() {
          // console.log('Transition end triggered!')
          animation.cardElement.removeEventListener('transitionend', handleTransitionEnd);
        }

        animation.cardElement.addEventListener('transitionend', handleTransitionEnd);

        // Set a timeout to start the next card's animation after 200ms
        setTimeout(() => {
          animateDeal(index + 1).then(resolve);
        }, 100);
      });
    }

    // Start the animation sequence and wait for it to complete
    animateDeal(0).then(() => {
      // Add a delay before resolving the promise
      setTimeout(() => {
        // Code to execute after all animations are complete
        updateDeck(gameState.deck);
        gameState.players.forEach(player => updatePlayerCards(player));
        adjustCardSpacingForBothZones();
        resolve(); // Resolve the outer promise after the delay
      }, 1000); 
    });
  });
}

function animateCardMove(cardElement, startX, startY, endX, endY, startScale, endScale) {
  let duration = .5; // Duration of the animation
  // Set starting state
  cardElement.style.transform = `translate3d(${startX}px, ${startY}px, 0) scale(${startScale})`;

  // Wait for a very short time before starting the animation
  setTimeout(() => {
    // Apply end state within the timeout
    cardElement.style.transition = `transform ${duration}s ease-out`; // Set the transition
    cardElement.style.transform = `translate3d(${endX}px, ${endY}px, 0) scale(${endScale})`;
  }, 20); // 20 milliseconds delay
}

function getPlayerHandPosition(username) {
  let cardWidth = 70; // Adjust as per actual card width
  let cardHeight = 100; // Adjust as per actual card height

  let elementId = '';
  if (username === leftPlayer.username) {
    elementId = 'player1-cards'; // left player
  } else if (username === rightPlayer.username) {
    elementId = 'player2-cards'; // right player
  } else if (username === username) {
    elementId = 'player3-cards'; // bottom player
    cardWidth = 98.38; // Adjust as per actual card width
    cardHeight = 140; // Adjust as per actual card height
  } else {
    console.error(`Invalid username: ${username}`);
    return { x: 0, y: 0 };
  }

  const cardsDiv = document.getElementById(elementId);
  if (cardsDiv) {
    const rect = cardsDiv.getBoundingClientRect();
    // console.log('rect', rect);
    // console.log('Position - X:', rect.left + window.scrollX, 'Y:', rect.top + window.scrollY);
    return {
      // x: rect.left + window.scrollX - cardWidth / 2,
      // y: rect.top + window.scrollY - cardHeight / 2
      x: rect.left,
      y: rect.top
    };
  } else {
    console.error(`Element not found for ID: ${elementId}`);
    return { x: 0, y: 0 };
  }
}

function getColorCode(misesScore, roundNumber) {
  // Assuming you have the variable `round` defined
  // roundNumber = Math.max(1, roundNumber - 2);
  // console.log("Mises: " + misesScore + ", round: " + roundNumber)
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

  if (numberOfCards === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'empty-card';
    deckContainer.appendChild(emptyCard);
  } else {
    for (let i = 0; i < numberOfCards; i++) {
      const cardBack = document.createElement('div');
      cardBack.className = 'card-back';
      cardBack.style.zIndex = i + 1; // Stack cards in order
      cardBack.id = `deck-card-${i+1}`;
      deckContainer.appendChild(cardBack);

      // Add dynamic rule for each card
      styleSheet.insertRule(`
        .card-back:nth-child(${i + 1}) {
          transform: translate(-${.2 * i}px, -${.2 * i}px);
        }
      `, styleSheet.cssRules.length);
    }
  }
}

let cardRotations = {}; // Object to store card rotations

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
      playerScoreDiv.innerHTML = `${totalAnnouncedTricks} | <strong>${currentScore}</strong>`;
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
  const misesTableElement = document.getElementById('rounds-mises-table');
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
      const roundNumberColor = Math.max(1, roundNumber - 2);
      misesTableElement.style.backgroundColor = getColorCode(misesScore, roundNumberColor);
    } 
    // If misesScore is not defined, reset the background color to neutral
    else {
      misesTableElement.style.backgroundColor = '#f3f3f3';
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
  }
}

function isPlayerActionSameAsBefore(gameState) {
  // Determine if last action is the same as current one
  // if yes do not update pictures or buttons
  mainPlayer = gameState.players.find(player => player.username === username);
  let previousAction = 'not an action';
  if (previousGameState && previousGameState.players) {
    const previousPlayer = previousGameState.players.find(p => p.username === username);
    if (previousPlayer) {
      previousAction = previousPlayer.action;
    }
  }
  return mainPlayer.action === previousAction
}

socket.on('updateGameState', async (updatedGameState) => {
  gameState = updatedGameState;
  
  updatePictures(gameState);
  updateScoreZone(gameState);
  await updateCards(gameState); // Wait for the card dealing to complete

  if (!isPlayerActionSameAsBefore(gameState)) {
    updateButtons(gameState);
  }

  takeAction(gameState); // Now this will be called after card dealing
  previousGameState = gameState;
});

document.getElementById('archive-scores').addEventListener('click', () => {
  window.location.href = "/scores.html";
});