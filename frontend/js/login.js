document.getElementById('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error('Login failed');
        }
        // handle successful login
        window.location.href = 'game.html';
    })
    .catch((error) => {
        // handle failed login
    });
});
