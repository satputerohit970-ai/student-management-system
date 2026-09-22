"""
Automated Test Suite for Student Management System REST API
Tests all endpoints: Auth, Dashboard, Students, Courses, Teachers, Attendance, Marks
"""
import unittest
import json
from app import app
from database import query_db, init_db

class StudentManagementSystemTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure tables and seed data are initialized
        init_db()

    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def login_admin(self):
        """Helper to log in default admin and preserve session cookies."""
        res = self.client.post('/api/login', json={
            'username': 'admin',
            'password': 'admin123'
        })
        self.assertEqual(res.status_code, 200)
        return res

    def test_01_auth_flow(self):
        """Test login with valid/invalid credentials, me, and logout."""
        # Invalid login
        res = self.client.post('/api/login', json={'username': 'admin', 'password': 'wrongpassword'})
        self.assertEqual(res.status_code, 401)

        # Valid login
        res = self.login_admin()
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['username'], 'admin')

        # Check /api/me
        res_me = self.client.get('/api/me')
        self.assertEqual(res_me.status_code, 200)
        data_me = json.loads(res_me.data)
        self.assertTrue(data_me['authenticated'])

        # Logout
        res_out = self.client.post('/api/logout')
        self.assertEqual(res_out.status_code, 200)

        # Me after logout
        res_me2 = self.client.get('/api/me')
        self.assertFalse(json.loads(res_me2.data)['authenticated'])

    def test_02_dashboard_stats(self):
        """Test dashboard statistics calculation."""
        self.login_admin()
        res = self.client.get('/api/dashboard/stats')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('total_students', data['stats'])
        self.assertIn('total_courses', data['stats'])
        self.assertIn('total_teachers', data['stats'])
        self.assertIn('attendance_percentage', data['stats'])
        self.assertIsInstance(data['recent_students'], list)

    def test_03_course_crud(self):
        """Test Course CRUD operations."""
        self.login_admin()

        # 1. Create course
        res = self.client.post('/api/courses', json={
            'course_code': 'TEST999',
            'course_name': 'Automated Testing Course',
            'duration': '1 Year',
            'description': 'Integration testing syllabus'
        })
        self.assertEqual(res.status_code, 201)
        course_id = json.loads(res.data)['course_id']

        # Duplicate check
        dup_res = self.client.post('/api/courses', json={
            'course_code': 'TEST999',
            'course_name': 'Duplicate Course',
            'duration': '1 Year'
        })
        self.assertEqual(dup_res.status_code, 409)

        # 2. Get single course
        res_get = self.client.get(f'/api/courses/{course_id}')
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(json.loads(res_get.data)['course']['course_code'], 'TEST999')

        # 3. Update course
        res_put = self.client.put(f'/api/courses/{course_id}', json={
            'course_code': 'TEST999',
            'course_name': 'Updated Testing Course',
            'duration': '2 Years',
            'description': 'Updated description'
        })
        self.assertEqual(res_put.status_code, 200)

        # 4. Delete course
        res_del = self.client.delete(f'/api/courses/{course_id}')
        self.assertEqual(res_del.status_code, 200)

    def test_04_teacher_crud(self):
        """Test Teacher CRUD operations."""
        self.login_admin()

        # 1. Create teacher
        res = self.client.post('/api/teachers', json={
            'teacher_name': 'Dr. Test Professor',
            'email': 'test.prof@university.edu',
            'mobile_number': '9876543299',
            'subject': 'Quantum Computing'
        })
        self.assertEqual(res.status_code, 201)
        teacher_id = json.loads(res.data)['teacher_id']

        # 2. Update teacher
        res_put = self.client.put(f'/api/teachers/{teacher_id}', json={
            'teacher_name': 'Dr. Test Professor Senior',
            'email': 'test.prof@university.edu',
            'mobile_number': '9876543299',
            'subject': 'Advanced Quantum Computing'
        })
        self.assertEqual(res_put.status_code, 200)

        # 3. Delete teacher
        res_del = self.client.delete(f'/api/teachers/{teacher_id}')
        self.assertEqual(res_del.status_code, 200)

    def test_05_student_crud_and_search(self):
        """Test Student CRUD operations, search, and validations."""
        self.login_admin()

        # 1. Create student
        payload = {
            'student_id': 'TEST_STU_888',
            'full_name': 'John Test Doe',
            'email': 'john.test.doe@student.edu',
            'mobile_number': '9123456780',
            'date_of_birth': '2004-06-15',
            'gender': 'Male',
            'course_id': 1,
            'year': '2nd Year',
            'admission_date': '2025-08-01',
            'address': 'Testing Street 123'
        }
        res = self.client.post('/api/students', json=payload)
        self.assertEqual(res.status_code, 201)
        student_id = json.loads(res.data)['student_id']

        # Duplicate student_id check
        res_dup = self.client.post('/api/students', json=payload)
        self.assertEqual(res_dup.status_code, 409)

        # 2. Search student
        res_search = self.client.get('/api/students?search=John+Test')
        self.assertEqual(res_search.status_code, 200)
        search_data = json.loads(res_search.data)
        self.assertGreaterEqual(search_data['count'], 1)

        # 3. Update student
        payload['full_name'] = 'John Test Doe Updated'
        res_put = self.client.put(f'/api/students/{student_id}', json=payload)
        self.assertEqual(res_put.status_code, 200)

        # 4. Clean up delete
        res_del = self.client.delete(f'/api/students/{student_id}')
        self.assertEqual(res_del.status_code, 200)

    def test_06_attendance_flow(self):
        """Test attendance marking and summary."""
        self.login_admin()

        # Mark attendance for student 1
        res = self.client.post('/api/attendance', json={
            'student_id': 1,
            'date': '2026-09-21',
            'status': 'Present',
            'remarks': 'Test attendance present'
        })
        self.assertEqual(res.status_code, 200)

        # Get attendance log
        res_get = self.client.get('/api/attendance?date=2026-09-21')
        self.assertEqual(res_get.status_code, 200)

        # Summary check
        res_sum = self.client.get('/api/attendance/summary')
        self.assertEqual(res_sum.status_code, 200)
        self.assertTrue(json.loads(res_sum.data)['success'])

    def test_07_marks_flow(self):
        """Test marks entry, percentage calculation, and grade assignment."""
        self.login_admin()

        # Add mark for student 1 (85 out of 100 -> 85%, Grade A)
        res = self.client.post('/api/marks', json={
            'student_id': 1,
            'exam_name': 'Automated Test Exam',
            'subject': 'Software Architecture',
            'marks_obtained': 85,
            'total_marks': 100
        })
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        mark_id = data['mark_id']
        self.assertEqual(data['percentage'], 85.0)
        self.assertEqual(data['grade'], 'A')

        # Update mark (95 out of 100 -> 95%, Grade A+)
        res_put = self.client.put(f'/api/marks/{mark_id}', json={
            'student_id': 1,
            'exam_name': 'Automated Test Exam',
            'subject': 'Software Architecture',
            'marks_obtained': 95,
            'total_marks': 100
        })
        self.assertEqual(res_put.status_code, 200)
        data_put = json.loads(res_put.data)
        self.assertEqual(data_put['percentage'], 95.0)
        self.assertEqual(data_put['grade'], 'A+')

        # Delete mark
        res_del = self.client.delete(f'/api/marks/{mark_id}')
        self.assertEqual(res_del.status_code, 200)

if __name__ == '__main__':
    unittest.main()
