/**
 * Student Management System - Marks & Grades Module Controller
 */

let allStudents = [];
let currentDeleteMarkId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadStudentsDropdown();
    await loadMarks();
    setupEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openAddMarksModal();
    }
});

async function loadStudentsDropdown() {
    try {
        const res = await API.get('/api/students');
        if (res.success) {
            allStudents = res.students || [];

            // Filter student dropdown
            const filterStudent = document.getElementById('filter-mark-student');
            if (filterStudent) {
                filterStudent.innerHTML = '<option value="">All Students</option>' +
                    allStudents.map(s => `<option value="${s.id}">${s.student_id} - ${s.full_name}</option>`).join('');
            }

            // Form student dropdown
            const formStudent = document.getElementById('mark-student-id');
            if (formStudent) {
                formStudent.innerHTML = '<option value="">Select Student</option>' +
                    allStudents.map(s => `<option value="${s.id}">${s.student_id} - ${s.full_name} (${s.course_code || 'General'})</option>`).join('');
            }
        }
    } catch (err) {
        console.error('Error fetching students for marks:', err);
    }
}

async function loadMarks() {
    const student_id = document.getElementById('filter-mark-student').value;
    const exam_name = document.getElementById('filter-exam-name').value.trim();
    const subject = document.getElementById('filter-subject').value.trim();

    const params = {};
    if (student_id) params.student_id = student_id;
    if (exam_name) params.exam_name = exam_name;
    if (subject) params.subject = subject;

    const tbody = document.getElementById('marks-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading marks records...</h4>
            </td>
        </tr>
    `;

    try {
        const res = await API.get('/api/marks', params);
        if (res.success) {
            renderMarksTable(res.marks || []);
            document.getElementById('marks-count-badge').textContent = `${res.count} record(s) found`;
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                    <h4>Failed to load marks</h4>
                    <p>${err.message}</p>
                </td>
            </tr>
        `;
    }
}

function getGradeBadgeClass(grade) {
    switch (grade) {
        case 'A+':
        case 'A':
            return 'badge-grade-a';
        case 'B':
            return 'badge-grade-b';
        case 'C':
            return 'badge-grade-c';
        case 'D':
        case 'F':
            return 'badge-grade-f';
        default:
            return '';
    }
}

function renderMarksTable(marks) {
    const tbody = document.getElementById('marks-tbody');

    if (marks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fa-solid fa-award"></i>
                    <h4>No examination records found</h4>
                    <p>Click "Enter Marks" to add grade entries.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = marks.map(m => `
        <tr>
            <td><strong>${m.student_code}</strong></td>
            <td>
                <div style="font-weight: 600;">${m.full_name}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">${m.course_name || 'General'}</div>
            </td>
            <td>${m.exam_name}</td>
            <td>${m.subject}</td>
            <td><strong>${m.marks_obtained}</strong> / ${m.total_marks}</td>
            <td><strong>${m.percentage}%</strong></td>
            <td>
                <span class="badge badge-grade ${getGradeBadgeClass(m.grade)}">
                    ${m.grade}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon edit" onclick="openEditMarksModal(${m.id})" title="Edit Mark">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="confirmDeleteMark(${m.id})" title="Delete Mark">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Filters
    document.getElementById('filter-mark-student').addEventListener('change', () => loadMarks());
    
    let debounceTimer;
    const filterExam = document.getElementById('filter-exam-name');
    const filterSubject = document.getElementById('filter-subject');

    [filterExam, filterSubject].forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadMarks(), 300);
        });
    });

    document.getElementById('btn-reset-marks-filter').addEventListener('click', () => {
        document.getElementById('filter-mark-student').value = '';
        filterExam.value = '';
        filterSubject.value = '';
        loadMarks();
    });

    // Add Marks button
    document.getElementById('btn-add-marks').addEventListener('click', openAddMarksModal);

    // Form submit
    document.getElementById('marks-form').addEventListener('submit', handleMarksSubmit);

    // Dynamic Live Calculation of Percentage and Grade in the Modal
    const obtainedInput = document.getElementById('mark-obtained');
    const totalInput = document.getElementById('mark-total');

    const recalculateLive = () => {
        const obtained = parseFloat(obtainedInput.value);
        const total = parseFloat(totalInput.value);

        if (!isNaN(obtained) && !isNaN(total) && total > 0 && obtained >= 0) {
            const pct = Math.min(Math.round((obtained / total) * 10000) / 100, 100);
            document.getElementById('preview-percentage').textContent = `${pct}%`;

            let grade = 'F';
            if (pct >= 90) grade = 'A+';
            else if (pct >= 80) grade = 'A';
            else if (pct >= 70) grade = 'B';
            else if (pct >= 60) grade = 'C';
            else if (pct >= 40) grade = 'D';

            document.getElementById('preview-grade').textContent = grade;
        } else {
            document.getElementById('preview-percentage').textContent = '-';
            document.getElementById('preview-grade').textContent = '-';
        }
    };

    obtainedInput.addEventListener('input', recalculateLive);
    totalInput.addEventListener('input', recalculateLive);

    // Delete modal action
    document.getElementById('btn-confirm-delete-mark').addEventListener('click', handleDeleteMark);
}

function openAddMarksModal() {
    document.getElementById('marks-modal-title').textContent = 'Enter Exam Marks';
    document.getElementById('marks-form').reset();
    document.getElementById('mark-pk-id').value = '';
    document.getElementById('mark-total').value = '100';
    document.getElementById('preview-percentage').textContent = '-';
    document.getElementById('preview-grade').textContent = '-';
    openModal('marks-form-modal');
}

async function openEditMarksModal(id) {
    try {
        const res = await API.get(`/api/marks/${id}`);
        if (!res.success) {
            showToast('Failed to fetch marks record', 'error');
            return;
        }

        const m = res.mark;
        document.getElementById('marks-modal-title').textContent = `Edit Marks - ${m.student_code}`;
        document.getElementById('mark-pk-id').value = m.id;
        document.getElementById('mark-student-id').value = m.student_id;
        document.getElementById('mark-exam-name').value = m.exam_name;
        document.getElementById('mark-subject').value = m.subject;
        document.getElementById('mark-obtained').value = m.marks_obtained;
        document.getElementById('mark-total').value = m.total_marks;
        document.getElementById('preview-percentage').textContent = `${m.percentage}%`;
        document.getElementById('preview-grade').textContent = m.grade;

        openModal('marks-form-modal');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function handleMarksSubmit(e) {
    e.preventDefault();

    const pkId = document.getElementById('mark-pk-id').value;
    const isEdit = Boolean(pkId);

    const payload = {
        student_id: document.getElementById('mark-student-id').value,
        exam_name: document.getElementById('mark-exam-name').value.trim(),
        subject: document.getElementById('mark-subject').value.trim(),
        marks_obtained: parseFloat(document.getElementById('mark-obtained').value),
        total_marks: parseFloat(document.getElementById('mark-total').value)
    };

    if (payload.marks_obtained < 0 || payload.marks_obtained > payload.total_marks) {
        showToast('Marks obtained cannot be negative or exceed total marks', 'warning');
        return;
    }

    const submitBtn = document.getElementById('btn-save-marks');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        let res;
        if (isEdit) {
            res = await API.put(`/api/marks/${pkId}`, payload);
        } else {
            res = await API.post('/api/marks', payload);
        }

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('marks-form-modal');
            loadMarks();
        } else {
            showToast(res.message || 'Operation failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Marks';
    }
}

function confirmDeleteMark(id) {
    currentDeleteMarkId = id;
    openModal('mark-delete-modal');
}

async function handleDeleteMark() {
    if (!currentDeleteMarkId) return;

    const btn = document.getElementById('btn-confirm-delete-mark');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const res = await API.delete(`/api/marks/${currentDeleteMarkId}`);
        if (res.success) {
            showToast(res.message, 'success');
            closeModal('mark-delete-modal');
            currentDeleteMarkId = null;
            loadMarks();
        } else {
            showToast(res.message || 'Failed to delete record', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete Record';
    }
}
