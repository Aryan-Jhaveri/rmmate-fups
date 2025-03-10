let currentYear;
let currentMonth;
let images = {};
let cellSize = 100;
let padding = 10;
let calendar;
let totalImages = 0;
let loadedImages = 0;
let loadingErrors = 0;
let showLoadingScreen = true;

// Date restrictions
const MIN_DATE = { year: 2024, month: 5 }; // May 2024
const MAX_DATE = { year: 2025, month: 5 }; // May 2025

function isDateInRange(year, month) {
    if (year < MIN_DATE.year || year > MAX_DATE.year) return false;
    if (year === MIN_DATE.year && month < MIN_DATE.month) return false;
    if (year === MAX_DATE.year && month > MAX_DATE.month) return false;
    return true;
}

// Image loading success callback
function imageLoaded(filename) {
    loadedImages++;
    if (loadedImages + loadingErrors >= totalImages) {
        console.log(`All images loaded (${loadedImages} successful, ${loadingErrors} failed)`);
        showLoadingScreen = false;
    }
}

// Image loading error callback
function imageError(filename) {
    console.error(`Failed to load image: ${filename}`);
    loadingErrors++;
    if (loadedImages + loadingErrors >= totalImages) {
        console.log(`All images processed (${loadedImages} successful, ${loadingErrors} failed)`);
        showLoadingScreen = false;
    }
}

function preload() {
    // Count total images to track loading progress
    if (imageMetadata && Array.isArray(imageMetadata)) {
        totalImages = imageMetadata.length;
        console.log(`Loading ${totalImages} images...`);
        
        // Load images based on metadata with error handling
        for (let item of imageMetadata) {
            if (!item || !item.filename) continue;
            
            let filename = item.filename;
            // Use p5's loadImage with callback functions for success/error
            loadImage(
                'jpegs/' + filename,
                // Success callback
                (img) => {
                    images[filename] = img;
                    imageLoaded(filename);
                },
                // Error callback
                () => imageError(filename)
            );
        }
    } else {
        console.error('Image metadata is missing or invalid');
        showLoadingScreen = false;
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
        const loadingText = `Loading images: ${loadedImages}/${totalImages}`;
        text(loadingText, width/2, height/2 - 20);
        
        // Draw loading bar
        const barWidth = width * 0.6;
        const barHeight = 20;
        const progress = totalImages > 0 ? loadedImages / totalImages : 0;
        
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
        const images = getImagesForDate(currentYear, currentMonth, day);
        grid.push({
            day: day,
            images: images
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
    
    // Draw thumbnail if images exist
    if (dayData.images.length > 0) {
        const img = images[dayData.images[0]];
        const thumbSize = cellSize * 0.7;
        const thumbX = x + (cellSize - thumbSize)/2;
        const thumbY = y - cellSize/2 + (cellSize - thumbSize)/2;
        
        if (img) {
            // Display the image if successfully loaded
            image(img, thumbX, thumbY, thumbSize, thumbSize);
            
            /* Indicate multiple images if available
            if (dayData.images.length > 1) {
                fill(0, 150, 255);
                noStroke();
                ellipse(x + cellSize - 12, y - cellSize/2 + 12, 16);
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(10);
                text(dayData.images.length, x + cellSize - 12, y - cellSize/2 + 12);
            }
        } else {
            // Show placeholder for missing images
            fill(240);
            rect(thumbX, thumbY, thumbSize, thumbSize);
            
            // Draw camera icon or warning
            stroke(150);
            strokeWeight(1);
            line(thumbX + 10, thumbY + thumbSize/2, thumbX + thumbSize - 10, thumbY + thumbSize/2);
            line(thumbX + thumbSize/2, thumbY + 10, thumbX + thumbSize/2, thumbY + thumbSize - 10);
            
            // Show number of images that should be here
            fill(255, 100, 100);
            noStroke();
            textAlign(CENTER, BOTTOM);
            textSize(10);
            text(`${dayData.images.length} image(s)`, x + cellSize/2, y + cellSize/2 - 5);
            strokeWeight(1);*/
        }
    }
}

function getImagesForDate(year, month, day) {
    return imageMetadata.filter(item => 
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
    setTimeout(() => modal.style.display = 'none', 300);
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

    updateModalImage(filename);
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);

    // Update navigation buttons visibility
    const prevBtn = modal.querySelector('.prev-image');
    const nextBtn = modal.querySelector('.next-image');
    const showNav = currentDayImages.length > 1;
    prevBtn.style.display = nextBtn.style.display = showNav ? 'block' : 'none';
}

function updateModalImage(filename) {
    const modalImg = document.getElementById('modalImage');
    const imageInfo = document.querySelector('.image-date');
    const modalError = document.getElementById('modalError') || createModalErrorElement();
    
    // Check if the image was successfully loaded
    if (images[filename]) {
        // Hide error message if it exists
        modalError.style.display = 'none';
        
        // Show the image
        modalImg.style.display = 'block';
        modalImg.src = 'jpegs/' + filename;
    } else {
        // Show error message
        modalError.style.display = 'block';
        modalError.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">Image "${filename}" failed to load</div>
            <div class="error-suggestion">Try refreshing the page or checking the image file</div>
        `;
        
        // Hide the image
        modalImg.style.display = 'none';
    }
    
    // Find image metadata and update info
    const metadata = imageMetadata.find(img => img.filename === filename);
    if (metadata && metadata.date) {
        const date = new Date(metadata.date.year, metadata.date.month - 1, metadata.date.day);
        imageInfo.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } else {
        imageInfo.textContent = filename;
    }
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