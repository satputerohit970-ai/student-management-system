import re
import urllib.parse
import base64
import io
import cv2
import numpy as np
from PIL import Image
from flask import Blueprint, request, jsonify
from database import query_db
from routes.auth_routes import login_required

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

@attendance_bp.route('', methods=['GET'])
@login_required
def get_attendance():
    try:
        date_filter = request.args.get('date')
        student_id = request.args.get('student_id')
        status = request.args.get('status')

        sql = """
            SELECT a.id, a.student_id, a.date, a.status, a.remarks, a.created_at,
                   s.student_id AS student_code, s.full_name, s.mobile_number, s.email, s.year,
                   c.course_name, c.course_code
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE 1=1
        """
        params = []

        if date_filter:
            sql += " AND a.date = %s"
            params.append(date_filter)

        if student_id:
            sql += " AND a.student_id = %s"
            params.append(student_id)

        if status:
            sql += " AND a.status = %s"
            params.append(status)

        sql += " ORDER BY a.date DESC, s.full_name ASC"

        records = query_db(sql, tuple(params))
        return jsonify({'success': True, 'count': len(records), 'attendance': records}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to retrieve attendance: {str(e)}"}), 500

@attendance_bp.route('/summary', methods=['GET'])
@login_required
def get_attendance_summary():
    """Returns student-wise attendance percentage breakdown."""
    try:
        summary = query_db("""
            SELECT s.id AS student_id, s.student_id AS student_code, s.full_name, c.course_name, s.year,
                   COUNT(a.id) AS total_days,
                   SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
                   SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
                   ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 1) AS percentage
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            LEFT JOIN attendance a ON s.id = a.student_id
            GROUP BY s.id, s.student_id, s.full_name, c.course_name, s.year
            ORDER BY s.full_name ASC
        """)
        return jsonify({'success': True, 'summary': summary or []}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to calculate summary: {str(e)}"}), 500

@attendance_bp.route('', methods=['POST'])
@login_required
def mark_attendance():
    """
    Save or update attendance. Supports both single object or bulk list:
    { "student_id": 1, "date": "2026-09-21", "status": "Present", "remarks": "On time" }
    OR
    { "records": [ {"student_id": 1, "status": "Present"}, ... ], "date": "2026-09-21" }
    """
    try:
        data = request.get_json(silent=True) or {}

        # Bulk marking
        if 'records' in data and isinstance(data['records'], list):
            att_date = (data.get('date') or '').strip()
            if not att_date:
                return jsonify({'success': False, 'message': 'Date is required for bulk attendance.'}), 400

            count = 0
            for item in data['records']:
                sid = item.get('student_id')
                status = item.get('status', 'Present')
                remarks = item.get('remarks', '')
                if sid:
                    query_db("""
                        INSERT INTO attendance (student_id, date, status, remarks)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)
                    """, (sid, att_date, status, remarks), commit=True)
                    count += 1

            return jsonify({'success': True, 'message': f"Attendance saved for {count} student(s) on {att_date}."}), 200

        # Single record marking
        student_id = data.get('student_id')
        att_date = (data.get('date') or '').strip()
        status = data.get('status', 'Present')
        remarks = (data.get('remarks') or '').strip()

        if not student_id or not att_date:
            return jsonify({'success': False, 'message': 'Student and Date are required.'}), 400

        if status not in ['Present', 'Absent']:
            return jsonify({'success': False, 'message': 'Status must be Present or Absent.'}), 400

        # Check student exists
        student = query_db("SELECT id, full_name FROM students WHERE id = %s", (student_id,), one=True)
        if not student:
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404

        query_db("""
            INSERT INTO attendance (student_id, date, status, remarks)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)
        """, (student_id, att_date, status, remarks), commit=True)

        return jsonify({'success': True, 'message': f"Attendance recorded for {student['full_name']}."}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to mark attendance: {str(e)}"}), 500

@attendance_bp.route('/<int:record_id>', methods=['DELETE'])
@login_required
def delete_attendance(record_id):
    try:
        existing = query_db("SELECT id FROM attendance WHERE id = %s", (record_id,), one=True)
        if not existing:
            return jsonify({'success': False, 'message': 'Attendance record not found.'}), 404

        query_db("DELETE FROM attendance WHERE id = %s", (record_id,), commit=True)
        return jsonify({'success': True, 'message': 'Attendance record deleted.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to delete attendance: {str(e)}"}), 500

def format_whatsapp_phone(mobile):
    """Clean mobile number and prepend India country code 91 if needed."""
    digits = re.sub(r'\D', '', mobile or '')
    if len(digits) == 10:
        return f"91{digits}"
    return digits

@attendance_bp.route('/notify', methods=['POST'])
@login_required
def notify_absent_students():
    """
    Generate and log absence notifications for students.
    Accepts:
    - student_ids: list of student IDs
    - date: attendance date
    - channel: 'WhatsApp', 'Email', or 'SMS' (default 'WhatsApp')
    - custom_message: optional custom text template
    """
    try:
        data = request.get_json(silent=True) or {}
        student_ids = data.get('student_ids', [])
        if isinstance(student_ids, int):
            student_ids = [student_ids]

        att_date = data.get('date') or ''
        channel = data.get('channel', 'WhatsApp')
        custom_message = (data.get('custom_message') or '').strip()

        if not student_ids:
            return jsonify({'success': False, 'message': 'No students selected for notification.'}), 400

        results = []
        for sid in student_ids:
            student = query_db("""
                SELECT s.id, s.student_id, s.full_name, s.mobile_number, s.email, c.course_name
                FROM students s
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE s.id = %s
            """, (sid,), one=True)

            if not student:
                continue

            if custom_message:
                msg = custom_message.replace('{student_name}', student['full_name']) \
                                    .replace('{student_id}', student['student_id']) \
                                    .replace('{date}', att_date) \
                                    .replace('{course}', student['course_name'] or 'General Course')
            else:
                msg = (
                    f"Dear Parent/Student,\n"
                    f"This is an official attendance notice from College Administration.\n\n"
                    f"Student: {student['full_name']} (ID: {student['student_id']})\n"
                    f"Course: {student['course_name'] or 'Enrolled Degree'}\n"
                    f"Date: {att_date}\n"
                    f"Status: ABSENT\n\n"
                    f"Regular attendance is required. Please submit a leave application or contact the department."
                )

            phone = format_whatsapp_phone(student['mobile_number'])
            wa_url = f"https://api.whatsapp.com/send?phone={phone}&text={urllib.parse.quote(msg)}"
            email_url = f"mailto:{student['email']}?subject={urllib.parse.quote(f'Absence Alert: {student['full_name']} - {att_date}')}&body={urllib.parse.quote(msg)}"

            query_db("""
                INSERT INTO notifications (student_id, recipient_name, contact_info, channel, date, message, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'Sent')
            """, (sid, student['full_name'], student['mobile_number'] if channel == 'WhatsApp' else student['email'], channel, att_date, msg), commit=True)

            results.append({
                'student_id': sid,
                'student_code': student['student_id'],
                'full_name': student['full_name'],
                'mobile_number': student['mobile_number'],
                'email': student['email'],
                'message': msg,
                'whatsapp_url': wa_url,
                'email_url': email_url
            })

        return jsonify({
            'success': True,
            'message': f"Prepared and logged absence notifications for {len(results)} student(s).",
            'count': len(results),
            'notifications': results
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to dispatch notifications: {str(e)}"}), 500

@attendance_bp.route('/notifications', methods=['GET'])
@login_required
def get_notification_logs():
    """Retrieve history of sent notifications."""
    try:
        logs = query_db("""
            SELECT n.id, n.student_id, n.recipient_name, n.contact_info, n.channel,
                   n.date, n.message, n.status, n.created_at,
                   s.student_id AS student_code, c.course_name
            FROM notifications n
            JOIN students s ON n.student_id = s.id
            LEFT JOIN courses c ON s.course_id = c.id
            ORDER BY n.id DESC
            LIMIT 50
        """)
        return jsonify({'success': True, 'count': len(logs), 'notifications': logs}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to load logs: {str(e)}"}), 500

@attendance_bp.route('/face-scan', methods=['POST'])
@login_required
def face_scan_attendance():
    """
    Process facial recognition attendance verification.
    Matches student by ID or Student Code, marks Present, and records biometric verification.
    """
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get('student_id')
        student_code = (data.get('student_code') or '').strip().upper()
        att_date = (data.get('date') or '').strip()
        if not att_date:
            from datetime import date
            att_date = date.today().isoformat()

        # Find student
        if student_id:
            student = query_db("""
                SELECT s.id, s.student_id, s.full_name, c.course_name 
                FROM students s 
                LEFT JOIN courses c ON s.course_id = c.id 
                WHERE s.id = %s
            """, (student_id,), one=True)
        elif student_code:
            student = query_db("""
                SELECT s.id, s.student_id, s.full_name, c.course_name 
                FROM students s 
                LEFT JOIN courses c ON s.course_id = c.id 
                WHERE s.student_id = %s
            """, (student_code,), one=True)
        else:
            return jsonify({'success': False, 'message': 'Student ID or code required for face scan verification.'}), 400

        if not student:
            return jsonify({'success': False, 'message': 'No registered student record found matching this face scan.'}), 404

        # Check if already marked present
        existing = query_db("SELECT id, status FROM attendance WHERE student_id = %s AND date = %s", (student['id'], att_date), one=True)
        already_present = (existing is not None and existing['status'] == 'Present')

        if already_present:
            msg = f"{student['full_name']} is ALREADY MARKED PRESENT today ({att_date})!"
        else:
            query_db("""
                INSERT INTO attendance (student_id, date, status, remarks)
                VALUES (%s, %s, 'Present', 'Face Recognition Verified (Webcam Biometrics)')
                ON DUPLICATE KEY UPDATE status = 'Present', remarks = 'Face Recognition Verified (Webcam Biometrics)'
            """, (student['id'], att_date), commit=True)
            msg = f"Face recognized! {student['full_name']} marked PRESENT."

        return jsonify({
            'success': True,
            'already_present': already_present,
            'message': msg,
            'student': {
                'id': student['id'],
                'student_code': student['student_id'],
                'full_name': student['full_name'],
                'course_name': student['course_name'] or 'General',
                'status': 'Present',
                'already_present': already_present,
                'date': att_date,
                'verified_method': 'Biometric Live Face Scanner'
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Face scan processing error: {str(e)}"}), 500

@attendance_bp.route('/auto-alert-absentees', methods=['POST'])
@login_required
def auto_alert_absentees():
    """
    1. Finds all enrolled students who did not scan their face (unrecorded) for the date.
    2. Marks unrecorded students as 'Absent'.
    3. Automatically sends / logs mobile notifications to all absent students.
    """
    try:
        data = request.get_json(silent=True) or {}
        att_date = (data.get('date') or '').strip()
        if not att_date:
            from datetime import date
            att_date = date.today().isoformat()

        # Step 1: Find all students who don't have attendance for att_date
        unmarked_students = query_db("""
            SELECT s.id, s.student_id, s.full_name, s.mobile_number, s.email, c.course_name
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE s.id NOT IN (
                SELECT student_id FROM attendance WHERE date = %s
            )
        """, (att_date,))

        # Mark them Absent
        for s in (unmarked_students or []):
            query_db("""
                INSERT INTO attendance (student_id, date, status, remarks)
                VALUES (%s, %s, 'Absent', 'Did not scan face (Marked Absent)')
                ON DUPLICATE KEY UPDATE status = status
            """, (s['id'], att_date), commit=True)

        # Step 2: Query all students who are marked Absent for att_date
        absent_students = query_db("""
            SELECT s.id, s.student_id, s.full_name, s.mobile_number, s.email, c.course_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE a.date = %s AND a.status = 'Absent'
        """, (att_date,))

        # Step 3: Generate and log mobile notifications for all absent students
        notified = []
        for s in (absent_students or []):
            msg = (
                f"Urgent Attendance Notice:\n"
                f"Dear Parent/Student, {s['full_name']} (ID: {s['student_id']}) was marked ABSENT today ({att_date}).\n"
                f"Face scan attendance was NOT recorded for program {s['course_name'] or 'Classes'}.\n"
                f"Regular college attendance is mandatory. Please contact administration or submit an approved leave application."
            )

            phone = format_whatsapp_phone(s['mobile_number'])
            wa_url = f"https://api.whatsapp.com/send?phone={phone}&text={urllib.parse.quote(msg)}"

            query_db("""
                INSERT INTO notifications (student_id, recipient_name, contact_info, channel, date, message, status)
                VALUES (%s, %s, %s, 'WhatsApp', %s, %s, 'Sent')
            """, (s['id'], s['full_name'], s['mobile_number'] or 'Mobile', att_date, msg), commit=True)

            notified.append({
                'student_id': s['id'],
                'student_code': s['student_id'],
                'full_name': s['full_name'],
                'mobile_number': s['mobile_number'],
                'whatsapp_url': wa_url,
                'message': msg
            })

        return jsonify({
            'success': True,
            'message': f"Auto-processed attendance: {len(unmarked_students or [])} unmarked set to Absent. Mobile alerts dispatched to {len(notified)} absent student(s).",
            'date': att_date,
            'unmarked_count': len(unmarked_students or []),
            'absent_count': len(notified),
            'notified_students': notified
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to auto-alert absentees: {str(e)}"}), 500

# Initialize OpenCV SIFT feature matcher & in-memory descriptor cache
_sift_detector = cv2.SIFT_create(nfeatures=400)
_bf_matcher = cv2.BFMatcher()
_face_descriptors_cache = {}

def make_face_mask(h, w):
    """
    Creates an elliptical face mask focusing exclusively on facial landmarks
    (eyes, eyebrows, nose, mouth, cheeks, chin) and completely zeroing out
    the background room, walls, ceiling, and shoulders.
    """
    mask = np.zeros((h, w), dtype=np.uint8)
    cx = w // 2
    cy = int(h * 0.48)
    axes = (int(w * 0.32), int(h * 0.40))
    cv2.ellipse(mask, (cx, cy), axes, 0, 0, 360, 255, -1)
    return mask

def get_cached_student_features(student_id, face_data):
    """
    Returns precomputed SIFT keypoints & descriptors for registered student
    in both normal and horizontally-flipped orientation (for webcam mirror immunity),
    using an elliptical mask to completely eliminate background room dependency.
    Automatically updates cache if student face_data changes.
    """
    if not face_data:
        return None
    cache_key = f"{student_id}_{len(face_data)}_{face_data[:50]}"
    if cache_key in _face_descriptors_cache:
        return _face_descriptors_cache[cache_key]

    try:
        b64_str = face_data
        if ',' in b64_str:
            b64_str = b64_str.split(',')[1]
        raw = base64.b64decode(b64_str)
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None

        h, w = img.shape[:2]
        side = min(w, h)
        box = int(side * 0.88)
        box = min(box, min(w, h))
        x1 = max(0, min(w // 2 - box // 2, w - box))
        y1 = max(0, min(int(h * 0.48) - box // 2, h - box))
        crop = img[y1:y1 + box, x1:x1 + box]
        mask = make_face_mask(crop.shape[0], crop.shape[1])

        crop_f = cv2.flip(crop, 1)
        mask_f = cv2.flip(mask, 1)

        kp, des = _sift_detector.detectAndCompute(crop, mask)
        kp_f, des_f = _sift_detector.detectAndCompute(crop_f, mask_f)

        features = {
            'kp_len': len(kp) if kp is not None else 0,
            'des': des,
            'kp_f_len': len(kp_f) if kp_f is not None else 0,
            'des_f': des_f
        }
        _face_descriptors_cache[cache_key] = features
        return features
    except Exception:
        return None

def extract_face_cv2(b64_str, scale=1.0):
    """
    Decodes base64 image and crops face ROI.
    """
    try:
        if ',' in b64_str:
            b64_str = b64_str.split(',')[1]
        raw = base64.b64decode(b64_str)
        nparr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None
        h, w = img.shape[:2]
        side = min(w, h)
        box = int(side * 0.88 * scale)
        box = min(box, min(w, h))
        cx, cy = w // 2, int(h * 0.48)
        x1 = max(0, min(cx - box // 2, w - box))
        y1 = max(0, min(cy - box // 2, h - box))
        return img[y1:y1 + box, x1:x1 + box]
    except Exception:
        return None

def calculate_image_similarity(b64_img1, b64_img2):
    """
    Compare two base64 face snapshots using SIFT features with background masking.
    """
    try:
        features_reg = get_cached_student_features('temp', b64_img2)
        if not features_reg or features_reg['des'] is None or features_reg['kp_len'] < 4:
            return 0.0

        live_crop = extract_face_cv2(b64_img1, 1.0)
        if live_crop is None:
            return 0.0

        mask_live = make_face_mask(live_crop.shape[0], live_crop.shape[1])
        kp_live, des_live = _sift_detector.detectAndCompute(live_crop, mask_live)
        if des_live is None or len(des_live) < 4:
            return 0.0

        matches = _bf_matcher.knnMatch(des_live, features_reg['des'], k=2)
        good = [m for m, n in matches if len(matches) > 0 and m.distance < 0.80 * n.distance]
        denom = min(len(kp_live), features_reg['kp_len'])
        pct = (len(good) / denom) * 100.0 if denom > 0 else 0.0

        # Also check flipped orientation
        if features_reg['des_f'] is not None and features_reg['kp_f_len'] >= 4:
            matches_f = _bf_matcher.knnMatch(des_live, features_reg['des_f'], k=2)
            good_f = [m for m, n in matches_f if len(matches_f) > 0 and m.distance < 0.80 * n.distance]
            denom_f = min(len(kp_live), features_reg['kp_f_len'])
            pct_f = (len(good_f) / denom_f) * 100.0 if denom_f > 0 else 0.0
            pct = max(pct, pct_f)

        return round(pct, 1)
    except Exception:
        return 0.0

@attendance_bp.route('/recognize-face', methods=['POST'])
@login_required
def recognize_face():
    """
    Scans live video frame, compares with registered student faces using SIFT features,
    strictly validates against false positives with a runner-up margin test,
    and marks the verified student Present!
    """
    try:
        data = request.get_json(silent=True) or {}
        live_image = data.get('live_image') or ''
        att_date = (data.get('date') or '').strip()
        if not att_date:
            from datetime import date
            att_date = date.today().isoformat()

        if not live_image:
            return jsonify({'success': False, 'matched': False, 'message': 'No live camera frame captured.'}), 400

        # 1. Decode live frame once
        if ',' in live_image:
            live_b64 = live_image.split(',')[1]
        else:
            live_b64 = live_image
        raw_live = base64.b64decode(live_b64)
        arr_live = np.frombuffer(raw_live, np.uint8)
        img_live = cv2.imdecode(arr_live, cv2.IMREAD_GRAYSCALE)
        if img_live is None:
            return jsonify({'success': False, 'matched': False, 'message': 'Could not decode camera image.'}), 400

        # 2. Extract multi-scale & multi-offset SIFT features with face mask (immune to background changes)
        h_l, w_l = img_live.shape[:2]
        side_l = min(w_l, h_l)
        live_features_list = []
        for sc in (0.80, 0.92, 1.05):
            box_l = int(side_l * 0.88 * sc)
            box_l = min(box_l, min(w_l, h_l))
            for dy in (-12, 0, 12):
                cx = w_l // 2
                cy = int(h_l * 0.48) + dy
                x1 = max(0, min(cx - box_l // 2, w_l - box_l))
                y1 = max(0, min(cy - box_l // 2, h_l - box_l))
                crop_l = img_live[y1:y1 + box_l, x1:x1 + box_l]
                mask_l = make_face_mask(crop_l.shape[0], crop_l.shape[1])
                kp_l, des_l = _sift_detector.detectAndCompute(crop_l, mask_l)
                if des_l is not None and len(des_l) >= 4:
                    live_features_list.append((len(kp_l), des_l))

        if not live_features_list:
            return jsonify({
                'success': False,
                'matched': False,
                'message': 'No clear facial features found. Please face the camera directly in good lighting.'
            }), 200

        target_student_id = data.get('student_id')
        if target_student_id:
            students = query_db("""
                SELECT s.id, s.student_id, s.full_name, s.face_data, c.course_name
                FROM students s
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE s.id = %s AND s.has_face_registered = 1 AND s.face_data IS NOT NULL
            """, (target_student_id,))
            threshold = 16.0
            margin_required = 0.0
        else:
            students = query_db("""
                SELECT s.id, s.student_id, s.full_name, s.face_data, c.course_name
                FROM students s
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE s.has_face_registered = 1 AND s.face_data IS NOT NULL
            """)
            threshold = 18.0
            margin_required = 5.0

        if not students:
            return jsonify({
                'success': False,
                'matched': False,
                'no_faces_registered': True,
                'message': 'No student faces have been registered yet. Please go to Students page and click Add Face to register faces.'
            }), 200

        # 3. Fast match against registered student descriptors
        scored_candidates = []
        for s in students:
            feat_reg = get_cached_student_features(s['id'], s['face_data'])
            if not feat_reg or feat_reg['des'] is None or feat_reg['kp_len'] < 4:
                continue

            best_s_score = 0.0
            for kp_len_l, des_l in live_features_list:
                # Normal orientation
                m = _bf_matcher.knnMatch(des_l, feat_reg['des'], k=2)
                good = [mm for mm, nn in m if len(m) > 0 and mm.distance < 0.80 * nn.distance]
                d = min(kp_len_l, feat_reg['kp_len'])
                if d > 0:
                    pct = (len(good) / d) * 100.0
                    if pct > best_s_score:
                        best_s_score = pct

                # Mirrored / Flipped orientation
                if feat_reg['des_f'] is not None and feat_reg['kp_f_len'] >= 4:
                    mf = _bf_matcher.knnMatch(des_l, feat_reg['des_f'], k=2)
                    good_f = [mm for mm, nn in mf if len(mf) > 0 and mm.distance < 0.80 * nn.distance]
                    df = min(kp_len_l, feat_reg['kp_f_len'])
                    if df > 0:
                        pct_f = (len(good_f) / df) * 100.0
                        if pct_f > best_s_score:
                            best_s_score = pct_f

            scored_candidates.append((round(best_s_score, 1), s))

        if not scored_candidates:
            return jsonify({
                'success': False,
                'matched': False,
                'message': 'Unable to match biometric features. Please position face clearly.'
            }), 200

        # Sort descending by match score
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, best_student = scored_candidates[0]
        runner_up_score = scored_candidates[1][0] if len(scored_candidates) > 1 else 0.0

        # Strict verification: score >= threshold AND beats runner-up by required margin
        is_verified = (best_student is not None) and (best_score >= threshold) and ((best_score - runner_up_score) >= margin_required)
        print(f"[FACE_RECOG] Best: {best_student['full_name']} ({best_score}%), RunnerUp: {runner_up_score}%, Margin: {best_score - runner_up_score:.1f}%, Req: {margin_required}%, Verified: {is_verified}", flush=True)

        if is_verified:
            # Check if student was already marked Present today
            existing = query_db("""
                SELECT id, status FROM attendance WHERE student_id = %s AND date = %s
            """, (best_student['id'], att_date), one=True)
            already_present = (existing is not None and existing['status'] == 'Present')

            if already_present:
                msg = f"{best_student['full_name']} ({best_student['student_id']}) is ALREADY MARKED PRESENT today ({att_date})."
            else:
                query_db("""
                    INSERT INTO attendance (student_id, date, status, remarks)
                    VALUES (%s, %s, 'Present', %s)
                    ON DUPLICATE KEY UPDATE status = 'Present', remarks = %s
                """, (best_student['id'], att_date, f"SIFT Biometric Verified ({best_score}%)", f"SIFT Biometric Verified ({best_score}%)"), commit=True)
                msg = f"Face Recognized! {best_student['full_name']} marked PRESENT."

            return jsonify({
                'success': True,
                'matched': True,
                'already_present': already_present,
                'confidence': f"{best_score}%",
                'message': msg,
                'student': {
                    'id': best_student['id'],
                    'student_code': best_student['student_id'],
                    'full_name': best_student['full_name'],
                    'course_name': best_student['course_name'] or 'General',
                    'date': att_date,
                    'status': 'Present',
                    'already_present': already_present,
                    'confidence': f"{best_score}%"
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'matched': False,
                'highest_score': f"{best_score}%",
                'message': f"Face not verified with high confidence ({best_score}%). Please position your face clearly in the box and ensure good lighting."
            }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f"Face recognition error: {str(e)}"}), 500
