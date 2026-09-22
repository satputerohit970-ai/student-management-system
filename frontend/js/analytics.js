/**
 * Student Management System - Analytics & Reports Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // Default to today's date
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('analytics-date-picker');
    if (dateInput) {
        dateInput.value = today;
    }

    loadAnalytics(today);

    // Event listener for date change
    const btnAnalyze = document.getElementById('btn-run-analytics');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', () => {
            const selectedDate = dateInput.value || today;
            loadAnalytics(selectedDate);
        });
    }

    // Print / Export
    const btnPrint = document.getElementById('btn-print-analytics');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
});

async function loadAnalytics(targetDate) {
    document.getElementById('display-analysis-date').textContent = targetDate;

    try {
        const res = await API.get('/api/analytics/daily', { date: targetDate });
        if (!res.success) {
            showToast('Failed to load analytics: ' + res.message, 'error');
            return;
        }

        const { student_analytics, teacher_analytics, course_analytics } = res;

        // 1. Metric Cards
        document.getElementById('stat-daily-rate').textContent = `${student_analytics.daily_attendance_rate}%`;
        document.getElementById('stat-daily-present').textContent = student_analytics.present_today;
        document.getElementById('stat-daily-absent').textContent = student_analytics.absent_today;
        document.getElementById('stat-teacher-ratio').textContent = `1 : ${teacher_analytics.student_teacher_ratio}`;
        document.getElementById('stat-sub-teachers').textContent = `${teacher_analytics.total_teachers} Active Faculty Members`;

        // 2. Absent Students on this day
        renderDailyAbsentStudents(student_analytics.absent_students || [], targetDate);

        // 3. Attendance Defaulters (< 75%)
        renderDefaulters(student_analytics.defaulters_below_75 || []);

        // 4. Grade Distribution Visuals
        renderGradeDistribution(student_analytics.grade_distribution || {});

        // 5. Top Rankers
        renderTopStudents(student_analytics.top_students || []);

        // 6. Teacher Workload Analysis
        renderTeacherWorkload(teacher_analytics.teachers_workload || [], teacher_analytics.subject_evaluations || []);

        // 7. Course Enrollment Breakdown
        renderCourseBreakdown(course_analytics || []);

    } catch (err) {
        showToast('Error loading analytics: ' + err.message, 'error');
    }
}

function renderDailyAbsentStudents(absentList, targetDate) {
    const tbody = document.getElementById('daily-absent-tbody');
    const badge = document.getElementById('daily-absent-badge');
    badge.textContent = `${absentList.length} Absent`;

    if (absentList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state" style="padding: 28px;">
                    <i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 32px;"></i>
                    <h4 style="margin-top: 8px; color: var(--success);">All Students Present or No Absentees Recorded</h4>
                    <p>No absences logged for ${targetDate}.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = absentList.map(s => {
        const phone = s.mobile_number ? s.mobile_number.replace(/\D/g, '') : '';
        const fullPhone = phone.length === 10 ? `91${phone}` : phone;
        const msg = `Dear Parent, ${s.full_name} (ID: ${s.student_id}) was marked ABSENT on ${targetDate} for ${s.course_name || 'classes'}. Please ensure attendance.`;
        const waLink = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;

        return `
            <tr>
                <td><strong>${s.student_id}</strong></td>
                <td><strong>${s.full_name}</strong></td>
                <td><span class="badge badge-course">${s.course_code || 'N/A'}</span></td>
                <td>${s.mobile_number || 'N/A'}</td>
                <td style="color: var(--text-muted);">${s.remarks || 'Unexcused'}</td>
                <td style="text-align: right;">
                    <a href="${waLink}" target="_blank" class="btn btn-sm btn-success">
                        <i class="fa-brands fa-whatsapp"></i> Alert Parent
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

function renderDefaulters(defaulters) {
    const tbody = document.getElementById('defaulters-tbody');
    const badge = document.getElementById('defaulters-count-badge');
    badge.textContent = `${defaulters.length} At-Risk`;

    if (defaulters.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state" style="padding: 24px;">
                    <i class="fa-solid fa-shield-halved" style="color: var(--success); font-size: 28px;"></i>
                    <h4 style="margin-top: 6px;">Excellent Attendance Record</h4>
                    <p>No students have an attendance rate below the 75% threshold.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = defaulters.map(d => {
        const rate = parseFloat(d.attendance_rate);
        const phone = d.mobile_number ? d.mobile_number.replace(/\D/g, '') : '';
        const fullPhone = phone.length === 10 ? `91${phone}` : phone;
        const msg = `URGENT ATTENDANCE ALERT: ${d.full_name} has only ${rate}% attendance, which is below the mandatory 75% requirement. Please contact college authorities.`;
        const waLink = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;

        return `
            <tr>
                <td><strong>${d.student_code}</strong></td>
                <td>
                    <div style="font-weight: 600;">${d.full_name}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${d.course_name}</div>
                </td>
                <td>${d.present_days} Present / ${d.total_days} Days</td>
                <td>${d.absent_days} Absent</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; height: 8px; background-color: #fee2e2; border-radius: var(--radius-full); overflow: hidden; min-width: 50px;">
                            <div style="width: ${rate}%; height: 100%; background-color: #ef4444; border-radius: var(--radius-full);"></div>
                        </div>
                        <span style="font-weight: 700; color: #dc2626; font-size: 12.5px;">${rate}%</span>
                    </div>
                </td>
                <td style="text-align: right;">
                    <a href="${waLink}" target="_blank" class="btn btn-sm btn-danger">
                        <i class="fa-brands fa-whatsapp"></i> Warning Notice
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

function renderGradeDistribution(grades) {
    const container = document.getElementById('grade-dist-container');
    if (!container) return;

    const total = Object.values(grades).reduce((a, b) => a + b, 0) || 1;

    const gradeConfig = [
        { label: 'A+', count: grades['A+'] || 0, color: '#10b981', desc: 'Outstanding (&ge; 90%)' },
        { label: 'A',  count: grades['A']  || 0, color: '#059669', desc: 'Excellent (80 - 89%)' },
        { label: 'B',  count: grades['B']  || 0, color: '#2563eb', desc: 'Good (70 - 79%)' },
        { label: 'C',  count: grades['C']  || 0, color: '#f59e0b', desc: 'Satisfactory (60 - 69%)' },
        { label: 'D',  count: grades['D']  || 0, color: '#ea580c', desc: 'Pass (40 - 59%)' },
        { label: 'F',  count: grades['F']  || 0, color: '#dc2626', desc: 'Fail (&lt; 40%)' }
    ];

    container.innerHTML = gradeConfig.map(g => {
        const pct = Math.round((g.count / total) * 100);
        return `
            <div style="background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 18px; font-weight: 800; color: ${g.color};">${g.label}</span>
                    <strong style="font-size: 16px; color: var(--text-primary);">${g.count} <span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">(${pct}%)</span></strong>
                </div>
                <div style="height: 6px; background-color: #f1f5f9; border-radius: var(--radius-full); overflow: hidden; margin-bottom: 6px;">
                    <div style="width: ${pct}%; height: 100%; background-color: ${g.color}; border-radius: var(--radius-full);"></div>
                </div>
                <span style="font-size: 11px; color: var(--text-muted);">${g.desc}</span>
            </div>
        `;
    }).join('');
}

function renderTopStudents(students) {
    const tbody = document.getElementById('top-students-tbody');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No examination evaluations available yet.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map((s, idx) => {
        let rankBadge = '#64748b';
        if (idx === 0) rankBadge = '#eab308'; // Gold
        else if (idx === 1) rankBadge = '#94a3b8'; // Silver
        else if (idx === 2) rankBadge = '#b45309'; // Bronze

        return `
            <tr>
                <td>
                    <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${rankBadge}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">
                        #${idx + 1}
                    </div>
                </td>
                <td>
                    <strong>${s.full_name}</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">${s.student_id}</div>
                </td>
                <td>${s.course_name}</td>
                <td>${s.exams_taken} Exams</td>
                <td>
                    <span class="badge badge-grade badge-grade-a">
                        ${s.avg_percentage}%
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function renderTeacherWorkload(teachers, evaluations) {
    const tbody = document.getElementById('teachers-analysis-tbody');
    if (!tbody) return;

    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No teachers recorded.</td></tr>';
        return;
    }

    const evalMap = {};
    evaluations.forEach(e => {
        evalMap[e.subject] = e;
    });

    tbody.innerHTML = teachers.map(t => {
        const ev = evalMap[t.subject] || { total_evaluations: 0, avg_subject_score: '-' };
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #e0e7ff; color: #3730a3; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                            ${t.teacher_name.charAt(0)}
                        </div>
                        <div>
                            <strong>${t.teacher_name}</strong>
                            <div style="font-size: 11.5px; color: var(--text-muted);">${t.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge" style="background-color: #f3e8ff; color: #6b21a8; font-weight: 600;">${t.subject}</span></td>
                <td>${t.mobile_number}</td>
                <td>${ev.total_evaluations} evaluated</td>
                <td><strong>${ev.avg_subject_score}%</strong> class avg</td>
            </tr>
        `;
    }).join('');
}

function renderCourseBreakdown(courses) {
    const tbody = document.getElementById('course-analytics-tbody');
    if (!tbody) return;

    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No courses found.</td></tr>';
        return;
    }

    tbody.innerHTML = courses.map(c => `
        <tr>
            <td><strong>${c.course_code}</strong></td>
            <td>${c.course_name}</td>
            <td>${c.duration}</td>
            <td><strong>${c.enrolled_students}</strong> student(s)</td>
            <td><strong>${c.course_avg_percentage || 'N/A'}%</strong></td>
        </tr>
    `).join('');
}
