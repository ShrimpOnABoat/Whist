document.addEventListener("DOMContentLoaded", () => {
  const currentYear = new Date().getFullYear();
  let selectedYear = currentYear;
  updateYear(selectedYear);

  document.getElementById("prevYear").addEventListener("click", () => {
    selectedYear--;
    updateYear(selectedYear);
  });

  document.getElementById("nextYear").addEventListener("click", () => {
    selectedYear++;
    updateYear(selectedYear);
  });
});

function updateYear(year) {
  const token = localStorage.getItem("token"); // Assuming the token is stored in local storage

  document.getElementById("currentYear").innerText = year;
  // Fetch data for the selected year from your server
  fetch(`/getGames?year=${year}`, {
    headers: {
      Authorization: `Bearer ${token}`, // Include the token in the Authorization header
    },
  })
    .then((response) => response.json())
    .then((pastGames) => {
      console.dir(pastGames, { depth: null });
      updateSummaryTable(pastGames);
      updateMonthlyScores(pastGames);
    })
    .catch((error) => console.error("An error occurred:", error));
}

function updateSummaryTable(data) {
  // Define a mapping of month numbers to French month names
  const monthNames = {
    "01": "Janvier",
    "02": "Février",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Août",
    "09": "Septembre",
    10: "Octobre",
    11: "Novembre",
    12: "Décembre",
  };

  // Group data by month directly from the date string
  const monthlyData = data.reduce((acc, game) => {
    // Directly extract YYYY-MM from the date string
    const yearMonth = game.date.substring(0, 7); // Extract YYYY-MM directly
    const [year, month] = yearMonth.split("-");

    // Use the mapping to convert month number to French name
    const monthName = `${monthNames[month]}`;

    acc[monthName] = acc[monthName] || [];
    acc[monthName].push(game);
    return acc;
  }, {});

  // Define function to calculate points
  const calculatePoints = (game) => {
    if ("gg_position" in game) {
      return [
        3 - game.gg_position,
        3 - game.dd_position,
        3 - game.toto_position,
      ];
    } else {
      const scores = [game.gg_score, game.dd_score, game.toto_score];
      const sorted = [...scores].sort((a, b) => b - a);
      return scores.map((score) => {
        if (score === sorted[0]) return 2;
        if (score === sorted[1]) return 1;
        return 0;
      });
    }
  };

  // Adjusted to correctly calculate monthly tallies based on monthly scores
  const calculateTallies = (monthlyScores) => {
    // Clone monthlyScores to avoid modifying the original array
    const scores = [...monthlyScores];
    // Sort the scores in descending order
    scores.sort((a, b) => b - a);

    // Map the original scores to their tallies
    return monthlyScores.map((score) => {
      if (score === scores[0]) return 2; // Highest score
      if (score === scores[1]) return 1; // Second highest score
      return 0; // Any other score
    });
  };

  let totalScores = [0, 0, 0, 0, 0, 0];
  const rows = Object.keys(monthlyData).map((monthName) => {
    const games = monthlyData[monthName];
    let monthlyScores = [0, 0, 0];
    // let monthlyTallies = [0, 0, 0];

    games.forEach((game) => {
      const points = calculatePoints(game);
      monthlyScores = monthlyScores.map(
        (score, index) => score + points[index]
      );
    });

    // Simplified logic for monthlyTallies based on available points data
    let monthlyTallies = calculateTallies(monthlyScores);

    totalScores = totalScores.map(
      (total, index) =>
        total + (index < 3 ? monthlyScores[index] : monthlyTallies[index - 3])
    );

    return `<tr><td>${monthName}</td><td>${monthlyScores
      .concat(monthlyTallies)
      .join("</td><td>")}</td></tr>`;
  });

  const header = `<tr><th>Mois</th><th>GG Points</th><th>DD Points</th><th>Toto Points</th><th>GG Tally</th><th>DD Tally</th><th>Toto Tally</th></tr>`;
  const footer = `<tr><td>Total</td><td>${totalScores.join(
    "</td><td>"
  )}</td></tr>`;

  const summaryTable = document.getElementById("summaryTable");
  summaryTable.innerHTML = header + rows.join("") + footer;
}

function updateMonthlyScores(data) {
  const monthlyScores = document.getElementById("monthlyScores");

  // Create table header
  let tableHTML = `<table class="monthly-scores-table"><tr><th>Date</th><th>GG</th><th>DD</th><th>Toto</th></tr>`;

  // Process data to build rows for each game
  data.forEach((game) => {
    const gameDate = game.date.split("T")[0]; // Extract YYYY-MM-DD

    // Initialize classes for CSS styling based on position
    let classes = { gg: "", dd: "", toto: "" };

    // Check if position data is available for the game
    if ("gg_position" in game) {
      // Use position to set class for highlighting
      Object.entries(classes).forEach(([id, _]) => {
        const position = game[`${id}_position`]; // e.g., gg_position
        if (position === 1) {
          classes[id] = "highlight-score"; // Highest score
        } else if (position === 2) {
          classes[id] = "second-score"; // Second highest
        } // No need for else, default class is ""
      });
    } else {
      // Fallback to score-based ranking if no position data
      const scoresWithId = [
        { score: game.gg_score, id: "gg" },
        { score: game.dd_score, id: "dd" },
        { score: game.toto_score, id: "toto" },
      ];

      // Sort scores to find the highest and second highest
      scoresWithId.sort((a, b) => b.score - a.score);

      classes[scoresWithId[0].id] = "highlight-score"; // Highest score

      // Check for second highest score considering tie situations
      if (scoresWithId[1].score === scoresWithId[0].score) {
        classes[scoresWithId[1].id] = "highlight-score"; // Tie for highest
      } else {
        classes[scoresWithId[1].id] = "second-score"; // Second highest
      }

      // Check for third highest score in case of a tie for second place
      if (scoresWithId[2].score === scoresWithId[1].score) {
        classes[scoresWithId[2].id] = "second-score"; // Tie for second highest
      }
    }

    // Construct table row with appropriate classes for highlighting
    tableHTML += `<tr>
                        <td>${gameDate}</td>
                        <td class="${classes.gg}">${game.gg_score}</td>
                        <td class="${classes.dd}">${game.dd_score}</td>
                        <td class="${classes.toto}">${game.toto_score}</td>
                    </tr>`;
  });

  // Close the table tag
  tableHTML += "</table>";

  // Update the monthlyScores with the new content
  monthlyScores.innerHTML = tableHTML;
}

// function updateMonthlyScores(data) {
//   const monthlyScores = document.getElementById("monthlyScores");

//   // Create table header
//   let tableHTML = `<table class="monthly-scores-table"><tr><th>Date</th><th>GG</th><th>DD</th><th>Toto</th></tr>`;

//   // Process data to build rows for each game
//   data.forEach((game) => {
//     const gameDate = game.date.split("T")[0]; // Extract YYYY-MM-DD
//     // Put scores and identifiers in an array
//     const scoresWithId = [
//       { score: game.gg_score, id: "gg" },
//       { score: game.dd_score, id: "dd" },
//       { score: game.toto_score, id: "toto" },
//     ];

//     // Sort scores to find the highest and second highest
//     scoresWithId.sort((a, b) => b.score - a.score);

//     // Determine class for highlighting based on position
//     let classes = { gg: "", dd: "", toto: "" };
//     classes[scoresWithId[0].id] = "highlight-score"; // Highest score

//     // Check for second highest score considering tie situations
//     if (scoresWithId[1].score === scoresWithId[0].score) {
//       classes[scoresWithId[1].id] = "highlight-score"; // Tie for highest
//     } else {
//       classes[scoresWithId[1].id] = "second-score"; // Second highest
//     }

//     // Check for third highest score in case of a tie for second place
//     if (scoresWithId[2].score === scoresWithId[1].score) {
//       classes[scoresWithId[2].id] = "second-score"; // Tie for second highest
//     }

//     tableHTML += `<tr>
//                       <td>${gameDate}</td>
//                       <td class="${classes.gg}">${game.gg_score}</td>
//                       <td class="${classes.dd}">${game.dd_score}</td>
//                       <td class="${classes.toto}">${game.toto_score}</td>
//                     </tr>`;
//   });

//   // Close the table tag
//   tableHTML += "</table>";

//   // Update the monthlyScores with the new content
//   monthlyScores.innerHTML = tableHTML;
// }

document.getElementById("backButton").addEventListener("click", () => {
  window.location.href = "/game.html";
});

// Additional helper functions to calculate points, handle ties, etc.
