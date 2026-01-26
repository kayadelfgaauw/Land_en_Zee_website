document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // Lenis Smooth Scroll Initialization
    // =========================================

    let lenis = null;

    // Only initialize Lenis if the library is loaded
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,                    // Scroll duration (higher = slower)
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing curve
            orientation: 'vertical',          // Scroll direction
            smoothWheel: true,                // Smooth scrolling for mouse wheel
            wheelMultiplier: 1,               // Wheel scroll speed
            touchMultiplier: 2,               // Touch scroll speed
            infinite: false,                  // Infinite scroll
        });

        // Animation frame loop for Lenis
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // Header Scroll Effect
    // Header Scroll Effect - Optimized with IntersectionObserver
    const header = document.getElementById('main-header');

    // Create a sentinel element to efficiently track scroll position without continuous events
    const scrollWatcher = document.createElement('div');
    scrollWatcher.setAttribute('data-scroll-watcher', '');
    scrollWatcher.style.position = 'absolute';
    scrollWatcher.style.top = '0';
    scrollWatcher.style.left = '0';
    scrollWatcher.style.width = '100%';
    scrollWatcher.style.height = '50px'; // The scroll threshold
    scrollWatcher.style.pointerEvents = 'none';
    scrollWatcher.style.visibility = 'hidden';
    scrollWatcher.style.zIndex = '-1';
    document.body.prepend(scrollWatcher);

    const headerObserver = new IntersectionObserver((entries) => {
        // Toggle 'scrolled' class based on whether the sentinel is visible
        if (!entries[0].isIntersecting) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { rootMargin: '0px', threshold: 0 });

    headerObserver.observe(scrollWatcher);

    // Smooth scroll for anchor links (using Lenis if available)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                if (lenis) {
                    // Use Lenis for smooth scrolling
                    lenis.scrollTo(target, {
                        offset: 0,
                        duration: 1.5
                    });
                } else {
                    // Fallback to native smooth scroll
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // =========================================
    // Room Image Carousels (3-up on desktop, 1-up on mobile)
    // =========================================

    const carousels = document.querySelectorAll('.room-carousel');

    carousels.forEach(carousel => {
        const slides = carousel.querySelector('.carousel-slides');
        const images = slides.querySelectorAll('img');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');
        const currentSpan = carousel.querySelector('.carousel-counter .current');
        const totalSpan = carousel.querySelector('.carousel-counter .total');

        let currentIndex = 0;
        const totalSlides = images.length;

        // Update total count
        if (totalSpan) {
            totalSpan.textContent = totalSlides;
        }

        // Check if this is a room-gallery carousel (3-up on desktop) or regular (1-up)
        const isRoomGallery = carousel.classList.contains('room-gallery');

        // Determine how many slides are visible based on screen width and carousel type
        function getSlidesVisible() {
            // Only room-gallery shows 3 images on desktop
            if (isRoomGallery && window.innerWidth >= 768) {
                return 3;
            }
            return 1;
        }

        // Get the max index we can scroll to (so last slides are visible)
        function getMaxIndex() {
            const visible = getSlidesVisible();
            return Math.max(0, totalSlides - visible);
        }

        function updateCarousel() {
            const visible = getSlidesVisible();
            const gap = (isRoomGallery && visible > 1) ? 16 : 0; // 16px gap only for room-gallery on desktop

            // Calculate slide width as percentage
            // On desktop: each slide is (100% - 32px) / 3 = approx 33.33% minus gap
            // We need to calculate the actual pixel offset
            const containerWidth = slides.parentElement.offsetWidth;
            const totalGapWidth = (visible - 1) * gap;
            const slideWidth = (containerWidth - totalGapWidth) / visible;
            const offset = currentIndex * (slideWidth + gap);

            slides.style.transform = `translateX(-${offset}px)`;

            // Update counter to show first visible slide
            if (currentSpan) {
                currentSpan.textContent = currentIndex + 1;
            }

            // Update button visibility/state
            if (prevBtn) {
                prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '';
                prevBtn.style.pointerEvents = currentIndex === 0 ? 'none' : '';
            }
            if (nextBtn) {
                const maxIdx = getMaxIndex();
                nextBtn.style.opacity = currentIndex >= maxIdx ? '0.3' : '';
                nextBtn.style.pointerEvents = currentIndex >= maxIdx ? 'none' : '';
            }
        }

        function nextSlide() {
            const maxIdx = getMaxIndex();
            if (currentIndex < maxIdx) {
                currentIndex++;
                updateCarousel();
            }
        }

        function prevSlide() {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', nextSlide);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', prevSlide);
        }

        // Touch/Swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    nextSlide(); // Swipe left = next
                } else {
                    prevSlide(); // Swipe right = prev
                }
            }
        }

        // Recalculate on resize
        window.addEventListener('resize', () => {
            // Ensure currentIndex doesn't exceed maxIndex after resize
            const maxIdx = getMaxIndex();
            if (currentIndex > maxIdx) {
                currentIndex = maxIdx;
            }
            updateCarousel();
        });

        // Initialize
        updateCarousel();
    });

    // =========================================
    // Fullscreen Menu
    // =========================================

    const menuTrigger = document.querySelector('.menu-trigger');
    const menuClose = document.querySelector('.menu-close');
    const fullscreenMenu = document.querySelector('.fullscreen-menu');
    const menuLinks = document.querySelectorAll('.menu-nav a');
    const menuImages = document.querySelectorAll('.menu-image');

    // Open menu
    if (menuTrigger && fullscreenMenu) {
        menuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            fullscreenMenu.classList.add('active');
            fullscreenMenu.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close menu
    if (menuClose && fullscreenMenu) {
        menuClose.addEventListener('click', () => {
            fullscreenMenu.classList.remove('active');
            fullscreenMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        });
    }

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fullscreenMenu && fullscreenMenu.classList.contains('active')) {
            fullscreenMenu.classList.remove('active');
            fullscreenMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    });

    // Hover effect for menu images (only on devices with hover capability)
    if (window.matchMedia('(hover: hover)').matches) {
        menuLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                const imageId = link.dataset.image;
                if (imageId) {
                    menuImages.forEach(img => {
                        img.classList.remove('active');
                        if (img.dataset.id === imageId) {
                            img.classList.add('active');
                        }
                    });
                }
            });
        });
    }

    // Show first image by default when menu opens
    if (menuImages.length > 0) {
        menuImages[0].classList.add('active');
    }

    // =========================================
    // Strand Image Carousel
    // =========================================

    const strandCarousel = document.getElementById('strandCarousel');

    if (strandCarousel) {
        const images = strandCarousel.querySelectorAll('.carousel-image');
        const dots = strandCarousel.querySelectorAll('.carousel-dot');
        const prevBtn = strandCarousel.querySelector('.carousel-prev');
        const nextBtn = strandCarousel.querySelector('.carousel-next');
        let currentIndex = 0;

        function showImage(index) {
            // Handle wraparound
            if (index >= images.length) index = 0;
            if (index < 0) index = images.length - 1;

            currentIndex = index;

            // Update images
            images.forEach((img, i) => {
                img.classList.toggle('active', i === currentIndex);
            });

            // Update dots
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }

        // Button handlers
        if (prevBtn) {
            prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => showImage(currentIndex + 1));
        }

        // Dot handlers
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                showImage(index);
            });
        });

        // Touch/swipe support
        let touchStartX = 0;

        strandCarousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        strandCarousel.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    showImage(currentIndex + 1); // Swipe left = next
                } else {
                    showImage(currentIndex - 1); // Swipe right = prev
                }
            }
        }, { passive: true });

        // Initialize display
        showImage(0);
    }

    // =========================================
    // Scroll Animations (IntersectionObserver)
    // =========================================

    // Check if browser supports IntersectionObserver
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null, // viewport
            rootMargin: '0px 0px -50px 0px', // trigger slightly before element is fully in view
            threshold: 0.15 // trigger when 15% of element is visible
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Stop observing once visible
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Target elements with .reveal-on-scroll class
        document.querySelectorAll('.reveal-on-scroll').forEach(el => {
            observer.observe(el);
        });

        // Also target .reveal-stagger-container to trigger child animations
        document.querySelectorAll('.reveal-stagger-container').forEach(el => {
            observer.observe(el);
        });
    } else {
        // Fallback for older browsers: show everything immediately
        document.querySelectorAll('.reveal-on-scroll, .reveal-stagger-container').forEach(el => {
            el.classList.add('is-visible');
        });
    }

    // =========================================
    // In-Frame Parallax Effect
    // =========================================

    const parallaxContainer = document.querySelector('.sus-image-col');
    const parallaxImage = document.querySelector('.sus-image');

    if (parallaxContainer && parallaxImage) {
        function updateParallax() {
            const containerRect = parallaxContainer.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Check if container is in viewport
            if (containerRect.top < windowHeight && containerRect.bottom > 0) {
                // Calculate how far through the viewport the container has scrolled
                // Range: 0 (just entering from bottom) to 1 (just leaving at top)
                const scrollProgress = (windowHeight - containerRect.top) / (windowHeight + containerRect.height);

                // Clamp between 0 and 1
                const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

                // Calculate the parallax offset
                // Image is 130% height, so we have 30% extra to move
                // Move from 0% to -30% as we scroll through
                const maxOffset = (parallaxImage.offsetHeight - containerRect.height);
                const translateY = -clampedProgress * maxOffset;

                parallaxImage.style.transform = `translateY(${translateY}px)`;
            }
        }

        // If Lenis is available, use its scroll event for smoother parallax
        if (lenis) {
            lenis.on('scroll', updateParallax);
        } else {
            // Fallback to native scroll event
            window.addEventListener('scroll', updateParallax, { passive: true });
        }

        // Initial update
        updateParallax();

        // Update on resize
        window.addEventListener('resize', updateParallax, { passive: true });
    }

    // =========================================
    // Other Rooms Carousel (Infinite Loop)
    // =========================================

    const otherRoomsCarousel = document.getElementById('otherRoomsCarousel');

    if (otherRoomsCarousel) {
        const track = otherRoomsCarousel.querySelector('.other-rooms-track');
        const originalCards = Array.from(track.querySelectorAll('.room-card-mini'));
        const prevBtn = otherRoomsCarousel.querySelector('.other-rooms-prev');
        const nextBtn = otherRoomsCarousel.querySelector('.other-rooms-next');

        let currentIndex = 0;
        let cardsToShow = 3;
        let isTransitioning = false;

        // Clone cards for infinite loop effect
        function setupInfiniteLoop() {
            // Remove any existing clones
            track.querySelectorAll('.room-card-mini.clone').forEach(el => el.remove());

            // Disable infinite loop clones on mobile (use native scroll)
            if (window.innerWidth <= 768) {
                return;
            }

            // Clone cards at the beginning and end
            const clonesToAdd = Math.max(cardsToShow, 1);

            // Clone last cards and prepend
            for (let i = originalCards.length - 1; i >= originalCards.length - clonesToAdd; i--) {
                const clone = originalCards[i].cloneNode(true);
                clone.classList.add('clone');
                track.insertBefore(clone, track.firstChild);
            }

            // Clone first cards and append
            for (let i = 0; i < clonesToAdd; i++) {
                const clone = originalCards[i].cloneNode(true);
                clone.classList.add('clone');
                track.appendChild(clone);
            }

            // Set initial position to first real card
            currentIndex = clonesToAdd;
            updateCarousel(false);
        }

        // Determine how many cards to show based on screen width
        function updateCardsToShow() {
            if (window.innerWidth <= 768) {
                cardsToShow = 1;
                // On mobile, ensure transform is cleared so native scroll works
                track.style.transform = '';
                track.style.transition = '';
            } else if (window.innerWidth <= 1200) {
                cardsToShow = 2;
            } else {
                cardsToShow = 3;
            }
        }

        // Calculate and apply the transform
        function updateCarousel(animate = true) {
            // Disable JS carousel positioning on mobile (let native scroll handle it)
            if (window.innerWidth <= 768) return;

            const allCards = track.querySelectorAll('.room-card-mini');
            if (allCards.length === 0) return;

            const cardWidth = allCards[0].offsetWidth;
            const gap = 24; // 1.5rem gap
            const offset = currentIndex * (cardWidth + gap);

            if (!animate) {
                track.style.transition = 'none';
            } else {
                track.style.transition = 'transform 0.5s ease';
            }

            track.style.transform = `translateX(-${offset}px)`;

            // Re-enable transition after instant jump
            if (!animate) {
                setTimeout(() => {
                    track.style.transition = 'transform 0.5s ease';
                }, 50);
            }
        }

        // Handle transition end for seamless loop
        function handleTransitionEnd() {
            if (isTransitioning) {
                const allCards = track.querySelectorAll('.room-card-mini');
                const totalCards = allCards.length;
                const cloneCount = Math.max(cardsToShow, 1);

                // If we're at a cloned card at the end, jump to the real card at the start
                if (currentIndex >= totalCards - cloneCount) {
                    currentIndex = cloneCount;
                    updateCarousel(false);
                }
                // If we're at a cloned card at the start, jump to the real card at the end
                else if (currentIndex < cloneCount) {
                    currentIndex = totalCards - cloneCount * 2;
                    updateCarousel(false);
                }

                isTransitioning = false;
            }
        }

        track.addEventListener('transitionend', handleTransitionEnd);

        // Navigate to next card
        function nextSlide() {
            if (isTransitioning) return;
            isTransitioning = true;
            currentIndex++;
            updateCarousel(true);
        }

        // Navigate to previous card
        function prevSlide() {
            if (isTransitioning) return;
            isTransitioning = true;
            currentIndex--;
            updateCarousel(true);
        }

        // Event listeners
        if (nextBtn) {
            nextBtn.addEventListener('click', nextSlide);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', prevSlide);
        }

        // Touch/Swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        otherRoomsCarousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        otherRoomsCarousel.addEventListener('touchend', (e) => {
            // Disable JS swipe logic on mobile (conflict with native scroll)
            if (window.innerWidth <= 768) return;

            touchEndX = e.changedTouches[0].screenX;
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
        }, { passive: true });

        // Handle resize
        window.addEventListener('resize', () => {
            updateCardsToShow();
            setupInfiniteLoop();
        });

        // Initialize
        updateCardsToShow();
        setupInfiniteLoop();
    }

    // =========================================
    // Mobile Swipe Counter for Other Rooms
    // =========================================

    const otherRoomsSection = document.querySelector('.other-rooms-section');
    const trackWrapper = document.querySelector('.other-rooms-track-wrapper');
    const roomCounter = document.querySelector('.other-rooms-counter');

    if (trackWrapper && roomCounter) {
        const track = trackWrapper.querySelector('.other-rooms-track');
        const cards = track ? track.querySelectorAll('.room-card-mini:not(.clone)') : [];
        const currentSpan = roomCounter.querySelector('.current');
        const totalSpan = roomCounter.querySelector('.total');

        if (cards.length > 0 && currentSpan && totalSpan) {
            // Set total count
            totalSpan.textContent = cards.length;

            // Update counter based on scroll position
            function updateSwipeCounter() {
                const wrapperRect = trackWrapper.getBoundingClientRect();
                const wrapperCenter = wrapperRect.left + wrapperRect.width / 2;

                let closestIndex = 0;
                let closestDistance = Infinity;

                cards.forEach((card, index) => {
                    const cardRect = card.getBoundingClientRect();
                    const cardCenter = cardRect.left + cardRect.width / 2;
                    const distance = Math.abs(wrapperCenter - cardCenter);

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = index;
                    }
                });

                currentSpan.textContent = closestIndex + 1;
            }

            // Listen to scroll events on the wrapper
            trackWrapper.addEventListener('scroll', updateSwipeCounter, { passive: true });

            // Initial update
            updateSwipeCounter();
        }
    }
});
