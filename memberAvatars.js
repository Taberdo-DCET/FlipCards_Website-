// memberAvatars.js
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { app } from "./firebaseinit.js";

const storage = getStorage(app);

function loadMemberAvatars() {
  document.querySelectorAll(".email.user-email").forEach(emailEl => {
    const email = emailEl.getAttribute("title");
    const parentDiv = emailEl.closest(".left-info")?.querySelector("div");
    if (!parentDiv) return;

    let avatarImg = parentDiv.querySelector(".avatar-img");
    if (!avatarImg) {
      avatarImg = document.createElement("img");
      avatarImg.className = "avatar-img";
      avatarImg.src = "Group-10.png";
      avatarImg.style.width = "22px";
      avatarImg.style.height = "22px";
      avatarImg.style.borderRadius = "50%";
      avatarImg.style.objectFit = "cover";
      parentDiv.insertBefore(avatarImg, parentDiv.firstChild);
    }

    getDownloadURL(ref(storage, `avatars/${email}`))
      .then(url => avatarImg.src = url)
      .catch(() => avatarImg.src = "Group-10.png");
  });
}

// Re-run when DOM changes (after member.js builds list)
document.addEventListener("membersRendered", loadMemberAvatars);
