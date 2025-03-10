// Check if mediaMetadata exists - it should be declared in mediaMetadata.js
// We're using window.mediaMetadata now to avoid redeclaration issues
if (typeof window.mediaMetadata === 'undefined') {
  console.warn('No mediaMetadata found, initializing empty array');
  window.mediaMetadata = [];
}

let currentYear;
let currentMonth;
let mediaFiles = {}; // Storage for both images and videos
let cellSize = 100;
let padding = 10;
let calendar;
let totalMedia = 0;
let loadedMedia = 0;
let loadingErrors = 0;
let showLoadingScreen = true;
let videoElements = {}; // Store video elements for videos
let banners = []; // Array to store banner information

// Media type icons and indicators
const VIDEO_ICON = '🎬'; // Video icon
const IMAGE_ICON = '🖼️'; // Image icon

// Banner types and colors
const BANNER_TYPES = {
  STANDARD: {color: 'rgba(65, 105, 225, 0.7)', textColor: '#000'}, // Royal Blue
  IMPORTANT: {color: 'rgba(220, 20, 60, 0.7)', textColor: '#000'}, // Crimson
  INFO: {color: 'rgba(46, 139, 87, 0.7)', textColor: '#000'}, // Sea Green
  CELEBRATION: {color: 'rgba(255, 165, 0, 0.7)', textColor: '#000'}, // Orange
  WARNING: {color: 'rgba(255, 69, 0, 0.7)', textColor: '#000'} // Red-Orange
};

// Date restrictions
const MIN_DATE = { year: 2024, month: 5 }; // May 2024
const MAX_DATE = { year: 2025, month: 5 }; // May 2025

function isDateInRange(year, month) {
    if (year < MIN_DATE.year || year > MAX_DATE.year) return false;
    if (year === MIN_DATE.year && month < MIN_DATE.month) return false;
    if (year === MAX_DATE.year && month > MAX_DATE.month) return false;
    return true;
}

// Media loading success callback
function mediaLoaded(filename, type) {
    loadedMedia++;
    console.log(`Loaded ${type}: ${filename} (${loadedMedia}/${totalMedia})`);
    if (loadedMedia + loadingErrors >= totalMedia) {
        console.log(`All media loaded (${loadedMedia} successful, ${loadingErrors} failed)`);
        showLoadingScreen = false;
    }
}

// Media loading error callback
function mediaError(filename, type) {
    console.error(`Failed to load ${type}: ${filename}`);
    loadingErrors++;
    if (loadedMedia + loadingErrors >= totalMedia) {
        console.log(`All media processed (${loadedMedia} successful, ${loadingErrors} failed)`);
        showLoadingScreen = false;
    }
}

// Function to load a video (creates HTML5 video element)
function loadVideo(filename) {
    // Create a video element
    let videoPath = 'jpegs/' + filename; // Using the same directory for now
    let videoElement = document.createElement('video');
    videoElement.src = videoPath;
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    videoElement.muted = true;
    videoElement.loop = true;
    
    // Store poster (thumbnail) frame
    videoElement.setAttribute('poster', 'jpegs/' + filename.replace(/\.(mp4|mov)$/i, '.jpg'));
    
    // Add load event to track loading
    videoElement.addEventListener('loadeddata', () => {
        mediaFiles[filename] = {
            element: videoElement,
            type: 'video',
            loaded: true,
            width: videoElement.videoWidth,
            height: videoElement.videoHeight
        };
        mediaLoaded(filename, 'video');
    });
    
    // Error handling
    videoElement.addEventListener('error', () => {
        mediaError(filename, 'video');
    });
    
    // Start loading the video
    videoElement.load();
    
    return videoElement;
}

function preload() {
    // Always use window.mediaMetadata to avoid variable conflicts
    // Handle case where mediaMetadata is empty or not an array
    if (!Array.isArray(window.mediaMetadata) || window.mediaMetadata.length === 0) {
        console.log('No items in mediaMetadata, checking imageMetadata...');
        // If mediaMetadata is empty, check if imageMetadata exists
        if (typeof window.imageMetadata !== 'undefined' && Array.isArray(window.imageMetadata) && window.imageMetadata.length > 0) {
            console.log('Converting imageMetadata to mediaMetadata format...');
            // Create a temporary array for conversion
            const convertedMetadata = window.imageMetadata.map(item => ({
                ...item,
                type: 'image' // Add type field
            }));
            // Assign to window.mediaMetadata
            window.mediaMetadata = convertedMetadata;
        } else {
            // Try to load imageMetadata.js dynamically if not already loaded
            if (typeof window.imageMetadata === 'undefined') {
                console.log('Attempting to load imageMetadata.js dynamically...');
                const script = document.createElement('script');
                script.src = 'js/imageMetadata.js';
                script.onload = function() {
                    if (typeof window.imageMetadata !== 'undefined' && Array.isArray(window.imageMetadata)) {
                        console.log('Successfully loaded imageMetadata.js, converting to mediaMetadata format...');
                        const convertedMetadata = window.imageMetadata.map(item => ({
                            ...item,
                            type: 'image'
                        }));
                        window.mediaMetadata = convertedMetadata;
                        // Restart preload after loading metadata
                        preload();
                    }
                };
                document.head.appendChild(script);
                // Return early to wait for script to load
                return;
            } else {
                console.error('No metadata available (neither mediaMetadata nor imageMetadata has content)');
                showLoadingScreen = false;
                return;
            }
        }
    }
    
    // Count total media files to track loading progress
    totalMedia = window.mediaMetadata.length;
    console.log(`Loading ${totalMedia} media files...`);
    
    if (totalMedia === 0) {
        console.warn('No media files to load');
        showLoadingScreen = false;
        return;
    }
    
    // Process each media item
    for (let item of window.mediaMetadata) {
        if (!item || !item.filename) continue;
        
        let filename = item.filename;
        let type = item.type || 'image';
        
        if (type === 'image') {
            // Load image using p5's loadImage with callback functions
            loadImage(
                'jpegs/' + filename,
                // Success callback
                (img) => {
                    mediaFiles[filename] = {
                        element: img,
                        type: 'image',
                        loaded: true
                    };
                    mediaLoaded(filename, 'image');
                },
                // Error callback
                () => mediaError(filename, 'image')
            );
        } else if (type === 'video') {
            // Load video (creates HTML5 video element)
            videoElements[filename] = loadVideo(filename);
        }
    }
}

function setup() {
    // Set initial date within the allowed range
    let today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1;

    // Ensure initial date is within range
    if (!isDateInRange(currentYear, currentMonth)) {
        currentYear = MIN_DATE.year;
        currentMonth = MIN_DATE.month;
    }

    // Calculate cell size based on window width for responsiveness
    updateCellSize();
    
    // Create canvas
    const canvasWidth = cellSize * 7 + padding * 8;
    const canvasHeight = cellSize * 6 + padding * 7;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('calendar-container');

    // Setup calendar
    updateCalendar();
    setupControls();
    setupModal();
    
    // Add banners
    addAllBanners();
}

function windowResized() {
    // Update cell size based on new window dimensions
    updateCellSize();
    
    // Resize canvas
    const canvasWidth = cellSize * 7 + padding * 8;
    const canvasHeight = cellSize * 6 + padding * 7;
    resizeCanvas(canvasWidth, canvasHeight);
    
    // Redraw calendar
    updateCalendar();
}

function updateCellSize() {
    // Make cell size responsive based on window width
    const minCellSize = 40; // Minimum cell size for very small screens
    const defaultCellSize = 100; // Default size for larger screens
    
    if (windowWidth < 768) { // Mobile breakpoint
        cellSize = max(minCellSize, windowWidth / 8); // Allow for some margins
        padding = max(5, padding * windowWidth / 1200); // Scale padding too
    } else {
        cellSize = defaultCellSize;
        padding = 10;
    }
}

function draw() {
    background(240);
    
    if (showLoadingScreen) {
        // Display loading screen
        textAlign(CENTER, CENTER);
        fill(50);
        textSize(16);
        const loadingText = `Loading media: ${loadedMedia}/${totalMedia}`;
        text(loadingText, width/2, height/2 - 30);
        
        // Show media type breakdown
        const imageCount = Object.values(mediaFiles).filter(m => m && m.type === 'image').length;
        const videoCount = Object.values(mediaFiles).filter(m => m && m.type === 'video').length;
        const typesText = `Images: ${imageCount} | Videos: ${videoCount}`;
        textSize(14);
        text(typesText, width/2, height/2 - 10);
        
        // Draw loading bar
        const barWidth = width * 0.6;
        const barHeight = 20;
        const progress = totalMedia > 0 ? loadedMedia / totalMedia : 0;
        
        // Bar background
        fill(200);
        noStroke();
        rect(width/2 - barWidth/2, height/2, barWidth, barHeight, 5);
        
        // Progress bar
        fill(0, 150, 255);
        rect(width/2 - barWidth/2, height/2, barWidth * progress, barHeight, 5);
        
        // Show error count if any
        if (loadingErrors > 0) {
            fill(255, 0, 0);
            textSize(14);
            text(`${loadingErrors} errors`, width/2, height/2 + 40);
        }
    } else {
        // Draw the calendar when loading is complete
        drawCalendar();
    }
}

function updateCalendar() {
    calendar = createCalendarGrid();
    updateDateDisplay();
    
    // Update banners for the new month/year
    addAllBanners();
}

function createCalendarGrid() {
    const grid = [];
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
        grid.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const mediaItems = getMediaForDate(currentYear, currentMonth, day);
        grid.push({
            day: day,
            images: mediaItems  // Keep the name "images" for backward compatibility
        });
    }
    
    return grid;
}

function drawCalendar() {
    // Draw weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    textAlign(CENTER, CENTER);
    textSize(14);
    fill(100);
    
    for (let i = 0; i < 7; i++) {
        const x = padding + i * (cellSize + padding);
        text(weekdays[i], x + cellSize/2, padding);
    }
    
    // Draw calendar cells
    let row = 1;
    let col = 0;
    
    for (let i = 0; i < calendar.length; i++) {
        const x = padding + col * (cellSize + padding);
        const y = padding * 2 + cellSize/2 + row * (cellSize + padding);
        
        if (calendar[i]) {
            drawCell(x, y, calendar[i]);
        }
        
        col++;
        if (col >= 7) {
            col = 0;
            row++;
        }
    }
    
    // Draw any banners on top of the calendar
    drawBanners();
}

function drawCell(x, y, dayData) {
    // Draw cell background
    fill(255);
    stroke(200);
    rect(x, y - cellSize/2, cellSize, cellSize);
    
    // Draw day number
    fill(0);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(16);
    text(dayData.day, x + 5, y - cellSize/2 + 5);
    
    // Draw thumbnail if media exists
    if (dayData.images.length > 0) {
        const filename = dayData.images[0];
        const mediaItem = mediaFiles[filename];
        const thumbSize = cellSize * 0.7;
        const thumbX = x + (cellSize - thumbSize)/2;
        const thumbY = y - cellSize/2 + (cellSize - thumbSize)/2;
        
        if (mediaItem && mediaItem.loaded) {
            // Determine media type and display accordingly
            if (mediaItem.type === 'image') {
                // Display the image if successfully loaded
                image(mediaItem.element, thumbX, thumbY, thumbSize, thumbSize);
            } else if (mediaItem.type === 'video') {
                // For videos, draw the poster image or a placeholder with video icon
                if (mediaItem.element) {
                    // Draw a thumbnail or first frame
                    fill(0);
                    rect(thumbX, thumbY, thumbSize, thumbSize);
                    
                    // Add video indicator
                    textAlign(CENTER, CENTER);
                    textSize(20);
                    fill(255);
                    text('▶️', thumbX + thumbSize/2, thumbY + thumbSize/2);
                }
            }
            
            
            if (dayData.images.length > 1) {
                /* Indicate multiple media items if available
                fill(0, 150, 255);
                noStroke();
                ellipse(x + cellSize - 12, y - cellSize/2 + 12, 16);
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(10);
                text(dayData.images.length, x + cellSize - 12, y - cellSize/2 + 12);*/
            }
            
            // Show media type indicator
            const mediaTypeIndicator = getMediaTypeIcon(filename);
            textAlign(TOP, CENTER);
            textSize(12);
            text(mediaTypeIndicator, x + 5, y - cellSize/2 + 25);
            
        } else {
            // Show placeholder for missing media
            fill(240);
            rect(thumbX, thumbY, thumbSize, thumbSize);
            
            // Draw placeholder icon
            stroke(150);
            strokeWeight(1);
            line(thumbX + 10, thumbY + thumbSize/2, thumbX + thumbSize - 10, thumbY + thumbSize/2);
            line(thumbX + thumbSize/2, thumbY + 10, thumbX + thumbSize/2, thumbY + thumbSize - 10);
            
            // Show number of media items that should be here
            fill(255, 100, 100);
            noStroke();
            textAlign(CENTER, BOTTOM);
            textSize(10);
            text(`${dayData.images.length} item(s)`, x + cellSize/2, y + cellSize/2 - 5);
            strokeWeight(1);
        }
    }
}

// Helper function to determine media type icon based on filename
function getMediaTypeIcon(filename) {
    if (!filename) return '';
    
    // Check if we have the media item in our collection
    if (mediaFiles[filename] && mediaFiles[filename].type) {
        return mediaFiles[filename].type === 'video' ? VIDEO_ICON : IMAGE_ICON;
    }
    
    // Fallback to extension check
    const ext = filename.split('.').pop().toLowerCase();
    if (['mp4', 'mov', 'avi', 'wmv'].includes(ext)) {
        return VIDEO_ICON;
    }
    return IMAGE_ICON;
}

function getMediaForDate(year, month, day) {
    // Always use window.mediaMetadata to avoid variable conflicts
    // Use the mediaMetadata array if available, fallback to imageMetadata
    const metadataSource = (typeof window.mediaMetadata !== 'undefined' && Array.isArray(window.mediaMetadata)) 
        ? window.mediaMetadata 
        : (typeof window.imageMetadata !== 'undefined' && Array.isArray(window.imageMetadata)) 
            ? window.imageMetadata 
            : [];
    
    return metadataSource.filter(item => 
        item.date &&
        item.date.year === year &&
        item.date.month === month &&
        item.date.day === day
    ).map(item => item.filename);
}

function mousePressed() {
    // Get the modal and check if it's currently shown
    const modal = document.getElementById('imageModal');
    const isModalVisible = modal.style.display === 'block';

    // If modal is visible and mouse button is pressed, close the modal
    if (isModalVisible) {
        closeModal();
        return;
    }

    // Otherwise, check if we clicked on a calendar cell
    const col = floor((mouseX - padding) / (cellSize + padding));
    const row = floor((mouseY - padding * 2 - cellSize/2) / (cellSize + padding));
    
    if (col >= 0 && col < 7 && row >= 0 && row < 6) {
        const index = row * 7 + col;
        if (calendar[index] && calendar[index].images.length > 0) {
            // Pass all images for the day to enable navigation between them
            showImage(calendar[index].images[0], calendar[index].images);
        }
    }
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    modal.classList.remove('fullscreen');
    
    // Pause any playing videos
    const modalVideo = document.getElementById('modalVideo');
    if (modalVideo) {
        modalVideo.pause();
    }
    
    setTimeout(() => modal.style.display = 'none', 300);
}

// Function to banners for demonstration
function addAllBanners() {
    // Clear any existing banners
    clearAllBanners();
    
    /** 
    addBanner({
        type: 'WARNING',
        year: 2024,
        month: 9,
        text: 'Karl\'s \n girlfriend moves in',
        position: 'top',
        height: 20
    });
    */
}

// Helper function to get month name
function monthName(monthNum) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[monthNum - 1]; // Adjust for 0-indexed array
}

// Add keyPressed function to handle keyboard events
function keyPressed() {
    const modal = document.getElementById('imageModal');
    const isModalVisible = modal.style.display === 'block';

    if (isModalVisible) {
        // Close modal on Escape key or spacebar
        if (keyCode === ESCAPE || keyCode === 32) {
            closeModal();
        }
        // Previous image with left arrow
        else if (keyCode === LEFT_ARROW) {
            modal.querySelector('.prev-image').click();
        }
        // Next image with right arrow
        else if (keyCode === RIGHT_ARROW) {
            modal.querySelector('.next-image').click();
        }
        // Toggle fullscreen with 'f' key
        else if (key === 'f' || key === 'F') {
            modal.querySelector('#modalImage').click();
        }
    }
}

// Banner management functions
function addBanner(options) {
    // Default banner options
    const defaults = {
        type: 'STANDARD',
        year: null,         // If null, applies to all years
        month: null,        // If null, applies to all months
        day: null,          // If null, applies to entire month
        text: 'Banner text',
        position: 'middle',    // 'top', 'middle', or 'bottom' of the cell
        height: 20,         // Height in pixels
        onClick: null       // Optional callback function
    };
    
    // Merge defaults with provided options
    const bannerOptions = {...defaults, ...options};
    
    // Add the banner to our collection
    banners.push(bannerOptions);
    
    // Return the index for potential later reference
    return banners.length - 1;
}

function removeBanner(index) {
    if (index >= 0 && index < banners.length) {
        banners.splice(index, 1);
        return true;
    }
    return false;
}

function clearAllBanners() {
    banners = [];
}

function drawBanners() {
    // Only draw banners that apply to the current month/year
    const relevantBanners = banners.filter(banner => 
        (banner.year === null || banner.year === currentYear) && 
        (banner.month === null || banner.month === currentMonth)
    );
    
    for (const banner of relevantBanners) {
        const bannerStyle = BANNER_TYPES[banner.type] || BANNER_TYPES.STANDARD;
        
        if (banner.day) {
            // Draw banner for a specific day
            drawDayBanner(banner, bannerStyle);
        } else {
            // Draw banner for the entire month
            drawMonthBanner(banner, bannerStyle);
        }
    }
}

function drawDayBanner(banner, style) {
    // Find the cell for this day
    const day = banner.day;
    let cellFound = false;
    let cellX, cellY;
    
    // Find the position of the day in the calendar grid
    for (let i = 0; i < calendar.length; i++) {
        if (calendar[i] && calendar[i].day === day) {
            const row = Math.floor(i / 7);
            const col = i % 7;
            cellX = padding + col * (cellSize + padding);
            cellY = padding * 2 + cellSize/2 + row * (cellSize + padding);
            cellFound = true;
            break;
        }
    }
    
    if (!cellFound) return; // Day not in current view
    
    // Determine banner position within the cell
    let bannerY;
    switch (banner.position) {
        case 'top':
            bannerY = cellY - cellSize/2;
            break;
        case 'middle':
            bannerY = cellY;
            break;
        case 'bottom':
            bannerY = cellY + cellSize/2 - banner.height;
            break;
        default:
            bannerY = cellY - cellSize/2; // Default to top
    }
    
    // Draw the banner
    fill(style.color);
    noStroke();
    rect(cellX, bannerY, cellSize, banner.height);
    
    // Draw text
    fill(style.textColor);
    textAlign(CENTER, CENTER);
    textSize(min(12, banner.height - 4));
    text(banner.text, cellX + cellSize/2, bannerY + banner.height/2);
}

function drawMonthBanner(banner, style) {
    // Draw a banner that spans the entire month view
    // We'll place it at the top of the calendar by default
    fill(style.color);
    noStroke();
    
    let bannerY;
    const bannerWidth = width;
    
    switch (banner.position) {
        case 'top':
            bannerY = padding;
            break;
        case 'bottom':
            bannerY = height - banner.height - padding;
            break;
        default:
            bannerY = padding; // Default to top
    }
    
    rect(0, bannerY, bannerWidth, banner.height);
    
    // Draw text
    fill(style.textColor);
    textAlign(CENTER, CENTER);
    textSize(min(14, banner.height - 4));
    text(banner.text, bannerWidth/2, bannerY + banner.height/2);
}

function setupControls() {
    // Get button elements directly from DOM
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');

    // Previous Month button
    prevButton.onclick = function() {
        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        
        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        
        if (isDateInRange(newYear, newMonth)) {
            currentMonth = newMonth;
            currentYear = newYear;
            updateCalendar();
            updateButtonStates();
        }
    };
    
    // Next Month button
    nextButton.onclick = function() {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        
        if (isDateInRange(newYear, newMonth)) {
            currentMonth = newMonth;
            currentYear = newYear;
            updateCalendar();
            updateButtonStates();
        }
    };

    updateButtonStates();
}

function updateButtonStates() {
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');

    // Check if previous month is available
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
    }
    prevButton.disabled = !isDateInRange(prevYear, prevMonth);

    // Check if next month is available
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
    }
    nextButton.disabled = !isDateInRange(nextYear, nextMonth);
}

function updateDateDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dateDisplay = document.getElementById('currentDate');
    dateDisplay.textContent = monthNames[currentMonth - 1] + ' ' + currentYear;
}

function setupModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = modal.querySelector('.close');
    let isFullscreen = false;
    let currentImageIndex = 0;
    let currentDayImages = [];

    // Close button
    closeBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent event from bubbling to modal
        closeModal();
    };

    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal || e.target.classList.contains('modal-content')) {
            closeModal();
        }
    };

    // Toggle fullscreen on image click
    modalImg.onclick = () => {
        isFullscreen = !isFullscreen;
        modal.classList.toggle('fullscreen', isFullscreen);
    };

    // Navigation buttons
    const prevBtn = modal.querySelector('.prev-image');
    const nextBtn = modal.querySelector('.next-image');

    prevBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentDayImages.length > 1) {
            currentImageIndex = (currentImageIndex - 1 + currentDayImages.length) % currentDayImages.length;
            updateModalImage(currentDayImages[currentImageIndex]);
        }
    };

    nextBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentDayImages.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % currentDayImages.length;
            updateModalImage(currentDayImages[currentImageIndex]);
        }
    };

    // Hide/show controls on mouse movement
    let timeout;
    modal.onmousemove = () => {
        const controls = modal.querySelector('.modal-controls');
        const info = modal.querySelector('.image-info');
        const nav = modal.querySelector('.navigation-buttons');
        
        controls.classList.remove('hidden');
        info.classList.remove('hidden');
        nav.style.opacity = '1';
        
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (isFullscreen) {
                controls.classList.add('hidden');
                info.classList.add('hidden');
                nav.style.opacity = '0';
            }
        }, 2000);
    };

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('show')) return;
        
        switch(e.key) {
            case 'Escape':
                closeBtn.click();
                break;
            case 'ArrowLeft':
                prevBtn.click();
                break;
            case 'ArrowRight':
                nextBtn.click();
                break;
            case 'f':
                modalImg.click(); // Toggle fullscreen
                break;
        }
    });
}

function showImage(filename, dayImages = []) {
    const modal = document.getElementById('imageModal');
    currentDayImages = dayImages.length > 0 ? dayImages : [filename];
    currentImageIndex = dayImages.indexOf(filename);
    if (currentImageIndex === -1) currentImageIndex = 0;

    updateModalMedia(filename);
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);

    // Update navigation buttons visibility
    const prevBtn = modal.querySelector('.prev-image');
    const nextBtn = modal.querySelector('.next-image');
    const showNav = currentDayImages.length > 1;
    prevBtn.style.display = nextBtn.style.display = showNav ? 'block' : 'none';
}

function updateModalMedia(filename) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo') || createModalVideoElement();
    const imageInfo = document.querySelector('.image-date');
    const modalError = document.getElementById('modalError') || createModalErrorElement();
    
    // Get media type
    let mediaType = 'image';
    let mediaItem = mediaFiles[filename];
    
    if (mediaItem && mediaItem.type) {
        mediaType = mediaItem.type;
    } else {
        // Try to determine from file extension as fallback
        if (filename.match(/\.(mp4|mov|avi|wmv)$/i)) {
            mediaType = 'video';
        }
    }
    
    // Reset display
    modalError.style.display = 'none';
    modalImg.style.display = 'none';
    modalVideo.style.display = 'none';
    
    // Show appropriate media based on type
    if (mediaItem && mediaItem.loaded) {
        if (mediaType === 'image') {
            // Show the image
            modalImg.style.display = 'block';
            modalImg.src = 'jpegs/' + filename;
            
            // Update media info with image type indicator
            imageInfo.innerHTML = `<span class="media-type">${IMAGE_ICON}</span> ` + 
                (imageInfo.textContent || filename);
        } else if (mediaType === 'video') {
            // Show the video
            modalVideo.style.display = 'block';
            
            // Check if we need to set the source
            if (modalVideo.getAttribute('data-current') !== filename) {
                modalVideo.src = 'jpegs/' + filename;
                modalVideo.setAttribute('data-current', filename);
                modalVideo.load();
                modalVideo.play();
            }
            
            // Update media info with video type indicator
            imageInfo.innerHTML = `<span class="media-type">${VIDEO_ICON}</span> ` + 
                (imageInfo.textContent || filename);
        }
    } else {
        // Show error message
        modalError.style.display = 'block';
        modalError.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} "${filename}" failed to load</div>
            <div class="error-suggestion">Try refreshing the page or checking the file</div>
        `;
    }
    
    // Find media metadata and update info - always use window to avoid variable conflicts
    const metadataSource = (typeof window.mediaMetadata !== 'undefined' && Array.isArray(window.mediaMetadata)) 
        ? window.mediaMetadata 
        : (typeof window.imageMetadata !== 'undefined' && Array.isArray(window.imageMetadata)) 
            ? window.imageMetadata 
            : [];
    
    const metadata = metadataSource.find(item => item.filename === filename);
    if (metadata && metadata.date) {
        const date = new Date(metadata.date.year, metadata.date.month - 1, metadata.date.day);
        const dateText = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Add media type icon to the date display
        const typeIcon = mediaType === 'video' ? VIDEO_ICON : IMAGE_ICON;
        imageInfo.innerHTML = `<span class="media-type">${typeIcon}</span> ${dateText}`;
    } else {
        imageInfo.textContent = filename;
    }
}

function createModalVideoElement() {
    const modalContent = document.querySelector('.modal-content');
    const videoElement = document.createElement('video');
    videoElement.id = 'modalVideo';
    videoElement.className = 'modal-video';
    videoElement.setAttribute('controls', '');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    videoElement.style.cssText = 'display: none; max-width: 100%; max-height: 90vh; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);';
    modalContent.appendChild(videoElement);
    
    // Set up video event handlers
    videoElement.addEventListener('play', () => {
        console.log('Video started playing');
    });
    
    videoElement.addEventListener('pause', () => {
        console.log('Video paused');
    });
    
    videoElement.addEventListener('ended', () => {
        console.log('Video playback completed');
    });
    
    return videoElement;
}

function createModalErrorElement() {
    const modalContent = document.querySelector('.modal-content');
    const errorElement = document.createElement('div');
    errorElement.id = 'modalError';
    errorElement.className = 'modal-error';
    errorElement.style.cssText = 'display: none; color: #ff3333; text-align: center; padding: 20px; background: rgba(0,0,0,0.8); border-radius: 8px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;';
    modalContent.appendChild(errorElement);
    return errorElement;
}