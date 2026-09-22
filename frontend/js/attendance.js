/**
 * Student Management System - Attendance Module Controller with Absentee Messaging
 */

let allStudents = [];
let currentAbsentRecords = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Set default date input to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('filter-attendance-date');
    if (dateInput) dateInput.value = today;

    const modalDate = document.getElementById('att-date');
    if (modalDate) modalDate.value = today;

    await loadStudentsDropdown();
    await loadAttendanceRecords();
    setupEventListeners();

    // Check URL parameters (e.g. ?action=scan&student_id=...)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'scan') {
        const targetSid = urlParams.get('student_id');
        openModal('face-scanner-modal');
        if (targetSid && document.getElementById('face-student-select')) {
            document.getElementById('face-student-select').value = targetSid;
        }
        startWebcam();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

async function loadStudentsDropdown() {
    try {
        const res = await API.get('/api/students');
        if (res.success) {
            allStudents = res.students || [];

            // Populate filter student dropdown
            const filterStudent = document.getElementById('filter-student');
            if (filterStudent) {
                filterStudent.innerHTML = '<option value="">All Students</option>' +
                    allStudents.map(s => `<option value="${s.id}">${s.student_id} - ${s.full_name}</option>`).join('');
            }

            // Populate form modal student dropdown
            const formStudent = document.getElementById('att-student-id');
            if (formStudent) {
                formStudent.innerHTML = '<option value="">Select Student</option>' +
                    allStudents.map(s => `<option value="${s.id}">${s.student_id} - ${s.full_name} (${s.course_code || 'General'})</option>`).join('');
            }

            // Populate face scan modal student dropdown
            const faceStudentSelect = document.getElementById('face-student-select');
            if (faceStudentSelect) {
                faceStudentSelect.innerHTML = '<option value="">-- Detect Any Registered Face Automatically (Default) --</option>' +
                    allStudents.map(s => {
                        const tag = s.has_face_registered ? '✓ Face Registered' : 'No Face';
                        return `<option value="${s.id}">${s.student_id} - ${s.full_name} (${tag})</option>`;
                    }).join('');
            }
        }
    } catch (err) {
        console.error('Error fetching students for attendance dropdown:', err);
    }
}

async function loadAttendanceRecords() {
    const date = document.getElementById('filter-attendance-date').value;
    const student_id = document.getElementById('filter-student').value;
    const status = document.getElementById('filter-status').value;

    const params = {};
    if (date) params.date = date;
    if (student_id) params.student_id = student_id;
    if (status) params.status = status;

    const tbody = document.getElementById('attendance-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading attendance records...</h4>
            </td>
        </tr>
    `;

    try {
        const res = await API.get('/api/attendance', params);
        if (res.success) {
            const records = res.attendance || [];
            currentAbsentRecords = records.filter(r => r.status === 'Absent');
            renderAttendanceTable(records);
            document.getElementById('att-count-badge').textContent = `${res.count} record(s) found`;
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                    <h4>Failed to load attendance</h4>
                    <p>${err.message}</p>
                </td>
            </tr>
        `;
    }
}

function renderAttendanceTable(records) {
    const tbody = document.getElementById('attendance-tbody');

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <h4>No attendance records found</h4>
                    <p>Select another date or click "Mark Attendance" to record presence.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(r => {
        const isAbsent = r.status === 'Absent';
        const safeName = (r.full_name || '').replace(/'/g, "\\'");
        const safeCourse = (r.course_name || 'General').replace(/'/g, "\\'");
        const mobile = r.mobile_number || '';
        const email = r.email || '';

        return `
            <tr>
                <td>${r.date}</td>
                <td><strong>${r.student_code}</strong></td>
                <td>
                    <div style="font-weight: 600;">${r.full_name}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${r.course_name || 'General'} &bull; ${r.year || ''}</div>
                </td>
                <td>
                    <div><i class="fa-solid fa-phone" style="font-size: 11px; color: var(--text-muted);"></i> ${mobile || 'N/A'}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);"><i class="fa-regular fa-envelope" style="font-size: 11px;"></i> ${email || 'N/A'}</div>
                </td>
                <td>
                    <span class="badge ${isAbsent ? 'badge-absent' : 'badge-present'}">
                        <i class="fa-solid ${isAbsent ? 'fa-xmark' : 'fa-check'}"></i> ${r.status}
                    </span>
                </td>
                <td style="color: var(--text-secondary); font-size: 13px;">${r.remarks || '-'}</td>
                <td>
                    <div class="table-actions" style="justify-content: flex-end;">
                        ${isAbsent ? `
                            <button class="btn btn-sm btn-success" onclick="openSingleNotifyModal(${r.student_id}, '${r.student_code}', '${safeName}', '${mobile}', '${email}', '${r.date}', '${safeCourse}')" title="Send WhatsApp / Message to Absent Student">
                                <i class="fa-brands fa-whatsapp"></i> Alert
                            </button>
                        ` : ''}
                        <button class="btn-icon delete" onclick="deleteAttendanceRecord(${r.id})" title="Delete Record">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadAttendanceSummary() {
    const tbody = document.getElementById('attendance-summary-tbody');
    if (!tbody) return;

    try {
        const res = await API.get('/api/attendance/summary');
        if (res.success) {
            const summary = res.summary || [];
            if (summary.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No student records available.</td></tr>';
                return;
            }

            tbody.innerHTML = summary.map(s => {
                const pct = s.percentage !== null ? parseFloat(s.percentage) : 0.0;
                let color = '#10b981';
                if (pct < 60) color = '#ef4444';
                else if (pct < 75) color = '#f59e0b';

                return `
                    <tr>
                        <td><strong>${s.student_code}</strong></td>
                        <td>${s.full_name}</td>
                        <td>${s.course_name || 'General'}</td>
                        <td>${s.present_days || 0} / ${s.total_days || 0}</td>
                        <td>${s.absent_days || 0}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="flex: 1; height: 8px; background-color: #f1f5f9; border-radius: var(--radius-full); overflow: hidden; min-width: 60px;">
                                    <div style="width: ${pct}%; height: 100%; background-color: ${color}; border-radius: var(--radius-full);"></div>
                                </div>
                                <span style="font-weight: 700; color: ${color}; font-size: 13px;">${pct}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error fetching attendance summary:', err);
    }
}

async function loadNotificationLogs() {
    const tbody = document.getElementById('notifications-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading notification history...</h4>
            </td>
        </tr>
    `;

    try {
        const res = await API.get('/api/attendance/notifications');
        if (res.success) {
            const logs = res.notifications || [];
            if (logs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <i class="fa-solid fa-bell-slash"></i>
                            <h4>No alerts sent yet</h4>
                            <p>Sent WhatsApp and Email absence notices will be logged here.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = logs.map(l => `
                <tr>
                    <td>${l.created_at || '-'}</td>
                    <td>
                        <strong>${l.student_code}</strong> - ${l.recipient_name}
                    </td>
                    <td>
                        <span class="badge ${l.channel === 'WhatsApp' ? 'badge-present' : 'badge-course'}">
                            <i class="${l.channel === 'WhatsApp' ? 'fa-brands fa-whatsapp' : 'fa-solid fa-envelope'}"></i>
                            ${l.channel}
                        </span>
                    </td>
                    <td>${l.contact_info}</td>
                    <td>${l.date}</td>
                    <td style="max-width: 250px; font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${l.message.replace(/"/g, '&quot;')}">
                        ${l.message}
                    </td>
                    <td>
                        <span class="badge" style="background-color: #ecfdf5; color: #065f46;">
                            <i class="fa-solid fa-check"></i> ${l.status || 'Sent'}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load logs: ${err.message}</td></tr>`;
    }
}

function setupEventListeners() {
    // Filters
    document.getElementById('filter-attendance-date').addEventListener('change', () => loadAttendanceRecords());
    document.getElementById('filter-student').addEventListener('change', () => loadAttendanceRecords());
    document.getElementById('filter-status').addEventListener('change', () => loadAttendanceRecords());

    // Reset Filter
    document.getElementById('btn-reset-att-filter').addEventListener('click', () => {
        document.getElementById('filter-attendance-date').value = '';
        document.getElementById('filter-student').value = '';
        document.getElementById('filter-status').value = '';
        loadAttendanceRecords();
    });

    // Mark Attendance button
    document.getElementById('btn-open-mark-modal').addEventListener('click', () => {
        document.getElementById('attendance-form').reset();
        document.getElementById('att-date').value = new Date().toISOString().split('T')[0];
        openModal('attendance-form-modal');
    });

    // Form submit
    document.getElementById('attendance-form').addEventListener('submit', handleAttendanceSubmit);

    // Tab Navigation
    const tabLog = document.getElementById('tab-daily-log');
    const tabSummary = document.getElementById('tab-student-summary');
    const tabHistory = document.getElementById('tab-message-history');

    const viewLog = document.getElementById('view-daily-log');
    const viewSummary = document.getElementById('view-student-summary');
    const viewHistory = document.getElementById('view-message-history');

    const activateTab = (activeBtn, activeView) => {
        [tabLog, tabSummary, tabHistory].forEach(btn => {
            if (btn === activeBtn) {
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
            } else {
                btn.classList.add('btn-secondary');
                btn.classList.remove('btn-primary');
            }
        });

        [viewLog, viewSummary, viewHistory].forEach(v => {
            v.style.display = (v === activeView) ? 'block' : 'none';
        });
    };

    if (tabLog) tabLog.addEventListener('click', () => activateTab(tabLog, viewLog));
    if (tabSummary) tabSummary.addEventListener('click', () => {
        activateTab(tabSummary, viewSummary);
        loadAttendanceSummary();
    });
    if (tabHistory) tabHistory.addEventListener('click', () => {
        activateTab(tabHistory, viewHistory);
        loadNotificationLogs();
    });

    const btnRefreshHistory = document.getElementById('btn-refresh-history');
    if (btnRefreshHistory) {
        btnRefreshHistory.addEventListener('click', loadNotificationLogs);
    }

    // "Notify All Absent Students" button
    document.getElementById('btn-notify-all-absent').addEventListener('click', openBulkNotifyModal);

    // Single Notification Modal actions
    document.getElementById('btn-send-whatsapp').addEventListener('click', () => sendSingleNotification('WhatsApp'));
    document.getElementById('btn-send-email').addEventListener('click', () => sendSingleNotification('Email'));

    // Bulk Dispatch action
    document.getElementById('btn-dispatch-all-logs').addEventListener('click', handleBulkDispatch);

    // Live Face Scanner Modal & Controls
    const btnOpenFaceScanner = document.getElementById('btn-open-face-scanner');
    if (btnOpenFaceScanner) {
        btnOpenFaceScanner.addEventListener('click', () => {
            document.getElementById('face-match-result').style.display = 'none';
            openModal('face-scanner-modal');
            startWebcam();
        });
    }

    const btnToggleCam = document.getElementById('btn-toggle-camera');
    if (btnToggleCam) {
        btnToggleCam.addEventListener('click', () => {
            if (mediaStream) stopWebcam();
            else startWebcam();
        });
    }

    const btnScanFaceNow = document.getElementById('btn-scan-face-now');
    if (btnScanFaceNow) {
        btnScanFaceNow.addEventListener('click', handleFaceScanNow);
    }

    const faceTestFileInput = document.getElementById('face-test-file-input');
    if (faceTestFileInput) {
        faceTestFileInput.addEventListener('change', handleTestPhotoUpload);
    }

    const chkAutoScan = document.getElementById('chk-auto-scan');
    if (chkAutoScan) {
        chkAutoScan.addEventListener('change', (e) => {
            if (e.target.checked && mediaStream) {
                startAutoScanLoop();
            } else {
                stopAutoScanLoop();
            }
        });
    }

    const btnFinishAndAlert = document.getElementById('btn-finish-and-alert');
    if (btnFinishAndAlert) {
        btnFinishAndAlert.addEventListener('click', handleAutoAlertAbsentees);
    }

    const btnAutoAlertAbsentees = document.getElementById('btn-auto-alert-absentees');
    if (btnAutoAlertAbsentees) {
        btnAutoAlertAbsentees.addEventListener('click', handleAutoAlertAbsentees);
    }

    // Stop webcam when face scanner modal is closed
    document.querySelectorAll('#face-scanner-modal .modal-close-btn, #face-scanner-modal .btn-modal-cancel').forEach(btn => {
        btn.addEventListener('click', stopWebcam);
    });
}

function openSingleNotifyModal(studentId, studentCode, studentName, mobile, email, date, course) {
    document.getElementById('notify-student-id').value = studentId;
    document.getElementById('notify-date').value = date;
    document.getElementById('notify-student-name').textContent = studentName;
    document.getElementById('notify-student-code').textContent = studentCode;
    document.getElementById('notify-student-phone').textContent = mobile || 'Not Provided';
    document.getElementById('notify-student-date').textContent = date;

    const defaultMsg = 
`Dear Parent/Student,
This is an official absence alert from College Administration.

Student: ${studentName} (ID: ${studentCode})
Course: ${course}
Date: ${date}
Status: ABSENT

Regular attendance is mandatory. Please submit a leave application or contact the college office.`;

    document.getElementById('notify-message-text').value = defaultMsg;
    openModal('single-notify-modal');
}

async function sendSingleNotification(channel) {
    const studentId = document.getElementById('notify-student-id').value;
    const date = document.getElementById('notify-date').value;
    const customMessage = document.getElementById('notify-message-text').value.trim();

    const btn = channel === 'WhatsApp' ? document.getElementById('btn-send-whatsapp') : document.getElementById('btn-send-email');
    btn.disabled = true;

    try {
        const res = await API.post('/api/attendance/notify', {
            student_ids: [parseInt(studentId)],
            date: date,
            channel: channel,
            custom_message: customMessage
        });

        if (res.success && res.notifications && res.notifications.length > 0) {
            const notif = res.notifications[0];
            showToast(`Absence alert saved for ${notif.full_name}!`, 'success');

            // Open WhatsApp Web or mailto
            if (channel === 'WhatsApp') {
                window.open(notif.whatsapp_url, '_blank');
            } else if (channel === 'Email') {
                window.location.href = notif.email_url;
            }

            closeModal('single-notify-modal');
        } else {
            showToast(res.message || 'Notification failed', 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function openBulkNotifyModal() {
    const filterDate = document.getElementById('filter-attendance-date').value || new Date().toISOString().split('T')[0];
    document.getElementById('bulk-notify-date-label').textContent = filterDate;

    // Fetch absent students for this date
    try {
        const res = await API.get('/api/attendance', { date: filterDate, status: 'Absent' });
        const absentList = (res.success && res.attendance) ? res.attendance : [];
        currentAbsentRecords = absentList;

        document.getElementById('bulk-notify-count-badge').textContent = `${absentList.length} student(s)`;
        const tbody = document.getElementById('bulk-absent-tbody');

        if (absentList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state" style="padding: 24px;">
                        <i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 28px;"></i>
                        <p style="margin-top: 8px;">No absent students recorded for ${filterDate}!</p>
                    </td>
                </tr>
            `;
            document.getElementById('btn-dispatch-all-logs').disabled = true;
        } else {
            document.getElementById('btn-dispatch-all-logs').disabled = false;
            tbody.innerHTML = absentList.map(a => {
                const phone = a.mobile_number ? a.mobile_number.replace(/\D/g, '') : '';
                const fullPhone = phone.length === 10 ? `91${phone}` : phone;
                const msg = `Dear Parent/Student, ${a.full_name} (ID: ${a.student_code}) was marked ABSENT on ${a.date} for ${a.course_name || 'Classes'}. Regular attendance is required.`;
                const waLink = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;

                return `
                    <tr>
                        <td><strong>${a.student_code}</strong></td>
                        <td>${a.full_name}</td>
                        <td>${a.mobile_number || 'N/A'}</td>
                        <td>${a.course_name || 'General'}</td>
                        <td style="text-align: right;">
                            <a href="${waLink}" target="_blank" class="btn btn-sm btn-success" title="Open WhatsApp Chat">
                                <i class="fa-brands fa-whatsapp"></i> Send WhatsApp
                            </a>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        openModal('bulk-notify-modal');
    } catch (err) {
        showToast('Failed to fetch absent students: ' + err.message, 'error');
    }
}

async function handleBulkDispatch() {
    if (!currentAbsentRecords || currentAbsentRecords.length === 0) {
        showToast('No absent students to notify', 'info');
        return;
    }

    const filterDate = document.getElementById('filter-attendance-date').value || new Date().toISOString().split('T')[0];
    const template = document.getElementById('bulk-template-text').value.trim();
    const studentIds = currentAbsentRecords.map(a => a.student_id);

    const btn = document.getElementById('btn-dispatch-all-logs');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const res = await API.post('/api/attendance/notify', {
            student_ids: studentIds,
            date: filterDate,
            channel: 'WhatsApp',
            custom_message: template
        });

        if (res.success) {
            showToast(`Logged alerts for ${res.count} absent students!`, 'success');
            closeModal('bulk-notify-modal');
            loadAttendanceRecords();
        } else {
            showToast(res.message || 'Dispatch failed', 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Log & Dispatch All Alerts';
    }
}

async function handleAttendanceSubmit(e) {
    e.preventDefault();

    const student_id = document.getElementById('att-student-id').value;
    const date = document.getElementById('att-date').value;
    const status = document.getElementById('att-status').value;
    const remarks = document.getElementById('att-remarks').value.trim();

    if (!student_id || !date || !status) {
        showToast('Please fill in student, date, and status', 'warning');
        return;
    }

    const submitBtn = document.getElementById('btn-save-att');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const res = await API.post('/api/attendance', { student_id, date, status, remarks });
        if (res.success) {
            showToast(res.message, 'success');
            closeModal('attendance-form-modal');
            loadAttendanceRecords();
            loadAttendanceSummary();

            // If marked Absent, offer to send WhatsApp alert immediately!
            if (status === 'Absent') {
                const selectedStudent = allStudents.find(s => s.id == student_id);
                if (selectedStudent) {
                    setTimeout(() => {
                        openSingleNotifyModal(
                            selectedStudent.id,
                            selectedStudent.student_id,
                            selectedStudent.full_name,
                            selectedStudent.mobile_number,
                            selectedStudent.email,
                            date,
                            selectedStudent.course_name || 'General'
                        );
                    }, 500);
                }
            }
        } else {
            showToast(res.message || 'Failed to save attendance', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Attendance';
    }
}

async function deleteAttendanceRecord(id) {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;

    try {
        const res = await API.delete(`/api/attendance/${id}`);
        if (res.success) {
            showToast(res.message, 'success');
            loadAttendanceRecords();
            loadAttendanceSummary();
        } else {
            showToast(res.message || 'Failed to delete record', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ==========================================
// BIOMETRIC LIVE FACE SCANNER & RECOGNITION
// ==========================================
let mediaStream = null;
let autoScanTimer = null;
let isProcessingFrame = false;
let sessionScannedStudentIds = new Set();
let lastAlertTimeByStudent = {};
let lastRecognizedStudentId = null;

async function startWebcam() {
    const video = document.getElementById('webcam-preview');
    const placeholder = document.getElementById('camera-off-placeholder');
    const btnToggle = document.getElementById('btn-toggle-camera');

    if (mediaStream) {
        stopWebcam();
        return;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        if (video) {
            video.srcObject = mediaStream;
            video.play();
        }
        if (placeholder) placeholder.style.display = 'none';
        if (btnToggle) {
            btnToggle.innerHTML = '<i class="fa-solid fa-video-slash"></i> Stop Camera';
            btnToggle.classList.add('btn-danger');
            btnToggle.classList.remove('btn-secondary');
        }
        showToast('Webcam active! Position face within the viewfinder.', 'info');

        // Check if auto scan is enabled
        const chkAuto = document.getElementById('chk-auto-scan');
        if (chkAuto && chkAuto.checked) {
            startAutoScanLoop();
        }
    } catch (err) {
        console.warn('Webcam error:', err);
        showToast('Camera not accessible. You can use "Upload Photo" to test face recognition.', 'warning');
        if (placeholder) {
            placeholder.innerHTML = `
                <i class="fa-solid fa-camera-rotate" style="font-size: 36px; margin-bottom: 8px; color: #38bdf8;"></i>
                <p style="font-size: 13px; color: #e2e8f0;">Camera Inactive</p>
                <span style="font-size: 11px; color: #94a3b8;">Click "Upload Photo" below to recognize a student face.</span>
            `;
        }
    }
}

function stopWebcam() {
    stopAutoScanLoop();

    const video = document.getElementById('webcam-preview');
    const placeholder = document.getElementById('camera-off-placeholder');
    const btnToggle = document.getElementById('btn-toggle-camera');

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (video) video.srcObject = null;
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.innerHTML = `
            <i class="fa-solid fa-video-slash" style="font-size: 40px; margin-bottom: 12px; color: #64748b;"></i>
            <p style="font-size: 13px;">Camera Inactive. Click "Start Camera" to initialize scanner.</p>
        `;
    }
    if (btnToggle) {
        btnToggle.innerHTML = '<i class="fa-solid fa-video"></i> Start Camera';
        btnToggle.classList.remove('btn-danger');
        btnToggle.classList.add('btn-secondary');
    }
}

function startAutoScanLoop() {
    stopAutoScanLoop();
    autoScanTimer = setInterval(async () => {
        if (!mediaStream || isProcessingFrame) return;
        const frameB64 = grabCurrentFrame();
        if (frameB64) {
            await runFaceRecognition(frameB64, true);
        }
    }, 1200);
}

function stopAutoScanLoop() {
    if (autoScanTimer) {
        clearInterval(autoScanTimer);
        autoScanTimer = null;
    }
}

function grabCurrentFrame() {
    const video = document.getElementById('webcam-preview');
    const canvas = document.getElementById('webcam-canvas');
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const squareSide = Math.min(vw, vh);
    const sx = Math.floor((vw - squareSide) / 2);
    const sy = Math.floor((vh - squareSide) / 2);

    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    
    // Mirror frame to match display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, squareSide, squareSide, 0, 0, 320, 320);

    return canvas.toDataURL('image/jpeg', 0.88);
}

async function handleFaceScanNow() {
    const frameB64 = grabCurrentFrame();
    if (!frameB64) {
        showToast('Please start the camera first or upload a face photo.', 'warning');
        return;
    }
    await runFaceRecognition(frameB64, false);
}

function handleTestPhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(evt) {
        const imageB64 = evt.target.result;
        showToast('Photo uploaded. Analyzing facial features...', 'info');
        await runFaceRecognition(imageB64, false);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
}

async function runFaceRecognition(imageB64, isAutoScan = false) {
    if (isProcessingFrame) return;
    isProcessingFrame = true;

    const studentSelect = document.getElementById('face-student-select');
    const targetStudentId = studentSelect ? studentSelect.value : null;
    const dateInput = document.getElementById('filter-attendance-date').value || new Date().toISOString().split('T')[0];
    const targetBox = document.getElementById('scanner-target-box');
    const matchResult = document.getElementById('face-match-result');
    const btnScan = document.getElementById('btn-scan-face-now');

    if (!isAutoScan && btnScan) {
        btnScan.disabled = true;
        btnScan.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Face...';
    }

    try {
        const payload = {
            live_image: imageB64,
            date: dateInput
        };
        if (targetStudentId) {
            payload.student_id = parseInt(targetStudentId);
        }

        const res = await API.post('/api/attendance/recognize-face', payload);

        if (res.success && res.matched) {
            const student = res.student;
            const isAlreadyPresent = Boolean(res.already_present || student.already_present);
            const now = Date.now();
            const lastAlertTime = lastAlertTimeByStudent[student.id] || 0;
            const isNewPerson = (lastRecognizedStudentId !== student.id);
            const shouldAlert = (!isAutoScan) || isNewPerson || (now - lastAlertTime > 4500);

            lastRecognizedStudentId = student.id;

            // Trigger Reticle Flash
            if (targetBox) {
                targetBox.classList.remove('success');
                void targetBox.offsetWidth; // trigger reflow
                targetBox.classList.add('success');
                setTimeout(() => targetBox.classList.remove('success'), 1200);
            }

            // Always update Match HUD immediately so user sees who is detected
            document.getElementById('match-student-name').textContent = student.full_name;
            document.getElementById('match-student-id').textContent = student.student_code;
            document.getElementById('match-student-course').textContent = student.course_name;
            const confLabel = document.getElementById('match-confidence-label');
            if (confLabel) confLabel.textContent = `Confidence: ${student.confidence} Match`;

            const iconCircle = document.getElementById('match-icon-circle');
            const iconEl = document.getElementById('match-icon');
            const alreadyNote = document.getElementById('match-already-note');
            const statusBadgeEl = document.getElementById('match-status-badge');

            if (isAlreadyPresent) {
                if (matchResult) {
                    matchResult.style.background = '#eff6ff';
                    matchResult.style.borderColor = '#93c5fd';
                }
                if (iconCircle) iconCircle.style.background = '#2563eb';
                if (iconEl) iconEl.className = 'fa-solid fa-clock-rotate-left';
                if (alreadyNote) {
                    alreadyNote.style.display = 'block';
                    alreadyNote.style.color = '#1e40af';
                    alreadyNote.innerHTML = '<i class="fa-solid fa-circle-info"></i> This student is already marked present today.';
                }
                if (statusBadgeEl) {
                    statusBadgeEl.className = 'badge';
                    statusBadgeEl.style.cssText = 'font-size: 12.5px; padding: 6px 12px; background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; font-weight: 700;';
                    statusBadgeEl.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> ALREADY PRESENT';
                }
            } else {
                if (matchResult) {
                    matchResult.style.background = '#ecfdf5';
                    matchResult.style.borderColor = '#6ee7b7';
                }
                if (iconCircle) iconCircle.style.background = '#10b981';
                if (iconEl) iconEl.className = 'fa-solid fa-check';
                if (alreadyNote) alreadyNote.style.display = 'none';
                if (statusBadgeEl) {
                    statusBadgeEl.className = 'badge badge-present';
                    statusBadgeEl.style.cssText = 'font-size: 12.5px; padding: 6px 12px;';
                    statusBadgeEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> MARKED PRESENT';
                }
            }

            if (matchResult) matchResult.style.display = 'block';

            if (shouldAlert) {
                lastAlertTimeByStudent[student.id] = now;

                // Append to session scanned log if not already there
                const sessionList = document.getElementById('scanned-session-list');
                if (sessionList && !sessionScannedStudentIds.has(student.id)) {
                    sessionScannedStudentIds.add(student.id);
                    const item = document.createElement('span');
                    if (isAlreadyPresent) {
                        item.className = 'badge';
                        item.style.cssText = 'margin: 3px 4px; font-size: 12px; background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;';
                        item.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${student.student_code} - ${student.full_name} (Already Present)`;
                    } else {
                        item.className = 'badge badge-present';
                        item.style.margin = '3px 4px';
                        item.style.fontSize = '12px';
                        item.innerHTML = `<i class="fa-solid fa-check"></i> ${student.student_code} - ${student.full_name} (${student.confidence})`;
                    }
                    sessionList.appendChild(item);
                }

                if (isAlreadyPresent) {
                    showToast(`ℹ️ ${student.full_name} (${student.student_code}) is ALREADY PRESENT today!`, 'info');
                } else {
                    showToast(`✅ Biometric Match Verified! ${student.full_name} marked PRESENT`, 'success');
                }

                // Refresh underlying attendance tables in real-time
                loadAttendanceRecords();
                loadAttendanceSummary();
            }
        } else {
            if (!isAutoScan) {
                showToast(res.message || 'Face not recognized. Make sure the student face is registered.', 'warning');
            } else if (res.no_faces_registered) {
                showToast(res.message, 'warning');
                stopAutoScanLoop();
            }
        }
    } catch (err) {
        if (!isAutoScan) {
            showToast('Face recognition error: ' + err.message, 'error');
        }
    } finally {
        isProcessingFrame = false;
        if (!isAutoScan && btnScan) {
            btnScan.disabled = false;
            btnScan.innerHTML = '<i class="fa-solid fa-expand"></i> Detect Face Now';
        }
    }
}

async function handleAutoAlertAbsentees() {
    const filterDate = document.getElementById('filter-attendance-date').value || new Date().toISOString().split('T')[0];

    if (!confirm(`Process today's attendance session for ${filterDate}? All students without face scan will be marked ABSENT and mobile alerts will be prepared.`)) {
        return;
    }

    try {
        const res = await API.post('/api/attendance/auto-alert-absentees', { date: filterDate });
        if (res.success) {
            const notified = res.notified_students || [];
            document.getElementById('auto-alert-summary-title').textContent = `${res.absent_count} Student(s) Marked Absent`;
            document.getElementById('auto-alert-summary-sub').textContent = 
                `${res.unmarked_count} unrecorded student(s) set to Absent. Mobile WhatsApp notices logged and ready for dispatch.`;

            const tbody = document.getElementById('auto-alert-tbody');
            if (notified.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No absent students for this date! All students scanned and present.</td></tr>';
            } else {
                tbody.innerHTML = notified.map(n => `
                    <tr>
                        <td><strong>${n.student_code}</strong></td>
                        <td>${n.full_name}</td>
                        <td>${n.mobile_number || 'N/A'}</td>
                        <td>
                            <span class="badge badge-absent"><i class="fa-solid fa-triangle-exclamation"></i> ABSENT</span>
                        </td>
                        <td style="text-align: right;">
                            <a href="${n.whatsapp_url}" target="_blank" class="btn btn-sm btn-success">
                                <i class="fa-brands fa-whatsapp"></i> Send Alert
                            </a>
                        </td>
                    </tr>
                `).join('');
            }

            // Close face scan modal if open and open auto alert modal
            closeModal('face-scanner-modal');
            stopWebcam();
            openModal('auto-alert-modal');

            // Refresh attendance records & notification history
            loadAttendanceRecords();
            loadAttendanceSummary();
            loadNotificationLogs();
            showToast(res.message, 'success');
        } else {
            showToast(res.message || 'Auto alert failed', 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}
