// Lecturer Grades Controller
app.controller('LecturerGradesController', ['$scope', '$timeout', '$q', 'AuthService', 'ClassService', 'GradeFormulaConfigService', 'EnrollmentService', 'GradeService', 'SchoolYearService', 'CurrentSemesterHelper', 'ToastService', 'LoggerService',
    function($scope, $timeout, $q, AuthService, ClassService, GradeFormulaConfigService, EnrollmentService, GradeService, SchoolYearService, CurrentSemesterHelper, ToastService, LoggerService) {
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.selectedClass = null;
    $scope.gradeType = '';
    $scope.saving = false;
    $scope.loading = false;
    $scope.loadingFormula = false;
    $scope.gradeFormula = null;
    $scope.availableGradeTypes = []; // Cache for available grade types
    
    var gradeTypeNames = {
        'attendance': 'Chuyên cần',
        'midterm': 'Giữa kỳ',
        'assignment': 'Bài tập',
        'quiz': 'Kiểm tra',
        'project': 'Đồ án',
        'final': 'Cuối kỳ'
    };
    
    $scope.$watch('gradeType', function(newVal) {
        $scope.gradeTypeName = gradeTypeNames[newVal] || '';
    });
    
    // Load classes for lecturer
    $scope.classes = [];
    $scope.currentSemesterInfo = null;
    
    $scope.loadClasses = function() {
        var lecturerId = $scope.currentUser && ($scope.currentUser.lecturerId || $scope.currentUser.userId || $scope.currentUser.relatedId);
        
        if (!lecturerId) {
            $scope.error = 'Không tìm thấy thông tin giảng viên';
            return;
        }
        
        $scope.loading = true;
        
        // 1. Lấy thông tin học kỳ hiện tại
        CurrentSemesterHelper.getCurrentSemesterInfo()
            .then(function(currentSemesterInfo) {
                $scope.currentSemesterInfo = currentSemesterInfo;
                
                // 2. Load tất cả lớp của giảng viên
                return ClassService.getByLecturer(lecturerId);
            })
            .then(function(response) {
                var allClasses = (response.data && response.data.data) || response.data || [];
                
                // 3. Map classes với đầy đủ thông tin
                var mappedClasses = allClasses.map(function(c) {
                    return {
                        id: c.classId || c.id,
                        classId: c.classId || c.id,
                        classCode: c.classCode,
                        className: c.className || c.className,
                        subjectId: c.subjectId,
                        subjectName: c.subjectName || (c.subjectCode ? c.subjectCode + ' - ' + c.subjectName : ''),
                        schoolYearId: c.schoolYearId || c.academicYearId,
                        semester: c.semester || c.Semester || null // Support both camelCase and PascalCase
                    };
                });
                
                // 4. Filter và sort theo học kỳ hiện tại
                // Best practice: Chỉ hiển thị lớp học kỳ hiện tại để tránh nhầm lẫn
                $scope.classes = CurrentSemesterHelper.filterClassesByCurrentSemester(
                    mappedClasses, 
                    $scope.currentSemesterInfo,
                    { filterOnly: true, sortByCurrent: true }
                );
                
                // 5. Nếu không có lớp học kỳ hiện tại, hiển thị cảnh báo và tất cả lớp (sort học kỳ hiện tại lên đầu)
                if ($scope.classes.length === 0 && mappedClasses.length > 0) {
                    LoggerService.warn('No classes for current semester, showing all classes', {
                        mappedClassesCount: mappedClasses.length,
                        currentSemesterInfo: $scope.currentSemesterInfo
                    });
                    $scope.classes = CurrentSemesterHelper.filterClassesByCurrentSemester(
                        mappedClasses,
                        $scope.currentSemesterInfo,
                        { filterOnly: false, sortByCurrent: true }
                    );
                    ToastService.warning('Không có lớp học kỳ hiện tại. Đang hiển thị tất cả lớp học.');
                }
            })
            .catch(function(error) {
                LoggerService.error('Load classes error', error);
                $scope.error = 'Không thể tải danh sách lớp học';
                ToastService.error('Không thể tải danh sách lớp học');
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Load grade formula when class is selected
    $scope.loadGradeFormula = function() {
        if (!$scope.selectedClass) {
            $scope.gradeFormula = null;
            $scope.availableGradeTypes = []; // Clear available types
            return;
        }
        
        var selectedClassObj = $scope.classes.find(function(c) {
            return (c.id || c.classId) === $scope.selectedClass;
        });
        
        if (!selectedClassObj) {
            $scope.gradeFormula = null;
            return;
        }
        
        $scope.loadingFormula = true;
        GradeFormulaConfigService.getByScope({
            classId: selectedClassObj.classId,
            subjectId: selectedClassObj.subjectId,
            schoolYearId: selectedClassObj.schoolYearId
        })
        .then(function(config) {
            $scope.gradeFormula = config;
            $scope.updateAvailableGradeTypes(); // Update cache when formula loads
        })
        .catch(function(error) {
            LoggerService.warn('Load grade formula error', error);
            // Use default formula if not found
            $scope.gradeFormula = {
                midtermWeight: 0.30,
                finalWeight: 0.70,
                assignmentWeight: 0.00,
                quizWeight: 0.00,
                projectWeight: 0.00,
                roundingMethod: 'STANDARD',
                decimalPlaces: 2,
                isDefault: true
            };
            $scope.updateAvailableGradeTypes(); // Update cache with default formula
        })
        .finally(function() {
            $scope.loadingFormula = false;
        });
    };
    
    // Get weight percentage for grade type
    $scope.getWeightPercentage = function(gradeType) {
        if (!$scope.gradeFormula) return '';
        
        var weight = 0;
        switch(gradeType) {
            case 'midterm':
                weight = $scope.gradeFormula.midtermWeight || 0;
                break;
            case 'final':
                weight = $scope.gradeFormula.finalWeight || 0;
                break;
            case 'assignment':
                weight = $scope.gradeFormula.assignmentWeight || 0;
                break;
            case 'quiz':
                weight = $scope.gradeFormula.quizWeight || 0;
                break;
            case 'project':
                weight = $scope.gradeFormula.projectWeight || 0;
                break;
        }
        
        return weight > 0 ? '(' + (weight * 100).toFixed(0) + '%)' : '';
    };
    
    // Update available grade types cache
    $scope.updateAvailableGradeTypes = function() {
        if (!$scope.gradeFormula) {
            $scope.availableGradeTypes = [
                { value: 'midterm', label: 'Điểm giữa kỳ', weight: 0.30, weightText: '(30%)' },
                { value: 'final', label: 'Điểm cuối kỳ', weight: 0.70, weightText: '(70%)' }
            ];
            return;
        }
        
        var types = [];
        if (($scope.gradeFormula.midtermWeight || 0) > 0) {
            var midtermWeight = $scope.gradeFormula.midtermWeight;
            types.push({
                value: 'midterm',
                label: 'Điểm giữa kỳ',
                weight: midtermWeight,
                weightText: '(' + (midtermWeight * 100).toFixed(0) + '%)'
            });
        }
        if (($scope.gradeFormula.assignmentWeight || 0) > 0) {
            var assignmentWeight = $scope.gradeFormula.assignmentWeight;
            types.push({
                value: 'assignment',
                label: 'Điểm bài tập',
                weight: assignmentWeight,
                weightText: '(' + (assignmentWeight * 100).toFixed(0) + '%)'
            });
        }
        if (($scope.gradeFormula.quizWeight || 0) > 0) {
            var quizWeight = $scope.gradeFormula.quizWeight;
            types.push({
                value: 'quiz',
                label: 'Điểm kiểm tra',
                weight: quizWeight,
                weightText: '(' + (quizWeight * 100).toFixed(0) + '%)'
            });
        }
        if (($scope.gradeFormula.projectWeight || 0) > 0) {
            var projectWeight = $scope.gradeFormula.projectWeight;
            types.push({
                value: 'project',
                label: 'Điểm đồ án',
                weight: projectWeight,
                weightText: '(' + (projectWeight * 100).toFixed(0) + '%)'
            });
        }
        if (($scope.gradeFormula.finalWeight || 0) > 0) {
            var finalWeight = $scope.gradeFormula.finalWeight;
            types.push({
                value: 'final',
                label: 'Điểm cuối kỳ',
                weight: finalWeight,
                weightText: '(' + (finalWeight * 100).toFixed(0) + '%)'
            });
        }
        
        $scope.availableGradeTypes = types.length > 0 ? types : [
            { value: 'midterm', label: 'Điểm giữa kỳ', weight: 0.30, weightText: '(30%)' },
            { value: 'final', label: 'Điểm cuối kỳ', weight: 0.70, weightText: '(70%)' }
        ];
    };
    
    // Watch for class selection change
    $scope.$watch('selectedClass', function(newVal, oldVal) {
        if (newVal !== oldVal) {
            $scope.gradeType = ''; // Reset grade type
            $scope.loadGradeFormula();
            $scope.loadStudents();
        }
    });
    
    // Watch gradeType to load existing grades
    $scope.$watch('gradeType', function(newVal, oldVal) {
        if (newVal && newVal !== oldVal && $scope.selectedClass) {
            $scope.loadExistingGrades();
        }
    });
    
    // Students in selected class
    $scope.students = [];
    $scope.loadingStudents = false;
    
    $scope.loadStudents = function() {
        if (!$scope.selectedClass) {
            $scope.students = [];
            return;
        }
        
        $scope.loadingStudents = true;
        EnrollmentService.getClassRoster($scope.selectedClass)
            .then(function(response) {
                var students = (response.data && response.data.data) || [];
                $scope.students = students.map(function(s) {
                    return {
                        id: s.studentId || s.id,
                        studentId: s.studentId || s.id,
                        studentCode: s.studentCode,
                        fullName: s.fullName,
                        email: s.email,
                        phone: s.phone,
                        grade: null, // Grade will be loaded separately if needed
                        gradeId: null, // Store grade ID if exists for update
                        note: ''
                    };
                });
                
                // Load existing grades if gradeType is selected
                if ($scope.gradeType) {
                    $scope.loadExistingGrades();
                }
            })
            .catch(function(error) {
                LoggerService.error('Load students error', error);
                ToastService.error('Không thể tải danh sách sinh viên');
                $scope.students = [];
            })
            .finally(function() {
                $scope.loadingStudents = false;
            });
    };
    
    // Load existing grades for selected class and grade type
    $scope.loadExistingGrades = function() {
        if (!$scope.selectedClass || !$scope.gradeType) {
            return;
        }
        
        GradeService.getByClass($scope.selectedClass, { forceRefresh: true })
            .then(function(grades) {
                // Map grades to students
                // Note: Each grade row has both midterm_score and final_score
                // We need to find the grade for this student and extract the score for the selected gradeType
                $scope.students.forEach(function(student) {
                    var existingGrade = grades.find(function(g) {
                        return (g.studentId === student.studentId || g.studentId === student.id);
                    });
                    
                    if (existingGrade) {
                        // Extract score based on gradeType
                        if ($scope.gradeType === 'midterm' && existingGrade.midtermScore !== null && existingGrade.midtermScore !== undefined) {
                            student.grade = existingGrade.midtermScore;
                            student.gradeId = existingGrade.gradeId || existingGrade.id;
                        } else if ($scope.gradeType === 'final' && existingGrade.finalScore !== null && existingGrade.finalScore !== undefined) {
                            student.grade = existingGrade.finalScore;
                            student.gradeId = existingGrade.gradeId || existingGrade.id;
                        } else if (existingGrade.gradeType === $scope.gradeType && existingGrade.score !== null && existingGrade.score !== undefined) {
                            // Use gradeType and score from stored procedure if available
                            student.grade = existingGrade.score;
                            student.gradeId = existingGrade.gradeId || existingGrade.id;
                        }
                        
                        // Note is not stored in grades table, so leave it empty
                        if (existingGrade.notes) {
                            student.note = existingGrade.notes;
                        }
                    }
                });
            })
            .catch(function(error) {
                LoggerService.warn('Load existing grades error', error);
                // Don't show error, just continue without loading existing grades
            });
    };
    
    $scope.getAverageGrade = function() {
        var validGrades = $scope.students.filter(function(s) {
            return s.grade !== null && s.grade !== undefined && s.grade !== '';
        });
        
        if (validGrades.length === 0) return 0;
        
        var sum = validGrades.reduce(function(acc, s) {
            return acc + parseFloat(s.grade);
        }, 0);
        
        return sum / validGrades.length;
    };
    
    $scope.getCountByRange = function(min, max) {
        return $scope.students.filter(function(s) {
            var grade = parseFloat(s.grade);
            return !isNaN(grade) && grade >= min && grade <= max;
        }).length;
    };
    
    $scope.saveGrades = function() {
        if (!$scope.selectedClass || !$scope.gradeType) {
            ToastService.error('Vui lòng chọn đầy đủ thông tin lớp học và loại điểm');
            return;
        }
        
        // Get students with grades entered
        var studentsWithGrades = $scope.students.filter(function(s) {
            var grade = parseFloat(s.grade);
            return s.grade !== null && s.grade !== undefined && s.grade !== '' && !isNaN(grade) && grade >= 0 && grade <= 10;
        });
        
        if (studentsWithGrades.length === 0) {
            ToastService.warning('Vui lòng nhập ít nhất một điểm');
            return;
        }
        
        // Validate grades
        var invalidGrades = $scope.students.filter(function(s) {
            var grade = parseFloat(s.grade);
            return s.grade !== null && s.grade !== undefined && s.grade !== '' && (isNaN(grade) || grade < 0 || grade > 10);
        });
        
        if (invalidGrades.length > 0) {
            ToastService.error('Có điểm không hợp lệ. Điểm phải từ 0 đến 10');
            return;
        }
        
        $scope.saving = true;
        $scope.error = null;
        $scope.success = null;
        
        // Get weight for this grade type from formula
        var gradeTypeWeight = 0;
        if ($scope.gradeFormula && $scope.availableGradeTypes) {
            var typeInfo = $scope.availableGradeTypes.find(function(t) {
                return t.value === $scope.gradeType;
            });
            if (typeInfo && typeInfo.weight) {
                gradeTypeWeight = typeInfo.weight;
            }
        }
        
        // Get current user ID for gradedBy
        var gradedBy = $scope.currentUser && ($scope.currentUser.userId || $scope.currentUser.id || 'system');
        
        // Get class info for maxScore
        var selectedClassObj = $scope.classes.find(function(c) {
            return c.classId === $scope.selectedClass || c.id === $scope.selectedClass;
        });
        var maxScore = 10.0; // Default max score
        
        // Create or update grade for each student
        var promises = studentsWithGrades.map(function(student) {
            var gradeData = {
                studentId: student.studentId || student.id,
                classId: $scope.selectedClass,
                gradeType: $scope.gradeType,
                score: parseFloat(student.grade),
                maxScore: maxScore,
                weight: gradeTypeWeight,
                notes: student.note || '',
                gradedBy: gradedBy,
                createdBy: gradedBy
            };
            
            // If gradeId exists, update; otherwise create
            if (student.gradeId) {
                // Update existing grade
                var updateData = {
                    gradeType: $scope.gradeType,
                    score: parseFloat(student.grade),
                    maxScore: maxScore,
                    weight: gradeTypeWeight,
                    notes: student.note || '',
                    updatedBy: gradedBy
                };
                
                return GradeService.update(student.gradeId, updateData)
                    .then(function(response) {
                        // Response có thể là null hoặc object với message, nhưng vẫn coi là success nếu không có error
                        // Nếu response là null hoặc undefined, vẫn coi là success vì backend đã trả về 200 OK
                        var result = { success: true, student: student, response: response || { message: 'Cập nhật thành công' } };
                        return result;
                    })
                    .catch(function(error) {
                        LoggerService.error('Error updating grade for student: ' + student.fullName, {
                            studentId: student.studentId,
                            gradeId: student.gradeId,
                            error: error,
                            errorMessage: error && error.message,
                            errorData: error && error.data
                        });
                        return { success: false, student: student, error: error };
                    });
            } else {
                // Create new grade
                return GradeService.create(gradeData)
                    .then(function(response) {
                        // Store gradeId for future updates (nếu có trong response)
                        if (response && (response.gradeId || response.id)) {
                            student.gradeId = response.gradeId || response.id;
                        }
                        // Nếu response là null hoặc undefined, vẫn coi là success vì backend đã trả về 200 OK
                        var result = { success: true, student: student, response: response || { message: 'Tạo thành công' } };
                        return result;
                    })
                    .catch(function(error) {
                        LoggerService.error('Error creating grade for student: ' + student.fullName, {
                            studentId: student.studentId,
                            error: error,
                            errorMessage: error && error.message,
                            errorData: error && error.data
                        });
                        return { success: false, student: student, error: error };
                    });
            }
        });
        
        // Wait for all promises to complete
        $q.all(promises)
            .then(function(results) {
                // Kiểm tra results có phải là array không
                if (!Array.isArray(results)) {
                    LoggerService.error('Results is not an array', results);
                    $scope.saving = false;
                    ToastService.error('Lỗi khi xử lý kết quả. Vui lòng thử lại');
                    $scope.error = 'Lỗi khi xử lý kết quả. Vui lòng thử lại';
                    return;
                }
                
                var successCount = results.filter(function(r) { 
                    return r && r.success === true; 
                }).length;
                var failCount = results.filter(function(r) { 
                    return r && r.success === false; 
                }).length;
                
                $scope.saving = false;
                
                if (failCount === 0 && successCount > 0) {
                    // All succeeded
                    ToastService.success('Đã lưu điểm thành công cho ' + successCount + ' sinh viên');
                    $scope.success = 'Đã lưu điểm thành công cho ' + successCount + ' sinh viên';
                    $scope.error = null;
                    
                    // Reload existing grades to get updated gradeId
                    if ($scope.selectedClass && $scope.gradeType) {
                        $scope.loadExistingGrades();
                    }
                    
                    // Clear grades after saving
                    $scope.students.forEach(function(s) {
                        s.grade = null;
                        s.note = '';
                    });
                    
                    // Clear success message after 5 seconds
                    $timeout(function() {
                        $scope.success = null;
                    }, 5000);
                } else if (successCount > 0) {
                    // Partial success
                    LoggerService.warning('Partial success saving grades', {
                        successCount: successCount,
                        failCount: failCount
                    });
                    ToastService.warning('Đã lưu điểm cho ' + successCount + ' sinh viên, ' + failCount + ' sinh viên lỗi');
                    $scope.error = 'Đã lưu điểm cho ' + successCount + ' sinh viên, ' + failCount + ' sinh viên lỗi';
                } else {
                    // All failed
                    LoggerService.error('All grades save failed', {
                        total: results.length,
                        successCount: successCount,
                        failCount: failCount,
                        resultsDetail: results.map(function(r, i) {
                            return {
                                index: i,
                                hasResult: !!r,
                                success: r && r.success,
                                successValue: r && r.success,
                                student: r && r.student && (r.student.fullName || r.student.studentId),
                                error: r && r.error
                            };
                        })
                    });
                    LoggerService.error('All grades failed to save', {
                        results: results,
                        total: results.length,
                        successCount: successCount,
                        failCount: failCount
                    });
                    ToastService.error('Không thể lưu điểm. Vui lòng thử lại');
                    $scope.error = 'Không thể lưu điểm. Vui lòng thử lại';
                }
            })
            .catch(function(error) {
                LoggerService.error('Error in saveGrades catch block', {
                    error: error,
                    errorMessage: error && error.message,
                    errorData: error && error.data,
                    errorStatus: error && error.status
                });
                $scope.saving = false;
                ToastService.error('Lỗi khi lưu điểm: ' + (error && (error.message || error.data && error.data.message) || 'Lỗi hệ thống'));
                $scope.error = 'Lỗi khi lưu điểm: ' + (error && (error.message || error.data && error.data.message) || 'Lỗi hệ thống');
            });
    };
    
    // Get formula description
    $scope.getFormulaDescription = function() {
        if (!$scope.gradeFormula) return 'Chưa có công thức';
        
        var parts = [];
        if ($scope.gradeFormula.midtermWeight > 0) {
            parts.push('Giữa kỳ: ' + ($scope.gradeFormula.midtermWeight * 100).toFixed(0) + '%');
        }
        if ($scope.gradeFormula.assignmentWeight > 0) {
            parts.push('Bài tập: ' + ($scope.gradeFormula.assignmentWeight * 100).toFixed(0) + '%');
        }
        if ($scope.gradeFormula.quizWeight > 0) {
            parts.push('Kiểm tra: ' + ($scope.gradeFormula.quizWeight * 100).toFixed(0) + '%');
        }
        if ($scope.gradeFormula.projectWeight > 0) {
            parts.push('Đồ án: ' + ($scope.gradeFormula.projectWeight * 100).toFixed(0) + '%');
        }
        if ($scope.gradeFormula.finalWeight > 0) {
            parts.push('Cuối kỳ: ' + ($scope.gradeFormula.finalWeight * 100).toFixed(0) + '%');
        }
        
        return parts.length > 0 ? parts.join(' + ') : 'Chưa có công thức';
    };
    
    // Initialize
    $scope.loadClasses();
}]);

