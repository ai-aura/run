// 📱 Device Performance Optimizer for MessTrack
// Automatically detects low-end devices and applies optimizations

(function () {
    'use strict';

    class DeviceOptimizer {
        constructor() {
            this.performanceLevel = 'medium'; // high, medium, low
            this.isLowEndDevice = false;
            this.settings = {
                reduceAnimations: false,
                reduceBlur: false,
                reduceParticles: false,
                reduceTransparency: false,
                simplifyUI: false
            };

            this.init();
        }

        init() {
            this.detectDeviceCapabilities();
            this.loadUserPreference();
            // Only apply optimizations if user hasn't made a manual choice
            const saved = localStorage.getItem('messtrack_performance_mode');
            if (!saved || !JSON.parse(saved).manual) {
                this.applyOptimizations();
            } else {
                // User has manual preference, apply that
                const preference = JSON.parse(saved);
                this.performanceLevel = preference.level;
                this.updateSettings(preference.level);
                this.applyOptimizations();
            }
            this.setupEventListeners();
        }

        // Detect device performance level
        detectDeviceCapabilities() {
            const metrics = {
                cores: navigator.hardwareConcurrency || 2,
                memory: navigator.deviceMemory || 2, // GB
                connection: this.getConnectionSpeed(),
                gpu: this.detectGPU(),
                screenSize: window.innerWidth * window.innerHeight,
                pixelRatio: window.devicePixelRatio || 1
            };

            // Calculate performance score (0-100)
            let score = 100;

            // CPU cores (weight: 20)
            if (metrics.cores <= 2) score -= 20;
            else if (metrics.cores <= 4) score -= 10;

            // RAM (weight: 25)
            if (metrics.memory <= 2) score -= 25;
            else if (metrics.memory <= 4) score -= 15;
            else if (metrics.memory <= 6) score -= 5;

            // Connection (weight: 15)
            if (metrics.connection === 'slow') score -= 15;
            else if (metrics.connection === 'medium') score -= 8;

            // GPU (weight: 20)
            if (!metrics.gpu) score -= 20;
            else if (metrics.gpu === 'basic') score -= 10;

            // Screen resolution (weight: 10)
            if (metrics.screenSize < 500000) score -= 5; // Small screen
            if (metrics.pixelRatio > 2) score -= 5; // High DPI = more work

            // Battery status (weight: 10)
            this.checkBatteryStatus().then(batteryScore => {
                score -= batteryScore;
                this.finalizePerformanceLevel(score);
            });

            // Set initial level (will be updated after battery check)
            this.finalizePerformanceLevel(score);

            console.log('📊 Device Metrics:', metrics);
            console.log('📊 Performance Score:', score);
        }

        finalizePerformanceLevel(score) {
            if (score >= 70) {
                this.performanceLevel = 'medium'; // Default to balanced even for high-end
                this.isLowEndDevice = false;
                // Apply medium settings
                this.settings.reduceParticles = true;
                this.settings.reduceBlur = true;
            } else if (score >= 40) {
                this.performanceLevel = 'medium';
                this.isLowEndDevice = false;
                this.settings.reduceParticles = true;
                this.settings.reduceBlur = true;
            } else {
                this.performanceLevel = 'low';
                this.isLowEndDevice = true;
                this.settings.reduceAnimations = true;
                this.settings.reduceBlur = true;
                this.settings.reduceParticles = true;
                this.settings.reduceTransparency = true;
                this.settings.simplifyUI = true;
            }

            console.log('🎯 Performance Level:', this.performanceLevel);
            console.log('⚙️ Optimization Settings:', this.settings);
        }

        getConnectionSpeed() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (!connection) return 'unknown';

            const effectiveType = connection.effectiveType;
            if (effectiveType === '4g') return 'fast';
            if (effectiveType === '3g') return 'medium';
            return 'slow';
        }

        detectGPU() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) return null;

                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    // Check for integrated/low-end GPUs
                    if (renderer.includes('Intel') || renderer.includes('Mali') || renderer.includes('Adreno 3')) {
                        return 'basic';
                    }
                    return 'capable';
                }
                return 'capable';
            } catch (e) {
                return null;
            }
        }

        async checkBatteryStatus() {
            try {
                if ('getBattery' in navigator) {
                    const battery = await navigator.getBattery();
                    // If battery is low and not charging, reduce performance
                    if (battery.level < 0.2 && !battery.charging) {
                        return 10; // Reduce score
                    }
                    if (battery.level < 0.5 && !battery.charging) {
                        return 5;
                    }
                }
            } catch (e) {
                console.log('Battery API not available');
            }
            return 0;
        }

        loadUserPreference() {
            const saved = localStorage.getItem('messtrack_performance_mode');
            if (saved) {
                const preference = JSON.parse(saved);
                if (preference.manual) {
                    this.performanceLevel = preference.level;
                    this.isLowEndDevice = preference.level === 'low';
                    this.updateSettings(preference.level);
                }
            }
        }

        updateSettings(level) {
            if (level === 'low') {
                this.settings = {
                    reduceAnimations: true,
                    reduceBlur: true,
                    reduceParticles: true,
                    reduceTransparency: true,
                    simplifyUI: true
                };
            } else if (level === 'medium') {
                this.settings = {
                    reduceAnimations: false,
                    reduceBlur: true,
                    reduceParticles: true,
                    reduceTransparency: false,
                    simplifyUI: false
                };
            } else {
                this.settings = {
                    reduceAnimations: false,
                    reduceBlur: false,
                    reduceParticles: false,
                    reduceTransparency: false,
                    simplifyUI: false
                };
            }
        }

        applyOptimizations() {
            const root = document.documentElement;

            // Add performance class to body
            document.body.setAttribute('data-performance', this.performanceLevel);

            if (this.settings.reduceBlur) {
                root.style.setProperty('--blur-sm', '4px');
                root.style.setProperty('--blur-md', '6px');
                root.style.setProperty('--blur-lg', '8px');
                root.style.setProperty('--blur-xl', '10px');
                console.log('✅ Reduced blur intensity');
            }

            if (this.settings.reduceTransparency) {
                root.style.setProperty('--glass-primary', 'rgba(255, 255, 255, 0.15)');
                root.style.setProperty('--glass-secondary', 'rgba(255, 255, 255, 0.20)');
                root.style.setProperty('--glass-tertiary', 'rgba(255, 255, 255, 0.25)');
                console.log('✅ Increased opacity for better visibility');
            }

            if (this.settings.reduceAnimations) {
                this.disableHeavyAnimations();
                console.log('✅ Disabled heavy animations');
            }

            if (this.settings.reduceParticles) {
                this.removeParticleEffects();
                console.log('✅ Removed particle effects');
            }

            if (this.settings.simplifyUI) {
                this.simplifyUIElements();
                console.log('✅ Simplified UI elements');
            }

            // Optimize based on performance level
            if (this.performanceLevel === 'low') {
                this.applyLowEndOptimizations();
            } else if (this.performanceLevel === 'medium') {
                this.applyMediumEndOptimizations();
            }
        }

        disableHeavyAnimations() {
            const style = document.createElement('style');
            style.id = 'performance-animations';
            style.textContent = `
                /* Disable heavy animations for low-end devices */
                body[data-performance="low"] * {
                    animation-duration: 0.2s !important;
                    transition-duration: 0.2s !important;
                }
                
                body[data-performance="low"] .glass-panel::before,
                body[data-performance="low"] .card::after,
                body[data-performance="low"] .fab::after {
                    display: none !important;
                }
                
                body[data-performance="low"] body::before,
                body[data-performance="low"] body::after {
                    animation: none !important;
                    opacity: 0.3 !important;
                }
                
                /* Simplify hover effects */
                body[data-performance="low"] .btn-glass:hover,
                body[data-performance="low"] .nav-item:hover {
                    transform: none !important;
                }
                
                /* Remove gradient animations */
                body[data-performance="low"] .btn::before,
                body[data-performance="low"] button:not(.nav-item)::before {
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        removeParticleEffects() {
            // Remove floating particles
            setTimeout(() => {
                const particles = document.querySelector('.particle-container');
                if (particles) {
                    particles.remove();
                }
            }, 100);
        }

        simplifyUIElements() {
            const style = document.createElement('style');
            style.id = 'performance-ui';
            style.textContent = `
                /* Simplified UI for low-end devices */
                body[data-performance="low"] .glass {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                }
                
                body[data-performance="low"] .glass-panel {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                }
                
                /* Remove complex shadows */
                body[data-performance="low"] .btn-glass,
                body[data-performance="low"] button {
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
                }
                
                /* Simplify borders */
                body[data-performance="low"] * {
                    border-radius: 8px !important;
                }
                
                /* Remove text shadows */
                body[data-performance="low"] h1,
                body[data-performance="low"] h2,
                body[data-performance="low"] h3,
                body[data-performance="low"] h4,
                body[data-performance="low"] h5,
                body[data-performance="low"] h6 {
                    text-shadow: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        applyLowEndOptimizations() {
            // Disable glass UI enhancer
            if (window.glassUIEnhancerActive) {
                console.log('⚠️ Disabling glass UI enhancer for low-end device');
            }

            // Reduce calendar rendering complexity
            const style = document.createElement('style');
            style.textContent = `
                body[data-performance="low"] .calendar-day:hover {
                    transform: scale(1.02) !important;
                }
                
                body[data-performance="low"] .attendance-btn:hover {
                    transform: translateY(-2px) !important;
                }
                
                /* Disable parallax */
                body[data-performance="low"] .parallax {
                    transform: none !important;
                }
                
                /* Simplify scrollbar */
                body[data-performance="low"] ::-webkit-scrollbar {
                    width: 6px !important;
                    height: 6px !important;
                }
                
                body[data-performance="low"] ::-webkit-scrollbar-thumb {
                    background: rgba(102, 126, 234, 0.5) !important;
                }
            `;
            document.head.appendChild(style);
        }

        applyMediumEndOptimizations() {
            const style = document.createElement('style');
            style.textContent = `
                /* Medium performance optimizations */
                body[data-performance="medium"] body::before,
                body[data-performance="medium"] body::after {
                    animation-duration: 30s !important;
                }
                
                body[data-performance="medium"] .glass-panel::before {
                    animation-duration: 8s !important;
                }
            `;
            document.head.appendChild(style);
        }

        setupEventListeners() {
            // Monitor performance and adjust dynamically
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.duration > 100) {
                                console.warn('⚠️ Long task detected:', entry.duration.toFixed(2), 'ms');
                                // Could auto-downgrade performance level
                            }
                        }
                    });
                    observer.observe({ entryTypes: ['longtask'] });
                } catch (e) {
                    console.log('PerformanceObserver not fully supported');
                }
            }

            // Monitor memory usage
            if (performance.memory) {
                setInterval(() => {
                    const used = performance.memory.usedJSHeapSize / 1048576;
                    const limit = performance.memory.jsHeapSizeLimit / 1048576;

                    if (used > limit * 0.85 && this.performanceLevel !== 'low') {
                        console.warn('⚠️ High memory usage detected, consider reducing quality');
                    }
                }, 60000); // Check every minute
            }
        }

        // Manual performance mode toggle
        setPerformanceMode(level) {
            this.performanceLevel = level;
            this.isLowEndDevice = level === 'low';
            this.updateSettings(level);

            // Save preference
            localStorage.setItem('messtrack_performance_mode', JSON.stringify({
                level: level,
                manual: true
            }));

            // Reload to apply changes
            window.location.reload();
        }

        getPerformanceInfo() {
            return {
                level: this.performanceLevel,
                isLowEnd: this.isLowEndDevice,
                settings: this.settings,
                cores: navigator.hardwareConcurrency || 'unknown',
                memory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'unknown'
            };
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.deviceOptimizer = new DeviceOptimizer();
        });
    } else {
        window.deviceOptimizer = new DeviceOptimizer();
    }

    // Expose globally
    window.DeviceOptimizer = DeviceOptimizer;

})();
