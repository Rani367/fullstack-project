from flask import Flask, send_from_directory, render_template
import os
import time

# Get the absolute path to frontend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='', template_folder=TEMPLATE_DIR)

# Generate a version for cache busting
# Try to use Railway's deployment ID or build time, otherwise use current timestamp
VERSION = os.environ.get('RAILWAY_DEPLOYMENT_ID', str(int(time.time())))

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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

