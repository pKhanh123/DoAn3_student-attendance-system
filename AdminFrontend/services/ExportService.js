// Export Service - Handle Excel/CSV/PDF exports
app.service('ExportService', ['$window', function($window) {
    
    /**
     * Export to CSV
     */
    this.exportToCSV = function(data, filename, columns) {
        if (!data || data.length === 0) {
            alert('Không có dữ liệu để xuất');
            return;
        }
        
        // Build CSV header
        var headers = columns.map(function(col) { return col.label; });
        var csvContent = headers.join(',') + '\n';
        
        // Build CSV rows
        data.forEach(function(item) {
            var row = columns.map(function(col) {
                var value = col.field.split('.').reduce(function(obj, key) {
                    return obj ? obj[key] : '';
                }, item);
                
                // Escape commas and quotes
                if (value === null || value === undefined) value = '';
                value = String(value).replace(/"/g, '""');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = '"' + value + '"';
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        });
        
        // Download file
        this.downloadFile(csvContent, filename + '.csv', 'text/csv;charset=utf-8;');
    };
    
    /**
     * Export to Excel (Professional with HTML styling - works with borders & colors)
     */
    this.exportToExcel = function(data, filename, columns, options) {
        if (!data || data.length === 0) {
            alert('Không có dữ liệu để xuất');
            return;
        }
        
        options = options || {};
        
        // ========================================
        // Build HTML Excel with Styling
        // ========================================
        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        html += '<head>';
        html += '<meta charset="UTF-8">';
        html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        html += '<x:Name>' + (options.sheetName || 'Data') + '</x:Name>';
        html += '<x:WorksheetOptions><x:DisplayGridlines/><x:FrozenNoSplit/><x:SplitHorizontal>1</x:SplitHorizontal><x:TopRowBottomPane>1</x:TopRowBottomPane></x:WorksheetOptions>';
        html += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
        html += '<style>';
        html += 'table { border-collapse: collapse; width: 100%; font-family: "Calibri", "Arial", sans-serif; }';
        html += 'td, th { border: 1px solid #000; padding: 8px; }';
        html += '.title { font-size: 16pt; font-weight: bold; text-align: center; background-color: #E7E6E6; color: #1F4E78; padding: 12px; }';
        html += '.info-row { font-size: 10pt; background-color: #F8F9FA; }';
        html += '.info-label { font-weight: bold; text-align: right; padding-right: 10px; }';
        html += '.header { font-weight: bold; background-color: #4472C4; color: white; text-align: center; font-size: 11pt; padding: 10px; border: 2px solid #000; }';
        html += '.header-required { font-weight: bold; background-color: #DC143C; color: white; text-align: center; font-size: 11pt; padding: 10px; border: 2px solid #000; }';
        html += '.data-row-even { background-color: #FFFFFF; }';
        html += '.data-row-odd { background-color: #F2F2F2; }';
        html += '.data-cell { border: 1px solid #D0D0D0; padding: 6px; }';
        html += '.number-cell { text-align: right; }';
        html += '.text-cell { text-align: left; }';
        html += '.center-cell { text-align: center; }';
        html += '.summary-row { background-color: #FFF2CC; font-weight: bold; }';
        html += '.summary-label { text-align: right; padding-right: 15px; }';
        html += '</style>';
        html += '</head><body>';
        html += '<table>';
        
        // Title row
        if (options.title) {
            html += '<tr><td colspan="' + columns.length + '" class="title">' + options.title + '</td></tr>';
            html += '<tr><td colspan="' + columns.length + '"></td></tr>'; // Empty row
        }
        
        // Info rows
        if (options.info && options.info.length > 0) {
            options.info.forEach(function(infoRow) {
                html += '<tr class="info-row">';
                html += '<td class="info-label">' + (infoRow[0] || '') + '</td>';
                html += '<td colspan="' + (columns.length - 1) + '">' + (infoRow[1] || '') + '</td>';
                html += '</tr>';
            });
            html += '<tr><td colspan="' + columns.length + '"></td></tr>'; // Empty row
        }
        
        // Header row
        html += '<tr>';
        columns.forEach(function(col) {
            var headerClass = col.required ? 'header-required' : 'header';
            html += '<th class="' + headerClass + '">' + col.label + '</th>';
        });
        html += '</tr>';
        
        // Data rows
        data.forEach(function(item, index) {
            var rowClass = index % 2 === 0 ? 'data-row-even' : 'data-row-odd';
            html += '<tr class="' + rowClass + '">';
            
            columns.forEach(function(col) {
                var value = col.field.split('.').reduce(function(obj, key) {
                    return obj ? obj[key] : '';
                }, item);
                
                // Format dates
                if (col.type === 'date' && value) {
                    try {
                        var date = new Date(value);
                        value = date.toLocaleDateString('vi-VN');
                    } catch(e) {}
                }
                
                // Determine cell class
                var cellClass = 'data-cell ';
                if (col.type === 'number') {
                    cellClass += 'number-cell';
                } else if (col.align === 'center') {
                    cellClass += 'center-cell';
                } else {
                    cellClass += 'text-cell';
                }
                
                html += '<td class="' + cellClass + '">' + (value || '') + '</td>';
            });
            html += '</tr>';
        });
        
        // Summary rows
        if (options.showSummary) {
            html += '<tr><td colspan="' + columns.length + '"></td></tr>'; // Empty row
            html += '<tr class="summary-row">';
            html += '<td class="summary-label">Tổng số bản ghi:</td>';
            html += '<td colspan="' + (columns.length - 1) + '">' + data.length + '</td>';
            html += '</tr>';
            html += '<tr class="summary-row">';
            html += '<td class="summary-label">Ngày xuất:</td>';
            html += '<td colspan="' + (columns.length - 1) + '">' + new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN') + '</td>';
            html += '</tr>';
        }
        
        html += '</table></body></html>';
        
        // ========================================
        // Download file
        // ========================================
        var today = new Date();
        var dateStr = today.getFullYear() + 
                     ('0' + (today.getMonth() + 1)).slice(-2) + 
                     ('0' + today.getDate()).slice(-2) +
                     '_' +
                     ('0' + today.getHours()).slice(-2) +
                     ('0' + today.getMinutes()).slice(-2);
        
        this.downloadFile(html, filename + '_' + dateStr + '.xls', 'application/vnd.ms-excel');
    };
    
    /**
     * Download file helper
     */
    this.downloadFile = function(content, filename, mimeType) {
        var blob = new Blob(['\ufeff' + content], { type: mimeType });
        var link = document.createElement('a');
        
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    /**
     * Print table as PDF (using browser print)
     */
    this.printToPDF = function(title, data, columns) {
        var printWindow = $window.open('', '_blank');
        var html = this.buildPrintableHTML(title, data, columns);
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(function() {
            printWindow.print();
            printWindow.close();
        }, 250);
    };
    
    /**
     * Build printable HTML
     */
    this.buildPrintableHTML = function(title, data, columns) {
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
        html += '<title>' + title + '</title>';
        html += '<style>';
        html += 'body { font-family: Arial, sans-serif; margin: 20px; }';
        html += 'h1 { text-align: center; margin-bottom: 20px; }';
        html += 'table { width: 100%; border-collapse: collapse; }';
        html += 'th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }';
        html += 'th { background-color: #4CAF50; color: white; }';
        html += 'tr:nth-child(even) { background-color: #f2f2f2; }';
        html += '@media print { body { margin: 0; } }';
        html += '</style></head><body>';
        html += '<h1>' + title + '</h1>';
        html += '<table>';
        
        // Header
        html += '<thead><tr>';
        columns.forEach(function(col) {
            html += '<th>' + col.label + '</th>';
        });
        html += '</tr></thead>';
        
        // Data
        html += '<tbody>';
        data.forEach(function(item) {
            html += '<tr>';
            columns.forEach(function(col) {
                var value = col.field.split('.').reduce(function(obj, key) {
                    return obj ? obj[key] : '';
                }, item);
                html += '<td>' + (value || '') + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody>';
        
        html += '</table></body></html>';
        return html;
    };
}]);

