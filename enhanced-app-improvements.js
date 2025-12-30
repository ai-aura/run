// 🔧 Enhanced App Improvements for MessTrack
// Comprehensive improvements for core application functions

(function() {
    'use strict';

    // Wait for dependencies
    if (!window.EnhancedUtils || !window.EnhancedDataManager) {
        console.error('Enhanced dependencies not loaded');
        return;
    }

    // ==========================================
    // ENHANCED ATTENDANCE MANAGER
    // ==========================================
    
    class EnhancedAttendanceManager {
        constructor(app) {
            this.app = app;
            this.cache = new Map();
            this.pendingUpdates = new Set();
            this.conflictResolver = new ConflictResolver();
            
            // Memoize expensive calculations
            this.calculateStats = window.EnhancedUtils.memoize(
                this._calculateStats.bind(this),
                { ttl: 30000, maxSize: 50 }
            );
        }
        
        // Enhanced mark attendance with validation and conflict resolution
        async markAttendance(type, date = null, options = {}) {
            const {
                skipValidation = false,
                skipUndo = false,
                batch = false
            } = options;
            
            try {
                // Validate input
                if (!skipValidation) {
                    if (!['lunch', 'dinner'].includes(type)) {
                        throw new Error(`Invalid meal type: ${type}`);
                    }
                }
                
                const targetDate = date || this.app.getTodayString();
                
                // Validate date format
                if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                    throw new Error(`Invalid date format: ${targetDate}`);
                }
                
                // Initialize attendance if needed
                if (!this.app.data.attendance[targetDate]) {
                    this.app.data.attendance[targetDate] = {
                        lunch: false,
                        dinner: false
                    };
                }
                
                // Store previous state
                const previousState = this.app.data.attendance[targetDate][type];
                
                // Toggle attendance
                this.app.data.attendance[targetDate][type] = !previousState;
                
                // Record for undo
                if (!skipUndo && window.undoManager) {
                    window.undoManager.recordAction({
                        type: !previousState ? 'mark_attendance' : 'unmark_attendance',
                        data: {
                            date: targetDate,
                            mealType: type,
                            previousState: previousState
                        }
                    });
                }
                
                // Save data
                if (!batch) {
                    await window.EnhancedDataManager.save(
                        'messtrack_attendance',
                        this.app.data.attendance,
                        { compress: true }
                    );
                }
                
                // Clear cache
                this.cache.clear();
                
                // Update UI
                if (!batch) {
                    requestAnimationFrame(() => {
                        this.app.updateDashboard();
                    });
                }
                
                // Haptic feedback
                if ('vibrate' in navigator) {
                    navigator.vibrate(20);
                }
                
                // Track analytics
                this.trackEvent('attendance_marked', {
                    meal: type,
                    date: targetDate,
                    state: !previousState
                });
                
                return {
                    success: true,
                    date: targetDate,
                    type,
                    newState: !previousState
                };
                
            } catch (error) {
                window.EnhancedErrorHandler.handle(error, {
                    type: 'attendance_mark_error',
                    mealType: type,
                    date: date
                });
                
                this.app.showToast('❌ Failed to mark attendance. Please try again.');
                
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        // Batch mark attendance for multiple dates
        async batchMarkAttendance(updates) {
            const results = [];
            
            try {
                for (const update of updates) {
                    const result = await this.markAttendance(
                        update.type,
                        update.date,
                        { batch: true, skipUndo: true }
                    );
                    results.push(result);
                }
                
                // Save once after all updates
                await window.EnhancedDataManager.save(
                    'messtrack_attendance',
                    this.app.data.attendance,
                    { compress: true, immediate: true }
                );
                
                // Record batch action for undo
                if (window.undoManager) {
                    window.undoManager.recordAction({
                        type: 'bulk_edit',
                        data: {
                            changes: updates.map((u, i) => ({
                                date: u.date,
                                mealType: u.type,
                                result: results[i]
                            }))
                        }
                    });
                }
                
                // Update UI once
                requestAnimationFrame(() => {
                    this.app.updateDashboard();
                });
                
                this.app.showToast(`✅ Updated ${updates.length} entries`);
                
                return { success: true, results };
                
            } catch (error) {
                window.EnhancedErrorHandler.handle(error, {
                    type: 'batch_mark_error',
                    updateCount: updates.length
                });
                
                return { success: false, error: error.message, results };
            }
        }
        
        // Get attendance for date range with caching
        getAttendanceRange(startDate, endDate) {
            const cacheKey = `${startDate}_${endDate}`;
            
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            const result = {};
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                if (this.app.data.attendance[dateStr]) {
                    result[dateStr] = this.app.data.attendance[dateStr];
                }
            }
            
            this.cache.set(cacheKey, result);
            return result;
        }
        
        // Calculate statistics (memoized)
        _calculateStats(monthKey) {
            const attendance = this.app.data.attendance;
            const stats = {
                totalDays: 0,
                lunchCount: 0,
                dinnerCount: 0,
                bothCount: 0,
                percentage: 0
            };
            
            Object.entries(attendance).forEach(([date, meals]) => {
                if (date.startsWith(monthKey)) {
                    stats.totalDays++;
                    if (meals.lunch) stats.lunchCount++;
                    if (meals.dinner) stats.dinnerCount++;
                    if (meals.lunch && meals.dinner) stats.bothCount++;
                }
            });
            
            const totalPossible = stats.totalDays * 2;
            const totalAttended = stats.lunchCount + stats.dinnerCount;
            stats.percentage = totalPossible > 0 
                ? ((totalAttended / totalPossible) * 100).toFixed(1)
                : 0;
            
            return stats;
        }
        
        // Track analytics event
        trackEvent(eventName, data) {
            if (window.DEBUG_MODE) {
                console.log('Analytics:', eventName, data);
            }
            
            // Could send to analytics service
            try {
                const events = JSON.parse(localStorage.getItem('messtrack_analytics') || '[]');
                events.push({
                    event: eventName,
                    data,
                    timestamp: Date.now()
                });
                
                // Keep only last 100 events
                if (events.length > 100) {
                    events.splice(0, events.length - 100);
                }
                
                localStorage.setItem('messtrack_analytics', JSON.stringify(events));
            } catch (e) {
                console.error('Analytics error:', e);
            }
        }
    }
    
    // ==========================================
    // CONFLICT RESOLVER
    // ==========================================
    
    class ConflictResolver {
        // Resolve conflicts between local and remote data
        resolve(local, remote, strategy = 'last-write-wins') {
            switch (strategy) {
                case 'last-write-wins':
                    return this.lastWriteWins(local, remote);
                case 'merge':
                    return this.merge(local, remote);
                case 'manual':
                    return this.manual(local, remote);
                default:
                    return local;
            }
        }
        
        lastWriteWins(local, remote) {
            // Compare timestamps and use most recent
            const localTime = local.timestamp || 0;
            const remoteTime = remote.timestamp || 0;
            return remoteTime > localTime ? remote : local;
        }
        
        merge(local, remote) {
            // Merge both datasets
            const merged = { ...local };
            
            for (const [key, value] of Object.entries(remote)) {
                if (!merged[key]) {
                    merged[key] = value;
                } else {
                    // If both exist, use most recent
                    const localTime = merged[key].timestamp || 0;
                    const remoteTime = value.timestamp || 0;
                    if (remoteTime > localTime) {
                        merged[key] = value;
                    }
                }
            }
            
            return merged;
        }
        
        manual(local, remote) {
            // Return both for manual resolution
            return {
                requiresManualResolution: true,
                local,
                remote
            };
        }
    }
    
    // ==========================================
    // ENHANCED EXPORT MANAGER
    // ==========================================
    
    class EnhancedExportManager {
        constructor(app) {
            this.app = app;
            this.exportFormats = ['csv', 'json', 'pdf', 'excel', 'html'];
        }
        
        // Enhanced CSV export with proper escaping
        async exportToCSV(options = {}) {
            const {
                dateRange = 'current-month',
                includeNotes = true,
                includeStats = true
            } = options;
            
            try {
                window.EnhancedPerformanceMonitor.start('csv-export');
                
                const data = this.getExportData(dateRange);
                let csv = '';
                
                // Add BOM for Excel compatibility
                csv += '\uFEFF';
                
                // Header
                csv += 'Date,Day,Lunch,Dinner';
                if (includeNotes) csv += ',Notes';
                csv += '\n';
                
                // Data rows
                Object.entries(data.attendance).forEach(([date, meals]) => {
                    const dateObj = new Date(date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    
                    const notes = includeNotes ? (data.notes[date]?.note || '') : '';
                    const escapedNotes = this.escapeCSV(notes);
                    
                    csv += `"${formattedDate}","${dayName}","${meals.lunch ? 'Yes' : 'No'}","${meals.dinner ? 'Yes' : 'No'}"`;
                    if (includeNotes) csv += `,"${escapedNotes}"`;
                    csv += '\n';
                });
                
                // Add statistics section
                if (includeStats) {
                    csv += '\n\nStatistics\n';
                    csv += `Total Days,${data.stats.totalDays}\n`;
                    csv += `Lunch Count,${data.stats.lunchCount}\n`;
                    csv += `Dinner Count,${data.stats.dinnerCount}\n`;
                    csv += `Attendance Percentage,${data.stats.percentage}%\n`;
                }
                
                // Download
                this.downloadFile(csv, `MessTrack_${dateRange}_${Date.now()}.csv`, 'text/csv');
                
                const duration = window.EnhancedPerformanceMonitor.end('csv-export');
                console.log(`CSV export completed in ${duration.toFixed(2)}ms`);
                
                this.app.showToast('✅ CSV exported successfully!');
                
                return { success: true, duration };
                
            } catch (error) {
                window.EnhancedErrorHandler.handle(error, {
                    type: 'export_csv_error',
                    options
                });
                
                this.app.showToast('❌ Export failed. Please try again.');
                return { success: false, error: error.message };
            }
        }
        
        // Enhanced JSON export with metadata
        async exportToJSON(options = {}) {
            try {
                const data = this.getExportData(options.dateRange || 'all');
                
                const exportData = {
                    version: '2.0.0',
                    exportDate: new Date().toISOString(),
                    exportedBy: 'MessTrack Enhanced',
                    metadata: {
                        totalDays: data.stats.totalDays,
                        dateRange: options.dateRange || 'all',
                        compressed: options.compress || false
                    },
                    data: {
                        attendance: data.attendance,
                        notes: data.notes,
                        summaries: data.summaries,
                        settings: this.app.data.settings
                    }
                };
                
                let json = JSON.stringify(exportData, null, 2);
                
                // Compress if requested
                if (options.compress) {
                    json = window.EnhancedUtils.compressData(exportData);
                }
                
                this.downloadFile(
                    json,
                    `MessTrack_Backup_${Date.now()}.json`,
                    'application/json'
                );
                
                this.app.showToast('✅ JSON backup created!');
                
                return { success: true };
                
            } catch (error) {
                window.EnhancedErrorHandler.handle(error, {
                    type: 'export_json_error'
                });
                
                return { success: false, error: error.message };
            }
        }
        
        // Get export data for date range
        getExportData(dateRange) {
            let attendance = {};
            let notes = {};
            
            const allAttendance = this.app.data.attendance;
            const allNotes = this.app.data.notes;
            
            switch (dateRange) {
                case 'current-month':
                    const currentMonth = new Date();
                    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                    
                    Object.entries(allAttendance).forEach(([date, data]) => {
                        if (date.startsWith(monthKey)) {
                            attendance[date] = data;
                            if (allNotes[date]) notes[date] = allNotes[date];
                        }
                    });
                    break;
                
                case 'last-30-days':
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
                    
                    Object.entries(allAttendance).forEach(([date, data]) => {
                        if (date >= cutoff) {
                            attendance[date] = data;
                            if (allNotes[date]) notes[date] = allNotes[date];
                        }
                    });
                    break;
                
                case 'all':
                default:
                    attendance = allAttendance;
                    notes = allNotes;
            }
            
            // Calculate stats
            const stats = {
                totalDays: Object.keys(attendance).length,
                lunchCount: 0,
                dinnerCount: 0,
                percentage: 0
            };
            
            Object.values(attendance).forEach(meals => {
                if (meals.lunch) stats.lunchCount++;
                if (meals.dinner) stats.dinnerCount++;
            });
            
            const totalPossible = stats.totalDays * 2;
            const totalAttended = stats.lunchCount + stats.dinnerCount;
            stats.percentage = totalPossible > 0 
                ? ((totalAttended / totalPossible) * 100).toFixed(1)
                : 0;
            
            return {
                attendance,
                notes,
                summaries: this.app.data.summaries,
                stats
            };
        }
        
        // Escape CSV special characters
        escapeCSV(str) {
            if (!str) return '';
            return str.replace(/"/g, '""');
        }
        
        // Download file helper
        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    // ==========================================
    // ENHANCED IMPORT MANAGER
    // ==========================================
    
    class EnhancedImportManager {
        constructor(app) {
            this.app = app;
        }
        
        // Enhanced import with validation and conflict resolution
        async importData(file, options = {}) {
            const {
                validate = true,
                backup = true,
                conflictStrategy = 'merge'
            } = options;
            
            try {
                // Create backup before import
                if (backup) {
                    await this.createBackup();
                }
                
                const content = await this.readFile(file);
                let importedData;
                
                // Try to parse
                try {
                    importedData = JSON.parse(content);
                } catch (e) {
                    // Try decompression
                    importedData = window.EnhancedUtils.decompressData(content);
                }
                
                // Validate structure
                if (validate) {
                    const isValid = this.validateImportData(importedData);
                    if (!isValid) {
                        throw new Error('Invalid data structure');
                    }
                }
                
                // Resolve conflicts
                const resolver = new ConflictResolver();
                const mergedData = resolver.resolve(
                    this.app.data,
                    importedData.data || importedData,
                    conflictStrategy
                );
                
                // Apply imported data
                this.app.data = mergedData;
                
                // Save
                await window.EnhancedDataManager.save(
                    'messtrack_attendance',
                    this.app.data.attendance,
                    { immediate: true, compress: true }
                );
                
                await window.EnhancedDataManager.save(
                    'messtrack_notes',
                    this.app.data.notes,
                    { immediate: true }
                );
                
                await window.EnhancedDataManager.save(
                    'messtrack_settings',
                    this.app.data.settings,
                    { immediate: true }
                );
                
                // Clear undo history
                if (window.undoManager) {
                    window.undoManager.clearHistory();
                }
                
                // Refresh UI
                this.app.initializeUI();
                
                this.app.showToast('✅ Data imported successfully!');
                
                return { success: true };
                
            } catch (error) {
                window.EnhancedErrorHandler.handle(error, {
                    type: 'import_error',
                    filename: file.name
                });
                
                this.app.showToast('❌ Import failed. Please check the file.');
                
                return { success: false, error: error.message };
            }
        }
        
        // Read file as text
        readFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        }
        
        // Validate import data structure
        validateImportData(data) {
            // Check if it's wrapped in export format
            const actualData = data.data || data;
            
            // Validate attendance
            if (actualData.attendance) {
                if (!window.EnhancedValidation.validateAttendance(actualData.attendance)) {
                    return false;
                }
            }
            
            // Validate settings
            if (actualData.settings) {
                if (!window.EnhancedValidation.validateSettings(actualData.settings)) {
                    return false;
                }
            }
            
            return true;
        }
        
        // Create backup before import
        async createBackup() {
            const exportManager = new EnhancedExportManager(this.app);
            await exportManager.exportToJSON({
                dateRange: 'all',
                compress: true
            });
        }
    }
    
    // ==========================================
    // INITIALIZE AND EXPOSE
    // ==========================================
    
    // Wait for app to be ready
    const initEnhancements = () => {
        if (!window.messTrack) {
            setTimeout(initEnhancements, 100);
            return;
        }
        
        window.EnhancedAttendanceManager = new EnhancedAttendanceManager(window.messTrack);
        window.EnhancedExportManager = new EnhancedExportManager(window.messTrack);
        window.EnhancedImportManager = new EnhancedImportManager(window.messTrack);
        
        console.log('✅ Enhanced App Improvements loaded');
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancements);
    } else {
        initEnhancements();
    }
    
})();
