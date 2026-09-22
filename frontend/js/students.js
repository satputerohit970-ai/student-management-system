/**
 * Student Management System - Student Module Controller
 */

let allCourses = [];
let currentDeleteStudentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadCoursesDropdown();
    await loadStudents();
    setupEventListeners();

    // Check URL parameters (e.g. ?action=add, ?action=face)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openAddStudentModal();
    } else if (urlParams.get('action') === 'face') {
        const faceId = urlParams.get('id');
        const faceName = urlParams.get('name');
        const faceCode = urlParams.get('code');
        if (faceId && faceName) {
            openRegisterFaceModal(parseInt(faceId), decodeURIComponent(faceName), decodeURIComponent(faceCode || ''));
        } else {
            openRegisterFaceModalForAny();
        }
    }
});

async function loadCoursesDropdown() {
    try {
        const res = await API.get('/api/courses');
        if (res.success) {
            allCourses = res.courses || [];
            
            // Populate filter dropdown
            const filterCourse = document.getElementById('filter-course');
            if (filterCourse) {
                filterCourse.innerHTML = '<option value="">All Courses</option>' +
                    allCourses.map(c => `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`).join('');
            }

            // Populate form modal course dropdown
            const formCourse = document.getElementById('student-course-id');
            if (formCourse) {
                formCourse.innerHTML = '<option value="">Select Course</option>' +
                    allCourses.map(c => `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`).join('');
            }
        }
    } catch (err) {
        console.error('Error fetching courses for dropdown:', err);
    }
}

async function loadStudents() {
    const search = document.getElementById('search-input').value.trim();
    const course_id = document.getElementById('filter-course').value;
    const year = document.getElementById('filter-year').value;
    const gender = document.getElementById('filter-gender').value;

    const params = {};
    if (search) params.search = search;
    if (course_id) params.course_id = course_id;
    if (year) params.year = year;
    if (gender) params.gender = gender;

    const tbody = document.getElementById('students-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading student records...</h4>
            </td>
        </tr>
    `;

    try {
        const res = await API.get('/api/students', params);
        if (res.success) {
            renderStudentsTable(res.students || []);
            document.getElementById('students-count-badge').textContent = `${res.count} student(s) found`;
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                    <h4>Failed to load students</h4>
                    <p>${err.message}</p>
                </td>
            </tr>
        `;
    }
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('students-tbody');

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fa-solid fa-user-slash"></i>
                    <h4>No students match your criteria</h4>
                    <p>Try refining your search or add a new student.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(s => {
        const hasFace = Boolean(s.has_face_registered);
        const safeName = (s.full_name || '').replace(/'/g, "\\'");
        const faceBadge = hasFace 
            ? `<button type="button" class="btn btn-sm" onclick="openRegisterFaceModal(${s.id}, '${safeName}', '${s.student_id}')" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; font-size: 11.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;" title="Click to view or update registered face"><i class="fa-solid fa-circle-check"></i> Face Added</button>`
            : `<button type="button" class="btn btn-sm btn-primary" onclick="openRegisterFaceModal(${s.id}, '${safeName}', '${s.student_id}')" style="padding: 4px 10px; font-size: 11.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;" title="Click to add student face"><i class="fa-solid fa-camera"></i> Add Face</button>`;

        return `
        <tr>
            <td><strong>${s.student_id}</strong></td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${s.full_name}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);"><i class="fa-regular fa-envelope"></i> ${s.email}</div>
            </td>
            <td>${faceBadge}</td>
            <td>${s.mobile_number}</td>
            <td><span class="badge badge-course">${s.course_code || 'N/A'}</span></td>
            <td>${s.year}</td>
            <td>
                <span class="badge" style="background-color: ${s.gender === 'Male' ? '#e0f2fe' : s.gender === 'Female' ? '#fce7f3' : '#f3e8ff'}; color: #1e293b;">
                    ${s.gender}
                </span>
            </td>
            <td>${s.admission_date}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" style="color: ${hasFace ? '#059669' : '#0284c7'};" onclick="openRegisterFaceModal(${s.id}, '${safeName}', '${s.student_id}')" title="${hasFace ? 'Update Registered Face' : 'Register Student Face'}">
                        <i class="fa-solid fa-face-viewfinder"></i>
                    </button>
                    <button class="btn-icon edit" onclick="openEditStudentModal(${s.id})" title="Edit Student">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="confirmDeleteStudent(${s.id}, '${safeName}')" title="Delete Student">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function setupEventListeners() {
    // Search input with debounce
    let searchTimeout;
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadStudents(), 300);
    });

    // Filters
    document.getElementById('filter-course').addEventListener('change', () => loadStudents());
    document.getElementById('filter-year').addEventListener('change', () => loadStudents());
    document.getElementById('filter-gender').addEventListener('change', () => loadStudents());

    // Reset filters
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        searchInput.value = '';
        document.getElementById('filter-course').value = '';
        document.getElementById('filter-year').value = '';
        document.getElementById('filter-gender').value = '';
        loadStudents();
    });

    // Add Student button
    document.getElementById('btn-add-student').addEventListener('click', () => {
        openAddStudentModal();
    });

    // Form submit
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);

    // Confirm delete button in delete modal
    document.getElementById('btn-confirm-delete').addEventListener('click', handleDeleteStudent);

    // Toolbar Register Face shortcut
    const btnOpenFaceReg = document.getElementById('btn-open-face-reg-toolbar');
    if (btnOpenFaceReg) {
        btnOpenFaceReg.addEventListener('click', openRegisterFaceModalForAny);
    }

    // Face registration modal events
    const btnRegCamera = document.getElementById('btn-reg-start-camera');
    if (btnRegCamera) btnRegCamera.addEventListener('click', toggleFaceRegCamera);

    const btnRegCapture = document.getElementById('btn-reg-capture');
    if (btnRegCapture) btnRegCapture.addEventListener('click', captureFaceRegSnapshot);

    const faceFileInput = document.getElementById('face-reg-file-input');
    if (faceFileInput) faceFileInput.addEventListener('change', handleFaceFileUpload);

    const btnSaveFace = document.getElementById('btn-save-face-profile');
    if (btnSaveFace) btnSaveFace.addEventListener('click', saveRegisteredFace);

    const facePicker = document.getElementById('face-reg-student-picker');
    if (facePicker) {
        facePicker.addEventListener('change', (e) => {
            const sid = e.target.value;
            if (sid) {
                const opt = e.target.options[e.target.selectedIndex];
                const sName = opt.getAttribute('data-name') || opt.text;
                const sCode = opt.getAttribute('data-code') || '';
                loadFaceModalForStudent(parseInt(sid), sName, sCode);
            }
        });
    }

    // Stop camera when face registration modal is closed
    const faceModal = document.getElementById('modal-register-face');
    if (faceModal) {
        const handleCloseFaceModal = () => {
            stopFaceRegCamera();
            window.history.replaceState({}, document.title, window.location.pathname);
        };
        faceModal.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(b => {
            b.addEventListener('click', handleCloseFaceModal);
        });
        faceModal.addEventListener('click', (e) => {
            if (e.target === faceModal) handleCloseFaceModal();
        });
    }
}

function openAddStudentModal() {
    document.getElementById('student-modal-title').textContent = 'Add New Student';
    document.getElementById('student-form').reset();
    document.getElementById('student-pk-id').value = '';
    
    // Set default admission date to today
    document.getElementById('student-admission-date').value = new Date().toISOString().split('T')[0];
    
    openModal('student-form-modal');
}

async function openEditStudentModal(id) {
    try {
        const res = await API.get(`/api/students/${id}`);
        if (!res.success) {
            showToast('Failed to fetch student details', 'error');
            return;
        }

        const s = res.student;
        document.getElementById('student-modal-title').textContent = `Edit Student - ${s.student_id}`;
        document.getElementById('student-pk-id').value = s.id;
        document.getElementById('student-code').value = s.student_id;
        document.getElementById('student-full-name').value = s.full_name;
        document.getElementById('student-email').value = s.email;
        document.getElementById('student-mobile').value = s.mobile_number;
        document.getElementById('student-dob').value = s.date_of_birth;
        document.getElementById('student-gender').value = s.gender;
        document.getElementById('student-course-id').value = s.course_id || '';
        document.getElementById('student-year').value = s.year;
        document.getElementById('student-admission-date').value = s.admission_date;
        document.getElementById('student-address').value = s.address || '';

        openModal('student-form-modal');
    } catch (err) {
        showToast('Error loading student: ' + err.message, 'error');
    }
}

async function handleStudentFormSubmit(e) {
    e.preventDefault();

    const pkId = document.getElementById('student-pk-id').value;
    const isEdit = Boolean(pkId);

    const payload = {
        student_id: document.getElementById('student-code').value.trim(),
        full_name: document.getElementById('student-full-name').value.trim(),
        email: document.getElementById('student-email').value.trim(),
        mobile_number: document.getElementById('student-mobile').value.trim(),
        date_of_birth: document.getElementById('student-dob').value,
        gender: document.getElementById('student-gender').value,
        course_id: document.getElementById('student-course-id').value || null,
        year: document.getElementById('student-year').value,
        admission_date: document.getElementById('student-admission-date').value,
        address: document.getElementById('student-address').value.trim()
    };

    const submitBtn = document.getElementById('btn-save-student');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        let res;
        if (isEdit) {
            res = await API.put(`/api/students/${pkId}`, payload);
        } else {
            res = await API.post('/api/students', payload);
        }

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('student-form-modal');
            loadStudents();
        } else {
            showToast(res.message || 'Operation failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Student';
    }
}

function confirmDeleteStudent(id, name) {
    currentDeleteStudentId = id;
    document.getElementById('delete-student-name').textContent = name;
    openModal('student-delete-modal');
}

async function handleDeleteStudent() {
    if (!currentDeleteStudentId) return;

    const btn = document.getElementById('btn-confirm-delete');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const res = await API.delete(`/api/students/${currentDeleteStudentId}`);
        if (res.success) {
            showToast(res.message, 'success');
            closeModal('student-delete-modal');
            currentDeleteStudentId = null;
            loadStudents();
        } else {
            showToast(res.message || 'Failed to delete student', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete Student';
    }
}

// ==========================================
// STUDENT FACE REGISTRATION BIOMETRIC LOGIC
// ==========================================
let faceRegStream = null;
let currentFaceRegStudentId = null;
let capturedFaceBase64 = null;

async function openRegisterFaceModal(id, name, studentCode) {
    currentFaceRegStudentId = id;
    capturedFaceBase64 = null;

    const infoBar = document.getElementById('face-reg-info-bar');
    const pickerWrapper = document.getElementById('face-reg-picker-wrapper');
    if (infoBar) infoBar.style.display = 'flex';
    if (pickerWrapper) pickerWrapper.style.display = 'none';

    document.getElementById('face-reg-student-id').value = id;
    document.getElementById('face-reg-student-name').textContent = name;
    document.getElementById('face-reg-student-code').textContent = studentCode;

    const statusBadge = document.getElementById('face-reg-current-status');
    const placeholder = document.getElementById('face-reg-placeholder');
    const previewImg = document.getElementById('face-reg-preview-img');
    const video = document.getElementById('face-reg-video');
    const hud = document.getElementById('face-reg-hud');
    const btnSave = document.getElementById('btn-save-face-profile');
    const btnCapture = document.getElementById('btn-reg-capture');

    // Reset UI state
    stopFaceRegCamera();
    if (video) video.style.display = 'none';
    if (hud) hud.style.display = 'none';
    if (previewImg) {
        previewImg.style.display = 'none';
        previewImg.src = '';
    }
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.innerHTML = `
            <i class="fa-solid fa-camera-retro" style="font-size: 40px; margin-bottom: 10px; color: #64748b;"></i>
            <p style="font-size: 13px; color: #cbd5e1; margin: 0;">Start Camera or Upload a photo of student's face</p>
        `;
    }
    if (btnSave) btnSave.disabled = true;
    if (btnCapture) btnCapture.disabled = true;

    statusBadge.innerHTML = '<span class="badge" style="background-color: #f1f5f9; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</span>';

    openModal('modal-register-face');

    try {
        const res = await API.get(`/api/students/${id}/face`);
        if (res.success && res.has_face_registered && res.face_data) {
            statusBadge.innerHTML = '<span class="badge" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"><i class="fa-solid fa-circle-check"></i> Registered</span>';
            capturedFaceBase64 = res.face_data;
            if (previewImg) {
                previewImg.src = res.face_data;
                previewImg.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (btnSave) btnSave.disabled = false;
        } else {
            statusBadge.innerHTML = '<span class="badge" style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;"><i class="fa-solid fa-circle-xmark"></i> Not Registered</span>';
        }
    } catch (err) {
        statusBadge.innerHTML = '<span class="badge" style="background-color: #f1f5f9; color: #64748b;">Not Registered</span>';
    }
}

async function toggleFaceRegCamera() {
    if (faceRegStream) {
        stopFaceRegCamera();
    } else {
        await startFaceRegCamera();
    }
}

async function startFaceRegCamera() {
    const video = document.getElementById('face-reg-video');
    const placeholder = document.getElementById('face-reg-placeholder');
    const previewImg = document.getElementById('face-reg-preview-img');
    const hud = document.getElementById('face-reg-hud');
    const btnToggle = document.getElementById('btn-reg-start-camera');
    const btnCapture = document.getElementById('btn-reg-capture');

    try {
        faceRegStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
        });
        if (video) {
            video.srcObject = faceRegStream;
            video.style.display = 'block';
            video.play();
        }
        if (hud) hud.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
        if (previewImg) previewImg.style.display = 'none';

        if (btnToggle) {
            btnToggle.innerHTML = '<i class="fa-solid fa-video-slash"></i> Stop Camera';
            btnToggle.classList.add('btn-danger');
            btnToggle.classList.remove('btn-secondary');
        }
        if (btnCapture) btnCapture.disabled = false;
    } catch (err) {
        console.warn('Camera error:', err);
        showToast('Camera not available or permission denied. You can use "Upload Photo" instead.', 'warning');
    }
}

function stopFaceRegCamera() {
    const video = document.getElementById('face-reg-video');
    const hud = document.getElementById('face-reg-hud');
    const btnToggle = document.getElementById('btn-reg-start-camera');
    const btnCapture = document.getElementById('btn-reg-capture');

    if (faceRegStream) {
        faceRegStream.getTracks().forEach(t => t.stop());
        faceRegStream = null;
    }
    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
    if (hud) hud.style.display = 'none';

    if (btnToggle) {
        btnToggle.innerHTML = '<i class="fa-solid fa-video"></i> Start Camera';
        btnToggle.classList.remove('btn-danger');
        btnToggle.classList.add('btn-secondary');
    }
    if (btnCapture) btnCapture.disabled = true;
}

function captureFaceRegSnapshot() {
    const video = document.getElementById('face-reg-video');
    const canvas = document.getElementById('face-reg-canvas');
    const previewImg = document.getElementById('face-reg-preview-img');
    const placeholder = document.getElementById('face-reg-placeholder');
    const btnSave = document.getElementById('btn-save-face-profile');

    if (!video || !video.videoWidth) {
        showToast('Camera stream not ready yet. Please wait a moment.', 'warning');
        return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const squareSide = Math.min(vw, vh);
    const sx = Math.floor((vw - squareSide) / 2);
    const sy = Math.floor((vh - squareSide) / 2);

    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    
    // Draw mirrored to match video display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, squareSide, squareSide, 0, 0, 320, 320);
    
    capturedFaceBase64 = canvas.toDataURL('image/jpeg', 0.88);

    // Stop webcam and show captured snapshot
    stopFaceRegCamera();

    if (previewImg) {
        previewImg.src = capturedFaceBase64;
        previewImg.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (btnSave) btnSave.disabled = false;

    showToast('Face captured! Click "Save Face Profile" to register.', 'success');
}

function handleFaceFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG).', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        capturedFaceBase64 = evt.target.result;
        stopFaceRegCamera();

        const previewImg = document.getElementById('face-reg-preview-img');
        const placeholder = document.getElementById('face-reg-placeholder');
        const btnSave = document.getElementById('btn-save-face-profile');

        if (previewImg) {
            previewImg.src = capturedFaceBase64;
            previewImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (btnSave) btnSave.disabled = false;

        showToast('Photo uploaded! Click "Save Face Profile" to register.', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
}

async function saveRegisteredFace() {
    // 1. If student wasn't selected directly, check student picker dropdown
    const picker = document.getElementById('face-reg-student-picker');
    if (!currentFaceRegStudentId && picker && picker.value) {
        currentFaceRegStudentId = parseInt(picker.value);
    }

    if (!currentFaceRegStudentId) {
        showToast('Please choose a student from the list first', 'warning');
        return;
    }

    // 2. If camera stream is currently active, AUTOMATICALLY capture the frame!
    if (faceRegStream) {
        captureFaceRegSnapshot();
    }

    if (!capturedFaceBase64) {
        showToast('Please click "Start Camera" to capture your face, or "Upload Photo"', 'warning');
        return;
    }

    const btnSave = document.getElementById('btn-save-face-profile');
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Face...';

    try {
        const res = await API.post(`/api/students/${currentFaceRegStudentId}/register-face`, {
            face_image: capturedFaceBase64
        });

        if (res.success) {
            showToast(res.message, 'success');
            stopFaceRegCamera();
            closeModal('modal-register-face');
            window.history.replaceState({}, document.title, window.location.pathname);
            await loadStudents();
        } else {
            showToast(res.message || 'Failed to save face profile', 'error');
        }
    } catch (err) {
        showToast('Error registering face: ' + err.message, 'error');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Face Profile';
    }
}

async function openRegisterFaceModalForAny() {
    const pickerWrapper = document.getElementById('face-reg-picker-wrapper');
    const infoBar = document.getElementById('face-reg-info-bar');
    const picker = document.getElementById('face-reg-student-picker');

    if (pickerWrapper) pickerWrapper.style.display = 'block';
    if (infoBar) infoBar.style.display = 'none';

    // Populate picker with current students
    try {
        const res = await API.get('/api/students');
        const students = (res.success && res.students) ? res.students : [];
        if (picker) {
            picker.innerHTML = '<option value="">-- Choose Student to Register Face --</option>' +
                students.map(s => `<option value="${s.id}" data-name="${s.full_name}" data-code="${s.student_id}">${s.student_id} - ${s.full_name} (${s.has_face_registered ? 'Face Added' : 'No Face'})</option>`).join('');
            
            // Auto select first student if none selected
            if (students.length > 0) {
                picker.value = students[0].id;
                loadFaceModalForStudent(students[0].id, students[0].full_name, students[0].student_id);
            }
        }
    } catch (e) {
        console.error('Error loading students for face picker:', e);
    }

    // Reset preview
    capturedFaceBase64 = null;
    stopFaceRegCamera();

    const video = document.getElementById('face-reg-video');
    const hud = document.getElementById('face-reg-hud');
    const previewImg = document.getElementById('face-reg-preview-img');
    const placeholder = document.getElementById('face-reg-placeholder');

    if (video) video.style.display = 'none';
    if (hud) hud.style.display = 'none';
    if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
    if (placeholder) placeholder.style.display = 'block';

    openModal('modal-register-face');
}

async function loadFaceModalForStudent(id, name, studentCode) {
    currentFaceRegStudentId = id;
    const hiddenId = document.getElementById('face-reg-student-id');
    if (hiddenId) hiddenId.value = id;

    const nameEl = document.getElementById('face-reg-student-name');
    if (nameEl) nameEl.textContent = name;

    const codeEl = document.getElementById('face-reg-student-code');
    if (codeEl) codeEl.textContent = studentCode;

    const statusBadge = document.getElementById('face-reg-current-status');
    const previewImg = document.getElementById('face-reg-preview-img');
    const placeholder = document.getElementById('face-reg-placeholder');

    try {
        const res = await API.get(`/api/students/${id}/face`);
        if (res.success && res.has_face_registered && res.face_data) {
            if (statusBadge) {
                statusBadge.innerHTML = `
                    <span class="badge" style="background-color: #ecfdf5; color: #047857; font-size: 12px; padding: 4px 10px;">
                        <i class="fa-solid fa-circle-check"></i> Face Saved in Database
                    </span>
                    <a href="attendance.html?action=scan&student_id=${id}" class="btn btn-sm btn-primary" style="margin-left: 8px; font-size: 11.5px; padding: 3px 10px; text-decoration: none;" title="Go to Attendance Live Face Scanner">
                        <i class="fa-solid fa-camera"></i> Scan Attendance Now
                    </a>
                `;
            }
            capturedFaceBase64 = res.face_data;
            if (previewImg) { previewImg.src = res.face_data; previewImg.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        } else {
            if (statusBadge) statusBadge.innerHTML = '<span class="badge" style="background-color: #fee2e2; color: #991b1b;"><i class="fa-solid fa-circle-xmark"></i> Not Registered</span>';
            capturedFaceBase64 = null;
            if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
            if (placeholder) placeholder.style.display = 'block';
        }
    } catch (e) {
        // ignore
    }
}
