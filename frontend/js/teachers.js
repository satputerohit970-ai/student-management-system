/**
 * Student Management System - Teacher Module Controller
 */

let currentDeleteTeacherId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTeachers();
    setupEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openAddTeacherModal();
    }
});

async function loadTeachers() {
    const tbody = document.getElementById('teachers-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading faculty members...</h4>
            </td>
        </tr>
    `;

    try {
        const res = await API.get('/api/teachers');
        if (res.success) {
            renderTeachersTable(res.teachers || []);
            document.getElementById('teachers-count-badge').textContent = `${res.teachers.length} teacher(s) registered`;
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                    <h4>Failed to load teachers</h4>
                    <p>${err.message}</p>
                </td>
            </tr>
        `;
    }
}

function renderTeachersTable(teachers) {
    const tbody = document.getElementById('teachers-tbody');

    if (teachers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-chalkboard-user"></i>
                    <h4>No faculty members registered</h4>
                    <p>Click "Add Teacher" to add your first instructor.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #fef3c7; color: #b45309; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                        ${t.teacher_name.charAt(0)}
                    </div>
                    <strong>${t.teacher_name}</strong>
                </div>
            </td>
            <td><a href="mailto:${t.email}" style="color: var(--primary);"><i class="fa-regular fa-envelope"></i> ${t.email}</a></td>
            <td>${t.mobile_number}</td>
            <td><span class="badge" style="background-color: #f3e8ff; color: #6b21a8; font-weight: 600;">${t.subject}</span></td>
            <td>${t.created_at ? t.created_at.split('T')[0] : '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon edit" onclick="openEditTeacherModal(${t.id})" title="Edit Teacher">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="confirmDeleteTeacher(${t.id}, '${t.teacher_name.replace(/'/g, "\\'")}')" title="Delete Teacher">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Add Teacher button
    document.getElementById('btn-add-teacher').addEventListener('click', openAddTeacherModal);

    // Form submit
    document.getElementById('teacher-form').addEventListener('submit', handleTeacherFormSubmit);

    // Confirm delete
    document.getElementById('btn-confirm-delete-teacher').addEventListener('click', handleDeleteTeacher);
}

function openAddTeacherModal() {
    document.getElementById('teacher-modal-title').textContent = 'Add New Teacher';
    document.getElementById('teacher-form').reset();
    document.getElementById('teacher-pk-id').value = '';
    openModal('teacher-form-modal');
}

async function openEditTeacherModal(id) {
    try {
        const res = await API.get(`/api/teachers/${id}`);
        if (!res.success) {
            showToast('Failed to fetch teacher details', 'error');
            return;
        }

        const t = res.teacher;
        document.getElementById('teacher-modal-title').textContent = `Edit Teacher - ${t.teacher_name}`;
        document.getElementById('teacher-pk-id').value = t.id;
        document.getElementById('teacher-name').value = t.teacher_name;
        document.getElementById('teacher-email').value = t.email;
        document.getElementById('teacher-mobile').value = t.mobile_number;
        document.getElementById('teacher-subject').value = t.subject;

        openModal('teacher-form-modal');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function handleTeacherFormSubmit(e) {
    e.preventDefault();

    const pkId = document.getElementById('teacher-pk-id').value;
    const isEdit = Boolean(pkId);

    const payload = {
        teacher_name: document.getElementById('teacher-name').value.trim(),
        email: document.getElementById('teacher-email').value.trim(),
        mobile_number: document.getElementById('teacher-mobile').value.trim(),
        subject: document.getElementById('teacher-subject').value.trim()
    };

    const submitBtn = document.getElementById('btn-save-teacher');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        let res;
        if (isEdit) {
            res = await API.put(`/api/teachers/${pkId}`, payload);
        } else {
            res = await API.post('/api/teachers', payload);
        }

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('teacher-form-modal');
            loadTeachers();
        } else {
            showToast(res.message || 'Operation failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Teacher';
    }
}

function confirmDeleteTeacher(id, name) {
    currentDeleteTeacherId = id;
    document.getElementById('delete-teacher-name').textContent = name;
    openModal('teacher-delete-modal');
}

async function handleDeleteTeacher() {
    if (!currentDeleteTeacherId) return;

    const btn = document.getElementById('btn-confirm-delete-teacher');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const res = await API.delete(`/api/teachers/${currentDeleteTeacherId}`);
        if (res.success) {
            showToast(res.message, 'success');
            closeModal('teacher-delete-modal');
            currentDeleteTeacherId = null;
            loadTeachers();
        } else {
            showToast(res.message || 'Failed to delete teacher', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete Teacher';
    }
}
