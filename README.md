# 🎓 Student Management System

A web-based **Student Management System** developed using **HTML, CSS, JavaScript, Python Flask, and MySQL**. This project helps educational institutions manage student information, courses, attendance, marks, teachers, and notifications through a simple and user-friendly interface.

## 🚀 Features

* 👨‍🎓 Student Management
* 👨‍🏫 Teacher Management
* 📚 Course Management
* 📊 Marks Management
* 📅 Attendance Management
* 🔔 Notifications
* 🔐 Admin Login
* 🗄️ MySQL Database Integration
* 🌐 REST API using Flask
* 📱 Simple and Responsive User Interface

## 🛠️ Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Python
* Flask
* Flask-CORS

### Database

* MySQL
* PyMySQL

### Development Tools

* Visual Studio Code
* Git
* GitHub

## 📂 Project Structure

```text
student-management-system/
│
├── backend/
│   ├── app.py
│   ├── database.py
│   └── ...
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── ...
│
├── .gitignore
├── README.md
└── app.py
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/satputerohit970-ai/student-management-system.git
```

### 2. Open the Project

```bash
cd student-management-system
```

### 3. Create Virtual Environment

```bash
python -m venv venv
```

### 4. Activate Virtual Environment

**Windows PowerShell:**

```powershell
venv\Scripts\Activate.ps1
```

### 5. Install Required Packages

```bash
pip install flask flask-cors pymysql
```

### 6. Setup MySQL Database

Create a MySQL database:

```sql
CREATE DATABASE student_management_system;
```

Then create the required tables according to the project's database configuration.

### 7. Run the Application

```bash
python app.py
```

The application will run on:

```text
http://127.0.0.1:5000
```

## 📊 Database

The project uses **MySQL** for storing and managing application data.

Main tables include:

* `admins`
* `students`
* `teachers`
* `courses`
* `attendance`
* `marks`
* `notifications`

## 🎯 Project Objective

The main objective of this project is to create a centralized system for managing student-related information digitally. It reduces manual work and provides an organized way to manage academic records.

## 💡 What I Learned

Through this project, I gained practical experience in:

* Python Flask development
* REST API development
* MySQL database integration
* CRUD operations
* Frontend and backend integration
* Git and GitHub
* Debugging and error handling
* Connecting a web application with a database

## 🔮 Future Improvements

* Student registration and profile management
* Advanced authentication and authorization
* Online result generation
* Email/SMS notifications
* Admin dashboard with analytics
* Cloud deployment
* Improved responsive design

## 👨‍💻 Developer

**Rohit Satpute**

Bachelor of Computer Science | Fresher

### Skills

`Python` `C` `C++` `HTML` `CSS` `JavaScript` `MySQL` `Flask`

---

⭐ If you find this project useful, consider giving it a star!
