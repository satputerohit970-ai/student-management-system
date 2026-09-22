from flask import Blueprint, request, jsonify
from database import query_db
from models import calculate_grade
from routes.auth_routes import login_required

marks_bp = Blueprint('marks', __name__, url_prefix='/api/marks')

@marks_bp.route('', methods=['GET'])
@login_required
def get_marks():
    try:
        student_id = request.args.get('student_id')
        exam_name = request.args.get('exam_name')
        subject = request.args.get('subject')

        sql = """
            SELECT m.id, m.student_id, m.subject, m.exam_name,
                   m.marks_obtained, m.total_marks, m.percentage, m.grade, m.created_at,
                   s.student_id AS student_code, s.full_name, s.year,
                   c.course_name
            FROM marks m
            JOIN students s ON m.student_id = s.id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE 1=1
        """
        params = []

        if student_id:
            sql += " AND m.student_id = %s"
            params.append(student_id)

        if exam_name:
            sql += " AND m.exam_name LIKE %s"
            params.append(f"%{exam_name}%")

        if subject:
            sql += " AND m.subject LIKE %s"
            params.append(f"%{subject}%")

        sql += " ORDER BY m.id DESC"

        marks = query_db(sql, tuple(params))
        return jsonify({'success': True, 'count': len(marks), 'marks': marks}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to retrieve marks: {str(e)}"}), 500

@marks_bp.route('/<int:mark_id>', methods=['GET'])
@login_required
def get_mark(mark_id):
    try:
        mark = query_db("""
            SELECT m.id, m.student_id, m.subject, m.exam_name,
                   m.marks_obtained, m.total_marks, m.percentage, m.grade, m.created_at,
                   s.student_id AS student_code, s.full_name
            FROM marks m
            JOIN students s ON m.student_id = s.id
            WHERE m.id = %s
        """, (mark_id,), one=True)

        if not mark:
            return jsonify({'success': False, 'message': 'Marks record not found.'}), 404

        return jsonify({'success': True, 'mark': mark}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Error retrieving mark: {str(e)}"}), 500

@marks_bp.route('', methods=['POST'])
@login_required
def add_marks():
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get('student_id')
        subject = (data.get('subject') or '').strip()
        exam_name = (data.get('exam_name') or '').strip()
        
        try:
            marks_obtained = float(data.get('marks_obtained', -1))
            total_marks = float(data.get('total_marks', 100))
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Marks must be valid numbers.'}), 400

        if not student_id or not subject or not exam_name:
            return jsonify({'success': False, 'message': 'Student, Subject, and Exam Name are required.'}), 400

        if total_marks <= 0:
            return jsonify({'success': False, 'message': 'Total Marks must be greater than 0.'}), 400

        if marks_obtained < 0 or marks_obtained > total_marks:
            return jsonify({'success': False, 'message': f"Marks Obtained must be between 0 and {total_marks}."}), 400

        percentage = round((marks_obtained / total_marks) * 100, 2)
        grade = calculate_grade(percentage)

        res = query_db("""
            INSERT INTO marks (student_id, subject, exam_name, marks_obtained, total_marks, percentage, grade)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (student_id, subject, exam_name, marks_obtained, total_marks, percentage, grade), commit=True)

        return jsonify({
            'success': True,
            'message': 'Marks entered successfully.',
            'mark_id': res['last_id'],
            'percentage': percentage,
            'grade': grade
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to record marks: {str(e)}"}), 500

@marks_bp.route('/<int:mark_id>', methods=['PUT'])
@login_required
def update_marks(mark_id):
    try:
        existing = query_db("SELECT id FROM marks WHERE id = %s", (mark_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Marks record not found.'}), 404

        data = request.get_json(silent=True) or {}
        student_id = data.get('student_id')
        subject = (data.get('subject') or '').strip()
        exam_name = (data.get('exam_name') or '').strip()

        try:
            marks_obtained = float(data.get('marks_obtained', -1))
            total_marks = float(data.get('total_marks', 100))
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Marks must be valid numbers.'}), 400

        if not student_id or not subject or not exam_name:
            return jsonify({'success': False, 'message': 'Student, Subject, and Exam Name cannot be empty.'}), 400

        if total_marks <= 0:
            return jsonify({'success': False, 'message': 'Total Marks must be greater than 0.'}), 400

        if marks_obtained < 0 or marks_obtained > total_marks:
            return jsonify({'success': False, 'message': f"Marks Obtained must be between 0 and {total_marks}."}), 400

        percentage = round((marks_obtained / total_marks) * 100, 2)
        grade = calculate_grade(percentage)

        query_db("""
            UPDATE marks
            SET student_id = %s, subject = %s, exam_name = %s,
                marks_obtained = %s, total_marks = %s, percentage = %s, grade = %s
            WHERE id = %s
        """, (student_id, subject, exam_name, marks_obtained, total_marks, percentage, grade, mark_id), commit=True)

        return jsonify({
            'success': True,
            'message': 'Marks record updated successfully.',
            'percentage': percentage,
            'grade': grade
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to update marks: {str(e)}"}), 500

@marks_bp.route('/<int:mark_id>', methods=['DELETE'])
@login_required
def delete_marks(mark_id):
    try:
        existing = query_db("SELECT id FROM marks WHERE id = %s", (mark_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Marks record not found.'}), 404

        query_db("DELETE FROM marks WHERE id = %s", (mark_id,), commit=True)
        return jsonify({'success': True, 'message': 'Marks record deleted successfully.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to delete marks: {str(e)}"}), 500
