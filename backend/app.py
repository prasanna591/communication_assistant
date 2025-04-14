import os
from flask import Flask
from flask_cors import CORS
from analysis_bp.routes import analysis_bp
from auth_bp.routes import auth_bp
from models import db

app = Flask(__name__)
CORS(app) 

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SECRET_KEY'] = '9ksjjfjheufyydonf8redsso8erlfwoi' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db' 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False 

db.init_app(app)

app.register_blueprint(analysis_bp)
app.register_blueprint(auth_bp, url_prefix='/api/auth') 

if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    app.run(host='0.0.0.0', port=5000, debug=True)