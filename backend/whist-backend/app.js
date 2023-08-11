require('dotenv').config();
const express = require("express");
const session = require('express-session');
const cors = require("cors");
const { connect: connectDB } = require("./config/db");
const getParams = require("./gameStats");
const http = require("http");
const app = express();
app.use((req, res, next) => {
  console.log(req.headers);
  next();
});

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('./models/user')
const MongoDBStore = require('connect-mongodb-session')(session)

app.use(cors({
  origin: 'http://localhost:3000', // adjust this to match the origin you're trying to allow
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));

const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/whist',
  collection: 'sessions'
})

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

app.get('/api/gameStats', async function (req, res) {
  getParams().then(data => res.json(data)).catch(err => console.error(err));
});

app.post('/create-user', async (req, res) => {
  const { username, password } = req.body;
  
  if(!username || !password) {
    res.status(400).send('Username or password not provided');
    return;
  }
  
  // hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // create a new user
  const user = new User({
    username,
    hashedPassword
  });
  
  try {
    // save the user
    await user.save();
    res.status(200).json({ message: 'User created successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating user: ' + err.message });
  }
});

//router.post('/login', async (req, res) => {
  app.post('/api/login', async (req, res) => {
  try {
      console.log("Backend username: " + req.body.username)
      console.log("Backend password: " + req.body.password)
      const user = await User.findOne({ username: req.body.username });
      if (!user) {
          res.status(401).send('User not found');
      } else {
          user.comparePassword(req.body.password, async (err, isMatch) => {
              if (err || !isMatch) {
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
          res.send('Logged out successfully');
        }
      });
    });
    
    function requireLogin(req, res, next) {
      if (!req.session.userId) {
        res.status(401).send('Unauthorized');
      } else {
        next();
      }
    }
    
    connectDB();

    app.get("/api/getParams", async (req, res) => {
      try {
        const result = await getParams();
        res.status(200).json({ message: result });
      } catch (error) {
        console.error(error);
        res
        .status(500)
        .json({ error: "An error occurred while processing your request." });
      }
    });
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
});

let players = [];

io.on("connection", (socket) => {
  console.log("A user connected");
  
  // When a player joins the game
  socket.on("playerJoined", (data) => {
    console.log(`Player ${data.playerId} joined`);
    
    // Add the player to the players array
    players.push({ id: socket.id, playerId: data.playerId });
    
    // If there are 3 players, start the game
    if (players.length === 3) {
      io.emit("startGame");
      console.log("Starting game with 3 players");
    }
  });
  
  // When a player leaves the game
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    
    // Remove the player from the players array
    players = players.filter((player) => player.id !== socket.id);
  });
});

/*
I'd like to add a button 'New game' and another one 'finish round' on the index.html and implement the following logic:
On 'New game' : initialize the game (round, scores, etc.) and deal cards according to the rules
then on 'finish round' : increment the round number and deal cards according to the rules

*/

app.use('/api', router);