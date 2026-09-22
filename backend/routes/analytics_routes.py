from flask import Blueprint, request, jsonify
from datetime import date
from database import query_db
from routes.auth_routes import login_required

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/daily', methods=['GET'])
@login_required
def get_daily_analytics():
    """
    Comprehensive daily analytics for Students and Teachers.
    Optional query parameter: ?date=YYYY-MM-DD (defaults to today)
    """
    try:
        query_date = (request.args.get('date') or '').strip()
        if not query_date:
            query_date = date.today().isoformat()

        # ==========================================
        # 1. STUDENT DAILY ATTENDANCE ANALYSIS
        # ==========================================
        total_students_res = query_db("SELECT COUNT(*) AS total FROM students", one=True)
        total_students = total_students_res['total'] if total_students_res else 0

        # Attendance for the specific date
        date_att_res = query_db("""
            SELECT 
                COUNT(*) AS total_marked,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_count
            FROM attendance
            WHERE date = %s
        """, (query_date,), one=True)

        total_marked = date_att_res['total_marked'] if date_att_res else 0
        present_count = int(date_att_res['present_count'] or 0) if date_att_res else 0
        absent_count = int(date_att_res['absent_count'] or 0) if date_att_res else 0
        
        daily_rate = round((present_count / total_marked * 100), 1) if total_marked > 0 else 0.0

        # List of students absent on this date
        absent_students = query_db("""
            SELECT s.id, s.student_id, s.full_name, s.mobile_number, s.email, s.year,
                   c.course_name, c.course_code, a.remarks
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE a.date = %s AND a.status = 'Absent'
            ORDER BY s.full_name ASC
        """, (query_date,))

        # ==========================================
        # 2. AT-RISK STUDENTS (< 75% ATTENDANCE)
        # ==========================================
        defaulters = query_db("""
            SELECT s.id, s.student_id, s.full_name, s.mobile_number, s.email, c.course_name, s.year,
                   COUNT(a.id) AS total_days,
                   SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
                   SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
                   ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 1) AS attendance_rate
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            JOIN attendance a ON s.id = a.student_id
            GROUP BY s.id, s.student_id, s.full_name, c.course_name, s.year
            HAVING attendance_rate < 75.0 AND total_days >= 2
            ORDER BY attendance_rate ASC
        """)

        # ==========================================
        # 3. STUDENT ACADEMIC & GRADE DISTRIBUTION
        # ==========================================
        grade_dist_raw = query_db("""
            SELECT grade, COUNT(*) AS count
            FROM marks
            GROUP BY grade
            ORDER BY FIELD(grade, 'A+', 'A', 'B', 'C', 'D', 'F')
        """)

        grade_distribution = {'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        for item in grade_dist_raw:
            if item['grade'] in grade_distribution:
                grade_distribution[item['grade']] = item['count']

        # Top Performing Students
        top_students = query_db("""
            SELECT s.id, s.student_id, s.full_name, c.course_name, s.year,
                   ROUND(AVG(m.percentage), 1) AS avg_percentage,
                   COUNT(m.id) AS exams_taken
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            JOIN marks m ON s.id = m.student_id
            GROUP BY s.id, s.student_id, s.full_name, c.course_name, s.year
            ORDER BY avg_percentage DESC
            LIMIT 5
        """)

        # ==========================================
        # 4. TEACHER FACULTY ANALYSIS & WORKLOAD
        # ==========================================
        total_teachers_res = query_db("SELECT COUNT(*) AS total FROM teachers", one=True)
        total_teachers = total_teachers_res['total'] if total_teachers_res else 0

        # Teacher - Student ratio
        ratio = round(total_students / total_teachers, 1) if total_teachers > 0 else 0.0

        # Teacher faculty list and subject matrix
        teachers_workload = query_db("""
            SELECT t.id, t.teacher_name, t.email, t.mobile_number, t.subject, t.created_at
            FROM teachers t
            ORDER BY t.teacher_name ASC
        """)

        # Calculate subject-wise exams & marks evaluated by teachers
        subject_stats = query_db("""
            SELECT m.subject, COUNT(m.id) AS total_evaluations,
                   ROUND(AVG(m.percentage), 1) AS avg_subject_score
            FROM marks m
            GROUP BY m.subject
            ORDER BY total_evaluations DESC
        """)

        # ==========================================
        # 5. COURSE ENROLLMENT BREAKDOWN
        # ==========================================
        course_stats = query_db("""
            SELECT c.id, c.course_code, c.course_name, c.duration,
                   COUNT(DISTINCT s.id) AS enrolled_students,
                   ROUND(AVG(m.percentage), 1) AS course_avg_percentage
            FROM courses c
            LEFT JOIN students s ON c.id = s.course_id
            LEFT JOIN marks m ON s.id = m.student_id
            GROUP BY c.id, c.course_code, c.course_name, c.duration
            ORDER BY enrolled_students DESC
        """)

        return jsonify({
            'success': True,
            'date': query_date,
            'student_analytics': {
                'total_enrolled': total_students,
                'total_marked_today': total_marked,
                'present_today': present_count,
                'absent_today': absent_count,
                'daily_attendance_rate': daily_rate,
                'absent_students': absent_students or [],
                'defaulters_below_75': defaulters or [],
                'grade_distribution': grade_distribution,
                'top_students': top_students or []
            },
            'teacher_analytics': {
                'total_teachers': total_teachers,
                'student_teacher_ratio': ratio,
                'teachers_workload': teachers_workload or [],
                'subject_evaluations': subject_stats or []
            },
            'course_analytics': course_stats or []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to calculate daily analytics: {str(e)}"}), 500
