from flask import Blueprint, request, jsonify
from database import query_db
from models import validate_email, validate_mobile
from routes.auth_routes import login_required

student_bp = Blueprint('students', __name__, url_prefix='/api/students')

@student_bp.route('', methods=['GET'])
@login_required
def get_students():
    try:
        search = (request.args.get('search') or '').strip()
        course_id = request.args.get('course_id')
        year = (request.args.get('year') or '').strip()
        gender = (request.args.get('gender') or '').strip()

        sql = """
            SELECT s.id, s.student_id, s.full_name, s.email, s.mobile_number,
                   s.date_of_birth, s.gender, s.address, s.course_id, s.year,
                   s.admission_date, s.has_face_registered, s.created_at,
                   c.course_name, c.course_code
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE 1=1
        """
        params = []

        if search:
            sql += """ AND (
                s.full_name LIKE %s OR 
                s.student_id LIKE %s OR 
                s.email LIKE %s OR 
                c.course_name LIKE %s OR 
                c.course_code LIKE %s
            )"""
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param, search_param, search_param])

        if course_id:
            sql += " AND s.course_id = %s"
            params.append(course_id)

        if year:
            sql += " AND s.year = %s"
            params.append(year)

        if gender:
            sql += " AND s.gender = %s"
            params.append(gender)

        sql += " ORDER BY s.id DESC"

        students = query_db(sql, tuple(params))
        return jsonify({'success': True, 'count': len(students), 'students': students}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to fetch students: {str(e)}"}), 500

@student_bp.route('/<int:student_id>', methods=['GET'])
@login_required
def get_student(student_id):
    try:
        student = query_db("""
            SELECT s.id, s.student_id, s.full_name, s.email, s.mobile_number,
                   s.date_of_birth, s.gender, s.address, s.course_id, s.year,
                   s.admission_date, s.has_face_registered, s.created_at,
                   c.course_name, c.course_code
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE s.id = %s
        """, (student_id,), one=True)

        if not student:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        return jsonify({'success': True, 'student': student}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Error retrieving student: {str(e)}"}), 500

@student_bp.route('', methods=['POST'])
@login_required
def add_student():
    try:
        data = request.get_json(silent=True) or {}
        
        student_id = (data.get('student_id') or '').strip().upper()
        full_name = (data.get('full_name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        mobile_number = (data.get('mobile_number') or '').strip()
        date_of_birth = (data.get('date_of_birth') or '').strip()
        gender = (data.get('gender') or '').strip()
        address = (data.get('address') or '').strip()
        course_id = data.get('course_id') or None
        year = (data.get('year') or '').strip()
        admission_date = (data.get('admission_date') or '').strip()

        # Validation checks
        if not student_id:
            return jsonify({'success': False, 'message': 'Student ID is required.'}), 400
        if not full_name:
            return jsonify({'success': False, 'message': 'Full Name is required.'}), 400
        if not email or not validate_email(email):
            return jsonify({'success': False, 'message': 'A valid Email address is required.'}), 400
        if not mobile_number or not validate_mobile(mobile_number):
            return jsonify({'success': False, 'message': 'A valid Mobile Number (7-15 digits) is required.'}), 400
        if not date_of_birth:
            return jsonify({'success': False, 'message': 'Date of Birth is required.'}), 400
        if not gender or gender not in ['Male', 'Female', 'Other']:
            return jsonify({'success': False, 'message': 'Valid Gender (Male, Female, Other) is required.'}), 400
        if not year:
            return jsonify({'success': False, 'message': 'Year of study is required.'}), 400
        if not admission_date:
            return jsonify({'success': False, 'message': 'Admission Date is required.'}), 400

        # Check duplicate Student ID
        existing_sid = query_db("SELECT id FROM students WHERE student_id = %s", (student_id,), one=True)
        if existing_sid:
            return jsonify({'success': False, 'message': f"Student ID '{student_id}' is already registered."}), 409

        # Check duplicate Email
        existing_email = query_db("SELECT id FROM students WHERE email = %s", (email,), one=True)
        if existing_email:
            return jsonify({'success': False, 'message': f"Email '{email}' is already in use by another student."}), 409

        res = query_db("""
            INSERT INTO students (student_id, full_name, email, mobile_number, date_of_birth, gender, address, course_id, year, admission_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (student_id, full_name, email, mobile_number, date_of_birth, gender, address, course_id, year, admission_date), commit=True)

        return jsonify({
            'success': True,
            'message': 'Student registered successfully.',
            'student_id': res['last_id']
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to add student: {str(e)}"}), 500

@student_bp.route('/<int:student_id>', methods=['PUT'])
@login_required
def update_student(student_id):
    try:
        existing = query_db("SELECT id FROM students WHERE id = %s", (student_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404

        data = request.get_json(silent=True) or {}
        sid = (data.get('student_id') or '').strip().upper()
        full_name = (data.get('full_name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        mobile_number = (data.get('mobile_number') or '').strip()
        date_of_birth = (data.get('date_of_birth') or '').strip()
        gender = (data.get('gender') or '').strip()
        address = (data.get('address') or '').strip()
        course_id = data.get('course_id') or None
        year = (data.get('year') or '').strip()
        admission_date = (data.get('admission_date') or '').strip()

        if not sid:
            return jsonify({'success': False, 'message': 'Student ID cannot be empty.'}), 400
        if not full_name:
            return jsonify({'success': False, 'message': 'Full Name cannot be empty.'}), 400
        if not email or not validate_email(email):
            return jsonify({'success': False, 'message': 'Valid Email is required.'}), 400
        if not mobile_number or not validate_mobile(mobile_number):
            return jsonify({'success': False, 'message': 'Valid Mobile Number is required.'}), 400
        if not date_of_birth:
            return jsonify({'success': False, 'message': 'Date of Birth is required.'}), 400
        if not gender or gender not in ['Male', 'Female', 'Other']:
            return jsonify({'success': False, 'message': 'Valid Gender is required.'}), 400
        if not year:
            return jsonify({'success': False, 'message': 'Year is required.'}), 400
        if not admission_date:
            return jsonify({'success': False, 'message': 'Admission Date is required.'}), 400

        # Duplicate checks excluding self
        dup_sid = query_db("SELECT id FROM students WHERE student_id = %s AND id != %s", (sid, student_id), one=True)
        if dup_sid:
            return jsonify({'success': False, 'message': f"Student ID '{sid}' is already used by another record."}), 409

        dup_email = query_db("SELECT id FROM students WHERE email = %s AND id != %s", (email, student_id), one=True)
        if dup_email:
            return jsonify({'success': False, 'message': f"Email '{email}' is already used by another student."}), 409

        query_db("""
            UPDATE students
            SET student_id = %s, full_name = %s, email = %s, mobile_number = %s,
                date_of_birth = %s, gender = %s, address = %s, course_id = %s,
                year = %s, admission_date = %s
            WHERE id = %s
        """, (sid, full_name, email, mobile_number, date_of_birth, gender, address, course_id, year, admission_date, student_id), commit=True)

        return jsonify({'success': True, 'message': 'Student details updated successfully.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to update student: {str(e)}"}), 500

@student_bp.route('/<int:student_id>', methods=['DELETE'])
@login_required
def delete_student(student_id):
    try:
        existing = query_db("SELECT id, full_name FROM students WHERE id = %s", (student_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        query_db("DELETE FROM students WHERE id = %s", (student_id,), commit=True)
        return jsonify({'success': True, 'message': f"Student '{existing['full_name']}' deleted successfully."}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to delete student: {str(e)}"}), 500

@student_bp.route('/<int:student_id>/register-face', methods=['POST'])
@login_required
def register_student_face(student_id):
    """Save student face biometric snapshot."""
    try:
        data = request.get_json(silent=True) or {}
        face_image = data.get('face_image') or ''

        if not face_image:
            return jsonify({'success': False, 'message': 'No face image data captured.'}), 400

        student = query_db("SELECT id, full_name, student_id FROM students WHERE id = %s", (student_id,), one=True)
        if not student:
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404

        query_db("""
            UPDATE students
            SET face_data = %s, has_face_registered = 1
            WHERE id = %s
        """, (face_image, student_id), commit=True)

        return jsonify({
            'success': True,
            'message': f"Face profile successfully registered for {student['full_name']} ({student['student_id']})!",
            'student_id': student_id
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to register face: {str(e)}"}), 500

@student_bp.route('/<int:student_id>/face', methods=['GET'])
@login_required
def get_student_face(student_id):
    """Retrieve student face profile if registered."""
    try:
        student = query_db("""
            SELECT id, student_id, full_name, face_data, has_face_registered 
            FROM students 
            WHERE id = %s
        """, (student_id,), one=True)

        if not student:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        return jsonify({
            'success': True,
            'student_id': student['id'],
            'student_code': student['student_id'],
            'full_name': student['full_name'],
            'has_face_registered': bool(student['has_face_registered']),
            'face_data': student['face_data']
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to load face data: {str(e)}"}), 500
