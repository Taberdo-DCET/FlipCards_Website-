// loadingOverlay.js

let loaderOverlay = null;

function createLoader() {
  if (loaderOverlay) return;

  loaderOverlay = document.createElement('div');
  loaderOverlay.id = 'loader-overlay';
  loaderOverlay.innerHTML = `
    <div class="loader-bg"></div>
    <div class="loader-content">
      <img src="loaderr.gif" alt="Loading..." />
    </div>
  `;

  const style = document.createElement('style');
  style.innerHTML = `
    #loader-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 1;
      transition: opacity 0.5s ease;
    }

    .loader-bg {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-color: rgba(23, 23, 23, 0.5);
    }

    .loader-content {
      position: relative;
      z-index: 1;
    }

    .loader-content img {
      width: 120px;
      height: auto;
    }
  `;
  document.body.appendChild(style);
  document.body.appendChild(loaderOverlay);
}

function showLoader(duration = 1500) {
  createLoader();
  loaderOverlay.style.display = 'flex';
  loaderOverlay.style.opacity = '1';

  setTimeout(() => {
    loaderOverlay.style.opacity = '0';
    setTimeout(() => {
      loaderOverlay.style.display = 'none';
    }, 500); // fade-out
  }, duration); // duration in ms
}

