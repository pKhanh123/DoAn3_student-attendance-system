// @ts-check
/* global angular */
'use strict';

app.service('GradeDashboardService', [
    '$q',
    'GradeService',
    'SchoolYearService',
    'StudentService',
    'LoggerService',
    'ACADEMIC_RULES',
    function (
        $q,
        GradeService,
        SchoolYearService,
        StudentService,
        LoggerService,
        ACADEMIC_RULES
    ) {
        /**
         * Resolve số tín chỉ bắt buộc.
         * @param {any} profile
         * @param {(profile: any) => number | null | undefined} resolver
         */
        function resolveRequiredCredits(profile, resolver) {
            var credits = null;

            if (typeof resolver === 'function') {
                try {
                    credits = resolver(profile);
                } catch (error) {
                    LoggerService.warn('GradeDashboardService: resolver threw an exception', error);
                }
            }

            if (!credits && profile) {
                if (profile.requiredCredits) {
                    credits = profile.requiredCredits;
                } else if (profile.majorRequiredCredits) {
                    credits = profile.majorRequiredCredits;
                }
            }

            if (!credits || isNaN(credits)) {
                credits = ACADEMIC_RULES.defaultRequiredCredits;
            }

            return credits;
        }

        /**
         * Tạo summary mặc định.
         * @param {number} requiredCredits
         */
        function createEmptySummary(requiredCredits) {
            return {
                currentGPA: 0,
                cumulativeGPA: 0,
                totalCredits: 0,
                cumulativeCredits: 0,
                requiredCredits: requiredCredits,
                rank: 'Chưa có',
                cumulativeRank: 'Chưa có'
            };
        }

        /**
         * Chuẩn hóa response API.
         * @param {any} response
         * @param {any} fallback
         */
        function unwrap(response, fallback) {
            if (!response) {
                return fallback;
            }

            if (response.data && typeof response.data === 'object' && response.data.data !== undefined) {
                return response.data.data;
            }

            if (response.data !== undefined) {
                return response.data;
            }

            return response || fallback;
        }

        /**
         * Đảm bảo gọi $apply an toàn.
         * @param {import('angular').IScope} $scope
         * @param {(() => void)=} fn
         */
        function safeApply($scope, fn) {
            if (!$scope || typeof $scope.$apply !== 'function') {
                return;
            }

            var phase = $scope.$root && $scope.$root.$$phase;
            if (phase === '$apply' || phase === '$digest') {
                if (typeof fn === 'function') {
                    fn();
                }
            } else if (typeof fn === 'function') {
                $scope.$apply(fn);
            } else {
                $scope.$apply(angular.noop);
            }
        }

        /**
         * Khởi tạo state trên scope.
         * @param {import('angular').IScope} $scope
         * @param {number} requiredCredits
         */
        function initializeScope($scope, requiredCredits) {
            $scope.schoolYears = [];
            $scope.selectedSchoolYear = null;
            $scope.selectedSemester = null;
            $scope.grades = [];
            $scope.summary = createEmptySummary(requiredCredits);
            $scope.loading = false;
            $scope.error = null;
        }

        /**
         * Tạo view-model cho màn hình điểm.
         * @param {import('angular').IScope} $scope
         * @param {{
         *  currentUserGetter?: () => any,
         *  allowRecalculate?: boolean,
         *  requiredCreditsResolver?: (profile: any) => number | null | undefined,
         *  onError?: (message: string, error?: any) => void
         * }} options
         */
        this.create = function ($scope, options) {
            var config = angular.extend({
                currentUserGetter: angular.noop,
                allowRecalculate: false,
                requiredCreditsResolver: null,
                onError: angular.noop
            }, options || {});

            var state = {
                $scope: $scope,
                options: config,
                studentId: null,
                studentProfile: null
            };

            var initialCredits = resolveRequiredCredits(null, config.requiredCreditsResolver);
            initializeScope($scope, initialCredits);

            $scope.onFilterChange = function () {
                return loadGrades(false);
            };

            $scope.refreshGrades = function () {
                // Refresh cả school years để cập nhật currentSemester
                return loadSchoolYears(true)
                    .then(function () {
                        return loadGrades(true);
                    });
            };

            if (config.allowRecalculate) {
                $scope.recalculateGPA = function () {
                    if (!state.studentId || !$scope.selectedSchoolYear) {
                        return $q.resolve();
                    }

                    setLoading(true);
                    return GradeService.calculateGPA(
                        state.studentId,
                        $scope.selectedSchoolYear,
                        $scope.selectedSemester || null
                    ).then(function () {
                        return loadGrades(true);
                    }).catch(function (error) {
                        return handleError('Không thể tính GPA.', error);
                    });
                };
            } else {
                $scope.recalculateGPA = angular.noop;
            }

            function setLoading(isLoading) {
                safeApply($scope, function () {
                    $scope.loading = isLoading;
                });
            }

            function handleError(message, error) {
                LoggerService.error('Grade dashboard error: ' + message, error || {});
                safeApply($scope, function () {
                    $scope.error = message;
                    $scope.loading = false;
                });

                if (typeof config.onError === 'function') {
                    try {
                        config.onError(message, error);
                    } catch (callbackError) {
                        LoggerService.warn('Grade dashboard error callback threw an exception', callbackError);
                    }
                }

                return $q.reject(error || new Error(message));
            }

            function loadStudentProfile() {
                var currentUser = null;

                if (typeof config.currentUserGetter === 'function') {
                    currentUser = config.currentUserGetter();
                }

                if (!currentUser && $scope.currentUser) {
                    currentUser = $scope.currentUser;
                }

                if (!currentUser || !currentUser.userId) {
                    return handleError('Không tìm thấy thông tin đăng nhập hợp lệ.');
                }
                
                return StudentService.getByUserId(currentUser.userId)
                    .then(function (response) {
                        var profile = unwrap(response, null);
                        
                        if (!profile || !profile.studentId) {
                            return handleError('Không tìm thấy thông tin sinh viên.', response);
                        }

                        state.studentId = profile.studentId;
                        state.studentProfile = profile;

                        var requiredCredits = resolveRequiredCredits(profile, config.requiredCreditsResolver);
                        
                        safeApply($scope, function () {
                            $scope.summary.requiredCredits = requiredCredits;
                            $scope.error = null;
                        });
                    })
                    .catch(function (error) {
                        return handleError('Không thể tải thông tin sinh viên.', error);
                    });
            }

            function loadSchoolYears(forceRefresh) {
                var params = forceRefresh ? { forceRefresh: true } : undefined;
                return SchoolYearService.getAll(params)
                    .then(function (response) {
                        var schoolYears = unwrap(response, []);
                        if (!Array.isArray(schoolYears)) {
                            schoolYears = [];
                        }

                        safeApply($scope, function () {
                            $scope.schoolYears = schoolYears;

                            if (!$scope.selectedSchoolYear && schoolYears.length > 0) {
                                // Lần đầu load: Chọn năm học active và học kỳ hiện tại
                                var active = schoolYears.find(function (sy) { return sy.isActive; }) || schoolYears[0];
                                $scope.selectedSchoolYear = active.schoolYearId;
                                if (active.currentSemester) {
                                    $scope.selectedSemester = String(active.currentSemester);
                                }
                            } else if ($scope.selectedSchoolYear) {
                                // Đã có năm học được chọn: Kiểm tra và cập nhật
                                var selectedSchoolYearObj = schoolYears.find(function (sy) {
                                    return sy.schoolYearId === $scope.selectedSchoolYear;
                                });

                                if (!selectedSchoolYearObj) {
                                    // Năm học đã chọn không còn tồn tại, chọn năm học khác
                                    if (schoolYears.length > 0) {
                                        var active = schoolYears.find(function (sy) { return sy.isActive; }) || schoolYears[0];
                                        $scope.selectedSchoolYear = active.schoolYearId;
                                        if (active.currentSemester) {
                                            $scope.selectedSemester = String(active.currentSemester);
                                        }
                                    }
                                } else {
                                    // Cập nhật selectedSemester theo currentSemester mới (nếu đang xem năm học hiện tại)
                                    // Chỉ tự động cập nhật nếu đang xem năm học active và currentSemester đã thay đổi
                                    var isActiveYear = selectedSchoolYearObj.isActive;
                                    if (isActiveYear && selectedSchoolYearObj.currentSemester) {
                                        var newSemester = String(selectedSchoolYearObj.currentSemester);
                                        // Chỉ cập nhật nếu học kỳ thực sự thay đổi (tránh cập nhật không cần thiết)
                                        if ($scope.selectedSemester !== newSemester) {
                                            $scope.selectedSemester = newSemester;
                                            // Tự động reload điểm với học kỳ mới
                                            loadGrades(true);
                                        }
                                    }
                                }
                            }
                        });
                    })
                    .catch(function (error) {
                        return handleError('Không thể tải danh sách năm học.', error);
                    });
            }

            function loadGrades(forceRefresh) {
                if (!state.studentId || !$scope.selectedSchoolYear) {
                    return $q.resolve();
                }

                setLoading(true);

                var requestOptions = {
                    forceRefresh: !!forceRefresh
                };

                var semesterValue = $scope.selectedSemester || null;
                
                return $q.all([
                    GradeService.getByStudentSchoolYear(state.studentId, $scope.selectedSchoolYear, semesterValue, requestOptions),
                    GradeService.getGradeSummary(state.studentId, $scope.selectedSchoolYear, semesterValue, requestOptions),
                    GradeService.getCumulativeGPA(state.studentId, requestOptions)
                ]).then(function (results) {
                    var grades = Array.isArray(results[0]) ? results[0] : [];
                    var summary = results[1] || {};
                    var cumulative = results[2] || {};
                    var requiredCredits = resolveRequiredCredits(state.studentProfile, config.requiredCreditsResolver);

                    // Tính toán summary trước khi apply
                    var calculatedSummary = {
                        currentGPA: summary.gpa10 || 0,
                        cumulativeGPA: cumulative.cumulativeGpa10 || cumulative.gpa10 || 0,
                        totalCredits: summary.totalCredits || 0,
                        cumulativeCredits: cumulative.totalCreditsEarned || cumulative.totalCredits || 0,
                        requiredCredits: requiredCredits,
                        rank: summary.rankText || 'Chưa có',
                        cumulativeRank: cumulative.overallRank || 'Chưa có'
                    };

                    safeApply($scope, function () {
                        $scope.grades = grades;
                        $scope.summary = calculatedSummary;
                    });
                }).catch(function (error) {
                    return handleError('Không thể tải thông tin điểm.', error);
                }).finally(function () {
                    setLoading(false);
                });
            }

            return {
                /**
                 * Khởi tạo view-model.
                 * @returns {Promise<void>}
                 */
                init: function () {
                    setLoading(true);
                    return loadStudentProfile()
                        .then(function () {
                            return loadSchoolYears(false);
                        })
                        .then(function () {
                            return loadGrades(false);
                        })
                        .catch(function (error) {
                            throw error;
                        })
                        .finally(function () {
                            setLoading(false);
                        });
                },
                /**
                 * Refresh toàn bộ dữ liệu (năm học và điểm).
                 * Hữu ích khi chuyển học kỳ hoặc cần cập nhật dữ liệu mới nhất.
                 * @returns {Promise<void>}
                 */
                refresh: function () {
                    return $scope.refreshGrades();
                },
                /**
                 * Chỉ refresh điểm (không refresh năm học).
                 * @returns {Promise<void>}
                 */
                refreshGradesOnly: function () {
                    return loadGrades(true);
                }
            };
        };
    }
]);


