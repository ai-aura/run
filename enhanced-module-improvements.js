// 🎯 Enhanced Module Improvements for MessTrack
// Improvements for undo, notifications, statistics, backup, and other feature modules

(function() {
    'use strict';

    // ==========================================
    // ENHANCED UNDO MANAGER IMPROVEMENTS
    // ==========================================
    
    class UndoManagerEnhancements {
        static enhance(undoManager) {
            if (!undoManager) return;
            
            // Add batch undo/redo
            undoManager.undoMultiple = function(count) {
                const results = [];
                for (let i = 0; i < count && this.canUndo(); i++) {
                    results.push(this.undo());
                }
                return results;
            };
            
            undoManager.redoMultiple = function(count) {
                const results = [];
                for (let i = 0; i < count && this.canRedo(); i++) {
                    results.push(this.redo());
                }
                return results;
            };
            
            // Add history search
            undoManager.searchHistory = function(query) {
                return this.history.filter(action => {
                    const desc = this.getActionDescription(action).toLowerCase();
                    return desc.includes(query.toLowerCase());
                });
            };
            
            // Add history export
            undoManager.exportHistory = function() {
                return {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    history: this.history,
                    currentIndex: this.currentIndex
                };
            };
            
            // Add compression for large histories
            undoManager.compressHistory = function() {
                if (this.history.length > 100) {
                    // Keep only last 50 actions
                    this.history = this.history.slice(-50);
                    this.currentIndex = Math.min(this.currentIndex, this.history.length - 1);
                    this.saveHistory();
                }
            };
            
            console.log('✅ Undo Manager enhanced');
        }
    }
    
    // ==========================================
    // ENHANCED NOTIFICATION MANAGER IMPROVEMENTS
    // ==========================================
    
    class NotificationManagerEnhancements {
        static enhance(notificationManager) {
            if (!notificationManager) return;
            
            // Add smart scheduling based on user patterns
            notificationManager.enableSmartScheduling = function() {
                const pattern = this.analyzeAttendancePattern();
                
                // Adjust reminder times based on when user typically marks attendance
                if (pattern.avgLunchMarkTime) {
                    const reminderTime = new Date(pattern.avgLunchMarkTime);
                    reminderTime.setMinutes(reminderTime.getMinutes() - 15);
                    console.log('Smart lunch reminder:', reminderTime.toTimeString());
                }
                
                if (pattern.avgDinnerMarkTime) {
                    const reminderTime = new Date(pattern.avgDinnerMarkTime);
                    reminderTime.setMinutes(reminderTime.getMinutes() - 15);
                    console.log('Smart dinner reminder:', reminderTime.toTimeString());
                }
            };
            
            // Add notification grouping
            notificationManager.groupNotifications = function(notifications) {
                const grouped = {};
                notifications.forEach(notif => {
                    const key = notif.mealType;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(notif);
                });
                return grouped;
            };
            
            // Add notification priority system
            notificationManager.setPriority = function(notificationId, priority) {
                const notif = this.scheduledNotifications.find(n => n.id === notificationId);
                if (notif) {
                    notif.priority = priority; // 'high', 'medium', 'low'
                    this.saveScheduledNotifications();
                }
            };
            
            // Add quiet hours support
            notificationManager.setQuietHours = function(startTime, endTime) {
                this.quietHours = { start: startTime, end: endTime };
                localStorage.setItem('messtrack_quiet_hours', JSON.stringify(this.quietHours));
            };
            
            notificationManager.isQuietTime = function() {
                if (!this.quietHours) return false;
                
                const now = new Date();
                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                
                return currentTime >= this.quietHours.start && currentTime <= this.quietHours.end;
            };
            
            // Enhanced notification with quiet hours check
            const originalShow = notificationManager.showNotification.bind(notificationManager);
            notificationManager.showNotification = function(options) {
                if (this.isQuietTime && this.isQuietTime()) {
                    console.log('Notification suppressed (quiet hours)');
                    return null;
                }
                return originalShow(options);
            };
            
            console.log('✅ Notification Manager enhanced');
        }
    }
    
    // ==========================================
    // ENHANCED STATISTICS MANAGER IMPROVEMENTS
    // ==========================================
    
    class StatisticsManagerEnhancements {
        static enhance(statisticsManager) {
            if (!statisticsManager) return;
            
            // Add trend analysis
            statisticsManager.analyzeTrends = function(months = 3) {
                const trends = {
                    improving: false,
                    declining: false,
                    stable: false,
                    monthlyData: []
                };
                
                for (let i = 0; i < months; i++) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    
                    const stats = this.calculateMonthlyStats();
                    trends.monthlyData.push({
                        month: monthKey,
                        percentage: parseFloat(stats.attendancePercentage)
                    });
                }
                
                // Analyze trend direction
                if (trends.monthlyData.length >= 2) {
                    const recent = trends.monthlyData[0].percentage;
                    const older = trends.monthlyData[trends.monthlyData.length - 1].percentage;
                    const diff = recent - older;
                    
                    if (diff > 5) trends.improving = true;
                    else if (diff < -5) trends.declining = true;
                    else trends.stable = true;
                }
                
                return trends;
            };
            
            // Add goal tracking
            statisticsManager.setGoal = function(goalType, targetValue) {
                const goals = JSON.parse(localStorage.getItem('messtrack_goals') || '{}');
                goals[goalType] = {
                    target: targetValue,
                    setDate: new Date().toISOString()
                };
                localStorage.setItem('messtrack_goals', JSON.stringify(goals));
            };
            
            statisticsManager.checkGoals = function(stats) {
                const goals = JSON.parse(localStorage.getItem('messtrack_goals') || '{}');
                const progress = {};
                
                for (const [type, goal] of Object.entries(goals)) {
                    let current = 0;
                    
                    switch (type) {
                        case 'attendance_percentage':
                            current = parseFloat(stats.attendancePercentage);
                            break;
                        case 'streak':
                            current = stats.currentStreak;
                            break;
                        case 'lunch_count':
                            current = stats.lunchCount;
                            break;
                        case 'dinner_count':
                            current = stats.dinnerCount;
                            break;
                    }
                    
                    progress[type] = {
                        current,
                        target: goal.target,
                        percentage: (current / goal.target * 100).toFixed(1),
                        achieved: current >= goal.target
                    };
                }
                
                return progress;
            };
            
            // Add comparative analysis
            statisticsManager.compareWithPeers = function(peerData) {
                const myStats = this.calculateMonthlyStats();
                
                return {
                    myPercentage: parseFloat(myStats.attendancePercentage),
                    peerAverage: peerData.average,
                    percentile: this.calculatePercentile(
                        parseFloat(myStats.attendancePercentage),
                        peerData.distribution
                    ),
                    betterThan: peerData.distribution.filter(
                        p => p < parseFloat(myStats.attendancePercentage)
                    ).length
                };
            };
            
            statisticsManager.calculatePercentile = function(value, distribution) {
                const sorted = [...distribution].sort((a, b) => a - b);
                const index = sorted.findIndex(v => v >= value);
                return index === -1 ? 100 : (index / sorted.length * 100).toFixed(1);
            };
            
            // Add export statistics
            statisticsManager.exportStats = function(format = 'json') {
                const stats = this.calculateMonthlyStats();
                
                if (format === 'json') {
                    return JSON.stringify(stats, null, 2);
                } else if (format === 'csv') {
                    let csv = 'Metric,Value\n';
                    csv += `Total Days,${stats.totalDays}\n`;
                    csv += `Lunch Count,${stats.lunchCount}\n`;
                    csv += `Dinner Count,${stats.dinnerCount}\n`;
                    csv += `Attendance Percentage,${stats.attendancePercentage}%\n`;
                    csv += `Current Streak,${stats.currentStreak}\n`;
                    csv += `Longest Streak,${stats.longestStreak}\n`;
                    return csv;
                }
            };
            
            console.log('✅ Statistics Manager enhanced');
        }
    }
    
    // ==========================================
    // ENHANCED BACKUP MANAGER IMPROVEMENTS
    // ==========================================
    
    class BackupManagerEnhancements {
        static enhance(backupManager) {
            if (!backupManager) return;
            
            // Add incremental backup
            backupManager.createIncrementalBackup = async function() {
                const lastBackup = localStorage.getItem('messtrack_last_backup_data');
                const currentData = JSON.stringify(this.app.data);
                
                if (lastBackup === currentData) {
                    console.log('No changes since last backup');
                    return { success: true, incremental: false };
                }
                
                // Calculate diff
                const diff = this.calculateDiff(
                    JSON.parse(lastBackup || '{}'),
                    this.app.data
                );
                
                // Save incremental backup
                const backup = {
                    type: 'incremental',
                    timestamp: Date.now(),
                    diff: diff
                };
                
                this.saveBackup(backup);
                localStorage.setItem('messtrack_last_backup_data', currentData);
                
                return { success: true, incremental: true, changes: diff.length };
            };
            
            backupManager.calculateDiff = function(oldData, newData) {
                const changes = [];
                
                // Compare attendance
                for (const date in newData.attendance) {
                    if (!oldData.attendance || 
                        JSON.stringify(oldData.attendance[date]) !== JSON.stringify(newData.attendance[date])) {
                        changes.push({
                            type: 'attendance',
                            date,
                            value: newData.attendance[date]
                        });
                    }
                }
                
                return changes;
            };
            
            // Add cloud sync preparation
            backupManager.prepareForCloudSync = function() {
                const data = {
                    version: '2.0',
                    timestamp: Date.now(),
                    deviceId: this.getDeviceId(),
                    data: this.app.data,
                    checksum: this.calculateChecksum(this.app.data)
                };
                
                return data;
            };
            
            backupManager.getDeviceId = function() {
                let deviceId = localStorage.getItem('messtrack_device_id');
                if (!deviceId) {
                    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('messtrack_device_id', deviceId);
                }
                return deviceId;
            };
            
            backupManager.calculateChecksum = function(data) {
                // Simple checksum calculation
                const str = JSON.stringify(data);
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString(36);
            };
            
            // Add backup verification
            backupManager.verifyBackup = function(backupData) {
                try {
                    // Check structure
                    if (!backupData.data) return false;
                    
                    // Verify checksum if present
                    if (backupData.checksum) {
                        const calculatedChecksum = this.calculateChecksum(backupData.data);
                        if (calculatedChecksum !== backupData.checksum) {
                            console.error('Checksum mismatch');
                            return false;
                        }
                    }
                    
                    // Validate data structure
                    if (!window.EnhancedValidation.validateAttendance(backupData.data.attendance)) {
                        return false;
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Backup verification failed:', error);
                    return false;
                }
            };
            
            console.log('✅ Backup Manager enhanced');
        }
    }
    

    
    // ==========================================
    // INITIALIZE ENHANCEMENTS
    // ==========================================
    
    function initializeEnhancements() {
        // Wait for all managers to be loaded
        setTimeout(() => {
            if (window.undoManager) {
                UndoManagerEnhancements.enhance(window.undoManager);
            }
            
            if (window.notificationManager) {
                NotificationManagerEnhancements.enhance(window.notificationManager);
            }
            
            if (window.statisticsManager) {
                StatisticsManagerEnhancements.enhance(window.statisticsManager);
            }
            
            if (window.backupManager) {
                BackupManagerEnhancements.enhance(window.backupManager);
            }
            

            
            console.log('✅ All module enhancements applied');
        }, 2000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancements);
    } else {
        initializeEnhancements();
    }
    
    // Expose enhancement classes
    window.UndoManagerEnhancements = UndoManagerEnhancements;
    window.NotificationManagerEnhancements = NotificationManagerEnhancements;
    window.StatisticsManagerEnhancements = StatisticsManagerEnhancements;
    window.BackupManagerEnhancements = BackupManagerEnhancements;

    
})();
