// Connect to WebSocket server
const socket = io();

// Game state
let gameState = {
    myName: '',
    player1Name: '',
    player2Name: '',
    currentTurn: '',
    myCards: [],
    communityCards: [],
    pot: 0,
    myBet: 0,
    opponentBet: 0,
    gameOver: false
};

// Card sprite mapping (using Unicode suits for display)
const SUIT_SYMBOLS = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
};

const RANK_DISPLAY = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K'
};

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const playerNameInput = document.getElementById('playerName');
const enterGameBtn = document.getElementById('enterGame');
const errorMessage = document.getElementById('errorMessage');
const waitingMessage = document.getElementById('waitingMessage');
const myCardsDisplay = document.getElementById('myCards');
const opponentCardsDisplay = document.getElementById('opponentCards');
const communityCardsDisplay = document.getElementById('communityCardsDisplay');
const turnIndicator = document.getElementById('turnIndicator');
const gameStatus = document.getElementById('gameStatus');
const playAgainBtn = document.getElementById('playAgain');
const player1NameDisplay = document.getElementById('player1Name');
const player2NameDisplay = document.getElementById('player2Name');
const potAmount = document.getElementById('potAmount');
const myBetDisplay = document.getElementById('myBet');
const player2BetDisplay = document.getElementById('player2Bet');

// Action buttons
const foldBtn = document.getElementById('foldBtn');
const checkBtn = document.getElementById('checkBtn');
const callBtn = document.getElementById('callBtn');
const raiseBtn = document.getElementById('raiseBtn');

// Render card display
function renderCard(card) {
    if (!card) return '';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    
    // Determine color based on suit
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    cardDiv.classList.add(isRed ? 'red' : 'black');
    
    const rankDisplay = RANK_DISPLAY[card.rank] || card.rank;
    const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;
    
    cardDiv.innerHTML = `
        <div class="card-rank">${rankDisplay}</div>
        <div class="card-suit">${suitSymbol}</div>
    `;
    
    return cardDiv;
}

function renderCards(container, cards, hidden = false) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (cards && cards.length > 0) {
        cards.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            
            if (hidden) {
                cardDiv.classList.add('card-back');
                cardDiv.innerHTML = '<div class="card-back-pattern">🂠</div>';
            } else {
                const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
                cardDiv.classList.add(isRed ? 'red' : 'black');
                
                const rankDisplay = RANK_DISPLAY[card.rank] || card.rank;
                const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;
                
                cardDiv.innerHTML = `
                    <div class="card-rank">${rankDisplay}</div>
                    <div class="card-suit">${suitSymbol}</div>
                `;
            }
            
            container.appendChild(cardDiv);
        });
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

// Action button handlers
foldBtn.addEventListener('click', () => {
    if (!gameState.gameOver && gameState.currentTurn === gameState.myName) {
        socket.emit('bet', { action: 'fold' });
    }
});

checkBtn.addEventListener('click', () => {
    if (!gameState.gameOver && gameState.currentTurn === gameState.myName) {
        socket.emit('bet', { action: 'check' });
    }
});

callBtn.addEventListener('click', () => {
    if (!gameState.gameOver && gameState.currentTurn === gameState.myName) {
        socket.emit('bet', { action: 'call' });
    }
});

raiseBtn.addEventListener('click', () => {
    if (!gameState.gameOver && gameState.currentTurn === gameState.myName) {
        const amount = parseInt(prompt('Enter raise amount (must be >= current bet):', gameState.opponentBet + 10));
        if (amount && amount >= gameState.opponentBet) {
            socket.emit('bet', { action: 'raise', amount });
        }
    }
});

// Update action buttons visibility
function updateActionButtons() {
    if (gameState.gameOver) {
        foldBtn.style.display = 'none';
        checkBtn.style.display = 'none';
        callBtn.style.display = 'none';
        raiseBtn.style.display = 'none';
        return;
    }
    
    const isMyTurn = gameState.currentTurn === gameState.myName;
    
    foldBtn.style.display = isMyTurn ? 'inline-block' : 'none';
    checkBtn.style.display = isMyTurn ? 'inline-block' : 'none';
    callBtn.style.display = isMyTurn ? 'inline-block' : 'none';
    raiseBtn.style.display = isMyTurn ? 'inline-block' : 'none';
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
    gameState.player1Name = data.players[0];
    gameState.player2Name = data.players[1];
    gameState.currentTurn = data.turn;
    gameState.myCards = data.my_cards;
    gameState.communityCards = [];
    gameState.pot = data.pot || 0;
    gameState.gameOver = false;
    
    // Update player displays
    player1NameDisplay.textContent = gameState.player1Name;
    player2NameDisplay.textContent = gameState.player2Name;
    
    // Clear status
    gameStatus.textContent = '';
    gameStatus.className = 'game-status';
    playAgainBtn.classList.add('hidden');
    
    // Render cards
    renderCards(myCardsDisplay, gameState.myCards);
    renderCards(opponentCardsDisplay, [null, null], true); // Hidden cards for opponent
    renderCards(communityCardsDisplay, []);
    
    potAmount.textContent = gameState.pot;
    
    showScreen(gameScreen);
    updateTurnIndicator();
    updateActionButtons();
});

socket.on('bet_made', (data) => {
    gameState.pot = data.pot;
    gameState.currentTurn = data.next_turn;
    
    potAmount.textContent = gameState.pot;
    
    if (data.bets) {
        const myName = gameState.myName;
        const opponentName = gameState.player1Name === myName ? gameState.player2Name : gameState.player1Name;
        
        gameState.myBet = data.bets[myName] || 0;
        gameState.opponentBet = data.bets[opponentName] || 0;
        
        myBetDisplay.textContent = '$' + gameState.myBet;
        player2BetDisplay.textContent = '$' + gameState.opponentBet;
    }
    
    // If round is over, disable buttons
    if (data.round_over) {
        foldBtn.style.display = 'none';
        checkBtn.style.display = 'none';
        callBtn.style.display = 'none';
        raiseBtn.style.display = 'none';
        turnIndicator.textContent = 'Round over - determining winner...';
        turnIndicator.className = 'turn-indicator opponent-turn';
    } else {
        updateTurnIndicator();
        updateActionButtons();
    }
});

socket.on('game_over', (data) => {
    gameState.gameOver = true;
    
    // Show community cards
    if (data.community_cards) {
        gameState.communityCards = data.community_cards;
        renderCards(communityCardsDisplay, gameState.communityCards);
    }
    
    // Show opponent's cards (if not a fold)
    if (data.opponent_cards && data.reason !== 'fold') {
        renderCards(opponentCardsDisplay, data.opponent_cards);
    }
    
    if (data.reason === 'fold') {
        if (data.is_winner) {
            gameStatus.textContent = '🎉 You Won!';
            gameStatus.className = 'game-status winner';
        } else {
            gameStatus.textContent = '😢 You Lost (Opponent Folded)';
            gameStatus.className = 'game-status loser';
        }
    } else if (data.reason === 'showdown') {
        if (data.is_winner) {
            gameStatus.textContent = `🎉 You Won! (${data.my_hand.hand_strength.replace('_', ' ')})`;
            gameStatus.className = 'game-status winner';
        } else if (data.winner) {
            gameStatus.textContent = `😢 You Lost (${data.my_hand.hand_strength.replace('_', ' ')})`;
            gameStatus.className = 'game-status loser';
        } else {
            gameStatus.textContent = "It's a Tie!";
            gameStatus.className = 'game-status tie';
        }
    }
    
    playAgainBtn.classList.remove('hidden');
    updateActionButtons();
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

// Initialize
updateActionButtons();
