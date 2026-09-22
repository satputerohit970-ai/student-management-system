from flask import Blueprint, request, jsonify
from database import query_db
from models import validate_email, validate_mobile
from routes.auth_routes import login_required

teacher_bp = Blueprint('teachers', __name__, url_prefix='/api/teachers')

@teacher_bp.route('', methods=['GET'])
@login_required
def get_teachers():
    try:
        teachers = query_db("SELECT * FROM teachers ORDER BY id ASC")
        return jsonify({'success': True, 'teachers': teachers}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to retrieve teachers: {str(e)}"}), 500

@teacher_bp.route('/<int:teacher_id>', methods=['GET'])
@login_required
def get_teacher(teacher_id):
    try:
        teacher = query_db("SELECT * FROM teachers WHERE id = %s", (teacher_id,), one=True)
        if not teacher:
            return jsonify({'success': False, 'message': 'Teacher not found.'}), 404
        return jsonify({'success': True, 'teacher': teacher}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Error fetching teacher: {str(e)}"}), 500

@teacher_bp.route('', methods=['POST'])
@login_required
def add_teacher():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get('teacher_name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        mobile = (data.get('mobile_number') or '').strip()
        subject = (data.get('subject') or '').strip()

        if not name:
            return jsonify({'success': False, 'message': 'Teacher Name is required.'}), 400
        if not email or not validate_email(email):
            return jsonify({'success': False, 'message': 'Valid Email is required.'}), 400
        if not mobile or not validate_mobile(mobile):
            return jsonify({'success': False, 'message': 'Valid Mobile Number is required.'}), 400
        if not subject:
            return jsonify({'success': False, 'message': 'Subject is required.'}), 400

        dup = query_db("SELECT id FROM teachers WHERE email = %s", (email,), one=True)
        if dup:
            return jsonify({'success': False, 'message': f"Teacher with email '{email}' already exists."}), 409

        res = query_db("""
            INSERT INTO teachers (teacher_name, email, mobile_number, subject)
            VALUES (%s, %s, %s, %s)
        """, (name, email, mobile, subject), commit=True)

        return jsonify({'success': True, 'message': 'Teacher added successfully.', 'teacher_id': res['last_id']}), 201

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to add teacher: {str(e)}"}), 500

@teacher_bp.route('/<int:teacher_id>', methods=['PUT'])
@login_required
def update_teacher(teacher_id):
    try:
        existing = query_db("SELECT id FROM teachers WHERE id = %s", (teacher_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Teacher not found.'}), 404

        data = request.get_json(silent=True) or {}
        name = (data.get('teacher_name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        mobile = (data.get('mobile_number') or '').strip()
        subject = (data.get('subject') or '').strip()

        if not name:
            return jsonify({'success': False, 'message': 'Teacher Name cannot be empty.'}), 400
        if not email or not validate_email(email):
            return jsonify({'success': False, 'message': 'Valid Email is required.'}), 400
        if not mobile or not validate_mobile(mobile):
            return jsonify({'success': False, 'message': 'Valid Mobile Number is required.'}), 400
        if not subject:
            return jsonify({'success': False, 'message': 'Subject cannot be empty.'}), 400

        dup = query_db("SELECT id FROM teachers WHERE email = %s AND id != %s", (email, teacher_id), one=True)
        if dup:
            return jsonify({'success': False, 'message': f"Email '{email}' is used by another teacher."}), 409

        query_db("""
            UPDATE teachers
            SET teacher_name = %s, email = %s, mobile_number = %s, subject = %s
            WHERE id = %s
        """, (name, email, mobile, subject, teacher_id), commit=True)

        return jsonify({'success': True, 'message': 'Teacher updated successfully.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to update teacher: {str(e)}"}), 500

@teacher_bp.route('/<int:teacher_id>', methods=['DELETE'])
@login_required
def delete_teacher(teacher_id):
    try:
        existing = query_db("SELECT id, teacher_name FROM teachers WHERE id = %s", (teacher_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Teacher not found.'}), 404

        query_db("DELETE FROM teachers WHERE id = %s", (teacher_id,), commit=True)
        return jsonify({'success': True, 'message': f"Teacher '{existing['teacher_name']}' deleted successfully."}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to delete teacher: {str(e)}"}), 500
