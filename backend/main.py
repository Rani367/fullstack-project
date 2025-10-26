from flask import Flask, send_from_directory, render_template, request
from flask_socketio import SocketIO, emit
import os
import time
import random

# Get the absolute path to frontend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='', template_folder=TEMPLATE_DIR)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')

socketio = SocketIO(app, cors_allowed_origins="*")

# Generate a version for cache busting
VERSION = os.environ.get('RAILWAY_DEPLOYMENT_ID', str(int(time.time())))

# Poker card utilities
SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

def create_deck():
    """Create a deck of 52 cards"""
    return [{'suit': suit, 'rank': rank, 'sprite': f"{rank}_{suit}"} 
            for suit in SUITS for rank in RANKS]

def shuffle_deck(deck):
    """Shuffle the deck"""
    random.shuffle(deck)
    return deck

def get_card_value(card):
    """Get numeric value for a card"""
    rank = card['rank']
    if rank == 'A':
        return 14
    elif rank == 'K':
        return 13
    elif rank == 'Q':
        return 12
    elif rank == 'J':
        return 11
    else:
        return int(rank)

def evaluate_hand(cards):
    """Evaluate poker hand (simplified - just returns high card for now)"""
    values = sorted([get_card_value(c) for c in cards], reverse=True)
    suits = [c['suit'] for c in cards]
    ranks = [c['rank'] for c in cards]
    
    # Check for flush (all same suit)
    is_flush = len(set(suits)) == 1
    
    # Check for straight
    is_straight = False
    value_counts = {v: values.count(v) for v in values}
    
    # Check for pairs, three of a kind, four of a kind
    pairs = [v for v, count in value_counts.items() if count == 2]
    three_kind = [v for v, count in value_counts.items() if count == 3]
    four_kind = [v for v, count in value_counts.items() if count == 4]
    
    hand_strength = "high_card"
    score = 0
    
    if four_kind:
        hand_strength = "four_of_a_kind"
        score = 1000000 + four_kind[0] * 100
    elif three_kind and pairs:
        hand_strength = "full_house"
        score = 900000 + three_kind[0] * 100 + pairs[0]
    elif is_flush:
        hand_strength = "flush"
        score = 800000 + max(values)
    elif len(pairs) == 2:
        hand_strength = "two_pair"
        score = 700000 + max(pairs) * 100 + min(pairs)
    elif len(three_kind) == 1:
        hand_strength = "three_of_a_kind"
        score = 600000 + three_kind[0] * 100
    elif len(pairs) == 1:
        hand_strength = "pair"
        score = 500000 + pairs[0] * 100
    else:
        score = 100000 + max(values)
    
    return {'hand_strength': hand_strength, 'score': score}

# Game state management
players = {}  # {socket_id: {'name': str, 'game_id': str}}
waiting_players = []  # List of waiting socket_ids
games = {}  # {game_id: {'players': [socket_id1, socket_id2], 'cards': {}, 'bets': {}, 'turn': socket_id, 'status': 'waiting'|'playing'|'finished', 'pot': 0}}

@app.template_global()
def get_version():
    """Get the current version for cache busting"""
    return VERSION

@app.route('/')
def index():
    return render_template('index.html', version=VERSION)

@app.route('/app.js')
def app_js():
    response = send_from_directory(FRONTEND_DIR, 'app.js')
    response.headers['Cache-Control'] = 'public, max-age=31536000'
    return response

@app.route('/styles.css')
def styles_css():
    response = send_from_directory(FRONTEND_DIR, 'styles.css')
    response.headers['Cache-Control'] = 'public, max-age=31536000'
    return response

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve any other static file with cache control"""
    # Prevent serving templates or Python files
    if filename.startswith('backend') or filename.startswith('templates'):
        return None, 404
    
    # Try to serve from frontend directory
    if os.path.exists(os.path.join(FRONTEND_DIR, filename)):
        response = send_from_directory(FRONTEND_DIR, filename)
        response.headers['Cache-Control'] = 'public, max-age=31536000'
        return response
    
    return None, 404

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    handle_player_disconnect()

def handle_player_disconnect():
    socket_id = request.sid
    
    if socket_id in players:
        player = players[socket_id]
        
        # Remove from waiting list if there
        if socket_id in waiting_players:
            waiting_players.remove(socket_id)
        
        # Handle game if player is in one
        if 'game_id' in player and player['game_id'] in games:
            game_id = player['game_id']
            game = games[game_id]
            
            # Remove player from game
            if socket_id in game['players']:
                game['players'].remove(socket_id)
            
            # Notify opponent
            for p_id in game['players']:
                if p_id != socket_id and p_id in players:
                    socketio.emit('opponent_disconnected', {'message': 'Opponent disconnected'}, room=p_id)
            
            # Clean up empty games
            if len(game['players']) < 2:
                del games[game_id]
        
        # Remove player
        del players[socket_id]

@socketio.on('check_name')
def handle_check_name(data):
    socket_id = request.sid
    name = data.get('name', '').strip()
    
    if not name:
        emit('name_taken', {'error': 'Name cannot be empty'})
        return
    
    # Check if name is already taken by another player
    for pid, player in players.items():
        if pid != socket_id and player.get('name', '').lower() == name.lower():
            emit('name_taken', {'error': 'Name is already taken'})
            return
    
    # Name is available
    players[socket_id] = {'name': name, 'game_id': None}
    emit('name_valid', {'name': name})
    
    # Try to start or join matchmaking
    handle_matchmaking()

def handle_matchmaking():
    socket_id = request.sid
    
    if socket_id not in players or players[socket_id]['game_id']:
        return
    
    # Add to waiting list
    if socket_id not in waiting_players:
        waiting_players.append(socket_id)
        socketio.emit('waiting', {'message': 'Looking for an opponent...'}, room=socket_id)
    
    # Try to pair players
    if len(waiting_players) >= 2:
        player1_id = waiting_players.pop(0)
        player2_id = waiting_players.pop(0)
        
        # Create game with poker state
        game_id = f"game_{random.randint(1000, 9999)}"
        deck = shuffle_deck(create_deck())
        
        # Deal 2 cards to each player
        player1_cards = deck[:2]
        player2_cards = deck[2:4]
        community_cards = deck[4:9]  # 5 community cards
        
        games[game_id] = {
            'players': [player1_id, player2_id],
            'cards': {player1_id: player1_cards, player2_id: player2_cards},
            'community_cards': community_cards,
            'bets': {player1_id: 0, player2_id: 0},
            'turn': random.choice([player1_id, player2_id]),  # Random first turn
            'status': 'playing',
            'pot': 0,
            'max_bet': 0,
            'deck': deck,
            'both_acted': False
        }
        
        # Update player game_id
        players[player1_id]['game_id'] = game_id
        players[player2_id]['game_id'] = game_id
        
        # Notify both players of game start
        socketio.emit('game_start', {
            'game_id': game_id,
            'players': [players[player1_id]['name'], players[player2_id]['name']],
            'my_cards': player1_cards,
            'turn': players[games[game_id]['turn']]['name'],
            'pot': 0
        }, room=player1_id)
        
        socketio.emit('game_start', {
            'game_id': game_id,
            'players': [players[player1_id]['name'], players[player2_id]['name']],
            'my_cards': player2_cards,
            'turn': players[games[game_id]['turn']]['name'],
            'pot': 0
        }, room=player2_id)

@socketio.on('bet')
def handle_bet(data):
    socket_id = request.sid
    
    if socket_id not in players or not players[socket_id].get('game_id'):
        emit('error', {'error': 'Not in a game'})
        return
    
    game_id = players[socket_id]['game_id']
    
    if game_id not in games:
        emit('error', {'error': 'Game not found'})
        return
    
    game = games[game_id]
    
    if game['status'] != 'playing':
        emit('error', {'error': 'Game is not active'})
        return
    
    if socket_id != game['turn']:
        emit('error', {'error': 'Not your turn'})
        return
    
    action = data.get('action')
    bet_amount = data.get('amount', 0)
    
    if action == 'fold':
        # Player folds, opponent wins
        opponent_id = game['players'][1] if game['turn'] == game['players'][0] else game['players'][0]
        game['status'] = 'finished'
        
        for player_id in game['players']:
            is_winner = (player_id == opponent_id)
            socketio.emit('game_over', {
                'winner': players[opponent_id]['name'],
                'winner_socket': opponent_id,
                'reason': 'fold',
                'community_cards': game['community_cards'],
                'pot': game['pot'],
                'is_winner': is_winner
            }, room=player_id)
        return
    
    elif action == 'call':
        # Player calls (matches current bet)
        current_bet = game['max_bet'] - game['bets'][socket_id]
        if current_bet > 0:
            game['bets'][socket_id] += current_bet
            game['pot'] += current_bet
    elif action == 'raise':
        # Player raises
        current_total = game['bets'][socket_id]
        additional = bet_amount - current_total
        if additional <= 0:
            emit('error', {'error': 'Invalid bet amount'})
            return
        game['bets'][socket_id] = bet_amount
        game['max_bet'] = max(game['max_bet'], bet_amount)
        game['pot'] += additional
    elif action == 'check':
        # Player checks (can only check if no bet)
        if game['max_bet'] > game['bets'][socket_id]:
            emit('error', {'error': 'Cannot check - need to call'})
            return
    
    # Check if both players have matched bets
    bets_equal = (game['bets'][game['players'][0]] == game['bets'][game['players'][1]])
    
    # Simple rule: betting round ends when bets are equal and it's NOT a raise
    # AND both players have had a chance to act at least once
    round_over = False
    
    if action == 'raise':
        # Round continues after a raise (opponent must respond)
        round_over = False
        game['waiting_for_raise_response'] = True  # Opponent needs to respond to the raise
    elif bets_equal:
        # Bets are equal - check if round should end
        if game.get('waiting_for_raise_response', False):
            # Someone just responded to a raise - round is over
            round_over = True
            game['waiting_for_raise_response'] = False
        elif not game.get('both_acted', False):
            # First time bets became equal - need both to confirm
            game['both_acted'] = True
            round_over = False
        else:
            # Both have acted and now matching again - round over!
            round_over = True
    else:
        # Bets not equal yet - round continues
        round_over = False
    
    if not round_over:
        # Switch turn if not everyone has acted yet
        game['turn'] = game['players'][1] if game['turn'] == game['players'][0] else game['players'][0]
    
    # Notify both players
    for player_id in game['players']:
        socketio.emit('bet_made', {
            'action': action,
            'player': players[socket_id]['name'],
            'pot': game['pot'],
            'bets': {players[pid]['name']: game['bets'][pid] for pid in game['players']},
            'next_turn': players[game['turn']]['name'] if game['turn'] and not round_over else None,
            'round_over': round_over
        }, room=player_id)
    
    # If round is over, show community cards and determine winner
    if round_over:
        determine_poker_winner(game_id)

def determine_poker_winner(game_id):
    """Determine the winner of a poker hand"""
    game = games[game_id]
    
    if game['status'] != 'playing':
        return
    
    # Get all cards for each player (their 2 cards + 5 community cards)
    player1_id = game['players'][0]
    player2_id = game['players'][1]
    
    player1_hand = game['cards'][player1_id] + game['community_cards']
    player2_hand = game['cards'][player2_id] + game['community_cards']
    
    # Evaluate hands
    player1_eval = evaluate_hand(player1_hand)
    player2_eval = evaluate_hand(player2_hand)
    
    # Determine winner
    if player1_eval['score'] > player2_eval['score']:
        winner_id = player1_id
        winner_eval = player1_eval
        loser_eval = player2_eval
    elif player2_eval['score'] > player1_eval['score']:
        winner_id = player2_id
        winner_eval = player2_eval
        loser_eval = player1_eval
    else:
        # Tie - split pot
        winner_id = None
        winner_eval = player1_eval
        loser_eval = player2_eval
    
    game['status'] = 'finished'
    
    # Notify both players
    for player_id in game['players']:
        is_winner = (player_id == winner_id) if winner_id else False
        
        # Get the appropriate hand eval
        if player_id == player1_id:
            my_eval = player1_eval
        else:
            my_eval = player2_eval
        
        socketio.emit('game_over', {
            'winner': players[winner_id]['name'] if winner_id else None,
            'winner_socket': winner_id,
            'reason': 'showdown',
            'community_cards': game['community_cards'],
            'my_cards': game['cards'][player_id],
            'opponent_cards': game['cards'][player2_id] if player_id == player1_id else game['cards'][player1_id],
            'my_hand': my_eval,
            'pot': game['pot'],
            'is_winner': is_winner
        }, room=player_id)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)


