// Add this at the top of your main.js
const socket = io("http://localhost:3001");

async function getParams() {
  try {
    const response = await fetch("http://localhost:3001/api/getParams");
    const data = await response.json();
    console.log(data.message);
  } catch (error) {
    console.error("Error:", error);
  }
}

function emitMessage(message) {
  // Emit a message to the server
  socket.emit("playerJoined", { playerId: 1 });
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize game state, variables, and event listeners
  var gameState;
  var deck;
  var data = getParams();
  initGame();

  // Game logic functions
  function initGame() {
    // Initialize game state and variables
    gameState = {
      round: 1,
      players: [
        { id: 1, cards: [], roundData: [] },
        { id: 2, cards: [], roundData: [] },
        { id: 3, cards: [], roundData: [] },
      ],
      trumpColor: "",
      playedCards: [],
    };

    deck = generateDeck();
    shuffleDeck(deck);
    // dealCards(gameState, deck);
    // ... Add more game logic and state initialization
  }

  function generateDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = ["7", "8", "9", "10", "jack", "queen", "king", "ace"];
    const deck = [];

    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        deck.push({ suit, rank });
      });
    });

    return deck;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function dealCards(gameState, deck) {
    let numberOfCards;
    if (gameState.round <= 2) {
      numberOfCards = 1;
    } else {
      numberOfCards = gameState.round - 2;
    }
    gameState.players.forEach((player) => {
      for (let i = 0; i < numberOfCards; i++) {
        const card = deck.pop();
        player.cards.push(card);
      }
    });
  }

  function updatePlayerCards(playerId, cards, faceUp = true) {
    const playerCardsDiv = document.getElementById(`player${playerId}-cards`);
    if (playerCardsDiv !== null) {
      playerCardsDiv.innerHTML = "";

      cards.forEach((card) => {
        const img = document.createElement("img");
        if (faceUp) {
          img.src = `res/${card.suit}_${card.rank}.svg`;
        } else {
          img.src = "res/Card_back.svg";
        }
        img.classList.add("card");
        playerCardsDiv.appendChild(img);
      });
    }
  }

  function updateUI() {
    console.log("Round: %d", gameState.round);
    gameState.players.forEach((player) => {
      console.log(player.id, player.cards);
      if (gameState.round < 4) {
        updatePlayerCards(player.id, player.cards, player.id !== 3);
      } else {
        updatePlayerCards(player.id, player.cards, player.id == 3);
      }
    });
  }

  function startRound() {
    gameState.players.forEach((player) => {
      player.cards = [];
    });

    deck = generateDeck();
    shuffleDeck(deck);
    dealCards(gameState, deck);
    updateUI();
  }

  function resetGameZone() {
    getParams();
  }

  // Add more game logic functions here, such as:
  // - announcing tricks
  // - handling turns
  // - calculating scores

  function newGame() {
    // Reset the game state
    initGame();
    maxRound = 1;
    for (let i = 0; i < maxRound; i++) {
      // set game round number
      gameState.round = i + 1;
      // reset game zone display (trump color, score table, table). It reads mongodb and updates useful variables
      resetGameZone();
      // reset hands
      // generate new shuffled deck
      // deal cards
      //
      //
      //
      //
      //
      //
      //
      //
      //
      //
      startRound();
    }
  }

  function finishRound() {
    // Increment the round number
    gameState.round++;

    startRound();
  }

  document.getElementById("new-game").addEventListener("click", newGame);
  document
    .getElementById("finish-round")
    .addEventListener("click", finishRound);
});

document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();

  var username = document.getElementById("username").value;
  var password = document.getElementById("password").value;

  console.log("Username: " + username)
  console.log("Password: " + password)

  fetch("http://localhost:3001/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Store the JWT in localStorage
        localStorage.setItem("token", data.token);
        // Hide the login form
        document.getElementById("login").style.display = "none";
      } else {
        // Show an error message
        alert("Login failed");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

