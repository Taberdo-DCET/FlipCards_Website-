// Function to reload the page
function autoReloadPage() {
    console.log("Reloading page..."); // Optional: Log to console
    location.reload();
}

// Set an interval to call the reload function every 10 seconds (10000 milliseconds)
const reloadInterval = 10000; // 10 seconds in milliseconds
setInterval(autoReloadPage, reloadInterval);

console.log(`Page set to automatically reload every ${reloadInterval / 1000} seconds.`); // Initial message