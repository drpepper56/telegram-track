/*
    TODO:

    Save the tracking number with a tag for the package set by the user or a default in telegram storage.

    In run time memory save a list of {tracking_number, package_tag, {tracking_events}}, this will be requested only when the
    app is opened normally, not via a notification about ta tracking update.

    When the app is opened with notification parameters {tracking number}, only request the events for that number

    Add button to delete a tracking number, from the telegram memory list as well as from the database relation list

    Put the (fries in the bag) add tracking number function in the telegram main button



*/


// adssaf

/*
    CONSTANTS
*/

const BACKEND_LINK = 'https://teletrack-server-20b6f79a4151.herokuapp.com';
// const BACKEND_LINK = 'https://webhook.lemoncardboard.uk';
// const BACKEND_LINK = 'http://127.0.0.1:8080';

/*
    STATE HANDLING IS SOMETHING WE DO NOW
*/

let currentView: 'main' | 'details' = 'main';
let currentTrackingNumber: string | null = null;
let trackedPackages: { trackingNumber: string; status: string; lastUpdate: string }[] = [];

/*
    Init TWA
*/

let tg = window.Telegram.WebApp;
Telegram.WebApp.ready();
Telegram.WebApp.expand();
notification_handler();

// Initialize the app
async function initApp() {
    tg.MainButton.setText('ADD TRACKING NUMBER');
    tg.MainButton.onClick(showAddTrackingDialog);
    tg.MainButton.show();
    
    await loadTrackedPackages();
    renderTrackingList();
}

/*
    NOTIFICATION HANDLERS
*/

function notification_handler() {
    // get the deep link url value and cheat this stupid environment, 64 characters
    let startParam = window.location.search;
    console.log('startParam', startParam)
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
        get_tracking_data(decodedData.package_update);

        // notify(decodedData.package_update);
    } catch (e) {
        console.error("Error parsing start param:", e);
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

/// Function for creating a user and resending a request if the user has been created
async function create_user_request(headers: any, prime_path: string, prime_json_data: any) {
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
            } else {
                throw new Error("second prime response failed when after creating the user" + 
                    second_prime_response.status + " " + second_prime_response.text())
            }
        }
                                                                                        
    } catch (parseError) {
        /* the more errors you get the smarter you are */
        console.error('Failed to parse 520 response:', parseError);
        throw parseError
    }
}

/*
    POP-UP FUNCTIONS
*/

/// Show add tracking number dialog
// TODO: add optional add carrier drop down window, use the csv file from 17track docs
function showAddTrackingDialog(): void {
    // Telegram's showPopup only accepts strings for message,
    // so we'll use showAlert with a custom HTML popup instead
    const popupContainer = document.createElement('div');
    popupContainer.style.padding = '16px';
    popupContainer.style.display = 'flex';
    popupContainer.style.flexDirection = 'column';
    popupContainer.style.gap = '12px';
    popupContainer.style.width = '100%';
    
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
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Handle add
    addButton.addEventListener('click', () => {
        const trackingNumber = input.value.trim();
        
        if (!trackingNumber) {
            tg.showAlert('Please enter a tracking number');
            return;
        }
        
        document.body.removeChild(modal);
        addTrackingNumber(trackingNumber);
    });
    
    // Focus input when modal appears
    setTimeout(() => input.focus(), 100);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}



/*
    API RELATED FUNCTIONS
*/

/// Function for sending a request for tracking data of a number, assume it's already registered
/// and the user has permissions to it, call after a notification or when accessing the tracking page
async function get_tracking_data(tracking_number: string) {
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
            // user created, second response successful
            const response_json = await second_prime_response.then((res) => res!.json()).catch((err) => console.log(err));
            notify(response_json);
                    
        } else if (prime_response.ok) {
            // write successful
            console.log(success_mes)
            let response = await prime_response.json();
            console.log(response);
            notify(response);
            console.log(response.status, " ", response.text());
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.text());  
            document.getElementById('error_panel')!.textContent = 'error';
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
          
    
        } catch (error) {
            /* the more errors you get the smarter you are */   
            console.log('some other error:', error);
    }; 

}

// TODO: test this later iykyk
async function register_one_tracking_number() {
    // create the json to send as payload
    const prime_json_data = {
        "number": (document.getElementById('tracking_number') as HTMLInputElement).value,
        "carrier": Number((document.getElementById('carrier_text') as HTMLInputElement).value)
    };
    console.log(prime_json_data);
    const path = '/register_tracking_number';
    const user_id_hash = await get_user_id_hash();
    console.log(prime_json_data);

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

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
            // user doesn't exist yet, call to create user, then retry the original call
            const second_prime_response = create_user_request(headers,path,prime_json_data);
            // user created, second response successful
            const response_json = await second_prime_response.then((json) => json).catch((err) => console.log(err));
            console.log(response_json)
            console.log("registered the number successfully")
        } else if (prime_response.ok) {
            console.log('write successful')
            document.getElementById('error_panel')!.textContent = 'success';
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.json());  
            document.getElementById('error_panel')!.textContent = 'error';
        } else {
            /* the more errors you get the smarter you are */
            throw new Error('unknown error');
        }
        

        } catch (error) {
            /* the more errors you get the smarter you are */   
            console.log('some other error:', error);
    }; 
}


/*









clean everything down there too much testing going on







*/

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



// Event occurs whenever theme settings are changed in the user's Telegram app (including switching to night mode).
Telegram.WebApp.onEvent('themeChanged', function() {
    document.documentElement.className = Telegram.WebApp.colorScheme;
});

// Show main button
Telegram.WebApp.MainButton.setParams({
    text: 'add tracking'
});

Telegram.WebApp.MainButton.onClick(function () {
    console.log("aaaAAAaa")
});	

Telegram.WebApp.MainButton.show();

// Function to call showPopup API
function showPopup() {
    Telegram.WebApp.showPopup({
        title: 'Title',
        message: 'Some message',
        buttons: [
            {id: 'link', type: 'default', text: 'Open ton.org'},
            {type: 'cancel'},
        ]
    }, function(btn) {
        if (btn === 'link') {
            Telegram.WebApp.openLink('https://ton.org/');
        }
    });
};

// Function to toggle main TWA button
function toggleMainButton() {
    if (Telegram.WebApp.MainButton.isVisible) {
        Telegram.WebApp.MainButton.hide();
    } else {
        Telegram.WebApp.MainButton.show();
    }
};


Telegram.WebApp.setHeaderColor('secondary_bg_color');

Telegram.WebApp.onEvent('themeChanged', function() {
    document.body.setAttribute('style', '--bg-color:' + Telegram.WebApp.backgroundColor);
});


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


/*









garbage end







*/

// Back button handling
tg.BackButton.onClick(backToMainView);

tg.ready();
initApp();
