const { ObjectId } = require('mongodb');
const { connect } = require('./config/db');

async function addPastGame(db, date, gg_score, dd_score, toto_score) {
  try {
    const result = await db.collection('past_games').insertOne({
      date,
      gg_score,
      dd_score,
      toto_score,
    });
    console.log(`New past game added with ID: ${result.insertedId}`);
    return result.insertedId;
  } catch (error) {
    console.error('Error adding past game:', error);
  }
}

module.exports = {
  addPastGame,
};
