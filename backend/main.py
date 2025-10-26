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

# Game state management
players = {}  # {socket_id: {'name': str, 'game_id': str}}
waiting_players = []  # List of waiting socket_ids
games = {}  # {game_id: {'players': [socket_id1, socket_id2], 'board': [], 'turn': socket_id, 'status': 'waiting'|'playing'|'finished'}}

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
        
        # Create game
        game_id = f"game_{random.randint(1000, 9999)}"
        games[game_id] = {
            'players': [player1_id, player2_id],
            'board': [''] * 9,
            'turn': player1_id,  # Randomly choose first player
            'status': 'playing'
        }
        
        # Update player game_id
        players[player1_id]['game_id'] = game_id
        players[player2_id]['game_id'] = game_id
        
        # Notify both players
        socketio.emit('game_start', {
            'game_id': game_id,
            'players': [players[player1_id]['name'], players[player2_id]['name']],
            'your_symbol': 'X',
            'turn': players[games[game_id]['turn']]['name']
        }, room=player1_id)
        
        socketio.emit('game_start', {
            'game_id': game_id,
            'players': [players[player1_id]['name'], players[player2_id]['name']],
            'your_symbol': 'O',
            'turn': players[games[game_id]['turn']]['name']
        }, room=player2_id)

@socketio.on('make_move')
def handle_make_move(data):
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
    
    index = data.get('index')
    
    if index is None or index < 0 or index > 8:
        emit('error', {'error': 'Invalid move'})
        return
    
    if game['board'][index]:
        emit('error', {'error': 'Spot already taken'})
        return
    
    # Make the move
    symbol = 'X' if socket_id == game['players'][0] else 'O'
    game['board'][index] = symbol
    
    # Check for win
    winner = check_winner(game['board'])
    
    if winner:
        game['status'] = 'finished'
        winner_socket = game['players'][0] if winner == 'X' else game['players'][1]
        
        # Notify both players
        for player_id in game['players']:
            socketio.emit('game_over', {
                'winner': players[winner_socket]['name'],
                'board': game['board'],
                'reason': 'win'
            }, room=player_id)
    elif all(cell for cell in game['board']):  # Check for tie
        game['status'] = 'finished'
        # Notify both players
        for player_id in game['players']:
            socketio.emit('game_over', {
                'winner': None,
                'board': game['board'],
                'reason': 'tie'
            }, room=player_id)
    else:
        # Switch turn
        game['turn'] = game['players'][1] if game['turn'] == game['players'][0] else game['players'][0]
        
        # Notify both players of the move
        for player_id in game['players']:
            socketio.emit('move_made', {
                'index': index,
                'symbol': symbol,
                'board': game['board'],
                'next_turn': players[game['turn']]['name']
            }, room=player_id)

def check_winner(board):
    """Check if there's a winner"""
    winning_combinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # columns
        [0, 4, 8], [2, 4, 6]              # diagonals
    ]
    
    for combo in winning_combinations:
        if board[combo[0]] and board[combo[0]] == board[combo[1]] == board[combo[2]]:
            return board[combo[0]]
    return None

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)


