// 🎨 Button Enhancement System for MessTrack
// Adds dynamic interactions, haptic feedback, and advanced UX features

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initButtonEnhancements);
    } else {
        initButtonEnhancements();
    }

    function initButtonEnhancements() {
        console.log('🎨 Initializing Button Enhancements...');

        // Initialize all enhancement features
        addRippleEffects();
        addHapticFeedback();
        addLoadingStates();
        addTooltips();
        addKeyboardShortcuts();
        enhanceAccessibility();
        addButtonAnalytics();
        optimizeButtonPerformance();

        console.log('✨ Button Enhancements Initialized Successfully!');
    }

    // ==========================================
    // RIPPLE EFFECTS
    // ==========================================
    function addRippleEffects() {
        const performanceLevel = document.body.getAttribute('data-performance') || 'high';
        
        // Skip ripple effects on low-end devices
        if (performanceLevel === 'low') {
            console.log('⚡ Skipping ripple effects for low-end device');
            return;
        }

        // Add ripple to all buttons
        const buttons = document.querySelectorAll('.btn-glass, button:not(.nav-item), .attendance-btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                // Don't add ripple if disabled
                if (this.disabled) return;

                // Create ripple element
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: radial-gradient(circle, 
                        rgba(255, 255, 255, 0.6) 0%, 
                        rgba(255, 255, 255, 0.3) 50%,
                        transparent 70%);
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    transform: scale(0);
                    animation: rippleEffect 0.6s ease-out;
                    z-index: 1000;
                `;

                // Ensure button has relative positioning
                if (getComputedStyle(this).position === 'static') {
                    this.style.position = 'relative';
                }
                this.style.overflow = 'hidden';

                this.appendChild(ripple);

                // Remove ripple after animation
                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Add ripple animation CSS if not exists
        if (!document.getElementById('ripple-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation-styles';
            style.textContent = `
                @keyframes rippleEffect {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==========================================
    // HAPTIC FEEDBACK
    // ==========================================
    function addHapticFeedback() {
        // Check if vibration API is supported
        if (!('vibrate' in navigator)) return;

        const buttons = document.querySelectorAll('.btn-glass, button:not(.nav-item), .attendance-btn, .nav-item');

        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Don't vibrate if disabled
                if (this.disabled) return;

                // Different vibration patterns for different button types
                if (this.classList.contains('attendance-btn')) {
                    // Longer vibration for important actions
                    navigator.vibrate([30, 10, 20]);
                } else if (this.classList.contains('btn-danger') || 
                           this.classList.contains('bg-red-500')) {
                    // Warning pattern for destructive actions
                    navigator.vibrate([10, 10, 10]);
                } else {
                    // Short vibration for regular buttons
                    navigator.vibrate(15);
                }
            });
        });
    }

    // ==========================================
    // LOADING STATES
    // ==========================================
    function addLoadingStates() {
        // Add loading state helper to window
        window.setButtonLoading = function(button, loading = true) {
            if (typeof button === 'string') {
                button = document.querySelector(button);
            }
            
            if (!button) return;

            if (loading) {
                // Store original content
                button.dataset.originalContent = button.innerHTML;
                button.disabled = true;
                button.classList.add('loading');
                
                // Add spinner
                button.innerHTML = `
                    <span class="inline-flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading...</span>
                    </span>
                `;
            } else {
                // Restore original content
                button.disabled = false;
                button.classList.remove('loading');
                if (button.dataset.originalContent) {
                    button.innerHTML = button.dataset.originalContent;
                    delete button.dataset.originalContent;
                }
            }
        };

        // Add loading styles
        const style = document.createElement('style');
        style.textContent = `
            button.loading {
                opacity: 0.7;
                cursor: wait;
                pointer-events: none;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .animate-spin {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // TOOLTIPS
    // ==========================================
    function addTooltips() {
        const buttons = document.querySelectorAll('[title], [data-tooltip]');
        
        buttons.forEach(button => {
            const tooltipText = button.getAttribute('title') || button.getAttribute('data-tooltip');
            if (!tooltipText) return;

            // Remove default title to prevent browser tooltip
            button.removeAttribute('title');
            button.setAttribute('data-tooltip', tooltipText);

            let tooltip = null;

            button.addEventListener('mouseenter', function() {
                // Create tooltip
                tooltip = document.createElement('div');
                tooltip.className = 'custom-tooltip';
                tooltip.textContent = tooltipText;
                tooltip.style.cssText = `
                    position: fixed;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    z-index: 10000;
                    pointer-events: none;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    opacity: 0;
                    transform: translateY(-5px);
                    transition: opacity 0.2s ease, transform 0.2s ease;
                `;

                document.body.appendChild(tooltip);

                // Position tooltip
                const rect = this.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                let top = rect.top - tooltipRect.height - 8;

                // Keep tooltip in viewport
                if (left < 10) left = 10;
                if (left + tooltipRect.width > window.innerWidth - 10) {
                    left = window.innerWidth - tooltipRect.width - 10;
                }
                if (top < 10) {
                    top = rect.bottom + 8;
                }

                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';

                // Fade in
                requestAnimationFrame(() => {
                    tooltip.style.opacity = '1';
                    tooltip.style.transform = 'translateY(0)';
                });
            });

            button.addEventListener('mouseleave', function() {
                if (tooltip) {
                    tooltip.style.opacity = '0';
                    tooltip.style.transform = 'translateY(-5px)';
                    setTimeout(() => tooltip.remove(), 200);
                    tooltip = null;
                }
            });
        });
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    function addKeyboardShortcuts() {
        const shortcuts = {
            'l': () => document.getElementById('lunchBtn')?.click(),
            'd': () => document.getElementById('dinnerBtn')?.click(),
            'h': () => document.querySelector('[data-page="dashboard"]')?.click(),
            'w': () => document.querySelector('[data-page="weekly"]')?.click(),
            'c': () => document.querySelector('[data-page="history"]')?.click(),
            's': () => document.querySelector('[data-page="summary"]')?.click(),
            'g': () => document.querySelector('[data-page="settings"]')?.click(),
        };

        document.addEventListener('keydown', (e) => {
            // Don't trigger if user is typing in an input
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.isContentEditable) {
                return;
            }

            // Check for Alt + key combination
            if (e.altKey && shortcuts[e.key.toLowerCase()]) {
                e.preventDefault();
                shortcuts[e.key.toLowerCase()]();
            }
        });

        // Add keyboard shortcut hints
        console.log('⌨️ Keyboard Shortcuts Available:');
        console.log('Alt + L: Mark Lunch');
        console.log('Alt + D: Mark Dinner');
        console.log('Alt + H: Go to Home');
        console.log('Alt + W: Go to Weekly View');
        console.log('Alt + C: Go to Calendar/History');
        console.log('Alt + S: Go to Stats');
        console.log('Alt + G: Go to Settings');
    }

    // ==========================================
    // ACCESSIBILITY ENHANCEMENTS
    // ==========================================
    function enhanceAccessibility() {
        const buttons = document.querySelectorAll('.btn-glass, button:not(.nav-item), .attendance-btn');

        buttons.forEach(button => {
            // Add ARIA labels if missing
            if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
                const icon = button.querySelector('i');
                if (icon) {
                    const classes = Array.from(icon.classList);
                    const iconName = classes.find(c => c.startsWith('fa-'))?.replace('fa-', '');
                    if (iconName) {
                        button.setAttribute('aria-label', iconName.replace(/-/g, ' '));
                    }
                }
            }

            // Add role if missing
            if (!button.getAttribute('role') && button.tagName !== 'BUTTON') {
                button.setAttribute('role', 'button');
            }

            // Add tabindex if missing
            if (!button.hasAttribute('tabindex') && button.tagName !== 'BUTTON') {
                button.setAttribute('tabindex', '0');
            }

            // Add keyboard support for non-button elements
            if (button.tagName !== 'BUTTON') {
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                    }
                });
            }
        });

        // Add focus visible styles
        const style = document.createElement('style');
        style.textContent = `
            .btn-glass:focus-visible,
            button:focus-visible,
            .attendance-btn:focus-visible {
                outline: 3px solid rgba(99, 102, 241, 0.6);
                outline-offset: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // BUTTON ANALYTICS
    // ==========================================
    function addButtonAnalytics() {
        const buttons = document.querySelectorAll('.btn-glass, button:not(.nav-item), .attendance-btn');

        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const buttonId = this.id || 'unknown';
                const buttonText = this.textContent.trim() || 'no-text';
                const buttonClass = this.className;

                // Log analytics (can be sent to analytics service)
                if (window.DEBUG_MODE) {
                    console.log('Button Click Analytics:', {
                        id: buttonId,
                        text: buttonText,
                        class: buttonClass,
                        timestamp: new Date().toISOString()
                    });
                }

                // Store in session for usage patterns
                try {
                    const clicks = JSON.parse(sessionStorage.getItem('button_clicks') || '{}');
                    clicks[buttonId] = (clicks[buttonId] || 0) + 1;
                    sessionStorage.setItem('button_clicks', JSON.stringify(clicks));
                } catch (e) {
                    // Ignore storage errors
                }
            });
        });
    }

    // ==========================================
    // PERFORMANCE OPTIMIZATION
    // ==========================================
    function optimizeButtonPerformance() {
        const performanceLevel = document.body.getAttribute('data-performance') || 'high';

        // Debounce rapid clicks
        const buttons = document.querySelectorAll('.btn-glass, button:not(.nav-item), .attendance-btn');
        
        buttons.forEach(button => {
            let lastClick = 0;
            const minInterval = performanceLevel === 'low' ? 300 : 150;

            button.addEventListener('click', function(e) {
                const now = Date.now();
                if (now - lastClick < minInterval) {
                    e.stopImmediatePropagation();
                    return false;
                }
                lastClick = now;
            }, true);
        });

        // Lazy load button animations
        if (performanceLevel === 'low') {
            const style = document.createElement('style');
            style.textContent = `
                .btn-glass,
                button:not(.nav-item),
                .attendance-btn {
                    transition-duration: 0.15s !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Use passive event listeners for better scroll performance
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {}, { passive: true });
            button.addEventListener('touchmove', () => {}, { passive: true });
        });
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    // Add global button utility functions
    window.buttonUtils = {
        // Disable button with loading state
        disable: function(button, showLoading = true) {
            if (typeof button === 'string') {
                button = document.querySelector(button);
            }
            if (!button) return;
            
            if (showLoading) {
                window.setButtonLoading(button, true);
            } else {
                button.disabled = true;
                button.style.opacity = '0.5';
            }
        },

        // Enable button
        enable: function(button) {
            if (typeof button === 'string') {
                button = document.querySelector(button);
            }
            if (!button) return;
            
            window.setButtonLoading(button, false);
            button.disabled = false;
            button.style.opacity = '';
        },

        // Add success state
        success: function(button, message = 'Success!', duration = 2000) {
            if (typeof button === 'string') {
                button = document.querySelector(button);
            }
            if (!button) return;

            const originalContent = button.innerHTML;
            button.innerHTML = `<i class="fas fa-check mr-2"></i>${message}`;
            button.classList.add('btn-success');

            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('btn-success');
            }, duration);
        },

        // Add error state
        error: function(button, message = 'Error!', duration = 2000) {
            if (typeof button === 'string') {
                button = document.querySelector(button);
            }
            if (!button) return;

            const originalContent = button.innerHTML;
            button.innerHTML = `<i class="fas fa-times mr-2"></i>${message}`;
            button.classList.add('btn-danger');

            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('btn-danger');
            }, duration);
        }
    };

    // Expose initialization function for manual re-initialization
    window.reinitButtonEnhancements = initButtonEnhancements;

})();
