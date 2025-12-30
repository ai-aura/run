// 📤 Advanced Export Manager for MessTrack
// Excel, Image, and Email export capabilities

class AdvancedExportManager {
    constructor(messTrackApp) {
        this.app = messTrackApp;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Excel export
        const exportExcelBtn = document.getElementById('exportExcel');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }

        // Image export
        const exportImageBtn = document.getElementById('exportImage');
        if (exportImageBtn) {
            exportImageBtn.addEventListener('click', () => this.exportToImage());
        }

        // Email export
        const emailReportBtn = document.getElementById('emailReport');
        if (emailReportBtn) {
            emailReportBtn.addEventListener('click', () => this.emailReport());
        }

        // Print report
        const printReportBtn = document.getElementById('printReport');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => this.printReport());
        }
    }

    // Export to Excel (XLSX format)
    async exportToExcel() {
        try {
            this.app.showToast('📊 Generating Excel file...');

            const currentMonth = new Date();
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            
            // Prepare data
            const data = this.prepareExcelData(monthKey);
            
            // Create Excel content (CSV format that Excel can open)
            let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
            
            // Header
            csvContent += 'MessTrack - Monthly Attendance Report\n';
            csvContent += `Month: ${currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`;
            csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
            
            // Summary
            csvContent += 'SUMMARY\n';
            csvContent += `Total Days,${data.summary.totalDays}\n`;
            csvContent += `Lunch Attended,${data.summary.lunchCount}\n`;
            csvContent += `Dinner Attended,${data.summary.dinnerCount}\n`;
            csvContent += `Total Meals,${data.summary.totalMeals}\n`;
            csvContent += `Attendance Rate,${data.summary.attendancePercentage}%\n\n`;
            
            // Detailed records
            csvContent += 'DETAILED ATTENDANCE\n';
            csvContent += 'Date,Day,Lunch,Dinner,Both Meals,Notes\n';
            
            data.records.forEach(record => {
                const notes = (record.note || '').replace(/"/g, '""'); // Escape quotes
                csvContent += `${record.date},${record.dayName},${record.lunch},${record.dinner},${record.bothMeals},\"${notes}\"\n`;
            });
            
            // Weekly breakdown
            csvContent += '\nWEEKLY BREAKDOWN\n';
            csvContent += 'Week,Lunch,Dinner,Total Meals\n';
            data.weeklyBreakdown.forEach(week => {
                csvContent += `Week ${week.weekNum},${week.lunch},${week.dinner},${week.total}\n`;
            });
            
            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `MessTrack-${monthKey}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            
            this.app.showToast('✅ Excel file downloaded!');
            
            // Track export
            if (window.undoManager) {
                window.undoManager.recordAction({
                    type: 'export',
                    data: { format: 'excel', month: monthKey }
                });
            }
            
        } catch (error) {
            console.error('Excel export failed:', error);
            this.app.showToast('❌ Failed to export to Excel');
        }
    }

    // Export to Image (PNG)
    async exportToImage() {
        try {
            this.app.showToast('📸 Generating image...');

            // Create a canvas with the summary
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 800;
            const ctx = canvas.getContext('2d');

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get current month data
            const stats = this.getCurrentMonthStats();
            const currentMonth = new Date();
            const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🍽️ MessTrack', canvas.width / 2, 80);

            ctx.font = '32px Arial';
            ctx.fillText(`Attendance Report - ${monthName}`, canvas.width / 2, 130);

            // Stats cards
            const cardY = 200;
            const cardWidth = 250;
            const cardHeight = 150;
            const gap = 40;
            const startX = (canvas.width - (cardWidth * 4 + gap * 3)) / 2;

            // Draw stat cards
            const cards = [
                { icon: '🌞', label: 'Lunch', value: stats.lunchCount, color: '#facc15' },
                { icon: '🌙', label: 'Dinner', value: stats.dinnerCount, color: '#60a5fa' },
                { icon: '📊', label: 'Attendance', value: `${stats.attendancePercentage}%`, color: '#34d399' },
                { icon: '🍽️', label: 'Total Meals', value: stats.totalMeals, color: '#a78bfa' }
            ];

            cards.forEach((card, index) => {
                const x = startX + (cardWidth + gap) * index;
                
                // Card background
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x, cardY, cardWidth, cardHeight);
                
                // Card border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, cardY, cardWidth, cardHeight);
                
                // Icon
                ctx.font = '48px Arial';
                ctx.fillText(card.icon, x + cardWidth / 2, cardY + 60);
                
                // Value
                ctx.fillStyle = card.color;
                ctx.font = 'bold 42px Arial';
                ctx.fillText(card.value, x + cardWidth / 2, cardY + 110);
                
                // Label
                ctx.fillStyle = '#ffffff';
                ctx.font = '18px Arial';
                ctx.fillText(card.label, x + cardWidth / 2, cardY + 135);
            });

            // Additional info
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            
            const infoY = 420;
            const infoX = 100;
            
            ctx.fillText(`📅 Total Days: ${stats.totalDays}`, infoX, infoY);
            ctx.fillText(`✅ Both Meals: ${stats.bothMealsCount} days`, infoX, infoY + 40);
            ctx.fillText(`🔥 Current Streak: ${stats.currentStreak} days`, infoX, infoY + 80);
            ctx.fillText(`🏆 Longest Streak: ${stats.longestStreak} days`, infoX, infoY + 120);
            
            ctx.textAlign = 'right';
            ctx.fillText(`🌞 Only Lunch: ${stats.onlyLunchCount} days`, canvas.width - infoX, infoY);
            ctx.fillText(`🌙 Only Dinner: ${stats.onlyDinnerCount} days`, canvas.width - infoX, infoY + 40);
            ctx.fillText(`❌ Skipped: ${stats.skippedBothCount} days`, canvas.width - infoX, infoY + 80);
            ctx.fillText(`📈 Lunch Rate: ${stats.lunchPercentage}%`, canvas.width - infoX, infoY + 120);

            // Footer
            ctx.textAlign = 'center';
            ctx.font = '16px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, canvas.width / 2, 720);
            ctx.fillText('MessTrack - Your Mess Attendance Manager', canvas.width / 2, 750);

            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `MessTrack-Report-${new Date().toISOString().split('T')[0]}.png`;
                link.click();
                URL.revokeObjectURL(url);
                
                this.app.showToast('✅ Image downloaded!');
            }, 'image/png');

        } catch (error) {
            console.error('Image export failed:', error);
            this.app.showToast('❌ Failed to export image');
        }
    }

    // Email report
    emailReport() {
        try {
            const stats = this.getCurrentMonthStats();
            const currentMonth = new Date();
            const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Create email body
            const subject = `MessTrack Report - ${monthName}`;
            const body = `
Hi,

Here's my mess attendance report for ${monthName}:

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Days: ${stats.totalDays}
• Lunch Attended: ${stats.lunchCount} (${stats.lunchPercentage}%)
• Dinner Attended: ${stats.dinnerCount} (${stats.dinnerPercentage}%)
• Total Meals: ${stats.totalMeals}
• Overall Attendance: ${stats.attendancePercentage}%

📈 BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Both Meals: ${stats.bothMealsCount} days
• Only Lunch: ${stats.onlyLunchCount} days
• Only Dinner: ${stats.onlyDinnerCount} days
• Skipped Both: ${stats.skippedBothCount} days

🔥 STREAKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Current Streak: ${stats.currentStreak} days
• Longest Streak: ${stats.longestStreak} days

Generated by MessTrack on ${new Date().toLocaleDateString()}

Best regards
            `.trim();

            // Open email client
            const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;

            this.app.showToast('📧 Email client opened!');

        } catch (error) {
            console.error('Email report failed:', error);
            this.app.showToast('❌ Failed to open email client');
        }
    }

    // Print report
    printReport() {
        try {
            const stats = this.getCurrentMonthStats();
            const currentMonth = new Date();
            const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Create print window
            const printWindow = window.open('', '_blank');
            
            const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>MessTrack Report - ${monthName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 32px;
            color: #667eea;
            margin-bottom: 10px;
        }
        .header h2 {
            font-size: 20px;
            color: #666;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-card .icon {
            font-size: 36px;
            margin-bottom: 10px;
        }
        .stat-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        .stat-card .label {
            font-size: 14px;
            color: #666;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h3 {
            font-size: 20px;
            color: #667eea;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: #f9fafb;
            border-radius: 4px;
        }
        .info-item .label {
            font-weight: 600;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        @media print {
            body {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ MessTrack</h1>
        <h2>Monthly Attendance Report</h2>
        <p>${monthName}</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="icon">🌞</div>
            <div class="value">${stats.lunchCount}</div>
            <div class="label">Lunch</div>
        </div>
        <div class="stat-card">
            <div class="icon">🌙</div>
            <div class="value">${stats.dinnerCount}</div>
            <div class="label">Dinner</div>
        </div>
        <div class="stat-card">
            <div class="icon">📊</div>
            <div class="value">${stats.attendancePercentage}%</div>
            <div class="label">Attendance</div>
        </div>
        <div class="stat-card">
            <div class="icon">🍽️</div>
            <div class="value">${stats.totalMeals}</div>
            <div class="label">Total Meals</div>
        </div>
    </div>

    <div class="section">
        <h3>📈 Detailed Breakdown</h3>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Total Days:</span>
                <span>${stats.totalDays}</span>
            </div>
            <div class="info-item">
                <span class="label">Both Meals:</span>
                <span>${stats.bothMealsCount} days</span>
            </div>
            <div class="info-item">
                <span class="label">Only Lunch:</span>
                <span>${stats.onlyLunchCount} days</span>
            </div>
            <div class="info-item">
                <span class="label">Only Dinner:</span>
                <span>${stats.onlyDinnerCount} days</span>
            </div>
            <div class="info-item">
                <span class="label">Skipped Both:</span>
                <span>${stats.skippedBothCount} days</span>
            </div>
            <div class="info-item">
                <span class="label">Lunch Rate:</span>
                <span>${stats.lunchPercentage}%</span>
            </div>
            <div class="info-item">
                <span class="label">Dinner Rate:</span>
                <span>${stats.dinnerPercentage}%</span>
            </div>
            <div class="info-item">
                <span class="label">Overall Rate:</span>
                <span>${stats.attendancePercentage}%</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>🔥 Streaks</h3>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Current Streak:</span>
                <span>${stats.currentStreak} days</span>
            </div>
            <div class="info-item">
                <span class="label">Longest Streak:</span>
                <span>${stats.longestStreak} days</span>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>MessTrack - Your Mess Attendance Manager</p>
    </div>
</body>
</html>
            `;

            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Wait for content to load then print
            printWindow.onload = () => {
                printWindow.print();
            };

            this.app.showToast('🖨️ Print dialog opened!');

        } catch (error) {
            console.error('Print failed:', error);
            this.app.showToast('❌ Failed to print report');
        }
    }

    // Prepare Excel data
    prepareExcelData(monthKey) {
        const attendance = this.app.data.attendance;
        const notes = this.app.data.notes;
        
        const records = [];
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.keys(attendance)
            .filter(date => date.startsWith(monthKey))
            .sort()
            .forEach(date => {
                const day = attendance[date];
                const dateObj = new Date(date);
                
                totalDays++;
                if (day.lunch) lunchCount++;
                if (day.dinner) dinnerCount++;

                records.push({
                    date,
                    dayName: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                    lunch: day.lunch ? 'Yes' : 'No',
                    dinner: day.dinner ? 'Yes' : 'No',
                    bothMeals: (day.lunch && day.dinner) ? 'Yes' : 'No',
                    note: notes[date]?.note || ''
                });
            });

        const totalMeals = lunchCount + dinnerCount;
        const totalPossible = totalDays * 2;
        const attendancePercentage = totalPossible > 0 
            ? ((totalMeals / totalPossible) * 100).toFixed(1)
            : 0;

        // Weekly breakdown
        const weeklyBreakdown = this.calculateWeeklyBreakdown(records, attendance);

        return {
            summary: {
                totalDays,
                lunchCount,
                dinnerCount,
                totalMeals,
                attendancePercentage
            },
            records,
            weeklyBreakdown
        };
    }

    // Calculate weekly breakdown
    calculateWeeklyBreakdown(records, attendance) {
        const weeks = {};
        
        records.forEach(record => {
            const dateObj = new Date(record.date);
            const weekNum = this.getWeekNumber(dateObj);
            
            if (!weeks[weekNum]) {
                weeks[weekNum] = { weekNum, lunch: 0, dinner: 0, total: 0 };
            }
            
            const day = attendance[record.date];
            if (day.lunch) weeks[weekNum].lunch++;
            if (day.dinner) weeks[weekNum].dinner++;
            weeks[weekNum].total = weeks[weekNum].lunch + weeks[weekNum].dinner;
        });
        
        return Object.values(weeks);
    }

    // Get current month stats
    getCurrentMonthStats() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const attendance = this.app.data.attendance;
        
        const stats = {
            totalDays: 0,
            lunchCount: 0,
            dinnerCount: 0,
            bothMealsCount: 0,
            onlyLunchCount: 0,
            onlyDinnerCount: 0,
            skippedBothCount: 0,
            currentStreak: 0,
            longestStreak: 0
        };

        const dates = Object.keys(attendance)
            .filter(date => date.startsWith(monthKey))
            .sort();

        stats.totalDays = dates.length;

        dates.forEach(date => {
            const day = attendance[date];
            if (day.lunch) stats.lunchCount++;
            if (day.dinner) stats.dinnerCount++;
            
            if (day.lunch && day.dinner) stats.bothMealsCount++;
            else if (day.lunch) stats.onlyLunchCount++;
            else if (day.dinner) stats.onlyDinnerCount++;
            else stats.skippedBothCount++;
        });

        stats.totalMeals = stats.lunchCount + stats.dinnerCount;
        stats.totalPossibleMeals = stats.totalDays * 2;
        stats.attendancePercentage = stats.totalPossibleMeals > 0 
            ? ((stats.totalMeals / stats.totalPossibleMeals) * 100).toFixed(1)
            : 0;
        stats.lunchPercentage = stats.totalDays > 0 
            ? ((stats.lunchCount / stats.totalDays) * 100).toFixed(1)
            : 0;
        stats.dinnerPercentage = stats.totalDays > 0 
            ? ((stats.dinnerCount / stats.totalDays) * 100).toFixed(1)
            : 0;

        // Calculate streaks
        stats.currentStreak = this.calculateCurrentStreak(dates, attendance);
        stats.longestStreak = this.calculateLongestStreak(dates, attendance);

        return stats;
    }

    // Calculate current streak
    calculateCurrentStreak(dates, attendance) {
        let streak = 0;
        const sortedDates = [...dates].sort().reverse();
        
        for (const date of sortedDates) {
            const day = attendance[date];
            if (day.lunch || day.dinner) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    // Calculate longest streak
    calculateLongestStreak(dates, attendance) {
        let maxStreak = 0;
        let currentStreak = 0;
        
        const sortedDates = [...dates].sort();
        
        sortedDates.forEach(date => {
            const day = attendance[date];
            if (day.lunch || day.dinner) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });
        
        return maxStreak;
    }

    // Get week number
    getWeekNumber(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const days = Math.floor((date - firstDay) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + 1) / 7);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.messTrack) {
            window.advancedExportManager = new AdvancedExportManager(window.messTrack);
            console.log('✅ Advanced Export Manager initialized');
        }
    }, 1000);
});
