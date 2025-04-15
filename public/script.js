/*
    IMPORTS
*/


// adssaf

/*
    CONSTANTS
*/

const BACKEND_LINK = 'https://teletrack-server-20b6f79a4151.herokuapp.com';
// const BACKEND_LINK = 'https://webhook.lemoncardboard.uk';
// const BACKEND_LINK = 'http://127.0.0.1:8080';

/*
    Init TWA
*/

let tg = window.Telegram.WebApp;
Telegram.WebApp.ready();
Telegram.WebApp.expand();
notification_handler();

/*
    NOTIFICATION HANDLERS
*/

function notification_handler() {
    // get the deep link url value and cheat this stupid environment
    let startParam = window.location.search;
    console.log('startParam', startParam)
    try {
        // json -> base64 -> json decoding pogchamp
        const urlParams = new URLSearchParams(startParam);
        const encodedParam = urlParams.get('tgWebAppStartParam'); 
        const urlDecoded = decodeURIComponent(encodedParam);
        const base64Decoded = atob(urlDecoded.replace(/-/g, '+').replace(/_/g, '/'));
        const decodedData = JSON.parse(base64Decoded);
        notify(decodedData.balls, decodedData.balls2);
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
        const data = encoder.encode(Telegram.WebApp.initDataUnsafe.user.id.toString());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex; 
    } catch (error) {
        console.error('Error generating hash:', error);
        throw error;
    }
}

async function get_user_details() {

    const user_details = {
        "user_id": Telegram.WebApp.initDataUnsafe.user.id.toString(),
        "user_name": Telegram.WebApp.initDataUnsafe.user.first_name,
        "user_id_hash": await get_user_id_hash()
    }

    return user_details;
}



/*









clean everything down there too much testing going on







*/

// show the stuff from the notification in the dom
function notify(value1, value2) {    
    document.getElementById("parameter1").textContent = value1;
    document.getElementById("parameter2").textContent = value2;
    
}



// Event occurs whenever theme settings are changed in the user's Telegram app (including switching to night mode).
Telegram.WebApp.onEvent('themeChanged', function() {
    document.documentElement.className = Telegram.WebApp.colorScheme;
});

// Show main button
Telegram.WebApp.MainButton.setParams({
    text: 'tralalero tralala'
});

Telegram.WebApp.MainButton.onClick(function () {
    updateLabel('Refreshing...');
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

function setViewportData() {
    var sizeEl = document.getElementById('viewport-params-size');
    sizeEl.innerText = 'width: ' + window.innerWidth + ' x ' + 
        'height: ' + Telegram.WebApp.viewportStableHeight;

    var expandEl = document.querySelector('#viewport-params-expand');
    expandEl.innerText = 'Is Expanded: ' + (Telegram.WebApp.isExpanded ? 'true' : 'false');
}

Telegram.WebApp.setHeaderColor('secondary_bg_color');

setViewportData();
Telegram.WebApp.onEvent('viewportChanged', setViewportData);

Telegram.WebApp.onEvent('themeChanged', function() {
    document.body.setAttribute('style', '--bg-color:' + Telegram.WebApp.backgroundColor);
});


/*
    ONLY KNOWN WAY TO UPDATE THE DOM WITH VALUES DYNAMICALLY
*/

document.addEventListener('DOMContentLoaded', () => {

    const statusLabel = document.getElementById('statusLabel');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Function to update label
    function updateLabel(text) {
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


/*
    ONLY KNOWN WAY TO SEND REQUESTS TO THE SERVER
*/

async function register_one_tracking_number() {
    // create the json to send as payload
    const prime_json_data = {
        "tracking_number": document.getElementById('tracking_number').value,
        "carrier": Number(document.getElementById('carrier_text').value)
    };
    const user_id_hash = await get_user_id_hash();
    console.log(prime_json_data)

    try {

        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }

        // send the primary message
        const prime_response = await fetch(BACKEND_LINK + '/register_tracking_number', {
            method: 'post',
            mode: 'cors',
            headers: headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
        // user doesn't exist yet
        console.log("USER DOESN'T EXIST YET");
            try {
                // read the body of the user not existing error
                data = await prime_response.json();
                // DO NOT DISTURB
                let message = data?.['expected error'] ?? data?.expected_error ?? null;
                console.log(message)

                // create the json for user details
                const user_details = await get_user_details();
                
                // send request to create the user                                                             
                // TODO: do some encryption in the whole thing later                                                /* it only gets easier form here they said */
                const create_user_response = await fetch(BACKEND_LINK + '/create_user', {
                    method: 'post',
                    mode: 'cors',
                    headers: headers,
                    body: JSON.stringify(user_details)
                });

                if(create_user_response.ok) {
                    console.log('user created')
                    console.log('recycling prime message now...')
                    // resend primary message
                    const second_prime_response = await fetch(BACKEND_LINK + '/register_tracking_number', {
                        method: 'post',
                        mode: 'cors',
                        headers: headers,
                        body: JSON.stringify(prime_json_data)
                    });
                    console.log('second prime sent successfully');

                    if(second_prime_response.ok) {
                        // write successful
                        console.log("WRITE GOOD AND USER CREATED")
                    } else {
                        console.log("recycled prime message response is not ok")
                        response = await second_prime_response.json();
                        console.log(response)
                        
                        // response error
                        console.log(response.status, " ", response.text())
                    }
                }
                                                                                                
            } catch (parseError) {
                /* the more errors you get the smarter you are */
                console.error('Failed to parse 520 response:', parseError);
            }
        } else if (prime_response.ok) {
            console.log('write successful')
            document.getElementById('error_panel').textContent = 'success';
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.text());  
            document.getElementById('error_panel').textContent = 'error';
            document.getElementById('error_panel').textContent = prime_response.text();
        } else {
            /* the more errors you get the smarter you are */
            throw new error('unknown error');
        }
          
    
        } catch (error) {
            /* the more errors you get the smarter you are */   
            console.log('some other error:', error);
    }; 
}

// test connection on database through server to write something into the db and get confirmation here
async function send_data() {
    // create the json to send as payload
    const prime_json_data = {
        "key": document.getElementById('test_textbox_key').value,
        "value": document.getElementById('test_textbox_value').value
    };
    const user_id_hash = await get_user_id_hash();
    

    // curl -X POST -H "Content-Type: application/json" -d '{"key": "balls", "value": "balls"}' https://teletrack-server-20b6f79a4151.herokuapp.com/write

    try {

        // headers
        const headers = {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-User-ID-Hash': user_id_hash
        }

        // send the primary message
        const prime_response = await fetch(BACKEND_LINK + '/write', {
            method: 'post',
            mode: 'cors',
            headers: headers,
            body: JSON.stringify(prime_json_data)
        });

        // /* the more errors you get the smarter you are */
        // const responseClone = response.clone();

        if (prime_response.status == 520) {
        // user doesn't exist yet
        console.log("USER DOESN'T EXIST YET");
            try {
                // read the body of the user not existing error
                data = await prime_response.json();
                // DO NOT DISTURB
                let message = data?.['expected error'] ?? data?.expected_error ?? null;
                console.log(message)

                // create the json for user details
                const user_details = await get_user_details();
                
                // send request to create the user                                                             
                // TODO: do some encryption in the whole thing later                                                /* it only gets easier form here they said */
                const create_user_response = await fetch(BACKEND_LINK + '/create_user', {
                    method: 'post',
                    mode: 'cors',
                    headers: headers,
                    body: JSON.stringify(user_details)
                });

                if(create_user_response.ok) {
                    console.log('user created')
                    console.log('recycling prime message now...')
                    // resend primary message
                    const second_prime_response = await fetch(BACKEND_LINK + '/write', {
                        method: 'post',
                        mode: 'cors',
                        headers: headers,
                        body: JSON.stringify(prime_json_data)
                    });
                    console.log('second prime sent successfully');

                    if(second_prime_response.ok) {
                        // write successful
                        console.log("WRITE GOOD AND USER CREATED")
                    } else {
                        console.log("recycled prime message response is not ok")
                        response = await second_prime_response.json();
                        console.log(response)
                        
                        // response error
                        console.log(response.status, " ", response.text())
                    }
                }
                                                                                                
            } catch (parseError) {
                /* the more errors you get the smarter you are */
                console.error('Failed to parse 520 response:', parseError);
            }
        } else if (prime_response.ok) {
            console.log('write successful')
            document.getElementById('error_panel').textContent = 'success';
        } else if (!prime_response.ok) {
            console.log('Response status error', prime_response.status, prime_response.text());  
            document.getElementById('error_panel').textContent = 'error';
            document.getElementById('error_panel').textContent = prime_response.text();
        } else {
            /* the more errors you get the smarter you are */
            throw new error('unknown error');
        }
          
    
        } catch (error) {
            /* the more errors you get the smarter you are */   
            console.log('some other error:', error);
    };
}