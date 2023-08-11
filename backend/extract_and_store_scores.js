const { MongoClient } = require('mongodb');
const fs = require('fs');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function exportScores() {
  await client.connect();
  const db = client.db("whist");
  const collection = db.collection("past_games"); // Replace with your collection name

  const cursor = await collection.find({}); // Adjust the query as needed

  let currentYearScores = [];
  let currentYear = null;

  await cursor.forEach(doc => {
    const date = doc.date;
    const year = date.getFullYear();

    if (currentYear !== year) {
      // Save the previous year's scores if there are any
      if (currentYearScores.length > 0) {
        fs.writeFileSync(`scores/scores_${currentYear}.json`, JSON.stringify(currentYearScores));
      }

      // Start a new array for the new year
      currentYearScores = [];
      currentYear = year;
    }

    // Add the score to the current year's array
    const { gg_score, dd_score, toto_score } = doc;
    currentYearScores.push({ date, gg_score, dd_score, toto_score });
  });

  // Save the last year's scores
  if (currentYearScores.length > 0) {
    fs.writeFileSync(`scores/scores_${currentYear}.json`, JSON.stringify(currentYearScores));
  }

  await client.close();
  console.log("Scores exported successfully.");
}

exportScores();
