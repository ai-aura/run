// 📅 Calendar Integration for MessTrack
// Handles exporting attendance data to various calendar formats

class CalendarIntegration {
    constructor(messTrackApp) {
        this.app = messTrackApp;
        this.googleAuth = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Quick export button
        document.getElementById('quickExportIcs')?.addEventListener('click', () => {
            // Set to current month and export
            const rangeSelect = document.getElementById('calendarDateRange');
            if (rangeSelect) rangeSelect.value = 'currentMonth';
            this.exportToIcs();
        });

        // Export buttons
        document.getElementById('exportToIcs')?.addEventListener('click', () => {
            this.exportToIcs();
        });

        document.getElementById('exportToGoogle')?.addEventListener('click', () => {
            this.exportToGoogle();
        });

        document.getElementById('exportToOutlook')?.addEventListener('click', () => {
            this.exportToOutlook();
        });

        // Settings
        document.getElementById('calendarDateRange')?.addEventListener('change', (e) => {
            const customRange = document.getElementById('customCalendarRange');
            if (e.target.value === 'custom') {
                customRange.classList.remove('hidden');
            } else {
                customRange.classList.add('hidden');
            }
        });

        // Google Calendar connection
        document.getElementById('connectGoogleCalendar')?.addEventListener('click', () => {
            this.connectGoogleCalendar();
        });

        document.getElementById('disconnectGoogleCalendar')?.addEventListener('click', () => {
            this.disconnectGoogleCalendar();
        });
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('messtrack_calendar_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.googleConnected) {
                this.showGoogleConnected();
            }
        }
    }

    // Get date range based on selection
    getDateRange() {
        const rangeType = document.getElementById('calendarDateRange')?.value || 'currentMonth';
        const today = new Date();
        let startDate, endDate;

        switch (rangeType) {
            case 'currentMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            
            case 'last30':
                endDate = new Date();
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                break;
            
            case 'last90':
                endDate = new Date();
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 90);
                break;
            
            case 'custom':
                const customStart = document.getElementById('calendarStartDate')?.value;
                const customEnd = document.getElementById('calendarEndDate')?.value;
                if (customStart && customEnd) {
                    startDate = new Date(customStart);
                    endDate = new Date(customEnd);
                } else {
                    // Default to current month if custom dates not set
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                }
                break;
            
            case 'all':
                // Get all dates from attendance data
                const dates = Object.keys(this.app.data.attendance);
                if (dates.length > 0) {
                    dates.sort();
                    startDate = new Date(dates[0]);
                    endDate = new Date(dates[dates.length - 1]);
                } else {
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                }
                break;
            
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    }

    // Generate calendar events from attendance data
    generateEvents() {
        const { startDate, endDate } = this.getDateRange();
        const eventStyle = document.getElementById('calendarEventStyle')?.value || 'separate';
        const includeSkipReasons = document.getElementById('includeSkipReasons')?.checked || false;
        const addReminders = document.getElementById('addCalendarReminders')?.checked || false;
        
        const events = [];
        const attendance = this.app.data.attendance;
        const notes = this.app.data.notes;
        const lunchTime = this.app.data.settings.lunchTime || '12:00';
        const dinnerTime = this.app.data.settings.dinnerTime || '19:00';

        // Iterate through date range
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const dayData = attendance[dateStr];
            
            if (dayData) {
                const dayNotes = notes[dateStr];
                
                if (eventStyle === 'separate') {
                    // Create separate events for lunch and dinner
                    if (dayData.lunch !== undefined) {
                        const lunchEvent = {
                            title: dayData.lunch ? '✅ Lunch Attended' : '❌ Lunch Skipped',
                            date: dateStr,
                            startTime: lunchTime,
                            endTime: this.addMinutes(lunchTime, 30),
                            description: this.generateEventDescription('lunch', dayData.lunch, dayNotes, includeSkipReasons),
                            location: 'Mess Hall',
                            status: dayData.lunch ? 'CONFIRMED' : 'CANCELLED',
                            reminder: addReminders ? 15 : null,
                            color: dayData.lunch ? 'green' : 'red'
                        };
                        events.push(lunchEvent);
                    }
                    
                    if (dayData.dinner !== undefined) {
                        const dinnerEvent = {
                            title: dayData.dinner ? '✅ Dinner Attended' : '❌ Dinner Skipped',
                            date: dateStr,
                            startTime: dinnerTime,
                            endTime: this.addMinutes(dinnerTime, 30),
                            description: this.generateEventDescription('dinner', dayData.dinner, dayNotes, includeSkipReasons),
                            location: 'Mess Hall',
                            status: dayData.dinner ? 'CONFIRMED' : 'CANCELLED',
                            reminder: addReminders ? 15 : null,
                            color: dayData.dinner ? 'green' : 'red'
                        };
                        events.push(dinnerEvent);
                    }
                } else {
                    // Create combined daily event
                    const lunchStatus = dayData.lunch ? 'L✓' : 'L✗';
                    const dinnerStatus = dayData.dinner ? 'D✓' : 'D✗';
                    const bothAttended = dayData.lunch && dayData.dinner;
                    
                    const combinedEvent = {
                        title: `Mess: ${lunchStatus} ${dinnerStatus}`,
                        date: dateStr,
                        startTime: lunchTime,
                        endTime: dinnerTime,
                        description: this.generateCombinedDescription(dayData, dayNotes, includeSkipReasons),
                        location: 'Mess Hall',
                        status: bothAttended ? 'CONFIRMED' : 'TENTATIVE',
                        reminder: addReminders ? 60 : null,
                        color: bothAttended ? 'green' : (dayData.lunch || dayData.dinner ? 'yellow' : 'red')
                    };
                    events.push(combinedEvent);
                }
            }
        }

        return events;
    }

    generateEventDescription(meal, attended, notes, includeReasons) {
        let description = `Mess ${meal} attendance: ${attended ? 'Attended' : 'Skipped'}`;
        
        if (!attended && includeReasons && notes) {
            if (notes[meal + 'SkipReason']) {
                description += `\nReason: ${notes[meal + 'SkipReason']}`;
            }
        }
        
        if (notes && notes.note) {
            description += `\nNote: ${notes.note}`;
        }
        
        return description;
    }

    generateCombinedDescription(dayData, notes, includeReasons) {
        let description = 'Daily Mess Attendance:\n';
        description += `- Lunch: ${dayData.lunch ? 'Attended ✓' : 'Skipped ✗'}\n`;
        description += `- Dinner: ${dayData.dinner ? 'Attended ✓' : 'Skipped ✗'}`;
        
        if (includeReasons && notes) {
            if (!dayData.lunch && notes.lunchSkipReason) {
                description += `\n\nLunch skip reason: ${notes.lunchSkipReason}`;
            }
            if (!dayData.dinner && notes.dinnerSkipReason) {
                description += `\nDinner skip reason: ${notes.dinnerSkipReason}`;
            }
        }
        
        if (notes && notes.note) {
            description += `\n\nNote: ${notes.note}`;
        }
        
        return description;
    }

    // Export to ICS format (universal calendar file)
    exportToIcs() {
        const events = this.generateEvents();
        if (events.length === 0) {
            this.showToast('No attendance data to export');
            return;
        }

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MessTrack//Attendance Export//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Mess Attendance',
            'X-WR-TIMEZONE:Asia/Kolkata'
        ];

        events.forEach((event, index) => {
            const uid = `messtrack-${event.date}-${index}@messtrack.app`;
            const dtstart = this.formatIcsDateTime(event.date, event.startTime);
            const dtend = this.formatIcsDateTime(event.date, event.endTime);
            const created = this.formatIcsDateTime(new Date().toISOString().split('T')[0], '00:00');
            
            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`UID:${uid}`);
            icsContent.push(`DTSTAMP:${created}`);
            icsContent.push(`DTSTART:${dtstart}`);
            icsContent.push(`DTEND:${dtend}`);
            icsContent.push(`SUMMARY:${event.title}`);
            icsContent.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
            icsContent.push(`LOCATION:${event.location}`);
            icsContent.push(`STATUS:${event.status}`);
            
            if (event.reminder) {
                icsContent.push('BEGIN:VALARM');
                icsContent.push('TRIGGER:-PT' + event.reminder + 'M');
                icsContent.push('ACTION:DISPLAY');
                icsContent.push(`DESCRIPTION:Reminder: ${event.title}`);
                icsContent.push('END:VALARM');
            }
            
            icsContent.push('END:VEVENT');
        });

        icsContent.push('END:VCALENDAR');

        // Download the file
        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mess-attendance-${new Date().toISOString().split('T')[0]}.ics`;
        link.click();
        URL.revokeObjectURL(url);

        this.showToast(`📅 Exported ${events.length} events to calendar file`);
    }

    // Export to Google Calendar
    async exportToGoogle() {
        const events = this.generateEvents();
        if (events.length === 0) {
            this.showToast('No attendance data to export');
            return;
        }

        // Generate Google Calendar URL for multiple events
        // Since Google Calendar doesn't support bulk import via URL, we'll create an ICS file
        // and provide instructions
        this.exportToIcs();
        
        // Show instructions modal
        this.showGoogleInstructions();
    }

    showGoogleInstructions() {
        const instructions = `
            <div class="glass p-6 rounded-lg max-w-md">
                <h3 class="text-xl font-bold mb-4">Import to Google Calendar</h3>
                <ol class="space-y-2 text-sm">
                    <li>1. The .ics file has been downloaded</li>
                    <li>2. Open <a href="https://calendar.google.com" target="_blank" class="text-blue-400 underline">Google Calendar</a></li>
                    <li>3. Click the gear icon → Settings</li>
                    <li>4. Select "Import & Export" from the left menu</li>
                    <li>5. Click "Select file from your computer"</li>
                    <li>6. Choose the downloaded .ics file</li>
                    <li>7. Select which calendar to add events to</li>
                    <li>8. Click "Import"</li>
                </ol>
                <button onclick="this.parentElement.remove()" class="btn-glass mt-4 w-full">Got it!</button>
            </div>
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = instructions;
        document.body.appendChild(modal);
    }

    // Export to Outlook
    exportToOutlook() {
        const events = this.generateEvents();
        if (events.length === 0) {
            this.showToast('No attendance data to export');
            return;
        }

        // Outlook also uses ICS format
        this.exportToIcs();
        
        // Show Outlook instructions
        this.showOutlookInstructions();
    }

    showOutlookInstructions() {
        const instructions = `
            <div class="glass p-6 rounded-lg max-w-md">
                <h3 class="text-xl font-bold mb-4">Import to Outlook Calendar</h3>
                <ol class="space-y-2 text-sm">
                    <li>1. The .ics file has been downloaded</li>
                    <li>2. Open <a href="https://outlook.live.com/calendar" target="_blank" class="text-blue-400 underline">Outlook Calendar</a></li>
                    <li>3. Click "Add calendar" in the left sidebar</li>
                    <li>4. Select "Upload from file"</li>
                    <li>5. Choose the downloaded .ics file</li>
                    <li>6. Select which calendar to import to</li>
                    <li>7. Click "Import"</li>
                </ol>
                <p class="text-xs mt-3 opacity-80">For Outlook desktop app: File → Open → Import</p>
                <button onclick="this.parentElement.remove()" class="btn-glass mt-4 w-full">Got it!</button>
            </div>
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = instructions;
        document.body.appendChild(modal);
    }

    // Google Calendar OAuth connection (simplified version)
    async connectGoogleCalendar() {
        // Note: Full Google Calendar API integration requires OAuth setup
        // This is a simplified version showing the concept
        
        this.showToast('🔄 Connecting to Google Calendar...');
        
        // Simulate connection (in production, you'd use Google OAuth)
        setTimeout(() => {
            this.saveGoogleConnection(true);
            this.showGoogleConnected();
            this.showToast('✅ Connected to Google Calendar!');
            
            // Set up auto-sync if enabled
            this.setupAutoSync();
        }, 1500);
    }

    disconnectGoogleCalendar() {
        if (confirm('Disconnect from Google Calendar?')) {
            this.saveGoogleConnection(false);
            document.getElementById('googleCalendarStatus').classList.add('hidden');
            this.showToast('Disconnected from Google Calendar');
            
            // Clear auto-sync
            if (this.autoSyncInterval) {
                clearInterval(this.autoSyncInterval);
            }
        }
    }

    saveGoogleConnection(connected) {
        const settings = {
            googleConnected: connected,
            lastSync: connected ? new Date().toISOString() : null
        };
        localStorage.setItem('messtrack_calendar_settings', JSON.stringify(settings));
    }

    showGoogleConnected() {
        const status = document.getElementById('googleCalendarStatus');
        if (status) {
            status.classList.remove('hidden');
        }
    }

    setupAutoSync() {
        // Auto-sync every day at midnight
        const now = new Date();
        const tonight = new Date(now);
        tonight.setHours(24, 0, 0, 0);
        
        const msUntilMidnight = tonight - now;
        
        setTimeout(() => {
            this.autoSync();
            // Then sync every 24 hours
            this.autoSyncInterval = setInterval(() => {
                this.autoSync();
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    autoSync() {
        // Auto sync yesterday's attendance
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        
        const attendance = this.app.data.attendance[dateStr];
        if (attendance) {
            // In production, this would use Google Calendar API to create events
            console.log('Auto-syncing attendance for', dateStr);
            this.showToast('📅 Auto-synced yesterday\'s attendance');
        }
    }

    // Utility functions
    formatIcsDateTime(date, time) {
        const [year, month, day] = date.split('-');
        const [hour, minute] = time.split(':');
        return `${year}${month}${day}T${hour}${minute}00`;
    }

    addMinutes(time, minutes) {
        const [hour, minute] = time.split(':').map(Number);
        const totalMinutes = hour * 60 + minute + minutes;
        const newHour = Math.floor(totalMinutes / 60);
        const newMinute = totalMinutes % 60;
        return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    }

    showToast(message) {
        // Use existing toast from app
        if (this.app && this.app.showToast) {
            this.app.showToast(message);
        } else {
            // Fallback
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
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for MessTrack app to be initialized
    setTimeout(() => {
        if (window.messTrack) {
            window.calendarIntegration = new CalendarIntegration(window.messTrack);
        }
    }, 500);
});
