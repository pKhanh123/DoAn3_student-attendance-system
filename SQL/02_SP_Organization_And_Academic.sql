	-- ===========================================
	-- 02_SP_Organization_And_Academic.sql
	-- ===========================================
	-- Description: Faculties, Departments, Majors, Academic Years, School Years
	-- ===========================================

	USE EducationManagement;
	GO

	SET QUOTED_IDENTIFIER ON;
	SET ANSI_NULLS ON;
	GO

	PRINT '========================================';
	PRINT 'Starting: 02_SP_Organization_And_Academic.sql';
	PRINT 'Organization and Academic Management SPs';
	PRINT '========================================';
	GO

	IF OBJECT_ID('dbo.sp_AutoCreateCohort', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_AutoCreateCohort;
	GO
	CREATE PROCEDURE dbo.sp_AutoCreateCohort
		@StartYear INT,
		@DurationYears INT = 4,
		@CreatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		SET NOCOUNT ON;
    
		-- Tạo 1 academic_year (niên khóa) cho cohort bắt đầu từ @StartYear
		DECLARE @EndYear INT = @StartYear + @DurationYears;
		DECLARE @YearName NVARCHAR(50) = CONCAT(@StartYear, '-', @EndYear);
		DECLARE @ayId VARCHAR(50) = CONCAT('AY', @StartYear);
		DECLARE @cohortCode NVARCHAR(10) = CONCAT('K', SUBSTRING(CAST(@StartYear AS VARCHAR(4)), 3, 2)); -- K21, K22, K23, K24

		-- Tạo academic_year (niên khóa)
		IF NOT EXISTS (SELECT 1 FROM dbo.academic_years WHERE academic_year_id = @ayId)
		BEGIN
			INSERT INTO dbo.academic_years (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, created_at, created_by)
			VALUES (@ayId, @YearName, @cohortCode, @StartYear, @EndYear, @DurationYears, 0, GETDATE(), @CreatedBy);
		END
		ELSE
		BEGIN
			-- Update cohort_code nếu đã tồn tại nhưng chưa có cohort_code
			UPDATE dbo.academic_years 
			SET cohort_code = @cohortCode 
			WHERE academic_year_id = @ayId AND cohort_code IS NULL;
		END

		-- Tạo các school_years (năm học) cho cohort này (4 năm học)
		DECLARE @i INT = 0;
		WHILE @i < @DurationYears
		BEGIN
			DECLARE @syStartYear INT = @StartYear + @i;
			DECLARE @syEndYear INT = @syStartYear + 1;
			DECLARE @syYearName NVARCHAR(50) = CONCAT(@syStartYear, '-', @syEndYear);
			DECLARE @syId VARCHAR(50) = CONCAT('SY', @syStartYear);
        
			IF NOT EXISTS (SELECT 1 FROM dbo.school_years WHERE school_year_id = @syId)
			BEGIN
				INSERT INTO dbo.school_years (
					school_year_id, year_code, year_name, academic_year_id,
					start_date, end_date,
					semester1_start, semester1_end,
					semester2_start, semester2_end,
					is_active, current_semester, created_at)
				VALUES (
					@syId,
					CONCAT('SY', @syStartYear),
					CONCAT(@syYearName, ' - HK1/HK2'),
					@ayId,
					DATEFROMPARTS(@syStartYear, 9, 1),
					DATEFROMPARTS(@syEndYear, 8, 31),
					DATEFROMPARTS(@syStartYear, 9, 1), DATEFROMPARTS(@syStartYear, 12, 31),
					DATEFROMPARTS(@syEndYear, 1, 1), DATEFROMPARTS(@syEndYear, 5, 31),
					0,
					1,
					GETDATE()
				);
			END

			SET @i += 1;
		END
	END
	GO

	IF OBJECT_ID('sp_CheckAcademicYearCodeExists', 'P') IS NOT NULL DROP PROCEDURE sp_CheckAcademicYearCodeExists;
	GO
	CREATE PROCEDURE sp_CheckAcademicYearCodeExists
		@YearName NVARCHAR(50)
	AS
	BEGIN
		SET NOCOUNT ON;
		SELECT CASE WHEN EXISTS (
			SELECT 1 FROM dbo.academic_years 
			WHERE year_name = @YearName AND deleted_at IS NULL
		) THEN 1 ELSE 0 END;
	END
	GO

	IF OBJECT_ID('sp_CreateAcademicYear', 'P') IS NOT NULL DROP PROCEDURE sp_CreateAcademicYear;
	GO
	CREATE PROCEDURE sp_CreateAcademicYear
		@AcademicYearId VARCHAR(50),
		@YearName NVARCHAR(50),
		@StartYear INT,
		@EndYear INT,
		@IsActive BIT = 0,
		@CreatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		INSERT INTO dbo.academic_years (academic_year_id, year_name, start_year, end_year,
										 is_active, created_at, created_by)
		VALUES (@AcademicYearId, @YearName, @StartYear, @EndYear, @IsActive, GETDATE(), @CreatedBy);
	END
	GO

	IF OBJECT_ID('sp_CreateDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_CreateDepartment;
	GO
	CREATE PROCEDURE sp_CreateDepartment
		@DepartmentId VARCHAR(50),
		@DepartmentCode VARCHAR(20),
		@DepartmentName NVARCHAR(150),
		@FacultyId VARCHAR(50),
		@Description NVARCHAR(500) = NULL,
		@CreatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		INSERT INTO dbo.departments (department_id, department_code, department_name, faculty_id, description,
									  created_at, created_by)
		VALUES (@DepartmentId, @DepartmentCode, @DepartmentName, @FacultyId, @Description, GETDATE(), @CreatedBy);
	END
	GO

	IF OBJECT_ID('sp_CreateFaculty', 'P') IS NOT NULL DROP PROCEDURE sp_CreateFaculty;
	GO
	CREATE PROCEDURE sp_CreateFaculty
		@FacultyId VARCHAR(50),
		@FacultyCode VARCHAR(20),
		@FacultyName NVARCHAR(150),
		@Description NVARCHAR(500) = NULL,
		@IsActive BIT = 1,
		@CreatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		INSERT INTO dbo.faculties (faculty_id, faculty_code, faculty_name, description, is_active, created_at, created_by)
		VALUES (@FacultyId, @FacultyCode, @FacultyName, @Description, @IsActive, GETDATE(), @CreatedBy);
	END
	GO

	IF OBJECT_ID('sp_CreateMajor', 'P') IS NOT NULL DROP PROCEDURE sp_CreateMajor;
	GO
	CREATE PROCEDURE sp_CreateMajor
		@MajorId VARCHAR(50),
		@MajorName NVARCHAR(150),
		@MajorCode VARCHAR(20),
		@FacultyId VARCHAR(50),
		@Description NVARCHAR(500) = NULL,
		@CreatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		INSERT INTO dbo.majors (major_id, major_name, major_code, faculty_id, description,
								created_at, created_by)
		VALUES (@MajorId, @MajorName, @MajorCode, @FacultyId, @Description, GETDATE(), @CreatedBy);
	END
	GO

	IF OBJECT_ID('sp_DeleteAcademicYear', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteAcademicYear;
	GO
	CREATE PROCEDURE sp_DeleteAcademicYear
		@AcademicYearId VARCHAR(50),
		@DeletedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.academic_years
		SET deleted_at = GETDATE(), deleted_by = @DeletedBy
		WHERE academic_year_id = @AcademicYearId;
	END
	GO

	IF OBJECT_ID('sp_DeleteDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteDepartment;
	GO
	CREATE PROCEDURE sp_DeleteDepartment
		@DepartmentId VARCHAR(50),
		@DeletedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.departments
		SET deleted_at = GETDATE(), deleted_by = @DeletedBy
		WHERE department_id = @DepartmentId;
	END
	GO

	IF OBJECT_ID('sp_DeleteFaculty', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteFaculty;
	GO
	CREATE PROCEDURE sp_DeleteFaculty
		@FacultyId VARCHAR(50),
		@DeletedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.faculties
		SET deleted_at = GETDATE(), deleted_by = @DeletedBy
		WHERE faculty_id = @FacultyId;
	END
	GO

	IF OBJECT_ID('sp_DeleteMajor', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteMajor;
	GO
	CREATE PROCEDURE sp_DeleteMajor
		@MajorId VARCHAR(50),
		@DeletedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.majors
		SET deleted_at = GETDATE(), deleted_by = @DeletedBy
		WHERE major_id = @MajorId;
	END
	GO

	-- ============================================================
	-- ✅ VALIDATION STORED PROCEDURES - Kiểm tra ràng buộc trước khi xóa
	-- ============================================================

	-- Kiểm tra Faculty có Department/Major không
	IF OBJECT_ID('sp_CheckFacultyConstraints', 'P') IS NOT NULL DROP PROCEDURE sp_CheckFacultyConstraints;
	GO
	CREATE PROCEDURE sp_CheckFacultyConstraints
		@FacultyId VARCHAR(50)
	AS
	BEGIN
		SET NOCOUNT ON;
		
		DECLARE @DepartmentCount INT = 0;
		DECLARE @MajorCount INT = 0;
		DECLARE @ActiveDepartmentCount INT = 0;
		DECLARE @ActiveMajorCount INT = 0;
		
		-- Đếm số Department (chỉ active - departments không có is_active, chỉ dùng deleted_at)
		SELECT @DepartmentCount = COUNT(*)
		FROM dbo.departments
		WHERE faculty_id = @FacultyId AND deleted_at IS NULL;
		
		-- ✅ SỬA: departments không có cột is_active, chỉ dùng deleted_at
		SET @ActiveDepartmentCount = @DepartmentCount;
		
		-- Đếm số Major (chỉ active - majors không có is_active, chỉ dùng deleted_at)
		SELECT @MajorCount = COUNT(*)
		FROM dbo.majors
		WHERE faculty_id = @FacultyId AND deleted_at IS NULL;
		
		-- ✅ SỬA: majors không có cột is_active, chỉ dùng deleted_at
		SET @ActiveMajorCount = @MajorCount;
		
		SELECT 
			@DepartmentCount AS department_count,
			@ActiveDepartmentCount AS active_department_count,
			@MajorCount AS major_count,
			@ActiveMajorCount AS active_major_count,
			CASE 
				WHEN @ActiveDepartmentCount > 0 OR @ActiveMajorCount > 0 THEN 1
				ELSE 0
			END AS has_active_relations
	END
	GO

	-- Kiểm tra Department có Subject/Lecturer không
	IF OBJECT_ID('sp_CheckDepartmentConstraints', 'P') IS NOT NULL DROP PROCEDURE sp_CheckDepartmentConstraints;
	GO
	CREATE PROCEDURE sp_CheckDepartmentConstraints
		@DepartmentId VARCHAR(50)
	AS
	BEGIN
		SET NOCOUNT ON;
		
		DECLARE @SubjectCount INT = 0;
		DECLARE @LecturerCount INT = 0;
		DECLARE @ActiveSubjectCount INT = 0;
		DECLARE @ActiveLecturerCount INT = 0;
		
		-- Đếm số Subject (chỉ active - subjects không có is_active, chỉ dùng deleted_at)
		SELECT @SubjectCount = COUNT(*)
		FROM dbo.subjects
		WHERE department_id = @DepartmentId AND deleted_at IS NULL;
		
		-- ✅ SỬA: subjects không có cột is_active, chỉ dùng deleted_at
		SET @ActiveSubjectCount = @SubjectCount;
		
		-- Đếm số Lecturer (chỉ active)
		SELECT @LecturerCount = COUNT(*)
		FROM dbo.lecturers
		WHERE department_id = @DepartmentId AND deleted_at IS NULL;
		
		SELECT @ActiveLecturerCount = COUNT(*)
		FROM dbo.lecturers
		WHERE department_id = @DepartmentId AND deleted_at IS NULL AND is_active = 1;
		
		SELECT 
			@SubjectCount AS subject_count,
			@ActiveSubjectCount AS active_subject_count,
			@LecturerCount AS lecturer_count,
			@ActiveLecturerCount AS active_lecturer_count,
			CASE 
				WHEN @ActiveSubjectCount > 0 OR @ActiveLecturerCount > 0 THEN 1
				ELSE 0
			END AS has_active_relations
	END
	GO

	-- Kiểm tra Major có Student không
	IF OBJECT_ID('sp_CheckMajorConstraints', 'P') IS NOT NULL DROP PROCEDURE sp_CheckMajorConstraints;
	GO
	CREATE PROCEDURE sp_CheckMajorConstraints
		@MajorId VARCHAR(50)
	AS
	BEGIN
		SET NOCOUNT ON;
		
		DECLARE @StudentCount INT = 0;
		DECLARE @ActiveStudentCount INT = 0;
		
		-- Đếm số Student (chỉ active)
		SELECT @StudentCount = COUNT(*)
		FROM dbo.students
		WHERE major_id = @MajorId AND deleted_at IS NULL;
		
		SELECT @ActiveStudentCount = COUNT(*)
		FROM dbo.students
		WHERE major_id = @MajorId AND deleted_at IS NULL AND is_active = 1;
		
		SELECT 
			@StudentCount AS student_count,
			@ActiveStudentCount AS active_student_count,
			CASE 
				WHEN @ActiveStudentCount > 0 THEN 1
				ELSE 0
			END AS has_active_relations
	END
	GO

	IF OBJECT_ID('sp_GetAcademicYearById', 'P') IS NOT NULL DROP PROCEDURE sp_GetAcademicYearById;
	GO
	CREATE PROCEDURE sp_GetAcademicYearById
		@AcademicYearId VARCHAR(50)
	AS
	BEGIN
		SELECT * FROM dbo.academic_years
		WHERE academic_year_id = @AcademicYearId AND deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_GetActiveAcademicYear', 'P') IS NOT NULL DROP PROCEDURE sp_GetActiveAcademicYear;
	GO
	CREATE PROCEDURE sp_GetActiveAcademicYear
	AS
	BEGIN
		SELECT TOP 1 * 
		FROM dbo.academic_years
		WHERE is_active = 1 
			AND deleted_at IS NULL
		ORDER BY start_year DESC;
	END
	GO

	IF OBJECT_ID('sp_GetAllAcademicYears', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllAcademicYears;
	GO
	CREATE PROCEDURE sp_GetAllAcademicYears
	AS
	BEGIN
		SET NOCOUNT ON;
    
		-- Total count
		SELECT COUNT(*) AS TotalCount
		FROM dbo.academic_years
		WHERE deleted_at IS NULL;
    
		-- Data
		SELECT * FROM dbo.academic_years
		WHERE deleted_at IS NULL
		ORDER BY start_year DESC;
	END
	GO

	IF OBJECT_ID('sp_GetAllDepartments', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllDepartments;
	GO
	CREATE PROCEDURE sp_GetAllDepartments
		@Page INT = 1,
		@PageSize INT = 10,
		@Search NVARCHAR(255) = NULL
	AS
	BEGIN
		SET NOCOUNT ON;
    
		DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
		-- Total count
		SELECT COUNT(*) AS TotalCount
		FROM dbo.departments d
		LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
		WHERE d.deleted_at IS NULL
			AND (@Search IS NULL OR 
				 d.department_code LIKE '%' + @Search + '%' OR 
				 d.department_name LIKE '%' + @Search + '%' OR
				 f.faculty_name LIKE '%' + @Search + '%');
    
		-- Data with pagination
		SELECT d.*, f.faculty_name, f.faculty_code
		FROM dbo.departments d
		LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
		WHERE d.deleted_at IS NULL
			AND (@Search IS NULL OR 
				 d.department_code LIKE '%' + @Search + '%' OR 
				 d.department_name LIKE '%' + @Search + '%' OR
				 f.faculty_name LIKE '%' + @Search + '%')
		ORDER BY d.department_name
		OFFSET @Offset ROWS
		FETCH NEXT @PageSize ROWS ONLY;
	END
	GO

	IF OBJECT_ID('sp_GetAllFaculties', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllFaculties;
	GO
	CREATE PROCEDURE sp_GetAllFaculties
		@Page INT = 1,
		@PageSize INT = 10,
		@Search NVARCHAR(255) = NULL
	AS
	BEGIN
		SET NOCOUNT ON;
    
		DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
		-- Total count
		SELECT COUNT(*) AS TotalCount
		FROM dbo.faculties
		WHERE deleted_at IS NULL
			AND (@Search IS NULL OR 
				 faculty_code LIKE '%' + @Search + '%' OR 
				 faculty_name LIKE '%' + @Search + '%' OR
				 description LIKE '%' + @Search + '%');
    
	-- Data with pagination and counts
	SELECT f.faculty_id, f.faculty_code, f.faculty_name, f.description, 
		   f.is_active, f.created_at, f.created_by, f.updated_at, f.updated_by,
		   ISNULL(dept_counts.department_count, 0) AS department_count,
		   ISNULL(major_counts.major_count, 0) AS major_count
	FROM dbo.faculties f
	LEFT JOIN (
		SELECT faculty_id, COUNT(*) AS department_count
		FROM dbo.departments
		WHERE deleted_at IS NULL
		GROUP BY faculty_id
	) dept_counts ON f.faculty_id = dept_counts.faculty_id
	LEFT JOIN (
		SELECT faculty_id, COUNT(*) AS major_count
		FROM dbo.majors
		WHERE deleted_at IS NULL
		GROUP BY faculty_id
	) major_counts ON f.faculty_id = major_counts.faculty_id
	WHERE f.deleted_at IS NULL
		AND (@Search IS NULL OR 
			 f.faculty_code LIKE '%' + @Search + '%' OR 
			 f.faculty_name LIKE '%' + @Search + '%' OR
			 f.description LIKE '%' + @Search + '%')
	ORDER BY f.faculty_name
	OFFSET @Offset ROWS
	FETCH NEXT @PageSize ROWS ONLY;
	END
	GO

	IF OBJECT_ID('sp_GetAllMajors', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllMajors;
	GO
	CREATE PROCEDURE sp_GetAllMajors
		@Page INT = 1,
		@PageSize INT = 10,
		@Search NVARCHAR(255) = NULL
	AS
	BEGIN
		SET NOCOUNT ON;
    
		DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
		-- Total count
		SELECT COUNT(*) AS TotalCount
		FROM dbo.majors m
		LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
		WHERE m.deleted_at IS NULL
			AND (@Search IS NULL OR 
				 m.major_code LIKE '%' + @Search + '%' OR 
				 m.major_name LIKE '%' + @Search + '%' OR
				 f.faculty_name LIKE '%' + @Search + '%');
    
		-- Data with pagination
		SELECT m.*, f.faculty_name, f.faculty_code
		FROM dbo.majors m
		LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
		WHERE m.deleted_at IS NULL
			AND (@Search IS NULL OR 
				 m.major_code LIKE '%' + @Search + '%' OR 
				 m.major_name LIKE '%' + @Search + '%' OR
				 f.faculty_name LIKE '%' + @Search + '%')
		ORDER BY m.major_name
		OFFSET @Offset ROWS
		FETCH NEXT @PageSize ROWS ONLY;
	END
	GO

	IF OBJECT_ID('sp_GetDepartmentById', 'P') IS NOT NULL DROP PROCEDURE sp_GetDepartmentById;
	GO
	CREATE PROCEDURE sp_GetDepartmentById
		@DepartmentId VARCHAR(50)
	AS
	BEGIN
		SELECT d.*, f.faculty_name
		FROM dbo.departments d
		LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
		WHERE d.department_id = @DepartmentId AND d.deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_GetFacultyById', 'P') IS NOT NULL DROP PROCEDURE sp_GetFacultyById;
	GO
	CREATE PROCEDURE sp_GetFacultyById
		@FacultyId VARCHAR(50)
	AS
	BEGIN
		SELECT * FROM dbo.faculties
		WHERE faculty_id = @FacultyId AND deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_GetMajorById', 'P') IS NOT NULL DROP PROCEDURE sp_GetMajorById;
	GO
	CREATE PROCEDURE sp_GetMajorById
		@MajorId VARCHAR(50)
	AS
	BEGIN
		SELECT m.*, f.faculty_name
		FROM dbo.majors m
		LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
		WHERE m.major_id = @MajorId AND m.deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_GetMajorsByFaculty', 'P') IS NOT NULL DROP PROCEDURE sp_GetMajorsByFaculty;
	GO
	CREATE PROCEDURE sp_GetMajorsByFaculty
		@FacultyId VARCHAR(50)
	AS
	BEGIN
		SELECT * FROM dbo.majors
		WHERE faculty_id = @FacultyId AND deleted_at IS NULL
		ORDER BY major_name;
	END
	GO

	IF OBJECT_ID('sp_TransitionToNewAcademicYear', 'P') IS NOT NULL DROP PROCEDURE sp_TransitionToNewAcademicYear;
	GO
	CREATE PROCEDURE sp_TransitionToNewAcademicYear
		@NewAcademicYearId VARCHAR(50),
		@ExecutedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		SET NOCOUNT ON;
		BEGIN TRANSACTION;
    
		BEGIN TRY
			-- 1. Kiá»ƒm tra nÄƒm há»c má»›i cĂ³ tá»“n táº¡i khĂ´ng
			IF NOT EXISTS (SELECT 1 FROM dbo.academic_years WHERE academic_year_id = @NewAcademicYearId AND deleted_at IS NULL)
			BEGIN
				RAISERROR(N'âŒ NÄƒm há»c má»›i khĂ´ng tá»“n táº¡i hoáº·c Ä‘Ă£ bá»‹ xĂ³a!', 16, 1);
				RETURN;
			END
        
			-- 2. Láº¥y nÄƒm há»c hiá»‡n táº¡i (Ä‘ang active)
			DECLARE @OldAcademicYearId VARCHAR(50);
			SELECT TOP 1 @OldAcademicYearId = academic_year_id
			FROM dbo.academic_years
			WHERE is_active = 1 AND deleted_at IS NULL;
        
			IF @OldAcademicYearId IS NOT NULL
			BEGIN
				-- 3. TĂ­nh GPA cho táº¥t cáº£ sinh viĂªn cá»§a nÄƒm há»c cÅ©
				EXEC sp_CalculateAllStudentGPA 
					@AcademicYearId = @OldAcademicYearId,
					@Semester = NULL, -- TĂ­nh GPA cáº£ nÄƒm
					@CreatedBy = @ExecutedBy;
            
				-- 4. ÄĂ³ng nÄƒm há»c cÅ©
				UPDATE dbo.academic_years 
				SET is_active = 0, 
					updated_at = GETDATE(), 
					updated_by = @ExecutedBy
				WHERE academic_year_id = @OldAcademicYearId;
			END
        
			-- 5. KĂ­ch hoáº¡t nÄƒm há»c má»›i
			UPDATE dbo.academic_years 
			SET is_active = 1, 
				updated_at = GETDATE(), 
				updated_by = @ExecutedBy
			WHERE academic_year_id = @NewAcademicYearId;
        
			-- 6. Ghi log audit
			INSERT INTO dbo.audit_logs (
				user_id, action, entity_type, entity_id, 
				old_values, new_values, created_at
			)
			VALUES (
				@ExecutedBy, 
				'TRANSITION_ACADEMIC_YEAR', 
				'academic_years', 
				@NewAcademicYearId,
				CONCAT('{"old_year":"', @OldAcademicYearId, '"}'),
				CONCAT('{"new_year":"', @NewAcademicYearId, '"}'),
				GETDATE()
			);
        
			COMMIT TRANSACTION;
        
			SELECT 
				'SUCCESS' as Status,
				@OldAcademicYearId as OldAcademicYearId,
				@NewAcademicYearId as NewAcademicYearId,
				GETDATE() as TransitionDate,
				N'âœ… Chuyá»ƒn nÄƒm há»c thĂ nh cĂ´ng!' as Message;
            
		END TRY
		BEGIN CATCH
			IF @@TRANCOUNT > 0
				ROLLBACK TRANSACTION;
        
			DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
			DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
			DECLARE @ErrorState INT = ERROR_STATE();
        
			RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
		END CATCH
	END
	GO

	IF OBJECT_ID('sp_UpdateAcademicYear', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateAcademicYear;
	GO
	CREATE PROCEDURE sp_UpdateAcademicYear
		@AcademicYearId VARCHAR(50),
		@YearName NVARCHAR(50),
		@StartYear INT,
		@EndYear INT,
		@IsActive BIT,
		@UpdatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.academic_years
		SET year_name = @YearName, start_year = @StartYear, end_year = @EndYear,
			is_active = @IsActive, updated_at = GETDATE(), updated_by = @UpdatedBy
		WHERE academic_year_id = @AcademicYearId AND deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_UpdateDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateDepartment;
	GO
	CREATE PROCEDURE sp_UpdateDepartment
		@DepartmentId VARCHAR(50),
		@DepartmentCode VARCHAR(20),
		@DepartmentName NVARCHAR(150),
		@FacultyId VARCHAR(50),
		@Description NVARCHAR(500) = NULL,
		@UpdatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.departments
		SET department_code = @DepartmentCode,
			department_name = @DepartmentName,
			faculty_id = @FacultyId,
			description = @Description,
			updated_at = GETDATE(),
			updated_by = @UpdatedBy
		WHERE department_id = @DepartmentId AND deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_UpdateFaculty', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateFaculty;
	GO
	CREATE PROCEDURE sp_UpdateFaculty
		@FacultyId VARCHAR(50),
		@FacultyCode VARCHAR(20),
		@FacultyName NVARCHAR(150),
		@Description NVARCHAR(500) = NULL,
		@IsActive BIT = 1,
		@UpdatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.faculties
		SET faculty_code = @FacultyCode, faculty_name = @FacultyName, description = @Description,
			is_active = @IsActive, updated_at = GETDATE(), updated_by = @UpdatedBy
		WHERE faculty_id = @FacultyId AND deleted_at IS NULL;
	END
	GO

	IF OBJECT_ID('sp_UpdateMajor', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateMajor;
	GO
	CREATE PROCEDURE sp_UpdateMajor
		@MajorId VARCHAR(50),
		@MajorName NVARCHAR(150),
		@MajorCode VARCHAR(20),
		@FacultyId VARCHAR(50),
		@Description NVARCHAR(500) = NULL,
		@UpdatedBy VARCHAR(50) = 'system'
	AS
	BEGIN
		UPDATE dbo.majors
		SET major_name = @MajorName, major_code = @MajorCode, faculty_id = @FacultyId,
			description = @Description, updated_at = GETDATE(), updated_by = @UpdatedBy
		WHERE major_id = @MajorId AND deleted_at IS NULL;
	END
	GO

	PRINT '========================================';
	PRINT '[OK] Organization and Academic Management SPs completed';
	PRINT '========================================';
	GO