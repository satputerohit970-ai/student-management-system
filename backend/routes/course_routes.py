from flask import Blueprint, request, jsonify
from database import query_db
from routes.auth_routes import login_required

course_bp = Blueprint('courses', __name__, url_prefix='/api/courses')

@course_bp.route('', methods=['GET'])
@login_required
def get_courses():
    try:
        courses = query_db("""
            SELECT c.id, c.course_code, c.course_name, c.duration, c.description, c.created_at,
                   COUNT(s.id) AS enrolled_students
            FROM courses c
            LEFT JOIN students s ON c.id = s.course_id
            GROUP BY c.id, c.course_code, c.course_name, c.duration, c.description, c.created_at
            ORDER BY c.id ASC
        """)
        return jsonify({'success': True, 'courses': courses}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to retrieve courses: {str(e)}"}), 500

@course_bp.route('/<int:course_id>', methods=['GET'])
@login_required
def get_course(course_id):
    try:
        course = query_db("SELECT * FROM courses WHERE id = %s", (course_id,), one=True)
        if not course:
            return jsonify({'success': False, 'message': 'Course not found.'}), 404
        return jsonify({'success': True, 'course': course}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Error fetching course: {str(e)}"}), 500

@course_bp.route('', methods=['POST'])
@login_required
def add_course():
    try:
        data = request.get_json(silent=True) or {}
        code = (data.get('course_code') or '').strip().upper()
        name = (data.get('course_name') or '').strip()
        duration = (data.get('duration') or '').strip()
        description = (data.get('description') or '').strip()

        if not code or not name or not duration:
            return jsonify({'success': False, 'message': 'Course Code, Course Name, and Duration are required.'}), 400

        dup = query_db("SELECT id FROM courses WHERE course_code = %s", (code,), one=True)
        if dup:
            return jsonify({'success': False, 'message': f"Course Code '{code}' already exists."}), 409

        res = query_db("""
            INSERT INTO courses (course_code, course_name, duration, description)
            VALUES (%s, %s, %s, %s)
        """, (code, name, duration, description), commit=True)

        return jsonify({'success': True, 'message': 'Course created successfully.', 'course_id': res['last_id']}), 201

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to add course: {str(e)}"}), 500

@course_bp.route('/<int:course_id>', methods=['PUT'])
@login_required
def update_course(course_id):
    try:
        existing = query_db("SELECT id FROM courses WHERE id = %s", (course_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Course not found.'}), 404

        data = request.get_json(silent=True) or {}
        code = (data.get('course_code') or '').strip().upper()
        name = (data.get('course_name') or '').strip()
        duration = (data.get('duration') or '').strip()
        description = (data.get('description') or '').strip()

        if not code or not name or not duration:
            return jsonify({'success': False, 'message': 'Course Code, Name, and Duration cannot be empty.'}), 400

        dup = query_db("SELECT id FROM courses WHERE course_code = %s AND id != %s", (code, course_id), one=True)
        if dup:
            return jsonify({'success': False, 'message': f"Course Code '{code}' is already assigned to another course."}), 409

        query_db("""
            UPDATE courses
            SET course_code = %s, course_name = %s, duration = %s, description = %s
            WHERE id = %s
        """, (code, name, duration, description, course_id), commit=True)

        return jsonify({'success': True, 'message': 'Course updated successfully.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to update course: {str(e)}"}), 500

@course_bp.route('/<int:course_id>', methods=['DELETE'])
@login_required
def delete_course(course_id):
    try:
        existing = query_db("SELECT id, course_name FROM courses WHERE id = %s", (course_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Course not found.'}), 404

        query_db("DELETE FROM courses WHERE id = %s", (course_id,), commit=True)
        return jsonify({'success': True, 'message': f"Course '{existing['course_name']}' deleted successfully."}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to delete course: {str(e)}"}), 500
