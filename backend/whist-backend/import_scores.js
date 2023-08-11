const { MongoClient } = require('mongodb');
//const { addPastGame } = require('./db');
const { addPastGame } = require('./gameModel');

const csv = require('csv-parser');
const fs = require('fs');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function importPastGames() {
  await client.connect();
  const db = client.db("whist");
  
  const rows = [];
  console.log('starting import in ' + db.databaseName + ' database')
  fs.createReadStream('add_scores.csv')
    .pipe(csv())
    .on('data', (data) => {
      // Extract the required data from the CSV row
      const date = new Date(data.Year, data.Month - 1, data.Day);
      const gg_score = parseInt(data.GG);
      const dd_score = parseInt(data.DD);
      const toto_score = parseInt(data.Toto);

      // Add the extracted data to the rows array
      rows.push({ date, gg_score, dd_score, toto_score });
    })
    .on('end', async () => {
      try {
        // Loop through each row and add the past game to the database
        for (const row of rows) {
          const gameId = await addPastGame(db, row.date, row.gg_score, row.dd_score, row.toto_score);
          console.log(`Added game with ID ${gameId}`);
        }
        await client.close();

        res.json({ success: true, rows });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Error adding past game' });
        await client.close();
      }
    });

}

importPastGames();

