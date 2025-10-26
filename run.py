#!/usr/bin/env python
"""
Simple runner script for local development.
Run this from the project root directory.
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Change to backend directory and import main
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from main import app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'Starting server on http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=True)

