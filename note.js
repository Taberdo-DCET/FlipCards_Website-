// note.js — Firestore-backed Notes with local fallback + auto-numbered docs
// Structure: notepad/{email}/notes/{number}

(function () {
  // ----- Your Firebase config -----
  const firebaseConfig = {
    apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
    authDomain: "flipcards-7adab.firebaseapp.com",
    databaseURL: "https://flipcards-7adab-default-rtdb.firebaseio.com",
    projectId: "flipcards-7adab",
    storageBucket: "flipcards-7adab.firebasestorage.app",
    messagingSenderId: "836765717736",
    appId: "1:836765717736:web:ff749a40245798307b655d",
    measurementId: "G-M26MWQZBJ0"
  };

  // ----- DOM refs -----
  const openBtn = document.querySelector('.music-icon.notes'); // trigger you already have
  const backdrop = document.getElementById('noteBackdrop');
  const closeBtn = document.getElementById('noteCloseBtn');
  const addBtn = document.getElementById('noteAddBtn');
  const searchInput = document.getElementById('noteSearch');
  const list = document.getElementById('noteList');

  // === Build the Preview Modal (smaller, sits above Notepad modal) ===
const previewBackdrop = document.createElement('div');
previewBackdrop.id = 'notePreviewBackdrop';
previewBackdrop.style.cssText = `
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  display: none; place-items: center; z-index: 10000;
`;

const previewModal = document.createElement('div');
previewModal.id = 'notePreviewModal';
previewModal.style.cssText = `
  width: min(84vw, 960px); height: min(74vh, 680px);
  background: #171717; color:#fff; border-radius:18px; border:1px solid #000;
  
  display:flex; flex-direction:column; overflow:hidden;
  animation: notePop 140ms ease-out; /* <-- ADD THIS LINE */
`;

const previewTopbar = document.createElement('div');
previewTopbar.style.cssText = `
  display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:12px;
  padding:14px 16px; border-bottom:1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg,#1a1a1a 0%, #171717 100%);
`;


const previewTitleHeading = document.createElement('h4');
previewTitleHeading.id = 'notePreviewTitle';
previewTitleHeading.textContent = 'Title: (Untitled)';

previewTitleHeading.style.cssText = `margin:0; font:600 16px 'Satoshi',sans-serif; letter-spacing:.3px;`;

const previewCloseBtn = document.createElement('button');
previewCloseBtn.id = 'notePreviewCloseBtn';
previewCloseBtn.textContent = '×';
previewCloseBtn.title = 'Close';
previewCloseBtn.style.cssText = `all:unset; cursor:pointer; padding:4px 8px; font-size:22px; line-height:1;`;

previewTopbar.appendChild(previewTitleHeading);

// NEW: How to Use button (left of the X)
const howToBtn = document.createElement('button');
howToBtn.type = 'button';
howToBtn.textContent = 'How to Use';
howToBtn.title = 'How to Use';
howToBtn.className = 'howto-btn attract'; // CSS drives style + pulse

previewTopbar.appendChild(howToBtn);
// ▼ ADD: Review Mode button (sits between How To and the close "×")
const reviewBtn = document.createElement('button');
reviewBtn.type = 'button';
reviewBtn.id = 'reviewModeBtn';
reviewBtn.textContent = 'Review Mode';
reviewBtn.title = 'Enlarge editor for focused reviewing';
reviewBtn.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
`;
// make room for the extra button
previewTopbar.style.gridTemplateColumns = '1fr auto auto auto';
previewTopbar.appendChild(reviewBtn);
// ▼ ADD: Review Mode behavior
function resizeOverlaysForReview() {
  const ov = previewEditorWrap.querySelector('#noteDrawOverlay');
  console.log(`%c[Review] resizeOverlaysForReview: Running.`, 'color: #eab308', { overlayElementFound: !!ov });
  if (!ov) return;

  if (previewModal.classList.contains('review-mode') && previewEditorWrap?.dataset?.baseW) {
    const w = parseFloat(previewEditorWrap.dataset.baseW);
    const h = parseFloat(previewEditorWrap.dataset.baseH || Math.max(previewText.scrollHeight, previewText.clientHeight));
    console.log('[Review] resizeOverlaysForReview: Sizing saved overlay for REVIEW MODE from dataset:', { width: w, height: h });
    ov.style.width  = w + 'px';
    ov.style.height = h + 'px';
    ov.style.left = '0px';
    ov.style.top  = '0px';
    return;
  }

  const w = previewText.clientWidth;
  const h = Math.max(previewText.scrollHeight, previewText.clientHeight);
  console.log('[Review] resizeOverlaysForReview: Sizing saved overlay for NORMAL MODE from live content:', { width: w, height: h });
  ov.style.width  = w + 'px';
  ov.style.height = h + 'px';
  ov.style.left = '0px';
  ov.style.top  = '0px';
}

function applyReviewScale() {
  const inReview = previewModal.classList.contains('review-mode');
  console.log(`%c[Review] applyReviewScale: Running. In Review Mode: ${inReview}`, 'color: #3b82f6');

  if (!inReview) {
    console.log('[Review] applyReviewScale: Exiting Review Mode. Clearing fixed styles.');
    previewEditorWrap.style.transform = '';
    previewEditorWrap.style.width = '';
    previewEditorWrap.style.height = '';
    delete previewEditorWrap.dataset.baseW;
    delete previewEditorWrap.dataset.baseH;
    return;
  }

  const baseW = String(previewEditorWrap.clientWidth);
  const baseH = String(Math.max(previewEditorWrap.scrollHeight, previewEditorWrap.clientHeight));
  console.log('[Review] applyReviewScale: Recorded base dimensions:', { baseW: parseFloat(baseW), baseH: parseFloat(baseH) });
  
  previewEditorWrap.dataset.baseW = baseW;
  previewEditorWrap.dataset.baseH = baseH;

  console.log('[Review] applyReviewScale: Locking layout dimensions to base values.');
  previewEditorWrap.style.width = baseW + 'px';
  previewEditorWrap.style.height = baseH + 'px';

  const bodyRect = previewBody.getBoundingClientRect();
  const availW = bodyRect.width  - 16;
  const availH = bodyRect.height - 16;
  
  const s = Math.max(0.5, Math.min(availW / parseFloat(baseW), availH / parseFloat(baseH)));
  console.log('[Review] applyReviewScale: Calculated scale:', { availW: availW, availH: availH, scale: s });

  console.log(`[Review] applyReviewScale: Applying transform: scale(${s})`);
  previewEditorWrap.style.transform = `scale(${s})`;
}



reviewBtn.addEventListener('click', () => {
  const enabling = !previewModal.classList.contains('review-mode');

  previewBackdrop.classList.toggle('review-mode', enabling);
  previewModal.classList.toggle('review-mode', enabling);
  previewText.classList.toggle('review-mode', enabling);

  if (enabling) {
    // --- ADD THIS LINE TO HIDE THE RIBBON ---
    previewRibbon.style.display = 'none';

    if (!previewModal.dataset.origW) {
      previewModal.dataset.origW = previewModal.style.width || '';
      previewModal.dataset.origH = previewModal.style.height || '';
    }
    previewModal.style.width  = 'min(98vw, 1400px)';
    previewModal.style.height = 'min(94vh, 900px)';
    if (drawModeOn) btnDraw.click();
    btnDraw.disabled = true;
    btnDraw.title = 'Drawing is disabled in Review Mode';
    drawPalette.style.display = 'none';
    drawPalette.style.opacity = '0';
    drawPalette.style.transform = 'translateX(10px)';

    let ov = document.getElementById('noteDrawOverlay');
    if (!ov && currentPreviewNote?.drawLayer?.src) {
      ov = document.createElement('img');
      ov.id = 'noteDrawOverlay';
      ov.src = currentPreviewNote.drawLayer.src;
      ov.style.position = 'absolute';
      ov.style.pointerEvents = 'none';
      ov.style.zIndex = '3';
      ov.style.left = '0px';
      ov.style.top  = '0px';
      previewEditorWrap.appendChild(ov); // Corrected parent
    }
    if (ov) ov.style.display = 'block';
    annotationStatus.textContent = 'Annotations Visible';
  } else {
    // --- ADD THIS LINE TO SHOW THE RIBBON AGAIN ---
    previewRibbon.style.display = 'flex';

    previewModal.style.width  = previewModal.dataset.origW || '';
    previewModal.style.height = previewModal.dataset.origH || '';
    delete previewEditorWrap.dataset.baseW;
    delete previewEditorWrap.dataset.baseH;
    btnDraw.disabled = false;
    btnDraw.title = 'Freehand drawing';
    const _ov = document.getElementById('noteDrawOverlay');
    if (_ov) _ov.style.display = drawModeOn ? 'block' : 'none';
    annotationStatus.textContent = drawModeOn ? 'Annotations Visible' : 'Annotations Hidden';
  }

  reviewBtn.classList.toggle('active', enabling);
  reviewBtn.textContent = enabling ? 'Exit Review' : 'Review Mode';
  
  const onTransEnd = (ev) => {
    if (ev.target !== previewModal || (ev.propertyName !== 'width' && ev.propertyName !== 'height')) return;
    applyReviewScale(); 
    resizeOverlaysForReview();
    // CORRECTED: Sync canvas size after transition
    if (drawModeOn) syncDrawCanvasSize(); 
    if (!previewModal.classList.contains('review-mode')) {
      previewModal.removeEventListener('transitionend', onTransEnd);
    }
  };

  requestAnimationFrame(() => {
    applyReviewScale();
    resizeOverlaysForReview();
    // CORRECTED: Sync canvas size immediately
    if (drawModeOn) syncDrawCanvasSize(); 
  });

  previewModal.addEventListener('transitionend', onTransEnd);
});


// Keep things correct on window resize while preview is open
window.addEventListener('resize', () => {
  if (previewBackdrop.style.display === 'grid') {
     applyReviewScale();
    // Always let the overlay image grow/shrink with the editor
    resizeOverlaysForReview();

    // Only touch the canvas if draw mode is actually ON
    if (drawModeOn && typeof syncDrawCanvasSize === 'function') {
      syncDrawCanvasSize();
    }
  }
  
});


previewTopbar.appendChild(previewCloseBtn);


const previewBody = document.createElement('div');
previewBody.style.cssText = `
  display:grid; grid-template-rows:auto 1fr; gap:14px;
  padding:14px 16px; height:100%;
`;

// Title input (same class as card title for consistent styling)
const previewTitleInput = document.createElement('input');
previewTitleInput.id = 'notePreviewTitleInput';
previewTitleInput.className = 'note-card-title';
previewTitleInput.placeholder = 'Input Title';

// Big editable text
const previewText = document.createElement('div');
previewText.id = 'notePreviewText';
previewText.className = 'note-text';
previewText.contentEditable = 'true';
previewText.spellcheck = false;
// Always paste as plain text to avoid bringing inline styles or backgrounds
previewText.addEventListener('paste', (e) => {
  e.preventDefault();
  const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, txt);
});

previewText.style.height = '100%';
previewText.style.maxHeight = '100%';
previewText.style.overflowY = 'auto';


// Keep the title:
previewBody.appendChild(previewTitleInput);

// ▼ NEW: Ribbon + Checklist container
const previewRibbon = document.createElement('div');
previewRibbon.id = 'previewRibbon';
previewRibbon.style.cssText = `
  display:flex; gap:8px; align-items:center;
  padding:6px 0; border-bottom:1px dashed #2a2a2a;
`;

const btnChecklist = document.createElement('button');
btnChecklist.type = 'button';
btnChecklist.id = 'btnChecklist';
btnChecklist.textContent = '☑︎';
btnChecklist.title = 'Add checklist items';
btnChecklist.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
`;

previewRibbon.appendChild(btnChecklist);
// ▶ Image button + hidden file input (JPG/PNG) — inserts image at caret in previewText
const btnImage = document.createElement('button');
btnImage.type = 'button';
btnImage.id = 'btnImage';
btnImage.textContent = '🖼️';
btnImage.title = 'Insert image (JPG/PNG)';
btnImage.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
`;

// keep the picker out of sight but in the DOM
const imgPicker = document.createElement('input');
imgPicker.type = 'file';
imgPicker.accept = 'image/png, image/jpeg';
imgPicker.multiple = true;
imgPicker.style.display = 'none';

// add to ribbon / body
previewRibbon.appendChild(btnImage);
previewBody.appendChild(imgPicker);

// ==================================================================
// START: UPDATED PDF and PPTX Logic with Firebase Storage
// ==================================================================

// Helper function to show a temporary message in the editor
function showEditorMessage(message, isPersistent = false) {
    const originalContent = previewText.innerHTML;
    previewText.innerHTML = `<div style="text-align: center; opacity: 0.7; padding: 20px;"><i>${message}</i></div>`;
    
    if (isPersistent) {
        return () => {}; // Return an empty function if the message should stay
    }
    
    return () => { // Return a function to restore original content
        if (previewText.innerHTML.includes(message)) {
            previewText.innerHTML = originalContent;
        }
    };
}

// Helper to convert a canvas to a Blob
function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.85) {
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), type, quality);
    });
}







// ==================================================================
// END: UPDATED PDF and PPTX Logic
// ==================================================================

// ▶ Draw button → toggles drawing mode; palette slides in on the right
const btnDraw = document.createElement('button');
btnDraw.type = 'button';
btnDraw.id = 'btnDraw';
btnDraw.textContent = '✏️';
btnDraw.title = 'Freehand drawing';
btnDraw.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
  transition: transform 120ms ease;
`;
previewRibbon.appendChild(btnDraw);

// Small color palette that slides in to the RIGHT of the draw button
const drawPalette = document.createElement('div');
drawPalette.id = 'drawPalette';
drawPalette.style.cssText = `
  position: absolute; display: none; z-index: 5;
  padding: 8px; border-radius: 10px; border: 1px solid #000; background: #171717;
  box-shadow: 6px 6px 12px #0f0f0f, -6px -6px 12px #1f1f1f,
              inset 1px 1px 0 rgba(255,255,255,0.04), inset -1px -1px 0 rgba(0,0,0,0.55);
  gap: 6px; width: auto; display: none;   /* keep hidden initially */
  opacity: 0; transform: translateX(10px); transition: opacity 180ms ease, transform 180ms ease;
`;
previewBody.appendChild(drawPalette);
// ── Annotations status label (right side of the ribbon)
const annotationStatus = document.createElement('span');
annotationStatus.id = 'annotationStatus';
annotationStatus.textContent = 'Annotations Hidden';
annotationStatus.style.cssText = `
  margin-left:auto;
  font:600 12px 'Satoshi',sans-serif;
  letter-spacing:.3px;
  opacity:.8;
  user-select:none;
`;
previewRibbon.appendChild(annotationStatus);
// ▶ PDF button + hidden file input
const btnPdf = document.createElement('button');
btnPdf.type = 'button';
btnPdf.id = 'btnPdf';
btnPdf.title = 'Import from PDF as Images';
btnPdf.style.cssText = `
  padding: 6px 10px; border-radius: 8px; border: 1px solid #333;
  background: #1e1e1e; color: #eee; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
`;
const pdfIcon = document.createElement('img');
pdfIcon.src = 'PDF.png';
pdfIcon.alt = 'PDF';
pdfIcon.style.cssText = 'width: 16px; height: 16px;';
btnPdf.appendChild(pdfIcon);

const pdfPicker = document.createElement('input');
pdfPicker.type = 'file';
pdfPicker.accept = '.pdf';
pdfPicker.style.display = 'none';

previewRibbon.appendChild(btnPdf);
previewBody.appendChild(pdfPicker);

btnPdf.addEventListener('click', () => {
    if (!auth?.currentUser || !currentPreviewNote) {
        alert("Please open a note before uploading a file.");
        return;
    }
    pdfPicker.click();
});

pdfPicker.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !auth?.currentUser || !currentPreviewNote) return;

    btnPdf.disabled = true;
    const originalIconHTML = btnPdf.innerHTML;
    
    let restoreEditor = () => {}; 

    try {
        restoreEditor = showEditorMessage(`Processing PDF... please wait.`);
        
        if (typeof pdfjsLib === 'undefined') throw new Error("PDF.js library is not loaded.");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let allImagesHtml = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            btnPdf.innerHTML = `${i}/${pdf.numPages}`;
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const blob = await canvasToBlob(canvas);
            
            const userEmail = auth.currentUser.email;
            const noteId = currentPreviewNote.id;
            const filePath = `notepad/${userEmail}/${noteId}/pdf_page_${Date.now()}_${i}.jpg`;
            const storageRef = storage.ref(filePath);
            const uploadTask = await storageRef.put(blob);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            allImagesHtml += `<div class="img-block"><img src="${downloadURL}" alt="PDF Page ${i}" style="max-width: 95%; height: auto; display: block; margin: 10px auto; border: 1px solid #333; border-radius: 4px;" /></div>`;
        }

        restoreEditor(); 
        previewText.innerHTML += `<div>${allImagesHtml}</div>`;
        previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));

        // CORRECTED: If in draw mode, resize the canvas to fit the new content
        if (drawModeOn) {
            syncDrawCanvasSize();
        }

    } catch (error) {
        console.error('Error processing PDF and uploading to Storage:', error);
        restoreEditor();
        previewText.innerHTML += `<p><i>Failed to process PDF: ${error.message}</i></p>`;
    } finally {
        btnPdf.disabled = false;
        btnPdf.innerHTML = originalIconHTML;
        pdfPicker.value = '';
    }
});

// ---- DRAWING COLORS (edit freely later) ----
const DRAW_COLORS = [
  '#ffffff', // white
  '#0ea5e9', // sky-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#000000ff',
  '#00ff0dff'
];
// -------------------------------------------



// a wrapper that holds the checklist rows (initially empty)
const previewChecklistWrap = document.createElement('div');
previewChecklistWrap.id = 'previewChecklist';
previewChecklistWrap.style.cssText = `
  display:flex; flex-direction:column; gap:6px;
  padding:8px 0; max-height:30vh; overflow:auto;
`;

previewBody.appendChild(previewRibbon);

// Wrap the editor so we can overlay a drawing canvas on top without saving the canvas element
const previewEditorWrap = document.createElement('div');
previewEditorWrap.id = 'notePreviewEditorWrap';
previewEditorWrap.style.cssText = `
  position: relative;   /* anchor for the overlay canvas */
  height: 100%;
  transform-origin: top left;   /* so scale() zooms from the top-left corner */
`;

previewEditorWrap.appendChild(previewText);
previewBody.appendChild(previewEditorWrap);



previewModal.appendChild(previewTopbar);
previewModal.appendChild(previewBody);
previewBackdrop.appendChild(previewModal);
document.body.appendChild(previewBackdrop);
// ▼ ADD ONCE: scoped CSS for Review Mode (no global side effects)
// ▼ ADD ONCE: scoped CSS for Review Mode (no global side effects)
if (!document.getElementById('noteReviewModeCSS')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'noteReviewModeCSS';
  styleTag.textContent = `
    /* Darken backdrop a bit more in review */
    #notePreviewBackdrop.review-mode { background: rgba(0,0,0,0.88); }

    /* Make the modal almost full-screen when reviewing */
    #notePreviewModal.review-mode {
      width: min(98vw, 1400px);
      height: min(94vh, 900px);
      transition: width .18s ease, height .18s ease;
    }

    /* Ensure images grow to the wider viewport */
    #notePreviewText.review-mode .img-block img,
    #notePreviewText.review-mode img {
      max-width: 100%; height: auto;
    }

    /* Visual hint on the toggle */
    #reviewModeBtn.active { background:#2a2a2a; }
  `;
  document.head.appendChild(styleTag);
}


// === HOW TO USE — Small Modal ===
const howToBackdrop = document.createElement('div');
howToBackdrop.id = 'howToBackdrop';
howToBackdrop.style.cssText = `
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  display: none; place-items: center;
  z-index: 10001;
`;

const howToModal = document.createElement('div');
howToModal.id = 'howToModal';
howToModal.setAttribute('role', 'dialog');
howToModal.setAttribute('aria-modal', 'true');
howToModal.style.cssText = `
  width: min(92vw, 520px);
  background: #151515;
  color: #fff;
  border-radius: 14px;
  border: 1px solid #2a2a2a;
  box-shadow: 0 10px 28px rgba(0,0,0,.45);
  padding: 18px 18px 16px 18px;
  font-family: 'Satoshi', sans-serif;
`;

const howToTop = document.createElement('div');
howToTop.style.cssText = `
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px;
  margin-bottom: 8px;
`;

const howToTitle = document.createElement('h5');
howToTitle.textContent = 'How to Use';
howToTitle.style.cssText = `
  margin: 0;
  font: 700 16px 'Satoshi', sans-serif;
  letter-spacing: .2px;
`;

const howToClose = document.createElement('button');
howToClose.type = 'button';
howToClose.textContent = '×';
howToClose.title = 'Close';
howToClose.style.cssText = `
  all: unset; cursor: pointer; padding: 4px 8px;
  font-size: 22px; line-height: 1;
  color: #fff; border-radius: 8px;
`;
howToClose.addEventListener('mouseenter', () => howToClose.style.color = '#ff4d4d');
howToClose.addEventListener('mouseleave', () => howToClose.style.color = '#fff');

const howToBody = document.createElement('div');
howToBody.style.cssText = `
  background: #181818;
  border: 1px solid #272727;
  border-radius: 10px;
  padding: 14px 14px 12px;
  font: 500 13px 'Satoshi', sans-serif;
  line-height: 1.6;
`;

// Exact text with italicized parentheticals
howToBody.innerHTML = `
  <p style="margin: 0 0 10px 0;">
    To use FlipNote’s Annotation feature (Beta), please upload all the necessary images from your PDF or PPTX file first.

  </p>
  <p style="margin: 0;">
    Also, add any required comments via typing before applying annotations. This helps prevent stretching or misalignment of your markings.
    <em>(We’re working on fixing this issue.)</em>
  </p>
`;

howToTop.appendChild(howToTitle);
howToTop.appendChild(howToClose);
howToModal.appendChild(howToTop);
howToModal.appendChild(howToBody);
howToBackdrop.appendChild(howToModal);
document.body.appendChild(howToBackdrop);

// Open/close behavior
function openHowTo() {
  howToBackdrop.style.display = 'grid';
  document.body.style.overflow = 'hidden'; // <-- ADD THIS LINE
}
function closeHowTo() {
  howToBackdrop.style.display = 'none';
  document.body.style.overflow = ''; // <-- ADD THIS LINE
}

howToBtn.addEventListener('click', openHowTo);
howToClose.addEventListener('click', closeHowTo);

// click outside to close


// ESC to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && howToBackdrop.style.display !== 'none') {
    closeHowTo();
  }
});


// === Cleaning helpers: remove background / inline colors and force white text ===
// === Cleaning helpers: remove background / inline colors and force white text (with logs) ===
// === Cleaning helpers: remove *all* inline styles/classes and force white text (with logs) ===
function clearBgAndMakeTextWhite() {
  const all = previewText.querySelectorAll('*');
  let scanned = all.length, touched = 0, removedBg = 0, removedColor = 0, removedStyles = 0, removedBgAttr = 0;

  console.log('[ClearBG] start', { scanned });

  all.forEach(node => {
    if (node.nodeType !== 1) return;

    // e.g. <td bgcolor="...">
    if (node.hasAttribute('bgcolor')) {
      node.removeAttribute('bgcolor');
      removedBgAttr++; touched++;
    }

    // drop ALL inline styles (count bg/color for the logs)
    if (node.hasAttribute('style')) {
      if (node.style.background || node.style.backgroundColor) removedBg++;
      if (node.style.color || node.style.webkitTextFillColor) removedColor++;
      node.removeAttribute('style');
      removedStyles++; touched++;
    }

    // drop classes that might carry CSS backgrounds
    // drop classes that might carry CSS backgrounds — but keep our checkbox UI classes
if (node.className) {
  const isOurCheckbox = node.matches?.('input[type="checkbox"].check-box') || node.classList?.contains('check-row');
  if (!isOurCheckbox) {
    // Be conservative: only strip classes on generic spans; keep classes on inputs/divs we own
    if (node.tagName === 'SPAN') {
      node.removeAttribute('class');
      touched++;
    }
  }
}

  });

  // safety: strip any lingering inline background in raw HTML
  previewText.innerHTML = previewText.innerHTML
    .replace(/\sstyle="[^"]*background[^"]*"/gi, '')
    .replace(/\sstyle='[^']*background[^']*'/gi, '');

  // ensure the root editor itself has no bg, and text is white
  previewText.style.removeProperty('background');
  previewText.style.removeProperty('background-color');
  previewText.style.color = '#fff';

  const withBg = previewText.querySelectorAll('[style*="background"], [class]').length;
  console.log('[ClearBG] done', { scanned, touched, removedBg, removedColor, removedStyles, removedBgAttr, withBg });
  return { scanned, touched, removedBg, removedColor, removedStyles, removedBgAttr, withBg };
}



// Click → clean current content (preserves caret) and save
// Click → clean current content (preserves caret) and save (with logs)
// Click → clean (with logs), keep caret, save



// Toggle state for "checkbox mode"
let checkboxModeOn = false;

// === Insert checkboxes into the preview textarea ===

// Insert a checkbox line at the current caret in previewText
function insertCheckboxAtCaret() {
  // Ensure the textarea has focus and we have a selection
  previewText.focus();
  const sel = window.getSelection();
  if (!sel) return;
  let range = sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) {
    // place caret at end if no range yet
    setContentEditableCaretIndex(previewText, previewText.innerText.length);
    range = window.getSelection().getRangeAt(0);
  }

  // Build a single checkbox row
  const row = document.createElement('div');
  row.className = 'check-row';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'check-box';
  box.setAttribute('contenteditable', 'false');

  row.appendChild(box);
  row.appendChild(document.createTextNode(' '));   // space before label text
  row.appendChild(document.createTextNode(''));    // empty label the user will type into

  // Insert at caret
  range.deleteContents();
  range.insertNode(row);

  // Place caret at the end of the new row (so the user can type the label)
  const after = document.createRange();
  after.selectNodeContents(row);
  after.collapse(false);
  sel.removeAllRanges();
  sel.addRange(after);

  // Trigger save
  previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

// When user clicks the Ribbon -> Checkbox button, insert a new checkbox row
// Ribbon button acts as ON/OFF toggle for "checkbox mode"
// Ribbon button acts as ON/OFF toggle AND inserts a checkbox immediately when turned ON
btnChecklist.addEventListener('click', () => {
  checkboxModeOn = !checkboxModeOn;
  btnChecklist.classList.toggle('active', checkboxModeOn);
  btnChecklist.textContent = checkboxModeOn ? '☑︎' : '☑︎';
  btnChecklist.title = checkboxModeOn
    ? 'Checkbox mode: ON — Enter spawns a checkbox'
    : 'Checkbox mode: OFF — Enter inserts a normal line';

  // NEW: if turning ON, spawn the first checkbox right away
  if (checkboxModeOn) {
    // ensure caret is in the preview editor; if not, move it to the end
    if (document.activeElement !== previewText) {
      setContentEditableCaretIndex(previewText, previewText.innerText.length);
    }
    insertCheckboxAtCaret();
  }
});
// === Image insertion into the preview textarea ===
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function insertImageAtCaretFromFile(file) {
  // guard: accept only jpg/png
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) return;

  // get data URL
  const dataUrl = await readAsDataURL(file);

  // ensure caret exists
  previewText.focus();
  const sel = window.getSelection();
  let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) {
    setContentEditableCaretIndex(previewText, previewText.innerText.length);
    range = window.getSelection().getRangeAt(0);
  }

  // build an <img> inside a block for clean layout
// build an <img> inside a centered block for clean layout
const img = document.createElement('img');
img.src = dataUrl;
img.alt = file.name || 'image';
img.style.maxWidth = '100%';
img.style.height = 'auto';
img.style.display = 'block';
img.style.margin = '0 auto';          // ← center the image itself

const block = document.createElement('div');
block.className = 'img-block';
block.style.margin = '12px 0';    // let CSS center the image; no flex here


block.appendChild(img);


  // insert at caret
  range.deleteContents();
  range.insertNode(block);

  // place caret after the image block
  const after = document.createRange();
  after.setStartAfter(block);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);

  // trigger save so Firestore/local gets the updated HTML
  previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
}
function insertImageAtCaretFromDataURL(dataUrl, altText = 'drawing') {
  // ensure caret exists
  previewText.focus();
  const sel = window.getSelection();
  let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) {
    setContentEditableCaretIndex(previewText, previewText.innerText.length);
    range = window.getSelection().getRangeAt(0);
  }

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = altText;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.margin = '0 auto';

  const block = document.createElement('div');
  block.className = 'img-block';
  block.style.margin = '12px 0';
  block.appendChild(img);

  range.deleteContents();
  range.insertNode(block);

  const after = document.createRange();
  after.setStartAfter(block);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);

  previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
}
// === Drawing overlay ===
let drawModeOn = false;
let _editorRO = null; // ResizeObserver for previewText (set per-open, cleared on close)

let drawColor = '#ffffff';
let drawWidth = 3;
let drawHasStrokes = false;
// NEW: track bounds of the strokes so we can crop
let bboxMinX, bboxMinY, bboxMaxX, bboxMaxY;
let drawHasBase = false;   // ← whether we drew the existing overlay into the canvas

function bboxReset() {
  bboxMinX = Infinity; bboxMinY = Infinity;
  bboxMaxX = -Infinity; bboxMaxY = -Infinity;
}
function bboxExpand(x, y, r = drawWidth / 2 + 2) {
  // expand by brush radius + tiny padding
  bboxMinX = Math.min(bboxMinX, x - r);
  bboxMinY = Math.min(bboxMinY, y - r);
  bboxMaxX = Math.max(bboxMaxX, x + r);
  bboxMaxY = Math.max(bboxMaxY, y + r);
}
const drawCanvas = document.createElement('canvas');
drawCanvas.id = 'noteDrawCanvas';
drawCanvas.style.cssText = `
  position: absolute; left: 0; top: 0; pointer-events: none;  /* enabled only in draw mode */
  z-index: 1000;                                              /* sit above everything in the editor */
  touch-action: none;                                         /* prevent touch scrolling while drawing */
`;


let drawCtx = null;

// Put canvas inside the editor wrapper so it scrolls with the editor
// Prepare the TEXTAREA as a positioning context; we’ll attach the canvas only in draw mode
previewText.style.position = 'relative';



// Build color swatches in the palette
function makeDrawSwatch(c) {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = c;
  b.style.cssText = `
    width:22px; height:22px; border-radius:6px; border:1px solid #333;
    background:${c}; cursor:pointer;
  `;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    drawColor = c;
    if (drawCtx) drawCtx.strokeStyle = drawColor;

    // keep drawing armed & cursor consistent after clicking the swatch
    drawCanvas.style.pointerEvents = 'auto';
    drawCanvas.style.cursor = 'crosshair';
    previewText.style.cursor = 'crosshair';
  });
  return b;
}

DRAW_COLORS.forEach(c => drawPalette.appendChild(makeDrawSwatch(c)));

// Utility: size the canvas to the editor (DPR-aware)
function syncDrawCanvasSize() {
  const cssW = previewText.clientWidth;
  const cssH = Math.max(previewText.scrollHeight, previewText.clientHeight);
  const dpr  = window.devicePixelRatio || 1;
  console.log(`%c[Review] syncDrawCanvasSize: Sizing live canvas from live content.`, 'color: #22c55e', { cssW, cssH, dpr });

  drawCanvas.style.left = '0px';
  drawCanvas.style.top  = '0px';
  drawCanvas.style.width  = cssW + 'px';
  drawCanvas.style.height = cssH + 'px';

  drawCanvas.width  = Math.max(1, Math.floor(cssW * dpr));
  drawCanvas.height = Math.max(1, Math.floor(cssH * dpr));

  drawCtx = drawCanvas.getContext('2d');
  drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCtx.lineJoin = 'round';
  drawCtx.lineCap = 'round';
  drawCtx.strokeStyle = drawColor;
  drawCtx.lineWidth = drawWidth;
}





// Toggle draw mode + show/hide palette
// Toggle draw mode + show/hide palette
btnDraw.addEventListener('click', async () => {
  const cur = currentPreviewNote;
  if (!cur) {
    console.warn('[DRAW] no currentPreviewNote; open a note first');
    return;
  }
  // Block drawing entirely while in Review Mode
  if (previewModal.classList.contains('review-mode')) {
    // tiny feedback so users know it's disabled
    btnDraw.style.transform = 'scale(0.96)';
    setTimeout(() => { btnDraw.style.transform = ''; }, 160);
    return;
  }

    drawModeOn = !drawModeOn;
  btnDraw.classList.toggle('active', drawModeOn);

  // Update the status label
  annotationStatus.textContent = drawModeOn ? 'Annotations Visible' : 'Annotations Hidden';


  if (drawModeOn) {
    // position palette to the RIGHT of the draw button
    const btnRect = btnDraw.getBoundingClientRect();
    const bodyRect = previewBody.getBoundingClientRect();
    drawPalette.style.left = `${Math.min(bodyRect.width - 12, btnRect.right - bodyRect.left + 12)}px`;
    drawPalette.style.top  = `${Math.max(6, btnRect.top - bodyRect.top - 6)}px`;
    drawPalette.style.display = 'flex';
    // slide in
    requestAnimationFrame(() => {
      drawPalette.style.opacity = '1';
      drawPalette.style.transform = 'translateX(0)';
    });

    // enable canvas
    // enable canvas
// enable canvas
syncDrawCanvasSize();
drawHasStrokes = false;
drawHasBase = false;
bboxReset();

// ensure canvas is the last child → highest within this stacking context
previewText.appendChild(drawCanvas);

// let canvas take the mouse; make it obvious we're drawing
drawCanvas.style.pointerEvents = 'auto';
drawCanvas.style.cursor = 'crosshair';
previewText.style.cursor = 'crosshair';

// stop the editor from stealing focus/selection while drawing
previewText.style.userSelect = 'none';
previewText.style.caretColor = 'transparent';

console.log('[DRAW][ON] size=', drawCanvas.width, drawCanvas.height, 'dpr=', window.devicePixelRatio);





    // If there is an existing overlay saved for this note, draw it onto the canvas
    // Try note.drawLayer first; if missing, fall back to the DOM overlay currently shown
const source = (cur.drawLayer && cur.drawLayer.src)
  ? {
      src:   cur.drawLayer.src,
      left:  cur.drawLayer.left  || 0,
      top:   cur.drawLayer.top   || 0,
      width: cur.drawLayer.width,
      height:cur.drawLayer.height
    }
  : (() => {
      const dom = document.getElementById('noteDrawOverlay');
      if (!dom) return null;
      const wrapR = previewEditorWrap.getBoundingClientRect();
      const r = dom.getBoundingClientRect();
      return {
        src:   dom.src,
        left:  parseFloat(dom.style.left)   || (r.left - wrapR.left),
        top:   parseFloat(dom.style.top)    || (r.top  - wrapR.top),
        width: parseFloat(dom.style.width)  || r.width,
        height:parseFloat(dom.style.height) || r.height
      };
    })();

if (source && source.src) {
  console.log('[DRAW][ON] loading base overlay', { ...source, srcLen: source.src.length });
  const base = new Image();
  base.onload = () => {
  // Stretch the saved layer to the full current canvas (full scrollHeight)
const dpr = window.devicePixelRatio || 1;
const W = drawCanvas.width  / dpr;
const H = drawCanvas.height / dpr;
drawCtx.drawImage(base, 0, 0, W, H);

// bbox = whole canvas so re-export keeps the full area
bboxExpand(0, 0, 0);
bboxExpand(W, H, 0);

    drawHasBase = true;
    console.log('[DRAW][ON] base painted, bbox=', { bboxMinX, bboxMinY, bboxMaxX, bboxMaxY });
  };
  base.onerror = (e) => console.warn('[DRAW][ON] base image failed to load', e);
  base.src = source.src;
} else {
  console.log('[DRAW][ON] no base overlay to load');
}


  } else {
    // hide palette (slide out)
    drawPalette.style.opacity = '0';
    drawPalette.style.transform = 'translateX(10px)';
    setTimeout(() => { drawPalette.style.display = 'none'; }, 180);

    // commit drawing ONLY if there are new strokes
    console.log('[DRAW][OFF] drawHasStrokes=', drawHasStrokes, 'drawHasBase=', drawHasBase);
    if (drawHasStrokes) {
      const exp = exportFullCanvasWEBP(); // { src,left,top,width,height }

      console.log('[DRAW][OFF] export result:', exp ? { ...exp, srcLen: exp.src.length } : null);

      if (exp && exp.src) {
        // replace old overlay with the new merged export
        document.getElementById('noteDrawOverlay')?.remove();

        const overlay = document.createElement('img');
overlay.id = 'noteDrawOverlay';
overlay.src = exp.src;
overlay.style.position = 'absolute';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '3';
overlay.style.left = exp.left + 'px';
overlay.style.top  = exp.top  + 'px';
overlay.style.width  = exp.width  + 'px';
overlay.style.height = exp.height + 'px';
previewText.appendChild(overlay);                // ← inside the scroller


        const idx = notes.findIndex(n => n.id === cur.id);
if (idx >= 0) notes[idx].drawLayer = exp;
// keep the currently-open preview note in sync too
currentPreviewNote.drawLayer = exp;

console.log('[DRAW][OFF] persisting drawLayer… note.id=', cur.id);
await persist(cur.id, { drawLayer: exp });
console.log('[DRAW][OFF] persist requested for note.id=', cur.id);

      } else {
        console.warn('[DRAW][OFF] export returned nothing; skip persist');
      }
    } else {
      console.log('[DRAW][OFF] no new strokes → keep existing overlay, skip export/persist');
    }
    drawHasStrokes = false;
    drawHasBase = false;

   // clear and disable canvas
const ctx = drawCtx;
if (ctx) ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
drawCanvas.style.pointerEvents = 'none';
drawCanvas.style.cursor = '';

// restore editor interaction
previewText.style.userSelect = '';
previewText.style.caretColor = '';
previewText.style.cursor = '';
// ensure the canvas is not in the DOM when draw mode is OFF
if (drawCanvas.parentNode) {
  drawCanvas.parentNode.removeChild(drawCanvas);
}


  }
});


// Keep canvas in sync with layout changes
window.addEventListener('resize', () => {
  if (drawModeOn) syncDrawCanvasSize();
  const w = previewText.clientWidth;
  const h = Math.max(previewText.scrollHeight, previewText.clientHeight);
  const ov = document.getElementById('noteDrawOverlay');
  if (ov) {
    ov.style.width  = w + 'px';
    ov.style.height = h + 'px';
    ov.style.left = '0px';
    ov.style.top  = '0px';
  }
});





// Drawing handlers (Pointer events)
let drawing = false;
let lastX = 0, lastY = 0;

function localPointFromEvent(e) {
  // Use the CANVAS box so coords match exactly (excludes scrollbar width)
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}





drawCanvas.addEventListener('pointerdown', (e) => {
    if (!drawModeOn || previewModal.classList.contains('review-mode')) return;

  // if something disabled pointer-events, re-enable now
  if (drawCanvas.style.pointerEvents !== 'auto') {
    drawCanvas.style.pointerEvents = 'auto';
    drawCanvas.style.cursor = 'crosshair';
    previewText.style.cursor = 'crosshair';
  }

  e.preventDefault();               // stop text selection / focus changes
  e.stopPropagation();
  console.log('[DRAW] pointerdown');
  drawCanvas.setPointerCapture?.(e.pointerId);
  drawing = true;
  const p = localPointFromEvent(e);
  lastX = p.x; lastY = p.y;
  drawCtx.strokeStyle = drawColor;
  drawCtx.lineWidth = drawWidth;
  bboxExpand(p.x, p.y);
});



drawCanvas.addEventListener('pointermove', (e) => {
    if (!drawModeOn || !drawing || previewModal.classList.contains('review-mode')) return;

  e.preventDefault();
  const p = localPointFromEvent(e);
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
  lastX = p.x; lastY = p.y;
  drawHasStrokes = true;
  bboxExpand(p.x, p.y);
});



function endStroke(e) {
  if (!drawModeOn || !drawing || previewModal.classList.contains('review-mode')) return;

  drawing = false;
  drawCanvas.releasePointerCapture?.(e.pointerId);
}
drawCanvas.addEventListener('pointerup', endStroke);
drawCanvas.addEventListener('pointercancel', endStroke);
// Export only the ink area, optionally downscale, and compress to JPEG to fit Firestore limits
function exportFullCanvasWEBP() {
  if (!drawCtx) return null;
  // Match the canvas size which uses scrollHeight
  const cssW = previewText.clientWidth;
  const cssH = Math.max(previewText.scrollHeight, previewText.clientHeight);
  const pxW  = drawCanvas.width;
  const pxH  = drawCanvas.height;

  const out = document.createElement('canvas');
  out.width = cssW; out.height = cssH;
  const octx = out.getContext('2d');
  octx.clearRect(0, 0, cssW, cssH);
  octx.drawImage(drawCanvas, 0, 0, pxW, pxH, 0, 0, cssW, cssH);

  let src = out.toDataURL('image/webp', 0.7); // a bit more compressed—full canvas can be big
  if (src.length > 1_200_000) {               // safety squeeze if needed
    const try2 = out.toDataURL('image/webp', 0.55);
    if (try2.length < src.length) src = try2;
  }
  return { src, left: 0, top: 0, width: cssW, height: cssH };
}








// ribbon button → open picker
btnImage.addEventListener('click', () => {
  imgPicker.click();
});

// picker change → insert each selected image sequentially
imgPicker.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    await insertImageAtCaretFromFile(f);
  }
  // CORRECTED: If in draw mode, resize the canvas to fit the new image
  if (drawModeOn) {
    syncDrawCanvasSize();
  }
  imgPicker.value = '';

  // ADD THIS LINE to update the button's visibility
  updateReviewButtonVisibility();
});



// Keep checkbox state in the saved HTML (toggle the "checked" attribute)
previewText.addEventListener('change', (e) => {
  if (e.target && e.target.matches('input[type="checkbox"]')) {
    if (e.target.checked) e.target.setAttribute('checked', '');
    else e.target.removeAttribute('checked');
    // Trigger save
    previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
});

// Pressing Enter inside a checkbox row inserts the next checkbox row
// When checkbox mode is ON, Enter inserts a new checkbox line at the caret.
// Shift+Enter still inserts a normal newline.
previewText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && checkboxModeOn) {
    e.preventDefault();
    insertCheckboxAtCaret();
  }
});




  // ----- Local fallback key -----
  const LS_KEY = 'flipcards.notes.fallback';

  // ----- State -----
  let db = null;
  let auth = null;
  let storage = null; // Firebase Storage reference
  let notes = [];    // local cache for render/search
  let query = '';
  let unsubscribe = null;
  let firebaseReady = false;
  // focus/scroll coordination after render()
let pendingFocusId = null;   // the id we want to focus after render/snapshot
let pendingScrollId = null;  // the id we want to scroll into view
let currentPreviewNote = null;   // ← which note is open in the small preview modal


  ensureFirebase().then(ok => attachRealtime(ok));


  // ======================================
  // Firebase loader (compat SDK, no bundler)
  // ======================================
  function injectScript(src) {
    return new Promise((resolve, reject) => {
      // don't inject twice
      if ([...document.scripts].some(s => s.src.includes(src))) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureFirebase() {
    if (firebaseReady) return true;
    try {
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'); // ADDED STORAGE SDK

      if (!window.firebase?.apps?.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      storage = window.firebase.storage(); // Initialize Storage
      firebaseReady = true;
      // Re-attach the listener once a user is known
auth.onAuthStateChanged((u) => {
  // only attach if not already attached and we now have an email
  if (u?.email && !unsubscribe) {
    attachRealtime(true);
  }
});

      return true;
    } catch (e) {
      console.error('Firebase load/init failed:', e);
      return false;
    }
  }

  // Get user email: Auth > localStorage > global override
  function getEmail() {
    const aUser = auth?.currentUser;
    if (aUser?.email) return aUser.email;
    const ls = localStorage.getItem('userEmail');
    if (ls) return ls;
    return window.FC_USER_EMAIL || null;
  }

  // =====================
  // Modal open/close
  // =====================
openBtn?.addEventListener('click', async () => {
  // 1) Slide miniProfile out, then hide it
  const mp = document.getElementById('miniProfile');
  if (mp) {
    mp.classList.remove('mp-slide-in');
    mp.classList.add('mp-slide-out');
    mp.addEventListener('animationend', function onEnd() {
      mp.style.display = 'none';          // fully disappear after slide
      mp.removeEventListener('animationend', onEnd);
    }, { once: true });
  }

  // 2) Proceed as before
  await ensureFirebase();
  openModal();
});




  closeBtn?.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // Close the preview first if it's open
  if (previewBackdrop.style.display === 'grid') {
    closePreview();
    return;
  }
  // Otherwise close the base Notepad modal
  if (!backdrop.classList.contains('hidden')) {
    closeModal();
  }
});


function openModal() {
  console.log("--- openModal() called ---");
  console.log("Body overflow BEFORE change:", document.body.style.overflow);
  
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden', 'false'); // <-- ADD THIS LINE
    document.documentElement.style.overflow = 'hidden'; // Lock the <html> tag
  document.body.style.overflow = 'hidden';         // Lock the <body> tag
  
  console.log("Body overflow AFTER change:", document.body.style.overflow);
  setTimeout(() => searchInput?.focus(), 60);
}
function closeModal() {
  // Add the class that triggers the CSS animation
  backdrop.classList.add('is-closing');

  // Listen for the animation to complete, then hide the element
  backdrop.addEventListener('animationend', () => {
    backdrop.classList.add('hidden');
    backdrop.classList.remove('is-closing'); // Reset for next time
  }, { once: true }); // The listener removes itself after running once

  // --- The rest of the cleanup can run immediately ---
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = ''; // Restore <html> scroll
  document.body.style.overflow = '';         // Restore <body> scroll

  // Restore miniProfile (slide back in)
  const mp = document.getElementById('miniProfile');
  if (mp) {
    mp.style.display = '';                // unhide
    mp.classList.remove('mp-slide-out');  // clear previous state
    mp.classList.add('mp-slide-in');      // play slide-in
  }
}

// === Preview modal logic ===
let previewSaveTitle = null;
let previewSaveText  = null;
function updateReviewButtonVisibility() {
  // Read the live content directly from the editor
  const content = previewText.innerHTML || '';

  const isPdfNote = content.includes('alt="PDF Page');
  const hasImages = content.includes('<img');

  // Hide the button if the note is from a PDF OR if it has no images
  if (isPdfNote || !hasImages) {
    reviewBtn.style.display = 'none';
  } else {
    reviewBtn.style.display = ''; // Use '' to revert to its default style
  }
}
function openPreview(note) {
  // Fill fields
  previewTitleHeading.textContent = 'Title: ' + (note.title?.trim() || '(Untitled)');
  previewTitleInput.value = note.title || '';
  previewText.innerHTML   = note.text  || '';
  currentPreviewNote = note;
// Check if the note is from a PDF and hide the Review Mode button
  // Define note content for checks
updateReviewButtonVisibility();
  console.log('[DRAW][state] currentPreviewNote =', currentPreviewNote?.id);
  annotationStatus.textContent = drawModeOn ? 'Annotations Visible' : 'Annotations Hidden';

  if (!drawModeOn && drawCanvas.parentNode) {
    drawCanvas.parentNode.removeChild(drawCanvas);
  }

  // --- Start of The Fix ---

  // First, remove any old overlay
  const existing = document.getElementById('noteDrawOverlay');
  if (existing) existing.remove();

  // If the note has a saved drawing, create the overlay image element
  if (note.drawLayer && note.drawLayer.src) {
    console.log('[DRAW][rehydrate] found drawLayer for note.id=', note.id);
    const overlay = document.createElement('img');
    overlay.id = 'noteDrawOverlay';
    overlay.src = note.drawLayer.src;
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '3';
    overlay.style.left = '0px';
    overlay.style.top  = '0px';
    
    // Append it, but don't set the size yet
    previewText.appendChild(overlay);
    overlay.style.display = drawModeOn ? 'block' : 'none';

    // CRITICAL FIX: Wait for the next browser frame to ensure all content (PDF images)
    // has been laid out, THEN call the function that correctly sizes the overlay.
    requestAnimationFrame(() => {
      resizeOverlaysForReview();
    });

  } else {
    console.log('[DRAW][rehydrate] no drawLayer for note.id=', note.id);
  }
  
  // --- End of The Fix ---

  // Debounced savers
  previewSaveTitle = debounce(async (val) => { await persist(note.id, { title: val }); }, 200);
  previewSaveText  = debounce(async (val) => { await persist(note.id, { text:  val }); }, 200);

  // Live updates
  previewTitleInput.oninput = () => {
    const val = previewTitleInput.value;
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) notes[idx].title = val;
    previewTitleHeading.textContent = 'Title: ' + (val.trim() || '(Untitled)');
    previewSaveTitle(val);
  };
  previewText.oninput = () => {
    const val = previewText.innerHTML;
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) notes[idx].text = val;
    previewSaveText(val);
  };

  checkboxModeOn = false;
  btnChecklist.classList.remove('active');
  btnChecklist.textContent = '☑︎';
  btnChecklist.title = 'Checkbox mode: OFF — Enter inserts a normal line';

  // Open
  previewBackdrop.style.display = 'grid';
  document.body.style.overflow = 'hidden';
  
  if (typeof ResizeObserver !== 'undefined') {
    try { _editorRO && _editorRO.disconnect(); } catch {}
    _editorRO = new ResizeObserver(() => {
      applyReviewScale();
      resizeOverlaysForReview();
      if (drawModeOn && typeof syncDrawCanvasSize === 'function') {
        syncDrawCanvasSize();
      }
    });
    if (previewText && previewText.isConnected) {
      _editorRO.observe(previewText);
    }
  }

  setTimeout(() => previewTitleInput?.focus(), 30);
}

function closePreview() {
  // 1) If drawing is ON, cancel safely *without exporting*
  if (drawModeOn) {
    // prevent an export in the OFF branch
    drawHasStrokes = false;
    drawModeOn = false;
    btnDraw.classList.remove('active');
  }

  // 2) Hide palette
  drawPalette.style.display = 'none';
  drawPalette.style.opacity = '0';
  drawPalette.style.transform = 'translateX(10px)';

  // 3) Remove any overlay image from the editor
  const ov = previewText.querySelector('#noteDrawOverlay');
  if (ov) ov.remove();

  // 4) Clear & detach the canvas so nothing stays visible
  if (drawCtx) {
    try { drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); } catch {}
  }
  drawCanvas.style.pointerEvents = 'none';
  drawCanvas.style.cursor = '';
  if (drawCanvas.parentNode) drawCanvas.parentNode.removeChild(drawCanvas);

  // 5) Restore editor interaction
  previewText.style.userSelect = '';
  previewText.style.caretColor = '';
  previewText.style.cursor = '';

  // 6) Unbind inputs and hide the preview backdrop
  previewTitleInput.oninput = null;
  previewText.oninput = null;
  currentPreviewNote = null;
 // Always show hidden state when the preview closes
  annotationStatus.textContent = 'Annotations Hidden';
  previewBackdrop.style.display = 'none';
  document.body.style.overflow = '';
  // ▼ RESET Review Mode on close so next open is clean
previewModal.classList.remove('review-mode');
previewBackdrop.classList.remove('review-mode');
previewText.classList.remove('review-mode');
const _rmBtn = document.getElementById('reviewModeBtn');
if (_rmBtn) {
  _rmBtn.classList.remove('active');
  _rmBtn.textContent = 'Review Mode';
}
// restore modal/editor sizes just in case
if (previewModal.dataset.origW) previewModal.style.width  = previewModal.dataset.origW || '';
if (previewModal.dataset.origH) previewModal.style.height = previewModal.dataset.origH || '';
previewText.style.fontSize = '';
previewText.style.lineHeight = '';
// stop observing editor size changes
try { _editorRO && _editorRO.disconnect(); } catch {}
_editorRO = null;
// reset review scaling baseline so next open recomputes cleanly
previewEditorWrap.dataset.baseW = '';
previewEditorWrap.dataset.baseH = '';
previewEditorWrap.style.transform = '';
previewEditorWrap.style.width = '';
// reset review scaling baseline so next open recomputes cleanly
previewEditorWrap.style.transform = '';
previewEditorWrap.style.width = '';
delete previewEditorWrap.dataset.baseW;
delete previewEditorWrap.dataset.baseH;
previewText.scrollLeft = 0;
previewEditorWrap.scrollLeft = 0;

  console.log('[DRAW][state] cleared currentPreviewNote and removed canvas/overlay');
}



// Close interactions
previewCloseBtn?.addEventListener('click', () => {
  // If in review mode, clicking "X" should exit review mode first.
  if (previewModal.classList.contains('review-mode')) {
    reviewBtn.click(); // Programmatically click the review button to exit the mode.
    closePreview();
  } else {
    // Otherwise, close the preview modal as normal.
    closePreview();
  }
});


  // =====================
  // Realtime attach
  // =====================
  function attachRealtime(firebaseOK) {
    const email = getEmail();

    // already listening
    if (unsubscribe) return;

    if (firebaseOK && db && email) {
      const colRef = db.collection('notepad').doc(email).collection('notes');
unsubscribe = colRef.orderBy('index', 'desc').onSnapshot(
  (qs) => {
notes = qs.docs.map(d => ({
  id: d.id,
  index: d.data().index,
  prevIndex: d.data().prevIndex ?? null,
  title: d.data().title || '',
  text: d.data().text || '',
  checklist: Array.isArray(d.data().checklist) ? d.data().checklist : [],
  pinned: !!d.data().pinned,
  color: d.data().color || null,
  drawLayer: d.data().drawLayer || null  // ← NEW
}));



    console.log('[SNAPSHOT] size:', qs.size, 'pendingFocusId:', pendingFocusId, 'pendingScrollId:', pendingScrollId);
    render();

    if (pendingFocusId) {
      const id = pendingFocusId;
      // clear flags first so we don’t loop
      pendingFocusId = null;
      const doScroll = !!pendingScrollId && pendingScrollId === id;
      pendingScrollId = null;

      // wait one frame so layout is final
      requestAnimationFrame(() => {
        console.log('[SNAPSHOT] focusing after render →', id, 'doScroll:', doScroll);
        focusNote(id, 'title', doScroll);
      });
    }
  },
  (err) => {
    console.error('Firestore realtime error:', err);
    notes = loadLocal();
    render();
  }
);

    }
  }

  // =====================
  // Create a new note
  // =====================
  addBtn?.addEventListener('click', async () => {
    const email = getEmail();
      // If search is active, clear it so the new (empty) note is visible
  if (query) {
    query = '';
    if (searchInput) searchInput.value = '';
  }

    if (db && email) {
        console.log('[ADD] click; email:', email, 'db?', !!db);

      try {
        const colRef = db.collection('notepad').doc(email).collection('notes');
        // Compute next number (index)
        const snap = await colRef.orderBy('index', 'desc').limit(1).get();
        const nextIndex = snap.empty ? 1 : Number(snap.docs[0].data().index) + 1;
 const docId = String(nextIndex);
console.log('[ADD] click; email:', email, 'db?', !!db);

// tell the snapshot what to focus/scroll after it re-renders
pendingFocusId = docId;
pendingScrollId = docId;

await colRef.doc(docId).set({
  index: nextIndex,
  prevIndex: null,
  title: '',
  text: '',
  checklist: [],
  pinned: false,
  color: null          // ← NEW
});


// Optimistic update (guarded)
if (!notes.some(n => String(n.id) === String(docId))) {
  notes.push({ id: docId, index: nextIndex, prevIndex: null, title: '', text: '', checklist: [], pinned: false, color: null });

  console.log('[ADD] optimistic push → render() + focus', docId);
  render();
  // keep immediate UX snappy; snapshot will re-focus too, that’s fine
  focusNote(docId, 'title', true);
}



// Optional: remove the delayed second focus to avoid double calls
// setTimeout(() => focusNote(docId), 150);

      } catch (e) {
        console.error('Add note failed, using local fallback:', e);
        addLocal();
      }
    } else {
      addLocal();
    }
  });

function addLocal() {
  const nextIndex = (notes.reduce((m, n) => Math.max(m, n.index || 0), 0) || 0) + 1;

  // If search is active, clear it so the new note is visible
  if (query) {
    query = '';
    if (searchInput) searchInput.value = '';
  }

  const id = String(nextIndex);
  notes.push({ id, index: nextIndex, title: '', text: '', checklist: [], pinned: false, color: null });


  // set flags so our post-render focus path is consistent with cloud path
  pendingFocusId = id;
  pendingScrollId = id;

  saveLocal();
  render();
  console.log('[ADD:local] pushed + render() → focus', id);
  focusNote(id, 'title', true);
}




  // =====================
  // Search
  // =====================
  let searchTimer;
  searchInput?.addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });
// Sort helper: pinned first; within pinned = newest first; within unpinned = oldest first
function sortNotes(a, b) {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;   // pinned first
  if (a.pinned && b.pinned) return (b.index || 0) - (a.index || 0); // pinned: newer→older
  return (a.index || 0) - (b.index || 0);                    // unpinned: older→newer
}
const filtered = query
  ? notes.filter(/* …as-is… */)
  : notes;
filtered.sort(sortNotes);

console.log('[RENDER] query =', query, 'notes.length =', notes.length, 'filtered.length =', filtered.length);

  // =====================
  // Render
  // =====================
function render() {
  // 1) Remember where focus is (title vs text) and caret
  const active = document.activeElement;
  const activeCard = active?.closest?.('.note-card');

  let keep = null;
  if (activeCard) {
    const isTitle = active.classList?.contains('note-card-title');
    let caret = null;

    if (isTitle && typeof active.selectionStart === 'number') {
      caret = active.selectionStart;                  // input[type=text]
    } else if (active.classList?.contains('note-text')) {
      caret = getContentEditableCaretIndex(active);   // contentEditable
    }

    keep = { id: activeCard.dataset.id, isTitle, caret };
  }

  // 2) Rebuild list (your existing code unchanged) …
  list.innerHTML = '';
  const filtered = query
    ? notes.filter(n =>
        (n.title || '').toLowerCase().includes(query) ||
        (n.text  || '').toLowerCase().includes(query))
    : notes;
filtered.sort(sortNotes);

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'note-empty';
    const email = getEmail();
    empty.textContent = query
      ? 'No matching notes.'
      : (db && email ? 'Click + to create your first note.' : 'Sign in or set an email to save notes online.');
    list.appendChild(empty);
    return;
  }

  filtered.forEach(n => list.appendChild(renderCard(n)));

  // 3) Restore focus + caret
  if (keep) {
    const selector = keep.isTitle ? '.note-card-title' : '.note-text';
    const el = list.querySelector(`[data-id="${keep.id}"] ${selector}`);
    if (el) {
      el.focus();
      if (keep.isTitle && keep.caret != null && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(keep.caret, keep.caret); } catch {}
      } else if (!keep.isTitle && keep.caret != null) {
        setContentEditableCaretIndex(el, keep.caret);
      }
    }
  }
}



  function renderCard(note) {
    const wrap = document.createElement('div');
    wrap.className = 'note-card';
    wrap.dataset.id = note.id;
    wrap.style.position = 'relative';

    // Apply saved color (if any)
if (note.color) {
  wrap.style.background = note.color;
  wrap.style.backgroundColor = note.color;
}

    // If this note has a saved color, apply it
if (note.color) {
  wrap.style.background = note.color;
  wrap.style.backgroundColor = note.color;
}

// If pinned, mark the card and show a small badge
if (note.pinned) {
  wrap.classList.add('is-pinned');
  const badge = document.createElement('div');
  badge.className = 'note-pin-badge';
  badge.textContent = '📌';
  wrap.appendChild(badge);
}

    const head = document.createElement('div');
    head.className = 'note-card-header';

    const title = document.createElement('input');
    title.className = 'note-card-title';
    title.value = note.title || '';
    title.placeholder = 'Input Title';
    const saveTitle = debounce(async (val) => {
  await persist(note.id, { title: val });
}, 200);

title.addEventListener('input', () => {
  const val = title.value;
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].title = val;   // keep local cache in sync immediately
  saveTitle(val);                          // debounce server write
});

title.addEventListener('blur', async () => {
  const val = title.value;
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].title = val;
  await persist(note.id, { title: val });  // flush on blur to avoid losing changes
});


    const tools = document.createElement('div');
    tools.className = 'note-card-tools';

    const del = document.createElement('button');
    del.className = 'note-tool';
    del.title = 'Delete';
    del.textContent = '🗑';
    del.addEventListener('click', async () => {
      await remove(note.id);
    });

    tools.appendChild(del);
    head.appendChild(title);
    head.appendChild(tools);

    const text = document.createElement('div');
    text.className = 'note-text';
    text.contentEditable = 'true';
    text.spellcheck = false;
    text.innerHTML = note.text || '';

    const saveText = debounce(async (val) => {
  await persist(note.id, { text: val });
}, 200);

text.addEventListener('input', () => {
  const val = text.innerHTML;

  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].text = val;     // keep local cache up-to-date instantly
  saveText(val);                            // debounce server write
});

text.addEventListener('blur', async () => {
  const val = text.innerHTML;

  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].text = val;
  await persist(note.id, { text: val });    // flush on blur so snapshot won't wipe it
});
// Keep checkbox state when clicked inside the card editor
text.addEventListener('change', (e) => {
  if (e.target && e.target.matches('input[type="checkbox"]')) {
    // mirror the property into the HTML attribute so it persists
    if (e.target.checked) e.target.setAttribute('checked', '');
    else e.target.removeAttribute('checked');

    // re-use the existing input saver on this editor
    text.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
});

// ▶ Expand button → opens Preview Modal
const expandBtn = document.createElement('button');
expandBtn.className = 'note-expand';
expandBtn.type = 'button';
expandBtn.title = 'Expand';
expandBtn.textContent = '⤢';
// Minimal inline position in case CSS isn't present:
expandBtn.style.cssText = 'position:absolute; right:10px; bottom:10px; width:32px; height:32px; border-radius:10px; border:1px solid #000; background:#171717; color:#fff; cursor:pointer;';

expandBtn.addEventListener('click', () => {
  openPreview(note);
});


// ▶ Pin button → move card to top
const pinBtn = document.createElement('button');
pinBtn.className = 'note-pin';
pinBtn.type = 'button';
pinBtn.title = 'Pin to top';
pinBtn.textContent = '📌';
// reflect pinned state visually
pinBtn.classList.toggle('active', !!note.pinned);

// place it to the LEFT of the expand button
pinBtn.style.cssText = 'position:absolute; right:50px; bottom:10px; width:32px; height:32px; border-radius:10px; border:1px solid #000; background:#171717; color:#fff; cursor:pointer;';
pinBtn.title = note.pinned ? 'Unpin' : 'Pin to top';
// ▶ Color button → small palette popup
const colorBtn = document.createElement('button');
colorBtn.className = 'note-color';
colorBtn.type = 'button';
colorBtn.title = 'Color';
colorBtn.textContent = '🎨';
// match button look/position with the others (left of 📌)
colorBtn.style.cssText = 'position:absolute; right:90px; bottom:10px; width:32px; height:32px; border-radius:10px; border:1px solid #000; background:#171717; color:#fff; cursor:pointer;';

// Small popup palette (appears to the LEFT of the color button)
const colorPop = document.createElement('div');
colorPop.className = 'note-color-pop';
colorPop.style.cssText = `
  position:absolute; display:none; z-index:5;
  padding:8px; border-radius:10px; border:1px solid #000; background:#171717;
  box-shadow: 6px 6px 12px #0f0f0f, -6px -6px 12px #1f1f1f, inset 1px 1px 0 rgba(255,255,255,0.04), inset -1px -1px 0 rgba(0,0,0,0.55);
  gap:6px; flex-wrap:wrap; width:168px;
`;


// ---- Palette (CHANGE THESE COLORS ANYTIME) ----
const COLORS = [
  '#1f2937', // slate-800 (default-ish)
  '#0ea5e9', // sky-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#64748b', // slate-500
  '#ffffffff', // white
  '#f2ff00ff',
  '#ff0000ff',
  '#640D5F', // purple-900
  '#CFAB8D',
  '#3E0703',
  '#FFDCDC',
  '#111827'  // gray-900 (nearly black)
];
// ----------------------------------------------

// Build swatches
function makeSwatch(c) {
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.title = c || 'None';
  sw.style.cssText = `
    width:22px; height:22px; border-radius:6px; border:1px solid #333;
    background:${c || 'transparent'};
    cursor:pointer;
  `;
  sw.addEventListener('click', async (e) => {
    e.stopPropagation();
    await applyColor(c || null);
    colorPop.style.display = 'none';
  });
  return sw;
}

// “None” swatch (clear color)
const none = makeSwatch(null);
none.textContent = '×';
none.style.color = '#fff';
none.style.fontSize = '14px';
none.style.display = 'grid';
none.style.placeItems = 'center';

colorPop.appendChild(none);
COLORS.forEach(c => colorPop.appendChild(makeSwatch(c)));

async function applyColor(c) {
  // update UI immediately
  wrap.style.background = c || '';
  wrap.style.backgroundColor = c || '';

  // update cache + persist
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].color = c || null;

  await persist(note.id, { color: c || null });
}

// Toggle + position the popup (to the LEFT of the button)
colorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const showing = colorPop.style.display !== 'none';
  colorPop.style.display = showing ? 'none' : 'flex';

  if (!showing) {
    // position relative to the card so it sits left of the color button
    const btnRect = colorBtn.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const left = (btnRect.left - wrapRect.left) - (168 + 12); // pop width + gap
    const top  = (btnRect.top  - wrapRect.top);
    colorPop.style.left = `${Math.max(6, left)}px`;
    colorPop.style.top  = `${Math.max(6, top - 40)}px`;
  }
});


// Click outside → close palette for this card
document.addEventListener('click', (ev) => {
  if (!wrap.contains(ev.target)) colorPop.style.display = 'none';
});

pinBtn.addEventListener('click', async (e) => {
  e.stopPropagation();

  const i = notes.findIndex(n => n.id === note.id);
  if (i < 0) return;

  if (!notes[i].pinned) {
    // --- PIN ---
    const nextIndex = (notes.reduce((m, n) => Math.max(m, n.index || 0), 0) || 0) + 1;
    const prev = notes[i].index || 0;

    // optimistic local
    notes[i].prevIndex = prev;
    notes[i].index = nextIndex;
    notes[i].pinned = true;

    // move to front now
    const [item] = notes.splice(i, 1);
    notes.unshift(item);

    render();

    // persist
    await persist(note.id, { pinned: true, prevIndex: prev, index: nextIndex });
  } else {
    // --- UNPIN ---
    const prev = notes[i].prevIndex ?? notes[i].index ?? 0;

    // optimistic local
    notes[i].pinned = false;
    notes[i].index = prev;
    notes[i].prevIndex = null;

    // re-sort locally by index desc so it falls back into place
    notes.sort(sortNotes);


    render();

    // persist (delete prevIndex if Firestore is available; else set null)
    let patch = { pinned: false, index: prev, prevIndex: null };
    if (window.firebase?.firestore?.FieldValue?.delete) {
      patch.prevIndex = window.firebase.firestore.FieldValue.delete();
    }
    await persist(note.id, patch);
  }
});





    wrap.appendChild(head);
wrap.appendChild(text);
wrap.appendChild(colorBtn);
wrap.appendChild(colorPop);
wrap.appendChild(pinBtn);
wrap.appendChild(expandBtn);
return wrap;


  }

  // =====================
  // Firestore/local persistence
  // =====================
async function persist(id, patch) {
  const email = getEmail();
  if (db && email) {
    try {
      if (patch && patch.drawLayer && patch.drawLayer.src) {
        console.log('[PERSIST] note=', id, 'drawLayer:', {
          left: patch.drawLayer.left, top: patch.drawLayer.top,
          width: patch.drawLayer.width, height: patch.drawLayer.height,
          srcLen: patch.drawLayer.src.length
        });
      } else {
        console.log('[PERSIST] note=', id, 'keys=', Object.keys(patch || {}));
      }
      const docRef = db.collection('notepad').doc(email).collection('notes').doc(id);
      await docRef.set({ ...patch }, { merge: true });
      console.log('[PERSIST] success for note=', id);
    } catch (e) {
      console.error('Persist failed, local fallback:', e);
      // local fallback …

        // local fallback
        const idx = notes.findIndex(n => n.id === id);
        if (idx >= 0) {
          notes[idx] = { ...notes[idx], ...patch };
          saveLocal();
          render();
        }
      }
    } else {
      // local fallback
      const idx = notes.findIndex(n => n.id === id);
      if (idx >= 0) {
        notes[idx] = { ...notes[idx], ...patch };
        saveLocal();
        render();
      }
    }
  }

  async function remove(id) {
    const email = getEmail();
    if (db && email) {
      try {
  await db.collection('notepad').doc(email).collection('notes').doc(id).delete();
  // Optimistic UI update so the card disappears immediately
  notes = notes.filter(n => n.id !== id);
  render();
} catch (e) {
  console.error('Delete failed, local fallback:', e);
  notes = notes.filter(n => n.id !== id);
  saveLocal();
  render();
}

    } else {
      notes = notes.filter(n => n.id !== id);
      saveLocal();
      render();
    }
  }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  }
  function saveLocal() {
    localStorage.setItem(LS_KEY, JSON.stringify(notes));
  }
function _dbg(el) {
  if (!el) return null;
  return {
    tag: el.tagName,
    id: el.id || undefined,
    class: (el.className || '').toString().slice(0, 60) || undefined,
    scrollTop: el.scrollTop,
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight
  };
}
function focusNote(id, which = 'text', doScroll = true) {
  console.log('[focusNote] request', { id, which, doScroll });

  const card = list?.querySelector?.(`[data-id="${id}"]`);
  const selector = which === 'title' ? '.note-card-title' : '.note-text';
  const el = card ? card.querySelector(selector) : null;

  console.log('[focusNote] list?', !!list, 'card found?', !!card, 'el found?', !!el);

  if (!card) {
    // Inspect DOM a bit to see what we have
    console.log('[focusNote] list children count:', list?.children?.length);
    console.log('[focusNote] sample ids:', Array.from(list?.children || []).slice(0, 5).map(n => n?.dataset?.id));
  }

  if (doScroll && card) {
    const scroller = getScrollParent(card) || list || document.scrollingElement || document.body;
    console.log('[focusNote] scroller picked:', _dbg(scroller));
    requestAnimationFrame(() => {
      try {
        const scRect = scroller.getBoundingClientRect
          ? scroller.getBoundingClientRect()
          : { top: 0, height: window.innerHeight };
        const cardRect = card.getBoundingClientRect();
        const delta = (cardRect.top - scRect.top) - (scRect.height / 2 - cardRect.height / 2);

        console.log('[focusNote] pre-scroll', {
          scRectTop: scRect.top, scH: scRect.height,
          cardTop: cardRect.top, cardH: cardRect.height,
          delta, scrollerScrollTopBefore: scroller.scrollTop
        });

        scroller.scrollBy({ top: delta, behavior: 'smooth' });

        setTimeout(() => {
          console.log('[focusNote] post-scroll', { scrollerScrollTopAfter: scroller.scrollTop });
        }, 250);
      } catch (err) {
        console.warn('[focusNote] scrollBy failed; using scrollIntoView', err);
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  if (el) {
    el.focus();
    console.log('[focusNote] focused element:', selector);
  } else {
    console.log('[focusNote] nothing to focus for selector:', selector);
  }
}
function getScrollParent(el) {
  let node = el?.parentElement;
  let i = 0;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const canScroll = ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight)
                   || ((ox === 'auto' || ox === 'scroll' || ox === 'overlay') && node.scrollWidth > node.clientWidth);
    console.log('[getScrollParent] check#' + (i++), _dbg(node), { oy, ox, canScroll });
    if (canScroll) return node;
    node = node.parentElement;
  }
  console.log('[getScrollParent] none found');
  return null;
}




// --- Caret helpers for contentEditable .note-text ---
function getContentEditableCaretIndex(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  // caret range
  const range = sel.getRangeAt(0);
  // total range from start of element to caret
  const preRange = document.createRange();
  preRange.selectNodeContents(el);
  preRange.setStart(el, 0);
  try { preRange.setEnd(range.endContainer, range.endOffset); }
  catch { return null; }

  return preRange.toString().length;
}

function setContentEditableCaretIndex(el, idx) {
  // clamp
  const textLen = el.innerText.length;
  const pos = Math.max(0, Math.min(idx ?? 0, textLen));

  // walk text nodes to find the node/offset where this pos lands
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let node, remaining = pos;
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length;
    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= len;
  }

  // fallback: place at end
  el.focus();
}

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();