let currentYear;
let currentMonth;
let images = {};
let cellSize = 100;
let padding = 10;
let calendar;

// Date restrictions
const MIN_DATE = { year: 2024, month: 5 }; // May 2024
const MAX_DATE = { year: 2025, month: 5 }; // May 2025

function isDateInRange(year, month) {
    if (year < MIN_DATE.year || year > MAX_DATE.year) return false;
    if (year === MIN_DATE.year && month < MIN_DATE.month) return false;
    if (year === MAX_DATE.year && month > MAX_DATE.month) return false;
    return true;
}

function preload() {
    // Load images based on metadata
    for (let item of imageMetadata) {
        let filename = item.filename;
        images[filename] = loadImage('jpegs/' + filename);
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

function draw() {
    background(240);
    drawCalendar();
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
        if (img) {
            const thumbSize = cellSize * 0.7;
            image(img, 
                  x + (cellSize - thumbSize)/2, 
                  y - cellSize/2 + (cellSize - thumbSize)/2, 
                  thumbSize, 
                  thumbSize);
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
    modalImg.src = 'jpegs/' + filename;
    
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
    }
}