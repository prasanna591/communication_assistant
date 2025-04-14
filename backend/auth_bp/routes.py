import os
from flask import Blueprint, request, jsonify, session
from flask_cors import CORS
from models import db, User  # Import db and the User model

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
CORS(auth_bp) # Enable CORS for this blueprint

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'message': 'Username already exists'}), 409

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'Signup successful'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        session['username'] = username  # Store username in session
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/protected', methods=['GET'])
def protected():
    if 'username' in session:
        return jsonify({'message': f'Hello, {session["username"]}! This is a protected route.'}), 200
    else:
        return jsonify({'message': 'Unauthorized'}), 401