-- ===========================================
-- 🎓 HỆ THỐNG QUẢN LÝ ĐIỂM DANH SINH VIÊN
-- 📋 File 6/7: VIEWS (Các view truy vấn)
-- ===========================================

USE EducationManagement;
GO

PRINT '🔄 Bắt đầu tạo Views...';
GO

-- ===========================================
-- 1. VIEW: BẢNG ĐIỂM SINH VIÊN THEO NĂM HỌC
-- ===========================================
IF OBJECT_ID('vw_StudentTranscript', 'V') IS NOT NULL DROP VIEW vw_StudentTranscript;
GO

CREATE VIEW vw_StudentTranscript
AS
SELECT 
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    s.email as student_email,
    m.major_name,
    ay.academic_year_id,
    ay.year_name as academic_year,
    c.semester,
    sub.subject_id,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    c.class_code,
    c.class_name,
    g.midterm_score,
    g.final_score,
    g.total_score,
    g.letter_grade,
    l.full_name as lecturer_name,
    e.enrollment_date,
    e.status as enrollment_status
FROM dbo.students s
INNER JOIN dbo.enrollments e ON s.student_id = e.student_id
INNER JOIN dbo.classes c ON e.class_id = c.class_id
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
LEFT JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
INNER JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
LEFT JOIN dbo.majors m ON s.major_id = m.major_id
WHERE s.deleted_at IS NULL 
    AND e.deleted_at IS NULL
    AND ay.deleted_at IS NULL;
GO

-- ===========================================
-- 2. VIEW: TỔNG HỢP GPA SINH VIÊN
-- ===========================================
IF OBJECT_ID('vw_StudentGPASummary', 'V') IS NOT NULL DROP VIEW vw_StudentGPASummary;
GO

CREATE VIEW vw_StudentGPASummary
AS
SELECT 
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    s.email,
    m.major_name,
    f.faculty_name,
    g.academic_year_id,
    ay.year_name as academic_year,
    COALESCE(g.semester, 0) as semester, -- 0 = Cả năm (thay thế NULL)
    CASE 
        WHEN g.semester IS NULL THEN N'Cả năm'
        WHEN g.semester = 1 THEN N'Học kỳ 1'
        WHEN g.semester = 2 THEN N'Học kỳ 2'
        WHEN g.semester = 3 THEN N'Học kỳ hè'
        ELSE N'Không xác định'
    END as semester_text,
    g.gpa10,
    g.gpa4,
    g.total_credits,
    g.accumulated_credits,
    g.rank_text,
    g.created_at as calculated_at
FROM dbo.gpas g
INNER JOIN dbo.students s ON g.student_id = s.student_id
INNER JOIN dbo.academic_years ay ON g.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.majors m ON s.major_id = m.major_id
LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
WHERE s.deleted_at IS NULL 
    AND g.deleted_at IS NULL
    AND ay.deleted_at IS NULL;
GO

-- ===========================================
-- 3. VIEW: THỐNG KÊ LỚP HỌC
-- ===========================================
IF OBJECT_ID('vw_ClassStatistics', 'V') IS NOT NULL DROP VIEW vw_ClassStatistics;
GO

CREATE VIEW vw_ClassStatistics
AS
SELECT 
    c.class_id,
    c.class_code,
    c.class_name,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    ay.year_name as academic_year,
    c.semester,
    l.full_name as lecturer_name,
    c.max_students,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    c.max_students - COUNT(DISTINCT e.student_id) as remaining_slots,
    AVG(g.total_score) as average_score,
    COUNT(CASE WHEN g.total_score >= 5.0 THEN 1 END) as passed_students,
    COUNT(CASE WHEN g.total_score < 5.0 THEN 1 END) as failed_students,
    c.room,
    c.schedule
FROM dbo.classes c
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
INNER JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id AND e.deleted_at IS NULL
LEFT JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
WHERE c.deleted_at IS NULL
GROUP BY 
    c.class_id, c.class_code, c.class_name, 
    sub.subject_code, sub.subject_name, sub.credits,
    ay.year_name, c.semester, l.full_name,
    c.max_students, c.room, c.schedule;
GO

-- ===========================================
-- 4. VIEW: LỊCH SỬ ĐIỂM DANH
-- ===========================================
IF OBJECT_ID('vw_AttendanceHistory', 'V') IS NOT NULL DROP VIEW vw_AttendanceHistory;
GO

CREATE VIEW vw_AttendanceHistory
AS
SELECT 
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    c.class_code,
    c.class_name,
    sub.subject_name,
    ay.year_name as academic_year,
    a.attendance_date,
    a.status,
    a.note,
    l.full_name as lecturer_name
FROM dbo.attendances a
INNER JOIN dbo.enrollments e ON a.enrollment_id = e.enrollment_id
INNER JOIN dbo.students s ON e.student_id = s.student_id
INNER JOIN dbo.classes c ON a.class_id = c.class_id
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
INNER JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
WHERE s.deleted_at IS NULL 
    AND e.deleted_at IS NULL;
GO

-- ===========================================
-- 5. VIEW: ĐIỂM TRUNG BÌNH TÍCH LŨY
-- ===========================================
IF OBJECT_ID('vw_StudentCumulativeGPA', 'V') IS NOT NULL DROP VIEW vw_StudentCumulativeGPA;
GO

CREATE VIEW vw_StudentCumulativeGPA
AS
SELECT 
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    m.major_name,
    f.faculty_name,
    -- GPA tích lũy (trung bình của tất cả các năm học)
    ROUND(AVG(g.gpa10), 2) as cumulative_gpa10,
    ROUND(AVG(g.gpa4), 2) as cumulative_gpa4,
    SUM(g.accumulated_credits) as total_accumulated_credits,
    -- GPA cao nhất
    MAX(g.gpa10) as highest_gpa10,
    -- GPA thấp nhất
    MIN(g.gpa10) as lowest_gpa10,
    -- Xếp loại tổng hợp
    CASE 
        WHEN ROUND(AVG(g.gpa10), 2) >= 8.5 THEN N'Xuất sắc'
        WHEN ROUND(AVG(g.gpa10), 2) >= 7.0 THEN N'Giỏi'
        WHEN ROUND(AVG(g.gpa10), 2) >= 5.5 THEN N'Khá'
        WHEN ROUND(AVG(g.gpa10), 2) >= 4.0 THEN N'Trung bình'
        ELSE N'Yếu'
    END as overall_rank
FROM dbo.students s
LEFT JOIN dbo.gpas g ON s.student_id = g.student_id AND g.semester IS NULL AND g.deleted_at IS NULL
LEFT JOIN dbo.majors m ON s.major_id = m.major_id
LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
WHERE s.deleted_at IS NULL
GROUP BY 
    s.student_id, s.student_code, s.full_name,
    m.major_name, f.faculty_name;
GO

-- ===========================================
-- 6. VIEW: DANH SÁCH SINH VIÊN THEO LỚP
-- ===========================================
IF OBJECT_ID('vw_ClassRoster', 'V') IS NOT NULL DROP VIEW vw_ClassRoster;
GO

CREATE VIEW vw_ClassRoster
AS
SELECT 
    c.class_id,
    c.class_code,
    c.class_name,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    ay.year_name as academic_year,
    c.semester,
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    s.email as student_email,
    m.major_name,
    e.enrollment_date,
    e.status as enrollment_status,
    g.midterm_score,
    g.final_score,
    g.total_score,
    g.letter_grade
FROM dbo.classes c
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
INNER JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
INNER JOIN dbo.enrollments e ON c.class_id = e.class_id
INNER JOIN dbo.students s ON e.student_id = s.student_id
LEFT JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
LEFT JOIN dbo.majors m ON s.major_id = m.major_id
WHERE c.deleted_at IS NULL 
    AND e.deleted_at IS NULL
    AND s.deleted_at IS NULL;
GO

-- ===========================================
-- 7. VIEW: QUẢN LÝ ĐỢT ĐĂNG KÝ HỌC PHẦN (Admin)
-- ===========================================
IF OBJECT_ID('vw_RegistrationPeriodManagement', 'V') IS NOT NULL DROP VIEW vw_RegistrationPeriodManagement;
GO

CREATE VIEW vw_RegistrationPeriodManagement
AS
SELECT 
    rp.period_id,
    rp.period_name,
    rp.academic_year_id,
    ay.year_name as academic_year_name,
    rp.semester,
    CASE 
        WHEN rp.semester = 1 THEN N'Học kỳ 1'
        WHEN rp.semester = 2 THEN N'Học kỳ 2'
        WHEN rp.semester = 3 THEN N'Học kỳ 3 (Hè)'
        ELSE N'Không xác định'
    END as semester_text,
    rp.start_date,
    rp.end_date,
    rp.status,
    CASE 
        WHEN rp.status = 'OPEN' THEN N'Đang mở'
        WHEN rp.status = 'CLOSED' THEN N'Đã đóng'
        WHEN rp.status = 'UPCOMING' THEN N'Sắp mở'
        ELSE N'Không xác định'
    END as status_text,
    rp.description,
    rp.is_active,
    rp.created_at,
    rp.created_by,
    rp.updated_at,
    rp.updated_by,
    -- Thống kê
    COUNT(DISTINCT pc.class_id) as total_classes,
    COUNT(DISTINCT CASE WHEN pc.is_active = 1 AND pc.deleted_at IS NULL THEN pc.class_id END) as active_classes,
    SUM(DISTINCT c.max_students) as total_capacity,
    SUM(DISTINCT c.current_enrollment) as total_enrolled,
    SUM(DISTINCT c.max_students) - SUM(DISTINCT c.current_enrollment) as total_available_slots,
    -- Thời gian còn lại (nếu đang mở)
    CASE 
        WHEN rp.status = 'OPEN' AND GETDATE() BETWEEN rp.start_date AND rp.end_date 
        THEN DATEDIFF(DAY, GETDATE(), rp.end_date)
        ELSE NULL
    END as days_remaining,
    -- Trạng thái thời gian
    CASE 
        WHEN GETDATE() < rp.start_date THEN N'Chưa bắt đầu'
        WHEN GETDATE() BETWEEN rp.start_date AND rp.end_date THEN N'Đang diễn ra'
        WHEN GETDATE() > rp.end_date THEN N'Đã kết thúc'
        ELSE N'Không xác định'
    END as time_status
FROM dbo.registration_periods rp
INNER JOIN dbo.academic_years ay ON rp.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.period_classes pc ON rp.period_id = pc.period_id 
    AND pc.deleted_at IS NULL
LEFT JOIN dbo.classes c ON pc.class_id = c.class_id 
    AND c.deleted_at IS NULL
WHERE rp.deleted_at IS NULL
GROUP BY 
    rp.period_id, rp.period_name, rp.academic_year_id, ay.year_name,
    rp.semester, rp.start_date, rp.end_date, rp.status, rp.description,
    rp.is_active, rp.created_at, rp.created_by, rp.updated_at, rp.updated_by;
GO

-- ===========================================
-- 8. VIEW: CHI TIẾT LỚP HỌC TRONG ĐỢT ĐĂNG KÝ (Admin)
-- ===========================================
IF OBJECT_ID('vw_PeriodClassDetails', 'V') IS NOT NULL DROP VIEW vw_PeriodClassDetails;
GO

CREATE VIEW vw_PeriodClassDetails
AS
SELECT 
    pc.period_class_id,
    pc.period_id,
    rp.period_name,
    rp.status as period_status,
    rp.start_date as period_start_date,
    rp.end_date as period_end_date,
    pc.class_id,
    c.class_code,
    c.class_name,
    c.subject_id,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    c.lecturer_id,
    l.lecturer_code,
    l.full_name as lecturer_name,
    c.semester,
    c.max_students,
    c.current_enrollment,
    c.max_students - c.current_enrollment as available_seats,
    CASE 
        WHEN c.max_students > 0 
        THEN CAST(ROUND((c.current_enrollment * 100.0 / c.max_students), 2) AS DECIMAL(5,2))
        ELSE 0
    END as enrollment_percentage,
    -- ✅ CẬP NHẬT: Lấy thông tin phòng từ timetable_sessions thay vì c.room (DEPRECATED)
    (SELECT STRING_AGG(room_info, ', ')
     FROM (
         SELECT DISTINCT 
             r2.room_code + CASE WHEN r2.building IS NOT NULL THEN ' (' + r2.building + ')' ELSE '' END as room_info
         FROM dbo.timetable_sessions ts2
         INNER JOIN dbo.rooms r2 ON ts2.room_id = r2.room_id AND r2.deleted_at IS NULL
         WHERE ts2.class_id = c.class_id AND ts2.deleted_at IS NULL
     ) AS room_list
    ) as room,
    -- ✅ CẬP NHẬT: Lấy lịch học từ timetable_sessions thay vì c.schedule (DEPRECATED)
    (SELECT STRING_AGG(schedule_info, ', ')
     FROM (
         SELECT DISTINCT 
             CASE 
                 WHEN ts3.weekday = 1 THEN N'CN'
                 WHEN ts3.weekday = 2 THEN N'T2'
                 WHEN ts3.weekday = 3 THEN N'T3'
                 WHEN ts3.weekday = 4 THEN N'T4'
                 WHEN ts3.weekday = 5 THEN N'T5'
                 WHEN ts3.weekday = 6 THEN N'T6'
                 WHEN ts3.weekday = 7 THEN N'T7'
                 ELSE N'?'
             END + 
             CASE 
                 WHEN ts3.period_from IS NOT NULL AND ts3.period_to IS NOT NULL 
                 THEN N' Tiết ' + CAST(ts3.period_from AS NVARCHAR(2)) + N'-' + CAST(ts3.period_to AS NVARCHAR(2))
                 ELSE N' ' + CAST(ts3.start_time AS NVARCHAR(5)) + N'-' + CAST(ts3.end_time AS NVARCHAR(5))
             END as schedule_info
         FROM dbo.timetable_sessions ts3
         WHERE ts3.class_id = c.class_id AND ts3.deleted_at IS NULL
     ) AS schedule_list
    ) as schedule,
    ay.year_name as academic_year_name,
    sy.year_code as school_year_code,
    pc.is_active,
    pc.created_at,
    pc.created_by,
    pc.updated_at,
    pc.updated_by,
    -- Thống kê đăng ký trong đợt này
    COUNT(DISTINCT e.enrollment_id) as enrollments_in_period,
    -- Trạng thái lớp
    CASE 
        WHEN c.current_enrollment >= c.max_students THEN N'Đã đầy'
        WHEN c.current_enrollment >= c.max_students * 0.8 THEN N'Sắp đầy'
        WHEN c.current_enrollment > 0 THEN N'Còn chỗ'
        ELSE N'Chưa có đăng ký'
    END as class_status
FROM dbo.period_classes pc
INNER JOIN dbo.registration_periods rp ON pc.period_id = rp.period_id
INNER JOIN dbo.classes c ON pc.class_id = c.class_id
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id 
    AND e.deleted_at IS NULL
    AND e.enrollment_date BETWEEN rp.start_date AND rp.end_date
WHERE pc.deleted_at IS NULL
    AND rp.deleted_at IS NULL
    AND c.deleted_at IS NULL
GROUP BY 
    pc.period_class_id, pc.period_id, rp.period_name, rp.status, 
    rp.start_date, rp.end_date, pc.class_id, c.class_id, c.class_code, c.class_name,
    c.subject_id, sub.subject_code, sub.subject_name, sub.credits,
    c.lecturer_id, l.lecturer_code, l.full_name, c.semester,
    c.max_students, c.current_enrollment,
    ay.year_name, sy.year_code, pc.is_active, pc.created_at,
    pc.created_by, pc.updated_at, pc.updated_by;
GO

-- ===========================================
-- 9. VIEW: THỐNG KÊ ĐỢT ĐĂNG KÝ (Admin Dashboard)
-- ===========================================
IF OBJECT_ID('vw_RegistrationPeriodStatistics', 'V') IS NOT NULL DROP VIEW vw_RegistrationPeriodStatistics;
GO

CREATE VIEW vw_RegistrationPeriodStatistics
AS
SELECT 
    rp.period_id,
    rp.period_name,
    rp.status,
    rp.start_date,
    rp.end_date,
    -- Thống kê lớp
    COUNT(DISTINCT pc.class_id) as total_classes,
    COUNT(DISTINCT CASE WHEN pc.is_active = 1 THEN pc.class_id END) as active_classes,
    -- Thống kê đăng ký
    COUNT(DISTINCT e.enrollment_id) as total_enrollments,
    COUNT(DISTINCT e.student_id) as total_students,
    -- Thống kê sức chứa
    SUM(DISTINCT c.max_students) as total_capacity,
    SUM(DISTINCT c.current_enrollment) as total_enrolled,
    SUM(DISTINCT c.max_students) - SUM(DISTINCT c.current_enrollment) as total_available,
    -- Tỷ lệ đăng ký
    CASE 
        WHEN SUM(DISTINCT c.max_students) > 0
        THEN CAST(ROUND((SUM(DISTINCT c.current_enrollment) * 100.0 / SUM(DISTINCT c.max_students)), 2) AS DECIMAL(5,2))
        ELSE 0
    END as enrollment_rate,
    -- Thống kê theo môn học
    COUNT(DISTINCT c.subject_id) as total_subjects,
    -- Thống kê theo giảng viên
    COUNT(DISTINCT c.lecturer_id) as total_lecturers
FROM dbo.registration_periods rp
LEFT JOIN dbo.period_classes pc ON rp.period_id = pc.period_id 
    AND pc.deleted_at IS NULL
LEFT JOIN dbo.classes c ON pc.class_id = c.class_id 
    AND c.deleted_at IS NULL
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id 
    AND e.deleted_at IS NULL
    AND e.enrollment_date BETWEEN rp.start_date AND rp.end_date
WHERE rp.deleted_at IS NULL
GROUP BY 
    rp.period_id, rp.period_name, rp.status, rp.start_date, rp.end_date;
GO

-- ===========================================
-- 10. VIEW: QUẢN LÝ PHÒNG HỌC (Admin)
-- ===========================================
IF OBJECT_ID('vw_RoomsManagement', 'V') IS NOT NULL DROP VIEW vw_RoomsManagement;
GO

CREATE VIEW vw_RoomsManagement
AS
SELECT 
    r.room_id,
    r.room_code,
    r.building,
    r.capacity,
    r.is_active,
    r.created_at,
    r.created_by,
    r.updated_at,
    r.updated_by,
    -- Thống kê sử dụng
    COUNT(DISTINCT ts.session_id) as total_sessions,
    COUNT(DISTINCT CASE WHEN ts.deleted_at IS NULL THEN ts.session_id END) as active_sessions,
    COUNT(DISTINCT ts.class_id) as total_classes,
    COUNT(DISTINCT ts.lecturer_id) as total_lecturers,
    -- Trạng thái phòng
    CASE 
        WHEN r.is_active = 0 THEN N'Không hoạt động'
        WHEN COUNT(DISTINCT CASE WHEN ts.deleted_at IS NULL THEN ts.session_id END) > 0 THEN N'Đang sử dụng'
        ELSE N'Trống'
    END as room_status,
    -- Tỷ lệ sử dụng (số buổi học / tuần)
    COUNT(DISTINCT CASE WHEN ts.deleted_at IS NULL AND ts.weekday IS NOT NULL THEN ts.weekday END) as used_weekdays
FROM dbo.rooms r
LEFT JOIN dbo.timetable_sessions ts ON r.room_id = ts.room_id
WHERE r.deleted_at IS NULL
GROUP BY 
    r.room_id, r.room_code, r.building, r.capacity, r.is_active,
    r.created_at, r.created_by, r.updated_at, r.updated_by;
GO

-- ===========================================
-- 11. VIEW: LỊCH GIẢNG DẠY CHI TIẾT (với Period)
-- ===========================================
IF OBJECT_ID('vw_TimetableSessionsDetail', 'V') IS NOT NULL DROP VIEW vw_TimetableSessionsDetail;
GO

CREATE VIEW vw_TimetableSessionsDetail
AS
SELECT 
    ts.session_id,
    ts.class_id,
    c.class_code,
    c.class_name,
    ts.subject_id,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    ts.lecturer_id,
    l.lecturer_code,
    l.full_name as lecturer_name,
    ts.room_id,
    r.room_code,
    r.building,
    r.capacity as room_capacity,
    ts.school_year_id,
    sy.year_code as school_year_code,
    ts.week_no,
    ts.weekday,
    CASE 
        WHEN ts.weekday = 1 THEN N'Chủ nhật'
        WHEN ts.weekday = 2 THEN N'Thứ 2'
        WHEN ts.weekday = 3 THEN N'Thứ 3'
        WHEN ts.weekday = 4 THEN N'Thứ 4'
        WHEN ts.weekday = 5 THEN N'Thứ 5'
        WHEN ts.weekday = 6 THEN N'Thứ 6'
        WHEN ts.weekday = 7 THEN N'Thứ 7'
        ELSE N'Không xác định'
    END as weekday_text,
    ts.start_time,
    ts.end_time,
    ts.period_from,
    ts.period_to,
    CASE 
        WHEN ts.period_from IS NOT NULL AND ts.period_to IS NOT NULL 
        THEN N'Tiết ' + CAST(ts.period_from AS NVARCHAR(2)) + N'-' + CAST(ts.period_to AS NVARCHAR(2))
        ELSE N'Không xác định'
    END as period_text,
    ts.recurrence,
    CASE 
        WHEN ts.recurrence = 'ONCE' THEN N'Một lần'
        WHEN ts.recurrence = 'WEEKLY' THEN N'Hàng tuần'
        WHEN ts.recurrence = 'BIWEEKLY' THEN N'Hai tuần một lần'
        ELSE N'Không xác định'
    END as recurrence_text,
    ts.status,
    CASE 
        WHEN ts.status = 'PLANNED' THEN N'Đã lên kế hoạch'
        WHEN ts.status = 'ACTIVE' THEN N'Đang hoạt động'
        WHEN ts.status = 'CANCELLED' THEN N'Đã hủy'
        WHEN ts.status = 'COMPLETED' THEN N'Đã hoàn thành'
        ELSE N'Không xác định'
    END as status_text,
    ts.notes,
    -- Thống kê đăng ký
    COUNT(DISTINCT e.enrollment_id) as enrolled_students,
    c.max_students,
    c.current_enrollment,
    CASE 
        WHEN c.max_students > 0 
        THEN CAST(ROUND((c.current_enrollment * 100.0 / c.max_students), 2) AS DECIMAL(5,2))
        ELSE 0
    END as enrollment_percentage,
    ts.created_at,
    ts.created_by,
    ts.updated_at,
    ts.updated_by
FROM dbo.timetable_sessions ts
INNER JOIN dbo.classes c ON ts.class_id = c.class_id
INNER JOIN dbo.subjects sub ON ts.subject_id = sub.subject_id
LEFT JOIN dbo.lecturers l ON ts.lecturer_id = l.lecturer_id
LEFT JOIN dbo.rooms r ON ts.room_id = r.room_id
LEFT JOIN dbo.school_years sy ON ts.school_year_id = sy.school_year_id
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id AND e.deleted_at IS NULL
WHERE ts.deleted_at IS NULL
    AND c.deleted_at IS NULL
GROUP BY 
    ts.session_id, ts.class_id, c.class_code, c.class_name,
    ts.subject_id, sub.subject_code, sub.subject_name, sub.credits,
    ts.lecturer_id, l.lecturer_code, l.full_name,
    ts.room_id, r.room_code, r.building, r.capacity,
    ts.school_year_id, sy.year_code,
    ts.week_no, ts.weekday, ts.start_time, ts.end_time,
    ts.period_from, ts.period_to, ts.recurrence, ts.status, ts.notes,
    c.max_students, c.current_enrollment,
    ts.created_at, ts.created_by, ts.updated_at, ts.updated_by;
GO

-- ===========================================
-- 12. VIEW: CẬP NHẬT vw_ClassStatistics (dùng rooms và timetable_sessions)
-- ===========================================
-- Xóa view cũ và tạo lại với dữ liệu từ rooms và timetable_sessions
IF OBJECT_ID('vw_ClassStatistics', 'V') IS NOT NULL DROP VIEW vw_ClassStatistics;
GO

CREATE VIEW vw_ClassStatistics
AS
SELECT 
    c.class_id,
    c.class_code,
    c.class_name,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    ay.year_name as academic_year,
    c.semester,
    l.full_name as lecturer_name,
    c.max_students,
    c.current_enrollment, -- ✅ THÊM: Số lượng đăng ký hiện tại
    COUNT(DISTINCT e.student_id) as enrolled_students,
    c.max_students - c.current_enrollment as remaining_slots,
    AVG(g.total_score) as average_score,
    COUNT(CASE WHEN g.total_score >= 5.0 THEN 1 END) as passed_students,
    COUNT(CASE WHEN g.total_score < 5.0 THEN 1 END) as failed_students,
    -- ✅ CẬP NHẬT: Lấy thông tin phòng từ timetable_sessions thay vì c.room (DEPRECATED)
    -- Dùng subquery để lấy DISTINCT rooms trước khi STRING_AGG
    (SELECT STRING_AGG(room_info, ', ')
     FROM (
         SELECT DISTINCT 
             r2.room_code + CASE WHEN r2.building IS NOT NULL THEN ' (' + r2.building + ')' ELSE '' END as room_info
         FROM dbo.timetable_sessions ts2
         INNER JOIN dbo.rooms r2 ON ts2.room_id = r2.room_id AND r2.deleted_at IS NULL
         WHERE ts2.class_id = c.class_id AND ts2.deleted_at IS NULL
     ) AS room_list
    ) as rooms,
    -- ✅ CẬP NHẬT: Lấy lịch học từ timetable_sessions thay vì c.schedule (DEPRECATED)
    -- Dùng subquery để lấy DISTINCT schedule trước khi STRING_AGG
    (SELECT STRING_AGG(schedule_info, ', ')
     FROM (
         SELECT DISTINCT 
             CASE 
                 WHEN ts3.weekday = 1 THEN N'CN'
                 WHEN ts3.weekday = 2 THEN N'T2'
                 WHEN ts3.weekday = 3 THEN N'T3'
                 WHEN ts3.weekday = 4 THEN N'T4'
                 WHEN ts3.weekday = 5 THEN N'T5'
                 WHEN ts3.weekday = 6 THEN N'T6'
                 WHEN ts3.weekday = 7 THEN N'T7'
                 ELSE N'?'
             END + 
             CASE 
                 WHEN ts3.period_from IS NOT NULL AND ts3.period_to IS NOT NULL 
                 THEN N' Tiết ' + CAST(ts3.period_from AS NVARCHAR(2)) + N'-' + CAST(ts3.period_to AS NVARCHAR(2))
                 ELSE N' ' + CAST(ts3.start_time AS NVARCHAR(5)) + N'-' + CAST(ts3.end_time AS NVARCHAR(5))
             END as schedule_info
         FROM dbo.timetable_sessions ts3
         WHERE ts3.class_id = c.class_id AND ts3.deleted_at IS NULL
     ) AS schedule_list
    ) as schedule
FROM dbo.classes c
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
INNER JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id AND e.deleted_at IS NULL
LEFT JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
WHERE c.deleted_at IS NULL
GROUP BY 
    c.class_id, c.class_code, c.class_name, 
    sub.subject_code, sub.subject_name, sub.credits,
    ay.year_name, c.semester, l.full_name,
    c.max_students, c.current_enrollment;
GO

-- ===========================================
-- 13. VIEW: THỐNG KÊ ĐIỂM DANH THEO LỚP (QUAN TRỌNG!)
-- ===========================================
IF OBJECT_ID('vw_ClassAttendanceStatistics', 'V') IS NOT NULL DROP VIEW vw_ClassAttendanceStatistics;
GO

CREATE VIEW vw_ClassAttendanceStatistics
AS
SELECT 
    c.class_id,
    c.class_code,
    c.class_name,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    ay.year_name as academic_year,
    c.semester,
    l.full_name as lecturer_name,
    c.max_students,
    c.current_enrollment,
    -- Thống kê buổi học
    COUNT(DISTINCT ts.session_id) as total_sessions,
    COUNT(DISTINCT a.attendance_id) as total_attendances,
    -- Thống kê theo status
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
    -- Tỷ lệ điểm danh
    CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 0
    END as attendance_rate,
    -- Sinh viên có điểm danh tốt (>= 80%)
    COUNT(DISTINCT CASE 
        WHEN student_attendance.attendance_rate >= 80 THEN e.student_id 
    END) as students_with_good_attendance,
    -- Sinh viên có điểm danh kém (< 50%)
    COUNT(DISTINCT CASE 
        WHEN student_attendance.attendance_rate < 50 THEN e.student_id 
    END) as students_with_poor_attendance,
    -- Ngày điểm danh gần nhất
    MAX(a.attendance_date) as last_attendance_date
FROM dbo.classes c
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
INNER JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id AND e.deleted_at IS NULL
LEFT JOIN dbo.timetable_sessions ts ON c.class_id = ts.class_id AND ts.deleted_at IS NULL
LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
LEFT JOIN (
    -- Tính attendance rate cho từng sinh viên
    SELECT 
        e2.enrollment_id,
        e2.student_id,
        e2.class_id,
        CASE 
            WHEN COUNT(a2.attendance_id) > 0
            THEN CAST(ROUND((COUNT(CASE WHEN a2.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a2.attendance_id)), 2) AS DECIMAL(5,2))
            ELSE 0
        END as attendance_rate
    FROM dbo.enrollments e2
    LEFT JOIN dbo.attendances a2 ON e2.enrollment_id = a2.enrollment_id AND a2.deleted_at IS NULL
    WHERE e2.deleted_at IS NULL
    GROUP BY e2.enrollment_id, e2.student_id, e2.class_id
) student_attendance ON e.enrollment_id = student_attendance.enrollment_id
WHERE c.deleted_at IS NULL
GROUP BY 
    c.class_id, c.class_code, c.class_name,
    sub.subject_code, sub.subject_name, sub.credits,
    ay.year_name, c.semester, l.full_name,
    c.max_students, c.current_enrollment;
GO

-- ===========================================
-- 14. VIEW: THỐNG KÊ ĐIỂM DANH THEO SINH VIÊN (QUAN TRỌNG!)
-- ===========================================
IF OBJECT_ID('vw_StudentAttendanceStatistics', 'V') IS NOT NULL DROP VIEW vw_StudentAttendanceStatistics;
GO

CREATE VIEW vw_StudentAttendanceStatistics
AS
SELECT 
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    e.class_id,
    c.class_code,
    c.class_name,
    sub.subject_id,
    sub.subject_code,
    sub.subject_name,
    ay.year_name as academic_year,
    c.semester,
    -- Thống kê buổi học
    COUNT(DISTINCT ts.session_id) as total_sessions,
    COUNT(DISTINCT a.attendance_id) as total_attendances,
    -- Thống kê theo status
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
    -- Tỷ lệ điểm danh
    CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 100
    END as attendance_rate,
    -- Ngày điểm danh gần nhất
    MAX(a.attendance_date) as last_attendance_date,
    -- Số buổi vắng liên tiếp (tính từ ngày gần nhất)
    (
        SELECT TOP 1 COUNT(*)
        FROM (
            SELECT 
                a2.attendance_date,
                ROW_NUMBER() OVER (ORDER BY a2.attendance_date DESC) as rn
            FROM dbo.attendances a2
            WHERE a2.enrollment_id = e.enrollment_id
                AND a2.deleted_at IS NULL
                AND a2.status = 'Absent'
        ) recent_absences
        WHERE recent_absences.rn = 1
    ) as consecutive_absences
FROM dbo.students s
INNER JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
INNER JOIN dbo.classes c ON e.class_id = c.class_id AND c.deleted_at IS NULL
INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
LEFT JOIN dbo.timetable_sessions ts ON c.class_id = ts.class_id AND ts.deleted_at IS NULL
LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY 
    s.student_id, s.student_code, s.full_name,
    e.class_id, e.enrollment_id, c.class_code, c.class_name,
    sub.subject_id, sub.subject_code, sub.subject_name,
    ay.year_name, c.semester;
GO

-- ===========================================
-- 15. VIEW: THỐNG KÊ ĐIỂM DANH THEO MÔN HỌC
-- ===========================================
IF OBJECT_ID('vw_SubjectAttendanceStatistics', 'V') IS NOT NULL DROP VIEW vw_SubjectAttendanceStatistics;
GO

CREATE VIEW vw_SubjectAttendanceStatistics
AS
SELECT 
    sub.subject_id,
    sub.subject_code,
    sub.subject_name,
    sub.credits,
    d.department_name,
    f.faculty_name,
    -- Thống kê lớp học
    COUNT(DISTINCT c.class_id) as total_classes,
    COUNT(DISTINCT e.student_id) as total_students,
    -- Thống kê buổi học
    COUNT(DISTINCT ts.session_id) as total_sessions,
    COUNT(DISTINCT a.attendance_id) as total_attendances,
    -- Thống kê theo status
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
    -- Tỷ lệ điểm danh trung bình
    CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 0
    END as average_attendance_rate
FROM dbo.subjects sub
LEFT JOIN dbo.departments d ON sub.department_id = d.department_id
LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
LEFT JOIN dbo.classes c ON sub.subject_id = c.subject_id AND c.deleted_at IS NULL
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id AND e.deleted_at IS NULL
LEFT JOIN dbo.timetable_sessions ts ON c.class_id = ts.class_id AND ts.deleted_at IS NULL
LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
WHERE sub.deleted_at IS NULL
GROUP BY 
    sub.subject_id, sub.subject_code, sub.subject_name, sub.credits,
    d.department_name, f.faculty_name;
GO

-- ===========================================
-- 16. VIEW: THỐNG KÊ ĐIỂM DANH THEO GIẢNG VIÊN
-- ===========================================
IF OBJECT_ID('vw_LecturerAttendanceStatistics', 'V') IS NOT NULL DROP VIEW vw_LecturerAttendanceStatistics;
GO

CREATE VIEW vw_LecturerAttendanceStatistics
AS
SELECT 
    l.lecturer_id,
    l.lecturer_code,
    l.full_name as lecturer_name,
    d.department_name,
    f.faculty_name,
    -- Thống kê lớp học
    COUNT(DISTINCT c.class_id) as total_classes,
    COUNT(DISTINCT e.student_id) as total_students,
    -- Thống kê buổi học
    COUNT(DISTINCT ts.session_id) as total_sessions,
    COUNT(DISTINCT a.attendance_id) as total_attendances,
    -- Thống kê theo status
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
    -- Tỷ lệ điểm danh trung bình
    CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 0
    END as average_attendance_rate
FROM dbo.lecturers l
LEFT JOIN dbo.departments d ON l.department_id = d.department_id
LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
LEFT JOIN dbo.classes c ON l.lecturer_id = c.lecturer_id AND c.deleted_at IS NULL
LEFT JOIN dbo.enrollments e ON c.class_id = e.class_id AND e.deleted_at IS NULL
LEFT JOIN dbo.timetable_sessions ts ON c.class_id = ts.class_id AND ts.deleted_at IS NULL
LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
WHERE l.deleted_at IS NULL
GROUP BY 
    l.lecturer_id, l.lecturer_code, l.full_name,
    d.department_name, f.faculty_name;
GO

-- ===========================================
-- 17. VIEW: THỐNG KÊ ĐIỂM DANH THEO THỜI GIAN
-- ===========================================
IF OBJECT_ID('vw_AttendanceTimeStatistics', 'V') IS NOT NULL DROP VIEW vw_AttendanceTimeStatistics;
GO

CREATE VIEW vw_AttendanceTimeStatistics
AS
SELECT 
    CAST(a.attendance_date AS DATE) as attendance_date,
    DATEPART(WEEK, a.attendance_date) as week_no,
    DATEPART(MONTH, a.attendance_date) as month_no,
    DATEPART(YEAR, a.attendance_date) as year_no,
    c.semester,
    ay.year_name as academic_year,
    -- Thống kê
    COUNT(DISTINCT a.attendance_id) as total_attendances,
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
    -- Tỷ lệ điểm danh
    CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 0
    END as attendance_rate,
    -- Số lớp học
    COUNT(DISTINCT a.class_id) as total_classes,
    -- Số sinh viên
    COUNT(DISTINCT e.student_id) as total_students
FROM dbo.attendances a
INNER JOIN dbo.enrollments e ON a.enrollment_id = e.enrollment_id AND e.deleted_at IS NULL
INNER JOIN dbo.classes c ON a.class_id = c.class_id AND c.deleted_at IS NULL
LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
WHERE a.deleted_at IS NULL
GROUP BY 
    CAST(a.attendance_date AS DATE),
    DATEPART(WEEK, a.attendance_date),
    DATEPART(MONTH, a.attendance_date),
    DATEPART(YEAR, a.attendance_date),
    c.semester,
    ay.year_name;
GO

-- ===========================================
-- 18. VIEW: SINH VIÊN CÓ NGUY CƠ (QUAN TRỌNG!)
-- ===========================================
IF OBJECT_ID('vw_AtRiskStudents', 'V') IS NOT NULL DROP VIEW vw_AtRiskStudents;
GO

CREATE VIEW vw_AtRiskStudents
AS
SELECT 
    s.student_id,
    s.student_code,
    s.full_name as student_name,
    m.major_name,
    f.faculty_name,
    ac.class_code as admin_class_code,
    ac.class_name as admin_class_name,
    -- GPA
    (SELECT TOP 1 gpa10 FROM dbo.gpas 
     WHERE student_id = s.student_id AND deleted_at IS NULL 
     ORDER BY created_at DESC, semester DESC) as current_gpa,
    -- Attendance rate (tổng hợp tất cả các lớp)
    CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 100
    END as overall_attendance_rate,
    -- Đánh giá nguy cơ
    CASE 
        WHEN (SELECT TOP 1 gpa10 FROM dbo.gpas 
              WHERE student_id = s.student_id AND deleted_at IS NULL 
              ORDER BY created_at DESC, semester DESC) < 2.0
             AND (CASE 
                    WHEN COUNT(DISTINCT a.attendance_id) > 0
                    THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
                    ELSE 100
                  END) < 50
        THEN N'CAO'
        WHEN (SELECT TOP 1 gpa10 FROM dbo.gpas 
              WHERE student_id = s.student_id AND deleted_at IS NULL 
              ORDER BY created_at DESC, semester DESC) < 2.0
             OR (CASE 
                   WHEN COUNT(DISTINCT a.attendance_id) > 0
                   THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
                   ELSE 100
                 END) < 50
        THEN N'TRUNG BÌNH'
        ELSE N'THẤP'
    END as risk_level,
    -- Lý do nguy cơ
    CASE 
        WHEN (SELECT TOP 1 gpa10 FROM dbo.gpas 
              WHERE student_id = s.student_id AND deleted_at IS NULL 
              ORDER BY created_at DESC, semester DESC) < 2.0
             AND (CASE 
                    WHEN COUNT(DISTINCT a.attendance_id) > 0
                    THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
                    ELSE 100
                  END) < 50
        THEN N'GPA thấp và điểm danh kém'
        WHEN (SELECT TOP 1 gpa10 FROM dbo.gpas 
              WHERE student_id = s.student_id AND deleted_at IS NULL 
              ORDER BY created_at DESC, semester DESC) < 2.0
        THEN N'GPA thấp (< 2.0)'
        WHEN (CASE 
                WHEN COUNT(DISTINCT a.attendance_id) > 0
                THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
                ELSE 100
              END) < 50
        THEN N'Điểm danh kém (< 50%)'
        ELSE N'Không có nguy cơ'
    END as risk_reasons,
    -- Số lớp đang học
    COUNT(DISTINCT e.class_id) as current_classes,
    -- Số buổi vắng
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as total_absences
FROM dbo.students s
LEFT JOIN dbo.majors m ON s.major_id = m.major_id
LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id 
    AND e.deleted_at IS NULL 
    AND e.enrollment_status = 'APPROVED'
LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY 
    s.student_id, s.student_code, s.full_name,
    m.major_name, f.faculty_name,
    ac.class_code, ac.class_name
HAVING
    (SELECT TOP 1 gpa10 FROM dbo.gpas 
     WHERE student_id = s.student_id AND deleted_at IS NULL 
     ORDER BY created_at DESC, semester DESC) < 2.0
    OR
    (CASE 
        WHEN COUNT(DISTINCT a.attendance_id) > 0
        THEN CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(DISTINCT a.attendance_id)), 2) AS DECIMAL(5,2))
        ELSE 100
     END) < 50;
GO

PRINT '';
PRINT '✅ Đã tạo xong tất cả Views!';
PRINT '   - vw_StudentTranscript: Bảng điểm sinh viên';
PRINT '   - vw_StudentGPASummary: Tổng hợp GPA';
PRINT '   - vw_ClassStatistics: Thống kê lớp học (✅ Đã cập nhật dùng rooms & timetable_sessions)';
PRINT '   - vw_AttendanceHistory: Lịch sử điểm danh';
PRINT '   - vw_StudentCumulativeGPA: GPA tích lũy';
PRINT '   - vw_ClassRoster: Danh sách sinh viên theo lớp';
PRINT '   - vw_RegistrationPeriodManagement: Quản lý đợt đăng ký (Admin)';
PRINT '   - vw_PeriodClassDetails: Chi tiết lớp trong đợt đăng ký (Admin)';
PRINT '   - vw_RegistrationPeriodStatistics: Thống kê đợt đăng ký (Admin)';
PRINT '   - vw_RoomsManagement: Quản lý phòng học (Admin) ✅ MỚI';
PRINT '   - vw_TimetableSessionsDetail: Lịch giảng dạy chi tiết (với Period) ✅ MỚI';
PRINT '   - vw_ClassAttendanceStatistics: Thống kê điểm danh theo lớp ✅ MỚI';
PRINT '   - vw_StudentAttendanceStatistics: Thống kê điểm danh theo sinh viên ✅ MỚI';
PRINT '   - vw_SubjectAttendanceStatistics: Thống kê điểm danh theo môn học ✅ MỚI';
PRINT '   - vw_LecturerAttendanceStatistics: Thống kê điểm danh theo giảng viên ✅ MỚI';
PRINT '   - vw_AttendanceTimeStatistics: Thống kê điểm danh theo thời gian ✅ MỚI';
PRINT '   - vw_AtRiskStudents: Sinh viên có nguy cơ ✅ MỚI';
PRINT '';
GO
