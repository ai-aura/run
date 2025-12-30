// 📊 Statistics Manager for MessTrack
// Comprehensive analytics and insights with visual charts

class StatisticsManager {
    constructor(messTrackApp) {
        this.app = messTrackApp;
        this.currentMonth = new Date();
        this.chartColors = {
            lunch: '#facc15', // yellow-400
            dinner: '#60a5fa', // blue-400
            both: '#34d399', // green-400
            skipped: '#f87171', // red-400
            primary: '#6366f1', // indigo-500
            success: '#22c55e', // green-500
            warning: '#f59e0b', // amber-500
            danger: '#ef4444' // red-500
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Month navigation for stats
        const prevMonthStats = document.getElementById('prevMonthStats');
        const nextMonthStats = document.getElementById('nextMonthStats');
        
        if (prevMonthStats) {
            prevMonthStats.addEventListener('click', () => {
                this.changeStatsMonth(-1);
            });
        }
        
        if (nextMonthStats) {
            nextMonthStats.addEventListener('click', () => {
                this.changeStatsMonth(1);
            });
        }
    }

    // Change stats month
    changeStatsMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.updateStatistics();
    }

    // Update all statistics
    updateStatistics() {
        const stats = this.calculateMonthlyStats();
        this.updateStatsUI(stats);
        this.renderCharts(stats);
        this.showInsights(stats);
    }

    // Calculate comprehensive monthly statistics
    calculateMonthlyStats() {
        const monthKey = `${this.currentMonth.getFullYear()}-${String(this.currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const attendance = this.app.data.attendance;
        
        const stats = {
            monthKey,
            monthName: this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            totalDays: 0,
            lunchCount: 0,
            dinnerCount: 0,
            bothMealsCount: 0,
            onlyLunchCount: 0,
            onlyDinnerCount: 0,
            skippedBothCount: 0,
            totalMealsAttended: 0,
            totalPossibleMeals: 0,
            attendancePercentage: 0,
            lunchPercentage: 0,
            dinnerPercentage: 0,
            currentStreak: 0,
            longestStreak: 0,
            weekdayStats: {},
            weekStats: [],
            dailyPattern: [],
            comparisonWithLastMonth: {},
            predictions: {}
        };

        // Get all dates for the month
        const dates = Object.keys(attendance)
            .filter(date => date.startsWith(monthKey))
            .sort();

        stats.totalDays = dates.length;

        // Calculate basic stats
        dates.forEach(date => {
            const day = attendance[date];
            const hasLunch = day.lunch === true;
            const hasDinner = day.dinner === true;

            if (hasLunch) stats.lunchCount++;
            if (hasDinner) stats.dinnerCount++;
            
            if (hasLunch && hasDinner) {
                stats.bothMealsCount++;
            } else if (hasLunch) {
                stats.onlyLunchCount++;
            } else if (hasDinner) {
                stats.onlyDinnerCount++;
            } else {
                stats.skippedBothCount++;
            }

            // Weekday analysis
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            
            if (!stats.weekdayStats[dayName]) {
                stats.weekdayStats[dayName] = {
                    lunch: 0,
                    dinner: 0,
                    total: 0
                };
            }
            
            if (hasLunch) stats.weekdayStats[dayName].lunch++;
            if (hasDinner) stats.weekdayStats[dayName].dinner++;
            stats.weekdayStats[dayName].total++;
        });

        // Calculate totals
        stats.totalMealsAttended = stats.lunchCount + stats.dinnerCount;
        stats.totalPossibleMeals = stats.totalDays * 2;
        stats.attendancePercentage = stats.totalPossibleMeals > 0 
            ? ((stats.totalMealsAttended / stats.totalPossibleMeals) * 100).toFixed(1)
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

        // Weekly breakdown
        stats.weekStats = this.calculateWeeklyBreakdown(dates, attendance);

        // Daily pattern (for chart)
        stats.dailyPattern = this.calculateDailyPattern(dates, attendance);

        // Comparison with last month
        stats.comparisonWithLastMonth = this.compareWithLastMonth(stats);

        // Predictions
        stats.predictions = this.generatePredictions(stats);

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

    // Calculate weekly breakdown
    calculateWeeklyBreakdown(dates, attendance) {
        const weeks = {};
        
        dates.forEach(date => {
            const dateObj = new Date(date);
            const weekNum = this.getWeekNumber(dateObj);
            
            if (!weeks[weekNum]) {
                weeks[weekNum] = {
                    weekNum,
                    lunch: 0,
                    dinner: 0,
                    total: 0,
                    dates: []
                };
            }
            
            const day = attendance[date];
            if (day.lunch) weeks[weekNum].lunch++;
            if (day.dinner) weeks[weekNum].dinner++;
            weeks[weekNum].total++;
            weeks[weekNum].dates.push(date);
        });
        
        return Object.values(weeks);
    }

    // Calculate daily pattern
    calculateDailyPattern(dates, attendance) {
        return dates.map(date => {
            const day = attendance[date];
            return {
                date,
                dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                lunch: day.lunch ? 1 : 0,
                dinner: day.dinner ? 1 : 0,
                total: (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0)
            };
        });
    }

    // Compare with last month
    compareWithLastMonth(currentStats) {
        const lastMonth = new Date(this.currentMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        
        const lastMonthDates = Object.keys(this.app.data.attendance)
            .filter(date => date.startsWith(lastMonthKey));
        
        if (lastMonthDates.length === 0) {
            return { available: false };
        }

        let lastLunchCount = 0;
        let lastDinnerCount = 0;
        
        lastMonthDates.forEach(date => {
            const day = this.app.data.attendance[date];
            if (day.lunch) lastLunchCount++;
            if (day.dinner) lastDinnerCount++;
        });

        const lastTotalMeals = lastLunchCount + lastDinnerCount;
        const lastTotalPossible = lastMonthDates.length * 2;
        const lastPercentage = lastTotalPossible > 0 
            ? ((lastTotalMeals / lastTotalPossible) * 100).toFixed(1)
            : 0;

        return {
            available: true,
            lunchDiff: currentStats.lunchCount - lastLunchCount,
            dinnerDiff: currentStats.dinnerCount - lastDinnerCount,
            percentageDiff: (currentStats.attendancePercentage - lastPercentage).toFixed(1),
            improved: currentStats.attendancePercentage > lastPercentage
        };
    }

    // Generate predictions
    generatePredictions(stats) {
        const daysInMonth = new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth() + 1,
            0
        ).getDate();
        
        const daysRemaining = daysInMonth - stats.totalDays;
        
        if (daysRemaining <= 0) {
            return { available: false };
        }

        const avgMealsPerDay = stats.totalDays > 0 
            ? stats.totalMealsAttended / stats.totalDays
            : 0;
        
        const predictedTotalMeals = stats.totalMealsAttended + (avgMealsPerDay * daysRemaining);
        const predictedPercentage = ((predictedTotalMeals / (daysInMonth * 2)) * 100).toFixed(1);

        return {
            available: true,
            daysRemaining,
            predictedTotalMeals: Math.round(predictedTotalMeals),
            predictedPercentage,
            onTrackFor: predictedPercentage >= 75 ? 'excellent' : predictedPercentage >= 50 ? 'good' : 'needs improvement'
        };
    }

    // Update stats UI
    updateStatsUI(stats) {
        // Update month display
        const monthDisplay = document.getElementById('statsMonthDisplay');
        if (monthDisplay) {
            monthDisplay.textContent = stats.monthName;
        }

        // Update main stats cards
        document.getElementById('statsLunchCount').textContent = stats.lunchCount;
        document.getElementById('statsDinnerCount').textContent = stats.dinnerCount;
        document.getElementById('statsAttendancePercentage').textContent = `${stats.attendancePercentage}%`;
        document.getElementById('statsTotalMeals').textContent = stats.totalMealsAttended;

        // Update additional metrics
        document.getElementById('statsBothMeals').textContent = stats.bothMealsCount;
        document.getElementById('statsCurrentStreak').textContent = `${stats.currentStreak} days`;
        document.getElementById('statsLongestStreak').textContent = `${stats.longestStreak} days`;
        document.getElementById('statsSkippedDays').textContent = stats.skippedBothCount;
    }

    // Render charts
    renderCharts(stats) {
        this.renderMealDistributionChart(stats);
        this.renderWeeklyTrendChart(stats);
        this.renderWeekdayPatternChart(stats);
        this.renderDailyHeatmap(stats);
    }

    // Render meal distribution pie chart
    renderMealDistributionChart(stats) {
        const canvas = document.getElementById('mealDistributionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = [
            { label: 'Both Meals', value: stats.bothMealsCount, color: this.chartColors.both },
            { label: 'Only Lunch', value: stats.onlyLunchCount, color: this.chartColors.lunch },
            { label: 'Only Dinner', value: stats.onlyDinnerCount, color: this.chartColors.dinner },
            { label: 'Skipped Both', value: stats.skippedBothCount, color: this.chartColors.skipped }
        ];

        this.drawPieChart(ctx, data, canvas.width, canvas.height);
    }

    // Render weekly trend line chart
    renderWeeklyTrendChart(stats) {
        const canvas = document.getElementById('weeklyTrendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.drawLineChart(ctx, stats.weekStats, canvas.width, canvas.height);
    }

    // Render weekday pattern bar chart
    renderWeekdayPatternChart(stats) {
        const canvas = document.getElementById('weekdayPatternChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const data = weekdays.map(day => ({
            day,
            lunch: stats.weekdayStats[day]?.lunch || 0,
            dinner: stats.weekdayStats[day]?.dinner || 0
        }));

        this.drawBarChart(ctx, data, canvas.width, canvas.height);
    }

    // Render daily heatmap
    renderDailyHeatmap(stats) {
        const container = document.getElementById('dailyHeatmap');
        if (!container) return;

        container.innerHTML = '';
        
        stats.dailyPattern.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.title = `${day.date}: ${day.total} meal(s)`;
            
            // Color based on meals attended
            let bgColor = 'rgba(239, 68, 68, 0.2)'; // red for 0
            if (day.total === 1) bgColor = 'rgba(251, 191, 36, 0.4)'; // amber for 1
            if (day.total === 2) bgColor = 'rgba(34, 197, 94, 0.6)'; // green for 2
            
            cell.style.cssText = `
                width: 30px;
                height: 30px;
                background: ${bgColor};
                border-radius: 4px;
                display: inline-block;
                margin: 2px;
                cursor: pointer;
                transition: transform 0.2s;
            `;
            
            cell.addEventListener('mouseenter', () => {
                cell.style.transform = 'scale(1.2)';
            });
            
            cell.addEventListener('mouseleave', () => {
                cell.style.transform = 'scale(1)';
            });
            
            container.appendChild(cell);
        });
    }

    // Show insights
    showInsights(stats) {
        const container = document.getElementById('statsInsights');
        if (!container) return;

        const insights = [];

        // Attendance insights
        if (stats.attendancePercentage >= 90) {
            insights.push({
                icon: '🏆',
                title: 'Excellent Attendance!',
                description: `You've attended ${stats.attendancePercentage}% of meals this month. Keep it up!`,
                type: 'success'
            });
        } else if (stats.attendancePercentage >= 75) {
            insights.push({
                icon: '👍',
                title: 'Good Attendance',
                description: `${stats.attendancePercentage}% attendance rate. You're doing well!`,
                type: 'success'
            });
        } else if (stats.attendancePercentage >= 50) {
            insights.push({
                icon: '📈',
                title: 'Room for Improvement',
                description: `${stats.attendancePercentage}% attendance. Try to attend more regularly.`,
                type: 'warning'
            });
        } else {
            insights.push({
                icon: '⚠️',
                title: 'Low Attendance',
                description: `Only ${stats.attendancePercentage}% attendance this month. Consider attending more meals.`,
                type: 'danger'
            });
        }

        // Streak insights
        if (stats.currentStreak >= 7) {
            insights.push({
                icon: '🔥',
                title: `${stats.currentStreak}-Day Streak!`,
                description: 'Amazing consistency! Keep the streak going.',
                type: 'success'
            });
        }

        // Meal preference insights
        const lunchPref = stats.lunchPercentage;
        const dinnerPref = stats.dinnerPercentage;
        
        if (Math.abs(lunchPref - dinnerPref) > 20) {
            const preferred = lunchPref > dinnerPref ? 'lunch' : 'dinner';
            const other = preferred === 'lunch' ? 'dinner' : 'lunch';
            insights.push({
                icon: '🍽️',
                title: `${this.capitalize(preferred)} Preference`,
                description: `You attend ${preferred} ${preferred === 'lunch' ? lunchPref : dinnerPref}% of the time vs ${other} ${preferred === 'lunch' ? dinnerPref : lunchPref}%.`,
                type: 'info'
            });
        }

        // Comparison insights
        if (stats.comparisonWithLastMonth.available) {
            const comp = stats.comparisonWithLastMonth;
            if (comp.improved) {
                insights.push({
                    icon: '📊',
                    title: 'Improved from Last Month!',
                    description: `Your attendance increased by ${comp.percentageDiff}% compared to last month.`,
                    type: 'success'
                });
            } else if (comp.percentageDiff < -5) {
                insights.push({
                    icon: '📉',
                    title: 'Attendance Decreased',
                    description: `Your attendance dropped by ${Math.abs(comp.percentageDiff)}% from last month.`,
                    type: 'warning'
                });
            }
        }

        // Prediction insights
        if (stats.predictions.available) {
            const pred = stats.predictions;
            insights.push({
                icon: '🔮',
                title: 'Month-End Prediction',
                description: `Based on current trends, you're on track for ${pred.predictedPercentage}% attendance by month-end (${pred.daysRemaining} days remaining).`,
                type: pred.onTrackFor === 'excellent' ? 'success' : pred.onTrackFor === 'good' ? 'info' : 'warning'
            });
        }

        // Render insights
        container.innerHTML = insights.map(insight => `
            <div class="glass p-4 rounded-lg mb-3 insight-${insight.type}">
                <div class="flex items-start gap-3">
                    <div class="text-2xl">${insight.icon}</div>
                    <div class="flex-1">
                        <div class="font-bold mb-1">${insight.title}</div>
                        <div class="text-sm opacity-80">${insight.description}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Draw pie chart
    drawPieChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;

        ctx.clearRect(0, 0, width, height);

        data.forEach(item => {
            if (item.value === 0) return;
            
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.value, labelX, labelY);
            
            currentAngle += sliceAngle;
        });

        // Draw legend
        let legendY = 10;
        data.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(10, legendY, 15, 15);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.label}: ${item.value}`, 30, legendY + 12);
            
            legendY += 25;
        });
    }

    // Draw line chart
    drawLineChart(ctx, weekStats, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        if (weekStats.length === 0) return;

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const maxValue = Math.max(...weekStats.map(w => w.lunch + w.dinner));
        const xStep = chartWidth / (weekStats.length - 1 || 1);

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw lunch line
        ctx.strokeStyle = this.chartColors.lunch;
        ctx.lineWidth = 2;
        ctx.beginPath();
        weekStats.forEach((week, index) => {
            const x = padding + index * xStep;
            const y = height - padding - (week.lunch / maxValue) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw dinner line
        ctx.strokeStyle = this.chartColors.dinner;
        ctx.beginPath();
        weekStats.forEach((week, index) => {
            const x = padding + index * xStep;
            const y = height - padding - (week.dinner / maxValue) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw legend
        ctx.fillStyle = this.chartColors.lunch;
        ctx.fillRect(10, 10, 15, 15);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.fillText('Lunch', 30, 22);

        ctx.fillStyle = this.chartColors.dinner;
        ctx.fillRect(10, 35, 15, 15);
        ctx.fillText('Dinner', 30, 47);
    }

    // Draw bar chart
    drawBarChart(ctx, data, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const barWidth = chartWidth / (data.length * 2.5);
        const maxValue = Math.max(...data.map(d => Math.max(d.lunch, d.dinner)));

        data.forEach((day, index) => {
            const x = padding + index * (barWidth * 2.5);
            
            // Lunch bar
            const lunchHeight = (day.lunch / maxValue) * chartHeight;
            ctx.fillStyle = this.chartColors.lunch;
            ctx.fillRect(x, height - padding - lunchHeight, barWidth, lunchHeight);
            
            // Dinner bar
            const dinnerHeight = (day.dinner / maxValue) * chartHeight;
            ctx.fillStyle = this.chartColors.dinner;
            ctx.fillRect(x + barWidth, height - padding - dinnerHeight, barWidth, dinnerHeight);
            
            // Day label
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(day.day.substr(0, 3), x + barWidth, height - padding + 15);
        });
    }

    // Get week number
    getWeekNumber(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const days = Math.floor((date - firstDay) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + 1) / 7);
    }

    // Utility function
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.messTrack) {
            window.statisticsManager = new StatisticsManager(window.messTrack);
            console.log('✅ Statistics Manager initialized');
        }
    }, 1000);
});
