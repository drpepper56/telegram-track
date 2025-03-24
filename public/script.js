let tg = window.Telegram.WebApp;
tg.expand(); // Expand the app to full screen

// Init TWA
Telegram.WebApp.ready();

// Event occurs whenever theme settings are changed in the user's Telegram app (including switching to night mode).
Telegram.WebApp.onEvent('themeChanged', function() {
    document.documentElement.className = Telegram.WebApp.colorScheme;
});

// Show main button
Telegram.WebApp.MainButton.setParams({
    text: 'tralalero tralala'
});
Telegram.WebApp.MainButton.onClick(function () {
    Telegram.WebApp.showAlert('Main Button was clicked')
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

// test connection on database through server to read something and get it here

// test connection on database through server to write something into the db and get confirmation here

async function send_data_to_db_TESTING() {

    console.log('write : big balls' )

    // create the json to send as payload
    const json_data = {
        "key": document.getElementById('test_textbox_key'),
        "value": document.getElementById('test_textbox_value')
    }

    console.info(json_data);
    console.log(json_data.key);
    console.log(json_data.value);

    // curl -X POST -H "Content-Type: application/json" -d '{"key": “a”, "value": “b”}' https://teletrack-server-20b6f79a4151.herokuapp.com/write

    try {

        const response = await fetch('https://teletrack-server-20b6f79a4151.herokuapp.com/write', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(json_data)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
      
          const result = await response.text(); // or .json() if you change the Rust endpoint to return JSON
          console.log('Success:', result);
          return result;
        } catch (error) {
          console.error('Error writing to DB:', error);
          throw error; // Re-throw so calling code can handle it
    }
}
