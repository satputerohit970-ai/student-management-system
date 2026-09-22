from flask import Blueprint, jsonify
from database import query_db
from routes.auth_routes import login_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    try:
        # Total counts
        students_res = query_db("SELECT COUNT(*) AS total FROM students", one=True)
        courses_res = query_db("SELECT COUNT(*) AS total FROM courses", one=True)
        teachers_res = query_db("SELECT COUNT(*) AS total FROM teachers", one=True)
        attendance_res = query_db("SELECT COUNT(*) AS total FROM attendance", one=True)

        total_students = students_res['total'] if students_res else 0
        total_courses = courses_res['total'] if courses_res else 0
        total_teachers = teachers_res['total'] if teachers_res else 0
        total_attendance = attendance_res['total'] if attendance_res else 0

        # Calculate attendance percentage across all logged days
        present_res = query_db("SELECT COUNT(*) AS total_present FROM attendance WHERE status = 'Present'", one=True)
        total_present = present_res['total_present'] if present_res else 0
        attendance_percentage = round((total_present / total_attendance * 100), 1) if total_attendance > 0 else 0.0

        # Recent 5 students
        recent_students = query_db("""
            SELECT s.id, s.student_id, s.full_name, s.email, s.mobile_number, 
                   s.year, s.admission_date, s.has_face_registered, c.course_name, c.course_code
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            ORDER BY s.created_at DESC, s.id DESC
            LIMIT 5
        """)

        # Course distribution count
        course_distribution = query_db("""
            SELECT c.course_code, c.course_name, COUNT(s.id) AS student_count
            FROM courses c
            LEFT JOIN students s ON c.id = s.course_id
            GROUP BY c.id, c.course_code, c.course_name
            ORDER BY student_count DESC
        """)

        return jsonify({
            'success': True,
            'stats': {
                'total_students': total_students,
                'total_courses': total_courses,
                'total_teachers': total_teachers,
                'total_attendance': total_attendance,
                'attendance_percentage': attendance_percentage
            },
            'recent_students': recent_students or [],
            'course_distribution': course_distribution or []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to retrieve dashboard stats: {str(e)}"}), 500
