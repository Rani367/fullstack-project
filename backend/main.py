from flask import Flask, send_from_directory
import os

# Get the absolute path to frontend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/app.js')
def app_js():
    return send_from_directory(FRONTEND_DIR, 'app.js')

@app.route('/styles.css')
def styles_css():
    return send_from_directory(FRONTEND_DIR, 'styles.css')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

