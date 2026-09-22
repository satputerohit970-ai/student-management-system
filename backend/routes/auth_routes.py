from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from functools import wraps
from database import query_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

def login_required(f):
    """Decorator to require admin session for protected endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'success': False, 'message': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

    admin = query_db(
        "SELECT id, username, password_hash, full_name, email FROM admins WHERE username = %s OR email = %s",
        (username, username),
        one=True
    )

    if not admin or not check_password_hash(admin['password_hash'], password):
        return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401

    session.permanent = True
    session['admin_id'] = admin['id']
    session['username'] = admin['username']
    session['full_name'] = admin['full_name']
    session['email'] = admin['email']

    return jsonify({
        'success': True,
        'message': 'Login successful.',
        'user': {
            'id': admin['id'],
            'username': admin['username'],
            'full_name': admin['full_name'],
            'email': admin['email']
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'}), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    if 'admin_id' not in session:
        return jsonify({'authenticated': False, 'user': None}), 200

    return jsonify({
        'authenticated': True,
        'user': {
            'id': session.get('admin_id'),
            'username': session.get('username'),
            'full_name': session.get('full_name'),
            'email': session.get('email')
        }
    }), 200
