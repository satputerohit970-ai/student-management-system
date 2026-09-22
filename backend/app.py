import os
from flask import Flask, send_from_directory, jsonify, redirect
from flask_cors import CORS
from config import Config
from database import init_db
from routes import register_routes

# Define paths for frontend assets
base_dir = os.path.abspath(os.path.dirname(__file__))
frontend_dir = os.path.abspath(os.path.join(base_dir, '..', 'frontend'))

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
app.config.from_object(Config)

# Enable CORS
CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:5000",
        "http://localhost:5000"
    ]
)

# Register modular REST API routes
register_routes(app)


# Serve Frontend static pages directly
@app.route('/')
def root():
    return redirect('/index.html')


@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(frontend_dir, path)):
        return send_from_directory(frontend_dir, path)

    return jsonify({
        'success': False,
        'message': 'Resource not found'
    }), 404


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found.'
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        'success': False,
        'message': 'Internal server error occurred.'
    }), 500


@app.after_request
def add_cache_control(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


# Run application
if __name__ == '__main__':
    init_db()

    # Render provides PORT automatically
    port = int(os.getenv('PORT', 5000))

    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )