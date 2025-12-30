// 💾 Backup Manager for MessTrack
// Automatic backup reminders and data safety system

class BackupManager {
    constructor(messTrackApp) {
        this.app = messTrackApp;
        this.lastBackupDate = null;
        this.backupFrequency = 7; // days
        this.autoBackupEnabled = true;
        this.backupHistory = [];
        
        this.init();
    }

    init() {
        this.loadBackupSettings();
        this.checkBackupStatus();
        this.scheduleBackupReminders();
        this.setupEventListeners();
    }

    loadBackupSettings() {
        try {
            const settings = localStorage.getItem('messtrack_backup_settings');
            if (settings) {
                const data = JSON.parse(settings);
                this.lastBackupDate = data.lastBackupDate;
                this.backupFrequency = data.backupFrequency || 7;
                this.autoBackupEnabled = data.autoBackupEnabled !== false;
                this.backupHistory = data.backupHistory || [];
            }
        } catch (e) {
            console.error('Failed to load backup settings:', e);
        }
    }

    saveBackupSettings() {
        try {
            localStorage.setItem('messtrack_backup_settings', JSON.stringify({
                lastBackupDate: this.lastBackupDate,
                backupFrequency: this.backupFrequency,
                autoBackupEnabled: this.autoBackupEnabled,
                backupHistory: this.backupHistory.slice(-10) // Keep last 10 backups
            }));
        } catch (e) {
            console.error('Failed to save backup settings:', e);
        }
    }

    setupEventListeners() {
        // Backup frequency selector
        const backupFrequencySelect = document.getElementById('backupFrequency');
        if (backupFrequencySelect) {
            backupFrequencySelect.value = this.backupFrequency;
            backupFrequencySelect.addEventListener('change', (e) => {
                this.backupFrequency = parseInt(e.target.value);
                this.saveBackupSettings();
                this.app.showToast(`✅ Backup frequency set to ${this.backupFrequency} days`);
            });
        }

        // Auto backup toggle
        const autoBackupToggle = document.getElementById('autoBackupToggle');
        if (autoBackupToggle) {
            autoBackupToggle.checked = this.autoBackupEnabled;
            autoBackupToggle.addEventListener('change', (e) => {
                this.autoBackupEnabled = e.target.checked;
                this.saveBackupSettings();
                if (e.target.checked) {
                    this.app.showToast('✅ Auto-backup enabled');
                    this.scheduleBackupReminders();
                } else {
                    this.app.showToast('🔕 Auto-backup disabled');
                }
            });
        }

        // Manual backup button
        const manualBackupBtn = document.getElementById('manualBackupBtn');
        if (manualBackupBtn) {
            manualBackupBtn.addEventListener('click', () => {
                this.createBackup('manual');
            });
        }
    }

    // Check if backup is needed
    checkBackupStatus() {
        if (!this.autoBackupEnabled) return;

        const daysSinceBackup = this.getDaysSinceLastBackup();
        
        if (daysSinceBackup >= this.backupFrequency) {
            this.showBackupReminder(daysSinceBackup);
        } else if (daysSinceBackup >= this.backupFrequency - 1) {
            // Show gentle reminder 1 day before
            this.showGentleReminder();
        }

        // Update backup status in UI
        this.updateBackupStatusUI();
    }

    // Get days since last backup
    getDaysSinceLastBackup() {
        if (!this.lastBackupDate) return 999; // Never backed up
        
        const lastBackup = new Date(this.lastBackupDate);
        const now = new Date();
        const diffTime = Math.abs(now - lastBackup);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    // Show backup reminder
    showBackupReminder(daysSinceBackup) {
        const message = daysSinceBackup > 30 
            ? `⚠️ Last backup was ${daysSinceBackup} days ago! Your data is at risk.`
            : `💾 Time to backup! Last backup: ${daysSinceBackup} days ago.`;

        // Show persistent banner
        this.showBackupBanner(message, daysSinceBackup);

        // Also show notification if enabled
        if (window.notificationManager && window.notificationManager.permission === 'granted') {
            window.notificationManager.showNotification({
                title: '💾 Backup Reminder',
                body: message,
                tag: 'backup-reminder',
                requireInteraction: true,
                action: () => {
                    this.app.showPage('settings');
                }
            });
        }
    }

    // Show gentle reminder
    showGentleReminder() {
        const banner = document.createElement('div');
        banner.id = 'gentleBackupReminder';
        banner.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50';
        banner.innerHTML = `
            <div class="glass p-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
                <i class="fas fa-info-circle text-blue-400"></i>
                <span class="text-sm">Backup reminder: Tomorrow is backup day!</span>
                <button onclick="this.closest('#gentleBackupReminder').remove()" class="text-xs opacity-60 hover:opacity-100">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            banner.style.animation = 'slideUp 0.4s ease-in';
            setTimeout(() => banner.remove(), 400);
        }, 10000);
    }

    // Show backup banner
    showBackupBanner(message, daysSinceBackup) {
        // Remove existing banner
        const existing = document.getElementById('backupReminderBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'backupReminderBanner';
        banner.className = 'fixed top-0 left-0 right-0 z-50';
        
        const urgencyClass = daysSinceBackup > 30 ? 'bg-red-500' : daysSinceBackup > 14 ? 'bg-orange-500' : 'bg-blue-500';
        
        banner.innerHTML = `
            <div class="${urgencyClass} bg-opacity-90 backdrop-blur-lg p-4 shadow-lg">
                <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-exclamation-triangle text-2xl"></i>
                        <div>
                            <div class="font-bold">${message}</div>
                            <div class="text-sm opacity-90">Protect your data by creating a backup now.</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.backupManager.createBackup('reminder'); this.closest('#backupReminderBanner').remove();" 
                                class="btn-glass px-4 py-2 font-bold bg-white bg-opacity-20 hover:bg-opacity-30">
                            💾 Backup Now
                        </button>
                        <button onclick="window.backupManager.snoozeReminder(); this.closest('#backupReminderBanner').remove();" 
                                class="btn-glass px-3 py-2 opacity-80 hover:opacity-100">
                            Remind Later
                        </button>
                        <button onclick="this.closest('#backupReminderBanner').remove();" 
                                class="btn-glass px-3 py-2 opacity-60 hover:opacity-100">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Animate in
        banner.style.animation = 'slideDown 0.4s ease-out';
    }

    // Snooze reminder
    snoozeReminder() {
        // Snooze for 1 day
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.lastBackupDate = tomorrow.toISOString();
        this.saveBackupSettings();
        this.app.showToast('⏰ Reminder snoozed for 1 day');
    }

    // Create backup
    async createBackup(source = 'manual') {
        try {
            const backupData = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                source: source,
                data: {
                    attendance: this.app.data.attendance,
                    notes: this.app.data.notes,
                    summaries: this.app.data.summaries,
                    settings: this.app.data.settings
                },
                stats: this.getBackupStats()
            };

            // Create JSON file
            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const filename = `messtrack-backup-${new Date().toISOString().split('T')[0]}.json`;
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(url);

            // Update backup date
            this.lastBackupDate = new Date().toISOString();
            
            // Add to history
            this.backupHistory.push({
                date: this.lastBackupDate,
                source: source,
                filename: filename,
                size: blob.size,
                recordCount: Object.keys(this.app.data.attendance).length
            });

            this.saveBackupSettings();
            this.updateBackupStatusUI();

            // Remove banner if exists
            const banner = document.getElementById('backupReminderBanner');
            if (banner) banner.remove();

            this.app.showToast('✅ Backup created successfully!');

            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            this.app.showToast('❌ Backup failed. Please try again.');
            return false;
        }
    }

    // Get backup statistics
    getBackupStats() {
        const attendance = this.app.data.attendance;
        const totalDays = Object.keys(attendance).length;
        let lunchCount = 0;
        let dinnerCount = 0;

        Object.values(attendance).forEach(day => {
            if (day.lunch) lunchCount++;
            if (day.dinner) dinnerCount++;
        });

        return {
            totalDays,
            lunchCount,
            dinnerCount,
            totalMeals: lunchCount + dinnerCount,
            notesCount: Object.keys(this.app.data.notes || {}).length,
            summariesCount: Object.keys(this.app.data.summaries || {}).length
        };
    }

    // Update backup status UI
    updateBackupStatusUI() {
        const statusEl = document.getElementById('backupStatus');
        if (!statusEl) return;

        const daysSince = this.getDaysSinceLastBackup();
        
        let statusHTML = '';
        let statusClass = '';

        if (daysSince === 999) {
            statusHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-exclamation-circle text-red-400"></i>
                    <span>Never backed up</span>
                </div>
            `;
            statusClass = 'text-red-400';
        } else if (daysSince > 30) {
            statusHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle text-red-400"></i>
                    <span>${daysSince} days ago - Urgent!</span>
                </div>
            `;
            statusClass = 'text-red-400';
        } else if (daysSince > 14) {
            statusHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle text-orange-400"></i>
                    <span>${daysSince} days ago - Soon</span>
                </div>
            `;
            statusClass = 'text-orange-400';
        } else if (daysSince > 7) {
            statusHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-info-circle text-yellow-400"></i>
                    <span>${daysSince} days ago</span>
                </div>
            `;
            statusClass = 'text-yellow-400';
        } else {
            statusHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-400"></i>
                    <span>${daysSince} day${daysSince !== 1 ? 's' : ''} ago - Good!</span>
                </div>
            `;
            statusClass = 'text-green-400';
        }

        statusEl.innerHTML = statusHTML;
        statusEl.className = `${statusClass} font-bold`;

        // Update last backup date
        const lastBackupEl = document.getElementById('lastBackupDate');
        if (lastBackupEl && this.lastBackupDate) {
            const date = new Date(this.lastBackupDate);
            lastBackupEl.textContent = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Update backup history
        this.updateBackupHistoryUI();
    }

    // Update backup history UI
    updateBackupHistoryUI() {
        const historyEl = document.getElementById('backupHistory');
        if (!historyEl) return;

        if (this.backupHistory.length === 0) {
            historyEl.innerHTML = '<p class="text-sm opacity-60">No backup history yet</p>';
            return;
        }

        const recentBackups = this.backupHistory.slice(-5).reverse();
        
        historyEl.innerHTML = recentBackups.map(backup => {
            const date = new Date(backup.date);
            const sizeKB = (backup.size / 1024).toFixed(1);
            
            return `
                <div class="glass p-3 rounded-lg flex items-center justify-between text-sm">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-file-archive text-blue-400"></i>
                        <div>
                            <div class="font-bold">${backup.filename}</div>
                            <div class="text-xs opacity-60">
                                ${date.toLocaleDateString()} • ${sizeKB} KB • ${backup.recordCount} records
                            </div>
                        </div>
                    </div>
                    <span class="text-xs opacity-60 capitalize">${backup.source}</span>
                </div>
            `;
        }).join('');
    }

    // Schedule backup reminders
    scheduleBackupReminders() {
        // Check daily at 9 AM
        const checkInterval = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 9 && now.getMinutes() === 0) {
                this.checkBackupStatus();
            }
        }, 60000); // Check every minute

        // Also check on app load
        setTimeout(() => this.checkBackupStatus(), 2000);
    }

    // Import backup
    async importBackup(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            // Validate backup
            if (!backupData.data || !backupData.version) {
                throw new Error('Invalid backup file');
            }

            // Confirm import
            if (!confirm(`Import backup from ${new Date(backupData.timestamp).toLocaleDateString()}?\n\nThis will replace all current data!`)) {
                return false;
            }

            // Import data
            this.app.data.attendance = backupData.data.attendance || {};
            this.app.data.notes = backupData.data.notes || {};
            this.app.data.summaries = backupData.data.summaries || {};
            this.app.data.settings = { ...this.app.data.settings, ...backupData.data.settings };

            this.app.saveData();
            this.app.updateDashboard();

            this.app.showToast('✅ Backup imported successfully!');
            
            // Record undo action
            if (window.undoManager) {
                window.undoManager.clearHistory(); // Clear undo history after import
            }

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            this.app.showToast('❌ Failed to import backup. Invalid file.');
            return false;
        }
    }

    // Get backup recommendations
    getBackupRecommendations() {
        const daysSince = this.getDaysSinceLastBackup();
        const recordCount = Object.keys(this.app.data.attendance).length;

        const recommendations = [];

        if (daysSince > 30) {
            recommendations.push({
                priority: 'urgent',
                message: 'Create a backup immediately! Your data is at high risk.',
                action: 'backup'
            });
        } else if (daysSince > 14) {
            recommendations.push({
                priority: 'high',
                message: 'Backup recommended soon to protect your data.',
                action: 'backup'
            });
        }

        if (recordCount > 100 && daysSince > 7) {
            recommendations.push({
                priority: 'medium',
                message: 'You have significant data. Regular backups are important.',
                action: 'enable-auto'
            });
        }

        if (!this.autoBackupEnabled) {
            recommendations.push({
                priority: 'medium',
                message: 'Enable auto-backup reminders for peace of mind.',
                action: 'enable-auto'
            });
        }

        return recommendations;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.messTrack) {
            window.backupManager = new BackupManager(window.messTrack);
            console.log('✅ Backup Manager initialized');
        }
    }, 1000);
});
