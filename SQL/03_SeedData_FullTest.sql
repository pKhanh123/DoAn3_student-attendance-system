                                                                                          
USE EducationManagement;
GO

SET NOCOUNT ON;
PRINT 'Bat dau seed full test dataset';

-- ===========================================
-- XÓA CÁC SECTIONS KHÔNG CẦN THIẾT (ĐÃ GỘP VÀO SECTIONS KHÁC)
-- ===========================================
-- BƯỚC 1: Cập nhật parent_code của các permissions con TRƯỚC KHI xóa sections
-- (Để tránh lỗi foreign key constraint)
PRINT 'Cap nhat parent_code cua cac permissions con...';

UPDATE dbo.permissions
SET parent_code = 'ADMIN_SECTION_ACADEMIC',
    sort_order = 7,
    updated_at = GETDATE(),
    updated_by = 'seed_full_test'
WHERE permission_code = 'ADMIN_SUBJECT_PREREQUISITES'
  AND (parent_code = 'ADMIN_SECTION_SUBJECTS' OR parent_code IS NULL);

UPDATE dbo.permissions
SET parent_code = 'ADMIN_SECTION_ACADEMIC',
    sort_order = 8,
    updated_at = GETDATE(),
    updated_by = 'seed_full_test'
WHERE permission_code = 'ADMIN_CLASSES'
  AND (parent_code = 'ADMIN_SECTION_SUBJECTS' OR parent_code IS NULL);

UPDATE dbo.permissions
SET parent_code = 'ADMIN_SECTION_ACADEMIC',
    sort_order = 9,
    updated_at = GETDATE(),
    updated_by = 'seed_full_test'
WHERE permission_code = 'ADMIN_TIMETABLE'
  AND (parent_code = 'ADMIN_SECTION_TIMETABLE' OR parent_code IS NULL);

-- BƯỚC 2: Xóa ADMIN_SECTION_SUBJECTS (đã gộp vào ADMIN_SECTION_ACADEMIC)
PRINT 'Xoa ADMIN_SECTION_SUBJECTS...';
DELETE FROM dbo.role_permissions WHERE permission_id = 'PERM_ADM_SUBJECTS';
DELETE FROM dbo.permissions WHERE permission_id = 'PERM_ADM_SUBJECTS';

-- BƯỚC 3: Xóa ADMIN_SECTION_TIMETABLE (đã gộp vào ADMIN_SECTION_ACADEMIC)
PRINT 'Xoa ADMIN_SECTION_TIMETABLE...';
DELETE FROM dbo.role_permissions WHERE permission_id = 'PERM_ADM_TIMETABLE';
DELETE FROM dbo.permissions WHERE permission_id = 'PERM_ADM_TIMETABLE';

-- BƯỚC 4: Xóa PERM_ADV_ENROLLMENTS (đã gộp vào PERM_ADM_ENROLLMENTS)
PRINT 'Xoa PERM_ADV_ENROLLMENTS (da gop vao PERM_ADM_ENROLLMENTS)...';
DELETE FROM dbo.role_permissions WHERE permission_id = 'PERM_ADV_ENROLLMENTS';
DELETE FROM dbo.permissions WHERE permission_id = 'PERM_ADV_ENROLLMENTS';

-- BƯỚC 5: Xóa PERM_ADV_REPORTS (đã gộp vào PERM_ADV_SYSTEM_REPORTS)
PRINT 'Xoa PERM_ADV_REPORTS (da gop vao PERM_ADV_SYSTEM_REPORTS)...';
DELETE FROM dbo.role_permissions WHERE permission_id = 'PERM_ADV_REPORTS';
DELETE FROM dbo.permissions WHERE permission_id = 'PERM_ADV_REPORTS';
GO

-- ===========================================
-- PHAN 1: VAI TRO HE THONG
-- ===========================================
MERGE dbo.roles AS target
USING (VALUES
    ('ROLE_ADMIN',    N'Admin',             N'Quản trị hệ thống',          1),
    ('ROLE_LECTURER', N'Lecturer',         N'Giảng viên giảng dạy',       1),
    ('ROLE_STUDENT',  N'Student',          N'Sinh viên',                  1),
    ('ROLE_ADVISOR',  N'Advisor',          N'Cố vấn học tập & Nhân viên phòng đào tạo',             1)
) AS src(role_id, role_name, description, is_active)
ON target.role_id = src.role_id
WHEN MATCHED THEN
    UPDATE SET role_name = src.role_name,
               description = src.description,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (role_id, role_name, description, is_active, created_by)
    VALUES (src.role_id, src.role_name, src.description, src.is_active, 'seed_full_test');
GO

-- ===========================================
-- PHAN 2: NGUOI DUNG HE THONG
-- ===========================================
MERGE dbo.users AS target
USING (VALUES
    -- ✅ User admin chính (USER001) - dùng để đăng nhập với username 'admin'
    ('USER001',       'admin',              '$2a$10$h5gvrNjE2bhwhHn6Ofofq.Ppr0hvpLY5Q3mbY1OjkkGL8CMxm2VBm', 'admin@example.com',           '0901234567', N'Nguyễn Văn Admin',            'ROLE_ADMIN',   1),
    -- User admin cho full test (USR_ADMIN_FT) - giữ lại để test
    ('USR_ADMIN_FT',  'admin_fulltest',     '$2a$10$h5gvrNjE2bhwhHn6Ofofq.Ppr0hvpLY5Q3mbY1OjkkGL8CMxm2VBm', 'admin.ft@example.com',        '0901000000', N'Nguyen Minh Quan Tri',        'ROLE_ADMIN',   1),
    ('USR_SUPPORT_FT','support_academic',   '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'support.academic@example.com','0901000001', N'Trần Hoài Thu',               'ROLE_ADVISOR', 1),
    ('USR_LEC_01',    'lecturer_hung',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'hung.lecturer@example.com',   '0909000001', N'Nguyen Huu Hung',             'ROLE_LECTURER',1),
    ('USR_LEC_02',    'lecturer_thao',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'thao.lecturer@example.com',   '0909000002', N'Pham Thao Nhu',               'ROLE_LECTURER',1),
    ('USR_ADV_01',    'advisor_toan',       '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'advisor.toan@example.com',    '0909000003', N'Dang Quoc Toan',              'ROLE_ADVISOR', 1),
    ('USR_STU_21A',   'student_k21_a',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k21.001@example.com',      '0911000001', N'Tran Nhat Minh',              'ROLE_STUDENT', 1),
    ('USR_STU_21B',   'student_k21_b',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k21.002@example.com',      '0911000002', N'Ngo Dieu Anh',                'ROLE_STUDENT', 1),
    ('USR_STU_22A',   'student_k22_a',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k22.010@example.com',      '0912000001', N'Pham Huu Long',               'ROLE_STUDENT', 1),
    ('USR_STU_23A',   'student_k23_a',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k23.005@example.com',      '0913000001', N'Luu Gia Khanh',              'ROLE_STUDENT', 1),
    ('USR_STU_24A',   'student_k24_a',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k24.015@example.com',      '0914000001', N'Do Quynh Nhi',                'ROLE_STUDENT', 1),
    ('USR_STU_24B',   'student_k24_b',      '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k24.099@example.com',      '0914000002', N'Le Minh Triet',               'ROLE_STUDENT', 1)
) AS src(user_id, username, password_hash, email, phone, full_name, role_id, is_active)
ON target.user_id = src.user_id
WHEN MATCHED THEN
    UPDATE SET username = src.username,
               password_hash = src.password_hash,
               email = src.email,
               phone = src.phone,
               full_name = src.full_name,
               role_id = src.role_id,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (user_id, username, password_hash, email, phone, full_name, role_id, is_active, created_by)
    VALUES (src.user_id, src.username, src.password_hash, src.email, src.phone, src.full_name, src.role_id, src.is_active, 'seed_full_test');
GO

-- ===========================================
-- PHAN 3: DON VI DAO TAO
-- ===========================================
-- Xử lý xung đột: Kiểm tra UNIQUE constraint trên faculty_code
-- Nếu có faculty với code 'CNTT' hoặc 'BUS' nhưng khác ID, cập nhật các bảng con rồi xóa và tạo mới
BEGIN
    DECLARE @OldFacultyIdCNTT VARCHAR(50), @OldFacultyIdBUS VARCHAR(50);
    SELECT @OldFacultyIdCNTT = faculty_id FROM dbo.faculties WHERE faculty_code = 'CNTT' AND faculty_id != 'FAC_IT';
    SELECT @OldFacultyIdBUS = faculty_id FROM dbo.faculties WHERE faculty_code = 'BUS' AND faculty_id != 'FAC_BUS';

    -- Xử lý FAC001 (code 'CNTT')
    IF @OldFacultyIdCNTT IS NOT NULL
    BEGIN
        -- Tạo FAC_IT trước nếu chưa có (tạm thời dùng code khác để tránh UNIQUE constraint)
        IF NOT EXISTS (SELECT 1 FROM dbo.faculties WHERE faculty_id = 'FAC_IT')
        BEGIN
            -- Tạm thời INSERT với code tạm, sau đó sẽ UPDATE lại
            INSERT INTO dbo.faculties (faculty_id, faculty_code, faculty_name, description, is_active, created_by)
            VALUES ('FAC_IT', 'CNTT_TEMP', N'Cong nghe Thong tin', N'Khoa dao tao cong nghe', 1, 'seed_full_test');
        END
        ELSE
        BEGIN
            -- Nếu FAC_IT đã tồn tại nhưng code khác 'CNTT', tạm thời đổi code để tránh UNIQUE constraint
            DECLARE @CurrentFAC_ITCode VARCHAR(20);
            SELECT @CurrentFAC_ITCode = faculty_code FROM dbo.faculties WHERE faculty_id = 'FAC_IT';
            IF @CurrentFAC_ITCode != 'CNTT' AND @CurrentFAC_ITCode != 'CNTT_TEMP'
            BEGIN
                UPDATE dbo.faculties SET faculty_code = 'CNTT_TEMP' WHERE faculty_id = 'FAC_IT';
            END
        END
        
        -- Cập nhật các bảng con để tham chiếu đến FAC_IT
        UPDATE dbo.departments SET faculty_id = 'FAC_IT' WHERE faculty_id = @OldFacultyIdCNTT;
        UPDATE dbo.majors SET faculty_id = 'FAC_IT' WHERE faculty_id = @OldFacultyIdCNTT;
        UPDATE dbo.students SET faculty_id = 'FAC_IT' WHERE faculty_id = @OldFacultyIdCNTT;
        
        -- Xóa bản ghi cũ sau khi đã cập nhật xong
        DELETE FROM dbo.faculties WHERE faculty_id = @OldFacultyIdCNTT;
        
        -- Cập nhật lại code của FAC_IT về 'CNTT'
        UPDATE dbo.faculties SET faculty_code = 'CNTT' WHERE faculty_id = 'FAC_IT';
    END

    -- Xử lý FAC_BUS (code 'BUS') - nếu có xung đột
    IF @OldFacultyIdBUS IS NOT NULL
    BEGIN
        -- Tạo FAC_BUS trước nếu chưa có
        IF NOT EXISTS (SELECT 1 FROM dbo.faculties WHERE faculty_id = 'FAC_BUS')
        BEGIN
            INSERT INTO dbo.faculties (faculty_id, faculty_code, faculty_name, description, is_active, created_by)
            VALUES ('FAC_BUS', 'BUS_TEMP', N'Kinh doanh So', N'Khoa kinh doanh va quan tri', 1, 'seed_full_test');
        END
        ELSE
        BEGIN
            -- Nếu FAC_BUS đã tồn tại nhưng code khác 'BUS', tạm thời đổi code
            DECLARE @CurrentFAC_BUSCode VARCHAR(20);
            SELECT @CurrentFAC_BUSCode = faculty_code FROM dbo.faculties WHERE faculty_id = 'FAC_BUS';
            IF @CurrentFAC_BUSCode != 'BUS' AND @CurrentFAC_BUSCode != 'BUS_TEMP'
            BEGIN
                UPDATE dbo.faculties SET faculty_code = 'BUS_TEMP' WHERE faculty_id = 'FAC_BUS';
            END
        END
        
        -- Cập nhật các bảng con
        UPDATE dbo.departments SET faculty_id = 'FAC_BUS' WHERE faculty_id = @OldFacultyIdBUS;
        UPDATE dbo.majors SET faculty_id = 'FAC_BUS' WHERE faculty_id = @OldFacultyIdBUS;
        UPDATE dbo.students SET faculty_id = 'FAC_BUS' WHERE faculty_id = @OldFacultyIdBUS;
        
        -- Xóa bản ghi cũ
        DELETE FROM dbo.faculties WHERE faculty_id = @OldFacultyIdBUS;
        
        -- Cập nhật lại code
        UPDATE dbo.faculties SET faculty_code = 'BUS' WHERE faculty_id = 'FAC_BUS';
    END
END
GO

-- Bước 2: MERGE faculties (chỉ INSERT hoặc UPDATE các trường khác, không UPDATE faculty_id)
MERGE dbo.faculties AS target
USING (VALUES
    ('FAC_IT',  'CNTT', N'Cong nghe Thong tin', N'Khoa dao tao cong nghe', 1),
    ('FAC_BUS', 'BUS',  N'Kinh doanh So',      N'Khoa kinh doanh va quan tri', 1)
) AS src(faculty_id, faculty_code, faculty_name, description, is_active)
ON target.faculty_id = src.faculty_id
WHEN MATCHED THEN
    UPDATE SET faculty_code = src.faculty_code,
               faculty_name = src.faculty_name,
               description = src.description,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (faculty_id, faculty_code, faculty_name, description, is_active, created_by)
    VALUES (src.faculty_id, src.faculty_code, src.faculty_name, src.description, src.is_active, 'seed_full_test');
GO

-- Xử lý xung đột departments: Kiểm tra UNIQUE constraint trên department_code
BEGIN
    DECLARE @OldDeptIdSE VARCHAR(50), @OldDeptIdDS VARCHAR(50);
    SELECT @OldDeptIdSE = department_id FROM dbo.departments WHERE department_code = 'SE' AND department_id != 'DEP_SE';
    SELECT @OldDeptIdDS = department_id FROM dbo.departments WHERE department_code = 'DS' AND department_id != 'DEP_DS';

    -- Xử lý DEPT001 (code 'SE')
    IF @OldDeptIdSE IS NOT NULL
    BEGIN
        -- Tạo DEP_SE trước nếu chưa có (tạm thời dùng code khác)
        IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE department_id = 'DEP_SE')
        BEGIN
            INSERT INTO dbo.departments (department_id, department_code, department_name, faculty_id, description, created_by)
            VALUES ('DEP_SE', 'SE_TEMP', N'Bo mon Cong nghe Phan mem', 'FAC_IT', N'Quan ly chuong trinh phan mem', 'seed_full_test');
        END
        ELSE
        BEGIN
            -- Nếu DEP_SE đã tồn tại nhưng code khác 'SE', tạm thời đổi code
            DECLARE @CurrentDEP_SECode VARCHAR(20);
            SELECT @CurrentDEP_SECode = department_code FROM dbo.departments WHERE department_id = 'DEP_SE';
            IF @CurrentDEP_SECode != 'SE' AND @CurrentDEP_SECode != 'SE_TEMP'
            BEGIN
                UPDATE dbo.departments SET department_code = 'SE_TEMP' WHERE department_id = 'DEP_SE';
            END
        END
        
        -- Cập nhật các bảng con trước
        UPDATE dbo.lecturers SET department_id = 'DEP_SE' WHERE department_id = @OldDeptIdSE;
        UPDATE dbo.subjects SET department_id = 'DEP_SE' WHERE department_id = @OldDeptIdSE;
        -- Xóa bản ghi cũ
        DELETE FROM dbo.departments WHERE department_id = @OldDeptIdSE;
        -- Cập nhật lại code
        UPDATE dbo.departments SET department_code = 'SE' WHERE department_id = 'DEP_SE';
    END

    -- Xử lý DEPT002 (code 'DS')
    IF @OldDeptIdDS IS NOT NULL
    BEGIN
        -- Tạo DEP_DS trước nếu chưa có (tạm thời dùng code khác)
        IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE department_id = 'DEP_DS')
        BEGIN
            INSERT INTO dbo.departments (department_id, department_code, department_name, faculty_id, description, created_by)
            VALUES ('DEP_DS', 'DS_TEMP', N'Bo mon Khoa hoc Du lieu', 'FAC_IT', N'Nghien cuu va day du lieu', 'seed_full_test');
        END
        ELSE
        BEGIN
            -- Nếu DEP_DS đã tồn tại nhưng code khác 'DS', tạm thời đổi code
            DECLARE @CurrentDEP_DSCode VARCHAR(20);
            SELECT @CurrentDEP_DSCode = department_code FROM dbo.departments WHERE department_id = 'DEP_DS';
            IF @CurrentDEP_DSCode != 'DS' AND @CurrentDEP_DSCode != 'DS_TEMP'
            BEGIN
                UPDATE dbo.departments SET department_code = 'DS_TEMP' WHERE department_id = 'DEP_DS';
            END
        END
        
        -- Cập nhật các bảng con trước
        UPDATE dbo.lecturers SET department_id = 'DEP_DS' WHERE department_id = @OldDeptIdDS;
        UPDATE dbo.subjects SET department_id = 'DEP_DS' WHERE department_id = @OldDeptIdDS;
        -- Xóa bản ghi cũ
        DELETE FROM dbo.departments WHERE department_id = @OldDeptIdDS;
        -- Cập nhật lại code
        UPDATE dbo.departments SET department_code = 'DS' WHERE department_id = 'DEP_DS';
    END
END
GO

MERGE dbo.departments AS target
USING (VALUES
    ('DEP_SE',  'SE',      N'Bo mon Cong nghe Phan mem',     'FAC_IT',  N'Quan ly chuong trinh phan mem'),
    ('DEP_DS',  'DS',      N'Bo mon Khoa hoc Du lieu',        'FAC_IT',  N'Nghien cuu va day du lieu'),
    ('DEP_BUS', 'BUS-MGT', N'Bo mon Quan tri Kinh doanh',     'FAC_BUS', N'Phu trach cac hoc phan kinh doanh')
) AS src(department_id, department_code, department_name, faculty_id, description)
ON target.department_id = src.department_id
WHEN MATCHED THEN
    UPDATE SET department_code = src.department_code,
               department_name = src.department_name,
               faculty_id = src.faculty_id,
               description = src.description,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (department_id, department_code, department_name, faculty_id, description, created_by)
    VALUES (src.department_id, src.department_code, src.department_name, src.faculty_id, src.description, 'seed_full_test');
GO

-- Xử lý xung đột majors: Kiểm tra UNIQUE constraint trên major_code
BEGIN
    DECLARE @OldMajorIdSE VARCHAR(50), @OldMajorIdDS VARCHAR(50);
    SELECT @OldMajorIdSE = major_id FROM dbo.majors WHERE major_code = 'SE' AND major_id != 'MAJ_SE';
    SELECT @OldMajorIdDS = major_id FROM dbo.majors WHERE major_code = 'DS' AND major_id != 'MAJ_DS';

    -- Xử lý MAJ001 (code 'SE')
    IF @OldMajorIdSE IS NOT NULL
    BEGIN
        -- Tạo MAJ_SE trước nếu chưa có (tạm thời dùng code khác)
        IF NOT EXISTS (SELECT 1 FROM dbo.majors WHERE major_id = 'MAJ_SE')
        BEGIN
            INSERT INTO dbo.majors (major_id, major_name, major_code, faculty_id, description, created_by)
            VALUES ('MAJ_SE', N'Cong nghe Phan mem', 'SE_TEMP', 'FAC_IT', N'Chuong trinh ky su phan mem', 'seed_full_test');
        END
        ELSE
        BEGIN
            -- Nếu MAJ_SE đã tồn tại nhưng code khác 'SE', tạm thời đổi code
            DECLARE @CurrentMAJ_SECode VARCHAR(20);
            SELECT @CurrentMAJ_SECode = major_code FROM dbo.majors WHERE major_id = 'MAJ_SE';
            IF @CurrentMAJ_SECode != 'SE' AND @CurrentMAJ_SECode != 'SE_TEMP'
            BEGIN
                UPDATE dbo.majors SET major_code = 'SE_TEMP' WHERE major_id = 'MAJ_SE';
            END
        END
        
        -- Cập nhật các bảng con trước
        UPDATE dbo.students SET major_id = 'MAJ_SE' WHERE major_id = @OldMajorIdSE;
        UPDATE dbo.administrative_classes SET major_id = 'MAJ_SE' WHERE major_id = @OldMajorIdSE;
        -- Xóa bản ghi cũ
        DELETE FROM dbo.majors WHERE major_id = @OldMajorIdSE;
        -- Cập nhật lại code
        UPDATE dbo.majors SET major_code = 'SE' WHERE major_id = 'MAJ_SE';
    END

    -- Xử lý MAJ002 (code 'DS')
    IF @OldMajorIdDS IS NOT NULL
    BEGIN
        -- Tạo MAJ_DS trước nếu chưa có (tạm thời dùng code khác)
        IF NOT EXISTS (SELECT 1 FROM dbo.majors WHERE major_id = 'MAJ_DS')
        BEGIN
            INSERT INTO dbo.majors (major_id, major_name, major_code, faculty_id, description, created_by)
            VALUES ('MAJ_DS', N'Khoa hoc Du lieu', 'DS_TEMP', 'FAC_IT', N'Chuong trinh phan tich du lieu', 'seed_full_test');
        END
        ELSE
        BEGIN
            -- Nếu MAJ_DS đã tồn tại nhưng code khác 'DS', tạm thời đổi code
            DECLARE @CurrentMAJ_DSCode VARCHAR(20);
            SELECT @CurrentMAJ_DSCode = major_code FROM dbo.majors WHERE major_id = 'MAJ_DS';
            IF @CurrentMAJ_DSCode != 'DS' AND @CurrentMAJ_DSCode != 'DS_TEMP'
            BEGIN
                UPDATE dbo.majors SET major_code = 'DS_TEMP' WHERE major_id = 'MAJ_DS';
            END
        END
        
        -- Cập nhật các bảng con trước
        UPDATE dbo.students SET major_id = 'MAJ_DS' WHERE major_id = @OldMajorIdDS;
        UPDATE dbo.administrative_classes SET major_id = 'MAJ_DS' WHERE major_id = @OldMajorIdDS;
        -- Xóa bản ghi cũ
        DELETE FROM dbo.majors WHERE major_id = @OldMajorIdDS;
        -- Cập nhật lại code
        UPDATE dbo.majors SET major_code = 'DS' WHERE major_id = 'MAJ_DS';
    END
END
GO

MERGE dbo.majors AS target
USING (VALUES
    ('MAJ_SE',  N'Cong nghe Phan mem',  'SE',  'FAC_IT',  N'Chuong trinh ky su phan mem'),
    ('MAJ_DS',  N'Khoa hoc Du lieu',   'DS',  'FAC_IT',  N'Chuong trinh phan tich du lieu'),
    ('MAJ_MKT', N'Marketing So',       'MKT', 'FAC_BUS', N'Chuong trinh marketing hien dai')
) AS src(major_id, major_name, major_code, faculty_id, description)
ON target.major_id = src.major_id
WHEN MATCHED THEN
    UPDATE SET major_name = src.major_name,
               major_code = src.major_code,
               faculty_id = src.faculty_id,
               description = src.description,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (major_id, major_name, major_code, faculty_id, description, created_by)
    VALUES (src.major_id, src.major_name, src.major_code, src.faculty_id, src.description, 'seed_full_test');
GO

-- ===========================================
-- PHAN 4: NIEN KHOA VA NAM HOC
-- ===========================================
MERGE dbo.academic_years AS target
USING (VALUES
    ('AY2021', N'2021-2025', N'K21', 2021, 2025, 4, 0, N'Khoa K21 dang nam 4'),
    ('AY2022', N'2022-2026', N'K22', 2022, 2026, 4, 0, N'Khoa K22 dang nam 3'),
    ('AY2023', N'2023-2027', N'K23', 2023, 2027, 4, 0, N'Khoa K23 dang nam 2'),
    ('AY2024', N'2024-2028', N'K24', 2024, 2028, 4, 1, N'Khoa K24 dang nam 1')
) AS src(academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, description)
ON target.academic_year_id = src.academic_year_id
WHEN MATCHED THEN
    UPDATE SET year_name = src.year_name,
               cohort_code = src.cohort_code,
               start_year = src.start_year,
               end_year = src.end_year,
               duration_years = src.duration_years,
               is_active = src.is_active,
               description = src.description,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, description, created_by)
    VALUES (src.academic_year_id, src.year_name, src.cohort_code, src.start_year, src.end_year, src.duration_years, src.is_active, src.description, 'seed_full_test');
GO

MERGE dbo.school_years AS target
USING (VALUES
    ('SY2022', 'SY2022', N'Nam hoc 2022-2023', 'AY2022',
        DATEFROMPARTS(2022,9,1), DATEFROMPARTS(2023,8,31),
        DATEFROMPARTS(2022,9,1), DATEFROMPARTS(2022,12,31),
        DATEFROMPARTS(2023,1,2), DATEFROMPARTS(2023,5,31),
        0, NULL),
    ('SY2023', 'SY2023', N'Nam hoc 2023-2024', 'AY2023',
        DATEFROMPARTS(2023,9,1), DATEFROMPARTS(2024,8,31),
        DATEFROMPARTS(2023,9,1), DATEFROMPARTS(2023,12,31),
        DATEFROMPARTS(2024,1,2), DATEFROMPARTS(2024,5,31),
        0, NULL),
    ('SY2024', 'SY2024', N'Nam hoc 2024-2025', 'AY2024',
        DATEFROMPARTS(2024,9,1), DATEFROMPARTS(2025,8,31),
        DATEFROMPARTS(2024,9,1), DATEFROMPARTS(2024,12,31),
        DATEFROMPARTS(2025,1,2), DATEFROMPARTS(2025,5,31),
        1, 1)
) AS src(school_year_id, year_code, year_name, academic_year_id, start_date, end_date,
         semester1_start, semester1_end, semester2_start, semester2_end, is_active, current_semester)
ON target.school_year_id = src.school_year_id
WHEN MATCHED THEN
    UPDATE SET year_code = src.year_code,
               year_name = src.year_name,
               academic_year_id = src.academic_year_id,
               start_date = src.start_date,
               end_date = src.end_date,
               semester1_start = src.semester1_start,
               semester1_end = src.semester1_end,
               semester2_start = src.semester2_start,
               semester2_end = src.semester2_end,
               is_active = src.is_active,
               current_semester = src.current_semester,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (school_year_id, year_code, year_name, academic_year_id, start_date, end_date,
            semester1_start, semester1_end, semester2_start, semester2_end, is_active, current_semester, created_by)
    VALUES (src.school_year_id, src.year_code, src.year_name, src.academic_year_id, src.start_date, src.end_date,
            src.semester1_start, src.semester1_end, src.semester2_start, src.semester2_end, src.is_active, src.current_semester, 'seed_full_test');
GO

-- ===========================================
-- PHAN 5: GIANG VIEN
-- ===========================================
MERGE dbo.lecturers AS target
USING (VALUES
    ('LEC_FT_01', 'GVFT01', N'Nguyen Huu Hung', 'hung.lecturer@example.com', '0909000001', 'DEP_SE', 'USR_LEC_01',
        N'TS', N'Tien si', N'Phan mem doanh nghiep', N'Truong bo mon', DATEFROMPARTS(2013,8,1)),
    ('LEC_FT_02', 'GVFT02', N'Pham Thao Nhu', 'thao.lecturer@example.com', '0909000002', 'DEP_DS', 'USR_LEC_02',
        N'ThS', N'Thac si', N'Phan tich du lieu', N'Giang vien chinh', DATEFROMPARTS(2016,9,1)),
    ('LEC_FT_ADV', 'ADFT01', N'Dang Quoc Toan', 'advisor.toan@example.com', '0909000003', 'DEP_SE', 'USR_ADV_01',
        N'TS', N'Tien si', N'Quan tri dao tao', N'Co van hoc tap', DATEFROMPARTS(2010,5,1))
) AS src(lecturer_id, lecturer_code, full_name, email, phone, department_id, user_id,
          academic_title, degree, specialization, position, join_date)
ON target.lecturer_id = src.lecturer_id
WHEN MATCHED THEN
    UPDATE SET lecturer_code = src.lecturer_code,
               full_name = src.full_name,
               email = src.email,
               phone = src.phone,
               department_id = src.department_id,
               user_id = src.user_id,
               academic_title = src.academic_title,
               degree = src.degree,
               specialization = src.specialization,
               position = src.position,
               join_date = src.join_date,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (lecturer_id, lecturer_code, full_name, email, phone, department_id, user_id,
            academic_title, degree, specialization, position, join_date, created_by)
    VALUES (src.lecturer_id, src.lecturer_code, src.full_name, src.email, src.phone, src.department_id, src.user_id,
            src.academic_title, src.degree, src.specialization, src.position, src.join_date, 'seed_full_test');
GO

-- ===========================================
-- PHAN 6: LOP HANH CHINH
-- ===========================================
MERGE dbo.administrative_classes AS target
USING (VALUES
    ('ADM_K21_SE_A',  'K21-SE-A',  N'Lop K21 SE A',  'MAJ_SE',  'LEC_FT_ADV', 'AY2021', 2021, 45, 2, N'Lop hanh chinh khoa 21 nganh SE', 1),
    ('ADM_K22_SE_B',  'K22-SE-B',  N'Lop K22 SE B',  'MAJ_SE',  'LEC_FT_ADV', 'AY2022', 2022, 45, 1, N'Lop hanh chinh khoa 22 nganh SE', 1),
    ('ADM_K23_DS_A',  'K23-DS-A',  N'Lop K23 DS A',  'MAJ_DS',  'LEC_FT_02',  'AY2023', 2023, 40, 1, N'Lop hanh chinh khoa 23 nganh DS', 1),
    ('ADM_K24_SE_A',  'K24-SE-A',  N'Lop K24 SE A',  'MAJ_SE',  'LEC_FT_01',  'AY2024', 2024, 40, 1, N'Tan sinh vien khoa 24 nganh SE', 1),
    ('ADM_K24_MKT_A', 'K24-MKT-A', N'Lop K24 MKT A', 'MAJ_MKT', 'LEC_FT_02',  'AY2024', 2024, 35, 1, N'Tan sinh vien khoa 24 nganh MKT', 1)
) AS src(admin_class_id, class_code, class_name, major_id, advisor_id, academic_year_id,
          cohort_year, max_students, current_students, description, is_active)
ON target.admin_class_id = src.admin_class_id
WHEN MATCHED THEN
    UPDATE SET class_code = src.class_code,
               class_name = src.class_name,
               major_id = src.major_id,
               advisor_id = src.advisor_id,
               academic_year_id = src.academic_year_id,
               cohort_year = src.cohort_year,
               max_students = src.max_students,
               current_students = src.current_students,
               description = src.description,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (admin_class_id, class_code, class_name, major_id, advisor_id, academic_year_id,
            cohort_year, max_students, current_students, description, is_active, created_by)
    VALUES (src.admin_class_id, src.class_code, src.class_name, src.major_id, src.advisor_id, src.academic_year_id,
            src.cohort_year, src.max_students, src.current_students, src.description, src.is_active, 'seed_full_test');
GO

-- ===========================================
-- PHAN 7: SINH VIEN
-- ===========================================
MERGE dbo.students AS target
USING (VALUES
    ('STU_K21_001', 'K21SE001', N'Tran Nhat Minh',  DATEFROMPARTS(2003,2,11),  N'Nam', 'st.k21.001@example.com', '0911000001', N'Quan 1, TP HCM',  'MAJ_SE',  'AY2021', 'LEC_FT_ADV', 'USR_STU_21A', 'FAC_IT',  'ADM_K21_SE_A', 2021, 1),
    ('STU_K21_002', 'K21SE002', N'Ngo Dieu Anh',    DATEFROMPARTS(2003,7,30),  N'Nu',  'st.k21.002@example.com', '0911000002', N'Quan 3, TP HCM',  'MAJ_SE',  'AY2021', 'LEC_FT_ADV', 'USR_STU_21B', 'FAC_IT',  'ADM_K21_SE_A', 2021, 1),
    ('STU_K22_001', 'K22SE010', N'Pham Huu Long',   DATEFROMPARTS(2004,5,15),  N'Nam', 'st.k22.010@example.com', '0912000001', N'Thu Duc, TP HCM','MAJ_SE',  'AY2022', 'LEC_FT_ADV', 'USR_STU_22A', 'FAC_IT',  'ADM_K22_SE_B', 2022, 1),
    ('STU_K23_001', 'K23DS005', N'Luu Gia Khanh',   DATEFROMPARTS(2005,4,2),   N'Nam', 'st.k23.005@example.com', '0913000001', N'Quan 7, TP HCM',  'MAJ_DS',  'AY2023', 'LEC_FT_02',  'USR_STU_23A', 'FAC_IT',  'ADM_K23_DS_A', 2023, 1),
    ('STU_K24_001', 'K24SE015', N'Do Quynh Nhi',    DATEFROMPARTS(2006,10,19), N'Nu',  'st.k24.015@example.com', '0914000001', N'Quan Binh Thanh','MAJ_SE',  'AY2024', 'LEC_FT_01',  'USR_STU_24A', 'FAC_IT',  'ADM_K24_SE_A', 2024, 1),
    ('STU_K24_002', 'K24MKT099',N'Le Minh Triet',   DATEFROMPARTS(2006,12,1),  N'Nam', 'st.k24.099@example.com', '0914000002', N'Quan Phu Nhuan', 'MAJ_MKT', 'AY2024', 'LEC_FT_02',  'USR_STU_24B', 'FAC_BUS', 'ADM_K24_MKT_A', 2024, 1)
) AS src(student_id, student_code, full_name, date_of_birth, gender, email, phone, address,
          major_id, academic_year_id, advisor_id, user_id, faculty_id, admin_class_id, cohort_year, is_active)
ON target.student_id = src.student_id
WHEN MATCHED THEN
    UPDATE SET student_code = src.student_code,
               full_name = src.full_name,
               date_of_birth = src.date_of_birth,
               gender = src.gender,
               email = src.email,
               phone = src.phone,
               address = src.address,
               major_id = src.major_id,
               academic_year_id = src.academic_year_id,
               advisor_id = src.advisor_id,
               user_id = src.user_id,
               faculty_id = src.faculty_id,
               admin_class_id = src.admin_class_id,
               cohort_year = src.cohort_year,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (student_id, student_code, full_name, date_of_birth, gender, email, phone, address,
            major_id, academic_year_id, advisor_id, user_id, faculty_id, admin_class_id, cohort_year, is_active, created_by)
    VALUES (src.student_id, src.student_code, src.full_name, src.date_of_birth, src.gender, src.email, src.phone, src.address,
            src.major_id, src.academic_year_id, src.advisor_id, src.user_id, src.faculty_id, src.admin_class_id, src.cohort_year, src.is_active, 'seed_full_test');
GO

-- ===========================================
-- PHAN 8: MON HOC VA DIEU KIEN TIEN QUYET
-- ===========================================
MERGE dbo.subjects AS target
USING (VALUES
    ('SUB_SE101', N'Lap trinh .NET co ban',          'SE101', 3, 'DEP_SE',  N'Mon nhap mon lap trinh .NET'),
    ('SUB_SE201', N'Phan tich thiet ke he thong',    'SE201', 3, 'DEP_SE',  N'Mon dac thuyet phan tich phan mem'),
    ('SUB_SE301', N'Do an web nang cao',             'SE301', 4, 'DEP_SE',  N'Do an tot nghiep lap trinh web'),
    ('SUB_DS101', N'Nhap mon Khoa hoc Du lieu',      'DS101', 3, 'DEP_DS',  N'Co ban ve phan tich du lieu'),
    ('SUB_BUS201',N'Marketing so 1',                 'BUS201',3, 'DEP_BUS', N'Ky nang digital marketing')
) AS src(subject_id, subject_name, subject_code, credits, department_id, description)
ON target.subject_id = src.subject_id
WHEN MATCHED THEN
    UPDATE SET subject_name = src.subject_name,
               subject_code = src.subject_code,
               credits = src.credits,
               department_id = src.department_id,
               description = src.description,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (subject_id, subject_name, subject_code, credits, department_id, description, created_by)
    VALUES (src.subject_id, src.subject_name, src.subject_code, src.credits, src.department_id, src.description, 'seed_full_test');
GO

MERGE dbo.subject_prerequisites AS target
USING (VALUES
    ('PREREQ_SE201_SE101', 'SUB_SE201', 'SUB_SE101', 5.0, 1, N'Can hoan thanh SE101 truoc khi hoc SE201'),
    ('PREREQ_SE301_SE201', 'SUB_SE301', 'SUB_SE201', 6.0, 1, N'Can hoan thanh SE201 truoc khi lam do an'),
    ('PREREQ_DS101_SE101', 'SUB_DS101', 'SUB_SE101', 5.5, 0, N'Co kha nang lap trinh co ban truoc khi vao du lieu')
) AS src(prerequisite_id, subject_id, prerequisite_subject_id, minimum_grade, is_required, description)
ON target.prerequisite_id = src.prerequisite_id
WHEN MATCHED THEN
    UPDATE SET subject_id = src.subject_id,
               prerequisite_subject_id = src.prerequisite_subject_id,
               minimum_grade = src.minimum_grade,
               is_required = src.is_required,
               description = src.description,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (prerequisite_id, subject_id, prerequisite_subject_id, minimum_grade, is_required, description, created_by)
    VALUES (src.prerequisite_id, src.subject_id, src.prerequisite_subject_id, src.minimum_grade, src.is_required, src.description, 'seed_full_test');
GO

-- ===========================================
-- PHAN 9: LOP HOC PHAN NAM HOC 2024-2025
-- ===========================================
MERGE dbo.classes AS target
USING (VALUES
    ('CLS_SE101_2024', 'SE101-24-HK1', N'SE101 - Lap trinh co ban HK1 2024', 'SUB_SE101', 'LEC_FT_01', 'AY2024', 'SY2024', 1, 60, 2, N'Thu 2 07:30-09:30', N'A101'),
    ('CLS_SE201_2024', 'SE201-24-HK1', N'SE201 - Phan tich thiet ke HK1 2024', 'SUB_SE201', 'LEC_FT_01', 'AY2023', 'SY2024', 1, 45, 1, N'Thu 4 09:45-11:45', N'B202'),
    ('CLS_SE301_2024', 'SE301-24-HK2', N'SE301 - Do an web HK2 2024', 'SUB_SE301', 'LEC_FT_02', 'AY2021', 'SY2024', 2, 30, 2, N'Thu 3 15:15-17:15', N'C303'),
    ('CLS_DS101_2024', 'DS101-24-HK1', N'DS101 - Nhap mon du lieu HK1 2024', 'SUB_DS101', 'LEC_FT_02', 'AY2024', 'SY2024', 1, 50, 1, N'Thu 6 13:00-15:00', N'A105'),
    ('CLS_BUS201_2024','BUS201-24-HK1',N'BUS201 - Marketing so HK1 2024',    'SUB_BUS201','LEC_FT_02', 'AY2022', 'SY2024', 1, 40, 1, N'Thu 5 15:30-17:00', N'C201')
) AS src(class_id, class_code, class_name, subject_id, lecturer_id, academic_year_id, school_year_id,
          semester, max_students, current_enrollment, schedule, room)
ON target.class_id = src.class_id
WHEN MATCHED THEN
    UPDATE SET class_code = src.class_code,
               class_name = src.class_name,
               subject_id = src.subject_id,
               lecturer_id = src.lecturer_id,
               academic_year_id = src.academic_year_id,
               school_year_id = src.school_year_id,
               semester = src.semester,
               max_students = src.max_students,
               current_enrollment = src.current_enrollment,
               schedule = src.schedule,
               room = src.room,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (class_id, class_code, class_name, subject_id, lecturer_id, academic_year_id, school_year_id,
            semester, max_students, current_enrollment, schedule, room, created_by)
    VALUES (src.class_id, src.class_code, src.class_name, src.subject_id, src.lecturer_id, src.academic_year_id, src.school_year_id,
            src.semester, src.max_students, src.current_enrollment, src.schedule, src.room, 'seed_full_test');
GO

-- ===========================================
-- PHAN 10: PHONG HOC & LICH HOC
-- ===========================================
MERGE dbo.rooms AS target
USING (VALUES
    ('ROOM_A101', 'A101', N'Khu A', 60, 1),
    ('ROOM_B202', 'B202', N'Khu B', 45, 1),
    ('ROOM_C303', 'C303', N'Khu C', 35, 1)
) AS src(room_id, room_code, building, capacity, is_active)
ON target.room_id = src.room_id
WHEN MATCHED THEN
    UPDATE SET room_code = src.room_code,
               building = src.building,
               capacity = src.capacity,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (room_id, room_code, building, capacity, is_active, created_by)
    VALUES (src.room_id, src.room_code, src.building, src.capacity, src.is_active, 'seed_full_test');
GO

MERGE dbo.timetable_sessions AS target
USING (VALUES
    -- ✅ CẬP NHẬT: Thời gian khớp với PeriodCalculator và phân bổ thực tế (tránh xung đột)
    -- ✅ CẬP NHẬT: week_no = NULL cho các sessions WEEKLY để hiển thị cho tất cả các tuần
    -- CLS_SE101_2024: 4 tiết/tuần, chia 2 buổi x 2 tiết (LEC_FT_01)
    -- Buổi 1: Thứ 2, Tiết 1-2: 07:00-08:45
    ('TS_SE101_MON', 'CLS_SE101_2024', 'SUB_SE101', 'LEC_FT_01', 'ROOM_A101', 'SY2024', NULL, 2, CAST('07:00' AS TIME), CAST('08:45' AS TIME), 1, 2, N'WEEKLY', N'ACTIVE', N'Buoi hoc lap trinh co ban - buoi 1'),
    -- Buổi 2: Thứ 5, Tiết 3-4: 09:00-10:45 (tránh xung đột với SE201)
    ('TS_SE101_THU', 'CLS_SE101_2024', 'SUB_SE101', 'LEC_FT_01', 'ROOM_A101', 'SY2024', NULL, 5, CAST('09:00' AS TIME), CAST('10:45' AS TIME), 3, 4, N'WEEKLY', N'ACTIVE', N'Buoi hoc lap trinh co ban - buoi 2'),
    
    -- CLS_SE201_2024: 4 tiết/tuần, chia 2 buổi x 2 tiết (LEC_FT_01)
    -- Buổi 1: Thứ 4, Tiết 3-4: 09:00-10:45
    ('TS_SE201_WED', 'CLS_SE201_2024', 'SUB_SE201', 'LEC_FT_01', 'ROOM_B202', 'SY2024', NULL, 4, CAST('09:00' AS TIME), CAST('10:45' AS TIME), 3, 4, N'WEEKLY', N'ACTIVE', N'Buoi phan tich he thong - buoi 1'),
    -- Buổi 2: Thứ 6, Tiết 5-6: 10:50-12:35
    ('TS_SE201_FRI', 'CLS_SE201_2024', 'SUB_SE201', 'LEC_FT_01', 'ROOM_B202', 'SY2024', NULL, 6, CAST('10:50' AS TIME), CAST('12:35' AS TIME), 5, 6, N'WEEKLY', N'ACTIVE', N'Buoi phan tich he thong - buoi 2'),
    
    -- CLS_DS101_2024: 2 tiết/tuần, 1 buổi (HK1)
    -- Thứ 6, Tiết 5-6: 10:50-12:35
    ('TS_DS101_FRI', 'CLS_DS101_2024', 'SUB_DS101', 'LEC_FT_02', 'ROOM_C303', 'SY2024', NULL, 6, CAST('10:50' AS TIME), CAST('12:35' AS TIME), 5, 6, N'WEEKLY', N'ACTIVE', N'Thuc hanh du lieu'),
    
    -- CLS_SE301_2024: 2 tiết/tuần, 1 buổi (HK2 - Đồ án tốt nghiệp)
    -- ✅ NGHIỆP VỤ: Đồ án thường bắt đầu từ giữa HK2, nên week_no = NULL (tất cả các tuần) hoặc week_no = 8 (tuần 8)
    -- Thứ 3, Tiết 7-8: 12:40-14:25
    -- Lưu ý: week_no = NULL nghĩa là học tất cả các tuần trong học kỳ
    ('TS_SE301_TUE', 'CLS_SE301_2024', 'SUB_SE301', 'LEC_FT_02', 'ROOM_C303', 'SY2024', NULL, 3, CAST('12:40' AS TIME), CAST('14:25' AS TIME), 7, 8, N'WEEKLY', N'PLANNED', N'Huong dan do an - bat dau tu giua HK2')
) AS src(session_id, class_id, subject_id, lecturer_id, room_id, school_year_id, week_no, weekday,
          start_time, end_time, period_from, period_to, recurrence, status, notes)
ON target.session_id = src.session_id
WHEN MATCHED THEN
    UPDATE SET class_id = src.class_id,
               subject_id = src.subject_id,
               lecturer_id = src.lecturer_id,
               room_id = src.room_id,
               school_year_id = src.school_year_id,
               week_no = src.week_no,
               weekday = src.weekday,
               start_time = src.start_time,
               end_time = src.end_time,
               period_from = src.period_from,
               period_to = src.period_to,
               recurrence = src.recurrence,
               status = src.status,
               notes = src.notes,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (session_id, class_id, subject_id, lecturer_id, room_id, school_year_id, week_no, weekday,
            start_time, end_time, period_from, period_to, recurrence, status, notes, created_by)
    VALUES (src.session_id, src.class_id, src.subject_id, src.lecturer_id, src.room_id, src.school_year_id, src.week_no, src.weekday,
            src.start_time, src.end_time, src.period_from, src.period_to, src.recurrence, src.status, src.notes, 'seed_full_test');
GO

-- ===========================================
-- PHAN 11: DOT DANG KY HOC PHAN
-- ===========================================
MERGE dbo.registration_periods AS target
USING (VALUES
    -- Đợt đăng ký học phần thường (NORMAL)
    ('PER_SY2024_HK1', N'Dot dang ky SY2024 HK1', 'AY2024', 1,
        DATEFROMPARTS(2024,8,1), DATEFROMPARTS(2024,8,14), 'OPEN', N'Mo dang ky cho HK1 nam hoc 2024-2025', 1, 'NORMAL'),
    ('PER_SY2024_HK2', N'Dot dang ky SY2024 HK2', 'AY2024', 2,
        DATEFROMPARTS(2025,1,5), DATEFROMPARTS(2025,1,15), 'UPCOMING', N'Du kien mo dang ky HK2', 1, 'NORMAL'),
    ('PER_SY2023_HK2', N'Dot dang ky SY2023 HK2', 'AY2023', 2,
        DATEFROMPARTS(2024,1,5), DATEFROMPARTS(2024,1,15), 'CLOSED', N'Khoa dang ky cu da dong', 0, 'NORMAL'),
    -- Đợt đăng ký học lại (RETAKE)
    ('PER_RETAKE_SY2024_HK2', N'Dot dang ky hoc lai SY2024 HK2', 'AY2024', 2,
        DATEFROMPARTS(2025,1,20), DATEFROMPARTS(2025,2,5), 'OPEN', N'Mo dang ky hoc lai cho HK2 nam hoc 2024-2025', 1, 'RETAKE'),
    ('PER_RETAKE_SY2024_HK1', N'Dot dang ky hoc lai SY2024 HK1', 'AY2024', 1,
        DATEFROMPARTS(2024,8,20), DATEFROMPARTS(2024,9,5), 'CLOSED', N'Dot dang ky hoc lai HK1 da dong', 0, 'RETAKE'),
    ('PER_RETAKE_SY2025_HK1', N'Dot dang ky hoc lai SY2025 HK1', 'AY2024', 1,
        DATEFROMPARTS(2025,8,15), DATEFROMPARTS(2025,8,30), 'UPCOMING', N'Du kien mo dang ky hoc lai HK1 nam hoc 2025-2026', 1, 'RETAKE')
) AS src(period_id, period_name, academic_year_id, semester, start_date, end_date, status, description, is_active, period_type)
ON target.period_id = src.period_id
WHEN MATCHED THEN
    UPDATE SET period_name = src.period_name,
               academic_year_id = src.academic_year_id,
               semester = src.semester,
               start_date = src.start_date,
               end_date = src.end_date,
               status = src.status,
               description = src.description,
               is_active = src.is_active,
               period_type = src.period_type,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (period_id, period_name, academic_year_id, semester, start_date, end_date, status, description, is_active, period_type, created_by)
    VALUES (src.period_id, src.period_name, src.academic_year_id, src.semester, src.start_date, src.end_date, src.status, src.description, src.is_active, src.period_type, 'seed_full_test');
GO

MERGE dbo.period_classes AS target
USING (VALUES
    -- Lớp học phần thường (NORMAL)
    ('PERCLS_FT_001', 'PER_SY2024_HK1', 'CLS_SE101_2024', 1),
    ('PERCLS_FT_002', 'PER_SY2024_HK1', 'CLS_SE201_2024', 1),
    ('PERCLS_FT_003', 'PER_SY2024_HK1', 'CLS_DS101_2024', 1),
    ('PERCLS_FT_004', 'PER_SY2024_HK1', 'CLS_BUS201_2024',1),
    ('PERCLS_FT_005', 'PER_SY2024_HK2', 'CLS_SE301_2024', 1),
    -- Lớp học lại (RETAKE) - thêm vào đợt đăng ký học lại
    ('PERCLS_RETAKE_001', 'PER_RETAKE_SY2024_HK2', 'CLS_SE101_2024', 1),  -- Lớp SE101 học lại
    ('PERCLS_RETAKE_002', 'PER_RETAKE_SY2024_HK2', 'CLS_SE201_2024', 1),  -- Lớp SE201 học lại
    ('PERCLS_RETAKE_003', 'PER_RETAKE_SY2024_HK2', 'CLS_DS101_2024', 1),  -- Lớp DS101 học lại
    ('PERCLS_RETAKE_004', 'PER_RETAKE_SY2024_HK2', 'CLS_BUS201_2024', 1), -- Lớp BUS201 học lại
    ('PERCLS_RETAKE_005', 'PER_RETAKE_SY2024_HK2', 'CLS_SE301_2024', 1)   -- Lớp SE301 học lại
) AS src(period_class_id, period_id, class_id, is_active)
ON target.period_class_id = src.period_class_id
WHEN MATCHED THEN
    UPDATE SET period_id = src.period_id,
               class_id = src.class_id,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (period_class_id, period_id, class_id, is_active, created_by)
    VALUES (src.period_class_id, src.period_id, src.class_id, src.is_active, 'seed_full_test');
GO

-- ===========================================
-- PHAN 12: DANG KY, DIEM DANH, DIEM SO
-- ===========================================
MERGE dbo.enrollments AS target
USING (VALUES
    ('ENR_FT_001', 'STU_K24_001', 'CLS_SE101_2024', DATEFROMPARTS(2024,8,25), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,9,9),  N'Dang hoc lan dau',                    NULL),
    ('ENR_FT_002', 'STU_K24_001', 'CLS_DS101_2024', DATEFROMPARTS(2024,8,26), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,9,10), N'Hoc song song ky nang du lieu',      NULL),
    ('ENR_FT_003', 'STU_K24_002', 'CLS_SE101_2024', DATEFROMPARTS(2024,8,25), N'Cho duyet','PENDING',  DATEFROMPARTS(2024,9,9),  N'Doi advisor phe duyet',               NULL),
    ('ENR_FT_004', 'STU_K23_001', 'CLS_SE201_2024', DATEFROMPARTS(2024,7,30), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,8,15), N'Sinh vien khoa 23 hoc nang cao',     NULL),
    ('ENR_FT_005', 'STU_K21_001', 'CLS_SE301_2024', DATEFROMPARTS(2025,1,5),  N'Dang hoc', 'APPROVED', DATEFROMPARTS(2025,1,19), N'Do an tot nghiep',                   NULL),
    ('ENR_FT_006', 'STU_K21_002', 'CLS_SE301_2024', DATEFROMPARTS(2025,1,5),  N'Da huy',   'DROPPED',  DATEFROMPARTS(2025,1,19), N'Bi canh bao vang mat',               N'Vuot qua 30 phan tram vang mat'),
    ('ENR_FT_007', 'STU_K22_001', 'CLS_BUS201_2024',DATEFROMPARTS(2024,8,1),  N'Xin rut',  'WITHDRAWN',DATEFROMPARTS(2024,8,20), N'Nop don xin rut vi lich thuc tap',   N'Da rut truoc han')
) AS src(enrollment_id, student_id, class_id, enrollment_date, status, enrollment_status, drop_deadline, notes, drop_reason)
ON target.enrollment_id = src.enrollment_id
WHEN MATCHED THEN
    UPDATE SET student_id = src.student_id,
               class_id = src.class_id,
               enrollment_date = src.enrollment_date,
               status = src.status,
               enrollment_status = src.enrollment_status,
               drop_deadline = src.drop_deadline,
               notes = src.notes,
               drop_reason = src.drop_reason,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (enrollment_id, student_id, class_id, enrollment_date, status, enrollment_status,
            drop_deadline, notes, drop_reason, created_by)
    VALUES (src.enrollment_id, src.student_id, src.class_id, src.enrollment_date, src.status, src.enrollment_status,
            src.drop_deadline, src.notes, src.drop_reason, 'seed_full_test');
GO

MERGE dbo.attendances AS target
USING (VALUES
    ('ATT_FT_001', 'ENR_FT_001', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,5),  N'Present', N'Co mat dung gio'),
    ('ATT_FT_002', 'ENR_FT_001', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,12), N'Late',    N'Tre 5 phut'),
    ('ATT_FT_003', 'ENR_FT_002', 'CLS_DS101_2024', DATEFROMPARTS(2024,9,6),  N'Present', N'Tra bai tap du'),
    ('ATT_FT_004', 'ENR_FT_003', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,5),  N'Absent',  N'Xin nghi co phe duyet'),
    ('ATT_FT_005', 'ENR_FT_004', 'CLS_SE201_2024', DATEFROMPARTS(2024,9,11), N'Present', N'Tham gia thuc hanh'),
    ('ATT_FT_006', 'ENR_FT_005', 'CLS_SE301_2024', DATEFROMPARTS(2025,2,20), N'Present', N'Hop nhom do an')
) AS src(attendance_id, enrollment_id, class_id, attendance_date, status, note)
ON target.attendance_id = src.attendance_id
WHEN MATCHED THEN
    UPDATE SET enrollment_id = src.enrollment_id,
               class_id = src.class_id,
               attendance_date = src.attendance_date,
               status = src.status,
               note = src.note,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (attendance_id, enrollment_id, class_id, attendance_date, status, note, created_by)
    VALUES (src.attendance_id, src.enrollment_id, src.class_id, src.attendance_date, src.status, src.note, 'seed_full_test');
GO

-- ✅ CẬP NHẬT: Thêm grades để test đầy đủ tính năng phúc khảo
MERGE dbo.grades AS target
USING (VALUES
    ('GRD_FT_001', 'ENR_FT_001', 8.5, 9.0, 8.8, 'A'),  -- Dùng cho APL_FT_001 (PENDING)
    ('GRD_FT_002', 'ENR_FT_002', 7.0, 7.5, 7.3, 'B'),  -- Dùng cho APL_FT_002 (REVIEWING - APPROVE)
    ('GRD_FT_003', 'ENR_FT_004', 8.0, 8.0, 8.0, 'A'),  -- Dùng cho APL_FT_003 (REVIEWING - REJECT), APL_FT_006 (REJECTED)
    ('GRD_FT_004', 'ENR_FT_005', 6.5, 6.0, 6.2, 'C'),  -- Dùng cho APL_FT_004 (REVIEWING - NEED_REVIEW), APL_FT_007 (APPROVED)
    ('GRD_FT_005', 'ENR_FT_002', 7.0, 7.5, 7.3, 'B'),  -- Dùng cho APL_FT_005 (APPROVED - đã duplicate nhưng cần để test)
    ('GRD_FT_006', 'ENR_FT_001', 8.5, 9.0, 8.8, 'A')   -- Thêm grade mới để test thêm
) AS src(grade_id, enrollment_id, midterm_score, final_score, total_score, letter_grade)
ON target.grade_id = src.grade_id
WHEN MATCHED THEN
    UPDATE SET enrollment_id = src.enrollment_id,
               midterm_score = src.midterm_score,
               final_score = src.final_score,
               total_score = src.total_score,
               letter_grade = src.letter_grade,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (grade_id, enrollment_id, midterm_score, final_score, total_score, letter_grade, created_by)
    VALUES (src.grade_id, src.enrollment_id, src.midterm_score, src.final_score, src.total_score, src.letter_grade, 'seed_full_test');
GO

-- ✅ SỬA: MERGE theo (student_id, school_year_id, semester) để tránh vi phạm unique constraint
MERGE dbo.gpas AS target
USING (VALUES
    ('GPA_FT_K24_SY2024_S1', 'STU_K24_001', 'AY2024', 'SY2024', 1, 8.4, 3.4, 15, 15, N'Gioi',       1),
    ('GPA_FT_K23_SY2024_S1', 'STU_K23_001', 'AY2023', 'SY2024', 1, 8.0, 3.2, 14, 60, N'Kha',        1),
    ('GPA_FT_K21_SY2024_S2', 'STU_K21_001', 'AY2021', 'SY2024', 2, 7.2, 2.9, 12, 120, N'Trung binh',1)
) AS src(gpa_id, student_id, academic_year_id, school_year_id, semester, gpa10, gpa4, total_credits, accumulated_credits, rank_text, is_active)
ON target.student_id = src.student_id 
   AND target.school_year_id = src.school_year_id 
   AND target.semester = src.semester
WHEN MATCHED THEN
    UPDATE SET gpa_id = src.gpa_id,
               academic_year_id = src.academic_year_id,
               gpa10 = src.gpa10,
               gpa4 = src.gpa4,
               total_credits = src.total_credits,
               accumulated_credits = src.accumulated_credits,
               rank_text = src.rank_text,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (gpa_id, student_id, academic_year_id, school_year_id, semester,
            gpa10, gpa4, total_credits, accumulated_credits, rank_text, is_active, created_by)
    VALUES (src.gpa_id, src.student_id, src.academic_year_id, src.school_year_id, src.semester,
            src.gpa10, src.gpa4, src.total_credits, src.accumulated_credits, src.rank_text, src.is_active, 'seed_full_test');
GO

-- ===========================================
-- PHAN 13: CONG THUC DIEM & PHUC KHAO
-- ===========================================
MERGE dbo.grade_formula_config AS target
USING (VALUES
    ('GFC_SUB_SE101',  'SUB_SE101', NULL, 'SY2024', 0.30, 0.50, 0.20, 0.00, 0.00, N'midterm*0.3+final*0.5+assignment*0.2', 'STANDARD', 1, N'Mac dinh cho SE101', 1),
    ('GFC_CLASS_SE301',NULL, 'CLS_SE301_2024', 'SY2024', 0.40, 0.60, 0.00, 0.00, 0.00, N'midterm*0.4+final*0.6', 'CEILING', 2, N'Ap dung rieng cho do an SE301', 0)
) AS src(config_id, subject_id, class_id, school_year_id,
          midterm_weight, final_weight, assignment_weight, quiz_weight, project_weight,
          custom_formula, rounding_method, decimal_places, description, is_default)
ON target.config_id = src.config_id
WHEN MATCHED THEN
    UPDATE SET subject_id = src.subject_id,
               class_id = src.class_id,
               school_year_id = src.school_year_id,
               midterm_weight = src.midterm_weight,
               final_weight = src.final_weight,
               assignment_weight = src.assignment_weight,
               quiz_weight = src.quiz_weight,
               project_weight = src.project_weight,
               custom_formula = src.custom_formula,
               rounding_method = src.rounding_method,
               decimal_places = src.decimal_places,
               description = src.description,
               is_default = src.is_default,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (config_id, subject_id, class_id, school_year_id,
            midterm_weight, final_weight, assignment_weight, quiz_weight, project_weight,
            custom_formula, rounding_method, decimal_places, description, is_default, created_by)
    VALUES (src.config_id, src.subject_id, src.class_id, src.school_year_id,
            src.midterm_weight, src.final_weight, src.assignment_weight, src.quiz_weight, src.project_weight,
            src.custom_formula, src.rounding_method, src.decimal_places, src.description, src.is_default, 'seed_full_test');
GO

-- ✅ CẬP NHẬT: Grade Appeals theo workflow mới (Best Practice)
-- Workflow: Student tạo (PENDING) → Lecturer đề xuất (REVIEWING) → Advisor quyết định (APPROVED/REJECTED)
MERGE dbo.grade_appeals AS target
USING (VALUES
    -- 1. PENDING: Student vừa tạo, chưa có lecturer response (test Student tạo phúc khảo)
    ('APL_FT_001', 'GRD_FT_001', 'ENR_FT_001', 'STU_K24_001', 'CLS_SE101_2024',
        N'Không đồng ý điểm cuối kỳ vì nghi ngờ lỗi chấm', 8.8, 9.5, N'files/appeal_k24_001.pdf',
        'PENDING', 'HIGH', NULL, NULL, NULL,
        NULL, NULL, NULL,
        NULL, NULL, 'USR_STU_24A', NULL, NULL, NULL),
    
    -- 2. REVIEWING: Lecturer đã đề xuất APPROVE, chờ advisor quyết định
    ('APL_FT_002', 'GRD_FT_002', 'ENR_FT_002', 'STU_K24_001', 'CLS_DS101_2024',
        N'Xin xem lại điểm giữa kỳ vì nhập sai', 7.3, 7.8, N'files/appeal_k24_002.pdf',
        'REVIEWING', 'NORMAL', N'Đã xác minh bài thi, đề xuất chấp nhận', 'LEC_FT_02', 'APPROVE',
        NULL, NULL, NULL,
        NULL, NULL, 'USR_STU_24A', 'USR_LEC_02', NULL, NULL),
    
    -- 3. REVIEWING: Lecturer đã đề xuất REJECT, chờ advisor quyết định
    ('APL_FT_003', 'GRD_FT_003', 'ENR_FT_004', 'STU_K23_001', 'CLS_SE201_2024',
        N'Xin nâng điểm vì bài thi khó', 8.0, 9.0, NULL,
        'REVIEWING', 'NORMAL', N'Điểm đã chấm đúng, đề xuất từ chối', 'LEC_FT_01', 'REJECT',
        NULL, NULL, NULL,
        NULL, NULL, 'USR_STU_23A', 'USR_LEC_01', NULL, NULL),
    
    -- 4. REVIEWING: Lecturer đã đề xuất NEED_REVIEW, chờ advisor quyết định
    ('APL_FT_004', 'GRD_FT_004', 'ENR_FT_005', 'STU_K21_001', 'CLS_SE301_2024',
        N'Không đồng ý điểm cuối kỳ vì nghi ngờ lỗi chấm', 6.2, 7.0, N'files/appeal_k21_001.pdf',
        'REVIEWING', 'HIGH', N'Cần xem xét thêm tài liệu đính kèm', 'LEC_FT_02', 'NEED_REVIEW',
        NULL, NULL, NULL,
        NULL, NULL, 'USR_STU_21A', 'USR_LEC_02', NULL, NULL),
    
    -- 5. APPROVED: Advisor đã duyệt (sau khi lecturer đề xuất APPROVE) - dùng grade/enrollment khác
    -- Note: APL_FT_002 và APL_FT_005 đều dùng ENR_FT_002 nhưng khác status (REVIEWING vs APPROVED)
    -- Điều này đúng vì cùng một enrollment có thể có nhiều appeals ở các trạng thái khác nhau (test case)
    ('APL_FT_005', 'GRD_FT_005', 'ENR_FT_002', 'STU_K24_001', 'CLS_DS101_2024',
        N'Xin xem lại điểm giữa kỳ vì nhập sai (case đã duyệt)', 7.3, 7.8, N'files/appeal_k24_003.pdf',
        'APPROVED', 'NORMAL', N'Đã xác minh bài thi, đề xuất chấp nhận', 'LEC_FT_02', 'APPROVE',
        'LEC_FT_ADV', N'Đồng ý điều chỉnh điểm theo đề xuất của giảng viên', 'APPROVE',
        7.8, N'Đã cập nhật điểm trong hệ thống', 'USR_STU_24A', 'LEC_FT_ADV', DATEADD(DAY, -2, GETDATE()), 'LEC_FT_ADV'),
    
    -- 6. REJECTED: Advisor đã từ chối (sau khi lecturer đề xuất REJECT)
    ('APL_FT_006', 'GRD_FT_003', 'ENR_FT_004', 'STU_K23_001', 'CLS_SE201_2024',
        N'Xin nâng điểm vì bài thi khó (case đã từ chối)', 8.0, 9.0, NULL,
        'REJECTED', 'NORMAL', N'Điểm đã chấm đúng, đề xuất từ chối', 'LEC_FT_01', 'REJECT',
        'LEC_FT_ADV', N'Không đồng ý điều chỉnh điểm, điểm hiện tại đã công bằng', 'REJECT',
        NULL, N'Giữ nguyên điểm', 'USR_STU_23A', 'LEC_FT_ADV', DATEADD(DAY, -1, GETDATE()), 'LEC_FT_ADV'),
    
    -- 7. APPROVED: Advisor đã duyệt (sau khi lecturer đề xuất NEED_REVIEW)
    ('APL_FT_007', 'GRD_FT_004', 'ENR_FT_005', 'STU_K21_001', 'CLS_SE301_2024',
        N'Không đồng ý điểm cuối kỳ (case đã duyệt sau xem xét)', 6.2, 7.0, N'files/appeal_k21_002.pdf',
        'APPROVED', 'HIGH', N'Sau khi xem xét kỹ, đề xuất chấp nhận', 'LEC_FT_02', 'NEED_REVIEW',
        'LEC_FT_ADV', N'Đồng ý điều chỉnh điểm sau khi xem xét lại tài liệu', 'APPROVE',
        7.0, N'Đã xác minh và cập nhật điểm', 'USR_STU_21A', 'LEC_FT_ADV', DATEADD(DAY, -3, GETDATE()), 'LEC_FT_ADV')
) AS src(appeal_id, grade_id, enrollment_id, student_id, class_id,
          appeal_reason, current_score, expected_score, supporting_docs,
          status, priority, lecturer_response, lecturer_id, lecturer_decision,
          advisor_id, advisor_response, advisor_decision,
          final_score, resolution_notes, created_by, updated_by, resolved_at, resolved_by)
ON target.appeal_id = src.appeal_id
WHEN MATCHED THEN
    UPDATE SET grade_id = src.grade_id,
               enrollment_id = src.enrollment_id,
               student_id = src.student_id,
               class_id = src.class_id,
               appeal_reason = src.appeal_reason,
               current_score = src.current_score,
               expected_score = src.expected_score,
               supporting_docs = src.supporting_docs,
               status = src.status,
               priority = src.priority,
               lecturer_response = src.lecturer_response,
               lecturer_id = src.lecturer_id,
               lecturer_decision = src.lecturer_decision,
               advisor_id = src.advisor_id,
               advisor_response = src.advisor_response,
               advisor_decision = src.advisor_decision,
               final_score = src.final_score,
               resolution_notes = src.resolution_notes,
               updated_at = GETDATE(),
               updated_by = src.updated_by,
               resolved_at = src.resolved_at,
               resolved_by = src.resolved_by
WHEN NOT MATCHED THEN
    INSERT (appeal_id, grade_id, enrollment_id, student_id, class_id,
            appeal_reason, current_score, expected_score, supporting_docs,
            status, priority, lecturer_response, lecturer_id, lecturer_decision,
            advisor_id, advisor_response, advisor_decision,
            final_score, resolution_notes, created_at, created_by, updated_by, resolved_at, resolved_by)
    VALUES (src.appeal_id, src.grade_id, src.enrollment_id, src.student_id, src.class_id,
            src.appeal_reason, src.current_score, src.expected_score, src.supporting_docs,
            src.status, src.priority, src.lecturer_response, src.lecturer_id, src.lecturer_decision,
            src.advisor_id, src.advisor_response, src.advisor_decision,
            src.final_score, src.resolution_notes, GETDATE(), src.created_by, src.updated_by, src.resolved_at, src.resolved_by);
GO

-- ===========================================
-- PHAN 14: THONG BAO HE THONG
-- NOTE: MERGE retake_records được di chuyển xuống sau khi tạo enrollments (xem dòng ~1420)
-- ===========================================
MERGE dbo.notifications AS target
USING (VALUES
    ('NOTIF_FT_001', 'USR_STU_24A', N'Ban vui long hoan tat hoc phi truoc 20/09', N'SYSTEM',
        'USR_STU_24A', N'Nhac nop hoc phi', N'Ban vui long hoan tat hoc phi truoc 20/09 de giu lich hoc', N'STUDENT', 0, DATEFROMPARTS(2024,9,1), 1, 'seed_full_test'),
    ('NOTIF_FT_002', 'USR_LEC_01', N'He thong da tao lich cham diem cho lop SE201', N'SYSTEM',
        'USR_LEC_01', N'Nhac cham diem', N'Vui long hoan thanh cham diem truoc 30/11', N'LECTURER', 0, DATEFROMPARTS(2024,11,5), 1, 'seed_full_test'),
    ('NOTIF_FT_003', 'USR_ADMIN_FT', N'Bao cao tong hop dang ky HK1 da san sang', N'SYSTEM',
        'USR_ADMIN_FT', N'Bao cao dang ky', N'Bao cao dang ky HK1 2024-2025 da duoc luu', N'ADMIN', 1, DATEFROMPARTS(2024,8,16), 1, 'seed_full_test')
) AS src(notification_id, user_id, message, notification_type,
          recipient_id, title, content, type, is_read, sent_date, is_active, created_by)
ON target.notification_id = src.notification_id
WHEN MATCHED THEN
    UPDATE SET user_id = src.user_id,
               message = src.message,
               notification_type = src.notification_type,
               recipient_id = src.recipient_id,
               title = src.title,
               content = src.content,
               type = src.type,
               is_read = src.is_read,
               sent_date = src.sent_date,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (notification_id, user_id, message, notification_type,
            recipient_id, title, content, type, is_read, sent_date, is_active, created_by)
    VALUES (src.notification_id, src.user_id, src.message, src.notification_type,
            src.recipient_id, src.title, src.content, src.type, src.is_read, src.sent_date, src.is_active, src.created_by);
GO

-- ===========================================
-- PHAN 15: QUYEN HE THONG
-- ===========================================
MERGE dbo.permissions AS target
USING (VALUES
    ('PERM_STU_OVERVIEW', 'STUDENT_SECTION_OVERVIEW', N'Tổng quan',          NULL,                     'fas fa-home',              1, N'Menu tổng quan cho sinh viên',                1),
    ('PERM_STU_STUDY',    'STUDENT_SECTION_STUDY',    N'Học tập',             NULL,                     'fas fa-book',              2, N'Menu học tập cho sinh viên',                  1),
    ('PERM_STU_PROFILE',  'STUDENT_SECTION_PROFILE',  N'Cá nhân',             NULL,                     'fas fa-user',              3, N'Menu cá nhân',                                1),
    ('PERM_STU_SYSTEM',   'STUDENT_SECTION_SYSTEM',   N'Hệ thống',            NULL,                     'fas fa-cog',               4, N'Menu hệ thống',                               1),
    ('PERM_STU_DASHBOARD','STUDENT_DASHBOARD',        N'Bảng điều khiển',      'STUDENT_SECTION_OVERVIEW','fas fa-tachometer-alt',   1, N'Bảng điều khiển sinh viên',                   1),
    ('PERM_STU_TIMETABLE','STUDENT_TIMETABLE',        N'Thời khóa biểu',      'STUDENT_SECTION_STUDY',  'fas fa-calendar-alt',     1, N'Xem thời khóa biểu',                          1),
    -- ('PERM_STU_SCHEDULE', 'STUDENT_SCHEDULE',         N'Lịch học',            'STUDENT_SECTION_STUDY',  'fas fa-calendar',         2, N'Xem lịch học',                                 1), -- ✅ Đã gộp vào STUDENT_TIMETABLE
    ('PERM_STU_GRADES',   'STUDENT_GRADES',           N'Kết quả học tập',     'STUDENT_SECTION_STUDY',  'fas fa-graduation-cap',   3, N'Xem bảng điểm',                                1),
    ('PERM_STU_ATTENDANCE','STUDENT_ATTENDANCE',      N'Điểm danh',           'STUDENT_SECTION_STUDY',  'fas fa-clipboard-check',  4, N'Xem lịch sử điểm danh',                        1),
    ('PERM_STU_ENROLLMENT','STUDENT_ENROLLMENT',      N'Đăng ký học phần',    'STUDENT_SECTION_STUDY',  'fas fa-edit',             5, N'Đăng ký học phần',                             1),
    ('PERM_STU_PROFILE_ITEM','STUDENT_PROFILE',       N'Thông tin cá nhân',   'STUDENT_SECTION_PROFILE','fas fa-user',             1, N'Quản lý thông tin',                            1),
    ('PERM_STU_REPORTS',  'STUDENT_REPORTS',          N'Thống kê học tập',    'STUDENT_SECTION_STUDY',  'fas fa-chart-bar',        6, N'Xem thống kê',                                 1),
    ('PERM_STU_NOTIFICATIONS','STUDENT_NOTIFICATIONS',N'Thông báo',           'STUDENT_SECTION_SYSTEM', 'fas fa-bell',             1, N'Nhận thông báo',                               1),
    ('PERM_STU_APPEALS',  'STUDENT_APPEALS',          N'Phúc khảo',           'STUDENT_SECTION_STUDY',  'fas fa-gavel',            7, N'Gửi phúc khảo',                                 1),
    ('PERM_TCH_OVERVIEW', 'TEACHER_SECTION_OVERVIEW', N'Tổng quan',           NULL,                     'fas fa-home',             1, N'Menu tổng quan cho giảng viên',               1),
    ('PERM_TCH_TEACHING', 'TEACHER_SECTION_TEACHING', N'Giảng dạy',           NULL,                     'fas fa-chalkboard-teacher',2,N'Menu giảng dạy',                                1),
    ('PERM_TCH_SYSTEM',   'TEACHER_SECTION_SYSTEM',   N'Hệ thống',            NULL,                     'fas fa-cog',              3, N'Menu hệ thống giảng viên',                    1),
    ('PERM_TCH_DASHBOARD','TEACHER_DASHBOARD',        N'Bảng điều khiển',      'TEACHER_SECTION_OVERVIEW','fas fa-tachometer-alt',  1, N'Bảng điều khiển giảng viên',                  1),
    ('PERM_TCH_ATTENDANCE','TEACHER_ATTENDANCE',      N'Điểm danh',           'TEACHER_SECTION_TEACHING','fas fa-check-square',   1, N'Điểm danh sinh viên',                         1),
    ('PERM_TCH_GRADES',   'TEACHER_GRADES',           N'Nhập điểm',           'TEACHER_SECTION_TEACHING','fas fa-graduation-cap', 2, N'Nhập điểm',                                     1),
    ('PERM_TCH_TIMETABLE','TEACHER_TIMETABLE',        N'Thời khóa biểu',      'TEACHER_SECTION_TEACHING','fas fa-calendar-alt',   3, N'Lịch giảng dạy',                               1),
    ('PERM_TCH_REPORTS',  'TEACHER_REPORTS',          N'Thống kê lớp',        'TEACHER_SECTION_TEACHING','fas fa-chart-bar',     4, N'Thống kê lớp',                                1),
    ('PERM_TCH_NOTIFICATIONS','TEACHER_NOTIFICATIONS',N'Thông báo',           'TEACHER_SECTION_SYSTEM', 'fas fa-bell',            1, N'Thông báo hệ thống',                           1),
    ('PERM_TCH_GRADE_FORMULA','TEACHER_GRADE_FORMULA',N'Công thức điểm',      'TEACHER_SECTION_TEACHING','fas fa-equals',        5, N'Quản lý công thức điểm lớp dạy',               1),
    ('PERM_TCH_CLASSES',     'TCH_CLASSES',           N'Quản lý lớp học phần (Giảng viên)', 'TEACHER_SECTION_TEACHING','fas fa-chalkboard', 6, N'Cho phép giảng viên quản lý các lớp học phần của mình', 1),
    ('PERM_ADV_OVERVIEW', 'ADVISOR_SECTION_OVERVIEW', N'Tổng quan',           NULL,                     'fas fa-home',            1, N'Menu tổng quan cố vấn',                        1),
    ('PERM_ADV_ADVISING', 'ADVISOR_SECTION_ADVISING', N'Cố vấn học tập',      NULL,                     'fas fa-user-graduate',   2, N'Menu công việc cố vấn học tập',                1),
    ('PERM_ADV_SYSTEM',   'ADVISOR_SECTION_SYSTEM',   N'Hệ thống',            NULL,                     'fas fa-cog',             3, N'Menu hệ thống cố vấn',                        1),
    ('PERM_ADV_DASHBOARD','ADVISOR_DASHBOARD',        N'Bảng điều khiển',      'ADVISOR_SECTION_OVERVIEW','fas fa-tachometer-alt', 1, N'Bảng điều khiển cố vấn',                      1),
    ('PERM_ADV_STUDENTS', 'ADVISOR_STUDENTS',         N'Sinh viên được phân công', 'ADVISOR_SECTION_ADVISING','fas fa-user-graduate', 1, N'Quản lý sinh viên được phân công',             1),
    ('PERM_ADV_WARNINGS', 'ADVISOR_WARNINGS',         N'Cảnh báo học tập',     'ADVISOR_SECTION_ADVISING','fas fa-exclamation-triangle',2,N'Quản lý cảnh báo học tập',                 1),
    ('PERM_ADV_APPEALS',  'ADVISOR_APPEALS',          N'Phúc khảo',           'ADVISOR_SECTION_ADVISING','fas fa-gavel',          3, N'Duyệt phúc khảo',                             1),
    ('PERM_ADV_RETAKE',   'ADVISOR_RETAKE',           N'Quản lý học lại',     'ADVISOR_SECTION_ADVISING','fas fa-history',       4, N'Quản lý hồ sơ học lại',                       1),
    ('PERM_ADV_GRADE_FORMULA','ADVISOR_GRADE_FORMULA',N'Công thức điểm',      'ADVISOR_SECTION_ADVISING','fas fa-calculator',    5, N'Quản lý công thức điểm',                      1),
    ('PERM_ADV_EXAM_SCHEDULES','ADVISOR_EXAM_SCHEDULES',N'Quản lý lịch thi',  'ADVISOR_SECTION_ADVISING','fas fa-calendar-check',6, N'Quản lý lịch thi cho sinh viên',               1),
    ('PERM_ADV_NOTIFICATIONS','ADVISOR_NOTIFICATIONS',N'Thông báo',           'ADVISOR_SECTION_SYSTEM', 'fas fa-bell',           1, N'Nhận thông báo',                              1),
    ('PERM_ADM_OVERVIEW', 'ADMIN_SECTION_OVERVIEW',   N'Tổng quan',           NULL,                     'fas fa-home',           1, N'Menu tổng quan admin',                        1),
    ('PERM_ADM_USERS',    'ADMIN_SECTION_USERS',      N'Quản lý người dùng',  NULL,                     'fas fa-users',          2, N'Menu người dùng',                              1),
    ('PERM_ADM_ACADEMIC', 'ADMIN_SECTION_ACADEMIC',   N'Quản lý đào tạo',     NULL,                     'fas fa-graduation-cap', 3, N'Menu đào tạo',                                  1),
    -- Xóa ADMIN_SECTION_SUBJECTS (đã gộp vào ADMIN_SECTION_ACADEMIC)
    -- ('PERM_ADM_SUBJECTS', 'ADMIN_SECTION_SUBJECTS',   N'Học phần',            NULL,                     'fas fa-book',           4, N'Menu học phần',                               1),
    -- ADMIN_SECTION_CLASSES: Menu quản lý lớp hành chính
    ('PERM_ADM_ADMIN_CLASSES_SECTION','ADMIN_SECTION_CLASSES', N'Lớp hành chính', NULL,                 'fas fa-users-class',     5, N'Menu quản lý lớp hành chính',              1),
    ('PERM_ADM_ENROLLMENT','ADMIN_SECTION_ENROLLMENT',N'Đăng ký học phần',    NULL,                     'fas fa-clipboard-list', 6, N'Menu đăng ký',                                 1),
    -- Xóa ADMIN_SECTION_TIMETABLE (đã gộp vào ADMIN_SECTION_ACADEMIC)
    -- ('PERM_ADM_TIMETABLE','ADMIN_SECTION_TIMETABLE',  N'Quản lý thời khóa biểu',NULL,                   'fas fa-calendar-alt',    7, N'Menu thời khóa biểu',                         1),
    ('PERM_ADM_SYSTEM',   'ADMIN_SECTION_SYSTEM',     N'Quản lý hệ thống',    NULL,                     'fas fa-cog',            8, N'Menu quản lý hệ thống cho admin',             1),
    ('PERM_ADM_DASHBOARD','ADMIN_DASHBOARD',          N'Bảng điều khiển',      'ADMIN_SECTION_OVERVIEW', 'fas fa-tachometer-alt', 1, N'Bảng điều khiển admin',                       1),
    ('PERM_ADM_USERS_ITEM','ADMIN_USERS',             N'Tài khoản',           'ADMIN_SECTION_USERS',    'fas fa-users',          1, N'Quản lý tài khoản',                           1),
    ('PERM_ADM_ROLES',    'ADMIN_ROLES',              N'Vai trò & quyền',     'ADMIN_SECTION_USERS',    'fas fa-shield-alt',     2, N'Quản lý vai trò',                             1),
    ('PERM_ADM_ORGANIZATION','ADMIN_ORGANIZATION',    N'Quản lý tổ chức',     'ADMIN_SECTION_ACADEMIC', 'fas fa-sitemap',        1, N'Quản lý khoa, bộ môn',                       1),
    ('PERM_ADM_STUDENTS', 'ADMIN_STUDENTS',           N'Sinh viên',           'ADMIN_SECTION_ACADEMIC', 'fas fa-user-graduate',  2, N'Quản lý sinh viên',                            1),
    ('PERM_ADM_LECTURERS','ADMIN_LECTURERS',          N'Giảng viên',          'ADMIN_SECTION_ACADEMIC', 'fas fa-chalkboard-teacher',3,N'Quản lý giảng viên',                      1),
    ('PERM_ADM_ACADEMIC_YEARS','ADMIN_ACADEMIC_YEARS',N'Niên khóa',           'ADMIN_SECTION_ACADEMIC', 'fas fa-calendar-alt',   4, N'Quản lý niên khóa',                           1),
    ('PERM_ADM_SCHOOL_YEARS','ADMIN_SCHOOL_YEARS',    N'Năm học',             'ADMIN_SECTION_ACADEMIC', 'fas fa-calendar-check', 5, N'Quản lý năm học',                              1),
    ('PERM_ADM_GRADE_FORMULA','ADMIN_GRADE_FORMULA',  N'Công thức điểm',      'ADMIN_SECTION_ACADEMIC', 'fas fa-calculator',     6, N'Quản lý công thức điểm',                      1),
    -- Gộp ADMIN_SECTION_SUBJECTS vào ADMIN_SECTION_ACADEMIC (vì chỉ có 2 con và đều liên quan đến đào tạo)
    ('PERM_ADM_SUBJECT_PREREQUISITES','ADMIN_SUBJECT_PREREQUISITES', N'Tiên quyết','ADMIN_SECTION_ACADEMIC','fas fa-project-diagram',7,N'Quản lý tiên quyết môn học',                 1),
    ('PERM_ADM_CLASSES',  'ADMIN_CLASSES',            N'Lớp học phần',        'ADMIN_SECTION_ACADEMIC', 'fas fa-chalkboard',     8, N'Quản lý lớp học phần',                        1),
    -- Permission con cho ADMIN_SECTION_CLASSES
    ('PERM_ADM_ADMIN_CLASSES', 'ADMIN_ADMIN_CLASSES', N'Quản lý lớp hành chính', 'ADMIN_SECTION_CLASSES', 'fas fa-users-class', 1, N'Quản lý lớp hành chính (lớp sinh viên theo niên khóa)', 1),
    ('PERM_ADM_REGISTRATION_PERIODS','ADMIN_REGISTRATION_PERIODS', N'Đợt đăng ký học phần/học lại','ADMIN_SECTION_ENROLLMENT','fas fa-clock',1,N'Quản lý đợt đăng ký học phần và học lại',                          1),
    -- ✅ Parent permission cho Retake Periods Management (tab phụ trong quản lý đợt đăng ký)
    ('PERM_ADM_MANAGE_RET_PERIODS','MANAGE_REGISTRATION_PERIODS', N'Quản lý đợt đăng ký học lại','ADMIN_SECTION_ENROLLMENT','fas fa-redo',2,N'Quản lý đợt đăng ký học lại (tab phụ)',                          1),
    ('PERM_ADM_ENROLLMENTS','ADMIN_ENROLLMENTS',      N'Duyệt đăng ký',       'ADMIN_SECTION_ENROLLMENT','fas fa-clipboard-check',3,N'Xem và duyệt/từ chối đăng ký học phần của sinh viên', 1),
    -- Gộp ADMIN_SECTION_TIMETABLE vào ADMIN_SECTION_ACADEMIC (vì chỉ có 1 con và liên quan đến đào tạo)
    ('PERM_ADM_TIMETABLE_ITEM','ADMIN_TIMETABLE',     N'Xếp lịch',            'ADMIN_SECTION_ACADEMIC','fas fa-calendar-alt',  9, N'Quản lý thời khóa biểu',                       1),
    ('PERM_ADM_ROOMS',     'ADMIN_ROOMS',              N'Quản lý phòng học',  'ADMIN_SECTION_ACADEMIC', 'fas fa-door-open',    10, N'Quản lý phòng học',                          1),
    ('PERM_ADM_REPORTS',  'ADMIN_REPORTS',            N'Thống kê & Báo cáo',  'ADMIN_SECTION_SYSTEM',   'fas fa-chart-bar',      2, N'Thống kê và báo cáo hệ thống',                1),
    ('PERM_ADM_AUDIT_LOGS','ADMIN_AUDIT_LOGS',        N'Nhật ký hệ thống',    'ADMIN_SECTION_SYSTEM',   'fas fa-history',        3, N'Xem nhật ký',                                 1),
    -- Permissions cho ADVISOR để gộp vào ADVISOR_SECTION_SYSTEM
    ('PERM_ADV_SYSTEM_REPORTS', 'ADVISOR_SYSTEM_REPORTS', N'Thống kê & Báo cáo', 'ADVISOR_SECTION_SYSTEM', 'fas fa-chart-bar', 2, N'Thống kê và báo cáo hệ thống', 1),
    ('PERM_ADV_SYSTEM_AUDIT_LOGS', 'ADVISOR_SYSTEM_AUDIT_LOGS', N'Nhật ký hệ thống', 'ADVISOR_SECTION_SYSTEM', 'fas fa-history', 3, N'Xem nhật ký hệ thống', 1),
    ('PERM_ADM_NOTIFICATIONS','ADMIN_NOTIFICATIONS',  N'Thông báo',           'ADMIN_SECTION_SYSTEM',   'fas fa-bell',           1, N'Quản lý thông báo',                           1),
    -- ✅ Retake Registration Permissions (under MANAGE_REGISTRATION_PERIODS)
    ('PERM_RET_PER_VIEW',     'VIEW_RETAKE_PERIODS',     N'Xem đợt đăng ký học lại',      'MANAGE_REGISTRATION_PERIODS', 'fas fa-calendar-alt', 1, N'Xem danh sách đợt đăng ký học lại',                 1),
    ('PERM_RET_PER_CREATE',   'CREATE_RETAKE_PERIODS',   N'Tạo đợt đăng ký học lại',      'MANAGE_REGISTRATION_PERIODS', 'fas fa-plus',         2, N'Tạo đợt đăng ký học lại mới',                     1),
    ('PERM_RET_PER_EDIT',     'EDIT_RETAKE_PERIODS',     N'Sửa đợt đăng ký học lại',      'MANAGE_REGISTRATION_PERIODS', 'fas fa-edit',         3, N'Sửa thông tin đợt đăng ký học lại',                1),
    ('PERM_RET_PER_DELETE',   'DELETE_RETAKE_PERIODS',   N'Xóa đợt đăng ký học lại',      'MANAGE_REGISTRATION_PERIODS', 'fas fa-trash',        4, N'Xóa đợt đăng ký học lại',                         1),
    ('PERM_RET_PER_CLASSES',  'MANAGE_RETAKE_PERIOD_CLASSES', N'Quản lý lớp trong đợt đăng ký học lại', 'MANAGE_REGISTRATION_PERIODS', 'fas fa-list', 5, N'Thêm/xóa lớp học lại vào đợt đăng ký',          1),
    -- ✅ Student Exam Schedule Permission (executable permission, not menu-only)
    ('PERM_STU_EXAM_SCHEDULES', 'STUDENT_EXAM_SCHEDULES', N'Xem lịch thi', 'STUDENT_SECTION_STUDY', 'fas fa-calendar-check', 8, N'Sinh viên xem lịch thi của mình', 1)
    -- ✅ Student Retake Registration Permissions (under STUDENT_SECTION_STUDY)
    -- ❌ ĐÃ VÔ HIỆU HÓA: Xem môn trượt và lớp học lại (vì form "Kết quả học tập" đã có bảng hiển thị môn trượt)
    -- ('PERM_RET_REGISTER',     'REGISTER_RETAKE_CLASSES', N'Đăng ký lớp học lại',          'STUDENT_SECTION_STUDY',      'fas fa-redo',         1, N'Sinh viên đăng ký lớp học lại',                    0),
    -- ('PERM_RET_VIEW_FAILED',  'VIEW_FAILED_SUBJECTS',    N'Xem môn trượt',                'STUDENT_SECTION_STUDY',      'fas fa-exclamation-triangle', 2, N'Xem danh sách môn học đã trượt',               0),
    -- ('PERM_RET_VIEW_CLASSES', 'VIEW_RETAKE_CLASSES',     N'Xem lớp học lại',              'STUDENT_SECTION_STUDY',      'fas fa-list',         3, N'Xem danh sách lớp học lại của môn',                0)
) AS src(permission_id, permission_code, permission_name, parent_code, icon, sort_order, description, is_active)
ON target.permission_id = src.permission_id
WHEN MATCHED THEN
    UPDATE SET permission_code = src.permission_code,
               permission_name = src.permission_name,
               parent_code = src.parent_code,
               icon = src.icon,
               sort_order = src.sort_order,
               description = src.description,
               is_active = src.is_active,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (permission_id, permission_code, permission_name, parent_code, icon, sort_order, description, is_active, is_menu_only, created_by)
    VALUES (src.permission_id, src.permission_code, src.permission_name, src.parent_code, src.icon, src.sort_order, src.description, src.is_active, 0, 'seed_full_test');
GO

MERGE dbo.role_permissions AS target
USING (VALUES
    ('ROLE_STUDENT','PERM_STU_OVERVIEW'),
    ('ROLE_STUDENT','PERM_STU_DASHBOARD'),
    ('ROLE_STUDENT','PERM_STU_STUDY'),
    ('ROLE_STUDENT','PERM_STU_TIMETABLE'),
    -- ('ROLE_STUDENT','PERM_STU_SCHEDULE'), -- ✅ Đã gộp vào STUDENT_TIMETABLE
    ('ROLE_STUDENT','PERM_STU_GRADES'),
    ('ROLE_STUDENT','PERM_STU_ATTENDANCE'),
    ('ROLE_STUDENT','PERM_STU_ENROLLMENT'),
    ('ROLE_STUDENT','PERM_STU_EXAM_SCHEDULES'),
    -- ❌ ĐÃ XÓA: Đăng ký lớp học lại, Xem môn trượt, Xem lớp học lại (vì form "Kết quả học tập" đã có bảng hiển thị môn trượt)
    -- ('ROLE_STUDENT','PERM_RET_REGISTER'),  -- Đăng ký lớp học lại
    -- ('ROLE_STUDENT','PERM_RET_VIEW_FAILED'),  -- Xem môn trượt
    -- ('ROLE_STUDENT','PERM_RET_VIEW_CLASSES'),  -- Xem lớp học lại
    ('ROLE_STUDENT','PERM_STU_REPORTS'),
    ('ROLE_STUDENT','PERM_STU_PROFILE'),
    ('ROLE_STUDENT','PERM_STU_PROFILE_ITEM'),
    ('ROLE_STUDENT','PERM_STU_SYSTEM'),
    ('ROLE_STUDENT','PERM_STU_NOTIFICATIONS'),
    ('ROLE_STUDENT','PERM_STU_APPEALS'),
    ('ROLE_LECTURER','PERM_TCH_OVERVIEW'),
    ('ROLE_LECTURER','PERM_TCH_DASHBOARD'),
    ('ROLE_LECTURER','PERM_TCH_TEACHING'),
    ('ROLE_LECTURER','PERM_TCH_ATTENDANCE'),
    ('ROLE_LECTURER','PERM_TCH_GRADES'),
    ('ROLE_LECTURER','PERM_TCH_TIMETABLE'),
    ('ROLE_LECTURER','PERM_TCH_REPORTS'),
    ('ROLE_LECTURER','PERM_TCH_SYSTEM'),
    ('ROLE_LECTURER','PERM_TCH_NOTIFICATIONS'),
    ('ROLE_LECTURER','PERM_TCH_GRADE_FORMULA'),
    ('ROLE_LECTURER','PERM_TCH_CLASSES'),
    -- Quyền Cố vấn học tập
    ('ROLE_ADVISOR','PERM_ADV_OVERVIEW'),
    ('ROLE_ADVISOR','PERM_ADV_DASHBOARD'),
    ('ROLE_ADVISOR','PERM_ADV_ADVISING'),
    ('ROLE_ADVISOR','PERM_ADV_STUDENTS'),
    ('ROLE_ADVISOR','PERM_ADV_WARNINGS'),
    ('ROLE_ADVISOR','PERM_ADV_APPEALS'),
    ('ROLE_ADVISOR','PERM_ADV_RETAKE'),
    ('ROLE_ADVISOR','PERM_ADV_GRADE_FORMULA'),
    ('ROLE_ADVISOR','PERM_ADV_EXAM_SCHEDULES'),
    -- Lưu ý: PERM_ADV_ENROLLMENTS đã bị xóa vì trùng với PERM_ADM_ENROLLMENTS (cả hai đều là "Duyệt đăng ký")
    -- Xóa PERM_ADV_REPORTS khỏi menu Cố vấn học tập (đã có PERM_ADV_SYSTEM_REPORTS trong menu Hệ thống)
    ('ROLE_ADVISOR','PERM_ADV_SYSTEM'),
    ('ROLE_ADVISOR','PERM_ADV_NOTIFICATIONS'),
    -- Quyền Nhân viên phòng đào tạo (gộp vào ROLE_ADVISOR)
    -- Thêm ADMIN_SECTION_ENROLLMENT để các permissions con có thể hiển thị
    ('ROLE_ADVISOR','PERM_ADM_ENROLLMENT'),  -- ADMIN_SECTION_ENROLLMENT: "Đăng ký học phần"
    ('ROLE_ADVISOR','PERM_ADM_REGISTRATION_PERIODS'),
    ('ROLE_ADVISOR','PERM_ADM_MANAGE_RET_PERIODS'),  -- ✅ Quản lý đợt đăng ký học lại
    ('ROLE_ADVISOR','PERM_RET_PER_VIEW'),  -- ✅ Retake period permissions
    ('ROLE_ADVISOR','PERM_RET_PER_CREATE'),
    ('ROLE_ADVISOR','PERM_RET_PER_EDIT'),
    ('ROLE_ADVISOR','PERM_RET_PER_DELETE'),
    ('ROLE_ADVISOR','PERM_RET_PER_CLASSES'),
    ('ROLE_ADVISOR','PERM_ADM_ENROLLMENTS'),
    -- Thêm permissions hệ thống vào ADVISOR_SECTION_SYSTEM để gộp chung menu
    ('ROLE_ADVISOR','PERM_ADV_SYSTEM_REPORTS'),  -- Thống kê & Báo cáo trong menu Hệ thống
    ('ROLE_ADVISOR','PERM_ADV_SYSTEM_AUDIT_LOGS'),  -- Nhật ký hệ thống trong menu Hệ thống
    ('ROLE_ADMIN','PERM_ADM_OVERVIEW'),
    ('ROLE_ADMIN','PERM_ADM_DASHBOARD'),
    ('ROLE_ADMIN','PERM_ADM_USERS'),
    ('ROLE_ADMIN','PERM_ADM_USERS_ITEM'),
    ('ROLE_ADMIN','PERM_ADM_ROLES'),
    ('ROLE_ADMIN','PERM_ADM_ACADEMIC'),
    ('ROLE_ADMIN','PERM_ADM_ORGANIZATION'),
    ('ROLE_ADMIN','PERM_ADM_STUDENTS'),
    ('ROLE_ADMIN','PERM_ADM_LECTURERS'),
    ('ROLE_ADMIN','PERM_ADM_ACADEMIC_YEARS'),
    ('ROLE_ADMIN','PERM_ADM_SCHOOL_YEARS'),
    ('ROLE_ADMIN','PERM_ADM_GRADE_FORMULA'),
    -- Xóa PERM_ADM_SUBJECTS (đã gộp vào ADMIN_SECTION_ACADEMIC)
    ('ROLE_ADMIN','PERM_ADM_SUBJECT_PREREQUISITES'),
    ('ROLE_ADMIN','PERM_ADM_CLASSES'),
    ('ROLE_ADMIN','PERM_ADM_ADMIN_CLASSES_SECTION'), -- ADMIN_SECTION_CLASSES: menu quản lý lớp hành chính
    ('ROLE_ADMIN','PERM_ADM_ADMIN_CLASSES'), -- Permission con cho ADMIN_SECTION_CLASSES
    ('ROLE_ADMIN','PERM_ADM_ENROLLMENT'),
    ('ROLE_ADMIN','PERM_ADM_REGISTRATION_PERIODS'),
    ('ROLE_ADMIN','PERM_ADM_MANAGE_RET_PERIODS'),  -- ✅ Quản lý đợt đăng ký học lại
    ('ROLE_ADMIN','PERM_RET_PER_VIEW'),  -- ✅ Retake period permissions
    ('ROLE_ADMIN','PERM_RET_PER_CREATE'),
    ('ROLE_ADMIN','PERM_RET_PER_EDIT'),
    ('ROLE_ADMIN','PERM_RET_PER_DELETE'),
    ('ROLE_ADMIN','PERM_RET_PER_CLASSES'),
    ('ROLE_ADMIN','PERM_ADM_ENROLLMENTS'),
    -- Xóa PERM_ADM_TIMETABLE (đã gộp vào ADMIN_SECTION_ACADEMIC)
    ('ROLE_ADMIN','PERM_ADM_TIMETABLE_ITEM'),
    ('ROLE_ADMIN','PERM_ADM_ROOMS'),
    ('ROLE_ADMIN','PERM_ADV_EXAM_SCHEDULES'),  -- ✅ Admin cũng có quyền quản lý lịch thi
    ('ROLE_ADMIN','PERM_ADM_SYSTEM'),
    ('ROLE_ADMIN','PERM_ADM_REPORTS'),
    ('ROLE_ADMIN','PERM_ADM_AUDIT_LOGS'),
    ('ROLE_ADMIN','PERM_ADM_NOTIFICATIONS')
) AS src(role_id, permission_id)
ON target.role_id = src.role_id AND target.permission_id = src.permission_id
WHEN NOT MATCHED THEN
    INSERT (role_id, permission_id, created_by)
    VALUES (src.role_id, src.permission_id, 'seed_full_test');
GO

-- ===========================================
-- PHAN 16: NHAT KY & TOKEN
-- ===========================================
INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
SELECT 'USR_ADMIN_FT', 'LOGIN_SUCCESS', 'User', 'USR_ADMIN_FT', NULL, N'Dang nhap thanh cong', '10.0.0.10', 'Seed Script'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.audit_logs WHERE user_id = 'USR_ADMIN_FT' AND action = 'LOGIN_SUCCESS' AND entity_id = 'USR_ADMIN_FT'
);

INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
SELECT 'USR_SUPPORT_FT', 'UPDATE_PERIOD', 'registration_periods', 'PER_SY2024_HK1',
       N'Trang thai: UPCOMING', N'Trang thai: OPEN', '10.0.0.11', 'Seed Script'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.audit_logs WHERE user_id = 'USR_SUPPORT_FT' AND action = 'UPDATE_PERIOD' AND entity_id = 'PER_SY2024_HK1'
);

INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
SELECT 'USR_LEC_02', 'GRADE_ADJUST', 'grades', 'GRD_FT_002',
       N'final_score:7.5', N'final_score:7.8', '10.0.0.12', 'Seed Script'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.audit_logs WHERE user_id = 'USR_LEC_02' AND action = 'GRADE_ADJUST' AND entity_id = 'GRD_FT_002'
);
GO

INSERT INTO dbo.refresh_tokens (user_id, token, expires_at, created_at)
SELECT 'USR_ADMIN_FT', 'ft-admin-refresh-token', DATEADD(DAY, 30, GETDATE()), GETDATE()
WHERE NOT EXISTS (SELECT 1 FROM dbo.refresh_tokens WHERE token = 'ft-admin-refresh-token');

INSERT INTO dbo.refresh_tokens (user_id, token, expires_at, created_at)
SELECT 'USR_STU_24A', 'ft-student-refresh-token', DATEADD(DAY, 20, GETDATE()), GETDATE()
WHERE NOT EXISTS (SELECT 1 FROM dbo.refresh_tokens WHERE token = 'ft-student-refresh-token');

INSERT INTO dbo.refresh_tokens (user_id, token, expires_at, created_at)
SELECT 'USR_LEC_01', 'ft-lecturer-refresh-token', DATEADD(DAY, 25, GETDATE()), GETDATE()
WHERE NOT EXISTS (SELECT 1 FROM dbo.refresh_tokens WHERE token = 'ft-lecturer-refresh-token');
GO

-- ===========================================
-- PHAN 17: BO SUNG DU LIEU CHO BIỂU ĐỒ THỐNG KÊ
-- ===========================================
-- ✅ Mục đích: Bổ sung dữ liệu để test đầy đủ các biểu đồ thống kê:
-- 1. Phân bố GPA: excellent (>= 3.5), good (3.0-3.49), average (2.0-2.99), weak (< 2.0)
-- 2. Nợ tín chỉ: ranges 0-10, 11-20, 21-30, 31-40, 41-50, 50+
-- 3. Cảnh báo học tập: lowGPA (< 2.0), poorAttendance (< 50%), both
-- 4. Xu hướng GPA theo học kỳ (line chart)
-- 5. Phân bố điểm số: A, B, C, D, F
-- ===========================================

-- Thêm students với GPA đa dạng (thêm 4 students: 2 average, 2 weak)
-- Students đã có: 6 (2 excellent, 1 good, 3 chưa có GPA)
-- Cần thêm: 4 students với GPA average và weak
MERGE dbo.users AS target
USING (VALUES
    ('USR_STU_21C', 'student_k21_c', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k21.003@example.com', '0911000003', N'Nguyen Van Dung', 'ROLE_STUDENT', 1),
    ('USR_STU_22B', 'student_k22_b', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k22.011@example.com', '0912000002', N'Tran Thi Hang', 'ROLE_STUDENT', 1),
    ('USR_STU_23B', 'student_k23_b', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k23.006@example.com', '0913000002', N'Pham Van Khanh', 'ROLE_STUDENT', 1),
    ('USR_STU_24C', 'student_k24_c', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'st.k24.016@example.com', '0914000003', N'Le Thi Mai', 'ROLE_STUDENT', 1)
) AS src(user_id, username, password_hash, email, phone, full_name, role_id, is_active)
ON target.user_id = src.user_id
WHEN NOT MATCHED THEN
    INSERT (user_id, username, password_hash, email, phone, full_name, role_id, is_active, created_by)
    VALUES (src.user_id, src.username, src.password_hash, src.email, src.phone, src.full_name, src.role_id, src.is_active, 'seed_full_test');
GO

MERGE dbo.students AS target
USING (VALUES
    -- Average GPA students (2.5-2.9)
    ('STU_K21_003', 'K21SE003', N'Nguyen Van Dung', DATEFROMPARTS(2003,3,15), N'Nam', 'st.k21.003@example.com', '0911000003', N'Quan 2, TP HCM', 'MAJ_SE', 'AY2021', 'LEC_FT_ADV', 'USR_STU_21C', 'FAC_IT', 'ADM_K21_SE_A', 2021, 1),
    ('STU_K22_002', 'K22SE011', N'Tran Thi Hang', DATEFROMPARTS(2004,6,20), N'Nu', 'st.k22.011@example.com', '0912000002', N'Quan 10, TP HCM', 'MAJ_SE', 'AY2022', 'LEC_FT_ADV', 'USR_STU_22B', 'FAC_IT', 'ADM_K22_SE_B', 2022, 1),
    -- Weak GPA students (< 2.0)
    ('STU_K23_002', 'K23DS006', N'Pham Van Khanh', DATEFROMPARTS(2005,5,10), N'Nam', 'st.k23.006@example.com', '0913000002', N'Quan 8, TP HCM', 'MAJ_DS', 'AY2023', 'LEC_FT_02', 'USR_STU_23B', 'FAC_IT', 'ADM_K23_DS_A', 2023, 1),
    ('STU_K24_003', 'K24SE016', N'Le Thi Mai', DATEFROMPARTS(2006,11,25), N'Nu', 'st.k24.016@example.com', '0914000003', N'Quan Tan Binh, TP HCM', 'MAJ_SE', 'AY2024', 'LEC_FT_01', 'USR_STU_24C', 'FAC_IT', 'ADM_K24_SE_A', 2024, 1)
) AS src(student_id, student_code, full_name, date_of_birth, gender, email, phone, address,
          major_id, academic_year_id, advisor_id, user_id, faculty_id, admin_class_id, cohort_year, is_active)
ON target.student_id = src.student_id
WHEN NOT MATCHED THEN
    INSERT (student_id, student_code, full_name, date_of_birth, gender, email, phone, address,
            major_id, academic_year_id, advisor_id, user_id, faculty_id, admin_class_id, cohort_year, is_active, created_by)
    VALUES (src.student_id, src.student_code, src.full_name, src.date_of_birth, src.gender, src.email, src.phone, src.address,
            src.major_id, src.academic_year_id, src.advisor_id, src.user_id, src.faculty_id, src.admin_class_id, src.cohort_year, src.is_active, 'seed_full_test');
GO

-- Thêm enrollments và grades với letter grades đa dạng (D, F) và tín chỉ để tạo nợ tín chỉ
-- Thêm enrollments mới
MERGE dbo.enrollments AS target
USING (VALUES
    -- Enrollments cho students mới với grades D và F
    ('ENR_FT_008', 'STU_K21_003', 'CLS_SE101_2024', DATEFROMPARTS(2024,8,25), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,9,9), N'Hoc lai', NULL),
    ('ENR_FT_009', 'STU_K22_002', 'CLS_SE201_2024', DATEFROMPARTS(2024,7,30), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,8,15), N'Hoc binh thuong', NULL),
    ('ENR_FT_010', 'STU_K23_002', 'CLS_DS101_2024', DATEFROMPARTS(2024,8,26), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,9,10), N'Hoc lai', NULL),
    ('ENR_FT_011', 'STU_K24_003', 'CLS_SE101_2024', DATEFROMPARTS(2024,8,25), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,9,9), N'Hoc binh thuong', NULL),
    -- Thêm enrollments cho students cũ để tạo nợ tín chỉ và xu hướng GPA
    ('ENR_FT_012', 'STU_K24_001', 'CLS_SE201_2024', DATEFROMPARTS(2024,7,30), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2024,8,15), N'Hoc them', NULL),
    ('ENR_FT_013', 'STU_K23_001', 'CLS_SE101_2024', DATEFROMPARTS(2023,8,25), N'Da hoan thanh', 'APPROVED', DATEFROMPARTS(2023,9,9), N'Hoc nam truoc', NULL),
    -- Enrollments cho sinh viên đăng ký học lại (trong đợt đăng ký học lại)
    ('ENR_RETAKE_001', 'STU_K21_002', 'CLS_SE301_2024', DATEFROMPARTS(2025,1,22), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2025,2,10), N'Dang ky hoc lai SE301 - trượt do vắng mặt', NULL),
    ('ENR_RETAKE_002', 'STU_K21_003', 'CLS_SE101_2024', DATEFROMPARTS(2025,1,23), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2025,2,10), N'Dang ky hoc lai SE101 - trượt cả điểm và vắng mặt', NULL),
    ('ENR_RETAKE_003', 'STU_K22_002', 'CLS_SE201_2024', DATEFROMPARTS(2025,1,24), N'Dang hoc', 'APPROVED', DATEFROMPARTS(2025,2,10), N'Dang ky hoc lai SE201 - trượt do điểm', NULL),
    ('ENR_RETAKE_004', 'STU_K23_001', 'CLS_SE101_2024', DATEFROMPARTS(2024,8,22), N'Da hoan thanh', 'APPROVED', DATEFROMPARTS(2024,9,5), N'Da hoan thanh hoc lai SE101', NULL),
    ('ENR_RETAKE_005', 'STU_K23_002', 'CLS_DS101_2024', DATEFROMPARTS(2025,1,25), N'Cho duyet', 'PENDING', DATEFROMPARTS(2025,2,10), N'Cho duyet dang ky hoc lai DS101', NULL),
    ('ENR_RETAKE_006', 'STU_K24_001', 'CLS_SE201_2024', DATEFROMPARTS(2025,1,26), N'Cho duyet', 'PENDING', DATEFROMPARTS(2025,2,10), N'Cho duyet dang ky hoc lai SE201', NULL)
) AS src(enrollment_id, student_id, class_id, enrollment_date, status, enrollment_status, drop_deadline, notes, drop_reason)
ON target.enrollment_id = src.enrollment_id
WHEN NOT MATCHED THEN
    INSERT (enrollment_id, student_id, class_id, enrollment_date, status, enrollment_status,
            drop_deadline, notes, drop_reason, created_by)
    VALUES (src.enrollment_id, src.student_id, src.class_id, src.enrollment_date, src.status, src.enrollment_status,
            src.drop_deadline, src.notes, src.drop_reason, 'seed_full_test');
GO

-- ===========================================
-- PHAN 13B: RETAKE RECORDS (Học lại)
-- ===========================================
-- NOTE: Phải tạo SAU khi tạo enrollments vì có FOREIGN KEY constraint
MERGE dbo.retake_records AS target
USING (VALUES
    -- Trượt do vắng mặt (ATTENDANCE) - đã được duyệt
    ('RETAKE_FT_001', 'ENR_FT_006', 'STU_K21_002', 'CLS_SE301_2024', 'SUB_SE301',
        'ATTENDANCE', 20.0, 35.0, 'APPROVED', N'Cho phep hoc lai o hoc ky tiep theo',
        DATEADD(DAY, -5, GETDATE()), 'LEC_FT_ADV'),
    -- Trượt do điểm (GRADE) - đang chờ duyệt
    ('RETAKE_FT_002', 'ENR_FT_007', 'STU_K22_001', 'CLS_BUS201_2024', 'SUB_BUS201',
        'GRADE', 4.0, 3.2, 'PENDING', NULL, NULL, NULL),
    -- Trượt do cả hai (BOTH) - đã được duyệt
    ('RETAKE_FT_003', 'ENR_FT_008', 'STU_K21_003', 'CLS_SE101_2024', 'SUB_SE101',
        'BOTH', 20.0, 25.0, 'APPROVED', N'Trượt cả điểm và vắng mặt, được phép học lại',
        DATEADD(DAY, -3, GETDATE()), 'LEC_FT_ADV'),
    -- Trượt do điểm (GRADE) - đã được duyệt, đã đăng ký lớp học lại
    ('RETAKE_FT_004', 'ENR_FT_009', 'STU_K22_002', 'CLS_SE201_2024', 'SUB_SE201',
        'GRADE', 4.0, 3.7, 'APPROVED', N'Điểm dưới 4.0, được phép học lại',
        DATEADD(DAY, -10, GETDATE()), 'LEC_FT_ADV'),
    -- Trượt do vắng mặt (ATTENDANCE) - đang chờ duyệt
    ('RETAKE_FT_005', 'ENR_FT_010', 'STU_K23_002', 'CLS_DS101_2024', 'SUB_DS101',
        'ATTENDANCE', 20.0, 30.0, 'PENDING', NULL, NULL, NULL),
    -- Trượt do điểm (GRADE) - đã bị từ chối
    ('RETAKE_FT_006', 'ENR_FT_011', 'STU_K24_003', 'CLS_SE101_2024', 'SUB_SE101',
        'GRADE', 4.0, 3.5, 'REJECTED', N'Điểm gần đạt, không đủ điều kiện học lại',
        DATEADD(DAY, -7, GETDATE()), 'LEC_FT_ADV'),
    -- Trượt do cả hai (BOTH) - đang chờ duyệt
    ('RETAKE_FT_007', 'ENR_FT_012', 'STU_K24_001', 'CLS_SE201_2024', 'SUB_SE201',
        'BOTH', 20.0, 22.0, 'PENDING', NULL, NULL, NULL),
    -- Trượt do điểm (GRADE) - đã hoàn thành học lại
    ('RETAKE_FT_008', 'ENR_FT_013', 'STU_K23_001', 'CLS_SE101_2024', 'SUB_SE101',
        'GRADE', 4.0, 3.8, 'COMPLETED', N'Đã hoàn thành học lại thành công',
        DATEADD(DAY, -30, GETDATE()), 'LEC_FT_ADV')
) AS src(retake_id, enrollment_id, student_id, class_id, subject_id,
          reason, threshold_value, current_value, status, advisor_notes,
          resolved_at, resolved_by)
ON target.retake_id = src.retake_id
WHEN MATCHED THEN
    UPDATE SET enrollment_id = src.enrollment_id,
               student_id = src.student_id,
               class_id = src.class_id,
               subject_id = src.subject_id,
               reason = src.reason,
               threshold_value = src.threshold_value,
               current_value = src.current_value,
               status = src.status,
               advisor_notes = src.advisor_notes,
               resolved_at = src.resolved_at,
               resolved_by = src.resolved_by,
               updated_at = GETDATE(),
               updated_by = 'seed_full_test'
WHEN NOT MATCHED THEN
    INSERT (retake_id, enrollment_id, student_id, class_id, subject_id,
            reason, threshold_value, current_value, status, advisor_notes,
            created_by, resolved_at, resolved_by)
    VALUES (src.retake_id, src.enrollment_id, src.student_id, src.class_id, src.subject_id,
            src.reason, src.threshold_value, src.current_value, src.status, src.advisor_notes,
            'seed_full_test', src.resolved_at, src.resolved_by);
GO

-- Thêm grades với letter grades đa dạng (D, F) và total_score thấp
MERGE dbo.grades AS target
USING (VALUES
    -- Grades D (4.0-5.4)
    ('GRD_FT_007', 'ENR_FT_008', 5.5, 5.8, 5.7, 'C'),  -- Average GPA student (updated to pass threshold)
    ('GRD_FT_008', 'ENR_FT_009', 5.0, 5.5, 5.3, 'C'),  -- Average GPA student (updated to pass threshold)
    -- Grades F (< 4.0)
    ('GRD_FT_009', 'ENR_FT_010', 3.5, 3.8, 3.7, 'F'),  -- Weak GPA student
    ('GRD_FT_010', 'ENR_FT_011', 3.0, 3.5, 3.3, 'F'),  -- Weak GPA student
    -- Grades cao cho students cũ để test xu hướng GPA
    ('GRD_FT_011', 'ENR_FT_012', 8.0, 8.5, 8.3, 'A'),  -- Excellent GPA student
    ('GRD_FT_012', 'ENR_FT_013', 7.5, 8.0, 7.8, 'B')   -- Good GPA student
) AS src(grade_id, enrollment_id, midterm_score, final_score, total_score, letter_grade)
ON target.grade_id = src.grade_id
WHEN NOT MATCHED THEN
    INSERT (grade_id, enrollment_id, midterm_score, final_score, total_score, letter_grade, created_by)
    VALUES (src.grade_id, src.enrollment_id, src.midterm_score, src.final_score, src.total_score, src.letter_grade, 'seed_full_test');
GO

-- Thêm GPAs với phân bố đa dạng (average, weak) và theo nhiều học kỳ
MERGE dbo.gpas AS target
USING (VALUES
    -- Average GPA students (GPA 2.5-2.9 - average category)
    ('GPA_FT_K21_003_SY2024_S1', 'STU_K21_003', 'AY2021', 'SY2024', 1, 6.5, 2.5, 9, 105, N'Trung binh', 1),
    ('GPA_FT_K22_002_SY2024_S1', 'STU_K22_002', 'AY2022', 'SY2024', 1, 6.8, 2.7, 12, 90, N'Trung binh', 1),
    -- Weak GPA students (GPA < 2.0 - weak category)
    ('GPA_FT_K23_002_SY2024_S1', 'STU_K23_002', 'AY2023', 'SY2024', 1, 5.5, 1.8, 6, 42, N'Yeu', 1),
    ('GPA_FT_K24_003_SY2024_S1', 'STU_K24_003', 'AY2024', 'SY2024', 1, 5.8, 1.9, 9, 9, N'Yeu', 1),
    -- GPAs theo nhiều học kỳ để test xu hướng GPA (line chart)
    ('GPA_FT_K24_SY2023_S1', 'STU_K24_001', 'AY2024', 'SY2023', 1, 8.0, 3.2, 12, 12, N'Kha', 1),
    ('GPA_FT_K24_SY2023_S2', 'STU_K24_001', 'AY2024', 'SY2023', 2, 8.2, 3.3, 15, 27, N'Kha', 1),
    ('GPA_FT_K23_SY2023_S1', 'STU_K23_001', 'AY2023', 'SY2023', 1, 7.8, 3.1, 12, 48, N'Kha', 1),
    ('GPA_FT_K23_SY2023_S2', 'STU_K23_001', 'AY2023', 'SY2023', 2, 8.1, 3.3, 15, 63, N'Kha', 1)
) AS src(gpa_id, student_id, academic_year_id, school_year_id, semester, gpa10, gpa4, total_credits, accumulated_credits, rank_text, is_active)
ON target.student_id = src.student_id 
   AND target.school_year_id = src.school_year_id 
   AND target.semester = src.semester
WHEN NOT MATCHED THEN
    INSERT (gpa_id, student_id, academic_year_id, school_year_id, semester,
            gpa10, gpa4, total_credits, accumulated_credits, rank_text, is_active, created_by)
    VALUES (src.gpa_id, src.student_id, src.academic_year_id, src.school_year_id, src.semester,
            src.gpa10, src.gpa4, src.total_credits, src.accumulated_credits, src.rank_text, src.is_active, 'seed_full_test');
GO

-- Thêm attendance records để test cảnh báo chuyên cần (poorAttendance < 50%)
MERGE dbo.attendances AS target
USING (VALUES
    -- Attendance records với tỷ lệ thấp cho weak GPA students
    ('ATT_FT_007', 'ENR_FT_008', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,5), N'Absent', N'Vang mat'),
    ('ATT_FT_008', 'ENR_FT_008', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,12), N'Absent', N'Vang mat'),
    ('ATT_FT_009', 'ENR_FT_008', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,19), N'Absent', N'Vang mat'),
    ('ATT_FT_010', 'ENR_FT_010', 'CLS_DS101_2024', DATEFROMPARTS(2024,9,6), N'Absent', N'Vang mat'),
    ('ATT_FT_011', 'ENR_FT_010', 'CLS_DS101_2024', DATEFROMPARTS(2024,9,13), N'Absent', N'Vang mat'),
    ('ATT_FT_012', 'ENR_FT_010', 'CLS_DS101_2024', DATEFROMPARTS(2024,9,20), N'Absent', N'Vang mat'),
    ('ATT_FT_013', 'ENR_FT_011', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,5), N'Absent', N'Vang mat'),
    ('ATT_FT_014', 'ENR_FT_011', 'CLS_SE101_2024', DATEFROMPARTS(2024,9,12), N'Absent', N'Vang mat'),
    -- Attendance records tốt cho excellent GPA students
    ('ATT_FT_015', 'ENR_FT_012', 'CLS_SE201_2024', DATEFROMPARTS(2024,9,11), N'Present', N'Co mat dung gio'),
    ('ATT_FT_016', 'ENR_FT_012', 'CLS_SE201_2024', DATEFROMPARTS(2024,9,18), N'Present', N'Co mat dung gio')
) AS src(attendance_id, enrollment_id, class_id, attendance_date, status, note)
ON target.attendance_id = src.attendance_id
WHEN NOT MATCHED THEN
    INSERT (attendance_id, enrollment_id, class_id, attendance_date, status, note, created_by)
    VALUES (src.attendance_id, src.enrollment_id, src.class_id, src.attendance_date, src.status, src.note, 'seed_full_test');
GO

-- ===========================================
-- PHAN 18: TONG KET
-- ===========================================
PRINT 'Hoan tat seed full test dataset';
PRINT 'Du lieu da phu kin cac bang chinh, san sang cho viec test';
PRINT 'Da bo sung du lieu cho bieu do thong ke:';
PRINT '  - Phan bo GPA: excellent (>= 3.5), good (3.0-3.49), average (2.0-2.99), weak (< 2.0)';
PRINT '  - No tin chi: ranges 0-10, 11-20, 21-30, 31-40, 41-50, 50+';
PRINT '  - Canh bao hoc tap: lowGPA (< 2.0), poorAttendance (< 50%), both';
PRINT '  - Xu huong GPA theo hoc ky (line chart)';
PRINT '  - Phan bo diem so: A, B, C, D, F';
GO

-- ===========================================
-- 🔹 ĐÁNH DẤU SECTION PERMISSIONS LÀ MENU-ONLY
-- ===========================================
-- Section permissions (ADMIN_SECTION_*, ADVISOR_SECTION_*, etc.) chỉ dùng để hiển thị menu,
-- KHÔNG dùng để check authorization
PRINT 'Danh dau section permissions la menu-only...';

UPDATE dbo.permissions
SET is_menu_only = 1
WHERE permission_code LIKE 'ADMIN_SECTION_%'
   OR permission_code LIKE 'ADVISOR_SECTION_%'
   OR permission_code LIKE 'STUDENT_SECTION_%'
   OR permission_code LIKE 'LECTURER_SECTION_%'
   OR permission_code LIKE 'TEACHER_SECTION_%'
   OR permission_code LIKE 'MENU_%';  -- Nếu đã có MENU_* permissions

PRINT '✅ Đã đánh dấu section permissions là menu-only';
GO

-- ✅ FIX: Các menu items (permissions có parent_code) cần có is_menu_only = 0
-- Vì chúng vừa hiển thị menu (qua parent section) vừa dùng để check authorization
-- Chỉ section permissions (parent_code = NULL) mới có is_menu_only = 1
PRINT 'Đảm bảo menu items có is_menu_only = 0 (executable)...';

UPDATE dbo.permissions
SET is_menu_only = 0,
    updated_at = GETDATE(),
    updated_by = 'seed_full_test'
WHERE parent_code IS NOT NULL
    AND is_active = 1
    AND is_menu_only = 1
    AND permission_code NOT LIKE '%_SECTION_%'; -- Không update section permissions

DECLARE @MenuItemsUpdated INT = @@ROWCOUNT;
PRINT CONCAT('✅ Đã set ', @MenuItemsUpdated, ' menu items là executable (is_menu_only = 0)');
GO

-- ===========================================
-- 🔹 VÔ HIỆU HÓA PERMISSION TRÙNG LẶP
-- ===========================================
-- STUDENT_SCHEDULE đã được gộp vào STUDENT_TIMETABLE
PRINT 'Vô hiệu hóa STUDENT_SCHEDULE (đã gộp vào STUDENT_TIMETABLE)...';

UPDATE dbo.permissions
SET is_active = 0,
    updated_at = GETDATE(),
    updated_by = 'seed_full_test'
WHERE permission_code = 'STUDENT_SCHEDULE';

-- Xóa khỏi role_permissions
DELETE FROM dbo.role_permissions
WHERE permission_id IN (SELECT permission_id FROM dbo.permissions WHERE permission_code = 'STUDENT_SCHEDULE');

PRINT '✅ Đã vô hiệu hóa STUDENT_SCHEDULE';
GO

-- ===========================================
-- 🔹 KIỂM TRA VÀ HIỂN THỊ KẾT QUẢ
-- ===========================================
DECLARE @MenuOnlyCount INT;
SELECT @MenuOnlyCount = COUNT(*) 
FROM dbo.permissions 
WHERE is_menu_only = 1;

DECLARE @ExecutableCount INT;
SELECT @ExecutableCount = COUNT(*) 
FROM dbo.permissions 
WHERE is_menu_only = 0;

PRINT '========================================';
PRINT 'Permission Summary:';
PRINT '  - Menu-only permissions: ' + CAST(@MenuOnlyCount AS VARCHAR(10));
PRINT '  - Executable permissions: ' + CAST(@ExecutableCount AS VARCHAR(10));
PRINT '  - Total permissions: ' + CAST((@MenuOnlyCount + @ExecutableCount) AS VARCHAR(10));
PRINT '========================================';
GO

-- ===========================================
-- CẬP NHẬT TÊN MENU: "Sinh viên được phân công" -> "Danh sách sinh viên"
-- ===========================================
PRINT 'Đang cập nhật tên menu "Sinh viên được phân công" thành "Danh sách sinh viên"...';

UPDATE dbo.permissions
SET permission_name = N'Danh sách sinh viên',
    description = N'Quản lý danh sách sinh viên',
    updated_at = GETDATE(),
    updated_by = 'system'
WHERE permission_code = 'ADVISOR_STUDENTS'
  AND permission_name = N'Sinh viên được phân công';

IF @@ROWCOUNT > 0
BEGIN
    PRINT '✅ Đã cập nhật thành công!';
    PRINT '   - Tên menu: "Danh sách sinh viên"';
    PRINT '   - Mô tả: "Quản lý danh sách sinh viên"';
END
ELSE
BEGIN
    PRINT '⚠️ Không tìm thấy permission để cập nhật hoặc đã được cập nhật trước đó.';
    PRINT '   Kiểm tra permission_code = ''ADVISOR_STUDENTS''';
END
GO

-- ===========================================
-- XÓA MENU "XEM MÔN TRƯỢT" VÀ "LỚP HỌC LẠI" CHO SINH VIÊN
-- ===========================================
-- Lý do: 
-- 1. Form "Kết quả học tập" đã có bảng hiển thị môn trượt (trạng thái "Không đạt")
-- 2. Không cần menu riêng để xem môn trượt và lớp học lại
-- ===========================================
PRINT 'Bắt đầu xóa menu "Xem môn trượt" và "Lớp học lại" cho sinh viên...';

-- BƯỚC 1: Xóa các permissions khỏi role_permissions (ẩn menu khỏi sidebar)
PRINT 'Bước 1: Xóa permissions khỏi role_permissions...';

DELETE FROM dbo.role_permissions 
WHERE role_id = 'ROLE_STUDENT' 
  AND permission_id IN (
    'PERM_RET_REGISTER',      -- Đăng ký lớp học lại
    'PERM_RET_VIEW_FAILED',   -- Xem môn trượt
    'PERM_RET_VIEW_CLASSES'   -- Xem lớp học lại
);

IF @@ROWCOUNT > 0
    PRINT '  ✓ Đã xóa ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' permissions khỏi ROLE_STUDENT';
ELSE
    PRINT '  ⚠ Không tìm thấy permissions để xóa (có thể đã bị xóa trước đó)';

-- BƯỚC 2: Vô hiệu hóa các permissions (set is_active = 0) để không hiển thị trong menu
-- Lưu ý: Không xóa hoàn toàn permissions vì có thể còn được sử dụng bởi Advisor/Admin
PRINT 'Bước 2: Vô hiệu hóa permissions (set is_active = 0)...';

UPDATE dbo.permissions
SET is_active = 0,
    updated_at = GETDATE(),
    updated_by = 'remove_student_retake_menus'
WHERE permission_id IN (
    'PERM_RET_REGISTER',      -- Đăng ký lớp học lại
    'PERM_RET_VIEW_FAILED',   -- Xem môn trượt
    'PERM_RET_VIEW_CLASSES'   -- Xem lớp học lại
);

IF @@ROWCOUNT > 0
    PRINT '  ✓ Đã vô hiệu hóa ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' permissions';
ELSE
    PRINT '  ⚠ Không tìm thấy permissions để vô hiệu hóa';

PRINT '';
PRINT '✅ Hoàn thành! Các menu "Xem môn trượt" và "Lớp học lại" đã được ẩn khỏi sidebar của sinh viên.';
PRINT '   Sinh viên vẫn có thể xem môn trượt trong form "Kết quả học tập" (trạng thái "Không đạt").';
PRINT '';
GO

PRINT '========================================';
PRINT 'Hoàn tất seed full test dataset';
PRINT '========================================';
GO

