// 🔔 Optimized Notification Manager for MessTrack
// Browser-based notification system with precise timing from user settings

class NotificationManager {
    constructor(messTrackApp) {
        this.app = messTrackApp;
        this.permission = 'default';
        this.scheduledNotifications = [];
        this.checkIntervals = [];
        this.notificationSound = null;
        this.lastCheckedMinute = null;
        this.debugMode = false; // Enable for testing
        
        this.init();
    }

    async init() {
        await this.checkPermission();
        this.loadScheduledNotifications();
        this.setupNotificationChecks();
    }

    // Check and request notification permission
    async checkPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        this.permission = Notification.permission;
        
        if (this.permission === 'default') {
            // Don't auto-request, wait for user action
            console.log('Notification permission not yet requested');
        }
        
        return this.permission === 'granted';
    }

    // Request notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            this.app.showToast('❌ Notifications not supported in this browser');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                this.app.showToast('✅ Notifications enabled!');
                this.scheduleAllReminders();
                // Show test notification
                this.showTestNotification();
                return true;
            } else if (permission === 'denied') {
                this.app.showToast('❌ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.app.showToast('❌ Failed to enable notifications');
            return false;
        }
    }

    // Show test notification
    showTestNotification() {
        this.showNotification({
            title: '🍽️ MessTrack Notifications Enabled!',
            body: 'You\'ll receive reminders for your meals',
            icon: 'icon-192.png',
            badge: 'icon-72.png',
            tag: 'test-notification'
        });
    }

    // Show notification
    showNotification(options) {
        if (this.permission !== 'granted') {
            console.log('Notification permission not granted');
            return null;
        }

        const defaultOptions = {
            icon: 'icon-192.png',
            badge: 'icon-72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false
        };

        const notification = new Notification(options.title, {
            ...defaultOptions,
            ...options
        });

        // Handle notification click
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            
            if (options.action) {
                options.action();
            }
            
            notification.close();
        };

        return notification;
    }

    // Schedule all meal reminders based on user settings
    scheduleAllReminders() {
        if (this.permission !== 'granted') {
            console.warn('Cannot schedule reminders: Permission not granted');
            return;
        }

        // Clear existing schedules
        this.clearAllIntervals();
        this.scheduledNotifications = [];

        // Get times from user settings
        const settings = this.app.data.settings;
        const lunchTime = settings.lunchTime || '12:00';
        const dinnerTime = settings.dinnerTime || '19:00';

        console.log(`📅 Scheduling notifications for Lunch: ${lunchTime}, Dinner: ${dinnerTime}`);

        // Schedule lunch reminders
        this.scheduleMealReminder('lunch', lunchTime, {
            beforeMinutes: [30, 15, 5], // 30, 15, and 5 minutes before
            atTime: true // At exact meal time
        });

        // Schedule dinner reminders
        this.scheduleMealReminder('dinner', dinnerTime, {
            beforeMinutes: [30, 15, 5],
            atTime: true
        });

        // Check every 30 seconds for more precise timing
        const checkInterval = setInterval(() => {
            this.checkScheduledNotifications();
        }, 30000); // Check every 30 seconds

        this.checkIntervals.push(checkInterval);

        // Save to localStorage
        this.saveScheduledNotifications();

        console.log(`✅ ${this.scheduledNotifications.length} reminders scheduled successfully`);
        
        if (this.debugMode) {
            console.table(this.scheduledNotifications.map(n => ({
                meal: n.mealType,
                time: n.time,
                title: n.title
            })));
        }
    }

    // Schedule meal reminder
    scheduleMealReminder(mealType, mealTime, options = {}) {
        const [hours, minutes] = mealTime.split(':').map(Number);
        
        // Schedule notifications before meal time
        if (options.beforeMinutes) {
            options.beforeMinutes.forEach(minutesBefore => {
                const notificationTime = new Date();
                notificationTime.setHours(hours, minutes - minutesBefore, 0, 0);
                
                this.scheduledNotifications.push({
                    id: `${mealType}_before_${minutesBefore}`,
                    mealType,
                    time: notificationTime.toTimeString().slice(0, 5),
                    title: `🔔 ${this.capitalize(mealType)} in ${minutesBefore} minutes!`,
                    body: `Don't forget to mark your ${mealType} attendance`,
                    action: () => {
                        this.app.showPage('dashboard');
                    }
                });
            });
        }

        // Schedule notification at exact meal time
        if (options.atTime) {
            this.scheduledNotifications.push({
                id: `${mealType}_at_time`,
                mealType,
                time: mealTime,
                title: `🍽️ Time for ${this.capitalize(mealType)}!`,
                body: `Remember to mark your ${mealType} attendance`,
                action: () => {
                    this.app.showPage('dashboard');
                }
            });
        }

        this.saveScheduledNotifications();
    }

    // Check if it's time to show scheduled notifications
    checkScheduledNotifications() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = this.app.getTodayString();

        // Prevent duplicate notifications in the same minute
        if (this.lastCheckedMinute === currentTime) {
            return;
        }
        this.lastCheckedMinute = currentTime;

        if (this.debugMode) {
            console.log(`🕐 Checking notifications at ${currentTime}`);
        }

        this.scheduledNotifications.forEach(notification => {
            if (notification.time === currentTime) {
                // Check if meal is already marked
                const attendance = this.app.data.attendance[today];
                const isMarked = attendance && attendance[notification.mealType];

                if (!isMarked) {
                    console.log(`🔔 Sending notification: ${notification.title} at ${currentTime}`);
                    
                    // Send browser notification
                    this.showNotification({
                        title: notification.title,
                        body: notification.body,
                        tag: notification.id,
                        icon: 'icon-192.png',
                        badge: 'icon-72.png',
                        requireInteraction: false,
                        action: notification.action,
                        data: {
                            mealType: notification.mealType,
                            date: today
                        }
                    });

                    // Also show in-app notification
                    this.showInAppNotification(notification);
                    
                    // Log for verification
                    console.log(`✅ Browser notification sent for ${notification.mealType} at ${currentTime}`);
                } else {
                    if (this.debugMode) {
                        console.log(`⏭️ Skipping notification: ${notification.mealType} already marked`);
                    }
                }
            }
        });
    }

    // Show in-app notification banner
    showInAppNotification(notification) {
        const banner = document.createElement('div');
        banner.className = 'in-app-notification';
        banner.innerHTML = `
            <div class="glass p-4 rounded-lg flex items-center justify-between gap-4 shadow-lg">
                <div class="flex items-center gap-3">
                    <i class="fas fa-bell text-2xl text-blue-400"></i>
                    <div>
                        <div class="font-bold">${notification.title}</div>
                        <div class="text-sm opacity-80">${notification.body}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="btn-glass px-3 py-1 text-sm" onclick="this.closest('.in-app-notification').remove()">
                        Dismiss
                    </button>
                    <button class="btn-glass px-3 py-1 text-sm bg-blue-500 bg-opacity-20" onclick="window.messTrack.markAttendance('${notification.mealType}'); this.closest('.in-app-notification').remove();">
                        Mark Now
                    </button>
                </div>
            </div>
        `;

        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1002;
            max-width: 90vw;
            animation: slideDown 0.4s ease-out;
        `;

        document.body.appendChild(banner);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            banner.style.animation = 'slideUp 0.4s ease-in';
            setTimeout(() => banner.remove(), 400);
        }, 10000);

        // Add animations
        if (!document.getElementById('notificationAnimations')) {
            const style = document.createElement('style');
            style.id = 'notificationAnimations';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        transform: translateX(-50%) translateY(-100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideUp {
                    from {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(-50%) translateY(-100px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Schedule daily summary notification
    scheduleDailySummary() {
        // Send summary at 9 PM every day
        const summaryTime = '21:00';
        
        this.scheduledNotifications.push({
            id: 'daily_summary',
            mealType: 'summary',
            time: summaryTime,
            title: '📊 Daily Attendance Summary',
            body: 'Check your meal attendance for today',
            action: () => {
                this.app.showPage('summary');
            }
        });

        this.saveScheduledNotifications();
    }

    // Schedule weekly reminder
    scheduleWeeklyReminder() {
        // Remind on Sunday at 8 PM to review weekly attendance
        const now = new Date();
        if (now.getDay() === 0) { // Sunday
            this.showNotification({
                title: '📅 Weekly Review',
                body: 'Review your weekly meal attendance',
                tag: 'weekly-reminder',
                action: () => {
                    this.app.showPage('weekly');
                }
            });
        }
    }

    // Smart reminders based on patterns
    enableSmartReminders() {
        // Analyze user's attendance pattern
        const pattern = this.analyzeAttendancePattern();
        
        if (pattern.oftenSkipsLunch) {
            // Send extra reminder for lunch
            console.log('User often skips lunch, enabling extra reminders');
        }
        
        if (pattern.oftenSkipsDinner) {
            // Send extra reminder for dinner
            console.log('User often skips dinner, enabling extra reminders');
        }
    }

    // Analyze attendance pattern
    analyzeAttendancePattern() {
        const last30Days = this.getLast30DaysAttendance();
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.values(last30Days).forEach(day => {
            totalDays++;
            if (day.lunch) lunchCount++;
            if (day.dinner) dinnerCount++;
        });

        return {
            oftenSkipsLunch: lunchCount < totalDays * 0.5,
            oftenSkipsDinner: dinnerCount < totalDays * 0.5,
            lunchAttendanceRate: (lunchCount / totalDays) * 100,
            dinnerAttendanceRate: (dinnerCount / totalDays) * 100
        };
    }

    // Get last 30 days attendance
    getLast30DaysAttendance() {
        const result = {};
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            if (this.app.data.attendance[dateStr]) {
                result[dateStr] = this.app.data.attendance[dateStr];
            }
        }
        
        return result;
    }

    // Clear all intervals
    clearAllIntervals() {
        this.checkIntervals.forEach(interval => clearInterval(interval));
        this.checkIntervals = [];
    }

    // Save scheduled notifications
    saveScheduledNotifications() {
        try {
            localStorage.setItem('messtrack_scheduled_notifications', JSON.stringify(this.scheduledNotifications));
        } catch (e) {
            console.error('Failed to save scheduled notifications:', e);
        }
    }

    // Load scheduled notifications
    loadScheduledNotifications() {
        try {
            const saved = localStorage.getItem('messtrack_scheduled_notifications');
            if (saved) {
                this.scheduledNotifications = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load scheduled notifications:', e);
            this.scheduledNotifications = [];
        }
    }

    // Setup notification checks
    setupNotificationChecks() {
        // Check immediately
        this.checkScheduledNotifications();
        
        // Then check every minute
        const interval = setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000);
        
        this.checkIntervals.push(interval);

        // Check for weekly reminder every day at 8 PM
        const weeklyInterval = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 20 && now.getMinutes() === 0) {
                this.scheduleWeeklyReminder();
            }
        }, 60000);
        
        this.checkIntervals.push(weeklyInterval);
    }

    // Enable notifications
    async enable() {
        const granted = await this.requestPermission();
        if (granted) {
            this.scheduleAllReminders();
            this.scheduleDailySummary();
            console.log('✅ Notifications enabled and scheduled');
            return true;
        }
        console.warn('❌ Notification permission not granted');
        return false;
    }

    // Disable notifications
    disable() {
        this.clearAllIntervals();
        this.scheduledNotifications = [];
        this.saveScheduledNotifications();
        this.lastCheckedMinute = null;
        console.log('✅ Notifications disabled and cleared');
    }
    
    // Update notifications when settings change
    updateNotificationTimes(newLunchTime, newDinnerTime) {
        if (this.permission !== 'granted') {
            console.warn('Cannot update notifications: Permission not granted');
            return false;
        }
        
        console.log(`🔄 Updating notification times: Lunch ${newLunchTime}, Dinner ${newDinnerTime}`);
        
        // Reschedule all reminders with new times
        this.scheduleAllReminders();
        
        this.app.showToast('🔔 Notification times updated!');
        return true;
    }
    
    // Verify notification setup
    verifySetup() {
        const status = {
            browserSupport: 'Notification' in window,
            permission: this.permission,
            enabled: this.permission === 'granted',
            scheduledCount: this.scheduledNotifications.length,
            activeIntervals: this.checkIntervals.length,
            lunchTime: this.app.data.settings.lunchTime || '12:00',
            dinnerTime: this.app.data.settings.dinnerTime || '19:00'
        };
        
        console.log('📊 Notification System Status:');
        console.table(status);
        
        if (status.scheduledCount > 0) {
            console.log('📅 Scheduled Notifications:');
            console.table(this.scheduledNotifications.map(n => ({
                meal: n.mealType,
                time: n.time,
                title: n.title
            })));
        }
        
        return status;
    }

    // Get notification status
    getStatus() {
        return {
            permission: this.permission,
            enabled: this.permission === 'granted',
            scheduledCount: this.scheduledNotifications.length,
            nextNotification: this.getNextNotification()
        };
    }

    // Get next scheduled notification
    getNextNotification() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const upcoming = this.scheduledNotifications
            .filter(n => n.time > currentTime)
            .sort((a, b) => a.time.localeCompare(b.time));
        
        return upcoming[0] || null;
    }

    // Utility functions
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for MessTrack app to be initialized
    setTimeout(() => {
        if (window.messTrack) {
            window.notificationManager = new NotificationManager(window.messTrack);
            console.log('✅ Notification Manager initialized');
        }
    }, 1000);
});
