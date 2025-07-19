import { storage } from "./firebaseStorageInit.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

export function bindImageUpload(uploadInput, defInput, label) {
  if (!uploadInput || !defInput || !label) return;

  // Clear previous file so reselecting same file still triggers change
  label.addEventListener("click", () => {
    uploadInput.value = ""; // reset file
    uploadInput.click();
  });

  uploadInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `definitions/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    defInput.dataset.imageurl = url;
    defInput.value = `[Image: ${file.name}] ${url}`; // ✅ Updated this line

    label.textContent = "📷 Image uploaded";
    label.style.opacity = 0.7;
  });
}

