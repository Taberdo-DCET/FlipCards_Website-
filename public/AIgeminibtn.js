





console.log("✅ AIgeminibtn.js LOADED");

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM Ready");

  const geminiBtn = document.getElementById("geminiBtn");
  const geminiModal = document.getElementById("geminiModal");
  const closeModal = document.getElementById("closeGeminiModal");
  const dropZone = document.getElementById("geminiDropZone");
  const fileInput = document.getElementById("geminiFileInput");
  const flashcardsOutput = document.getElementById("geminiFlashcards");
function processTextToFlashcards(slideText) {
 const lines = slideText
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0); // remove blank lines
const structuredData = [];
const flashcards = [];

for (let i = 0; i < lines.length - 1; i += 2) {
  let term = lines[i];
  let definition = lines[i + 1];

  if (/^[a-z]{3,30}$/.test(term)) {
    console.log("🔧 Auto-capitalized possible term:", term);
    term = term.charAt(0).toUpperCase() + term.slice(1);
  }

  if (!term || !definition || definition.split(' ').length < 3) {
    console.log("❌ Rejected pair:", term, "|", definition);
    continue;
  }

  flashcards.push(`
  <div class="card">
    <strong>Term:</strong> ${term}<br>
    <strong>Definition:</strong> ${definition}
  </div>
`);

structuredData.push({ term, definition }); // ✅ Save cleanly as object

}

flashcardsOutput.innerHTML = flashcards.join('');


  // OPTIONAL: Save structured flashcards for navigation
  

    

  localStorage.setItem("flashcardsData", JSON.stringify(structuredData));

  const gotoAddcardBtn = document.getElementById("gotoAddcardBtn");
  if (gotoAddcardBtn) {
    gotoAddcardBtn.style.display = flashcards.length > 0 ? "block" : "none";
    gotoAddcardBtn.onclick = () => window.location.href = "addcard.html";
  }
}





  if (!geminiBtn) return console.warn("⚠️ geminiBtn not found!");

  // Show modal on click
  geminiBtn.addEventListener("click", () => {
    console.log("🎯 Gemini button clicked");
    geminiModal.classList.add("show");
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    geminiModal.classList.remove("show");
    localStorage.removeItem("flashcardsData"); // 🧹 Clear stored flashcards
  });

  // Open file selector on drop zone click
  dropZone.addEventListener("click", () => fileInput.click());

  // Handle file selection
  fileInput.addEventListener("change", handleFileUpload);

  // Handle drag/drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("hover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("hover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("hover");
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      handleFileUpload();
    }
  });

  async function handleFileUpload() {
  const file = fileInput.files[0];
if (!file || (!file.name.match(/\.(jpg|jpeg|png)$/i))) {
  return alert("Please upload a valid image file (.jpg, .jpeg, .png).");
}

if (file.name.match(/\.(jpg|jpeg|png)$/i)) {
  const reader = new FileReader();
  reader.onload = async function (e) {
    flashcardsOutput.innerHTML = `<p>Reading image and extracting text...Please Wait...</p>`;

    const imageDataUrl = e.target.result;

    // Use Tesseract.js to extract text
    const { createWorker } = Tesseract;
    const worker = await createWorker({
      logger: m => console.log(m),
    });

    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
const { data: { text } } = await worker.recognize(imageDataUrl);
await worker.terminate();

console.log("📷 OCR extracted text:", text);

// Fallback message if no usable text
if (!text || text.trim().length < 5) {
  flashcardsOutput.innerHTML = "<p>No text detected. Please try a clearer image or different format.</p>";
  return;
}

processTextToFlashcards(text);


  };

  reader.readAsDataURL(file);
  return;
}

}



});
window.openParsecardsModal = function () {
  document.getElementById('parsecardsModal').classList.remove('hidden');
  document.getElementById('parsecardsModal').classList.add('show');
};

document.querySelector('.close-modal').addEventListener('click', () => {
  const modal = document.getElementById('parsecardsModal');
  modal.classList.remove('show');
  modal.classList.add('hidden');
});

