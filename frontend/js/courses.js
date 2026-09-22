/**
 * Student Management System - Course Module Controller
 */

let currentDeleteCourseId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
    setupEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openAddCourseModal();
    }
});

async function loadCourses() {
    const tbody = document.getElementById('courses-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading courses...</h4>
            </td>
        </tr>
    `;

    try {
        const res = await API.get('/api/courses');
        if (res.success) {
            renderCoursesTable(res.courses || []);
            document.getElementById('courses-count-badge').textContent = `${res.courses.length} course(s) available`;
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                    <h4>Failed to load courses</h4>
                    <p>${err.message}</p>
                </td>
            </tr>
        `;
    }
}

function renderCoursesTable(courses) {
    const tbody = document.getElementById('courses-tbody');

    if (courses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-book-open"></i>
                    <h4>No courses found</h4>
                    <p>Click "Add Course" to add your first educational program.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = courses.map(c => `
        <tr>
            <td><span class="badge badge-course">${c.course_code}</span></td>
            <td><strong>${c.course_name}</strong></td>
            <td>${c.duration}</td>
            <td style="max-width: 280px; color: var(--text-secondary); font-size: 13px;">${c.description || 'No description provided.'}</td>
            <td>
                <span class="badge" style="background-color: #eff6ff; color: #2563eb;">
                    ${c.enrolled_students || 0} student(s)
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon edit" onclick="openEditCourseModal(${c.id})" title="Edit Course">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="confirmDeleteCourse(${c.id}, '${c.course_name.replace(/'/g, "\\'")}')" title="Delete Course">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Add Course button
    document.getElementById('btn-add-course').addEventListener('click', openAddCourseModal);

    // Form submit
    document.getElementById('course-form').addEventListener('submit', handleCourseFormSubmit);

    // Confirm delete
    document.getElementById('btn-confirm-delete-course').addEventListener('click', handleDeleteCourse);
}

function openAddCourseModal() {
    document.getElementById('course-modal-title').textContent = 'Add New Course';
    document.getElementById('course-form').reset();
    document.getElementById('course-pk-id').value = '';
    openModal('course-form-modal');
}

async function openEditCourseModal(id) {
    try {
        const res = await API.get(`/api/courses/${id}`);
        if (!res.success) {
            showToast('Failed to fetch course details', 'error');
            return;
        }

        const c = res.course;
        document.getElementById('course-modal-title').textContent = `Edit Course - ${c.course_code}`;
        document.getElementById('course-pk-id').value = c.id;
        document.getElementById('course-code').value = c.course_code;
        document.getElementById('course-name').value = c.course_name;
        document.getElementById('course-duration').value = c.duration;
        document.getElementById('course-description').value = c.description || '';

        openModal('course-form-modal');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function handleCourseFormSubmit(e) {
    e.preventDefault();

    const pkId = document.getElementById('course-pk-id').value;
    const isEdit = Boolean(pkId);

    const payload = {
        course_code: document.getElementById('course-code').value.trim(),
        course_name: document.getElementById('course-name').value.trim(),
        duration: document.getElementById('course-duration').value.trim(),
        description: document.getElementById('course-description').value.trim()
    };

    const submitBtn = document.getElementById('btn-save-course');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        let res;
        if (isEdit) {
            res = await API.put(`/api/courses/${pkId}`, payload);
        } else {
            res = await API.post('/api/courses', payload);
        }

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('course-form-modal');
            loadCourses();
        } else {
            showToast(res.message || 'Operation failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Course';
    }
}

function confirmDeleteCourse(id, name) {
    currentDeleteCourseId = id;
    document.getElementById('delete-course-name').textContent = name;
    openModal('course-delete-modal');
}

async function handleDeleteCourse() {
    if (!currentDeleteCourseId) return;

    const btn = document.getElementById('btn-confirm-delete-course');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const res = await API.delete(`/api/courses/${currentDeleteCourseId}`);
        if (res.success) {
            showToast(res.message, 'success');
            closeModal('course-delete-modal');
            currentDeleteCourseId = null;
            loadCourses();
        } else {
            showToast(res.message || 'Failed to delete course', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete Course';
    }
}
