/**
 * Student Management System - Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupQuickModals();
});

async function loadDashboardData() {
    try {
        const res = await API.get('/api/dashboard/stats');
        if (!res.success) {
            showToast('Failed to load dashboard statistics', 'error');
            return;
        }

        const { stats, recent_students, course_distribution } = res;

        // Update Stat Cards
        document.getElementById('total-students').textContent = stats.total_students || 0;
        document.getElementById('total-courses').textContent = stats.total_courses || 0;
        document.getElementById('total-teachers').textContent = stats.total_teachers || 0;
        document.getElementById('total-attendance').textContent = `${stats.attendance_percentage || 0}%`;
        document.getElementById('attendance-subtext').textContent = `${stats.total_attendance || 0} Total Records Logged`;

        // Render Recent Students
        renderRecentStudents(recent_students || []);

        // Render Course Distribution list
        renderCourseDistribution(course_distribution || []);

    } catch (err) {
        showToast('Error loading dashboard data: ' + err.message, 'error');
    }
}

function renderRecentStudents(students) {
    const tbody = document.getElementById('recent-students-tbody');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-user-graduate"></i>
                    <h4>No students enrolled yet</h4>
                    <p>Click "Add Student" to create the first record.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(s => {
        const hasFace = Boolean(s.has_face_registered);
        const faceBadge = hasFace 
            ? `<span class="badge" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"><i class="fa-solid fa-face-smile"></i> Added</span>`
            : `<span class="badge" style="background-color: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;"><i class="fa-solid fa-camera"></i> No Face</span>`;
        const actionBtn = hasFace 
            ? `<a href="attendance.html?action=scan&student_id=${s.id}" class="btn btn-sm" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; font-size: 11.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; text-decoration: none;" title="Scan Face Attendance"><i class="fa-solid fa-camera"></i> Scan Face</a>`
            : `<a href="students.html?action=face&id=${s.id}&name=${encodeURIComponent(s.full_name)}&code=${encodeURIComponent(s.student_id)}" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; text-decoration: none;"><i class="fa-solid fa-camera"></i> Add Face</a>`;

        return `
        <tr>
            <td>
                <strong>${s.student_id}</strong>
            </td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${s.full_name}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">${s.email}</div>
            </td>
            <td>${faceBadge}</td>
            <td>
                <span class="badge badge-course">${s.course_code || 'General'}</span>
            </td>
            <td>${s.year || 'N/A'}</td>
            <td style="text-align: right;">
                ${actionBtn}
            </td>
        </tr>
    `;
    }).join('');
}

function renderCourseDistribution(courses) {
    const container = document.getElementById('course-dist-list');
    if (!container) return;

    if (courses.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No courses found.</p>';
        return;
    }

    container.innerHTML = courses.map(c => `
        <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                <span>${c.course_code} - ${c.course_name}</span>
                <span style="color: var(--primary);">${c.student_count} student(s)</span>
            </div>
            <div style="height: 8px; background-color: var(--border-light); border-radius: var(--radius-full); overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(c.student_count * 20, 100)}%; background: linear-gradient(90deg, #2563eb, #38bdf8); border-radius: var(--radius-full);"></div>
            </div>
        </div>
    `).join('');
}

function setupQuickModals() {
    // Shortcuts for quick action buttons
    const btnQuickStudent = document.getElementById('btn-quick-student');
    if (btnQuickStudent) {
        btnQuickStudent.addEventListener('click', () => {
            window.location.href = 'students.html?action=add';
        });
    }

    const btnQuickFace = document.getElementById('btn-quick-face');
    if (btnQuickFace) {
        btnQuickFace.addEventListener('click', () => {
            window.location.href = 'students.html?action=face';
        });
    }

    const btnQuickCourse = document.getElementById('btn-quick-course');
    if (btnQuickCourse) {
        btnQuickCourse.addEventListener('click', () => {
            window.location.href = 'courses.html?action=add';
        });
    }

    const btnQuickTeacher = document.getElementById('btn-quick-teacher');
    if (btnQuickTeacher) {
        btnQuickTeacher.addEventListener('click', () => {
            window.location.href = 'teachers.html?action=add';
        });
    }

    const btnQuickAttendance = document.getElementById('btn-quick-attendance');
    if (btnQuickAttendance) {
        btnQuickAttendance.addEventListener('click', () => {
            window.location.href = 'attendance.html';
        });
    }

    const btnQuickMarks = document.getElementById('btn-quick-marks');
    if (btnQuickMarks) {
        btnQuickMarks.addEventListener('click', () => {
            window.location.href = 'marks.html?action=add';
        });
    }
}
