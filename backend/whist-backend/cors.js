const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);

    if(origin.indexOf("http://localhost:3000") !== -1){
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

module.exports = cors(corsOptions);
