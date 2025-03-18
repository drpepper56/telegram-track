const tg = window.Telegram.WebApp;

document.addEventListener("DOMContentLoaded", () => {
    tg.expand(); // Expand the Mini App to full screen
    document.getElementById("user-info").innerText = `Hello, ${tg.initDataUnsafe.user?.first_name || "User"}!`;

    document.getElementById("send-data").addEventListener("click", () => {
        tg.sendData(JSON.stringify({ action: "button_clicked" }));
    });
});
