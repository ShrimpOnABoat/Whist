require('dotenv').config();
//console.log(process.env.SESSION_SECRET);
// const { connect: connectDB } = require("./whist-backend/config/db");
const getParams = require('./mongoDB.js');
const express = require("express");
const session = require('express-session');
const cors = require("cors");
const http = require("http");
const app = express();
app.use(express.json());
const fs = require('fs');
const path = require('path');
const usernameToSocketId = {};
// Define color functions
const resetColor = '\x1b[0m';
const blueColor = '\x1b[1;34m';
const redColor = '\x1b[31m';
const greenColor = '\x1b[32m';

app.use(express.static('frontend'));

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    // origin: ["http://localhost:3000", "http://localhost:3001"],
    origin: [process.env.ORIGIN],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const router = express.Router();
// const User = require('./whist-backend/models/user')
// const MongoDBStore = require('connect-mongodb-session')(session)

router.use(cors({
  origin: process.env.ORIGIN, // adjust this to match the origin you're trying to allow
  credentials: true
}));

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/getGames', authenticate, async (req, res) => {
  const year = req.query.year;

  // Define the path to the JSON file
  const filePath = path.join(__dirname, `scores/scores_${year}.json`);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Read the content of the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const pastGames = JSON.parse(fileContent);

    // Respond with the JSON data
    res.json(pastGames);
  } else {
    // Respond with an error if the file doesn't exist
    res.status(404).json({ error: 'File not found' });
  }
});

// const store = new MongoDBStore({
//   uri: 'mongodb://localhost:27017/whist',
//   collection: 'sessions'
// })

// const { MongoClient } = require("mongodb");
// const user = require('./whist-backend/models/user');

let gameState;
  
async function saveScoreInDB() {
  try {
    // Prepare the game data
    const gameData = {
      date: new Date(),
      gg_score: gameState.players.find(player => player.username === 'gg').scores.slice(-1)[0],
      dd_score: gameState.players.find(player => player.username === 'dd').scores.slice(-1)[0],
      toto_score: gameState.players.find(player => player.username === 'toto').scores.slice(-1)[0]
    };

    // Get the current year
    const currentYear = gameData.date.getFullYear();

    // Define the path to the JSON file
    const filePath = path.join(__dirname, `scores/scores_${currentYear}.json`);

    // Read the existing file content
    let fileContent = [];
    if (fs.existsSync(filePath)) {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      fileContent = JSON.parse(rawContent);
    }

    // Add the new game data
    fileContent.push(gameData);

    // Write the updated content back to the file
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));

    console.log("Game data saved successfully!");
  } catch (error) {
    console.error("Error occurred while saving game data: ", error);
  }
}

router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// Middleware to authenticate user
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('No token provided');
    }

    const token = authHeader.split(' ')[1]; // Assuming "Bearer <token>"
    jwt.verify(token, process.env.SESSION_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send('Failed to authenticate token');
        }

        // Decoded token is the payload you signed earlier
        // { userId: user._id }
        req.userId = decoded.userId;

        next();
    });
}

// Use middleware for routes that require authentication
router.get('/protected_route', authenticate, (req, res) => {
    // At this point, req.userId is available
});

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

router.get('/scores/:year', authenticate, async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    // Define the path to the JSON file
    const filePath = path.join(__dirname, `scores/scores_${year}.json`);

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Read the content of the file
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const scores = JSON.parse(rawContent);

      // Send the JSON response
      res.json(scores);
    } else {
      // If the file doesn't exist, send an empty array or appropriate error message
      res.status(404).json({ message: `No scores found for the year ${year}.` });
    }
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).json({ error: 'An error occurred while retrieving the scores.' });
  }
});

router.get('/api/gameStats', authenticate, async function (req, res) {
  getParams().then(data => res.json(data)).catch(err => console.error(err));
});

router.post('/create-user', async (req, res) => {
  const { username, password } = req.body;

  if(!username || !password) {
    res.status(400).send('Username or password not provided');
    return;
  }

  // hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // create a new user
  const user = {
    username,
    hashedPassword
  };

  // Define the path to the JSON file
  const filePath = path.join(__dirname, 'users.json');

  try {
    // Read existing users from file
    let users = [];
    if (fs.existsSync(filePath)) {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      users = JSON.parse(rawContent);
    }

    // Check if user already exists
    if (users.some(u => u.username === username)) {
      res.status(400).json({ message: 'Username already exists.' });
      return;
    }

    // Add new user
    users.push(user);
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    // Respond success
    res.status(200).json({ message: 'User created successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating user: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log("Backend username: " + req.body.username);
    console.log("Backend password: " + req.body.password);

    const filePath = path.join(__dirname, 'users.json'); // Define the path
    const users = JSON.parse(fs.readFileSync(filePath, 'utf8')); // Use the defined path
    const user = users.find(u => u.username === req.body.username);
    
    if (!user) {
      res.status(401).send('User not found');
    } else {
      bcrypt.compare(req.body.password, user.hashedPassword, async (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(401).send('Incorrect password');
        } else if (!isMatch) {
          console.log('Passwords do not match');
          res.status(401).send('Incorrect password');
        } else {
          // start a session and send success response
          req.session.userId = user._id;
          
          // generate a JWT for the user
          const token = jwt.sign({ userId: user._id }, process.env.SESSION_SECRET);
          
          res.json({ message: 'Logged in successfully', token });
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
    if (err) {
        res.status(500).send(err);
    } else {
        res.sendFile(path.join(__dirname, '/logout.html'));
        res.send('Logged out successfully');
    }
    });
});

// connectDB();

/* List of the routes for each action a player can take
- Start a new game
- View past scores
- Make a bet
- discard one or two cards
- Chose a trump color
- play a card
*/

/* io game stuff */
// let gameState = {
//     players: [],
// };

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
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
    return shuffleDeck(deck);
}

function shuffleOrder(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
}

function createPublicGameState(username) {
    // Create a deep copy of the gameState
    let publicGameState = JSON.parse(JSON.stringify(gameState));

    // Iterate through the players
    publicGameState.players.forEach(player => {
        // If it's one of the first three rounds, players see others' cards but not their own except if they all bet
        if (gameState.round < 4) {
            if (!gameState.players.every(everyPlayer => everyPlayer.announcedTricks.length > gameState.round-1)) {
                if (player.username === username) {
                    player.hand = player.hand.map(() => ({ suit: null, value: null }));
                }
            }
        } else {
            // For the rest of the rounds, if the player is not the current user, hide their hand
            if (player.username !== username) {
                player.hand = player.hand.map(() => ({ suit: null, value: null }));
            }
            // Can players see the trump card
            // if monthlyLosses > 2 or position is 2 or 3, and not everyone is first, yes 
            // also if we're already playing
            const anyPlayerPlaying = gameState.players.some(player => player.action === 'playCard' || player.action === 'grabTrick');
            if (getPosition(username) === 1 && player.monthlyLosses < 3 && !allScoresEqual() && !anyPlayerPlaying) {
                publicGameState.trumpCard = { suit: null, value: null };
            }
            // can players see the others bets
            if (!gameState.players.every(everyPlayer => everyPlayer.announcedTricks.length === gameState.round)) {
                if (player.username !== username && player.announcedTricks.length === gameState.round) {
                    player.announcedTricks.pop();
                }
            }
        }
    });
    publicGameState.deck = gameState.deck.length;
    // Return the modified gameState
    return publicGameState;
}
    
  
function initalizeGameState() {
    // initialize gameState
    const gameStatePath = path.join(__dirname, 'gameState.json');

    if (fs.existsSync(gameStatePath)) {
        loadGameStateFromFile();
    } else {
      gameState = {
        round: 0,
        deck: generateDeck(),
        players: [
            {
                username: 'gg',
                hand: [],
                scores: [],
                announcedTricks: [],
                madeTricks: [0],
                monthlyLosses: 0,
                bonusCards: 0,
                connected: false,
                playerId: 0,
                action: ''
                },
                {
                username: 'dd',
                hand: [],
                scores: [],
                announcedTricks: [],
                madeTricks: [0],
                monthlyLosses: 0,
                bonusCards: 0,
                connected: false,
                playerId: 0,
                action: ''
                },
                {
                username: 'toto',
                hand: [],
                scores: [],
                announcedTricks: [],
                madeTricks: [0],
                monthlyLosses: 0,
                bonusCards: 0,
                connected: false,
                playerId: 0,
                action: ''
                }
        ],
        trumpCard: [],
        trickCards: [],
        lastTrick: [],
        playOrder: shuffleOrder(['gg', 'dd', 'toto']),
        startingPlayer: '',
        lastGameWinners: []
    }
  }
}

initalizeGameState();

function newGame() {
    // prepare gameState for new game
    gameState.round = 0;
    gameState.deck = generateDeck();
    gameState.players.forEach(player => {
        player.hand = [];
        player.scores = [];
        player.announcedTricks = [];
        player.madeTricks = [0];
    })
    gameState.trumpCard = [];
//    gameState.playOrder = shuffleOrder(['gg', 'dd', 'toto']);
    gameState.lastGameWinners = []

    // retrieve info from past games
    getParams().then(params => {
        let { loserId, losingMonths, currentScores } = params;
        // Find the player who matches the loserId
        let loser = gameState.players.find(player => player.username === loserId);
        if(loser) {
          loser.monthlyLosses = losingMonths; // Update monthly losses for the loser
        } else {
          console.error(`No player found with username: ${loserId}`);
        }

    }).catch(err => {
        console.error(err)
    })
}

// function to check if all players have the same score
function allScoresEqual() {
    players = gameState.players;
    if (players.length > 0) {
        let lastScore = players[0].scores[players[0].scores.length - 1];
        return players.every(player => player.scores[player.scores.length - 1] === lastScore);
    }
    return true;
}

function dealCards() {
    let cardsToDeal;
  
    // Order players by the last score
    gameState.players.sort((a, b) => {
      let lastScoreA = a.scores[a.scores.length - 1];
      let lastScoreB = b.scores[b.scores.length - 1];
      return lastScoreA - lastScoreB;
    });
  
    // Establish the base number of cards to deal for each round
    if (gameState.round <= 3) {
      cardsToDeal = 1;
    } else if (gameState.round <= 12) {
      cardsToDeal = gameState.round - 2;
    }
  
    // Deal the cards
    for (let i = 0; i < gameState.players.length; i++) {
      // Get the player's position using the getPosition() function
      const playerPosition = getPosition(gameState.players[i].username);
      let extraCards = 0;
  
      if (gameState.round > 3) {
        if (playerPosition === 2) {
          if (gameState.players[i].monthlyLosses > 1 && gameState.round < 12) {
            extraCards = 2;
          } else {
            extraCards = 1;
          }
        } else if (playerPosition === 3) {
          // extraCards = 1 by default
          extraCards = 1;
  
          // = 2 if monthlyLosses > 0
          if (gameState.players[i].monthlyLosses > 0) {
            extraCards = 2; // Always 2 cards for a player in the third position with monthlyLosses > 0
          }
  
          // = 2 if score <= .5*(score of position 2)
          const secondPlayerScore = gameState.players[1].scores[gameState.round - 2];
          if (gameState.players[i].scores[gameState.round - 2] <= 0.5 * secondPlayerScore) {
            extraCards = 2; // Always 2 cards for a player in the third position with score < half of the second player
          }
        }
      }
  
      gameState.players[i].bonusCards = extraCards;
  
      // Cap extra cards to the number of cards left in the deck for the last round, except if 2 players are first place
      if (gameState.round === 12 && extraCards === 2 && gameState.players[1].scores[gameState.round - 2] !== gameState.players[2].scores[gameState.round - 2]) {
        extraCards = 1;
      }
      for (let j = 0; j < cardsToDeal + extraCards; j++) {
        if (gameState.deck.length > 0) {
          gameState.players[i].hand.push(gameState.deck.pop());
          let lastCard = gameState.players[i].hand[gameState.players[i].hand.length - 1];
          console.log(gameState.players[i].username + ' receives ' + lastCard.rank + ' of ' + lastCard.suit);
        }
      }
    }
  
    // if first 3 rounds or a tie, the next card is the trump card
    if (gameState.round <= 3 || allScoresEqual()) {
      if (gameState.deck.length > 0) {
        gameState.trumpCard = gameState.deck.pop();
        console.log('The trump card is ' + gameState.trumpCard.rank + ' of ' + gameState.trumpCard.suit);
      }
    }
  }

function saveGameStateToFile() {
  const gameStatePath = path.join(__dirname, 'gameState.json');
  fs.writeFile(gameStatePath, JSON.stringify(gameState), 'utf8', function(err) {
      if (err) {
          console.error('Error saving gameState:', err);
      } else {
          console.log('GameState saved successfully.');
      }
  });
}

function sendUpdate() {
  saveGameStateToFile();  
  console.log('sending update to clients')
  let playerActions = "";
  for (let player of gameState.players) {
      playerActions += player.username + ': ' + player.action + ', ';
  }
  // console.dir(gameState, { depth: null });
  // console.log(playerActions);

  io.to(usernameToSocketId['gg']).emit('updateGameState', createPublicGameState('gg'));
  io.to(usernameToSocketId['dd']).emit('updateGameState', createPublicGameState('dd'));
  io.to(usernameToSocketId['toto']).emit('updateGameState', createPublicGameState('toto')); 
}

function loadGameStateFromFile() {
  const gameStatePath = path.join(__dirname, 'gameState.json');
  if (fs.existsSync(gameStatePath)) {
      fs.readFile(gameStatePath, 'utf8', function(err, data) {
          if (err) {
              console.error('Error reading gameState:', err);
          } else {
              gameState = JSON.parse(data);
              console.log('GameState restored successfully.');
          }
      });
  }
}

function getPosition(username) {
    const player = gameState.players.find((p) => p.username === username);
  
    // Step 1: Check if player's score is the highest
    const highestScore = Math.max(...gameState.players.map((p) => p.scores[p.scores.length - 1]));
    if (player.scores[player.scores.length - 1] === highestScore) {
      return 1;
    }
  
    // Step 2: Check if player's score is lower than the first but higher than the last
    const lowestScore = Math.min(...gameState.players.map((p) => p.scores[p.scores.length - 1]));
    if (player.scores[player.scores.length - 1] === lowestScore) {
      // Check if there is a tie between the two lowest scores
      const sortedScores = [...gameState.players].sort((a, b) => a.scores[a.scores.length - 1] - b.scores[b.scores.length - 1]);
      const secondLowest = sortedScores[1].scores[sortedScores[1].scores.length - 1];
    
      if (player.scores[player.scores.length - 1] === secondLowest) {
        // Create an array of the two players who have the lowest score
        const playersWithLowestScore = sortedScores.slice(0, 2);
        
        // Find the player with the lowest score on the previous round
        let previousRound = gameState.round - 1;
        while (previousRound >= 0) {
          const previousRoundScores = playersWithLowestScore.map((p) => p.scores[previousRound]);
          const lowestPreviousRoundScore = Math.min(...previousRoundScores);
    
          if (lowestPreviousRoundScore !== secondLowest) {
            const indexOfPlayerWithLowestScore = previousRoundScores.indexOf(lowestPreviousRoundScore);
            if (indexOfPlayerWithLowestScore > -1) { // Add this check
                if (playersWithLowestScore[indexOfPlayerWithLowestScore].username === username) {
                    return 3;
                } else {
                    return 2;
                }
            }
        }
            
          previousRound--;
        }
    
        // If players always had the same score, apply startingPlayer rule
        const startingPlayerIndex = gameState.playOrder.indexOf(gameState.startingPlayer);
        const nextPlayerIndex = (startingPlayerIndex + 1) % gameState.playOrder.length;
        if (nextPlayerIndex === sortedScores[1].playerId || nextPlayerIndex === sortedScores[2].playerId) {
          return 3;
        } else {
          return 2;
        }
      } else {
        return 3; // Only one player with the lowest score
      }
    }
  
    // Step 4: Player's score is between the highest and the lowest
    return 2;
  }
      
function newRound() {
    // Determine first player
    gameState.startingPlayer = gameState.playOrder[gameState.round % gameState.playOrder.length];
    // increase round number
    gameState.round++
    // remove trump card
    gameState.trumpCard = []
    // reset last trick
    gameState.lastTrick = []
    
   
    // initialize deck of cards and remove cards from eveywhere else
    gameState.deck = generateDeck();

    // initialize players parameters
    for (let i = 0; i < gameState.players.length; i++) {
        gameState.players[i].hand = [];
        gameState.players[i].madeTricks[gameState.round-1] = 0;
        // actions
        // si 3 premiers rounds
        if (gameState.round < 4){
            if (gameState.players[i].username === gameState.startingPlayer) {
                gameState.players[i].action = 'bet';
            } else {
                gameState.players[i].action = 'waitForPlayer';
            }
        } else { // si round > 3
            position = getPosition(gameState.players[i].username)
            console.log(gameState.players[i].username + ' est en position: ' + position)
            switch (position) {
                case 1:
                    gameState.players[i].action = 'bet';
                    break;
                case 2:
                    gameState.players[i].action = 'waitForPlayer';
                    break;
                case 3:
                    gameState.players[i].action = 'chooseTrump';
                    break;
            }
        }
    }
    // deal cards
    dealCards();
}
    
  function determineTrickWinner() {
    const rankOrder = ['7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const rankValue = {};
    rankOrder.forEach((rank, index) => {
      rankValue[rank] = index;
    });
  
    // Get the index of the starting player
    const startIndex = gameState.playOrder.indexOf(gameState.startingPlayer);
    
    // first card's suit (the leading suit)
    const leadingSuit = gameState.trickCards[startIndex].suit;
  
    // all the trump cards played in this trick
    const trumpCards = gameState.trickCards.filter(card => card && card.suit === gameState.trumpCard.suit);
  
    let winner;
    if (trumpCards.length > 0) {
      // if there are trump cards, the highest trump wins
      const highestTrump = trumpCards.sort((a, b) => rankValue[b.rank] - rankValue[a.rank])[0];
      const winnerCardIndex = gameState.trickCards.indexOf(highestTrump);
      winner = gameState.players.find(player => player.username === gameState.playOrder[winnerCardIndex]);
    } else {
      // if there are no trumps, the highest card of the leading suit wins
      const leadingSuitCards = gameState.trickCards.filter(card => card && card.suit === leadingSuit);
      const highestLeadingSuitCard = leadingSuitCards.sort((a, b) => rankValue[b.rank] - rankValue[a.rank])[0];
      const winnerCardIndex = gameState.trickCards.indexOf(highestLeadingSuitCard);
      winner = gameState.players.find(player => player.username === gameState.playOrder[winnerCardIndex]);
    }
  
    return winner;
  }
  
  function calculateAndStoreScore() {
    // Find the max total announced tricks
    const maxTotalAnnouncedTricks = Math.max(...gameState.players.map(player => player.announcedTricks.reduce((a, b) => a + b, 0)));

    // Check for tie
    const isTie = gameState.players.filter(player => player.announcedTricks.reduce((a, b) => a + b, 0) === maxTotalAnnouncedTricks).length > 1;

    // Iterate over all players
    gameState.players.forEach(player => {
        let lastRoundScore = player.scores[player.scores.length - 1] || 0; // Fetch the last round's score
        let score = 0; // Initialize current round's score

        // If player's announced tricks match the made tricks
        if(player.madeTricks[player.madeTricks.length-1] === player.announcedTricks[player.announcedTricks.length - 1]) {
            score = 10; // Base score

            // Bonus scores
            if(player.announcedTricks[player.announcedTricks.length - 1] === Math.max(gameState.round - 2, 1)) {
                score += 10 * player.announcedTricks[player.announcedTricks.length - 1];
            } else {
                score += 5 * player.announcedTricks[player.announcedTricks.length - 1];
            }
        } else {
            // Penalty when player's announced tricks don't match the made tricks
            score = -5 * Math.abs(player.announcedTricks[player.announcedTricks.length - 1] - player.madeTricks[player.madeTricks.length-1]);
        }

        // Special bonus in final round
        if (gameState.round === 12 && !isTie && player.announcedTricks.reduce((a, b) => a + b, 0) === maxTotalAnnouncedTricks) {
            score += 15;
        }

        // Add the calculated score to the last round's score
        player.scores.push(lastRoundScore + score);
    });
}

  io.on('connection', (socket) => {
      console.log('a user connected :D');
      
      socket.on('playerJoined', (playerData) => {
          usernameToSocketId[playerData.username] = socket.id;
          console.dir(blueColor + 'socket.on(playerJoined): ' + playerData.username + resetColor, {depth: null})
        socket.username = playerData.username;
    
        for (let player of gameState.players) {
            if (player.username == playerData.username) {
                player.connected = true;
                player.playerId = socket.id; // Update the playerId with the socket.id here.
                break;
            }
        }
    
        // check if all players are connected
        const connectedPlayers = gameState.players.filter(player => player.connected);
        
        if (connectedPlayers.length === 3 && gameState.round === 0) {
            console.log('All players are connected!!')
            for (let player of gameState.players) {
                player.action = 'startNewGame'
            }
        }
        sendUpdate()
    });
        
    socket.on('disconnect', () => {
        console.dir(blueColor + 'socket.on(disconnect)' + resetColor, {depth: null})
        // Update the connected status of the disconnected player
        for (let player of gameState.players) {
            if (player.username === socket.username) {
                player.connected = false;
                break;
            }
        }
        
        // Broadcast the updated game state to all connected clients
        sendUpdate()
        // io.emit('gameStateUpdate', gameState);
    });

    // Listen for getGameState event and send game state back to the client
    socket.on('getGameState', () => {
        sendUpdate()
        // io.emit('gameStateUpdate', gameState);
    });

    // In your server-side code
socket.on('logout', () => {
    console.dir(blueColor + 'socket.on(logout)' + resetColor, {depth: null})
    // Find the player that has disconnected
    const playerIndex = gameState.players.findIndex(player => player.playerId === socket.id);
  
    if (playerIndex !== -1) {
      // Update the player's 'connected' status
      gameState.players[playerIndex].connected = false;
  
      // Alternatively, you can remove the player from the game state entirely
      // gameState.players.splice(playerIndex, 1);
  
      // Broadcast the updated game state to all connected clients
      sendUpdate()
      // io.emit('gameStateUpdate', gameState);
  }
  });
    
    /*
    List of possible actions:
        startNewGame: starts a new game
        waitForPlayer: wiat for other player to do something
        chooseTrump: choose trump color
        discard: discard one or two cards
        bet: place a bet
        playCard: play a card
        grabTrick: grab the trick
    */
   socket.on('newGame', () => {
       console.dir(blueColor + 'socket.on(newGame)' + resetColor, {depth: null})
       newGame();
       newRound();
       console.log(gameState)
       console.log("Starting game with 3 players");
       // send update to clients 
       sendUpdate();
    })

    socket.on('choseTrumpCard', (card) => {
        // Update the game state with the chosen trump card.
        const player = gameState.players.find(player => player.playerId === socket.id);
        console.dir(blueColor + 'socket.on(choseTrumpCard) from ' + player.username + ' with card: ' + card + resetColor, {depth: null})
        gameState.trumpCard = card;
      
        // get the other players
        const otherPlayers = gameState.players.filter(p => p.playerId !== socket.id);
        
        // Get the last scores of the other players
        const score1 = otherPlayers[0].scores[otherPlayers[0].scores.length - 1];
        const score2 = otherPlayers[1].scores[otherPlayers[1].scores.length - 1];
      
        if (score1 !== score2) {
          // if the players have different scores, the one with the lowest score should discard
          if (score1 < score2) {
            otherPlayers[0].action = 'discard';
          } else {
            otherPlayers[1].action = 'discard';
          }
        }
      
        // update action of the player who chose the trump card
        player.action = 'bet';
      
        // send update to clients
        sendUpdate();
    });
    
    socket.on('discard', (cards) => {
      const player = gameState.players.find(player => player.playerId === socket.id);
      console.dir(blueColor + 'socket.on(discard) from ' + player.username + ' with cards: ' + cards + resetColor, {depth: null})
      const otherPlayers = gameState.players.filter(p => p.playerId !== socket.id);

      // Check if it's the player's turn to discard
      if (player.action === 'discard') {
        // Remove the discarded cards from the player's hand
        player.hand = player.hand.filter(handCard =>
          !cards.some(card => card.rank === handCard.rank && card.suit === handCard.suit)
        );

      // Get the maximum value of bonusCards from each player
      const maxBonusCards = gameState.players.map((player) => player.bonusCards).reduce((maxValue, current) => Math.max(maxValue, current), 0);

      let lastPlayer;
      if (gameState.round === 12 && maxBonusCards === 2 && getPosition(player.username) === 2) {
        // find the last player
        for (let i = 0; i < gameState.players.length; i++) {
          const player = gameState.players[i];
          const position = getPosition(player.username);
          if (position === 3) {
            lastPlayer = player;
          }
        }
        console.log(player.username + ' donne sa carte à ' + lastPlayer.username)
        lastPlayer.hand.push(cards[0])
      }
      
        const playerRank = getPosition(player.username);
    
        // Update player actions based on the player's rank
        if (playerRank === 2) {
          player.action = 'bet';
        } else if (playerRank === 3 && otherPlayers.every(p => p.action === 'waitForPlayer')) {
            player.action = 'waitForPlayer';
            gameState.players.find(p => p.username === gameState.startingPlayer).action = 'playCard';
        } else {
          player.action = 'waitForPlayer';
        }
      }
    
      // Send updated game state to all clients
      sendUpdate();
    });

    socket.on('undoBet', () => {
      // Simply put back the chooseBet state
      const player = gameState.players.find(player => player.playerId === socket.id);

      if (player.announcedTricks.length === gameState.round) {
        player.announcedTricks.pop();
        player.action = 'bet'
      }
    sendUpdate();      

    })
    
    function isScoreTwiceAsHigh(playerIndex) {
        const playerScore = gameState.players[playerIndex].scores[gameState.round - 2];
        const otherPlayerScores = gameState.players.map((player, index) => {
          if (index !== playerIndex) {
            return player.scores[gameState.round - 2];
          }
          return undefined;
        });
      
        for (let i = 0; i < otherPlayerScores.length; i++) {
          if (typeof otherPlayerScores[i] !== 'undefined' && playerScore < 2 * otherPlayerScores[i]) {
            return false;
          }
        }
      
        return true;
      }
                  
      
    socket.on('placeBet', (betValue) => {
        // Update the game state with the player's bet.
        const player = gameState.players.find(player => player.playerId === socket.id);
        console.dir(blueColor + 'socket.on(placeBet) from ' + player.username + ' of value: ' + betValue + resetColor, {depth: null})
      
      // update bet
      if (player.announcedTricks.length === gameState.round-1) {
        // if player needs to roll a die
        const playerIndex = gameState.players.findIndex((p) => p === player);
        if (isScoreTwiceAsHigh(playerIndex) && gameState.round > 3) {
            const dieRoll = Math.floor(Math.random() * (gameState.round - 1));
            player.announcedTricks.push(dieRoll);
            console.log(player.username + ' a tiré au sort: ' + dieRoll)
        } else {
            player.announcedTricks.push(betValue);
        }
    }
        
      // Find the index of the current player in the play order
      let currentPlayerIndex = gameState.playOrder.indexOf(player.username);
      
      // Check if all players have announced their tricks
      const allAnnounced = gameState.players.every(player => player.announcedTricks.length === gameState.round);

      // If it's an early round, check if all players have placed a bet
      if(gameState.round < 4) {
          if (gameState.players.every(p => p.announcedTricks.length === gameState.round)) {
              // ready to start. All players should be at 'waitForPlayer' except for the one who starts the round. He should be at 'playCard'
              gameState.players.forEach(p => p.action = 'waitForPlayer');
              gameState.players.find(p => p.username === gameState.playOrder[gameState.round-1]).action = 'playCard';
          } else {
              // Get the next player according to the play order
              let nextPlayerUsername = gameState.playOrder[(currentPlayerIndex + 1) % gameState.playOrder.length];
              const nextPlayer = gameState.players.find(p => p.username === nextPlayerUsername);
  
              // Set the action for the next player who needs to place a bet and for others to 'waitForPlayer'
              gameState.players.forEach(p => p.action = (p === nextPlayer ? 'bet' : 'waitForPlayer'));
          }
        } else {
          // Check if the player must discard cards => action = discard
          if (!allScoresEqual() && allAnnounced) {
              // Tous les joueurs ont misé, et il y a un dernier joueur. Il doit jeter sa carte
              for (let p of gameState.players) {
                  if (getPosition(p.username) === 3) {
                      p.action = 'discard';
                  } else {
                      p.action = 'waitForPlayer';
                  }
              }
          } else if (!allAnnounced) {
              // Some players still have to place their bet
              // Check if the player's score is twice as high or higher than other players
              const currentPlayerUsername = player.username;
              const playerScore = player.scores[gameState.round - 2];
              const otherPlayerScores = gameState.players
                  .filter(p => p.username !== currentPlayerUsername)
                  .map(p => p.scores[gameState.round - 2]);
              const isScoreTwiceAsHigh = otherPlayerScores.every((score) => playerScore >= 2 * score);

              if (isScoreTwiceAsHigh && gameState.round > 3) {
                player.action = 'waitForPlayer';
              } else {
                player.action = 'undoBet';
              }
            } else {
              // all scores are equal and everybody's bet are made
              // ready to start. All players should be at 'waitForPlayer' except for the one who starts the round. He should be at 'playCard'
              gameState.players.forEach(p => p.action = 'waitForPlayer');
              gameState.players.find(p => p.username === gameState.startingPlayer).action = 'playCard';
          }
        }
      
      // Then broadcast this updated game state to all clients.
      sendUpdate();
  });
  
  socket.on('playCard', (card) => {
      // Update the game state with the card played by the player.
      const player = gameState.players.find(player => player.playerId === socket.id);
      console.dir(blueColor + 'socket.on(playCard) from ' + player.username + ': ' + card + resetColor, {depth: null})
      const otherPlayers = gameState.players.filter(p => p.playerId !== socket.id);
      const playOrderPosition = gameState.playOrder.indexOf(player.username); // get playOrder position
    
      // remove the card from the player's hand and place it on the trickCards array, at the position matching the one on playOrder
      const cardIndex = player.hand.findIndex(handCard => handCard.rank === card.rank && handCard.suit === card.suit);
      if (cardIndex !== -1) {
        player.hand.splice(cardIndex, 1); // remove card from hand
        gameState.trickCards[playOrderPosition] = card; // place card in trickCards
      }
    
      // update players' actions
      // if all cards are played (trickCards contains 3 cards), the player who wins the trick gets the grabTrick action and the others get 'waitForPlayer'
      if (gameState.trickCards.filter(Boolean).length === gameState.players.length) {
              // assuming you have a function to determine the winner, 'determineTrickWinner'
        const winner = determineTrickWinner();
        gameState.players.forEach(p => {
          console.log(winner)
          p.action = p.username === winner.username ? 'grabTrick' : 'waitForPlayer';
        });
      } else {
        // otherwise, the next player in the playOrder gets 'playCard' and the others should be at 'waitForPlayer'
        const nextPlayerIndex = (playOrderPosition + 1) % gameState.players.length; // gets the index of the next player
        const nextPlayer = gameState.players.find(player => player.username === gameState.playOrder[nextPlayerIndex]);
        gameState.players.forEach(p => {
          p.action = p.username === nextPlayer.username ? 'playCard' : 'waitForPlayer';
        });
      }
    
      // Then broadcast this updated game state to all clients.
      sendUpdate();
    });
    
    function deleteGameStateFile() {
      const gameStatePath = path.join(__dirname, 'gameState.json');
  
      fs.unlink(gameStatePath, (err) => {
          if (err) {
              console.error('Error deleting gameState file:', err);
          } else {
              console.log('GameState file deleted successfully.');
          }
      });
  }
  
  socket.on('grabTrick', () => {
        const player = gameState.players.find(player => player.playerId === socket.id);
        console.dir(blueColor + 'socket.on(grabTrick) by ' + player.username + resetColor, {depth: null})
      const otherPlayers = gameState.players.filter(p => p.playerId !== socket.id);
      
      // Update the number of tricks done by this player
      player.madeTricks[gameState.round-1] += 1;
      console.log(player.username + ' now has ' + player.madeTricks[gameState.round-1] + ' tricks')
    
      // Save and Clear trickCards
      gameState.lastTrick = gameState.trickCards;
      gameState.trickCards = [];
    
      // Check if it's the last trick
      const isLastTrick = player.hand.length === 0; // assuming that a round corresponds to a trick
      console.log('This is the last trick of the round: ' + isLastTrick)
    
      // If it's not the last trick
      if (!isLastTrick) {
        // Set startingPlayer to the current player
        gameState.startingPlayer = player.username;
    
        // Set the actions to waitForPlayer or playCard
        player.action = 'playCard';
        otherPlayers.forEach(p => p.action = 'waitForPlayer');
      }
    
      // If it's the last trick
      if (isLastTrick) {
        // If it's not the last round
        const isLastRound = gameState.round === 12; // assuming there are 12 rounds in a game
        console.log('This is the last round: ' + isLastRound)
    
        // Update score
        calculateAndStoreScore();
  
        if (!isLastRound) {
          newRound();
        } else {
          // If it's the last round and last trick
    
          saveScoreInDB(gameState)
          .then(() => console.log("Scores saved successfully"))
          .catch((error) => console.error("An error occurred:", error));

          // Delete the save file
          deleteGameStateFile()
              
          // set all actions to startNewGame
          gameState.players.forEach(p => p.action = 'startNewGame')
          
          // Calculate the highest score among all players
          const highestScore = Math.max(...gameState.players.map(player => player.scores[gameState.round - 1]));
          
          // Identify all players with the highest score
          const winners = gameState.players.filter(player => player.scores[gameState.round - 1] === highestScore);
          
          // Get the usernames of the winners
          const winnerUsernames = winners.map(player => player.username);
          
          // Assign the array of winner usernames to the lastGameWinners attribute
          gameState.lastGameWinners = winnerUsernames;
        }
      }
      // Then broadcast the updated game state to all clients.
      sendUpdate();
    });
});

app.use('/', router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

