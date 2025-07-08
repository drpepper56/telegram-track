/*
    Author : Karol Bura

    Description : Simple telegram mini app for detailed package shipping tracking and telegram notification updates.
    Version : 1.0.0
    Date : 22/05/2025
    License : MIT

*/

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    CONSTANTS

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

const BACKEND_LINK = 'https://teletrack-server-20b6f79a4151.herokuapp.com';
/// import the csv carrier list as array from carriers.ts 
import {getKeyNameList} from './carriers.js';

/*      STATE HANDLING      */

let currentView: 'main' | 'details' | 'notification_details' = 'main';
let currentTrackingNumber: string | null = null;
// set telegram window object
const tg = window.Telegram.WebApp;
let user_id_hash: string = ""; // hash of the user id
let USER_PACKAGES_DATA: PackageData[] = [];
let NOTIFICATION_DATA: PackageData | undefined;
const USER_PACKAGES_NAME_TAGS = new Map<string, string>(); // Store name tags for tracking numbers


/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    Init TWA

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/


// Initialize the app
async function initApp() {

    // show main button and assign the add tracking function to it
    tg.MainButton.setText('ADD TRACKING NUMBER');
    tg.MainButton.onClick(showAddTrackingDialog);
    tg.MainButton.show();

    const user_details = await get_user_details();
    user_id_hash = user_details.user_id_hash;

    const notification_present = await notification_handler();
    if (notification_present) {
        // start from notification

        // Back button handling
        tg.BackButton.onClick(backToMainViewFromNotification);
        // set structure for the notification data
        USER_PACKAGES_DATA = [NOTIFICATION_DATA!];

        // get name tag from telegram storage
        await get_tracking_number_name_tag(NOTIFICATION_DATA!.tracking_number)
    
        // show details of notification
        showTrackingDetails(NOTIFICATION_DATA!.tracking_number);
    } else {
        // start normally, this is also called when the notification details are closed in @backToMainViewFromNotification()

        // Back button handling
        tg.BackButton.onClick(backToMainView);

        // Load data and pass directly to render function
        const trackingData = await loadTrackedPackages().then((data) => data!).catch((err) => {throw new Error(err)});
        currentTrackingNumber = null; // Reset tracking number
        USER_PACKAGES_DATA = trackingData; // Update global state

        // get the name tags for the packages
        await get_tracking_number_name_tags(USER_PACKAGES_DATA.map(pkg => pkg.tracking_number));

        renderTrackingList();
    }
}


/* 
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    TRACKING DATA JSON STRUCTURE TO PARSE SERVER RESPONSES

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

/// Structure for full package data
interface PackageData {
    tracking_number: string;
    tag?: string;
    latest_event?: event;
    providers_data: tracking_provider_provided_events[];
    time_metrics?: time_metrics;
    is_user_tracked?: boolean
}
interface tracking_provider_provided_events {
     provider_name?: string;
     provider_key?: number;
     provider_events: event[];
}
interface event {
     description?: string;
     location?: string;
     stage?: string;
     sub_status?: string;
     address?: address;
     time?: time_raw;
}
interface address {
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    postal_code?: string;
    coordinates?: coordinates,
}
interface coordinates {
    longitude?: number;
    latitude?: number;
}
interface time_raw {
    date?: string;
    time?: string;
    timezone?: string;
}
interface time_metrics {
    days_after_order?: number;
    days_of_transit?: number;
    days_of_transit_done?: number;
    days_after_last_update?: number;
    estimated_delivery_date?: delivery_estimate;
}
interface delivery_estimate {
    source?: string;
    from?: string;
    to?: string;
}

/*      DISPLAY FUNCTION FOR THE @PackageData STRUCTURE         */

/// too big
/// return a html element to display info from the @PackageData structure
function createPackageElement(pkg: PackageData) {
    let container = document.createElement('div');
    container.className = 'package-container';

    // Header with tracking number and tag
    const header = document.createElement('div');
    header.className = 'package-header';
    header.style.display = 'flex';
    header.style.flexDirection = 'column'; // Stack children vertically
    header.style.gap = '4px'; // Add some space between elements
    
    // package tracking number
    const trackingNumber = document.createElement('h2');
    trackingNumber.textContent = `#${pkg.tracking_number}`;

    // get package name tag from local storage
    const key = `${user_id_hash}_${pkg.tracking_number}`
    let name_tag = USER_PACKAGES_NAME_TAGS.get(key);

    // Create the name tag element
    const nameTag = document.createElement('h3');
    nameTag.className = 'package-name-tag';
    nameTag.textContent = name_tag ? name_tag : "set name tag"; // default if undefined
    nameTag.style.cursor = 'pointer';
    nameTag.style.cssText = name_tag ? `color: black;` : `color: #007AFF`; // change color if name tag is not set

    // Add click handler to enable editing the name tag
    nameTag.addEventListener('click', () => {        
        // Current name tag value
        const currentValue = name_tag ? name_tag : "";
        
        // Create modal container
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        // Create popup container
        const popupContainer = document.createElement('div');
        popupContainer.style.padding = '16px';
        popupContainer.style.display = 'flex';
        popupContainer.style.flexDirection = 'column';
        popupContainer.style.gap = '12px';
        popupContainer.style.width = '100%';
        popupContainer.style.maxWidth = '300px';
        popupContainer.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
        popupContainer.style.borderRadius = '12px';
        
        // Create title
        const title = document.createElement('div');
        title.textContent = 'Edit Name Tag';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.placeholder = 'Enter name tag';
        input.style.padding = '10px';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid var(--tg-theme-hint-color, #707579)';
        input.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
        input.style.color = 'var(--tg-theme-text-color, #000000)';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '8px';
        
        // Create cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '8px 12px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.border = 'none';
        cancelButton.style.background = 'var(--tg-theme-secondary-bg-color, #f4f4f5)';
        cancelButton.style.color = 'var(--tg-theme-text-color, #000000)';
        cancelButton.onclick = () => document.body.removeChild(modal);
        
        // Create save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.style.padding = '8px 12px';
        saveButton.style.borderRadius = '8px';
        saveButton.style.border = 'none';
        saveButton.style.background = 'var(--tg-theme-button-color, #2481cc)';
        saveButton.style.color = 'var(--tg-theme-button-text-color, #ffffff)';
        saveButton.onclick = async () => {
            const newName = input.value.trim();
            if (newName) {
                nameTag.textContent = newName;
                nameTag.style.color = 'var(--tg-theme-text-color, #000000)';
                await set_tracking_number_name_tag(pkg.tracking_number, newName);
            }
            document.body.removeChild(modal);
        };
        
        // Build modal
        buttonContainer.append(cancelButton, saveButton);
        popupContainer.append(title, input, buttonContainer);
        modal.appendChild(popupContainer);
        document.body.appendChild(modal);
        
        // Focus input and handle Enter key
        input.focus();
        input.onkeydown = (e) => {
            if (e.key === 'Enter') saveButton.click();
        };
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    });

    // make it appear a popup when clicked that has a input field to change the name tag
    header.appendChild(trackingNumber);
    header.appendChild(nameTag);
    container.appendChild(header);

    // Latest event section
    if (pkg.latest_event) {
        const latestEvent = createEventElement(pkg.latest_event, 'Latest Update');
        container.appendChild(latestEvent);
    }

    // Provider information
    pkg.providers_data.forEach(provider_data => {
        const provider = document.createElement('div');
        provider.className = 'provider-info';
        
        const providerTitle = document.createElement('h3');
        providerTitle.textContent = provider_data.provider_name || 'Shipping Provider';
        provider.appendChild(providerTitle);
        
        if (provider_data.provider_events.length > 0) {
            const eventsList = document.createElement('div');
            eventsList.className = 'events-list';
            
            provider_data.provider_events.forEach(event => {
                eventsList.appendChild(createEventElement(event));
            });
            provider.appendChild(eventsList);
        }
        container.appendChild(provider);
    });

    // Time metrics
    if (pkg.time_metrics) {
        const metrics = createTimeMetricsElement(pkg.time_metrics);
        container.appendChild(metrics);
    }

    // Button container - placed outside the white container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'package-buttons';
    buttonContainer.style.display = 'grid';
    buttonContainer.style.gridTemplateColumns = '1fr 1fr';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '10px';

    // Track/Untrack button - conditionally shown based on is_user_tracked
    if (pkg.is_user_tracked !== undefined) {
        if (pkg.is_user_tracked) {
            // Untrack button (yellow)
            let untrackButton = document.createElement('button');
            untrackButton.textContent = 'Untrack';
            untrackButton.className = 'untrack-button';
            untrackButton.onclick = () => {
                handleUntrackNumber(pkg.tracking_number);
            };
            untrackButton.style.width = '100%';
            untrackButton.style.padding = '10px';
            untrackButton.style.borderRadius = '8px';
            untrackButton.style.border = 'none';
            untrackButton.style.backgroundColor = '#ffc107'; // Yellow
            untrackButton.style.color = '#000';
            untrackButton.style.fontWeight = 'bold';
            untrackButton.style.cursor = 'pointer';
            buttonContainer.appendChild(untrackButton);
        } else {
            // Track button (blue)
            let trackButton = document.createElement('button');
            trackButton.textContent = 'Track';
            trackButton.className = 'track-button';
            trackButton.onclick = () => {
                handleRetrackNumber(pkg.tracking_number);
            };
            trackButton.style.width = '100%';
            trackButton.style.padding = '10px';
            trackButton.style.borderRadius = '8px';
            trackButton.style.border = 'none';
            trackButton.style.backgroundColor = '#2196F3'; // Blue
            trackButton.style.color = '#fff';
            trackButton.style.fontWeight = 'bold';
            trackButton.style.cursor = 'pointer';
            buttonContainer.appendChild(trackButton);
        }
    }

    // Remove button (red)
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-button';
    removeButton.onclick = () =>  {
        tg.showConfirm('Are you sure you want to remove this package?', (confirmed: boolean) => {
            if (confirmed) {
                handleRemoveTrackingNumber(pkg.tracking_number);
            }
        });
    };
    removeButton.style.width = '100%';
    removeButton.style.padding = '10px';
    removeButton.style.borderRadius = '8px';
    removeButton.style.border = 'none';
    removeButton.style.backgroundColor = '#f44336'; // Red
    removeButton.style.color = '#fff';
    removeButton.style.fontWeight = 'bold';
    removeButton.style.cursor = 'pointer';
    buttonContainer.appendChild(removeButton);

    // Create a wrapper to separate the white content from buttons
    let wrapper = document.createElement('div');
    wrapper.appendChild(container);
    wrapper.appendChild(buttonContainer);

    return wrapper
}
/// return a html element to display info from @event
function createEventElement(event: event, title?: string): HTMLElement {
    const element = document.createElement('div');
    element.className = 'event';
    
    if (title) {
        const titleElement = document.createElement('h4');
        titleElement.textContent = title;
        element.appendChild(titleElement);
    }
    
    if (event.description) {
        const desc = document.createElement('p');
        desc.className = 'event-description';
        desc.textContent = event.description;
        element.appendChild(desc);
    }
    
    if (event.stage) {
        const stage = document.createElement('p');
        stage.className = 'event-stage';
        stage.textContent = `Status: ${event.stage}`;
        element.appendChild(stage);
    }
    
    if (event.location || event.address) {
        const location = document.createElement('div');
        location.className = 'event-location';
        
        if (event.location) {
            location.textContent = `📍 ${event.location}`;
        } else if (event.address) {
            const addr = event.address;
            location.textContent = [
                addr.street,
                addr.city,
                addr.state,
                addr.country,
                addr.postal_code
            ].filter(Boolean).join(', ');
        }
        element.appendChild(location);
    }
    
    if (event.time) {
        const time = document.createElement('p');
        time.className = 'event-time';
        time.textContent = formatEventTime(event.time);
        element.appendChild(time);
    }
    
    return element;
}
/// return a html element to display info from @time_metrics
function createTimeMetricsElement(metrics: time_metrics): HTMLElement {
    const element = document.createElement('div');
    element.className = 'time-metrics';
    
    const title = document.createElement('h3');
    title.textContent = 'Delivery Timeline';
    element.appendChild(title);
    
    const list = document.createElement('ul');
    
    if (metrics.days_after_order !== undefined) {
        const item = document.createElement('li');
        item.textContent = `Order placed ${metrics.days_after_order} days ago`;
        list.appendChild(item);
    }
    
    if (metrics.days_of_transit !== undefined) {
        const item = document.createElement('li');
        const done = metrics.days_of_transit_done || 0;
        item.textContent = `In transit: ${done}/${metrics.days_of_transit} days`;
        list.appendChild(item);
    }
    
    if (metrics.days_after_last_update !== undefined) {
        const item = document.createElement('li');
        item.textContent = `Last update: ${metrics.days_after_last_update} days ago`;
        list.appendChild(item);
    }
    
    if (metrics.estimated_delivery_date) {
        const est = metrics.estimated_delivery_date;
        const item = document.createElement('li');
        item.textContent = `Estimated delivery: ${est.from}${est.to ? ` to ${est.to}` : ''}`;
        if (est.source) {
            item.textContent += ` (source: ${est.source})`;
        }
        list.appendChild(item);
    }
    
    element.appendChild(list);
    return element;
}
/// return a html element to display info from @time_raw
function formatEventTime(time: time_raw): string {
    if (time.date && time.time) {
        return `${time.date} at ${time.time}${time.timezone ? ` (${time.timezone})` : ''}`;
    }
    return time.date || time.time || '';
}

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    INIT ELEMENTS

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

// DOM Elements
const mainView = document.getElementById('main-view') as HTMLElement;
const detailsView = document.getElementById('details-view') as HTMLElement;
const trackingList = document.getElementById('tracking-list') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    ELEMENTS FUNCTIONS

    TODO: [UX] display tracking details like cards in a stack (apple wallet tickets/passes alike).
    scrolling down makes the stack move up and cover the previous cards with new cards, more information from the tracking
    events/details should be displayed in the card to make it bigger and show the effect more

    TODO: Share a tracking number page with another user via a phone number or telegram username
    make a send function and a receive function, can work like a mail service with the server acting as the mailman, holding a
    reference to the sender, receiver and the tracking number data, the addressed will open the page from a inline link
    that must open a notification handler made specifically to open data the addressed doesn't have registered on the server


-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

/// Update empty state visibility
function updateEmptyState(): void {
    emptyState.style.display = USER_PACKAGES_DATA.length === 0 ? 'block' : 'none';
}

// Render the list of tracked packages
function renderTrackingList(): void {
    trackingList.innerHTML = '';

    // exit early if empty or undefined
    if (!USER_PACKAGES_DATA || USER_PACKAGES_DATA.length === 0) {
        updateEmptyState();
        return;
    }    

    USER_PACKAGES_DATA.forEach(pkg => {
        // try to get the name tag from the telegram storage
        let key = `${user_id_hash}_${pkg.tracking_number}`
        let name_tag = USER_PACKAGES_NAME_TAGS.get(key);

        const item = document.createElement('div');
        item.className = 'tracking-item';
        item.innerHTML = `
            <div>
                <div class="tracking-number">
                ${name_tag ? `<span class="name-tag">${name_tag}</span> • ` : ''}
                ${pkg.tracking_number}
                </div>
                <div class="tracking-status">${pkg.latest_event?.description} • ${pkg.latest_event?.time?.date} • ${pkg.latest_event?.time?.time}</div>
            </div>
            <div>></div>
        `;
        
        item.addEventListener('click', () => showTrackingDetails(pkg.tracking_number));
        trackingList.appendChild(item);
    });
    
    // updates the styling options of emptyState
    updateEmptyState();
}

// Show details for a tracking number
function showTrackingDetails(tracking_number: string) {
    currentTrackingNumber = tracking_number;

    // state change
    currentView = 'details';
    mainView.style.display = 'none';
    detailsView.style.display = 'block';
    tg.BackButton.show();
    
    const found = USER_PACKAGES_DATA.find(pkg => pkg.tracking_number === tracking_number);
    if (!found) {
        return
    }
    // Load and display tracking events
    renderTrackingDetails(found);
}

/// Render tracking events for a package
async function renderTrackingDetails(tracking_details: PackageData) {
    detailsView.innerHTML = '';
    const trackingDetailsElement = createPackageElement(tracking_details)
    detailsView.appendChild(trackingDetailsElement);
}

/// Back button handling to main view
function backToMainView(): void {
    // hide back button
    tg.BackButton.hide();

    currentView = 'main';
    currentTrackingNumber = null;
    mainView.style.display = 'block';
    detailsView.style.display = 'none';

    // render async after changing the back button
    renderTrackingList();
}

// Back button handling for notification view
async function backToMainViewFromNotification(): Promise<void> {
    currentView = 'main';
    currentTrackingNumber = null;
    mainView.style.display = 'block';
    detailsView.style.display = 'none';

    // hide back button for main page
    tg.BackButton.hide();

    // finish the init function
    const trackingData = await loadTrackedPackages().then((data) => data!).catch((err) => {throw new Error(err)});
    currentTrackingNumber = null; // Reset tracking number
    USER_PACKAGES_DATA = trackingData; // Update global state

    // get the name tags for the packages
    await get_tracking_number_name_tags(USER_PACKAGES_DATA.map(pkg => pkg.tracking_number));
    
    // Back button handling
    tg.BackButton.offClick(backToMainViewFromNotification);
    tg.BackButton.onClick(backToMainView);

    // render (async after changing the back button) the list after loading the data
    renderTrackingList();
}

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    NOTIFICATION HANDLERS

    TODO: [server side] inject the name tag into the notification message

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

async function notification_handler(): Promise<boolean> {
    // get the deep link url value and cheat this stupid environment, 64 characters
    let startParam = window.location.search;
    // try to get param
    try {
        // json -> base64 -> json decoding
        const urlParams = new URLSearchParams(startParam);
        const encodedParam = urlParams.get('tgWebAppStartParam'); 
        const urlDecoded = decodeURIComponent(encodedParam!);
        const base64Decoded = atob(urlDecoded.replace(/-/g, '+').replace(/_/g, '/'));
        const decodedData = JSON.parse(base64Decoded);

        // request the tracking data
        let response = await get_tracking_data(decodedData.package_update).then((data) => data!).catch((err) => console.log(err));

        if (response === undefined) {
            // didn't get anything
            return false;
        }
        if (response === 525) {
            // no relation record found
            tg.showAlert("The tracking number from the notification has been removed or was never registered");
            return false;
        }

        // ts
        NOTIFICATION_DATA = response! as unknown as PackageData;
        return true;

        // notify(decodedData.package_update);
    } catch (e) {
        return false;
    }
}

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    UTILITY FUNCTIONS

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

/// hash function for putting userID hash in every request header
async function get_user_id_hash() {
    if (!window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        throw new Error("Telegram user data not available");
    }
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(Telegram.WebApp.initDataUnsafe.user!.id.toString());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex; 
    } catch (error) {
        console.error('Error generating hash:', error);
        throw error;
    }
}

/// function for getting user details to be send when registering
async function get_user_details() {

    const user_details = {
        "user_id": Telegram.WebApp.initDataUnsafe.user!.id,
        "user_name": Telegram.WebApp.initDataUnsafe.user!.first_name,
        "user_id_hash": await get_user_id_hash()
    }

    return user_details;
}

/// function for handling retrack number request
async function handleRetrackNumber(tracking_number: string) {
    const response_code = await retrackNumber(tracking_number).then((code) => code!).catch((err) => console.log(err));
    if (response_code == 0) {
        // modify the cashed USER_PACKAGES_DATA to change the is_user_tracked value
        USER_PACKAGES_DATA = USER_PACKAGES_DATA.map(pkg => 
            pkg.tracking_number === tracking_number 
                ? {...pkg, is_user_tracked: true} 
                : pkg
        );
        backToMainView();
        tg.showAlert("Set to subscribed");
        return;
    } else if (response_code == 525) {
        // user doesn't have access to that number, no relation record found
        tg.showAlert("Number not registered");
        return;
    } else if (response_code == 533) {
        // package has been marked delivered so it can't be re-tracked
        tg.showAlert("Package has been marked delivered so it can't be re-tracked");
        return;
    } else if (response_code == 534) {
        // already set to subscribed
        tg.showAlert("Already set to subscribed");
        return;
    } else {
        throw new Error("Failed to remove tracking number");
    }
}

/// function for handling untrack number request
async function handleUntrackNumber(tracking_number: string) {
    const response_code = await untrackNumber(tracking_number).then((code) => code!).catch((err) => console.log(err));
    if (response_code == 0) {
        // modify the cashed USER_PACKAGES_DATA to change the is_user_tracked value
        USER_PACKAGES_DATA = USER_PACKAGES_DATA.map(pkg => 
            pkg.tracking_number === tracking_number 
                ? {...pkg, is_user_tracked: false} 
                : pkg
        );
        backToMainView();
        tg.showAlert("Set to unsubscribed");
        return;
    } else if (response_code == 525) {
        // user doesn't have access to that number, no relation record found
        tg.showAlert("Number not registered");
        return;
    }
    if (response_code == 535) {
        // already set to unsubscribed
        tg.showAlert("Already set to unsubscribed");
        return;
    } else {
        throw new Error("Failed to remove tracking number");
    }
}

/// function for handling remove number request
async function handleRemoveTrackingNumber(tracking_number: string) {
    const response_code = await removeTrackingNumber(tracking_number).then((code) => code!).catch((err) => console.log(err));
    if (response_code == 0) {
        // untracked number for the user
        currentTrackingNumber = null;
        USER_PACKAGES_DATA = await loadTrackedPackages().then((data) => data!).catch((err) => {throw new Error(err)});
        remove_tracking_number_name_tag(tracking_number);
        backToMainView();
        tg.showAlert("Number won't be tracked anymore");
        return;
    } else if (response_code == 536) {
        // was already untracked
        tg.showAlert("Number was already untracked");
        return;
    } else {
        throw new Error("Failed to remove tracking number");
    }
}

/// function to handle the add tracking number request
async function handleAddTrackingNumber(tracking_number: string, carrier_key?: number, name_tag?: string): Promise<number> {
    // 0 for registered, 
    // 1 for not registered,
    // 2 for not registered but retry with carrier
    // 3 for max quota reached
    
    const result = await register_one_tracking_number(tracking_number, carrier_key);
    
    if (result === 0) {
        // registered
        tg.showAlert('Tracking number registered!');
        // store the tracking number with a tag
        if (name_tag !== undefined && name_tag.length > 0) {
            await set_tracking_number_name_tag(tracking_number, name_tag);
        }
        return 0;
    } else if (result === 541) {
        // Relation record already exists
        tg.showAlert('Tracking number already registered');
        return 0;
    } else if (result === 531) {
        // not found and carrier was hopefully present
        tg.showAlert('Tracking number not found');
        return 1;
    } else if (result === 530) {
        // show carrier selection
        return 2;
    } else if (result === 540) {
        // Tracking quota reached limit
        tg.showAlert('Tracking quota reached limit');
        return 3;
    } else {
        // Some other error
        tg.showAlert('Failed to add tracking number');
        return 1;
    }
}

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    NAME TAG STORAGE MANAGER FUNCTION, BOTH CASHED LOCAL AND TELEGRAM CLOUD

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

/// function to store the {KEY: user_id_hash_|CONCAT|tracking_number, VALUE: name_tag} in the telegram cloud storage
async function set_tracking_number_name_tag(tracking_number: string, name_tag: string): Promise<boolean> {
    const key = `${user_id_hash}_${tracking_number}`;
    // save in cloud storage
    return new Promise<boolean>((resolve) => {
        // save in cloud storage
        tg.CloudStorage.setItem(key, name_tag, (error, result) => {
            if (error) {
                // didn't store :'(
                console.error("Storage error:", error);
                resolve(false);
            } else if (result) {
                // stored so set locally too
                USER_PACKAGES_NAME_TAGS.set(key, name_tag); 
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/// function to get the {KEY: user_id_hash_|CONCAT|tracking_number, VALUE: name_tag} from the telegram cloud storage
async function get_tracking_number_name_tag(tracking_number: string): Promise<boolean> {
    const key = `${user_id_hash}_${tracking_number}`;

    return new Promise<boolean>((resolve) => {
        // get items from cloud storage
        tg.CloudStorage.getItem(key,  (error, value) => {
            if (error) {
                resolve(false);
            } else if (value !== null) {
                USER_PACKAGES_NAME_TAGS.set(key, value!);
                resolve(true); 
            } else {
                resolve(false);
            }
        })
    })
}

/// function for getting multiple {KEY: user_id_hash_|CONCAT|tracking_number, VALUE: name_tag} 
/// from the telegram cloud storage
async function get_tracking_number_name_tags(tracking_numbers: string[]): Promise<boolean> {
    // make a key for each tracking number
    const keys = tracking_numbers.map(tracking_number => `${user_id_hash}_${tracking_number}`);

    // get items from cloud storage
    return new Promise<boolean>((resolve) => {
        tg.CloudStorage.getItems(keys, (error, values) => {
            if (error) {
                resolve(false);
            } else if (values !== null) {
                // set the name tags in the local storage
                for (const key in values) {
                    USER_PACKAGES_NAME_TAGS.set(key, values[key]);
                }
                resolve(true); 
            } else {
                resolve(false);
            }
        })
    })
}

/// function for removing the {KEY: user_id_hash_|CONCAT|tracking_number, VALUE: name_tag} from the telegram cloud storage
async function remove_tracking_number_name_tag(tracking_number: string): Promise<boolean> {
    const key = `${user_id_hash}_${tracking_number}`;
    return new Promise<boolean>((resolve) => {
        // remove from cloud storage
        tg.CloudStorage.removeItem(key, (error, result) => {
            if (error) {
                console.error("Storage error:", error);
                resolve(false);
            } else if (result) {
                // remove from local storage
                USER_PACKAGES_NAME_TAGS.delete(key);
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    POP-UP FUNCTIONS

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/


/// Show add tracking number dialog
function showAddTrackingDialog(): void {
    // disable the button, make enabled after removing the elements added in this function
    tg.MainButton.hide();

    // Handle cancel, close the modal
    const closeModal = () => {
        document.body.removeChild(modal);
        tg.MainButton.show();
    };

    // Load carriers data
    let carriers: {key: number, name_en: string}[] = getKeyNameList()

    const popupContainer = document.createElement('div');
    popupContainer.style.padding = '16px';
    popupContainer.style.display = 'flex';
    popupContainer.style.flexDirection = 'column';
    popupContainer.style.gap = '12px';
    popupContainer.style.width = '100%';
    popupContainer.style.maxWidth = '90vw';
    popupContainer.style.maxHeight = '90vh';
    popupContainer.style.overflow = 'auto';
    popupContainer.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
    popupContainer.style.borderRadius = '12px';

    // Create title
    const title = document.createElement('div');
    title.textContent = 'Add Tracking Number';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '16px';

    // Create input field for tracking number
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter tracking number';
    input.style.padding = '10px';
    input.style.borderRadius = '8px';
    input.style.border = '1px solid var(--tg-theme-hint-color, #707579)';
    input.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
    input.style.color = 'var(--tg-theme-text-color, #000000)';

    // Create input field for name tag
    const nameTagInput = document.createElement('input');
    nameTagInput.type = 'text';
    nameTagInput.placeholder = 'Optional name tag';
    nameTagInput.style.padding = '10px';
    nameTagInput.style.borderRadius = '8px';
    nameTagInput.style.border = '1px solid var(--tg-theme-hint-color, #707579)';
    nameTagInput.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
    nameTagInput.style.color = 'var(--tg-theme-text-color, #000000)';

    // Carrier selection elements
    const carrierContainer = document.createElement('div');
    carrierContainer.style.flexDirection = 'column';
    carrierContainer.style.gap = '8px';
    // Carrier title
    const carrierTitle = document.createElement('div');
    carrierTitle.textContent = 'Select Carrier';
    carrierTitle.style.fontWeight = 'bold';
    carrierTitle.style.fontSize = '14px';
    // Carrier search box
    const carrierInput = document.createElement('input');
    carrierInput.type = 'text';
    carrierInput.placeholder = 'Search carrier...';
    carrierInput.style.padding = '10px';
    carrierInput.style.borderRadius = '8px';
    carrierInput.style.border = '1px solid var(--tg-theme-hint-color, #707579)';
    carrierInput.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
    carrierInput.style.color = 'var(--tg-theme-text-color, #000000)';
    // Carrier search results
    const carrierResults = document.createElement('div');
    carrierResults.style.display = 'none';
    carrierResults.style.flexDirection = 'column';
    carrierResults.style.gap = '4px';
    carrierResults.style.maxHeight = '200px';
    carrierResults.style.overflowY = 'auto';

    // initialize selected carrier
    let selectedCarrier: {key: number, name_en: string} | null = null;
    // handle carrier input
    carrierInput.addEventListener('input', () => {
        const searchTerm = carrierInput.value.toLowerCase();
        carrierResults.innerHTML = '';
        
        if (!searchTerm) {
            carrierResults.style.display = 'none';
            return;
        }
        const filtered = carriers.filter(carrier => 
            carrier.name_en.toLowerCase().includes(searchTerm)
        );
        if (filtered.length === 0) {
            carrierResults.style.display = 'none';
            return;
        }
        
        // show search results element
        carrierResults.style.display = 'flex';
        
        // render each carrier matching the search
        filtered.forEach(carrier => {
            const option = document.createElement('div');
            option.textContent = carrier.name_en;
            option.style.padding = '8px 12px';
            option.style.borderRadius = '4px';
            option.style.cursor = 'pointer';
            option.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #f4f4f5)';
            option.style.color = 'var(--tg-theme-text-color, #000000)';
            
            // handle select carrier 
            option.addEventListener('click', () => {
                selectedCarrier = carrier;
                carrierInput.value = carrier.name_en;
                carrierResults.style.display = 'none';
            });
            
            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = 'var(--tg-theme-hint-color, #707579)';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #f4f4f5)';
            });
            
            carrierResults.appendChild(option);
        });
    });

    carrierContainer.appendChild(carrierTitle);
    carrierContainer.appendChild(carrierInput);
    carrierContainer.appendChild(carrierResults);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '8px';

    // Create cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '8px 12px';
    cancelButton.style.borderRadius = '8px';
    cancelButton.style.border = 'none';
    cancelButton.style.background = 'var(--tg-theme-secondary-bg-color, #f4f4f5)';
    cancelButton.style.color = 'var(--tg-theme-text-color, #000000)';
    // Handle cancel
    cancelButton.addEventListener('click', closeModal);

    // Create add button
    const addButton = document.createElement('button');
    addButton.textContent = 'Add';
    addButton.style.padding = '8px 12px';
    addButton.style.borderRadius = '8px';
    addButton.style.border = 'none';
    addButton.style.background = 'var(--tg-theme-button-color, #2481cc)';
    addButton.style.color = 'var(--tg-theme-button-text-color, #ffffff)';
    // Handle add
    addButton.addEventListener('click', async () => {
        const nameTagValue = nameTagInput.value.trim(); // Get the name tag value
        const register_result = await handleAddTrackingNumber(
            input.value, 
            selectedCarrier?.key, 
            nameTagValue || undefined
        );
        
        // 0 for registered, 
        // 1 for not registered,
        // 2 for not registered but retry with carrier
        // 3 for max quota reached

        switch (register_result) {
            case 0: closeModal();
            case 1: closeModal();
            case 2: {
                carrierInput.focus();
                carrierResults.style.display = 'none';
            }
            case 3: closeModal();
        }
    });

    // Add elements to container
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(addButton);
    popupContainer.appendChild(title);
    popupContainer.appendChild(input);
    popupContainer.appendChild(nameTagInput);  // Added name tag input
    popupContainer.appendChild(carrierContainer);
    popupContainer.appendChild(buttonContainer);

    // Create modal container
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.appendChild(popupContainer);
    
    // Add to document
    document.body.appendChild(modal);
    
    
    
    // Focus input when modal appears
    setTimeout(() => input.focus(), 100);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}


/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    API RELATED FUNCTIONS, HTTP REQUESTS
    
    TODO: move the "double" request building to a helper function
    TODO: check sync status after re-subscribing to a tracking number
    TODO: remove user request

    list of custom 5XX codes:
            520 - user doesn't exist yet, client should send request to create user
    TODO:   521 - user already exists, handle error
            525 - user doesn't have access to that number, no relation record found
            530 - carrier not found, client should send a register number request that includes a carrier
            533 - package has been marked delivered so it can't be re-tracked
            534 - already set to subscribed
            535 - already set to unsubscribed
            536 - no relation record found to delete
            540 - tracking quota reached limit, sorry
            541 - relation record already exists

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

/// this is the worst one
/// Function for creating a user and resending a request if the user has been created
async function create_user_request(headers: any, prime_path: string, prime_json_data?: any): Promise<Response | undefined> {
    try {
        // create the json for user details
        const user_details = await get_user_details();
        
        // send request to create the user                                                             
        const create_user_response = await fetch(BACKEND_LINK + '/create_user', {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(user_details)
        });

        if(create_user_response.ok) {
            // resend primary message
            const second_prime_response = await fetch(BACKEND_LINK + prime_path, {
                method: 'post',
                mode: 'cors',
                headers,
                body: JSON.stringify(prime_json_data)
            });

            if(second_prime_response.ok) {
                return second_prime_response;
            }
            throw new Error("second prime response failed when after creating the user" + 
                second_prime_response.status + " " + second_prime_response.text())
        }
                                                                                        
    } catch (parseError) {
        /* the more errors you get the smarter you are */
        throw parseError
    }
}

/// Function for creating a user and resending a request without body if the user has been created
async function create_user_request_no_body(headers: any, prime_path: string): Promise<Response | undefined> {
    try {
        // create the json for user details
        const user_details = await get_user_details();

        // send request to create the user                                                             
        const create_user_response = await fetch(BACKEND_LINK + '/create_user', {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(user_details)
        });

        if(create_user_response.ok) {
            // resend primary message
            const second_prime_response = await fetch(BACKEND_LINK + prime_path, {
                method: 'post',
                mode: 'cors',
                headers
            });

            if(second_prime_response.ok) {
                return second_prime_response;
            } 
            throw new Error("second prime response failed when after creating the user" + 
                second_prime_response.status + " " + second_prime_response.text())
        }
                                                                                        
    } catch (parseError) {
        /* the more errors you get the smarter you are */
        throw parseError
    }
}

/// Function for sending a request for tracking data of a number, assume it's already registered
/// and the user has permissions to it, call after a notification or when accessing the tracking page
async function get_tracking_data(tracking_number: string): Promise<JSON | number | undefined> {
    // create the json to send as payload
    const prime_json_data = {
        "number": tracking_number
    };

    try {
        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }

        const path = '/get_tracking_data'
        const success_mes = 'tracking data retrieved successfully'

        // send the primary message
        let prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers: headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            prime_response = await create_user_request(headers,path,prime_json_data) as Response;
            // user created, second response successful
        } 
        
        if (prime_response.ok) {
            return await prime_response.json();
        } else if (prime_response.status == 525) {
            return await prime_response.status;
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.text());
            return;
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }          
    } catch (error) {
        /* the more errors you get the smarter you are */   
        throw error;
    }; 

}

/// Function to register a single tracking number, called from the popup element that opens on the main button
async function register_one_tracking_number(tracking_number: string, carrier?: number): Promise<number | undefined> {
    // return 0 for OK, 1 for retry with carrier

    // create the json to send as payload
    const prime_json_data = {
        "number": tracking_number,
        "carrier": carrier ? carrier : Number(null)
    };
    const path = '/register_tracking_number';

    try {
        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }
        // send the primary message
        let prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();
        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            prime_response = await create_user_request(headers,path,prime_json_data) as Response;
            // user created, second response successful
        }
        if (prime_response.status > 520) {
            console.log('prime_response.status', prime_response.status);
            return prime_response.status;
        }  else if (prime_response.ok) {
            return 0
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.json());  
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
    } catch (error) {
        /* the more errors you get the smarter you are */   
        throw error;
    }; 
}

/// Function to load all the user's tracked packages info, called when app is started 
/// or when user exists the notification screen
async function loadTrackedPackages(): Promise<PackageData[] | undefined> {

    // no json to send as payload, user is in the header 

    const path = '/get_user_tracked_numbers_details';

    try {

        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }

        // send the primary message
        let prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            prime_response = await create_user_request_no_body(headers,path,) as Response;
            // user created, second response successful
        } 
        
        if (prime_response.ok) {
            const response_json = await prime_response.json();
            console.log(response_json);
            return response_json as PackageData[];
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.json());
            throw new Error('bad response error');
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
    } catch (error) {
        /* the more errors you get the smarter you are */   
        throw new Error('unknown error');
    }; 
}

/// Function for removing a tracking number from the user's list
async function removeTrackingNumber(tracking_number: string): Promise<number | undefined> {
    // return 0 for OK, 1 for error

    // create the json to send as payload
    const prime_json_data = {
        "number": tracking_number
    };
    const path = '/delete_tracking_number';

    try {
        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }
        // send the primary message
        let prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();
        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            prime_response = await create_user_request(headers,path,prime_json_data) as Response;
            // user created, second response successful
        }
        
        if (prime_response.status == 536) {
            // no relation record found to delete
            return prime_response.status
        } else if (prime_response.ok) {
            return 0
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.json());  
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
    } catch (error) {
        /* the more errors you get the smarter you are */   
        throw error;
    }; 
}

/// Function for untracking a tracking number from in the user's options
async function untrackNumber(tracking_number: string): Promise<number | undefined> {
    // return 0 for OK, 5XX for error

    // create the json to send as payload
    const prime_json_data = {
        "number": tracking_number
    };
    const path = '/stop_tracking_number';

    try {
        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }
        // send the primary message
        let prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();
        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            prime_response = await create_user_request(headers,path,prime_json_data) as Response;
            // user created, second response successful
        }
        
        if ((prime_response.status == 535) || (prime_response.status == 525)) {
            return prime_response.status
        } else if (prime_response.ok) {
            return 0
        } 
        else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.json());  
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
    } catch (error) {
        /* the more errors you get the smarter you are */   
        throw error;
    }; 
}

/// Function for retracking a untracked number from in the user's options
async function retrackNumber(tracking_number: string): Promise<number | undefined> {
    // return 0 for OK, 5XX for errors

    // create the json to send as payload
    const prime_json_data = {
        "number": tracking_number
    };
    const path = '/retrack_stopped_number';

    try {
        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }
        // send the primary message
        let prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();
        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            prime_response = await create_user_request(headers,path,prime_json_data) as Response;
            // user created, second response successful
        }
        
        if ((prime_response.status == 533) || (prime_response.status == 534) || (prime_response.status == 525)) {
            return prime_response.status;
        } else if (prime_response.ok) {
            return 0
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.json());  
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
    } catch (error) {
        /* the more errors you get the smarter you are */   
        throw error;
    }; 
}

/*
-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-

    START APP

-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
*/

initApp();
tg.ready();