// File Upload Directive for Import
app.directive('fileUpload', function() {
    return {
        restrict: 'E',
        scope: {
            onFileSelect: '&',
            accept: '@',
            multiple: '@'
        },
        template: 
            '<div class="file-upload-container">' +
                '<div class="file-upload-dropzone" ' +
                     'ng-class="{\'drag-over\': isDragOver}" ' +
                     'ng-click="triggerFileInput()">' +
                    '<input type="file" ' +
                           'id="fileInput" ' +
                           'accept="{{accept}}" ' +
                           'ng-attr-multiple="{{multiple ? \'multiple\' : undefined}}" ' +
                           'style="display:none">' +
                    '<div class="upload-icon">' +
                        '<i class="fas fa-cloud-upload-alt"></i>' +
                    '</div>' +
                    '<div class="upload-text">' +
                        '<p class="upload-title">Kéo thả file vào đây hoặc click để chọn</p>' +
                        '<p class="upload-subtitle">Hỗ trợ: Excel (.xlsx, .xls), CSV</p>' +
                    '</div>' +
                '</div>' +
                '<div ng-if="selectedFiles.length > 0" class="selected-files">' +
                    '<div class="file-item" ng-repeat="file in selectedFiles">' +
                        '<i class="fas fa-file-excel"></i>' +
                        '<span class="file-name">{{file.name}}</span>' +
                        '<span class="file-size">({{formatFileSize(file.size)}})</span>' +
                        '<button class="btn-remove" ng-click="removeFile($index)">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>',
        link: function(scope, element) {
            scope.selectedFiles = [];
            scope.isDragOver = false;
            
            var fileInput = element.find('#fileInput')[0];
            var dropzone = element.find('.file-upload-dropzone')[0];
            
            // Trigger file input
            scope.triggerFileInput = function() {
                fileInput.click();
            };
            
            // File input change
            fileInput.addEventListener('change', function(e) {
                handleFiles(e.target.files);
            });
            
            // Drag & drop events
            dropzone.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                scope.$evalAsync(function() {
                    scope.isDragOver = true;
                });
            });
            
            dropzone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                scope.$evalAsync(function() {
                    scope.isDragOver = false;
                });
            });
            
            dropzone.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                scope.$evalAsync(function() {
                    scope.isDragOver = false;
                    handleFiles(e.dataTransfer.files);
                });
            });
            
            // Handle selected files
            function handleFiles(files) {
                scope.$evalAsync(function() {
                    scope.selectedFiles = Array.from(files);
                    scope.onFileSelect({ files: scope.selectedFiles });
                });
            }
            
            // Remove file
            scope.removeFile = function(index) {
                scope.selectedFiles.splice(index, 1);
                fileInput.value = '';
                if (scope.selectedFiles.length > 0) {
                    scope.onFileSelect({ files: scope.selectedFiles });
                } else {
                    scope.onFileSelect({ files: [] });
                }
            };
            
            // Format file size
            scope.formatFileSize = function(bytes) {
                if (bytes === 0) return '0 Bytes';
                var k = 1024;
                var sizes = ['Bytes', 'KB', 'MB', 'GB'];
                var i = Math.floor(Math.log(bytes) / Math.log(k));
                return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
            };
        }
    };
});

