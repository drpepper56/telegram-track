// Telegram WebApp initialization
// const tg = window.Telegram.WebApp;
tg.expand(); // Expand the app to full height

// DOM Elements
const mainView = document.getElementById('main-view') as HTMLElement;
const detailsView = document.getElementById('details-view') as HTMLElement;
const trackingList = document.getElementById('tracking-list') as HTMLElement;
const eventsList = document.getElementById('events-list') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
const removeBtn = document.getElementById('remove-btn') as HTMLButtonElement;




// Load tracked packages from backend
async function loadTrackedPackages(): Promise<void> {
    try {
        // TODO: Replace with your actual backend endpoint
        const response = await fetch('https://your-backend-api.com/tracked-packages', {
            headers: {
                'Authorization': `Bearer ${tg.initData}`,
            }
        });
        
        if (response.ok) {
            trackedPackages = await response.json();
            updateEmptyState();
        } else {
            console.error('Failed to load tracked packages');
        }
    } catch (error) {
        console.error('Error loading tracked packages:', error);
    }
}



// Add a new tracking number
async function addTrackingNumber(trackingNumber: string): Promise<void> {
    try {
        // TODO: Replace with your actual backend endpoint
        const response = await fetch('https://your-backend-api.com/add-tracking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tg.initData}`,
            },
            body: JSON.stringify({ trackingNumber })
        });
        
        if (response.ok) {
            await loadTrackedPackages();
            renderTrackingList();
        } else {
            console.error('Failed to add tracking number');
            tg.showAlert('Failed to add tracking number. Please try again.');
        }
    } catch (error) {
        console.error('Error adding tracking number:', error);
        tg.showAlert('An error occurred. Please try again.');
    }
}

// Show details for a tracking number
async function showTrackingDetails(trackingNumber: string): Promise<void> {
    currentTrackingNumber = trackingNumber;
    currentView = 'details';
    
    mainView.style.display = 'none';
    detailsView.style.display = 'block';
    
    // Update header with tracking number
    const detailsHeader = document.getElementById('details-header') as HTMLElement;
    detailsHeader.textContent = `Tracking #${trackingNumber}`;
    
    // Load and display tracking events
    try {
        // TODO: Replace with your actual backend endpoint
        const response = await fetch(`https://your-backend-api.com/tracking-events/${trackingNumber}`, {
            headers: {
                'Authorization': `Bearer ${tg.initData}`,
            }
        });
        
        if (response.ok) {
            const events = await response.json();
            renderTrackingEvents(events);
        } else {
            console.error('Failed to load tracking events');
            eventsList.innerHTML = '<div class="empty-state">Failed to load tracking events</div>';
        }
    } catch (error) {
        console.error('Error loading tracking events:', error);
        eventsList.innerHTML = '<div class="empty-state">Error loading events</div>';
    }
}

// Remove a tracking number
async function removeTrackingNumber(trackingNumber: string): Promise<void> {
    try {
        // TODO: Replace with your actual backend endpoint
        const response = await fetch(`https://your-backend-api.com/remove-tracking/${trackingNumber}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${tg.initData}`,
            }
        });
        
        if (response.ok) {
            await loadTrackedPackages();
            if (currentView === 'details') {
                backToMainView();
            }
            renderTrackingList();
        } else {
            console.error('Failed to remove tracking number');
            tg.showAlert('Failed to remove tracking number. Please try again.');
        }
    } catch (error) {
        console.error('Error removing tracking number:', error);
        tg.showAlert('An error occurred. Please try again.');
    }
}

// Render the list of tracked packages
function renderTrackingList(): void {
    trackingList.innerHTML = '';
    
    trackedPackages.forEach(pkg => {
        const item = document.createElement('div');
        item.className = 'tracking-item';
        item.innerHTML = `
            <div>
                <div class="tracking-number">${pkg.trackingNumber}</div>
                <div class="tracking-status">${pkg.status} • ${pkg.lastUpdate}</div>
            </div>
            <div>></div>
        `;
        
        item.addEventListener('click', () => showTrackingDetails(pkg.trackingNumber));
        trackingList.appendChild(item);
    });
    
    updateEmptyState();
}

// Render tracking events for a package
function renderTrackingEvents(events: any[]): void {
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        eventsList.innerHTML = '<div class="empty-state">No tracking events found</div>';
        return;
    }
    
    events.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
            <div>${event.status}</div>
            <div class="event-date">${event.timestamp}</div>
            ${event.location ? `<div>${event.location}</div>` : ''}
        `;
        eventsList.appendChild(item);
    });
}

// Update empty state visibility
function updateEmptyState(): void {
    emptyState.style.display = trackedPackages.length === 0 ? 'block' : 'none';
}

// Back to main view
function backToMainView(): void {
    currentView = 'main';
    mainView.style.display = 'block';
    detailsView.style.display = 'none';
    currentTrackingNumber = null;
}

// Set up remove button
removeBtn.addEventListener('click', () => {
    if (currentTrackingNumber) {
        tg.showConfirm('Are you sure you want to stop tracking this package?', (confirmed: boolean) => {
            if (confirmed) {
                removeTrackingNumber(currentTrackingNumber!);
            }
        });
    }
});

// Back button handling
tg.BackButton.onClick(backToMainView);

// Initialize the app when ready
tg.ready();
initApp();