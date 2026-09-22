from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.student_routes import student_bp
from routes.course_routes import course_bp
from routes.teacher_routes import teacher_bp
from routes.attendance_routes import attendance_bp
from routes.marks_routes import marks_bp
from routes.analytics_routes import analytics_bp

def register_routes(app):
    """Register all modular REST API blueprints with the Flask app."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(marks_bp)
    app.register_blueprint(analytics_bp)
