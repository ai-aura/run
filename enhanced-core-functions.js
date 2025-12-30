// 🚀 Enhanced Core Functions for MessTrack
// Comprehensive improvements with advanced error handling, caching, and optimization

(function() {
    'use strict';

    // ==========================================
    // ENHANCED UTILITY FUNCTIONS
    // ==========================================
    
    class EnhancedUtils {
        // Advanced debounce with leading/trailing options
        static debounce(func, wait, options = {}) {
            let timeout;
            let lastArgs, lastThis, result;
            let lastCallTime = 0;
            
            const { leading = false, trailing = true, maxWait } = options;
            
            function invokeFunc(time) {
                const args = lastArgs;
                const thisArg = lastThis;
                
                lastArgs = lastThis = undefined;
                lastCallTime = time;
                result = func.apply(thisArg, args);
                return result;
            }
            
            function shouldInvoke(time) {
                const timeSinceLastCall = time - lastCallTime;
                return (lastCallTime === 0 || timeSinceLastCall >= wait ||
                        (maxWait && timeSinceLastCall >= maxWait));
            }
            
            return function(...args) {
                const time = Date.now();
                const isInvoking = shouldInvoke(time);
                
                lastArgs = args;
                lastThis = this;
                
                if (isInvoking) {
                    if (timeout === undefined && leading) {
                        return invokeFunc(time);
                    }
                    if (maxWait) {
                        timeout = setTimeout(() => {
                            timeout = undefined;
                            if (trailing) invokeFunc(Date.now());
                        }, wait);
                        return invokeFunc(time);
                    }
                }
                
                if (timeout === undefined) {
                    timeout = setTimeout(() => {
                        timeout = undefined;
                        if (trailing) invokeFunc(Date.now());
                    }, wait);
                }
                
                return result;
            };
        }
        
        // Advanced throttle with leading/trailing options
        static throttle(func, wait, options = {}) {
            let timeout, context, args, result;
            let previous = 0;
            const { leading = true, trailing = true } = options;
            
            const later = function() {
                previous = leading === false ? 0 : Date.now();
                timeout = null;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            };
            
            return function(...params) {
                const now = Date.now();
                if (!previous && leading === false) previous = now;
                const remaining = wait - (now - previous);
                context = this;
                args = params;
                
                if (remaining <= 0 || remaining > wait) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    previous = now;
                    result = func.apply(context, args);
                    if (!timeout) context = args = null;
                } else if (!timeout && trailing !== false) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        }
        
        // Memoization with TTL and size limit
        static memoize(func, options = {}) {
            const { ttl = 60000, maxSize = 100, keyGenerator } = options;
            const cache = new Map();
            const timestamps = new Map();
            
            return function(...args) {
                const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
                const now = Date.now();
                
                // Check if cached and not expired
                if (cache.has(key)) {
                    const timestamp = timestamps.get(key);
                    if (now - timestamp < ttl) {
                        return cache.get(key);
                    }
                    // Expired, remove
                    cache.delete(key);
                    timestamps.delete(key);
                }
                
                // Compute result
                const result = func.apply(this, args);
                
                // Manage cache size
                if (cache.size >= maxSize) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                    timestamps.delete(firstKey);
                }
                
                // Store result
                cache.set(key, result);
                timestamps.set(key, now);
                
                return result;
            };
        }
        
        // Retry with exponential backoff
        static async retry(func, options = {}) {
            const {
                maxAttempts = 3,
                delay = 1000,
                backoffMultiplier = 2,
                onRetry = null,
                shouldRetry = () => true
            } = options;
            
            let lastError;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await func();
                } catch (error) {
                    lastError = error;
                    
                    if (attempt === maxAttempts || !shouldRetry(error)) {
                        throw error;
                    }
                    
                    const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
                    
                    if (onRetry) {
                        onRetry(error, attempt, waitTime);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            
            throw lastError;
        }
        
        // Deep clone with circular reference handling
        static deepClone(obj, hash = new WeakMap()) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj);
            if (obj instanceof RegExp) return new RegExp(obj);
            
            if (hash.has(obj)) return hash.get(obj);
            
            const clone = Array.isArray(obj) ? [] : {};
            hash.set(obj, clone);
            
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clone[key] = this.deepClone(obj[key], hash);
                }
            }
            
            return clone;
        }
        
        // Safe JSON parse with fallback
        static safeJSONParse(str, fallback = null) {
            try {
                return JSON.parse(str);
            } catch (e) {
                console.error('JSON parse error:', e);
                return fallback;
            }
        }
        
        // Compress data using LZ-based algorithm
        static compressData(data) {
            const str = JSON.stringify(data);
            // Simple RLE compression for localStorage optimization
            let compressed = '';
            let count = 1;
            
            for (let i = 0; i < str.length; i++) {
                if (str[i] === str[i + 1]) {
                    count++;
                } else {
                    compressed += count > 1 ? count + str[i] : str[i];
                    count = 1;
                }
            }
            
            return compressed.length < str.length ? compressed : str;
        }
        
        // Decompress data
        static decompressData(compressed) {
            try {
                // Attempt to parse as-is first
                return JSON.parse(compressed);
            } catch (e) {
                // If fails, try decompression
                let decompressed = '';
                let i = 0;
                
                while (i < compressed.length) {
                    if (/\d/.test(compressed[i])) {
                        const count = parseInt(compressed[i]);
                        decompressed += compressed[i + 1].repeat(count);
                        i += 2;
                    } else {
                        decompressed += compressed[i];
                        i++;
                    }
                }
                
                return JSON.parse(decompressed);
            }
        }
    }
    
    // ==========================================
    // ENHANCED DATA MANAGER
    // ==========================================
    
    class EnhancedDataManager {
        constructor() {
            this.cache = new Map();
            this.pendingWrites = new Map();
            this.writeTimer = null;
            this.compressionEnabled = true;
            this.encryptionEnabled = false;
            this.syncQueue = [];
        }
        
        // Enhanced save with compression and batching
        async save(key, data, options = {}) {
            const { immediate = false, compress = this.compressionEnabled } = options;
            
            try {
                // Update cache
                this.cache.set(key, data);
                
                // Add to pending writes
                this.pendingWrites.set(key, { data, compress });
                
                if (immediate) {
                    await this.flush();
                } else {
                    // Batch writes
                    if (this.writeTimer) clearTimeout(this.writeTimer);
                    this.writeTimer = setTimeout(() => this.flush(), 500);
                }
                
                return true;
            } catch (error) {
                console.error('Save error:', error);
                return false;
            }
        }
        
        // Enhanced load with decompression and validation
        async load(key, options = {}) {
            const { useCache = true, validate = null } = options;
            
            // Check cache first
            if (useCache && this.cache.has(key)) {
                return this.cache.get(key);
            }
            
            try {
                const stored = localStorage.getItem(key);
                if (!stored) return null;
                
                // Try decompression
                let data = EnhancedUtils.safeJSONParse(stored);
                if (!data) {
                    data = EnhancedUtils.decompressData(stored);
                }
                
                // Validate if validator provided
                if (validate && !validate(data)) {
                    console.warn('Data validation failed for key:', key);
                    return null;
                }
                
                // Update cache
                this.cache.set(key, data);
                
                return data;
            } catch (error) {
                console.error('Load error:', error);
                return null;
            }
        }
        
        // Flush pending writes
        async flush() {
            if (this.pendingWrites.size === 0) return;
            
            const writes = Array.from(this.pendingWrites.entries());
            this.pendingWrites.clear();
            
            for (const [key, { data, compress }] of writes) {
                try {
                    const serialized = compress 
                        ? EnhancedUtils.compressData(data)
                        : JSON.stringify(data);
                    
                    localStorage.setItem(key, serialized);
                } catch (error) {
                    if (error.name === 'QuotaExceededError') {
                        // Handle quota exceeded
                        await this.handleQuotaExceeded(key, data);
                    } else {
                        console.error('Write error:', error);
                    }
                }
            }
        }
        
        // Handle quota exceeded
        async handleQuotaExceeded(key, data) {
            console.warn('Storage quota exceeded, attempting cleanup...');
            
            // Clean old data
            await this.cleanOldData();
            
            // Retry write
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                console.error('Failed to save even after cleanup:', error);
                // Queue for sync to cloud/server
                this.syncQueue.push({ key, data, timestamp: Date.now() });
            }
        }
        
        // Clean old data (older than 1 year)
        async cleanOldData() {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const cutoff = oneYearAgo.toISOString().split('T')[0];
            
            const attendance = await this.load('messtrack_attendance') || {};
            const notes = await this.load('messtrack_notes') || {};
            
            let cleaned = 0;
            
            // Clean old attendance
            for (const date in attendance) {
                if (date < cutoff) {
                    delete attendance[date];
                    cleaned++;
                }
            }
            
            // Clean old notes
            for (const date in notes) {
                if (date < cutoff) {
                    delete notes[date];
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                await this.save('messtrack_attendance', attendance, { immediate: true });
                await this.save('messtrack_notes', notes, { immediate: true });
                console.log(`Cleaned ${cleaned} old records`);
            }
            
            return cleaned;
        }
        
        // Get storage usage statistics
        getStorageStats() {
            let totalSize = 0;
            const stats = {};
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                
                totalSize += size;
                stats[key] = {
                    size,
                    sizeKB: (size / 1024).toFixed(2),
                    items: key.startsWith('messtrack_') ? Object.keys(EnhancedUtils.safeJSONParse(value) || {}).length : 0
                };
            }
            
            return {
                totalSize,
                totalSizeKB: (totalSize / 1024).toFixed(2),
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                percentUsed: navigator.storage && navigator.storage.estimate 
                    ? 'calculating...' 
                    : 'unknown',
                details: stats
            };
        }
    }
    
    // ==========================================
    // ENHANCED VALIDATION MANAGER
    // ==========================================
    
    class EnhancedValidation {
        // Validate attendance data structure
        static validateAttendance(data) {
            if (!data || typeof data !== 'object') return false;
            
            for (const [date, meals] of Object.entries(data)) {
                // Validate date format (YYYY-MM-DD)
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
                
                // Validate meals structure
                if (!meals || typeof meals !== 'object') return false;
                if (typeof meals.lunch !== 'boolean') return false;
                if (typeof meals.dinner !== 'boolean') return false;
            }
            
            return true;
        }
        
        // Validate settings structure
        static validateSettings(data) {
            if (!data || typeof data !== 'object') return false;
            
            const validThemes = ['light', 'dark'];
            if (data.theme && !validThemes.includes(data.theme)) return false;
            
            if (data.notifications !== undefined && typeof data.notifications !== 'boolean') return false;
            
            // Validate time format (HH:MM)
            if (data.lunchTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.lunchTime)) return false;
            if (data.dinnerTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.dinnerTime)) return false;
            
            return true;
        }
        
        // Sanitize user input
        static sanitizeInput(input, type = 'text') {
            if (typeof input !== 'string') return '';
            
            switch (type) {
                case 'text':
                    // Remove HTML tags and script content
                    return input
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<[^>]+>/g, '')
                        .trim();
                
                case 'date':
                    // Validate and return date in YYYY-MM-DD format
                    const date = new Date(input);
                    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
                
                case 'time':
                    // Validate HH:MM format
                    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(input) ? input : '';
                
                case 'number':
                    const num = parseFloat(input);
                    return isNaN(num) ? 0 : num;
                
                default:
                    return input.trim();
            }
        }
        
        // Validate email format
        static validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }
        
        // Validate URL format
        static validateURL(url) {
            try {
                new URL(url);
                return true;
            } catch (e) {
                return false;
            }
        }
    }
    
    // ==========================================
    // ENHANCED ERROR HANDLER
    // ==========================================
    
    class EnhancedErrorHandler {
        constructor() {
            this.errors = [];
            this.maxErrors = 50;
            this.errorCallbacks = new Map();
        }
        
        // Handle error with context
        handle(error, context = {}) {
            const errorInfo = {
                message: error.message || 'Unknown error',
                stack: error.stack,
                context,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            // Store error
            this.errors.push(errorInfo);
            if (this.errors.length > this.maxErrors) {
                this.errors.shift();
            }
            
            // Save to localStorage
            try {
                localStorage.setItem('messtrack_errors', JSON.stringify(this.errors.slice(-10)));
            } catch (e) {
                console.error('Failed to save error log:', e);
            }
            
            // Call registered callbacks
            for (const [name, callback] of this.errorCallbacks) {
                try {
                    callback(errorInfo);
                } catch (e) {
                    console.error(`Error in callback ${name}:`, e);
                }
            }
            
            // Log to console
            console.error('Error handled:', errorInfo);
            
            return errorInfo;
        }
        
        // Register error callback
        onError(name, callback) {
            this.errorCallbacks.set(name, callback);
        }
        
        // Get error statistics
        getStats() {
            const stats = {
                total: this.errors.length,
                byType: {},
                recent: this.errors.slice(-5)
            };
            
            this.errors.forEach(error => {
                const type = error.context.type || 'unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            });
            
            return stats;
        }
        
        // Clear errors
        clear() {
            this.errors = [];
            localStorage.removeItem('messtrack_errors');
        }
    }
    
    // ==========================================
    // ENHANCED PERFORMANCE MONITOR
    // ==========================================
    
    class EnhancedPerformanceMonitor {
        constructor() {
            this.metrics = new Map();
            this.marks = new Map();
        }
        
        // Start performance measurement
        start(name) {
            this.marks.set(name, performance.now());
        }
        
        // End performance measurement
        end(name) {
            const startTime = this.marks.get(name);
            if (!startTime) {
                console.warn(`No start mark found for: ${name}`);
                return null;
            }
            
            const duration = performance.now() - startTime;
            this.marks.delete(name);
            
            // Store metric
            if (!this.metrics.has(name)) {
                this.metrics.set(name, []);
            }
            
            const measurements = this.metrics.get(name);
            measurements.push(duration);
            
            // Keep only last 100 measurements
            if (measurements.length > 100) {
                measurements.shift();
            }
            
            return duration;
        }
        
        // Get metric statistics
        getStats(name) {
            const measurements = this.metrics.get(name);
            if (!measurements || measurements.length === 0) {
                return null;
            }
            
            const sorted = [...measurements].sort((a, b) => a - b);
            const sum = sorted.reduce((a, b) => a + b, 0);
            
            return {
                count: sorted.length,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                avg: sum / sorted.length,
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)]
            };
        }
        
        // Get all metrics
        getAllStats() {
            const stats = {};
            for (const [name, _] of this.metrics) {
                stats[name] = this.getStats(name);
            }
            return stats;
        }
        
        // Measure function execution
        measure(name, func) {
            return (...args) => {
                this.start(name);
                try {
                    const result = func(...args);
                    if (result instanceof Promise) {
                        return result.finally(() => this.end(name));
                    }
                    this.end(name);
                    return result;
                } catch (error) {
                    this.end(name);
                    throw error;
                }
            };
        }
    }
    
    // ==========================================
    // INITIALIZE AND EXPOSE GLOBALLY
    // ==========================================
    
    window.EnhancedUtils = EnhancedUtils;
    window.EnhancedDataManager = new EnhancedDataManager();
    window.EnhancedValidation = EnhancedValidation;
    window.EnhancedErrorHandler = new EnhancedErrorHandler();
    window.EnhancedPerformanceMonitor = new EnhancedPerformanceMonitor();
    
    console.log('✅ Enhanced Core Functions loaded');
    
})();
