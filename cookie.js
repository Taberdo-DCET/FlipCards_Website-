function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

function acceptCookies() {
  setCookie("adsenseConsent", "true", 365);
  document.getElementById("cookieBanner").style.display = "none";
  loadAdSenseScript(); // Load AdSense only after consent
}

window.onload = () => {
  if (!getCookie("adsenseConsent")) {
    document.getElementById("cookieBanner").style.display = "block";
  } else {
    loadAdSenseScript();
  }
};

function loadAdSenseScript() {
  const script = document.createElement("script");
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
  script.async = true;
  script.setAttribute("data-ad-client", "ca-pub-4779578721359852"); // replace with your AdSense ID
  document.head.appendChild(script);
}
