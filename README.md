# Student Management System

A complete, production-ready, full-stack **Student Management System** IT project built using a modern **HTML5 / CSS3 / JavaScript** responsive frontend, **Python Flask** REST API backend, and **MySQL** database.

---

## Features Overview

1. **Admin Authentication**
   - Secure login using password hashing (`werkzeug.security` / `scrypt`).
   - Session-based authentication with protected REST API routes.
   - Logout functionality and unauthorized redirect protection.

2. **Executive Dashboard**
   - Real-time statistics counters:
     - Total Enrolled Students
     - Total Active Courses
     - Total Faculty / Teachers
     - Overall Attendance Rate Percentage (%)
   - Quick action shortcuts (Add Student, Add Course, Mark Attendance, Record Marks, Add Teacher).
   - Recent student admissions table.
   - Program enrollment distribution progress bars.

3. **Student Management (Full CRUD)**
   - Add new student with validation.
   - View student directory with pagination-ready table.
   - Update student details.
   - Delete student (with cascade deletion of linked records).
   - Live search across: Full Name, Student ID, Course, and Email.
   - Filters by: Course Program, Academic Year, and Gender.
   - Form validation: Email regex, phone number, required fields, unique Student ID and Email check.

4. **Course Management (Full CRUD)**
   - Add, View, Edit, and Delete courses.
   - Fields: Course Code, Course Name, Duration, Description.
   - Real-time enrolled students counter per course.

5. **Teacher / Faculty Management (Full CRUD)**
   - Add, View, Edit, and Delete teachers.
   - Fields: Teacher Name, Email, Mobile Number, Subject Specialization.

6. **Attendance Management**
   - Daily log view with Date, Student, and Status (Present / Absent) filters.
   - Mark individual student attendance or record reasons/remarks.
   - Dedicated **Student Summary View** calculating present days, absent days, and individual attendance percentage (`%`) with visual progress bars.

7. **Marks & Examination Management (Gradebook)**
   - Record exam results: Student, Subject, Exam Name, Marks Obtained, Total Marks.
   - Dynamic live calculation of Percentage (`%`) and letter grades (`A+`, `A`, `B`, `C`, `D`, `F`).
   - Filter and search by Student, Exam Name, and Subject.
   - Full CRUD capability.

---

## Technology Stack

- **Frontend**: HTML5, CSS3 (Custom Responsive Design, CSS Variables), JavaScript (ES6+ Fetch API, DOM manipulation, Toast alerts, Modals).
- **Backend**: Python 3.10+, Flask REST API, Flask-CORS.
- **Database**: MySQL 8.0+ / MariaDB with PyMySQL driver.
- **Security**: Werkzeug password hashing, HTTP-only session cookies.

---

## Project Structure

```
student-management-system/
│
├── backend/
│   ├── app.py                     # Main Flask application and server entry point
│   ├── config.py                  # Configuration loader (.env, database credentials)
│   ├── database.py                # PyMySQL connection manager and auto-initializer
│   ├── requirements.txt           # Python package dependencies
│   ├── routes/
│   │   ├── __init__.py            # Blueprint registry
│   │   ├── auth_routes.py         # Login, logout, session verification
│   │   ├── dashboard_routes.py    # Analytics and statistics endpoints
│   │   ├── student_routes.py      # Student CRUD, search, and filters
│   │   ├── course_routes.py       # Course CRUD
│   │   ├── teacher_routes.py      # Teacher CRUD
│   │   ├── attendance_routes.py   # Attendance logging and percentage summaries
│   │   └── marks_routes.py        # Examination marks and grade calculator
│   └── models/
│       └── __init__.py            # Validation routines and grade calculators
│
├── frontend/
│   ├── index.html                 # Gateway redirecter
│   ├── login.html                 # Administrator login page
│   ├── dashboard.html             # Overview dashboard
│   ├── students.html              # Student management directory
│   ├── courses.html               # Course catalog
│   ├── teachers.html              # Teacher directory
│   ├── attendance.html            # Attendance log and percentage tracker
│   ├── marks.html                 # Marks & gradebook management
│   ├── css/
│   │   └── style.css              # Custom styling, variables, modals, responsive rules
│   └── js/
│       ├── api.js                 # Reusable API fetch client and toast alerts
│       ├── auth.js                # Session guard and sidebar shell
│       ├── dashboard.js           # Dashboard metrics loader
│       ├── students.js            # Student controller
│       ├── courses.js             # Course controller
│       ├── teachers.js            # Teacher controller
│       ├── attendance.js          # Attendance controller
│       └── marks.js               # Marks controller
│
├── database/
│   └── database.sql               # Full DDL schema and realistic seed data
│
├── .env.example                   # Environment configuration template
├── .env                           # Local environment configuration
└── README.md                      # Documentation and run instructions
```

---

## Installation & Setup Guide

### Prerequisites
- **Python 3.10+** installed
- **MySQL Server 8.0+** or **XAMPP / MariaDB** running

---

### Step 1: Clone or Navigate to the Project

Open your terminal or command prompt:
```bash
cd path/to/student-management-system
```

---

### Step 2: Set Up Python Virtual Environment

Create and activate a virtual environment:

**On Windows (PowerShell / Command Prompt):**
```powershell
python -m venv venv
venv\Scripts\activate
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### Step 3: Install Required Dependencies

```bash
pip install -r backend/requirements.txt
```

---

### Step 4: Configure Database Settings

Check or edit the `.env` file in the project root or in `backend/.env`:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_management_system
SECRET_KEY=your_secret_key_here
PORT=5000
```

---

### Step 5: Initialize the Database

You can initialize the database using either method:

**Option A: Automated Python Script (Recommended)**
```bash
cd backend
python database.py
```
*This automatically creates the `student_management_system` database, builds all 6 tables, and inserts default admin and sample data.*

**Option B: MySQL Command Line / Workbench**
```bash
mysql -u root -p < database/database.sql
```

---

### Step 6: Start the Flask Application

Run the server:
```bash
cd backend
python app.py
```

The server will start on:
```
http://127.0.0.1:5000
```

Open `http://127.0.0.1:5000` in your web browser. It will take you directly to the login portal.

---

## Default Admin Credentials

| Parameter | Value |
| :--- | :--- |
| **Username** | `satputerohit970@gmail.com` |
| **Password** | `rohit123` |

---

## REST API Endpoints Reference

### Authentication
- `POST /api/login` - Authenticate admin with username & password
- `POST /api/logout` - Clear session
- `GET /api/me` - Check current session status

### Dashboard
- `GET /api/dashboard/stats` - Total counts, recent admissions, course distribution

### Students
- `GET /api/students` - Query students with search (`?search=...`) and filters (`?course_id=...&year=...&gender=...`)
- `GET /api/students/<id>` - Get single student
- `POST /api/students` - Register new student
- `PUT /api/students/<id>` - Update student profile
- `DELETE /api/students/<id>` - Delete student

### Courses
- `GET /api/courses` - List all courses with student count
- `GET /api/courses/<id>` - Get single course
- `POST /api/courses` - Create course
- `PUT /api/courses/<id>` - Update course
- `DELETE /api/courses/<id>` - Delete course

### Teachers
- `GET /api/teachers` - List faculty members
- `GET /api/teachers/<id>` - Get single teacher
- `POST /api/teachers` - Add teacher
- `PUT /api/teachers/<id>` - Update teacher
- `DELETE /api/teachers/<id>` - Delete teacher

### Attendance
- `GET /api/attendance` - Query logs by date, student, or status
- `GET /api/attendance/summary` - Aggregated presence, absence, and percentage rate per student
- `POST /api/attendance` - Mark single or bulk attendance
- `DELETE /api/attendance/<id>` - Delete attendance log

### Marks
- `GET /api/marks` - List exam marks with filters
- `GET /api/marks/<id>` - Single mark entry
- `POST /api/marks` - Record exam score (automatically calculates percentage and grade)
- `PUT /api/marks/<id>` - Update exam score
- `DELETE /api/marks/<id>` - Delete mark entry

---

## License
This project is open-source and free to use for educational, academic, and IT submission purposes.
