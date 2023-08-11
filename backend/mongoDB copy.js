const { MongoClient } = require("mongodb");

async function getParams() {
  // this function returns the id of the loser, the number of months lost,
  // and the current month's scores
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("whist");

    // const currentDate = new Date(2022, 3, 7);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const firstDayOfCurrentYear = new Date(currentYear, 0, 1);
    const lastDayOfCurrentYear = new Date(currentYear + 1, 0, 0);

    const pastGames = await db
      .collection("past_games")
      .find({
        date: {
          $gte: firstDayOfCurrentYear,
          $lte: lastDayOfCurrentYear,
        },
      })
      .toArray();

    const previousMonthGames = pastGames.filter((game) => {
      const gameDate = new Date(game.date);
      return gameDate.getMonth() === currentMonth - 1;
    });

    const currentMonthGames = pastGames.filter((game) => {
      const gameDate = new Date(game.date);
      return gameDate.getMonth() === currentMonth;
    });
    //console.log(currentMonthGames);
    const calculatePlayerPoints = (games) => {
      const points = { gg: 0, dd: 0, toto: 0 };

      if (games.length == 0) {
        return points;
      }

      for (const game of games) {
        const scores = [
          { player: "gg", score: game.gg_score },
          { player: "dd", score: game.dd_score },
          { player: "toto", score: game.toto_score },
        ];
        scores.sort((a, b) => b.score - a.score);

        for (let i = 0; i < scores.length; i++) {
          if (i === 0) {
            scores[i].points = 2; // Players with the maximum score get 2 points
          } else if (i === 1 && scores[i].score !== scores[i - 1].score) {
            scores[i].points = 1; // Players with the second-best score get 1 point
          } else if (scores[i].score === scores[i - 1].score) {
            scores[i].points = scores[i - 1].points; // Players with the same score as the previous player get the same points
          } else {
            scores[i].points = 0; // The rest of the players get 0 points
          }
        }

        for (const score of scores) {
          points[score.player] += score.points;
        }
      }
      return points;
    };

    let currentScores = calculatePlayerPoints(currentMonthGames);
    console.log(currentScores);
    if (currentMonth === 0) {
      return {
        loserId: null,
        losingMonths: 0,
        currentMonthScore: currentScores,
        message: "No one lost the previous month as it's January.",
      };
    }

    const previousMonthPoints = calculatePlayerPoints(previousMonthGames);

    function findLoser(monthPoints) {
      const sortedEntries = Object.entries(monthPoints).sort(
        (a, b) => a[1] - b[1]
      );

      if (sortedEntries.length < 2) {
        return null;
      }

      return sortedEntries[0][1] === sortedEntries[1][1]
        ? null
        : sortedEntries[0][0];
    }

    const loserId = findLoser(previousMonthPoints);
    console.log(loserId);

    let losingMonths = 1;
    let checkingMonth = currentMonth - 1;

    while (true) {
      if (checkingMonth === 0) {
        break;
      }

      const checkingMonthGames = pastGames.filter((game) => {
        const gameDate = new Date(game.date);
        return gameDate.getMonth() === checkingMonth - 1;
      });

      const checkingMonthPoints = calculatePlayerPoints(checkingMonthGames);
      if (loserId == findLoser(checkingMonthPoints)) {
        losingMonths++;
        checkingMonth--;
      } else {
        break;
      }
    }

    return {
      loserId,
      losingMonths,
      currentScores,
    };
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}


module.exports = getParams;
