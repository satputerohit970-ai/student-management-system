-- =======================================================
-- Student Management System Database Script
-- Database: student_management_system
-- Technology: MySQL 8.0+
-- =======================================================

CREATE DATABASE IF NOT EXISTS `student_management_system`
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `student_management_system`;

-- -------------------------------------------------------
-- 1. Table: admins
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 2. Table: courses
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `courses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_code` VARCHAR(20) NOT NULL UNIQUE,
    `course_name` VARCHAR(100) NOT NULL,
    `duration` VARCHAR(50) NOT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 3. Table: teachers
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teachers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `teacher_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `mobile_number` VARCHAR(20) NOT NULL,
    `subject` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 4. Table: students
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` VARCHAR(50) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `mobile_number` VARCHAR(20) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
    `address` TEXT,
    `course_id` INT NULL,
    `year` VARCHAR(20) NOT NULL,
    `admission_date` DATE NOT NULL,
    `face_data` LONGTEXT NULL,
    `has_face_registered` TINYINT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_students_course`
        FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 5. Table: attendance
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('Present', 'Absent') NOT NULL DEFAULT 'Present',
    `remarks` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attendance_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `unique_student_attendance_date`
        UNIQUE (`student_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 6. Table: marks
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `subject` VARCHAR(100) NOT NULL,
    `exam_name` VARCHAR(100) NOT NULL,
    `marks_obtained` DECIMAL(5,2) NOT NULL,
    `total_marks` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    `percentage` DECIMAL(5,2) NOT NULL,
    `grade` VARCHAR(5) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_marks_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 7. Table: notifications
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `recipient_name` VARCHAR(100) NOT NULL,
    `contact_info` VARCHAR(100) NOT NULL,
    `channel` ENUM('WhatsApp', 'Email', 'SMS') NOT NULL DEFAULT 'WhatsApp',
    `date` DATE NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(50) DEFAULT 'Sent',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notifications_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =======================================================
-- Sample Data Insertion
-- =======================================================

-- Default Admin (Password: rohit123)
INSERT INTO `admins` (`id`, `username`, `password_hash`, `full_name`, `email`)
VALUES (
    1,
    'satputerohit970@gmail.com',
    'scrypt:32768:8:1$yYWor8pozitBuZfp$04853190ad84bee93433d85dddc311194a7427878a9abd070e2c16cfb4618cc2d4f6e82c0c66a7f2c7336d53a83bba68e6b3fae4ecfcbbc4f9114fff04fb1824',
    'Rohit Satpute',
    'satputerohit970@gmail.com'
)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`), `password_hash` = VALUES(`password_hash`), `full_name` = VALUES(`full_name`), `email` = VALUES(`email`);

-- Sample Courses
INSERT INTO `courses` (`id`, `course_code`, `course_name`, `duration`, `description`)
VALUES
    (1, 'CS101', 'B.Tech in Computer Science & Engineering', '4 Years', 'Comprehensive curriculum covering algorithms, software engineering, databases, and AI.'),
    (2, 'IT201', 'B.Sc in Information Technology', '3 Years', 'Focused on networking, cloud systems, web development, and cybersecurity.'),
    (3, 'DS301', 'M.Sc in Data Science & Analytics', '2 Years', 'Advanced machine learning, big data analytics, statistical modeling, and Python programming.'),
    (4, 'AI401', 'Artificial Intelligence & Machine Learning', '4 Years', 'Deep learning, neural networks, computer vision, and NLP specialization.'),
    (5, 'SE501', 'Master of Computer Applications (MCA)', '2 Years', 'Enterprise software architecture, full-stack frameworks, and distributed applications.')
ON DUPLICATE KEY UPDATE `course_name` = VALUES(`course_name`);

-- Sample Teachers
INSERT INTO `teachers` (`id`, `teacher_name`, `email`, `mobile_number`, `subject`)
VALUES
    (1, 'Dr. Rajesh Sharma', 'rajesh.sharma@university.edu', '+91 9876543210', 'Data Structures & Algorithms'),
    (2, 'Prof. Ananya Sen', 'ananya.sen@university.edu', '+91 9876543211', 'Database Management Systems'),
    (3, 'Dr. Vikram Patel', 'vikram.patel@university.edu', '+91 9876543212', 'Artificial Intelligence'),
    (4, 'Prof. Sneha Deshmukh', 'sneha.deshmukh@university.edu', '+91 9876543213', 'Software Engineering'),
    (5, 'Dr. Amit Verma', 'amit.verma@university.edu', '+91 9876543214', 'Computer Networks')
ON DUPLICATE KEY UPDATE `teacher_name` = VALUES(`teacher_name`);

-- Sample Students
INSERT INTO `students` (`id`, `student_id`, `full_name`, `email`, `mobile_number`, `date_of_birth`, `gender`, `address`, `course_id`, `year`, `admission_date`)
VALUES
    (1, 'STU001', 'Aarav Mehta', 'aarav.mehta@student.edu', '9823011223', '2004-03-15', 'Male', 'Flat 402, Sunshine Residency, Pune', 1, '3rd Year', '2024-08-01'),
    (2, 'STU002', 'Priya Kulkarni', 'priya.kulkarni@student.edu', '9823011224', '2005-07-22', 'Female', 'Plot 12, Green Park, Mumbai', 1, '2nd Year', '2025-08-05'),
    (3, 'STU003', 'Rohan Gupta', 'rohan.gupta@student.edu', '9823011225', '2003-11-10', 'Male', 'A-101, Lakeview Enclave, Bangalore', 2, '4th Year', '2023-08-10'),
    (4, 'STU004', 'Neha Patil', 'neha.patil@student.edu', '9823011226', '2005-01-30', 'Female', '45 Shivaji Nagar, Pune', 2, '2nd Year', '2025-08-05'),
    (5, 'STU005', 'Aditya Joshi', 'aditya.joshi@student.edu', '9823011227', '2004-09-18', 'Male', 'B-303, Royal Heights, Hyderabad', 3, '1st Year', '2026-07-20'),
    (6, 'STU006', 'Isha Nair', 'isha.nair@student.edu', '9823011228', '2004-05-12', 'Female', '120 Marine Drive, Kochi', 4, '3rd Year', '2024-08-01'),
    (7, 'STU007', 'Karan Singhania', 'karan.singhania@student.edu', '9823011229', '2003-12-04', 'Male', '88 Civil Lines, Delhi', 4, '4th Year', '2023-08-10'),
    (8, 'STU008', 'Ananya Roy', 'ananya.roy@student.edu', '9823011230', '2005-04-25', 'Female', 'Salt Lake Sector 5, Kolkata', 5, '1st Year', '2026-07-25')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Sample Attendance Records
INSERT INTO `attendance` (`student_id`, `date`, `status`, `remarks`)
VALUES
    (1, '2026-09-15', 'Present', 'Attended all lectures'),
    (1, '2026-09-16', 'Present', 'Attended all lectures'),
    (1, '2026-09-17', 'Present', 'Attended lab session'),
    (1, '2026-09-18', 'Absent', 'Sick leave approved'),
    (1, '2026-09-19', 'Present', 'Attended all lectures'),
    (2, '2026-09-15', 'Present', 'Attended all lectures'),
    (2, '2026-09-16', 'Present', 'Attended all lectures'),
    (2, '2026-09-17', 'Present', 'Attended all lectures'),
    (2, '2026-09-18', 'Present', 'Attended all lectures'),
    (2, '2026-09-19', 'Present', 'Attended all lectures'),
    (3, '2026-09-15', 'Absent', 'Unexcused'),
    (3, '2026-09-16', 'Present', 'Attended all lectures'),
    (3, '2026-09-17', 'Present', 'Attended all lectures'),
    (4, '2026-09-15', 'Present', 'Attended all lectures'),
    (4, '2026-09-16', 'Present', 'Attended all lectures')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Sample Marks Records
INSERT INTO `marks` (`student_id`, `subject`, `exam_name`, `marks_obtained`, `total_marks`, `percentage`, `grade`)
VALUES
    (1, 'Data Structures & Algorithms', 'Midterm Examination', 88.50, 100.00, 88.50, 'A'),
    (1, 'Database Management Systems', 'Midterm Examination', 92.00, 100.00, 92.00, 'A+'),
    (1, 'Computer Networks', 'Midterm Examination', 78.00, 100.00, 78.00, 'B'),
    (2, 'Data Structures & Algorithms', 'Midterm Examination', 94.00, 100.00, 94.00, 'A+'),
    (2, 'Database Management Systems', 'Midterm Examination', 85.50, 100.00, 85.50, 'A'),
    (3, 'Cloud Computing', 'Midterm Examination', 72.00, 100.00, 72.00, 'B'),
    (4, 'Web Development', 'Midterm Examination', 81.00, 100.00, 81.00, 'A'),
    (5, 'Machine Learning', 'Unit Test 1', 89.00, 100.00, 89.00, 'A'),
    (6, 'Deep Learning', 'Midterm Examination', 95.00, 100.00, 95.00, 'A+')
ON DUPLICATE KEY UPDATE `marks_obtained` = VALUES(`marks_obtained`);
