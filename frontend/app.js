// Connect to WebSocket server
const socket = io();

// Game state
let gameState = {
    mySymbol: '',
    myName: '',
    player1Name: '',
    player2Name: '',
    currentTurn: '',
    board: Array(9).fill(''),
    gameOver: false
};

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const playerNameInput = document.getElementById('playerName');
const enterGameBtn = document.getElementById('enterGame');
const errorMessage = document.getElementById('errorMessage');
const waitingMessage = document.getElementById('waitingMessage');
const gameBoard = document.getElementById('gameBoard');
const turnIndicator = document.getElementById('turnIndicator');
const gameStatus = document.getElementById('gameStatus');
const playAgainBtn = document.getElementById('playAgain');
const player1NameDisplay = document.getElementById('player1Name');
const player2NameDisplay = document.getElementById('player2Name');
const player1SymbolDisplay = document.getElementById('player1Symbol');
const player2SymbolDisplay = document.getElementById('player2Symbol');

// Initialize game board
function initializeBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        gameBoard.appendChild(cell);
    }
}

// Switch between screens
function showScreen(screen) {
    loginScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    
    screen.classList.remove('hidden');
}

// Enter game button handler
enterGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        errorMessage.textContent = 'Please enter a name';
        return;
    }
    
    errorMessage.textContent = '';
    socket.emit('check_name', { name });
});

// Handle Enter key
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enterGameBtn.click();
    }
});

// Handle cell click
function handleCellClick(index) {
    if (gameState.gameOver || gameState.board[index] || gameState.currentTurn !== gameState.myName) {
        return;
    }
    
    socket.emit('make_move', { index });
}

// Update board display
function updateBoard(board) {
    const cells = gameBoard.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index];
        cell.classList.toggle('disabled', !!board[index] || gameState.gameOver);
    });
}

// Socket event handlers
socket.on('connected', (data) => {
    console.log('Connected:', data.message);
});

socket.on('name_taken', (data) => {
    errorMessage.textContent = data.error;
});

socket.on('name_valid', (data) => {
    gameState.myName = data.name;
    showScreen(waitingScreen);
    waitingMessage.textContent = 'Looking for an opponent...';
});

socket.on('waiting', (data) => {
    waitingMessage.textContent = data.message;
});

socket.on('game_start', (data) => {
    gameState.mySymbol = data.your_symbol;
    gameState.player1Name = data.players[0];
    gameState.player2Name = data.players[1];
    gameState.currentTurn = data.turn;
    
    // Update player displays
    player1NameDisplay.textContent = gameState.player1Name;
    player2NameDisplay.textContent = gameState.player2Name;
    player1SymbolDisplay.textContent = '(X)';
    player2SymbolDisplay.textContent = '(O)';
    
    // Clear and initialize
    gameState.board = Array(9).fill('');
    gameState.gameOver = false;
    gameStatus.textContent = '';
    playAgainBtn.classList.add('hidden');
    
    initializeBoard();
    showScreen(gameScreen);
    updateTurnIndicator();
});

socket.on('move_made', (data) => {
    gameState.board = data.board;
    gameState.currentTurn = data.next_turn;
    
    updateBoard(data.board);
    updateTurnIndicator();
});

socket.on('game_over', (data) => {
    gameState.board = data.board;
    gameState.gameOver = true;
    
    updateBoard(data.board);
    
    if (data.reason === 'win') {
        if (data.winner === gameState.myName) {
            gameStatus.textContent = '🎉 You Won!';
            gameStatus.className = 'game-status winner';
        } else {
            gameStatus.textContent = '😢 You Lost';
            gameStatus.className = 'game-status loser';
        }
    } else if (data.reason === 'tie') {
        gameStatus.textContent = "It's a Tie!";
        gameStatus.className = 'game-status tie';
    }
    
    playAgainBtn.classList.remove('hidden');
});

socket.on('error', (data) => {
    console.error('Error:', data.error);
    gameStatus.textContent = data.error;
});

socket.on('opponent_disconnected', (data) => {
    gameStatus.textContent = 'Opponent disconnected';
    gameStatus.className = 'game-status error';
    playAgainBtn.classList.remove('hidden');
});

// Play again button
playAgainBtn.addEventListener('click', () => {
    location.reload();
});

// Update turn indicator
function updateTurnIndicator() {
    if (gameState.currentTurn === gameState.myName) {
        turnIndicator.textContent = "It's your turn!";
        turnIndicator.className = 'turn-indicator your-turn';
    } else {
        turnIndicator.textContent = `Waiting for ${gameState.currentTurn}...`;
        turnIndicator.className = 'turn-indicator opponent-turn';
    }
}

// Initialize board on load
initializeBoard();


