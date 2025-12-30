// 🔧 Critical Fixes and Optimizations for MessTrack
// Apply these enhancements to improve stability and compatibility

// ==========================================
// 1. GLOBAL ERROR BOUNDARY
// ==========================================
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    
    // Log error details
    const errorInfo = {
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    // Store error for debugging
    try {
        const errors = JSON.parse(localStorage.getItem('messtrack_errors') || '[]');
        errors.push(errorInfo);
        // Keep only last 10 errors
        if (errors.length > 10) errors.shift();
        localStorage.setItem('messtrack_errors', JSON.stringify(errors));
    } catch (e) {
        console.error('Could not store error:', e);
    }
    
    // Show user-friendly message
    if (window.messTrack && window.messTrack.showToast) {
        window.messTrack.showToast('⚠️ Something went wrong. Please refresh the page.');
    }
    
    // Prevent default error handling
    event.preventDefault();
});

// Handle promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// ==========================================
// 2. LOCALSTORAGE QUOTA MANAGEMENT
// ==========================================
class StorageManager {
    constructor() {
        this.quotaWarningThreshold = 0.8; // 80%
        this.maxSize = 5 * 1024 * 1024; // 5MB typical limit
    }
    
    // Check available storage
    async checkQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const percentUsed = estimate.usage / estimate.quota;
            
            if (percentUsed > this.quotaWarningThreshold) {
                console.warn(`Storage ${(percentUsed * 100).toFixed(1)}% full`);
                return {
                    warning: true,
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentUsed
                };
            }
        }
        return { warning: false };
    }
    
    // Get current localStorage size
    getLocalStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }
    
    // Clean old data
    cleanOldData() {
        try {
            // Remove data older than 2 years
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            const cutoffDate = twoYearsAgo.toISOString().split('T')[0];
            
            const attendance = JSON.parse(localStorage.getItem('messtrack_attendance') || '{}');
            const notes = JSON.parse(localStorage.getItem('messtrack_notes') || '{}');
            
            let cleaned = 0;
            
            // Clean attendance
            Object.keys(attendance).forEach(date => {
                if (date < cutoffDate) {
                    delete attendance[date];
                    cleaned++;
                }
            });
            
            // Clean notes
            Object.keys(notes).forEach(date => {
                if (date < cutoffDate) {
                    delete notes[date];
                    cleaned++;
                }
            });
            
            if (cleaned > 0) {
                localStorage.setItem('messtrack_attendance', JSON.stringify(attendance));
                localStorage.setItem('messtrack_notes', JSON.stringify(notes));
                console.log(`Cleaned ${cleaned} old records`);
            }
            
            return cleaned;
        } catch (e) {
            console.error('Error cleaning old data:', e);
            return 0;
        }
    }
    
    // Safe set item with quota check
    safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn('Storage quota exceeded, attempting cleanup...');
                
                // Try to clean old data
                const cleaned = this.cleanOldData();
                
                if (cleaned > 0) {
                    // Retry after cleanup
                    try {
                        localStorage.setItem(key, value);
                        return true;
                    } catch (retryError) {
                        console.error('Still cannot save after cleanup');
                        return false;
                    }
                }
                
                // Show error to user
                if (window.messTrack) {
                    window.messTrack.showToast('⚠️ Storage full. Please export and clear old data.');
                }
                return false;
            }
            throw e;
        }
    }
}

// Initialize storage manager
window.storageManager = new StorageManager();

// Check quota on app start
if (window.messTrack) {
    window.storageManager.checkQuota().then(result => {
        if (result.warning) {
            window.messTrack.showToast(`⚠️ Storage ${(result.percentUsed * 100).toFixed(0)}% full`);
        }
    });
}

// ==========================================
// 3. DOM REFERENCE CACHE
// ==========================================
class DOMCache {
    constructor() {
        this.cache = new Map();
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        // Cache commonly used elements
        const elements = {
            // Navigation
            navItems: document.querySelectorAll('.nav-item'),
            
            // Pages
            dashboard: document.getElementById('dashboard'),
            weekly: document.getElementById('weekly'),
            history: document.getElementById('history'),
            summary: document.getElementById('summary'),
            settings: document.getElementById('settings'),
            themes: document.getElementById('themes'),
            
            // Common elements
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            
            // Buttons
            lunchBtn: document.getElementById('lunchBtn'),
            dinnerBtn: document.getElementById('dinnerBtn'),
            
            // Inputs
            lunchTime: document.getElementById('lunchTime'),
            dinnerTime: document.getElementById('dinnerTime')
        };
        
        // Store in cache
        Object.entries(elements).forEach(([key, value]) => {
            if (value) this.cache.set(key, value);
        });
        
        this.initialized = true;
    }
    
    get(key) {
        if (!this.initialized) this.init();
        return this.cache.get(key);
    }
    
    refresh(key) {
        const element = document.getElementById(key) || document.querySelector(`.${key}`);
        if (element) {
            this.cache.set(key, element);
        }
        return element;
    }
    
    clear() {
        this.cache.clear();
        this.initialized = false;
    }
}

window.domCache = new DOMCache();

// ==========================================
// 4. NETWORK RETRY LOGIC
// ==========================================
class NetworkRetry {
    constructor(maxRetries = 3, baseDelay = 1000) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
    }
    
    async fetchWithRetry(url, options = {}, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok && retryCount < this.maxRetries) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return response;
            
        } catch (error) {
            if (retryCount < this.maxRetries) {
                const delay = this.baseDelay * Math.pow(2, retryCount);
                console.log(`Retry ${retryCount + 1}/${this.maxRetries} after ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            
            throw error;
        }
    }
}

window.networkRetry = new NetworkRetry();

// ==========================================
// 5. INPUT VALIDATION & SANITIZATION
// ==========================================
class InputValidator {
    // Sanitize HTML to prevent XSS
    sanitizeHTML(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Validate GitHub username
    isValidGitHubUsername(username) {
        const re = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
        return re.test(username);
    }
    
    // Validate date
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
    
    // Validate time (HH:MM format)
    isValidTime(timeString) {
        const re = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return re.test(timeString);
    }
    
    // Sanitize and validate note text
    validateNote(note, maxLength = 500) {
        if (typeof note !== 'string') return { valid: false, error: 'Note must be text' };
        
        const sanitized = this.sanitizeHTML(note.trim());
        
        if (sanitized.length === 0) {
            return { valid: false, error: 'Note cannot be empty' };
        }
        
        if (sanitized.length > maxLength) {
            return { valid: false, error: `Note too long (max ${maxLength} characters)` };
        }
        
        return { valid: true, value: sanitized };
    }
}

window.inputValidator = new InputValidator();

// ==========================================
// 6. ACCESSIBILITY ENHANCEMENTS
// ==========================================
class AccessibilityManager {
    constructor() {
        this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    }
    
    // Add ARIA labels to elements
    enhanceARIA() {
        // Add labels to navigation items
        document.querySelectorAll('.nav-item').forEach((item, index) => {
            const page = item.dataset.page;
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `Navigate to ${page} page`);
            item.setAttribute('tabindex', '0');
        });
        
        // Add labels to buttons
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const text = button.textContent.trim();
            if (text) {
                button.setAttribute('aria-label', text);
            }
        });
        
        // Mark current page
        const activePage = document.querySelector('.nav-item.active');
        if (activePage) {
            activePage.setAttribute('aria-current', 'page');
        }
    }
    
    // Enable keyboard navigation
    enableKeyboardNav() {
        // Navigate with arrow keys
        document.addEventListener('keydown', (e) => {
            const navItems = Array.from(document.querySelectorAll('.nav-item'));
            const currentIndex = navItems.findIndex(item => item.classList.contains('active'));
            
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                navItems[currentIndex - 1].click();
                navItems[currentIndex - 1].focus();
            } else if (e.key === 'ArrowRight' && currentIndex < navItems.length - 1) {
                navItems[currentIndex + 1].click();
                navItems[currentIndex + 1].focus();
            }
        });
        
        // Enter key on nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }
    
    // Manage focus
    trapFocus(container) {
        const focusable = container.querySelectorAll(this.focusableElements);
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        });
    }
    
    // Announce to screen readers
    announce(message, priority = 'polite') {
        const announcer = document.getElementById('aria-announcer') || this.createAnnouncer();
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }
    
    createAnnouncer() {
        const announcer = document.createElement('div');
        announcer.id = 'aria-announcer';
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
        return announcer;
    }
}

window.accessibilityManager = new AccessibilityManager();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityManager.enhanceARIA();
    window.accessibilityManager.enableKeyboardNav();
});

// ==========================================
// 7. PERFORMANCE MONITOR
// ==========================================
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            interactionTime: 0
        };
    }
    
    measurePageLoad() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`Page load time: ${this.metrics.loadTime}ms`);
        }
    }
    
    measureRender(callback) {
        const start = performance.now();
        callback();
        const end = performance.now();
        this.metrics.renderTime = end - start;
        console.log(`Render time: ${this.metrics.renderTime.toFixed(2)}ms`);
    }
    
    trackInteraction(name, callback) {
        const start = performance.now();
        const result = callback();
        const end = performance.now();
        console.log(`${name} took ${(end - start).toFixed(2)}ms`);
        return result;
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            memory: performance.memory ? {
                used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
            } : 'Not available'
        };
    }
}

window.performanceMonitor = new PerformanceMonitor();

// Measure on load
window.addEventListener('load', () => {
    window.performanceMonitor.measurePageLoad();
});

// ==========================================
// 8. COMPATIBILITY CHECKS
// ==========================================
class CompatibilityChecker {
    constructor() {
        this.features = {
            serviceWorker: 'serviceWorker' in navigator,
            localStorage: this.checkLocalStorage(),
            indexedDB: 'indexedDB' in window,
            notifications: 'Notification' in window,
            vibration: 'vibrate' in navigator,
            geolocation: 'geolocation' in navigator,
            camera: 'mediaDevices' in navigator,
            bluetooth: 'bluetooth' in navigator,
            webGL: this.checkWebGL(),
            webAssembly: typeof WebAssembly !== 'undefined'
        };
    }
    
    checkLocalStorage() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }
    
    getReport() {
        return {
            features: this.features,
            browser: this.detectBrowser(),
            device: this.detectDevice(),
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio || 1
            }
        };
    }
    
    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }
    
    detectDevice() {
        const ua = navigator.userAgent;
        if (/Android/i.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
        if (/Windows/i.test(ua)) return 'Windows';
        if (/Mac/i.test(ua)) return 'MacOS';
        if (/Linux/i.test(ua)) return 'Linux';
        return 'Unknown';
    }
    
    showWarnings() {
        const warnings = [];
        
        if (!this.features.serviceWorker) {
            warnings.push('⚠️ Offline mode not available (no Service Worker support)');
        }
        
        if (!this.features.localStorage) {
            warnings.push('⚠️ Data cannot be saved (localStorage not available)');
        }
        
        if (!this.features.notifications) {
            warnings.push('ℹ️ Notifications not supported on this device');
        }
        
        return warnings;
    }
}

window.compatibilityChecker = new CompatibilityChecker();

// Log compatibility report
console.log('Compatibility Report:', window.compatibilityChecker.getReport());

// Show warnings if needed
const warnings = window.compatibilityChecker.showWarnings();
if (warnings.length > 0 && window.messTrack) {
    warnings.forEach(warning => {
        setTimeout(() => window.messTrack.showToast(warning), 1000);
    });
}

// ==========================================
// 9. AUTO-INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Critical fixes loaded and active');
    
    // Initialize DOM cache
    window.domCache.init();
    
    // Check storage quota
    window.storageManager.checkQuota();
    
    // Log performance metrics after 2 seconds
    setTimeout(() => {
        console.log('📊 Performance Metrics:', window.performanceMonitor.getMetrics());
    }, 2000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StorageManager,
        DOMCache,
        NetworkRetry,
        InputValidator,
        AccessibilityManager,
        PerformanceMonitor,
        CompatibilityChecker
    };
}
