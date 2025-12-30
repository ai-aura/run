// MessTrack - Main Application JavaScript
// Offline-first mess attendance tracker

// ====================
// Application State
// ====================
class MessTrack {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentViewMonth = new Date();
        this.data = {
            attendance: {},
            summaries: {},
            notes: {},
            settings: {
                theme: 'light',
                notifications: false,
                lunchTime: '12:00',
                dinnerTime: '19:00',
                github: {
                    username: '',
                    repo: '',
                    token: ''
                }
            }
        };
        this.bulkEditMode = false;
        this.selectedDays = new Set();
        this.currentSkipMeal = null;
        this.customDateRange = null; // For date range picker
        this.weeklyDays = []; // Store currently displayed days

        // Advanced features state
        this.pullToRefresh = { startY: 0, pulling: false };
        this.swipeNav = { startX: 0, swiping: false };
        this.longPressTimer = null;
        this.gestureHintsShown = JSON.parse(localStorage.getItem('gestureHintsShown') || '{}');
        this.appVersion = '2.0.0';
        // PWA install state
        this.deferredPrompt = null;
        this.installAnalytics = this.loadInstallAnalytics();

        // Notification state
        this.mealNotificationIntervals = [];

        this.init();
    }

    // ====================
    // Initialization
    // ====================
    init() {
        this.loadData();
        this.checkAndAutoReset();
        this.setupEventListeners();
        this.initializeUI();
        this.registerServiceWorker();

        // Check if app is opened for first time
        if (!localStorage.getItem('messtrack_initialized')) {
            this.showToast('Welcome to MessTrack! 🎉');
            localStorage.setItem('messtrack_initialized', 'true');
        }
    }

    // ====================
    // Data Management
    // ====================
    loadData() {
        // Load attendance data
        const attendanceData = localStorage.getItem('messtrack_attendance');
        if (attendanceData) {
            this.data.attendance = JSON.parse(attendanceData);
        }

        // Load summaries
        const summariesData = localStorage.getItem('messtrack_summaries');
        if (summariesData) {
            this.data.summaries = JSON.parse(summariesData);
        }

        // Load notes
        const notesData = localStorage.getItem('messtrack_notes');
        if (notesData) {
            this.data.notes = JSON.parse(notesData);
        }

        // Load settings
        const settingsData = localStorage.getItem('messtrack_settings');
        if (settingsData) {
            this.data.settings = { ...this.data.settings, ...JSON.parse(settingsData) };
        }
    }

    saveData() {
        localStorage.setItem('messtrack_attendance', JSON.stringify(this.data.attendance));
        localStorage.setItem('messtrack_summaries', JSON.stringify(this.data.summaries));
        localStorage.setItem('messtrack_notes', JSON.stringify(this.data.notes));
        localStorage.setItem('messtrack_settings', JSON.stringify(this.data.settings));
    }

    // ====================
    // Auto Reset & Archive
    // ====================
    checkAndAutoReset() {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        // Check last reset date
        const lastReset = localStorage.getItem('messtrack_last_reset');

        if (lastReset !== currentMonth) {
            // Archive previous month's data if exists
            if (Object.keys(this.data.attendance).length > 0) {
                this.archivePreviousMonth();
            }

            // Set new reset date
            localStorage.setItem('messtrack_last_reset', currentMonth);
            this.showToast('New month detected! Previous data archived.');
        }
    }

    archivePreviousMonth() {
        const previousMonth = new Date();
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const monthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

        // Calculate summary for previous month
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });

        if (totalDays > 0) {
            const totalPossibleMeals = totalDays * 2;
            const totalAttended = lunchCount + dinnerCount;
            const percentage = ((totalAttended / totalPossibleMeals) * 100).toFixed(1);

            const summary = {
                lunchCount,
                dinnerCount,
                totalDays,
                percentage
            };

            this.data.summaries[monthKey] = summary;

            // Extract specific month attendance for cloud sync
            const monthAttendance = {};
            Object.entries(this.data.attendance).forEach(([date, meals]) => {
                if (date.startsWith(monthKey)) {
                    monthAttendance[date] = meals;
                }
            });

            // AUTO-SYNC to GitHub (if configured)
            if (this.data.settings.github && this.data.settings.github.token) {
                this.syncMonthToGitHub(monthKey, summary, monthAttendance);
            }

            // Remove old attendance data - DISABLED to preserve history
            // IMPORTANT: Data is now kept locally AND synced to GitHub
            // Object.keys(this.data.attendance).forEach(date => {
            //     if (date.startsWith(monthKey)) {
            //         delete this.data.attendance[date];
            //     }
            // });

            this.saveData();
        }
    }

    // ====================
    // UI Initialization
    // ====================
    initializeUI() {
        this.applyTheme(this.data.settings.theme);
        this.registerServiceWorker();
        this.scheduleReminder();

        // Initialize advanced mobile features
        this.initAdvancedFeatures();

        // Load today's page by default
        this.showPage('dashboard');
        this.updateDashboard();
        this.updateDateTime();
        this.initializeMealTimes();
        this.initializePerformanceMode();
        // Initialize PWA install handlers/UI
        this.initInstallHandlers();

        // Setup meal notifications if enabled
        if (this.data.settings.notifications) {
            this.setupMealNotifications();
        }

        // Update date every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    initializeMealTimes() {
        const lunchTime = document.getElementById('lunchTime');
        const dinnerTime = document.getElementById('dinnerTime');

        if (lunchTime) {
            lunchTime.value = this.data.settings.lunchTime || '12:00';
        }

        if (dinnerTime) {
            dinnerTime.value = this.data.settings.dinnerTime || '19:00';
        }
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dayStr = now.toLocaleDateString('en-US', {
            weekday: 'long'
        });

        const currentDateEl = document.getElementById('currentDate');
        const currentDayEl = document.getElementById('currentDay');

        if (currentDateEl) currentDateEl.textContent = dateStr;
        if (currentDayEl) currentDayEl.textContent = dayStr;
    }

    initializePerformanceMode() {
        // Wait for device optimizer to be ready
        setTimeout(() => {
            if (window.deviceOptimizer) {
                const perfInfo = window.deviceOptimizer.getPerformanceInfo();

                // Update UI with detected performance level
                const detectedEl = document.getElementById('detectedPerformance');
                if (detectedEl) {
                    const levelText = {
                        'high': '🚀 High Performance',
                        'medium': '⚡ Balanced',
                        'low': '💾 Battery Saver'
                    };
                    detectedEl.textContent = levelText[perfInfo.level] || perfInfo.level;
                }

                // Update device info
                const coresEl = document.getElementById('deviceCores');
                const memoryEl = document.getElementById('deviceMemory');
                const connectionEl = document.getElementById('deviceConnection');

                if (coresEl) coresEl.textContent = perfInfo.cores;
                if (memoryEl) memoryEl.textContent = perfInfo.memory;
                if (connectionEl) {
                    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                    connectionEl.textContent = connection ? connection.effectiveType.toUpperCase() : 'Unknown';
                }

                // Set radio button to current mode
                const radios = document.querySelectorAll('input[name="performanceMode"]');
                radios.forEach(radio => {
                    if (radio.value === perfInfo.level) {
                        radio.checked = true;
                    }

                    // Add change listener
                    radio.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            this.setPerformanceMode(e.target.value);
                        }
                    });
                });

                // Setup quick toggle button in header
                this.setupQuickPerfToggle(perfInfo.level);
            }
        }, 500);
    }

    setupQuickPerfToggle(currentLevel) {
        const quickToggle = document.getElementById('quickPerfToggle');
        const perfLabel = document.getElementById('perfLabel');

        if (!quickToggle) return;

        // Update label
        const labels = {
            'high': '🚀 High',
            'medium': '⚡ Balanced',
            'low': '💾 Saver'
        };

        if (perfLabel) {
            perfLabel.textContent = labels[currentLevel] || 'Auto';
        }

        // Cycle through modes on click
        quickToggle.addEventListener('click', () => {
            const modes = ['high', 'medium', 'low'];
            const currentIndex = modes.indexOf(currentLevel);
            const nextIndex = (currentIndex + 1) % modes.length;
            const nextMode = modes[nextIndex];

            this.setPerformanceMode(nextMode);
        });
    }

    setPerformanceMode(level) {
        if (window.deviceOptimizer) {
            // Save as manual preference
            localStorage.setItem('messtrack_performance_mode', JSON.stringify({
                level: level,
                manual: true
            }));

            // Show confirmation toast
            const modeNames = {
                'high': '🚀 High Performance',
                'medium': '⚡ Balanced',
                'low': '💾 Battery Saver'
            };

            this.showToast(`Performance mode: ${modeNames[level]}. Reloading...`);

            // Reload after short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    // ====================
    // Event Listeners
    // ====================
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            });
        });

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Theme Select
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.data.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
                this.data.settings.theme = e.target.value;
                this.saveData();
            });
        }

        // Attendance Buttons
        const lunchBtn = document.getElementById('lunchBtn');
        const dinnerBtn = document.getElementById('dinnerBtn');

        if (lunchBtn) {
            lunchBtn.addEventListener('click', () => this.markAttendance('lunch'));
        }

        if (dinnerBtn) {
            dinnerBtn.addEventListener('click', () => this.markAttendance('dinner'));
        }

        // Calendar Navigation
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');

        if (prevMonth) {
            prevMonth.addEventListener('click', () => this.changeMonth(-1));
        }

        if (nextMonth) {
            nextMonth.addEventListener('click', () => this.changeMonth(1));
        }

        // Export Buttons
        const exportCSV = document.getElementById('exportCSV');
        const exportPDF = document.getElementById('exportPDF');

        if (exportCSV) {
            exportCSV.addEventListener('click', () => this.exportToCSV());
        }

        if (exportPDF) {
            exportPDF.addEventListener('click', () => this.exportToPDF());
        }

        // New Export/Share Buttons
        const generateQR = document.getElementById('generateQR');
        const shareReport = document.getElementById('shareReport');

        if (generateQR) {
            generateQR.addEventListener('click', () => this.generateQRCode());
        }

        if (shareReport) {
            shareReport.addEventListener('click', () => this.shareReport());
        }

        // Bulk Edit Event Listeners
        const bulkEditToggle = document.getElementById('bulkEditToggle');
        const bulkEditCancel = document.getElementById('bulkEditCancel');
        const bulkSelectAll = document.getElementById('bulkSelectAll');
        const bulkSelectNone = document.getElementById('bulkSelectNone');
        const bulkMarkLunch = document.getElementById('bulkMarkLunch');
        const bulkMarkDinner = document.getElementById('bulkMarkDinner');
        const bulkMarkBoth = document.getElementById('bulkMarkBoth');
        const bulkClear = document.getElementById('bulkClear');

        if (bulkEditToggle) {
            bulkEditToggle.addEventListener('click', () => this.toggleBulkEditMode());
        }

        if (bulkEditCancel) {
            bulkEditCancel.addEventListener('click', () => this.toggleBulkEditMode());
        }

        if (bulkSelectAll) {
            bulkSelectAll.addEventListener('click', () => this.bulkSelectAll());
        }

        if (bulkSelectNone) {
            bulkSelectNone.addEventListener('click', () => this.bulkSelectNone());
        }

        if (bulkMarkLunch) {
            bulkMarkLunch.addEventListener('click', () => this.bulkMarkMeal('lunch'));
        }

        if (bulkMarkDinner) {
            bulkMarkDinner.addEventListener('click', () => this.bulkMarkMeal('dinner'));
        }

        if (bulkMarkBoth) {
            bulkMarkBoth.addEventListener('click', () => this.bulkMarkMeal('both'));
        }

        if (bulkClear) {
            bulkClear.addEventListener('click', () => this.bulkClearMeals());
        }

        // Date Range Picker Event Listeners
        const dateRangeToggle = document.getElementById('dateRangeToggle');
        const closeDateRange = document.getElementById('closeDateRange');
        const applyDateRange = document.getElementById('applyDateRange');
        const resetToWeekly = document.getElementById('resetToWeekly');

        if (dateRangeToggle) {
            dateRangeToggle.addEventListener('click', () => this.toggleDateRangePanel());
        }

        if (closeDateRange) {
            closeDateRange.addEventListener('click', () => this.toggleDateRangePanel());
        }

        if (applyDateRange) {
            applyDateRange.addEventListener('click', () => this.applyCustomDateRange());
        }

        if (resetToWeekly) {
            resetToWeekly.addEventListener('click', () => this.resetToWeeklyView());
        }

        // Export Selected Event Listeners
        const exportSelectedCSV = document.getElementById('exportSelectedCSV');
        const exportSelectedPDF = document.getElementById('exportSelectedPDF');

        if (exportSelectedCSV) {
            exportSelectedCSV.addEventListener('click', () => this.exportSelectedToCSV());
        }

        if (exportSelectedPDF) {
            exportSelectedPDF.addEventListener('click', () => this.exportSelectedToPDF());
        }

        // Notification Toggle
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            notificationToggle.checked = this.data.settings.notifications;
            notificationToggle.addEventListener('change', async (e) => {
                this.data.settings.notifications = e.target.checked;
                this.saveData();

                if (e.target.checked) {
                    // Use new notification manager
                    if (window.notificationManager) {
                        const enabled = await window.notificationManager.enable();
                        if (!enabled) {
                            // Revert toggle if permission denied
                            e.target.checked = false;
                            this.data.settings.notifications = false;
                            this.saveData();
                        }
                    } else {
                        // Fallback to old method
                        this.requestNotificationPermission();
                        this.setupMealNotifications();
                    }
                } else {
                    // Disable notifications
                    if (window.notificationManager) {
                        window.notificationManager.disable();
                    }
                    this.showToast('🔕 Notifications disabled');
                    // Clear meal notification intervals
                    this.mealNotificationIntervals.forEach(id => clearInterval(id));
                    this.mealNotificationIntervals = [];
                }
            });
        }

        // FAB Event Listeners
        this.setupFAB();

        // Skip Reason Modal
        this.setupSkipReasonModal();

        // Settings with meal times
        const lunchTime = document.getElementById('lunchTime');
        const dinnerTime = document.getElementById('dinnerTime');

        if (lunchTime) {
            lunchTime.value = this.data.settings.lunchTime;
            lunchTime.addEventListener('change', (e) => {
                this.data.settings.lunchTime = e.target.value;
                this.saveData();

                // Update notification times if notifications are enabled
                if (window.notificationManager && this.data.settings.notifications) {
                    window.notificationManager.updateNotificationTimes(
                        this.data.settings.lunchTime,
                        this.data.settings.dinnerTime
                    );
                }
            });
        }

        if (dinnerTime) {
            dinnerTime.value = this.data.settings.dinnerTime;
            dinnerTime.addEventListener('change', (e) => {
                this.data.settings.dinnerTime = e.target.value;
                this.saveData();

                // Update notification times if notifications are enabled
                if (window.notificationManager && this.data.settings.notifications) {
                    window.notificationManager.updateNotificationTimes(
                        this.data.settings.lunchTime,
                        this.data.settings.dinnerTime
                    );
                }
            });
        }

        // GitHub Settings
        const saveGitHubSettings = document.getElementById('saveGitHubSettings');
        if (saveGitHubSettings) {
            // Load saved values
            const ghUsername = document.getElementById('ghUsername');
            const ghRepo = document.getElementById('ghRepo');
            const ghToken = document.getElementById('ghToken');

            if (ghUsername) ghUsername.value = this.data.settings.github?.username || '';
            if (ghRepo) ghRepo.value = this.data.settings.github?.repo || '';
            if (ghToken) ghToken.value = this.data.settings.github?.token || '';

            saveGitHubSettings.addEventListener('click', () => this.verifyAndSaveGitHubSettings());
        }

        // Manual GitHub Sync
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.manualSyncCurrentMonth());
        }

        // View on GitHub Button
        const viewOnGitHubBtn = document.getElementById('viewOnGitHubBtn');
        if (viewOnGitHubBtn) {
            viewOnGitHubBtn.addEventListener('click', () => this.openGitHubRepository());
        }
    }

    // ====================
    // Navigation
    // ====================
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Show selected page
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            selectedPage.classList.remove('hidden');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageName) {
                item.classList.add('active');
            }
        });

        this.currentPage = pageName;

        // Update page-specific content
        switch (pageName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'weekly':
                this.updateWeeklyView();
                break;
            case 'history':
                this.updateCalendar();
                break;
            case 'summary':
                // Use new statistics manager if available
                if (window.statisticsManager) {
                    window.statisticsManager.updateStatistics();
                } else {
                    // Fallback to old method
                    this.updateSummary();
                }
                break;
            case 'settings':
                // Refresh install UI when opening Settings
                this.updateInstallUI();
                break;
            // Theme manager removed, themes handled in settings
        }
    }

    // ====================
    // Dashboard Functions
    // ====================
    updateDashboard() {
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || {
            lunch: false,
            dinner: false
        };

        // Update button states
        const lunchBtn = document.getElementById('lunchBtn');
        const dinnerBtn = document.getElementById('dinnerBtn');
        const lunchStatus = document.getElementById('lunchStatus');
        const dinnerStatus = document.getElementById('dinnerStatus');

        if (lunchBtn) {
            if (todayData.lunch) {
                lunchBtn.classList.add('marked');
                lunchStatus.innerHTML = '<i class="fas fa-check-circle text-green-400"></i> Marked';
            } else {
                lunchBtn.classList.remove('marked');
                lunchStatus.innerHTML = '';
            }
        }

        if (dinnerBtn) {
            if (todayData.dinner) {
                dinnerBtn.classList.add('marked');
                dinnerStatus.innerHTML = '<i class="fas fa-check-circle text-green-400"></i> Marked';
            } else {
                dinnerBtn.classList.remove('marked');
                dinnerStatus.innerHTML = '';
            }
        }

        // Update daily status
        this.updateDailyStatus();
    }

    updateDailyStatus() {
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || {
            lunch: false,
            dinner: false
        };
        const dailyStatus = document.getElementById('dailyStatus');

        if (dailyStatus) {
            dailyStatus.innerHTML = `
                <div class="glass p-4 text-center">
                    <i class="fas fa-sun text-2xl text-yellow-400 mb-2"></i>
                    <p class="font-bold">Lunch</p>
                    <p class="${todayData.lunch ? 'text-green-400' : 'opacity-60'}">
                        ${todayData.lunch ? 'Attended ✓' : 'Not Marked'}
                    </p>
                </div>
                <div class="glass p-4 text-center">
                    <i class="fas fa-moon text-2xl text-blue-400 mb-2"></i>
                    <p class="font-bold">Dinner</p>
                    <p class="${todayData.dinner ? 'text-green-400' : 'opacity-60'}">
                        ${todayData.dinner ? 'Attended ✓' : 'Not Marked'}
                    </p>
                </div>
            `;
        }
    }

    markAttendance(type) {
        try {
            // Validate input
            if (!['lunch', 'dinner'].includes(type)) {
                console.error('Invalid meal type:', type);
                return;
            }

            const today = this.getTodayString();

            // Initialize if needed
            if (!this.data.attendance[today]) {
                this.data.attendance[today] = {
                    lunch: false,
                    dinner: false
                };
            }

            // Store previous state for undo capability
            const previousState = this.data.attendance[today][type];

            // Toggle attendance with animation
            this.data.attendance[today][type] = !previousState;

            // Record action for undo
            if (window.undoManager) {
                const actionType = !previousState ? 'mark_attendance' : 'unmark_attendance';
                window.undoManager.recordAction({
                    type: actionType,
                    data: {
                        date: today,
                        mealType: type,
                        previousState: previousState
                    }
                });
            }

            // Optimized save (debounced)
            this.saveData();

            // Update UI with requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                this.updateDashboard();

                // Add haptic feedback for mobile
                if ('vibrate' in navigator) {
                    navigator.vibrate(20); // Short haptic feedback
                }
            });

            // Play success sound if available
            this.playSound('success');

            // Schedule notification if enabled
            if (this.data.settings.notifications) {
                this.scheduleReminder();
            }

            // Track analytics
            const eventType = this.data.attendance[today][type] ? 'attendance_marked' : 'attendance_removed';
            this.trackEvent(eventType, { meal: type });

            // Store undo action
            this.lastAction = {
                type: 'attendance',
                meal: type,
                date: today,
                previousState
            };

        } catch (error) {
            console.error('Error marking attendance:', error);
            this.showToast('❌ Failed to mark attendance. Please try again.');

            // Attempt recovery
            this.recoverFromError(error);
        }
    }

    // Helper method for playing sounds (optional enhancement)
    playSound(type) {
        try {
            // Only play if user has interacted with the page
            if (document.hasFocus() && !document.hidden) {
                const audio = new Audio(`data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS2Oy9diMFl2+z4+SWT`);
                audio.volume = 0.1;
                audio.play().catch(() => { }); // Ignore errors
            }
        } catch (e) {
            // Sound is optional, ignore errors
        }
    }

    // Track events for analytics (stub for future implementation)
    trackEvent(eventName, data) {
        // Could send to analytics service
        if (window.DEBUG_MODE) {
            console.log('Event:', eventName, data);
        }
    }

    // Error recovery mechanism
    recoverFromError(error) {
        // Try to save data to session storage as backup
        try {
            sessionStorage.setItem('messtrack_backup', JSON.stringify(this.data));
        } catch (e) {
            console.error('Backup save failed:', e);
        }
    }

    // ====================
    // Calendar Functions
    // ====================
    updateCalendar() {
        const year = this.currentViewMonth.getFullYear();
        const month = this.currentViewMonth.getMonth();

        // Update month display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const currentMonthEl = document.getElementById('currentMonth');
        if (currentMonthEl) {
            currentMonthEl.textContent = `${monthNames[month]} ${year}`;
        }

        // Generate calendar
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        calendarGrid.innerHTML = '';

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = this.data.attendance[dateStr] || {
                lunch: false,
                dinner: false
            };

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day glass p-2';

            // Determine icon based on attendance
            let icon = '';
            if (dayData.lunch && dayData.dinner) {
                icon = '<i class="fas fa-check-circle text-green-400 text-lg"></i>';
            } else if (dayData.lunch) {
                icon = '<i class="fas fa-sun text-yellow-400 text-lg"></i>';
            } else if (dayData.dinner) {
                icon = '<i class="fas fa-moon text-blue-400 text-lg"></i>';
            }

            // Highlight today
            const today = this.getTodayString();
            const isToday = dateStr === today;

            dayEl.innerHTML = `
                <div class="text-sm font-bold ${isToday ? 'text-blue-400' : ''}">${day}</div>
                <div class="mt-1">${icon}</div>
            `;

            if (isToday) {
                dayEl.classList.add('ring-2', 'ring-blue-400');
            }

            calendarGrid.appendChild(dayEl);
        }
    }

    changeMonth(direction) {
        this.currentViewMonth.setMonth(this.currentViewMonth.getMonth() + direction);
        this.updateCalendar();
    }

    // ====================
    // Summary Functions
    // ====================
    updateSummary() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        // Calculate current month stats
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });

        const totalPossibleMeals = Math.max(totalDays * 2, 1);
        const totalAttended = lunchCount + dinnerCount;
        const percentage = ((totalAttended / totalPossibleMeals) * 100).toFixed(1);

        // Update UI
        const lunchCountEl = document.getElementById('lunchCount');
        const dinnerCountEl = document.getElementById('dinnerCount');
        const percentageEl = document.getElementById('attendancePercentage');

        if (lunchCountEl) lunchCountEl.textContent = lunchCount;
        if (dinnerCountEl) dinnerCountEl.textContent = dinnerCount;
        if (percentageEl) percentageEl.textContent = percentage + '%';

        // Update archived summaries
        this.updateArchivedSummaries();
    }

    updateArchivedSummaries() {
        const archivedSummaries = document.getElementById('archivedSummaries');
        if (!archivedSummaries) return;

        if (Object.keys(this.data.summaries).length === 0) {
            archivedSummaries.innerHTML = '<p class="opacity-60">No archived data yet</p>';
            return;
        }

        let html = '';
        const sortedMonths = Object.keys(this.data.summaries).sort().reverse();

        sortedMonths.forEach(monthKey => {
            const summary = this.data.summaries[monthKey];
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            html += `
                <div class="glass p-4 mb-4">
                    <h4 class="font-bold mb-2">${monthName}</h4>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <i class="fas fa-sun text-yellow-400"></i>
                            <span class="ml-1">Lunch: ${summary.lunchCount}</span>
                        </div>
                        <div>
                            <i class="fas fa-moon text-blue-400"></i>
                            <span class="ml-1">Dinner: ${summary.dinnerCount}</span>
                        </div>
                        <div>
                            <i class="fas fa-percentage text-green-400"></i>
                            <span class="ml-1">${summary.percentage}%</span>
                        </div>
                    </div>
                </div>
            `;
        });

        archivedSummaries.innerHTML = html;
    }

    // ====================
    // Export Functions
    // ====================
    exportToCSV() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        let csv = 'Date,Day,Lunch,Dinner,Notes\n';

        // Sort dates
        const sortedDates = Object.keys(this.data.attendance)
            .filter(date => date.startsWith(monthKey))
            .sort();

        sortedDates.forEach(date => {
            const meals = this.data.attendance[date];
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const notes = this.data.notes[date] || {};
            const noteText = notes.note || notes.skipReason || '';

            // Escape commas in notes
            const escapedNotes = noteText.replace(/"/g, '""');
            csv += `"${formattedDate}","${dayName}","${meals.lunch ? 'Yes' : 'No'}","${meals.dinner ? 'Yes' : 'No'}","${escapedNotes}"\n`;
        });

        // Download CSV
        const blob = new Blob([csv], {
            type: 'text/csv'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MessTrack_Report_${monthKey}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('CSV exported with proper formatting! 📊');
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Colors
        const primaryColor = [102, 126, 234];
        const successColor = [34, 197, 94];
        const dangerColor = [239, 68, 68];

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('🍽️ MessTrack Report', 20, 25);
        doc.setFontSize(14);
        doc.text(monthName, 20, 35);
        doc.setTextColor(0, 0, 0);

        // Summary calculations
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;
        let notesCount = 0;

        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });

        Object.keys(this.data.notes).forEach(date => {
            if (date.startsWith(monthKey)) notesCount++;
        });

        const totalPossibleMeals = totalDays * 2;
        const totalAttended = lunchCount + dinnerCount;
        const percentage = totalPossibleMeals > 0 ? ((totalAttended / totalPossibleMeals) * 100).toFixed(1) : '0.0';

        let yPos = 55;

        // Summary section
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text('📊 Monthly Summary', 20, yPos);
        yPos += 15;

        // Summary cards
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);

        // Lunch card
        doc.setFillColor(255, 252, 235);
        doc.roundedRect(20, yPos, 50, 25, 3, 3, 'F');
        doc.setTextColor(251, 191, 36);
        doc.text('☀️ Lunch', 25, yPos + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${lunchCount}`, 25, yPos + 18);
        doc.setFontSize(10);
        doc.text('days', 35, yPos + 18);

        // Dinner card
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(80, yPos, 50, 25, 3, 3, 'F');
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(12);
        doc.text('🌙 Dinner', 85, yPos + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${dinnerCount}`, 85, yPos + 18);
        doc.setFontSize(10);
        doc.text('days', 95, yPos + 18);

        // Percentage card
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(140, yPos, 50, 25, 3, 3, 'F');
        doc.setTextColor(...successColor);
        doc.setFontSize(12);
        doc.text('📈 Overall', 145, yPos + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${percentage}%`, 145, yPos + 18);

        yPos += 40;

        // Statistics
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text('📋 Statistics', 20, yPos);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`• Total Days: ${totalDays}`, 20, yPos);
        yPos += 7;
        doc.text(`• Meals Attended: ${totalAttended}/${totalPossibleMeals}`, 20, yPos);
        yPos += 7;
        doc.text(`• Notes: ${notesCount}`, 20, yPos);
        yPos += 7;
        doc.text(`• Generated: ${new Date().toLocaleString()}`, 20, yPos);
        yPos += 15;

        // Daily records table
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('📅 Daily Records', 20, yPos);
        yPos += 10;

        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos, 170, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Date', 25, yPos + 7);
        doc.text('Day', 65, yPos + 7);
        doc.text('Lunch', 90, yPos + 7);
        doc.text('Dinner', 120, yPos + 7);
        doc.text('Notes', 150, yPos + 7);
        yPos += 12;

        // Table content
        const sortedDates = Object.keys(this.data.attendance)
            .filter(date => date.startsWith(monthKey))
            .sort();

        sortedDates.forEach((date, index) => {
            const meals = this.data.attendance[date];
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const notes = this.data.notes[date] || {};

            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }

            doc.setTextColor(0, 0, 0);
            doc.text(dateStr, 25, yPos + 5);
            doc.text(dayStr, 65, yPos + 5);

            // Status with colors
            if (meals.lunch) {
                doc.setTextColor(...successColor);
            } else {
                doc.setTextColor(...dangerColor);
            }
            doc.text(meals.lunch ? '✓' : '✗', 95, yPos + 5);

            if (meals.dinner) {
                doc.setTextColor(...successColor);
            } else {
                doc.setTextColor(...dangerColor);
            }
            doc.text(meals.dinner ? '✓' : '✗', 125, yPos + 5);

            // Notes indicator
            doc.setTextColor(0, 0, 0);
            if (notes.note || notes.skipReason) {
                doc.setTextColor(59, 130, 246);
                doc.text('📝', 155, yPos + 5);
            }

            yPos += 10;

            // New page if needed
            if (yPos > 270) {
                doc.addPage();
                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, 210, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.text('MessTrack Report (Cont.)', 20, 17);
                doc.setTextColor(0, 0, 0);
                yPos = 35;
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`MessTrack • Page ${i}/${pageCount} • Generated ${new Date().toLocaleDateString()}`, 20, 285);
        }

        doc.save(`MessTrack_Report_${monthKey}.pdf`);
        this.showToast('Enhanced PDF exported! 📄');
    }

    // ====================
    // Data Import/Export
    // ====================
    exportAllData() {
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: this.data
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'messtrack-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully!');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (importedData.data) {
                    // Confirm before importing
                    if (confirm('This will replace all existing data. Are you sure?')) {
                        this.data = importedData.data;
                        this.saveData();
                        this.initializeUI();
                        this.showToast('Data imported successfully!');
                    }
                }
            } catch (error) {
                this.showToast('Error importing data. Please check the file.');
            }
        };
        reader.readAsText(file);
    }

    resetAllData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
            if (confirm('This will delete all your attendance records and summaries. Continue?')) {
                // Clear all data
                this.data = {
                    attendance: {},
                    summaries: {},
                    settings: {
                        theme: 'dark',
                        notifications: false
                    }
                };

                // Clear localStorage
                localStorage.removeItem('messtrack_attendance');
                localStorage.removeItem('messtrack_summaries');
                localStorage.removeItem('messtrack_settings');
                localStorage.removeItem('messtrack_last_reset');

                // Reinitialize UI
                this.initializeUI();
                this.showToast('All data has been reset');
            }
        }
    }

    // ====================
    // Theme Management
    // ====================
    toggleTheme() {
        const newTheme = this.data.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.data.settings.theme = newTheme;
        this.saveData();

        // Update theme select if on settings page
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = newTheme;
        }
    }

    applyTheme(theme) {
        const body = document.body;
        const themeIcon = document.getElementById('themeIcon');

        if (theme === 'light') {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            if (themeIcon) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            if (themeIcon) {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        }
    }

    // ====================
    // Notification Management
    // ====================
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Notifications not supported');
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                this.showToast('Notifications enabled! 🔔');
                this.setupMealNotifications();

                // Send a test notification
                setTimeout(() => {
                    new Notification('MessTrack Notifications Active', {
                        body: 'You\'ll receive reminders at your meal times!',
                        icon: 'icon-192.png',
                        badge: 'icon-192.png'
                    });
                }, 1000);
            } else {
                this.showToast('Notification permission denied');
                this.data.settings.notifications = false;
                const toggle = document.getElementById('notificationToggle');
                if (toggle) toggle.checked = false;
                this.saveData();
            }
        });
    }

    scheduleReminder() {
        if (!this.data.settings.notifications) return;

        const now = new Date();
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || {
            lunch: false,
            dinner: false
        };

        // Parse lunch time from settings
        const lunchTimeParts = this.data.settings.lunchTime.split(':');
        const lunchTime = new Date();
        lunchTime.setHours(parseInt(lunchTimeParts[0]), parseInt(lunchTimeParts[1]) - 30, 0, 0); // 30 min before

        // Parse dinner time from settings
        const dinnerTimeParts = this.data.settings.dinnerTime.split(':');
        const dinnerTime = new Date();
        dinnerTime.setHours(parseInt(dinnerTimeParts[0]), parseInt(dinnerTimeParts[1]) - 30, 0, 0); // 30 min before

        // Schedule lunch reminder
        if (!todayData.lunch && now < lunchTime) {
            const lunchDelay = lunchTime - now;
            if (lunchDelay > 0 && lunchDelay < 24 * 60 * 60 * 1000) { // Only if within 24 hours
                setTimeout(() => {
                    const currentData = this.data.attendance[this.getTodayString()] || { lunch: false, dinner: false };
                    if (!currentData.lunch) {
                        this.showNotification('Lunch Reminder', '🍽️ Lunch time in 30 minutes! Don\'t forget to mark your attendance.');
                    }
                }, lunchDelay);
            }
        }

        // Schedule dinner reminder
        if (!todayData.dinner && now < dinnerTime) {
            const dinnerDelay = dinnerTime - now;
            if (dinnerDelay > 0 && dinnerDelay < 24 * 60 * 60 * 1000) { // Only if within 24 hours
                setTimeout(() => {
                    const currentData = this.data.attendance[this.getTodayString()] || { lunch: false, dinner: false };
                    if (!currentData.dinner) {
                        this.showNotification('Dinner Reminder', '🌙 Dinner time in 30 minutes! Don\'t forget to mark your attendance.');
                    }
                }, dinnerDelay);
            }
        }
    }

    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'icon-192.png',
                badge: 'icon-192.png'
            });
        }
    }

    // ====================
    // Utility Functions
    // ====================
    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    // ====================
    // New Enhanced Features
    // ====================

    // FAB Setup
    setupFAB() {
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');
        const fabLunch = document.getElementById('fabLunch');
        const fabDinner = document.getElementById('fabDinner');
        const fabNote = document.getElementById('fabNote');
        const fabSkip = document.getElementById('fabSkip');

        let fabOpen = false;

        if (fabMain) {
            fabMain.addEventListener('click', () => {
                fabOpen = !fabOpen;
                if (fabOpen) {
                    fabMenu.classList.remove('opacity-0', 'pointer-events-none');
                    fabMenu.classList.add('opacity-100');
                    fabMain.querySelector('i').classList.replace('fa-plus', 'fa-times');
                } else {
                    fabMenu.classList.add('opacity-0', 'pointer-events-none');
                    fabMenu.classList.remove('opacity-100');
                    fabMain.querySelector('i').classList.replace('fa-times', 'fa-plus');
                }
            });
        }

        if (fabLunch) {
            fabLunch.addEventListener('click', () => {
                this.markAttendance('lunch');
                this.closeFAB();
            });
        }

        if (fabDinner) {
            fabDinner.addEventListener('click', () => {
                this.markAttendance('dinner');
                this.closeFAB();
            });
        }

        if (fabNote) {
            fabNote.addEventListener('click', () => {
                this.addNote();
                this.closeFAB();
            });
        }

        if (fabSkip) {
            fabSkip.addEventListener('click', () => {
                this.showSkipReasonModal();
                this.closeFAB();
            });
        }
    }

    closeFAB() {
        const fabMenu = document.getElementById('fabMenu');
        const fabMain = document.getElementById('fabMain');

        fabMenu.classList.add('opacity-0', 'pointer-events-none');
        fabMenu.classList.remove('opacity-100');
        fabMain.querySelector('i').classList.replace('fa-times', 'fa-plus');
    }

    // Weekly View
    updateWeeklyView() {
        const weeklyGrid = document.getElementById('weeklyGrid');
        if (!weeklyGrid) return;

        let displayDays = [];

        if (this.customDateRange) {
            // Use custom date range
            const start = new Date(this.customDateRange.start);
            const end = new Date(this.customDateRange.end);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                displayDays.push(new Date(d));
            }
        } else {
            // Default: last 7 days
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                displayDays.push(date);
            }
        }

        this.weeklyDays = displayDays; // Store for export

        let html = '';
        displayDays.forEach(date => {
            const dateStr = this.formatDateToString(date);
            const dayData = this.data.attendance[dateStr] || { lunch: false, dinner: false };
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = date.getDate();
            const isToday = dateStr === this.getTodayString();

            html += `
                <div class="glass p-4 flex items-center justify-between ${isToday ? 'ring-2 ring-blue-400' : ''} ${this.bulkEditMode ? 'cursor-pointer day-selectable' : ''}" 
                     data-date="${dateStr}">
                    <div class="flex items-center gap-4">
                        ${this.bulkEditMode ? '<input type="checkbox" class="day-checkbox">' : ''}
                        <div>
                            <div class="font-bold">${dayName}</div>
                            <div class="text-sm opacity-60">${dayNumber}</div>
                        </div>
                    </div>
                    <div class="flex gap-4">
                        <div class="text-center">
                            <i class="fas fa-sun text-2xl ${dayData.lunch ? 'text-yellow-400' : 'opacity-30'}"></i>
                            <div class="text-xs mt-1">${dayData.lunch ? 'Yes' : 'No'}</div>
                        </div>
                        <div class="text-center">
                            <i class="fas fa-moon text-2xl ${dayData.dinner ? 'text-blue-400' : 'opacity-30'}"></i>
                            <div class="text-xs mt-1">${dayData.dinner ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        weeklyGrid.innerHTML = html;

        // Add event listeners for day selection in bulk edit mode
        if (this.bulkEditMode) {
            document.querySelectorAll('.day-selectable').forEach(dayElement => {
                dayElement.addEventListener('click', (e) => {
                    this.toggleDaySelect(dayElement);
                });
            });
        }
    }

    // Bulk Edit Functions
    toggleBulkEditMode() {
        this.bulkEditMode = !this.bulkEditMode;
        this.selectedDays.clear();

        const bulkEditPanel = document.getElementById('bulkEditPanel');
        const bulkEditToggle = document.getElementById('bulkEditToggle');

        if (this.bulkEditMode) {
            bulkEditPanel.classList.remove('hidden');
            bulkEditToggle.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel';
            this.showToast('Bulk edit mode enabled. Select days to edit.');
        } else {
            bulkEditPanel.classList.add('hidden');
            bulkEditToggle.innerHTML = '<i class="fas fa-edit mr-2"></i>Bulk Edit';
            this.showToast('Bulk edit mode disabled.');
        }

        this.updateWeeklyView();
    }

    toggleDaySelect(element) {
        const dateStr = element.dataset.date;
        const checkbox = element.querySelector('.day-checkbox');

        if (checkbox) {
            checkbox.checked = !checkbox.checked;

            if (checkbox.checked) {
                this.selectedDays.add(dateStr);
                element.style.background = 'rgba(59, 130, 246, 0.2)';
            } else {
                this.selectedDays.delete(dateStr);
                element.style.background = '';
            }
        }
    }

    bulkSelectAll() {
        document.querySelectorAll('.day-checkbox').forEach((checkbox, index) => {
            checkbox.checked = true;
            const dateElement = checkbox.closest('[data-date]');
            if (dateElement) {
                const dateStr = dateElement.dataset.date;
                this.selectedDays.add(dateStr);
                dateElement.style.background = 'rgba(59, 130, 246, 0.2)';
            }
        });
        this.showToast(`Selected all ${this.selectedDays.size} days`);
    }

    bulkSelectNone() {
        document.querySelectorAll('.day-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const dateElement = checkbox.closest('[data-date]');
            if (dateElement) {
                dateElement.style.background = '';
            }
        });
        this.selectedDays.clear();
        this.showToast('Cleared all selections');
    }

    bulkMarkMeal(type) {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day');
            return;
        }

        let count = 0;
        this.selectedDays.forEach(dateStr => {
            if (!this.data.attendance[dateStr]) {
                this.data.attendance[dateStr] = { lunch: false, dinner: false };
            }

            if (type === 'lunch') {
                this.data.attendance[dateStr].lunch = true;
            } else if (type === 'dinner') {
                this.data.attendance[dateStr].dinner = true;
            } else if (type === 'both') {
                this.data.attendance[dateStr].lunch = true;
                this.data.attendance[dateStr].dinner = true;
            }
            count++;
        });

        this.saveData();
        this.updateWeeklyView();

        const mealText = type === 'both' ? 'lunch and dinner' : type;
        this.showToast(`Marked ${mealText} for ${count} day(s) ✓`);
    }

    bulkClearMeals() {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day');
            return;
        }

        if (confirm(`Clear all meals for ${this.selectedDays.size} selected day(s)?`)) {
            let count = 0;
            this.selectedDays.forEach(dateStr => {
                if (this.data.attendance[dateStr]) {
                    this.data.attendance[dateStr].lunch = false;
                    this.data.attendance[dateStr].dinner = false;
                    count++;
                }
            });

            this.saveData();
            this.updateWeeklyView();
            this.showToast(`Cleared meals for ${count} day(s)`);
        }
    }

    // Date Range Picker Functions
    toggleDateRangePanel() {
        const panel = document.getElementById('dateRangePanel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            this.initializeDateInputs();
        } else {
            panel.classList.add('hidden');
        }
    }

    initializeDateInputs() {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (startDateInput) {
            startDateInput.value = this.formatDateToString(sevenDaysAgo);
        }
        if (endDateInput) {
            endDateInput.value = this.formatDateToString(today);
        }
    }

    applyCustomDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            this.showToast('Please select both start and end dates');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            this.showToast('Start date must be before end date');
            return;
        }

        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        if (daysDiff > 90) {
            this.showToast('Please select a range of 90 days or less');
            return;
        }

        this.customDateRange = { start: startDate, end: endDate };
        this.updateWeeklyView();
        this.toggleDateRangePanel();
        this.showToast(`Showing ${daysDiff} days from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
    }

    resetToWeeklyView() {
        this.customDateRange = null;
        this.updateWeeklyView();
        this.toggleDateRangePanel();
        this.showToast('Reset to last 7 days view');
    }

    // Export Selected Functions
    exportSelectedToCSV() {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day to export');
            return;
        }

        let csv = 'Date,Day,Lunch,Dinner,Notes\n';
        const sortedDates = Array.from(this.selectedDays).sort();

        sortedDates.forEach(date => {
            const meals = this.data.attendance[date] || { lunch: false, dinner: false };
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const notes = this.data.notes[date] || {};
            const noteText = notes.note || notes.skipReason || '';

            const escapedNotes = noteText.replace(/"/g, '""');
            csv += `"${formattedDate}","${dayName}","${meals.lunch ? 'Yes' : 'No'}","${meals.dinner ? 'Yes' : 'No'}","${escapedNotes}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MessTrack_Selected_${this.selectedDays.size}_Days.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast(`Exported ${this.selectedDays.size} selected days to CSV! 📊`);
    }

    exportSelectedToPDF() {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day to export');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const primaryColor = [102, 126, 234];
        const successColor = [34, 197, 94];
        const dangerColor = [239, 68, 68];

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('🍽️ MessTrack - Selected Days', 20, 25);
        doc.setFontSize(14);
        doc.text(`${this.selectedDays.size} Days Selected`, 20, 35);
        doc.setTextColor(0, 0, 0);

        let yPos = 55;

        // Calculate summary
        let lunchCount = 0, dinnerCount = 0;
        Array.from(this.selectedDays).forEach(date => {
            const meals = this.data.attendance[date] || { lunch: false, dinner: false };
            if (meals.lunch) lunchCount++;
            if (meals.dinner) dinnerCount++;
        });

        const totalPossible = this.selectedDays.size * 2;
        const totalAttended = lunchCount + dinnerCount;
        const percentage = totalPossible > 0 ? ((totalAttended / totalPossible) * 100).toFixed(1) : '0.0';

        // Summary
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text('📊 Summary', 20, yPos);
        yPos += 15;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Lunch: ${lunchCount} days`, 20, yPos);
        yPos += 7;
        doc.text(`Dinner: ${dinnerCount} days`, 20, yPos);
        yPos += 7;
        doc.text(`Overall: ${percentage}%`, 20, yPos);
        yPos += 15;

        // Table
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('📅 Daily Records', 20, yPos);
        yPos += 10;

        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos, 170, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Date', 25, yPos + 7);
        doc.text('Day', 65, yPos + 7);
        doc.text('Lunch', 90, yPos + 7);
        doc.text('Dinner', 120, yPos + 7);
        doc.text('Notes', 150, yPos + 7);
        yPos += 12;

        const sortedDates = Array.from(this.selectedDays).sort();
        sortedDates.forEach((date, index) => {
            const meals = this.data.attendance[date] || { lunch: false, dinner: false };
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const notes = this.data.notes[date] || {};

            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }

            doc.setTextColor(0, 0, 0);
            doc.text(dateStr, 25, yPos + 5);
            doc.text(dayStr, 65, yPos + 5);

            if (meals.lunch) {
                doc.setTextColor(successColor[0], successColor[1], successColor[2]);
            } else {
                doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
            }
            doc.text(meals.lunch ? '✓' : '✗', 95, yPos + 5);

            if (meals.dinner) {
                doc.setTextColor(successColor[0], successColor[1], successColor[2]);
            } else {
                doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
            }
            doc.text(meals.dinner ? '✓' : '✗', 125, yPos + 5);

            doc.setTextColor(0, 0, 0);
            if (notes.note || notes.skipReason) {
                doc.setTextColor(59, 130, 246);
                doc.text('📝', 155, yPos + 5);
            }

            yPos += 10;

            if (yPos > 270) {
                doc.addPage();
                yPos = 35;
            }
        });

        doc.save(`MessTrack_Selected_${this.selectedDays.size}_Days.pdf`);
        this.showToast(`Exported ${this.selectedDays.size} selected days to PDF! 📄`);
    }

    formatDateToString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // QR Code Generation
    async generateQRCode() {
        const summary = this.getCurrentMonthSummary();
        const reportData = {
            month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            studentName: 'Hostel Student',
            ...summary,
            timestamp: new Date().toISOString()
        };

        // Create a shareable URL instead of JSON for better QR compatibility
        const reportText = `MessTrack Report - ${reportData.month}\n` +
            `Lunch: ${reportData.lunchCount} days\n` +
            `Dinner: ${reportData.dinnerCount} days\n` +
            `Overall: ${reportData.percentage}%\n` +
            `Generated: ${new Date().toLocaleDateString()}`;

        const canvas = document.getElementById('qrCodeCanvas');
        const container = document.getElementById('qrCodeContainer');

        container.classList.remove('hidden');

        // Show loading state
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#ffffff'; // White text for visibility in dark mode
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generating QR...', 100, 100);

        try {
            const encodedData = encodeURIComponent(reportText);
            // RapidAPI Endpoint - Simplified parameters based on doc
            const url = `https://qr-code-generator20.p.rapidapi.com/generateadvanceimage?data=${encodedData}&size=300&margin=10&label=MessTrack`;

            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': '5adcaa6b7emsh0be53dc511b0b59p13dacdjsnf1954197569f',
                    'x-rapidapi-host': 'qr-code-generator20.p.rapidapi.com'
                }
            };

            this.showToast('🚀 Generating QR via API...');
            const response = await fetch(url, options);

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            // Verify content type is an image
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('image')) {
                const text = await response.text();
                console.error('API returned non-image:', text);
                throw new Error('API returned non-image response');
            }

            const blob = await response.blob();
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(img.src);
                this.showToast('✅ QR Code generated successfully');
            };

            img.onerror = (e) => {
                console.error('Image Load Failed:', e);
                URL.revokeObjectURL(img.src);
                this.fallbackToLocalQR(canvas, container, reportText);
            };

            img.src = URL.createObjectURL(blob);

        } catch (error) {
            console.error('QR API Failed:', error);
            this.fallbackToLocalQR(canvas, container, reportText);
        }
    }

    // New helper method for fallback
    fallbackToLocalQR(canvas, container, reportText) {
        this.showToast('⚠️ API failed, using offline fallback');

        if (typeof QRCode === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js';
            script.onload = () => {
                this.generateQRCodeWithLibrary(canvas, container, reportText);
            };
            script.onerror = () => {
                this.showFallbackQR(container, reportText);
            };
            document.head.appendChild(script);
        } else {
            this.generateQRCodeWithLibrary(canvas, container, reportText);
        }
    }

    generateQRCodeWithLibrary(canvas, container, text) {
        if (canvas) {
            try {
                // Clear canvas first
                canvas.width = 250;
                canvas.height = 250;

                // Use the qrcode library's toCanvas method
                if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
                    QRCode.toCanvas(canvas, text, {
                        width: 250,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }, (error) => {
                        if (error) {
                            console.error('QR Code error:', error);
                            this.showFallbackQR(container, text);
                        } else {
                            container.classList.remove('hidden');
                            this.showToast('QR code generated successfully! 📱');
                        }
                    });
                } else if (typeof QRCode !== 'undefined') {
                    // Alternative: use QRCode constructor
                    canvas.innerHTML = '';
                    new QRCode(canvas, {
                        text: text,
                        width: 250,
                        height: 250,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    container.classList.remove('hidden');
                    this.showToast('QR code generated successfully! 📱');
                } else {
                    throw new Error('QRCode library not loaded');
                }
            } catch (error) {
                console.error('QR generation error:', error);
                this.showFallbackQR(container, text);
            }
        } else {
            this.showFallbackQR(container, text);
        }
    }

    showFallbackQR(container, text) {
        // Show a text version if QR generation fails
        container.innerHTML = `
            <div class="text-center p-4 glass rounded-lg">
                <h4 class="font-bold mb-4">📱 Share Report</h4>
                <div class="text-sm bg-gray-100 p-3 rounded mb-4 text-gray-800">
                    ${text.replace(/\n/g, '<br>')}
                </div>
                <button onclick="navigator.clipboard.writeText('${text.replace(/'/g, "\\'")}').then(() => messTrack.showToast('Report copied!'))" 
                        class="btn-glass">
                    📋 Copy Report
                </button>
            </div>
        `;
        container.classList.remove('hidden');
        this.showToast('QR generation failed, showing text version 📋');
    }

    getCurrentMonthSummary() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });

        const totalPossibleMeals = Math.max(totalDays * 2, 1);
        const totalAttended = lunchCount + dinnerCount;
        const percentage = ((totalAttended / totalPossibleMeals) * 100).toFixed(1);

        return { lunchCount, dinnerCount, totalDays, percentage };
    }

    // Share Report
    shareReport() {
        const summary = this.getCurrentMonthSummary();
        const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const shareText = `📊 MessTrack Report - ${month}\n\n🥐 Lunch: ${summary.lunchCount} days\n🍽️ Dinner: ${summary.dinnerCount} days\n📈 Overall Attendance: ${summary.percentage}%\n\n#MessTrack #AttendanceTracker`;

        if (navigator.share) {
            navigator.share({
                title: 'MessTrack Report',
                text: shareText
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast('Report copied to clipboard!');
            }).catch(() => {
                this.showToast('Share feature not available');
            });
        }
    }

    // Skip Reason Modal
    setupSkipReasonModal() {
        const modal = document.getElementById('skipReasonModal');
        const saveBtn = document.getElementById('saveSkipReason');
        const cancelBtn = document.getElementById('cancelSkipReason');
        const reasonBtns = document.querySelectorAll('.skip-reason');

        reasonBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('customReason').value = btn.dataset.reason;
            });
        });

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSkipReason());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideSkipReasonModal());
        }
    }

    showSkipReasonModal() {
        document.getElementById('skipReasonModal').classList.remove('hidden');
    }

    hideSkipReasonModal() {
        document.getElementById('skipReasonModal').classList.add('hidden');
        document.getElementById('customReason').value = '';
        this.currentSkipMeal = null;
    }

    saveSkipReason() {
        const reason = document.getElementById('customReason').value || 'No reason provided';
        const today = this.getTodayString();

        if (!this.data.notes[today]) {
            this.data.notes[today] = {};
        }

        this.data.notes[today].skipReason = reason;
        this.saveData();
        this.hideSkipReasonModal();
        this.showToast('Skip reason saved');
    }

    addNote() {
        const note = prompt('Add a note for today:');
        if (note) {
            const today = this.getTodayString();
            if (!this.data.notes[today]) {
                this.data.notes[today] = {};
            }
            this.data.notes[today].note = note;
            this.saveData();
            this.showToast('Note added successfully!');
        }
    }

    // ====================
    // Service Worker
    // ====================
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered');
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdatePrompt();
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    // ====================
    // Advanced Mobile Features
    // ====================
    initAdvancedFeatures() {
        this.initSplashScreen();
        this.initPullToRefresh();
        this.initSwipeNavigation();
        this.initHapticFeedback();
        this.initGestureHints();
        this.initTabBadges();
        this.initLongPressMenus();
        this.initOfflineDetection();
        this.handlePWAShortcuts();
        this.checkForUpdates();
    }

    // 1. Splash Screen
    initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 500);
        }, 100);
    }

    // 2. Pull to Refresh
    initPullToRefresh() {
        const mainContent = document.getElementById('mainContent');
        const pullIndicator = document.querySelector('.pull-to-refresh');
        let startY = 0;
        let currentY = 0;
        let pulling = false;

        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        });

        mainContent.addEventListener('touchmove', (e) => {
            if (!pulling) return;

            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0 && diff < 150) {
                pullIndicator.style.transform = `translateY(${diff}px)`;
                pullIndicator.style.opacity = diff / 150;
            }
        });

        mainContent.addEventListener('touchend', () => {
            if (!pulling) return;

            const diff = currentY - startY;
            if (diff > 100) {
                pullIndicator.classList.add('pulling');
                this.hapticFeedback('medium');
                this.refreshData();
                setTimeout(() => {
                    pullIndicator.classList.remove('pulling');
                    pullIndicator.style.transform = '';
                    pullIndicator.style.opacity = '';
                }, 1000);
            } else {
                pullIndicator.style.transform = '';
                pullIndicator.style.opacity = '';
            }
            pulling = false;
        });
    }

    refreshData() {
        this.updateDashboard();
        this.updateWeeklyView();
        this.updateMonthCalendar();
        this.showToast('🔄 Data refreshed!');
    }

    // 3. Swipe Navigation
    initSwipeNavigation() {
        const pages = ['dashboard', 'weekly', 'history', 'summary', 'settings'];
        let startX = 0;
        let currentX = 0;
        let swiping = false;

        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.nav-item') || e.target.closest('button') || e.target.closest('input')) {
                return;
            }
            startX = e.touches[0].clientX;
            swiping = true;
        });

        document.addEventListener('touchmove', (e) => {
            if (!swiping) return;
            currentX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', () => {
            if (!swiping) return;

            const diff = currentX - startX;
            const threshold = 100;

            if (Math.abs(diff) > threshold) {
                const currentIndex = pages.indexOf(this.currentPage);
                let newIndex;

                if (diff > 0 && currentIndex > 0) {
                    // Swipe right - previous page
                    newIndex = currentIndex - 1;
                    this.hapticFeedback('light');
                } else if (diff < 0 && currentIndex < pages.length - 1) {
                    // Swipe left - next page
                    newIndex = currentIndex + 1;
                    this.hapticFeedback('light');
                }

                if (newIndex !== undefined) {
                    this.showPage(pages[newIndex]);
                }
            }

            swiping = false;
        });
    }

    // 4. Haptic Feedback
    initHapticFeedback() {
        // Add haptic to all navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.hapticFeedback('light'));
        });

        // Add haptic to buttons
        document.querySelectorAll('.btn-glass').forEach(btn => {
            btn.addEventListener('click', () => this.hapticFeedback('medium'));
        });
    }

    hapticFeedback(intensity = 'medium') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30
            };
            navigator.vibrate(patterns[intensity] || 20);
        }
    }

    // 5. Gesture Hints
    initGestureHints() {
        const hints = [
            { key: 'swipe', text: '👈 Swipe to navigate pages 👉', delay: 3000 },
            { key: 'pull', text: '⬇️ Pull down to refresh', delay: 8000 },
            { key: 'longPress', text: '⏱️ Long press nav icons for quick actions', delay: 13000 }
        ];

        hints.forEach(hint => {
            if (!this.gestureHintsShown[hint.key]) {
                setTimeout(() => this.showGestureHint(hint.text, hint.key), hint.delay);
            }
        });
    }

    showGestureHint(text, key) {
        const container = document.getElementById('gestureHints');
        const hint = document.createElement('div');
        hint.className = 'gesture-hint';
        hint.textContent = text;
        container.appendChild(hint);

        setTimeout(() => {
            hint.remove();
            this.gestureHintsShown[key] = true;
            localStorage.setItem('gestureHintsShown', JSON.stringify(this.gestureHintsShown));
        }, 4000);
    }

    // 6. Tab Bar Badges
    initTabBadges() {
        this.updateTabBadges();
        // Update badges when data changes
        setInterval(() => this.updateTabBadges(), 30000);
    }

    updateTabBadges() {
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || { lunch: false, dinner: false };

        // Dashboard badge - show if meals not marked
        const dashboardNav = document.querySelector('[data-page="dashboard"]');
        let pendingCount = 0;
        if (!todayData.lunch) pendingCount++;
        if (!todayData.dinner) pendingCount++;

        this.updateBadge(dashboardNav, pendingCount);

        // Weekly badge - show number of days in selection
        const weeklyNav = document.querySelector('[data-page="weekly"]');
        if (this.bulkEditMode && this.selectedDays.size > 0) {
            this.updateBadge(weeklyNav, this.selectedDays.size);
        } else {
            this.updateBadge(weeklyNav, 0);
        }
    }

    updateBadge(element, count) {
        if (!element) return;

        let badge = element.querySelector('.nav-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                element.style.position = 'relative';
                element.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }

    // 7. Long Press Menus
    initLongPressMenus() {
        document.querySelectorAll('.nav-item').forEach(item => {
            let pressTimer;

            item.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    this.hapticFeedback('heavy');
                    this.showLongPressMenu(item, e.touches[0].clientX, e.touches[0].clientY);
                }, 500);
            });

            item.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });

            item.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
        });
    }

    showLongPressMenu(navItem, x, y) {
        const page = navItem.dataset.page;
        const menu = document.getElementById('longPressMenu');

        const actions = {
            dashboard: [
                { icon: 'fa-sun', text: 'Quick Lunch', action: () => this.markMeal('lunch') },
                { icon: 'fa-moon', text: 'Quick Dinner', action: () => this.markMeal('dinner') },
                { icon: 'fa-check-double', text: 'Mark Both', action: () => this.markBothMeals() }
            ],
            weekly: [
                { icon: 'fa-edit', text: 'Bulk Edit', action: () => this.toggleBulkEditMode() },
                { icon: 'fa-calendar-alt', text: 'Date Range', action: () => this.toggleDateRangePanel() },
                { icon: 'fa-download', text: 'Export', action: () => this.exportToCSV() }
            ],
            history: [
                { icon: 'fa-chevron-left', text: 'Previous Month', action: () => this.changeMonth(-1) },
                { icon: 'fa-chevron-right', text: 'Next Month', action: () => this.changeMonth(1) },
                { icon: 'fa-calendar-day', text: 'This Month', action: () => this.goToCurrentMonth() }
            ],
            summary: [
                { icon: 'fa-qrcode', text: 'Generate QR', action: () => this.generateQRCode() },
                { icon: 'fa-file-pdf', text: 'Export PDF', action: () => this.exportToPDF() },
                { icon: 'fa-chart-line', text: 'View Stats', action: () => { } }
            ],
            settings: [
                { icon: 'fa-moon', text: 'Toggle Theme', action: () => this.toggleTheme() },
                { icon: 'fa-bell', text: 'Notifications', action: () => this.toggleNotifications() },
                { icon: 'fa-trash', text: 'Clear Data', action: () => this.confirmClearData() }
            ]
        };

        const menuActions = actions[page] || [];
        menu.innerHTML = menuActions.map(action => `
            <div class="long-press-item" onclick="messTrack.closeLongPressMenu(); (${action.action.toString()})()">
                <i class="fas ${action.icon}"></i>${action.text}
            </div>
        `).join('');

        menu.style.left = `${x - 100}px`;
        menu.style.top = `${y - 50}px`;
        menu.classList.add('show');

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', () => this.closeLongPressMenu(), { once: true });
        }, 100);
    }

    closeLongPressMenu() {
        const menu = document.getElementById('longPressMenu');
        menu.classList.remove('show');
    }

    // 8. PWA Shortcuts Handler
    handlePWAShortcuts() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const page = params.get('page');

        if (action === 'lunch') {
            setTimeout(() => {
                this.markMeal('lunch');
                this.showToast('Lunch marked via shortcut! 🍽️');
            }, 2500);
        } else if (action === 'dinner') {
            setTimeout(() => {
                this.markMeal('dinner');
                this.showToast('Dinner marked via shortcut! 🌙');
            }, 2500);
        }

        if (page && page !== 'dashboard') {
            setTimeout(() => this.showPage(page), 2500);
        }
    }

    // 9. Offline Detection
    initOfflineDetection() {
        const banner = document.getElementById('offlineBanner');

        window.addEventListener('online', () => {
            banner.classList.remove('show');
            this.showToast('✅ Back online!');
            this.hapticFeedback('light');
        });

        window.addEventListener('offline', () => {
            banner.classList.add('show');
            this.hapticFeedback('heavy');
        });

        // Check initial state
        if (!navigator.onLine) {
            banner.classList.add('show');
        }
    }

    // 10. Update Prompt
    showUpdatePrompt() {
        const prompt = document.getElementById('updatePrompt');
        prompt.classList.add('show');

        document.getElementById('updateNow').addEventListener('click', () => {
            this.hapticFeedback('medium');
            window.location.reload();
        });

        document.getElementById('dismissUpdate').addEventListener('click', () => {
            prompt.classList.remove('show');
        });
    }

    checkForUpdates() {
        const lastVersion = localStorage.getItem('appVersion');
        if (lastVersion && lastVersion !== this.appVersion) {
            setTimeout(() => this.showUpdatePrompt(), 5000);
        }
        localStorage.setItem('appVersion', this.appVersion);
    }

    toggleNotifications() {
        const toggle = document.getElementById('notificationToggle');
        if (toggle) {
            toggle.click();
        }
    }

    confirmClearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
            localStorage.clear();
            location.reload();
        }
    }

    // ====================
    // PWA Install Flow
    // ====================
    initInstallHandlers() {
        const installBtn = document.getElementById('installAppBtn');
        const installTeaserBtn = document.getElementById('installTeaserBtn');

        // Main install button
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                await this.handleInstallClick();
            });
        }

        // Teaser banner install button
        if (installTeaserBtn) {
            installTeaserBtn.addEventListener('click', async () => {
                await this.handleInstallClick();
                this.hideInstallTeaser();
            });
        }

        // Dismiss teaser banner
        const dismissTeaser = document.getElementById('dismissInstallTeaser');
        if (dismissTeaser) {
            dismissTeaser.addEventListener('click', () => {
                this.hideInstallTeaser();
                this.trackInstallEvent('teaser_dismissed');
            });
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.updateInstallUI();
            this.trackInstallEvent('prompt_available');

            // Show teaser banner for first-time visitors on mobile
            if (this.shouldShowInstallTeaser()) {
                setTimeout(() => this.showInstallTeaser(), 3000);
            }
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.updateInstallUI();
            this.trackInstallEvent('installed');
            this.showToast('MessTrack installed successfully! 🎉');
        });

        // Initialize UI state
        this.updateInstallUI();
    }

    async handleInstallClick() {
        if (!this.deferredPrompt) {
            // Show guidance for iOS or already installed
            if (this.isIos()) {
                this.showToast('Use Share → Add to Home Screen');
            } else if (this.isStandalone()) {
                this.showToast('App is already installed!');
            }
            return;
        }

        this.trackInstallEvent('install_clicked');
        this.hapticFeedback('medium');

        try {
            this.deferredPrompt.prompt();
            const choice = await this.deferredPrompt.userChoice;

            if (choice && choice.outcome === 'accepted') {
                this.trackInstallEvent('install_accepted');
                this.showToast('Installing MessTrack... 📲');
            } else {
                this.trackInstallEvent('install_dismissed');
            }
        } catch (e) {
            console.error('Install error:', e);
        }

        this.deferredPrompt = null;
        this.updateInstallUI();
    }

    updateInstallUI() {
        const installBtn = document.getElementById('installAppBtn');
        const iosHint = document.getElementById('installIosHint');
        if (!installBtn || !iosHint) return;

        installBtn.classList.add('hidden');
        iosHint.classList.add('hidden');

        const isInstalled = this.isStandalone();

        if (isInstalled) {
            // Show "Open App" message
            installBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>App Installed';
            installBtn.classList.remove('hidden');
            installBtn.disabled = true;
            installBtn.style.opacity = '0.6';
            return;
        }

        // Not installed - show appropriate option
        installBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Install App';
        installBtn.disabled = false;
        installBtn.style.opacity = '1';

        if (this.deferredPrompt) {
            installBtn.classList.remove('hidden');
            return;
        }

        if (this.isIos()) {
            iosHint.classList.remove('hidden');
        }
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true
            || document.referrer.includes('android-app://');
    }

    isIos() {
        const ua = window.navigator.userAgent || '';
        const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
        return iOS && isSafari;
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (window.innerWidth <= 768);
    }

    // Install Analytics
    loadInstallAnalytics() {
        const data = localStorage.getItem('messtrack_install_analytics');
        return data ? JSON.parse(data) : {
            promptShown: 0,
            teaserShown: 0,
            teaserDismissed: 0,
            installClicked: 0,
            installAccepted: 0,
            installDismissed: 0,
            lastTeaserShown: null,
            firstVisit: Date.now()
        };
    }

    saveInstallAnalytics() {
        localStorage.setItem('messtrack_install_analytics', JSON.stringify(this.installAnalytics));
    }

    trackInstallEvent(event) {
        switch (event) {
            case 'prompt_available':
                this.installAnalytics.promptShown++;
                break;
            case 'teaser_shown':
                this.installAnalytics.teaserShown++;
                this.installAnalytics.lastTeaserShown = Date.now();
                break;
            case 'teaser_dismissed':
                this.installAnalytics.teaserDismissed++;
                break;
            case 'install_clicked':
                this.installAnalytics.installClicked++;
                break;
            case 'install_accepted':
                this.installAnalytics.installAccepted++;
                break;
            case 'install_dismissed':
                this.installAnalytics.installDismissed++;
                break;
            case 'installed':
                this.installAnalytics.installed = Date.now();
                break;
        }
        this.saveInstallAnalytics();
    }

    shouldShowInstallTeaser() {
        // Don't show if:
        // - Already installed
        // - Not mobile
        // - Teaser dismissed more than 2 times
        // - Shown in last 24 hours

        if (this.isStandalone()) return false;
        if (!this.isMobile()) return false;
        if (this.installAnalytics.teaserDismissed >= 3) return false;

        const lastShown = this.installAnalytics.lastTeaserShown;
        if (lastShown && (Date.now() - lastShown < 24 * 60 * 60 * 1000)) {
            return false; // Shown in last 24 hours
        }

        return true;
    }

    showInstallTeaser() {
        const teaser = document.getElementById('installTeaser');
        if (!teaser) return;

        this.trackInstallEvent('teaser_shown');
        teaser.classList.remove('hidden');

        // Animate in
        setTimeout(() => {
            teaser.style.transform = 'translateY(0)';
        }, 100);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideInstallTeaser();
        }, 10000);
    }

    hideInstallTeaser() {
        const teaser = document.getElementById('installTeaser');
        if (!teaser) return;

        teaser.style.transform = 'translateY(40px)';
        setTimeout(() => {
            teaser.classList.add('hidden');
        }, 500);
    }

    // ====================
    // Meal-Time Notifications
    // ====================
    setupMealNotifications() {
        // Clear existing intervals
        this.mealNotificationIntervals.forEach(id => clearInterval(id));
        this.mealNotificationIntervals = [];

        if (!this.data.settings.notifications) return;

        // Wait briefly for NotificationManager to initialize
        setTimeout(() => {
            if (window.notificationManager) {
                console.log('Using optimized NotificationManager');
                return;
            }

            // Fallback: Check every minute if it's meal time
            const checkInterval = setInterval(() => {
                this.checkMealTime();
            }, 60000); // Every minute

            this.mealNotificationIntervals.push(checkInterval);

            // Also check immediately
            this.checkMealTime();
        }, 1500);
    }

    checkMealTime() {
        if (!this.data.settings.notifications) return;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || { lunch: false, dinner: false };

        const lunchTime = this.data.settings.lunchTime || '12:00';
        const dinnerTime = this.data.settings.dinnerTime || '19:00';

        // Check if it's lunch time and not marked
        if (currentTime === lunchTime && !todayData.lunch) {
            this.sendMealNotification('lunch');
        }

        // Check if it's dinner time and not marked
        if (currentTime === dinnerTime && !todayData.dinner) {
            this.sendMealNotification('dinner');
        }
    }

    sendMealNotification(mealType) {
        const title = 'MessTrack Reminder';
        const body = mealType === 'lunch'
            ? '🍽️ It\'s lunch time! Don\'t forget to mark your attendance.'
            : '🌙 It\'s dinner time! Don\'t forget to mark your attendance.';
        const icon = 'icon-192.png';

        // Check last notification to avoid duplicates within same minute
        const lastNotifKey = `last_${mealType}_notification`;
        const lastNotif = localStorage.getItem(lastNotifKey);
        const now = Date.now();

        if (lastNotif && (now - parseInt(lastNotif) < 60000)) {
            return; // Already sent in last minute
        }

        localStorage.setItem(lastNotifKey, now.toString());

        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon,
                badge: icon,
                tag: `meal-${mealType}`,
                requireInteraction: false,
                vibrate: [200, 100, 200]
            });

            notification.onclick = () => {
                window.focus();
                this.showPage('dashboard');
                notification.close();
            };

            // Haptic feedback on mobile
            this.hapticFeedback('medium');
        } else {
            // Fallback to toast
            this.showToast(body);
        }
    }

    // ====================
    // GitHub Cloud Sync Functions
    // ====================

    async verifyAndSaveGitHubSettings() {
        try {
            const username = document.getElementById('ghUsername')?.value.trim();
            const repo = document.getElementById('ghRepo')?.value.trim();
            const token = document.getElementById('ghToken')?.value.trim();

            // Input validation with specific error messages
            if (!username) {
                this.showToast('⚠️ Please enter your GitHub username');
                document.getElementById('ghUsername')?.focus();
                return;
            }

            if (!repo) {
                this.showToast('⚠️ Please enter your repository name');
                document.getElementById('ghRepo')?.focus();
                return;
            }

            if (!token) {
                this.showToast('⚠️ Please enter your Personal Access Token');
                document.getElementById('ghToken')?.focus();
                return;
            }

            // Validate username format (GitHub username rules)
            if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
                this.showToast('⚠️ Invalid GitHub username format');
                return;
            }

            // Validate repo name format
            if (!/^[a-zA-Z0-9_.-]+$/.test(repo)) {
                this.showToast('⚠️ Invalid repository name format');
                return;
            }

            // Validate token format
            if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
                this.showToast('⚠️ Token should start with ghp_ or github_pat_');
                return;
            }

            // Test connection with loading indicator
            this.showToast('🔄 Testing GitHub connection...');

            // Add timeout for network requests
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.ok) {
                const repoData = await response.json();

                // Save credentials securely
                this.data.settings.github = {
                    username: username.toLowerCase(), // GitHub usernames are case-insensitive
                    repo,
                    token
                };
                this.saveData();

                // Show repo info
                this.showToast(`✅ Connected to ${repoData.full_name}!`);

                // Test write access
                const testResult = await this.testGitHubWrite();
                if (testResult) {
                    this.showToast('✅ GitHub sync ready! Monthly auto-backup enabled.');
                } else {
                    this.showToast('⚠️ Connected but write test failed. Check repo permissions.');
                }
            } else if (response.status === 404) {
                throw new Error('Repository not found. Create it first or check the name.');
            } else if (response.status === 401) {
                throw new Error('Invalid token. Generate a new one with repo scope.');
            } else if (response.status === 403) {
                const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                if (rateLimitRemaining === '0') {
                    throw new Error('GitHub API rate limit exceeded. Try again later.');
                }
                throw new Error('Access forbidden. Check token permissions.');
            } else {
                throw new Error(`Connection failed (${response.status}). Try again.`);
            }
        } catch (error) {
            console.error('GitHub connection error:', error);

            if (error.name === 'AbortError') {
                this.showToast('❌ Connection timeout. Check your internet.');
            } else if (error.message.includes('fetch')) {
                this.showToast('❌ Network error. Check your connection.');
            } else {
                this.showToast(`❌ ${error.message}`);
            }
        }
    }

    async testGitHubWrite() {
        const { username, repo, token } = this.data.settings.github;
        if (!token) return false;

        try {
            const testPath = 'messtrack-test.json';
            const testContent = { test: true, timestamp: new Date().toISOString() };

            await this.uploadToGitHub(testPath, testContent, 'MessTrack connection test');

            // Delete test file
            const url = `https://api.github.com/repos/${username}/${repo}/contents/${testPath}`;
            const getResponse = await fetch(url, {
                headers: { 'Authorization': `token ${token}` }
            });

            if (getResponse.ok) {
                const data = await getResponse.json();
                await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Clean up test file',
                        sha: data.sha
                    })
                });
            }

            return true;
        } catch (error) {
            console.error('Write test failed:', error);
            return false;
        }
    }

    async uploadToGitHub(path, content, message, retries = 3) {
        const { username, repo, token } = this.data.settings.github;

        // Validation
        if (!token || !username || !repo) {
            console.log('GitHub not configured properly');
            return false;
        }

        const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;

        // Retry logic with exponential backoff
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Add timeout for all requests
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                // 1. Check if file exists to get SHA (required for updates)
                let sha = null;

                try {
                    const checkResponse = await fetch(url, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'X-GitHub-Api-Version': '2022-11-28'
                        },
                        signal: controller.signal
                    });

                    if (checkResponse.ok) {
                        const data = await checkResponse.json();
                        sha = data.sha;
                        console.log(`File exists, will update with SHA`);
                    } else if (checkResponse.status === 404) {
                        console.log('File does not exist, will create new');
                    } else {
                        // Handle rate limiting
                        if (checkResponse.status === 403) {
                            const remaining = checkResponse.headers.get('X-RateLimit-Remaining');
                            if (remaining === '0') {
                                const resetTime = checkResponse.headers.get('X-RateLimit-Reset');
                                const waitTime = resetTime ? new Date(resetTime * 1000) : 'later';
                                throw new Error(`Rate limit exceeded. Try again ${waitTime}`);
                            }
                        }
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.warn('Error checking file existence:', e);
                    }
                    // Continue anyway - we'll try to create new file
                }

                clearTimeout(timeout);

                // 2. Prepare payload with optimized encoding
                const contentString = JSON.stringify(content, null, 2);

                // Check content size (GitHub has limits)
                if (contentString.length > 1000000) { // 1MB limit for API
                    throw new Error('Content too large for GitHub API');
                }

                // Encode to Base64 (handles Unicode properly)
                const contentEncoded = btoa(unescape(encodeURIComponent(contentString)));

                const body = {
                    message: message || `Update MessTrack data - ${new Date().toLocaleDateString()}`,
                    content: contentEncoded,
                    ...(sha && { sha }) // Add SHA if updating existing file
                };

                // 3. Upload to GitHub with retry
                const uploadTimeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout for upload

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(uploadTimeout);

                if (response.ok) {
                    const result = await response.json();
                    console.log('Successfully synced to GitHub:', path);

                    // Show success with file link
                    if (result.content?.html_url) {
                        this.showToast('☁️ Synced to GitHub successfully!');
                    } else {
                        this.showToast('☁️ Data backed up to GitHub!');
                    }

                    // Cache successful upload
                    this.lastSuccessfulUpload = {
                        path,
                        timestamp: Date.now(),
                        sha: result.content?.sha
                    };

                    return true;

                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `Upload failed (${response.status})`;

                    // Check if we should retry
                    if (response.status === 409) { // Conflict
                        console.log('Conflict detected, will retry with fresh SHA');
                        sha = null; // Clear SHA and retry
                    } else if (response.status >= 500 || response.status === 429) {
                        // Server error or rate limit - retry
                        if (attempt < retries) {
                            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                            console.log(`Retry attempt ${attempt} after ${waitTime}ms`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue; // Retry
                        }
                    }

                    throw new Error(errorMessage);
                }

            } catch (error) {
                console.error(`GitHub Sync Error (attempt ${attempt}/${retries}):`, error);

                if (error.name === 'AbortError') {
                    if (attempt < retries) {
                        console.log('Timeout, retrying...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue; // Retry
                    }
                    this.showToast('❌ GitHub sync timeout. Check your connection.');
                } else if (attempt === retries) {
                    // Final attempt failed
                    this.showToast(`❌ Sync failed: ${error.message.substring(0, 50)}`);
                }

                if (attempt === retries) {
                    return false; // All retries exhausted
                }
            }
        }

        return false; // Should not reach here
    }

    async syncMonthToGitHub(monthKey, summary, attendance) {
        // Create a clean export object for the month
        const monthData = {
            month: monthKey,
            generatedAt: new Date().toISOString(),
            appVersion: this.appVersion,
            summary: {
                lunchCount: summary.lunchCount,
                dinnerCount: summary.dinnerCount,
                totalDays: summary.totalDays,
                attendancePercentage: summary.percentage
            },
            dailyRecords: attendance,
            notes: {}
        };

        // Include notes for this month if they exist
        Object.keys(this.data.notes).forEach(date => {
            if (date.startsWith(monthKey)) {
                monthData.notes[date] = this.data.notes[date];
            }
        });

        const path = `data/${monthKey}.json`;
        const message = `📊 Auto-archive mess attendance data for ${monthKey}`;

        console.log(`Syncing month ${monthKey} to GitHub...`);
        await this.uploadToGitHub(path, monthData, message);
    }

    // Manual sync trigger (for current month backup)
    async manualSyncCurrentMonth() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        const summary = this.getCurrentMonthSummary();

        // Get current month attendance
        const monthAttendance = {};
        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                monthAttendance[date] = meals;
            }
        });

        if (Object.keys(monthAttendance).length === 0) {
            this.showToast('⚠️ No attendance data for current month');
            return;
        }

        this.showToast('🔄 Syncing current month to GitHub...');
        await this.syncMonthToGitHub(monthKey, summary, monthAttendance);
    }

    // Open GitHub repository in new tab
    openGitHubRepository() {
        const { username, repo } = this.data.settings.github;

        if (!username || !repo) {
            this.showToast('⚠️ Please configure GitHub settings first');
            return;
        }

        const url = `https://github.com/${username}/${repo}`;
        window.open(url, '_blank');
        this.showToast('🌐 Opening repository in new tab...');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.messTrack = new MessTrack();
});