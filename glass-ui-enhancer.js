// 🎨 Glassmorphism UI Enhancer
// Adds dynamic effects and interactions to the transparent UI

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        
        // ==========================================
        // Dynamic Background Effects
        // ==========================================
        
        // Create animated gradient background
        function createDynamicBackground() {
            const app = document.getElementById('app');
            if (!app) return;
            
            // Add glass-panel class to main containers
            const containers = document.querySelectorAll('.container, .max-w-7xl, .max-w-4xl, .max-w-2xl');
            containers.forEach(container => {
                container.classList.add('glass-panel');
            });
            
            // Add floating particles
            createFloatingParticles();
        }
        
        // Create floating particle effects
        function createFloatingParticles() {
            // Check performance level
            const performanceLevel = document.body.getAttribute('data-performance') || 'high';
            
            // Skip particles on low-end devices
            if (performanceLevel === 'low') {
                console.log('⚡ Skipping particle effects for low-end device');
                return;
            }
            
            const particleContainer = document.createElement('div');
            particleContainer.className = 'particle-container';
            particleContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 0;
                overflow: hidden;
            `;
            
            // Reduce particle count on medium devices
            const particleCount = performanceLevel === 'medium' ? 8 : 15;
            
            // Create particles
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'floating-particle';
                particle.style.cssText = `
                    position: absolute;
                    width: ${Math.random() * 100 + 50}px;
                    height: ${Math.random() * 100 + 50}px;
                    background: radial-gradient(circle, 
                        rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 255, 0.1) 0%, 
                        transparent 70%);
                    border-radius: 50%;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation: float${i} ${20 + Math.random() * 20}s infinite ease-in-out;
                    filter: blur(${Math.random() * 20 + 10}px);
                `;
                
                // Create unique animation for each particle
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes float${i} {
                        0%, 100% {
                            transform: translate(0, 0) scale(1);
                            opacity: ${Math.random() * 0.3 + 0.1};
                        }
                        25% {
                            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) scale(1.1);
                            opacity: ${Math.random() * 0.5 + 0.2};
                        }
                        50% {
                            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) scale(0.9);
                            opacity: ${Math.random() * 0.3 + 0.1};
                        }
                        75% {
                            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) scale(1.05);
                            opacity: ${Math.random() * 0.4 + 0.2};
                        }
                    }
                `;
                document.head.appendChild(style);
                
                particleContainer.appendChild(particle);
            }
            
            document.body.insertBefore(particleContainer, document.body.firstChild);
        }
        
        // ==========================================
        // Interactive Glass Effects
        // ==========================================
        
        // Add tilt effect on hover for cards
        function addTiltEffect() {
            const performanceLevel = document.body.getAttribute('data-performance') || 'high';
            
            // Skip tilt effect on low-end devices
            if (performanceLevel === 'low') {
                console.log('⚡ Skipping tilt effects for low-end device');
                return;
            }
            
            const cards = document.querySelectorAll('.card, .glass-panel, .stat-card');
            
            // Reduce tilt intensity on medium devices
            const intensity = performanceLevel === 'medium' ? 5 : 10;
            
            cards.forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateX = ((y - centerY) / centerY) * -intensity;
                    const rotateY = ((x - centerX) / centerX) * intensity;
                    
                    card.style.transform = `
                        perspective(1000px) 
                        rotateX(${rotateX}deg) 
                        rotateY(${rotateY}deg) 
                        translateZ(${intensity}px)
                    `;
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
                });
            });
        }
        
        // Add ripple effect on click
        function addRippleEffect() {
            const buttons = document.querySelectorAll('button, .btn, .nav-item');
            
            buttons.forEach(button => {
                button.addEventListener('click', function(e) {
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
                            rgba(255, 255, 255, 0.5) 0%, 
                            transparent 70%);
                        left: ${x}px;
                        top: ${y}px;
                        pointer-events: none;
                        transform: scale(0);
                        animation: rippleAnimation 0.6s ease-out;
                    `;
                    
                    this.style.position = 'relative';
                    this.style.overflow = 'hidden';
                    this.appendChild(ripple);
                    
                    setTimeout(() => ripple.remove(), 600);
                });
            });
            
            // Add ripple animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes rippleAnimation {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // ==========================================
        // Parallax Scrolling
        // ==========================================
        
        function addParallaxEffect() {
            const performanceLevel = document.body.getAttribute('data-performance') || 'high';
            
            // Skip parallax on low-end devices
            if (performanceLevel === 'low') {
                console.log('⚡ Skipping parallax effects for low-end device');
                return;
            }
            
            const parallaxElements = document.querySelectorAll('.card, .stat-card');
            
            // Throttle scroll events for better performance
            let ticking = false;
            
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        const scrolled = window.pageYOffset;
                        
                        parallaxElements.forEach((element, index) => {
                            const speed = 0.5 + (index * 0.1);
                            const yPos = -(scrolled * speed);
                            element.style.transform = `translateY(${yPos * 0.1}px)`;
                        });
                        
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        }
        
        // ==========================================
        // Glass Morphism Enhancements
        // ==========================================
        
        function enhanceGlassElements() {
            // Add glass class to all relevant elements
            const elements = [
                '.bg-white',
                '.bg-gray-50',
                '.bg-gray-100',
                '.bg-gray-800',
                '.bg-gray-900',
                '.bg-blue-500',
                '.bg-green-500',
                '.bg-indigo-600'
            ];
            
            elements.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.classList.add('glass-panel');
                    el.style.background = 'transparent';
                });
            });
            
            // Special treatment for navigation
            const nav = document.querySelector('nav');
            if (nav) {
                nav.classList.add('glass-panel');
                nav.style.position = 'sticky';
                nav.style.top = '0';
                nav.style.zIndex = '1000';
            }
            
            // Enhance input fields
            document.querySelectorAll('input, textarea, select').forEach(input => {
                input.classList.add('glass-input');
            });
            
            // Enhance buttons
            document.querySelectorAll('button, .btn').forEach(btn => {
                btn.classList.add('glass-button');
            });
        }
        
        // ==========================================
        // Dynamic Color Theme
        // ==========================================
        
        function applyDynamicTheme() {
            const performanceLevel = document.body.getAttribute('data-performance') || 'high';
            
            // Skip dynamic theme overlay on low-end devices
            if (performanceLevel === 'low') {
                console.log('⚡ Skipping dynamic theme overlay for low-end device');
                return;
            }
            
            const hour = new Date().getHours();
            let theme = 'day';
            
            if (hour >= 6 && hour < 12) {
                theme = 'morning';
            } else if (hour >= 12 && hour < 17) {
                theme = 'afternoon';
            } else if (hour >= 17 && hour < 20) {
                theme = 'evening';
            } else {
                theme = 'night';
            }
            
            document.body.setAttribute('data-time-theme', theme);
            
            // Add time-based gradient
            const gradient = {
                morning: 'linear-gradient(135deg, rgba(251, 207, 232, 0.1) 0%, rgba(199, 210, 254, 0.1) 100%)',
                afternoon: 'linear-gradient(135deg, rgba(254, 226, 226, 0.1) 0%, rgba(252, 231, 121, 0.1) 100%)',
                evening: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                night: 'linear-gradient(135deg, rgba(17, 24, 39, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)'
            };
            
            const overlay = document.createElement('div');
            overlay.className = 'time-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: ${gradient[theme]};
                pointer-events: none;
                z-index: -1;
                animation: fadeIn 2s ease-in-out;
            `;
            
            document.body.appendChild(overlay);
        }
        
        // ==========================================
        // Smooth Reveal Animation
        // ==========================================
        
        function addRevealAnimations() {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('glass-reveal');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.1 }
            );
            
            // Observe all cards and sections
            document.querySelectorAll('.card, section, .stat-card').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                observer.observe(el);
            });
            
            // Add reveal animation
            const style = document.createElement('style');
            style.textContent = `
                .glass-reveal {
                    animation: glassReveal 0.6s ease-out forwards;
                }
                
                @keyframes glassReveal {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // ==========================================
        // Initialize All Effects
        // ==========================================
        
        function initGlassUI() {
            try {
                createDynamicBackground();
                enhanceGlassElements();
                addTiltEffect();
                addRippleEffect();
                addParallaxEffect();
                applyDynamicTheme();
                addRevealAnimations();
                
                // Add loaded class to body
                document.body.classList.add('glass-ui-loaded');
                
                console.log('✨ Glassmorphism UI Enhanced Successfully!');
            } catch (error) {
                console.error('Glass UI Enhancement Error:', error);
            }
        }
        
        // Initialize with a slight delay to ensure DOM is fully loaded
        setTimeout(initGlassUI, 100);
        
        // Reinitialize on page navigation (for SPA)
        window.addEventListener('popstate', () => {
            setTimeout(initGlassUI, 100);
        });
        
    });
})();
