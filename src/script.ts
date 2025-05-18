/*
    TODO:

    Save the tracking number with a tag for the package set by the user or a default in telegram storage.

    In run time memory save a list of {tracking_number, package_tag, {tracking_events}}, this will be requested only when the
    app is opened normally, not via a notification about ta tracking update.

    When the app is opened with notification parameters {tracking number}, only request the events for that number

    Add button to delete a tracking number, from the telegram memory list as well as from the database relation list

    Put the (fries in the bag) add tracking number function in the telegram main button



*/


/* 
    TYPE "SAFETY"

    tracking data json form on the server
*/

/// Structure for full package data
interface PackageData {
    tracking_number: string;
    tag?: string;
    latest_event?: event;
    providers_data: tracking_provider_provided_events[];
    time_metrics?: time_metrics;
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

/*
    DISPLAY FUNCTION FOR THE @PackageData STRUCTURE
*/

/// return a html element to display info from the @PackageData structure
function createPackageElement(pkg: PackageData): HTMLElement {
    const container = document.createElement('div');
    container.className = 'package-container';

    // Header with tracking number and tag
    const header = document.createElement('div');
    header.className = 'package-header';
    
    const trackingNumber = document.createElement('h2');
    trackingNumber.textContent = `#${pkg.tracking_number}`;
    
    if (pkg.tag) {
        const tag = document.createElement('span');
        tag.className = 'package-tag';
        tag.textContent = pkg.tag;
        header.appendChild(tag);
    }
    header.appendChild(trackingNumber);
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

    console.info(container);

    return container;
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
    CONSTANTS
*/

const BACKEND_LINK = 'https://teletrack-server-20b6f79a4151.herokuapp.com';
// const BACKEND_LINK = 'https://webhook.lemoncardboard.uk';
// const BACKEND_LINK = 'http://127.0.0.1:8080';

/*
    STATE HANDLING IS SOMETHING WE DO NOW
*/

let currentView: 'main' | 'details' | 'notification_details' = 'main';
let currentTrackingNumber: string | null = null;
// set telegram window object
const tg = window.Telegram.WebApp;
let USER_PACKAGES_DATA: PackageData[] = [];
let NOTIFICATION_DATA: PackageData | undefined;


/*
    Init TWA
*/


// Initialize the app
async function initApp() {

    // show main button and assign the add tracking function to it
    tg.MainButton.setText('ADD TRACKING NUMBER');
    tg.MainButton.onClick(showAddTrackingDialog);
    tg.MainButton.show();

    // TODO: if all data gets called is up to notification handler and the init function to figure out later
    // const notification_present = await notification_handler();
    // if (notification_present) {
    //     // open tracking details page with notification package details
    //     return;
    // }
    
    // Load data and pass directly to render function
    const trackingData = await loadTrackedPackages().then((data) => data!).catch((err) => {throw new Error(err)});
    USER_PACKAGES_DATA = trackingData; // Update global state
    renderTrackingList(); // Pass data directly
}

/*
    INIT ELEMENTS
*/

// DOM Elements
const mainView = document.getElementById('main-view') as HTMLElement;
const detailsView = document.getElementById('details-view') as HTMLElement;
const trackingList = document.getElementById('tracking-list') as HTMLElement;
const eventsList = document.getElementById('events-list') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
const removeBtn = document.getElementById('remove-btn') as HTMLButtonElement;

/* 
    ELEMENTS FUNCTIONS
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
        console.log("empty or undefined")
        updateEmptyState();
        return;
    }
    
    USER_PACKAGES_DATA.forEach(pkg => {
        const item = document.createElement('div');
        item.className = 'tracking-item';
        item.innerHTML = `
            <div>
                <div class="tracking-number">${pkg.tracking_number} • ${"user name tag will go here"} </div>
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
async function showTrackingDetails(tracking_number: string): Promise<void> {
    currentTrackingNumber = tracking_number;

    // state change
    currentView = 'details';
    mainView.style.display = 'none';
    detailsView.style.display = 'block';
    
    // Update header with tracking number
    const detailsHeader = document.getElementById('details-header') as HTMLElement;
    detailsHeader.textContent = `Tracking #${tracking_number}`;

    const found = USER_PACKAGES_DATA.find(pkg => pkg.tracking_number === tracking_number);
    if (!found) {
        console.log("not found data to display")
        return
    }
    console.log('found', found);
    // Load and display tracking events
    renderTrackingDetails(found);
}

/// Render tracking events for a package
function renderTrackingDetails(tracking_details: PackageData): void {
    detailsView.innerHTML = '';
    console.log('tracking_details', tracking_details);
    const trackingDetailsElement = createPackageElement(tracking_details)
    detailsView.appendChild(trackingDetailsElement);
}



/*
    NOTIFICATION HANDLERS
*/

async function notification_handler(): Promise<boolean> {
    // get the deep link url value and cheat this stupid environment, 64 characters
    let startParam = window.location.search;
    console.log('startParam', startParam)
    // try to get param
    try {
        // json -> base64 -> json decoding pogchamp
        const urlParams = new URLSearchParams(startParam);
        const encodedParam = urlParams.get('tgWebAppStartParam'); 
        const urlDecoded = decodeURIComponent(encodedParam!);
        const base64Decoded = atob(urlDecoded.replace(/-/g, '+').replace(/_/g, '/'));
        const decodedData = JSON.parse(base64Decoded);
        // get the tracking package data number
        console.log(decodedData.package_update);

        // request the tracking data
        let response_json = await get_tracking_data(decodedData.package_update).then((data) => data!).catch((err) => console.log(err));

        // ts
        NOTIFICATION_DATA = response_json! as unknown as PackageData;
        renderTrackingDetails(NOTIFICATION_DATA);
        // temp function
        // notify(response_json!);
        return true;

        // notify(decodedData.package_update);
    } catch (e) {
        return false;
    }
}

/*
    UTILITY FUNCTIONS
*/

/// hash function for putting userID hash in every request header //TODO: put everywhere
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




/// Back to main view
function backToMainView(): void {
    currentView = 'main';
    // mainView.style.display = 'block';
    // detailsView.style.display = 'none';
    // currentTrackingNumber = null;
}

/*
    POP-UP FUNCTIONS
*/


/// Show add tracking number dialog
// TODO: add optional add carrier drop down window, use the csv file from 17track docs
// TODO: user should add a name tag to the package that will be saved in the telegram env memory
// TODO: resolve 530 response, specify carrier in registering a number
function showAddTrackingDialog(): void {
    // disable the button, make enabled after removing the elements added in this function
    tg.MainButton.hide();

    // Load carriers data
    let carriers: {key: number, name_en: string}[] = [];
    fetch('.../carriers_data/carriers.csv')
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n');
            carriers = lines.slice(1) // skip header
                .map(line => {
                    const [key, name_en, name_cn, name_hk, url] = line.split(',');
                    return {key: Number(key), name_en};
                })
                .filter(carrier => !isNaN(carrier.key) && carrier.name_en);
        })
        .catch(error => {
            console.error('Error loading carriers:', error);
        });

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

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter tracking number';
    input.style.padding = '10px';
    input.style.borderRadius = '8px';
    input.style.border = '1px solid var(--tg-theme-hint-color, #707579)';
    input.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
    input.style.color = 'var(--tg-theme-text-color, #000000)';

    // Carrier selection elements (initially hidden)
    const carrierContainer = document.createElement('div');
    carrierContainer.style.display = 'none';
    carrierContainer.style.flexDirection = 'column';
    carrierContainer.style.gap = '8px';

    const carrierTitle = document.createElement('div');
    carrierTitle.textContent = 'Select Carrier';
    carrierTitle.style.fontWeight = 'bold';
    carrierTitle.style.fontSize = '14px';

    const carrierInput = document.createElement('input');
    carrierInput.type = 'text';
    carrierInput.placeholder = 'Search carrier...';
    carrierInput.style.padding = '10px';
    carrierInput.style.borderRadius = '8px';
    carrierInput.style.border = '1px solid var(--tg-theme-hint-color, #707579)';
    carrierInput.style.backgroundColor = 'var(--tg-theme-bg-color, #ffffff)';
    carrierInput.style.color = 'var(--tg-theme-text-color, #000000)';

    const carrierResults = document.createElement('div');
    carrierResults.style.display = 'none';
    carrierResults.style.flexDirection = 'column';
    carrierResults.style.gap = '4px';
    carrierResults.style.maxHeight = '200px';
    carrierResults.style.overflowY = 'auto';

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

    // Create add button
    const addButton = document.createElement('button');
    addButton.textContent = 'Add';
    addButton.style.padding = '8px 12px';
    addButton.style.borderRadius = '8px';
    addButton.style.border = 'none';
    addButton.style.background = 'var(--tg-theme-button-color, #2481cc)';
    addButton.style.color = 'var(--tg-theme-button-text-color, #ffffff)';

    // Add elements to container
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(addButton);
    popupContainer.appendChild(title);
    popupContainer.appendChild(input);
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
    
    // Handle cancel
    const closeModal = () => {
        document.body.removeChild(modal);
        tg.MainButton.show();
    };
    
    cancelButton.addEventListener('click', closeModal);
    
    // Handle carrier input
    let selectedCarrier: {key: number, name_en: string} | null = null;
    
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
        
        carrierResults.style.display = 'flex';
        
        filtered.forEach(carrier => {
            const option = document.createElement('div');
            option.textContent = carrier.name_en;
            option.style.padding = '8px 12px';
            option.style.borderRadius = '4px';
            option.style.cursor = 'pointer';
            option.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #f4f4f5)';
            option.style.color = 'var(--tg-theme-text-color, #000000)';
            
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
    
    // Handle add
    addButton.addEventListener('click', async () => {
        const trackingNumber = input.value.trim();
        
        if (!trackingNumber) {
            tg.showAlert('Please enter a tracking number');
            return;
        }
        
        // First try without carrier
        if (!carrierContainer.style.display || carrierContainer.style.display === 'none') {
            console.log('trying with no carrier')
            const result = await register_one_tracking_number(trackingNumber);
            
            if (result === 0) {
                console.log('found with no carrier')
                closeModal();
                return;
            } else if (result === 1) {
                console.log('not found with no carrier')
                // Show carrier selection
                carrierContainer.style.display = 'flex';
                input.disabled = true;
                setTimeout(() => carrierInput.focus(), 100);
                return;
            }
        } else {
            console.log('trying with carrier')
            // Carrier selection is visible
            if (!selectedCarrier) {
                tg.showAlert('Please select a carrier');
                return;
            }
            
            const result = await register_one_tracking_number(trackingNumber, selectedCarrier.key);
            
            if (result === 0) {
                console.log('found with carrier')
                closeModal();
            } else {
                console.log('not found with carrier')
                tg.showAlert('Failed to add tracking number');
            }
        }
    });
    
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
    API RELATED FUNCTIONS, HTTP REQUESTS
*/

/// Function for creating a user and resending a request if the user has been created
async function create_user_request(headers: any, prime_path: string, prime_json_data: any): Promise<Response | undefined> {
    console.log("USER DOESN'T EXIST YET");
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
        console.error('Failed to parse 520 response:', parseError);
        throw parseError
    }
}

/// Function for creating a user and resending a request without body if the user has been created
async function create_user_request_no_body(headers: any, prime_path: string): Promise<Response | undefined> {
    console.log("USER DOESN'T EXIST YET");
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
        console.error('Failed to parse 520 response:', parseError);
        throw parseError
    }
}

/// Function for sending a request for tracking data of a number, assume it's already registered
/// and the user has permissions to it, call after a notification or when accessing the tracking page
async function get_tracking_data(tracking_number: string): Promise<JSON | undefined> {
    // create the json to send as payload
    const prime_json_data = {
        "number": tracking_number
    };
    const user_id_hash = await get_user_id_hash();

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
        const prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers: headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            console.log("USER DOESN'T EXIST YET");
            const second_prime_response = create_user_request(headers,path,prime_json_data);
            return await second_prime_response.then((res) => res!.json()).catch((err) => console.log(err))
        } else if (prime_response.ok) {
            console.log(success_mes)
            return await prime_response.json();
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
    // console.log(prime_json_data);
    const path = '/register_tracking_number';
    const user_id_hash = await get_user_id_hash();
    // console.log(prime_json_data);

    try {
        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }
        // send the primary message
        const prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers,
            body: JSON.stringify(prime_json_data)
        });

        console.log('prime_response', prime_response);

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();
        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            const second_prime_response = create_user_request(headers,path,prime_json_data);
            // user created, second response successful
            // console.log(response_json);
            // console.log("registered the number successfully");
            return 0
        } else if (prime_response.status == 530) {
            // TODO: resolve 530 response, specify carrier in registering a number
            return 1
        } else if (prime_response.ok) {
            console.log("registered the number successfully");
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

// Function to load all the user's tracked packages info, called when app is started 
// or when user exists the notification screen
async function loadTrackedPackages(): Promise<PackageData[] | undefined> {

    // no json to send as payload, user is in the header 

    const path = '/get_user_tracked_numbers_details';
    const user_id_hash = await get_user_id_hash();

    try {

        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }

        // send the primary message
        const prime_response = await fetch(BACKEND_LINK + path, {
            method: 'post',
            mode: 'cors',
            headers
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            const second_prime_response = create_user_request_no_body(headers,path);
            // user created, second response successful
            const response_json = await second_prime_response.then((r) => r?.json()).catch((err) => console.log(err));
            console.log("user data retrieved successfully")
            console.log(response_json)
            return response_json as PackageData[];
        } else if (prime_response.ok) {
            const response_json = await prime_response.json();
            console.log("user data retrieved successfully")
            console.log(response_json);
            return response_json as PackageData[];
        } else if (!prime_response.ok) {
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

// show the stuff from the notification in the dom
function notify(payload: JSON) {  
    // let update_package_objetto;
    console.log("the thing: " + payload);
    // try {
    //     update_package_objetto = JSON.parse(payload);
    // } catch (e) {
    //     console.log('porco dio javascripto', e);
    //     throw e;
    // }  
    console.log(JSON.stringify(payload, null, 2));
    document.getElementById("update-box")!.innerText = JSON.stringify(payload, null, 2);
}

/*
    ONLY KNOWN WAY TO UPDATE THE DOM WITH VALUES DYNAMICALLY
*/

document.addEventListener('DOMContentLoaded', () => {

    const statusLabel = document.getElementById('statusLabel')!;
    const refreshBtn = document.getElementById('refreshBtn')!;
    
    // Function to update label
    function updateLabel(text: string) {
        statusLabel.textContent = text;
    }
    
    // Initial update
    updateLabel(`Hello, ${tg.initDataUnsafe.user?.first_name || 'User'}!`);
    
    // Example with button click
    refreshBtn.addEventListener('click', () => {
        updateLabel('Refreshing...');

        /*
            two function calls added for testing since im a dumbass without react
            TODO: delete later
        */
        notification_handler();
        
        // Simulate async operation
        setTimeout(() => {
            updateLabel(`Last updated: ${new Date().toLocaleTimeString()}`);
        }, 1000);
    });
})

// Back button handling
tg.BackButton.onClick(backToMainView);

initApp();
tg.ready();