document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();
    let selectedYear = currentYear;
    updateYear(selectedYear);

    document.getElementById('prevYear').addEventListener('click', () => {
        selectedYear--;
        updateYear(selectedYear);
    });

    document.getElementById('nextYear').addEventListener('click', () => {
        selectedYear++;
        updateYear(selectedYear);
    });
});

function updateYear(year) {
    const token = localStorage.getItem('token'); // Assuming the token is stored in local storage

    document.getElementById('currentYear').innerText = year;
    // Fetch data for the selected year from your server
    fetch(`/getGames?year=${year}`, {
        headers: {
            'Authorization': `Bearer ${token}` // Include the token in the Authorization header
        }
    })
    .then(response => response.json())
    .then(pastGames => {
        console.dir(pastGames, { depth: null });
        updateSummaryTable(pastGames);
        updateMonthlyScores(pastGames);
    })
    .catch(error => console.error('An error occurred:', error));
}

function updateSummaryTable(data) {
    // Group data by month
    const monthlyData = data.reduce((acc, game) => {
        const month = new Date(game.date).toISOString().slice(0, 7); // Extract YYYY-MM
        acc[month] = acc[month] || [];
        acc[month].push(game);
        return acc;
    }, {});
  
    // Define function to calculate points
    const calculatePoints = scores => {
      const sorted = [...scores].sort((a, b) => b - a);
      return scores.map(score => {
        if (score === sorted[0]) return 2;
        if (score === sorted[1]) return 1;
        return 0;
      });
    };
  
    // Process data for summary table
    // Process data for summary table
    let totalScores = [0, 0, 0, 0, 0, 0];
    const rows = Object.keys(monthlyData).map(month => {
        const games = monthlyData[month];
        let monthlyScores = [0, 0, 0];
        let monthlyTallies = [0, 0, 0]; // These will hold the same calculations as monthlyScores but for the cumulative totals

        games.forEach(game => {
            const gameScores = [game.gg_score, game.dd_score, game.toto_score];
            const points = calculatePoints(gameScores);
            monthlyScores = monthlyScores.map((score, index) => score + points[index]);
        });

        // Now, use the same logic for the tallies
        monthlyTallies = calculatePoints(monthlyScores);

        totalScores = totalScores.map((total, index) => total + (index < 3 ? monthlyScores[index] : monthlyTallies[index - 3]));

        return `<tr><td>${month}</td><td>${monthlyScores.concat(monthlyTallies).join('</td><td>')}</td></tr>`;
    });
  
    // Create table header and footer
    const header = `<tr><th>Month</th><th>GG</th><th>DD</th><th>Toto</th><th>GG</th><th>DD</th><th>Toto</th></tr>`;
    const footer = `<tr><td>Total</td><td>${totalScores.join('</td><td>')}</td></tr>`;

    // Update the summaryTable with the new content
    const summaryTable = document.getElementById('summaryTable');
    summaryTable.innerHTML = header + rows.join('') + footer;
}
    

function updateMonthlyScores(data) {
    const monthlyScores = document.getElementById('monthlyScores');
    
    // Create table header
    let tableHTML = `<table class="monthly-scores-table"><tr><th>Date</th><th>GG</th><th>DD</th><th>Toto</th></tr>`;
    
    // Process data to build rows for each game
    data.forEach(game => {
      const gameDate = new Date(game.date).toISOString().slice(0, 10); // Extract YYYY-MM-DD
      tableHTML += `<tr><td>${gameDate}</td><td>${game.gg_score}</td><td>${game.dd_score}</td><td>${game.toto_score}</td></tr>`;
    });
  
    // Close the table tag
    tableHTML += '</table>';
    
    // Update the monthlyScores with the new content
    monthlyScores.innerHTML = tableHTML;
  }
  

document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = "/game.html";
});

// Additional helper functions to calculate points, handle ties, etc.
