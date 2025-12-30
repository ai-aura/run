// 🔄 Undo/Redo Manager for MessTrack
// Comprehensive action history with undo/redo capabilities

class UndoManager {
    constructor(messTrackApp) {
        this.app = messTrackApp;
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50; // Keep last 50 actions
        this.undoTimeout = null;
        this.undoToastTimeout = 5000; // 5 seconds to undo
        
        this.init();
    }

    init() {
        this.loadHistory();
        this.setupKeyboardShortcuts();
    }

    // Save action to history
    recordAction(action) {
        // Remove any actions after current index (when undoing then doing new action)
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Add new action
        this.history.push({
            ...action,
            timestamp: Date.now(),
            id: this.generateId()
        });
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }
        
        this.saveHistory();
        this.showUndoToast(action);
    }

    // Generate unique ID for action
    generateId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Undo last action
    undo() {
        if (!this.canUndo()) {
            this.app.showToast('⚠️ Nothing to undo');
            return false;
        }

        const action = this.history[this.currentIndex];
        this.currentIndex--;
        
        this.executeUndo(action);
        this.saveHistory();
        
        // Show redo option
        this.showRedoToast(action);
        
        return true;
    }

    // Redo last undone action
    redo() {
        if (!this.canRedo()) {
            this.app.showToast('⚠️ Nothing to redo');
            return false;
        }

        this.currentIndex++;
        const action = this.history[this.currentIndex];
        
        this.executeRedo(action);
        this.saveHistory();
        
        this.app.showToast(`✅ Redone: ${this.getActionDescription(action)}`);
        
        return true;
    }

    // Check if undo is possible
    canUndo() {
        return this.currentIndex >= 0;
    }

    // Check if redo is possible
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    // Execute undo based on action type
    executeUndo(action) {
        switch (action.type) {
            case 'mark_attendance':
                this.undoMarkAttendance(action);
                break;
            case 'unmark_attendance':
                this.undoUnmarkAttendance(action);
                break;
            case 'add_note':
                this.undoAddNote(action);
                break;
            case 'edit_note':
                this.undoEditNote(action);
                break;
            case 'delete_note':
                this.undoDeleteNote(action);
                break;
            case 'bulk_edit':
                this.undoBulkEdit(action);
                break;
            case 'delete_data':
                this.undoDeleteData(action);
                break;
            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    // Execute redo based on action type
    executeRedo(action) {
        switch (action.type) {
            case 'mark_attendance':
                this.redoMarkAttendance(action);
                break;
            case 'unmark_attendance':
                this.redoUnmarkAttendance(action);
                break;
            case 'add_note':
                this.redoAddNote(action);
                break;
            case 'edit_note':
                this.redoEditNote(action);
                break;
            case 'delete_note':
                this.redoDeleteNote(action);
                break;
            case 'bulk_edit':
                this.redoBulkEdit(action);
                break;
            case 'delete_data':
                this.redoDeleteData(action);
                break;
            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    // Undo mark attendance
    undoMarkAttendance(action) {
        const { date, mealType } = action.data;
        if (this.app.data.attendance[date]) {
            this.app.data.attendance[date][mealType] = false;
            this.app.saveData();
            this.app.updateDashboard();
            this.app.showToast(`↩️ Undone: ${this.capitalize(mealType)} unmarked for ${this.formatDate(date)}`);
        }
    }

    // Redo mark attendance
    redoMarkAttendance(action) {
        const { date, mealType } = action.data;
        if (!this.app.data.attendance[date]) {
            this.app.data.attendance[date] = { lunch: false, dinner: false };
        }
        this.app.data.attendance[date][mealType] = true;
        this.app.saveData();
        this.app.updateDashboard();
    }

    // Undo unmark attendance
    undoUnmarkAttendance(action) {
        const { date, mealType } = action.data;
        if (!this.app.data.attendance[date]) {
            this.app.data.attendance[date] = { lunch: false, dinner: false };
        }
        this.app.data.attendance[date][mealType] = true;
        this.app.saveData();
        this.app.updateDashboard();
        this.app.showToast(`↩️ Undone: ${this.capitalize(mealType)} re-marked for ${this.formatDate(date)}`);
    }

    // Redo unmark attendance
    redoUnmarkAttendance(action) {
        const { date, mealType } = action.data;
        if (this.app.data.attendance[date]) {
            this.app.data.attendance[date][mealType] = false;
            this.app.saveData();
            this.app.updateDashboard();
        }
    }

    // Undo add note
    undoAddNote(action) {
        const { date } = action.data;
        if (this.app.data.notes[date]) {
            delete this.app.data.notes[date];
            this.app.saveData();
            this.app.showToast(`↩️ Undone: Note removed for ${this.formatDate(date)}`);
        }
    }

    // Redo add note
    redoAddNote(action) {
        const { date, note } = action.data;
        this.app.data.notes[date] = note;
        this.app.saveData();
    }

    // Undo edit note
    undoEditNote(action) {
        const { date, oldNote } = action.data;
        if (oldNote) {
            this.app.data.notes[date] = oldNote;
        } else {
            delete this.app.data.notes[date];
        }
        this.app.saveData();
        this.app.showToast(`↩️ Undone: Note restored for ${this.formatDate(date)}`);
    }

    // Redo edit note
    redoEditNote(action) {
        const { date, newNote } = action.data;
        this.app.data.notes[date] = newNote;
        this.app.saveData();
    }

    // Undo delete note
    undoDeleteNote(action) {
        const { date, note } = action.data;
        this.app.data.notes[date] = note;
        this.app.saveData();
        this.app.showToast(`↩️ Undone: Note restored for ${this.formatDate(date)}`);
    }

    // Redo delete note
    redoDeleteNote(action) {
        const { date } = action.data;
        if (this.app.data.notes[date]) {
            delete this.app.data.notes[date];
            this.app.saveData();
        }
    }

    // Undo bulk edit
    undoBulkEdit(action) {
        const { changes } = action.data;
        changes.forEach(change => {
            const { date, oldValue } = change;
            if (oldValue) {
                this.app.data.attendance[date] = oldValue;
            } else {
                delete this.app.data.attendance[date];
            }
        });
        this.app.saveData();
        this.app.updateDashboard();
        this.app.showToast(`↩️ Undone: Bulk edit of ${changes.length} days`);
    }

    // Redo bulk edit
    redoBulkEdit(action) {
        const { changes } = action.data;
        changes.forEach(change => {
            const { date, newValue } = change;
            this.app.data.attendance[date] = newValue;
        });
        this.app.saveData();
        this.app.updateDashboard();
    }

    // Undo delete data
    undoDeleteData(action) {
        const { attendance, notes, summaries } = action.data;
        this.app.data.attendance = attendance;
        this.app.data.notes = notes;
        this.app.data.summaries = summaries;
        this.app.saveData();
        this.app.updateDashboard();
        this.app.showToast('↩️ Undone: All data restored');
    }

    // Redo delete data
    redoDeleteData(action) {
        this.app.data.attendance = {};
        this.app.data.notes = {};
        this.app.data.summaries = {};
        this.app.saveData();
        this.app.updateDashboard();
    }

    // Show undo toast with button
    showUndoToast(action) {
        // Clear existing timeout
        if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
        }

        const description = this.getActionDescription(action);
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.innerHTML = `
                <div class="flex items-center justify-between gap-4">
                    <span>✅ ${description}</span>
                    <button 
                        id="undoBtn" 
                        class="btn-glass px-3 py-1 text-sm font-bold hover:bg-white hover:bg-opacity-20 transition"
                        style="min-width: 60px;"
                    >
                        ↩️ Undo
                    </button>
                </div>
            `;
            
            toast.classList.add('show');
            
            // Add undo button listener
            const undoBtn = document.getElementById('undoBtn');
            if (undoBtn) {
                undoBtn.addEventListener('click', () => {
                    this.undo();
                    toast.classList.remove('show');
                    clearTimeout(this.undoTimeout);
                });
            }
            
            // Auto-hide after timeout
            this.undoTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, this.undoToastTimeout);
        }
    }

    // Show redo toast
    showRedoToast(action) {
        const description = this.getActionDescription(action);
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.innerHTML = `
                <div class="flex items-center justify-between gap-4">
                    <span>↩️ Undone: ${description}</span>
                    <button 
                        id="redoBtn" 
                        class="btn-glass px-3 py-1 text-sm font-bold hover:bg-white hover:bg-opacity-20 transition"
                        style="min-width: 60px;"
                    >
                        ↪️ Redo
                    </button>
                </div>
            `;
            
            toast.classList.add('show');
            
            // Add redo button listener
            const redoBtn = document.getElementById('redoBtn');
            if (redoBtn) {
                redoBtn.addEventListener('click', () => {
                    this.redo();
                    toast.classList.remove('show');
                });
            }
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, this.undoToastTimeout);
        }
    }

    // Get human-readable action description
    getActionDescription(action) {
        switch (action.type) {
            case 'mark_attendance':
                return `${this.capitalize(action.data.mealType)} marked`;
            case 'unmark_attendance':
                return `${this.capitalize(action.data.mealType)} unmarked`;
            case 'add_note':
                return 'Note added';
            case 'edit_note':
                return 'Note edited';
            case 'delete_note':
                return 'Note deleted';
            case 'bulk_edit':
                return `${action.data.changes.length} days edited`;
            case 'delete_data':
                return 'All data deleted';
            default:
                return 'Action performed';
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z or Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl+Shift+Z or Cmd+Shift+Z for redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redo();
            }
            
            // Ctrl+Y or Cmd+Y for redo (alternative)
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }

    // Save history to localStorage
    saveHistory() {
        try {
            localStorage.setItem('messtrack_undo_history', JSON.stringify({
                history: this.history,
                currentIndex: this.currentIndex
            }));
        } catch (e) {
            console.error('Failed to save undo history:', e);
        }
    }

    // Load history from localStorage
    loadHistory() {
        try {
            const saved = localStorage.getItem('messtrack_undo_history');
            if (saved) {
                const data = JSON.parse(saved);
                this.history = data.history || [];
                this.currentIndex = data.currentIndex || -1;
            }
        } catch (e) {
            console.error('Failed to load undo history:', e);
            this.history = [];
            this.currentIndex = -1;
        }
    }

    // Clear history
    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
        this.saveHistory();
    }

    // Get history summary
    getHistorySummary() {
        return {
            totalActions: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            recentActions: this.history.slice(-5).map(action => ({
                type: action.type,
                description: this.getActionDescription(action),
                timestamp: new Date(action.timestamp).toLocaleString()
            }))
        };
    }

    // Utility functions
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for MessTrack app to be initialized
    setTimeout(() => {
        if (window.messTrack) {
            window.undoManager = new UndoManager(window.messTrack);
            console.log('✅ Undo Manager initialized');
        }
    }, 1000);
});
