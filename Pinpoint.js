// Import the initialized services from your existing files
import { auth, db } from "./firebaseinit.js";
import { storage } from "./firebaseStorageInit.js";

// Import the specific functions you need to use those services
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, updateDoc, getDoc, collectionGroup, query, where } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
    let currentUser = null;

    // --- DOM Element References ---
    const headerActions = document.getElementById('header-actions');
    const displayView = document.getElementById('displayView');
    const creationView = document.getElementById('creationView');
    const openCreationViewBtn = document.getElementById('openCreationViewBtn');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const pasteImageBtn = document.getElementById('pasteImageBtn'); 
    const imageUploadInput = document.getElementById('imageUploadInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const choiceInput = document.getElementById('choiceInput');
    const addChoiceBtn = document.getElementById('addChoiceBtn');
    const addedChoicesList = document.getElementById('addedChoicesList');
    const addCoverBtn = document.getElementById('addCoverBtn'); // Add this
    const publicToggle = document.getElementById('publicToggle'); 

    const openSideNavBtn = document.getElementById('openSideNavBtn');
    const closeSideNavBtn = document.getElementById('closeSideNavBtn');
    const setsSidenav = document.getElementById('setsSidenav');
    const sidenavSetList = document.getElementById('sidenav-set-list');
    // Pinpoint.js (After)
const setSearchInput = document.getElementById('setSearchInput');
const setFilterSelect = document.getElementById('setFilterSelect'); // ▼▼▼ ADD THIS LINE ▼▼▼
const setTitleInput = document.getElementById('setTitleInput');
    const setDescriptionInput = document.getElementById('setDescriptionInput');
    // --- DOM Element References for Display View ---
    const photoContainer = document.getElementById('photoContainer');
    const choicesContainer = document.getElementById('choicesContainer');
    const answerContainer = document.getElementById('answerContainer');
    const pageTitle = document.querySelector('#displayView .page-title');
    const pageDescription = document.querySelector('#displayView .page-description');
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
    const displayDescriptionContainer = document.getElementById('displayDescriptionContainer');
    let currentSet = null; // Stores the currently active quiz set
    let saveSetBtn = null;
    let cancelBtn = null;


    // --- App State ---
    let labels = []; // Will store objects like { id, text, x, y }
    let imageFile = null;
    let coverBoxes = [];
    let isEditMode = false;
    let editingSet = null; // Will store the set object being edited

    // --- Firebase Auth Observer ---
    onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        openCreationViewBtn.disabled = false;

        // --- ADDED LOGIC FOR UPGRADE BUTTON ---
        if (!user.isAnonymous) {
            const upgradeBtn = document.getElementById('upgradeBtn');
            const userRolesRef = doc(db, "approved_emails", user.email);
            const userRolesSnap = await getDoc(userRolesRef);

            if (userRolesSnap.exists()) {
                const roles = userRolesSnap.data().role.toLowerCase();
                if (!roles.includes('plus') && !roles.includes('verified')) {
                    upgradeBtn.style.display = 'inline-block';
                }
            }
        }
        // --- END OF ADDED LOGIC ---

    } else {
        currentUser = null;
        showCustomAlert('Login Required', 'Please log in to create a Pinpoint set.');
        openCreationViewBtn.disabled = true;
    }
});

    // --- Functions ---
    function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
   const addButtonsToHeader = () => {
        const saveButtonText = isEditMode ? 'Update Set' : 'Save Set';
        headerActions.innerHTML = `
            <button id="cancelBtn" class="header-btn cancel-btn"><i class="fa-solid fa-times"></i> Cancel</button>
            <button id="saveSetBtn" class="header-btn save-btn"><i class="fa-solid fa-save"></i> ${saveButtonText}</button>
        `;
        saveSetBtn = document.getElementById('saveSetBtn');
        cancelBtn = document.getElementById('cancelBtn');
        saveSetBtn.addEventListener('click', saveSetToFirebase);
        cancelBtn.addEventListener('click', showDisplayView);
    };

    const clearHeaderButtons = () => {
        headerActions.innerHTML = '';
    };

    const showCreationView = () => {
    resetDisplayView(); // Add this line
    displayView.classList.add('hidden');
    creationView.classList.remove('hidden');
    addButtonsToHeader();
};
    
    const showDisplayView = () => {
        creationView.classList.add('hidden');
        displayView.classList.remove('hidden');
        clearHeaderButtons();
        resetCreationForm();
    };

    const resetCreationForm = () => {
    labels = [];
    imageFile = null;
    isEditMode = false;
    editingSet = null;
    publicToggle.checked = false; // ▼▼▼ ADD THIS LINE ▼▼▼

    choiceInput.value = '';
    addedChoicesList.innerHTML = '';
    imagePreviewContainer.innerHTML = '';
    imageUploadInput.value = '';
    setTitleInput.value = '';
    setDescriptionInput.value = '';
    coverBoxes = []; // Clear the array
    renderCoverBoxes(); // Clear the DOM
    addCoverBtn.disabled = true;

    console.log("Form reset, cover button disabled and cover hidden.");

    imagePreviewContainer.querySelectorAll('.pinpoint-marker').forEach(pin => pin.remove());
};
        const resetDisplayView = () => {
        // Reset titles and descriptions
        pageTitle.textContent = 'Pinpoint';
        displayDescriptionContainer.style.display = 'none';
        pageDescription.style.display = 'block';

        // Clear all three main containers and show placeholders
        photoContainer.innerHTML = `
            <div class="placeholder-content">
                <i class="fa-solid fa-clone placeholder-icon"></i>
                <p class="placeholder-text">Your created Pinpoint sets will appear here.</p>
            </div>`;
        choicesContainer.innerHTML = `
            <div class="placeholder-content">
                <i class="fa-solid fa-tags placeholder-icon"></i>
                <p class="placeholder-text">Labels for the selected set will be shown here.</p>
            </div>`;
        answerContainer.innerHTML = `
            <div class="placeholder-content">
                <i class="fa-solid fa-pen-to-square placeholder-icon"></i>
                <p class="placeholder-text">Select a set to begin answering.</p>
            </div>`;
    };
    const makeDraggable = (pinElement) => {
        let offsetX, offsetY, isDragging = false;
        const container = imagePreviewContainer;
        const image = container.querySelector('img');

        if (!image) return; // Cannot drag if there is no image

        pinElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            pinElement.style.cursor = 'grabbing';
            const pinRect = pinElement.getBoundingClientRect();
            offsetX = e.clientX - pinRect.left;
            offsetY = e.clientY - pinRect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const imageRect = image.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate position relative to the container's top-left
            let x = e.clientX - containerRect.left - offsetX;
            let y = e.clientY - containerRect.top - offsetY;

            // Constrain within the container
            x = Math.max(0, Math.min(x, containerRect.width - pinElement.offsetWidth));
            y = Math.max(0, Math.min(y, containerRect.height - pinElement.offsetHeight));
            
            pinElement.style.left = `${x}px`;
            pinElement.style.top = `${y}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            pinElement.style.cursor = 'grab';

            const pinId = parseInt(pinElement.dataset.id);
            const labelToUpdate = labels.find(label => label.id === pinId);
            if (labelToUpdate) {
                const imageRect = image.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Calculate where the image is inside the container
                const imageOffsetX = (containerRect.width - imageRect.width) / 2;
                const imageOffsetY = (containerRect.height - imageRect.height) / 2;

                // Get pin's position relative to the container
                const pinLeftPixels = parseInt(pinElement.style.left);
                const pinTopPixels = parseInt(pinElement.style.top);

                // Calculate position relative to the IMAGE's top-left corner
                const relativeX = pinLeftPixels - imageOffsetX;
                const relativeY = pinTopPixels - imageOffsetY;

                // Save percentage based on the IMAGE's dimensions
                labelToUpdate.x = (relativeX / imageRect.width) * 100;
                labelToUpdate.y = (relativeY / imageRect.height) * 100;

                console.log(`Pin #${labelToUpdate.id} SAVED relative to IMAGE:`);
                console.log(`  - Image size: W=${imageRect.width.toFixed(2)}, H=${imageRect.height.toFixed(2)}`);
                console.log(`  - Saved Percentage: X=${labelToUpdate.x.toFixed(2)}%, Y=${labelToUpdate.y.toFixed(2)}%`);
                console.log('------------------------------------');
            }
        });
    };
    
    const displayImagePreview = (file) => {
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreviewContainer.innerHTML = `<img src="${e.target.result}" alt="Image Preview">`;
            addCoverBtn.disabled = false; // Add this line
            console.log("Image loaded, cover button enabled.");
        };
        reader.readAsDataURL(file);
    }
};
const makeBoxInteractive = (box) => {
    const handle = box.querySelector('.resize-handle');
    const container = imagePreviewContainer;
    const image = container.querySelector('img');

    // MOUSEUP event - This is the most important change
    const onMouseUp = () => {
        if (!image) return;
        const imageRect = image.getBoundingClientRect();
        
        // Find the corresponding box data in the array
        const boxData = coverBoxes.find(b => b.id === box.dataset.id);
        if (boxData) {
            // Calculate and SAVE the new position and size as percentages
            boxData.left = ((box.offsetLeft - image.offsetLeft) / imageRect.width) * 100;
            boxData.top = ((box.offsetTop - image.offsetTop) / imageRect.height) * 100;
            boxData.width = (box.offsetWidth / imageRect.width) * 100;
            boxData.height = (box.offsetHeight / imageRect.height) * 100;
            console.log(`Updated data for box ${boxData.id}`, boxData);
        }
        
        isDragging = false;
        isResizing = false;
        box.style.cursor = 'move';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    // MOUSEMOVE event
    const onMouseMove = (e) => {
        // ... (The entire mouse move logic remains the same)
         if (!isDragging && !isResizing) return;
         const containerRect = container.getBoundingClientRect();
         if (isDragging) {
             let x = e.clientX - containerRect.left - offsetX;
             let y = e.clientY - containerRect.top - offsetY;
             x = Math.max(0, Math.min(x, containerRect.width - box.offsetWidth));
             y = Math.max(0, Math.min(y, containerRect.height - box.offsetHeight));
             box.style.left = `${x}px`;
             box.style.top = `${y}px`;
         }
         if (isResizing) {
             const dx = e.clientX - lastMouseX;
             const dy = e.clientY - lastMouseY;
             let newWidth = box.offsetWidth + dx;
             let newHeight = box.offsetHeight + dy;
             if (box.offsetLeft + newWidth > containerRect.width) {
                 newWidth = containerRect.width - box.offsetLeft;
             }
             if (box.offsetTop + newHeight > containerRect.height) {
                 newHeight = containerRect.height - box.offsetTop;
             }
             box.style.width = `${Math.max(30, newWidth)}px`;
             box.style.height = `${Math.max(30, newHeight)}px`;
             lastMouseX = e.clientX;
             lastMouseY = e.clientY;
         }
    };

    let isDragging = false;
    let isResizing = false;
    let lastMouseX, lastMouseY, offsetX, offsetY;

    // DRAGGING logic
    box.addEventListener('mousedown', (e) => {
        if (e.target === handle || e.target.closest('.cover-box-delete-btn')) return;
        isDragging = true;
        const boxRect = box.getBoundingClientRect();
        offsetX = e.clientX - boxRect.left;
        offsetY = e.clientY - boxRect.top;
        box.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // RESIZING logic
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.stopPropagation();
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
};
    const renderCoverBoxes = () => {
    // Clear existing cover boxes from the DOM
    imagePreviewContainer.querySelectorAll('.cover-box').forEach(box => box.remove());

    const image = imagePreviewContainer.querySelector('img');
    if (!image) return; // Can't render boxes without an image

    const imageRect = image.getBoundingClientRect();

    coverBoxes.forEach(boxData => {
        const coverBox = document.createElement('div');
        coverBox.className = 'cover-box';
        coverBox.dataset.id = boxData.id;
        
        // Convert percentage to pixels for rendering
        coverBox.style.left = `${(boxData.left / 100) * imageRect.width + image.offsetLeft}px`;
        coverBox.style.top = `${(boxData.top / 100) * imageRect.height + image.offsetTop}px`;
        coverBox.style.width = `${(boxData.width / 100) * imageRect.width}px`;
        coverBox.style.height = `${(boxData.height / 100) * imageRect.height}px`;

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        
        // Create the delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'cover-box-delete-btn';
        deleteBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            // Remove the box data from the array
            coverBoxes = coverBoxes.filter(b => b.id !== boxData.id);
            // Re-render the remaining boxes
            renderCoverBoxes();
            console.log(`Cover box ${boxData.id} deleted.`);
        };
        
        coverBox.appendChild(resizeHandle);
        coverBox.appendChild(deleteBtn);
        imagePreviewContainer.appendChild(coverBox);

        makeBoxInteractive(coverBox); // Make it draggable and resizable
    });
};
   const renderLabelsAndPins = (newLabelId = null) => {
        // Clear current lists
        addedChoicesList.innerHTML = '';
        imagePreviewContainer.querySelectorAll('.pinpoint-marker').forEach(pin => pin.remove());

        // Re-draw from the state
        labels.forEach((label, index) => {
            // Create the label item in the right panel
            const choiceElement = document.createElement('div');
            choiceElement.className = 'choice-item';

            // If this is the newly added label, add the animation class
            if (label.id === newLabelId) {
                choiceElement.classList.add('slide-in');
            }

            choiceElement.innerHTML = `
                <span class="choice-number">${index + 1}</span>
                <span>${label.text}</span>
            `;
            const deleteBtn = document.createElement('i');
            deleteBtn.className = 'fa-solid fa-trash delete-choice-btn';
            deleteBtn.title = 'Delete Label';
            
            deleteBtn.addEventListener('click', () => {
                labels = labels.filter(l => l.id !== label.id);
                renderLabelsAndPins(); // Re-render everything without a newLabelId
            });

            choiceElement.appendChild(deleteBtn);
            addedChoicesList.appendChild(choiceElement);

            // Create the draggable pin on the image
            const pinElement = document.createElement('div');
            pinElement.className = 'pinpoint-marker';
            pinElement.textContent = index + 1;
            pinElement.dataset.id = label.id; // Link pin to label

            const image = imagePreviewContainer.querySelector('img');
            if (image) {
                const imageRect = image.getBoundingClientRect();
                const containerRect = imagePreviewContainer.getBoundingClientRect();
                const imageOffsetX = (containerRect.width - imageRect.width) / 2;
                const imageOffsetY = (containerRect.height - imageRect.height) / 2;
                const pinLeft = imageOffsetX + (label.x / 100) * imageRect.width;
                const pinTop = imageOffsetY + (label.y / 100) * imageRect.height;
                
                pinElement.style.left = `${pinLeft}px`;
                pinElement.style.top = `${pinTop}px`;
            }

            imagePreviewContainer.appendChild(pinElement);
            makeDraggable(pinElement);
        });
    }

    const addNewLabel = () => {
        const choiceText = choiceInput.value.trim();
        if (!choiceText) return;
        if (!imageFile) {
            showCustomAlert('Image Required', 'Please upload an image before adding labels.');
            return;
        }
        if (labels.find(l => l.text.toLowerCase() === choiceText.toLowerCase())) {
            showCustomAlert('Duplicate Label', 'This label has already been added.');
            return;
        }

        const newLabel = {
            id: Date.now(),
            text: choiceText,
            x: 10,
            y: 10
        };

        labels.push(newLabel);

        choiceInput.value = '';
        choiceInput.focus();
        
        // Render all UI elements and pass the new label's ID to trigger the animation
        renderLabelsAndPins(newLabel.id);
    };

    // Pinpoint.js (After)

const saveSetToFirebase = async () => {
    if (!currentUser || !saveSetBtn) { return; }

    const title = setTitleInput.value.trim();
    const description = setDescriptionInput.value.trim();

    if (!title || !imageFile || labels.length === 0) {
        showCustomAlert('Incomplete', 'Please ensure you have a title, an image, and at least one label.');
        return;
    }

    saveSetBtn.disabled = true;
    saveSetBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${isEditMode ? 'Updating...' : 'Saving...'}`;

    try {
        let imageUrl = isEditMode ? editingSet.imageUrl : '';

        // Only upload a new image if the user has selected a new one
        if (imageFile && imageFile.name !== 'existing') {
            const filePath = `pinpoint_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, imageFile);
            imageUrl = await getDownloadURL(fileRef);
        }

        // ▼▼▼ CHANGE #1: Read the state of the toggle switch ▼▼▼
        const isPublic = publicToggle.checked;

        const setData = {
            title: title,
            description: description,
            imageUrl: imageUrl,
            labels: labels,
            public: isPublic // ▼▼▼ CHANGE #2: Add the 'public' field to your data object ▼▼▼
        };

        // Save the entire array of cover boxes if they exist
        if (coverBoxes.length > 0) {
            setData.coverBoxes = coverBoxes;
            console.log("Saving Cover Boxes Data:", coverBoxes);
        }

        if (isEditMode) {
            // Update existing document
            const setRef = doc(db, 'pinpoint', currentUser.email, 'sets', editingSet.id);
            await updateDoc(setRef, setData);
            showCustomAlert('Success', 'Set updated successfully!', 'success');
        } else {
            // Create new document
            setData.createdAt = serverTimestamp();
            const setsCollectionRef = collection(db, 'pinpoint', currentUser.email, 'sets');
            await addDoc(setsCollectionRef, setData);
            showCustomAlert('Success', 'Set saved successfully!', 'success');
        }

        showDisplayView();

    } catch (error) {
        console.error("Error saving set: ", error);
        alert(`Failed to save set. Error: ${error.message}`);
    }
};
const openSidenav = () => {
        setsSidenav.style.width = "400px";
        loadPinpointSets(); // Load sets every time the sidenav is opened
    };

    const closeSidenav = () => {
        setsSidenav.style.width = "0";
    };

// Pinpoint.js (After)
const loadPinpointSets = async () => {
    if (!currentUser) {
        sidenavSetList.innerHTML = "<p>Please log in to see your sets.</p>";
        return;
    }

    const searchTerm = setSearchInput.value.toLowerCase().trim();
    const filterValue = setFilterSelect.value;
    sidenavSetList.innerHTML = "<p>Loading sets...</p>";

    let setsQuery;

    try {
        if (filterValue === 'my-sets') {
            setsQuery = collection(db, 'pinpoint', currentUser.email, 'sets');
        } else {
            const setsCollectionGroup = collectionGroup(db, 'sets');
            setsQuery = query(setsCollectionGroup, where('public', '==', true));
        }

        const querySnapshot = await getDocs(setsQuery);

        let setsToShow = [];
        for (const setDoc of querySnapshot.docs) {
            const ownerEmail = setDoc.ref.parent.parent.id;
            let ownerName = ownerEmail;
            let ownerBadges = ''; // ▼▼▼ CHANGE #1: Initialize an empty string for badges ▼▼▼

            // Fetch username and roles if it's a public set
            if (filterValue === 'public-sets') {
                // Get username
                const usernameDoc = await getDoc(doc(db, "usernames", ownerEmail));
                if (usernameDoc.exists() && usernameDoc.data().username) {
                    ownerName = usernameDoc.data().username;
                }

                // ▼▼▼ CHANGE #2: Get roles and build the badge HTML ▼▼▼
                const rolesDoc = await getDoc(doc(db, "approved_emails", ownerEmail));
                if (rolesDoc.exists()) {
                    const roleData = (rolesDoc.data().role || "").toLowerCase();
                    if (roleData.includes('verified')) {
                        ownerBadges += `<img src="verified.svg" class="owner-badge" alt="Verified">`;
                    }
                    if (roleData.includes('first')) {
                        ownerBadges += `<img src="first.png" class="owner-badge" alt="First User">`;
                    }
                    if (roleData.includes('plus')) {
                        ownerBadges += `<img src="plass.png" class="owner-badge" alt="Plus Member">`;
                    }
                }
            }
            // ▼▼▼ CHANGE #3: Add ownerBadges to the object being pushed ▼▼▼
            setsToShow.push({ id: setDoc.id, owner: ownerEmail, ownerName: ownerName, ownerBadges: ownerBadges, ...setDoc.data() });
        }

        const filteredSets = setsToShow.filter(set => 
    set.title.toLowerCase().includes(searchTerm) || 
    (set.ownerName && set.ownerName.toLowerCase().includes(searchTerm))
);

        if (filteredSets.length === 0) {
            const message = searchTerm ?
                `No sets found matching "${searchTerm}".` :
                (filterValue === 'my-sets' ? "You haven't created any sets yet." : "No public sets found.");
            sidenavSetList.innerHTML = `<p>${message}</p>`;
            return;
        }

        sidenavSetList.innerHTML = '';

        filteredSets.forEach((set, index) => {
            const setElement = document.createElement('div');
            setElement.className = 'sidenav-item';
            setElement.style.animationDelay = `${index * 0.07}s`;

            const itemContent = document.createElement('div');
            itemContent.className = 'sidenav-item-info';
            
            // ▼▼▼ CHANGE #4: Update the HTML to include the owner's name and their badges ▼▼▼
            const ownerHtml = filterValue === 'public-sets' 
                ? `<div class="sidenav-item-owner">by ${set.ownerName || 'Unknown'} ${set.ownerBadges || ''}</div>` 
                : '';

            itemContent.innerHTML = `
                <img src="${set.imageUrl}" alt="Set Thumbnail" class="sidenav-item-img">
                <div class="sidenav-item-text">
                    <p class="sidenav-item-title">${set.title || 'Untitled Set'}</p>
                    ${ownerHtml}
                </div>
            `;
            
            itemContent.onclick = () => {
                displaySetInPlayMode(set);
                closeSidenav();
            };

            const itemActions = document.createElement('div');
            itemActions.className = 'sidenav-item-actions';
            
            if (filterValue === 'my-sets' && currentUser.email === set.owner) {
                const editBtn = document.createElement('button');
                editBtn.className = 'sidenav-action-btn edit-btn';
                editBtn.title = 'Edit Set';
                editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    startEditMode(set, set.id);
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'sidenav-action-btn delete-btn';
                deleteBtn.title = 'Delete Set';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    showConfirmModal(`Are you sure you want to permanently delete the set "${set.title}"?`, async () => {
                        try {
                            const setRef = doc(db, 'pinpoint', set.owner, 'sets', set.id);
                            await deleteDoc(setRef);
                            loadPinpointSets();
                        } catch (error) {
                            console.error("Error deleting set: ", error);
                            showCustomAlert('Deletion Failed', 'Could not delete the set.');
                        }
                    });
                };

                itemActions.appendChild(editBtn);
                itemActions.appendChild(deleteBtn);
            }

            setElement.appendChild(itemContent);
            setElement.appendChild(itemActions);
            sidenavSetList.appendChild(setElement);
        });

    } catch (error) {
        console.error("Error loading pinpoint sets: ", error);
        sidenavSetList.innerHTML = "<p>Could not load sets. Check the developer console for an error message.</p>";
    }
};
    // Pinpoint.js (After)

const displaySetInPlayMode = (set) => {
    currentSet = set;
    // 1. Update Title and Description
    pageTitle.textContent = set.title;
    pageDescription.style.display = 'none'; // Hide the default description

    if (set.description) {
        displayDescriptionContainer.textContent = set.description;
    } else {
        displayDescriptionContainer.textContent = "No description provided.";
    }
    displayDescriptionContainer.style.display = 'block'; // Always show the container

    // 2. Display Image
    const img = new Image();
    img.src = set.imageUrl;
    photoContainer.innerHTML = ''; // Clear previous content
    photoContainer.appendChild(img);

    img.onload = () => {
        // SLIGHT DELAY TO ALLOW FINAL RENDERING
        setTimeout(() => repositionElements(set), 100); 
    };

    // 3. Display Choices/Labels in random order
    choicesContainer.innerHTML = '<h3>Choices</h3>';
    const choicesList = document.createElement('div');
    choicesList.className = 'play-choices-list';

    // Create a shuffled copy of the labels for display
    const shuffledLabels = shuffleArray([...set.labels]);

    shuffledLabels.forEach((label, index) => {
        const choiceItem = document.createElement('div');
        choiceItem.className = 'play-choice-item';

        // Create a wrapper for the clickable label part
        const labelWrapper = document.createElement('div');
        labelWrapper.className = 'play-choice-label-wrapper';

        const checkboxId = `choice-shuffled-${index}`;
        labelWrapper.innerHTML = `
            <input type="checkbox" id="${checkboxId}">
            <span class="custom-checkbox">
                <i class="fa-solid fa-check"></i>
            </span>
            <label for="${checkboxId}">${label.text}</label>
        `;

        // Create the copy icon
        const copyBtn = document.createElement('i');
        copyBtn.className = 'fa-solid fa-copy copy-icon';
        copyBtn.title = 'Copy Label';

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const textArea = document.createElement('textarea');
            textArea.value = label.text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            copyBtn.classList.remove('fa-copy');
            copyBtn.classList.add('fa-check');
            copyBtn.style.color = '#3a8a4d';
            
            setTimeout(() => {
                copyBtn.classList.remove('fa-check');
                copyBtn.classList.add('fa-copy');
                copyBtn.style.color = '';
            }, 1500);
        });

        labelWrapper.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = labelWrapper.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            }
        });

        choiceItem.appendChild(labelWrapper);
        choiceItem.appendChild(copyBtn);
        choicesList.appendChild(choiceItem);
    });
    choicesContainer.appendChild(choicesList);

    // 4. Create Answer Inputs and a new Submit Button
    answerContainer.innerHTML = '<h3>Your Answers</h3>'; 
    const answerWrapper = document.createElement('div');
    answerWrapper.className = 'answer-wrapper';
    set.labels.forEach((label, index) => {
        const answerItem = document.createElement('div');
        answerItem.className = 'answer-item';
        answerItem.innerHTML = `<span class="answer-number">${index + 1}</span><input type="text" class="answer-field" placeholder="Enter label ${index + 1}">`;
        answerWrapper.appendChild(answerItem);
    });
    answerContainer.appendChild(answerWrapper);
    
    const checkAnswersBtn = document.createElement('button');
    checkAnswersBtn.id = 'checkAnswersBtn';
    checkAnswersBtn.textContent = 'Check Answers';
    
    checkAnswersBtn.onclick = checkAnswers;
    answerContainer.appendChild(checkAnswersBtn);
};
    const showResultsModal = (score, total) => {
        const resultsModal = document.getElementById('resultsModal');
        const scoreText = document.getElementById('scoreText');
        const totalText = document.getElementById('totalText');
        const tryAgainBtn = document.getElementById('tryAgainBtn');

        scoreText.textContent = score;
        totalText.textContent = total;

        resultsModal.classList.add('visible');

        tryAgainBtn.onclick = () => {
            resultsModal.classList.remove('visible');
            // Reload the current set to try again
            if (currentSet) {
                displaySetInPlayMode(currentSet);
            }
        };
    };
    const showCustomAlert = (title, message, type = 'error') => {
        const alertModal = document.getElementById('alertModal');
        const alertBox = alertModal.querySelector('.alert-box');
        const alertTitleText = document.getElementById('alertTitleText');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const alertOkBtn = document.getElementById('alertOkBtn');

        // Reset classes
        alertBox.classList.remove('success', 'error');

        if (type === 'success') {
            alertBox.classList.add('success');
            alertIcon.className = 'fa-solid fa-circle-check';
        } else { // default to error
            alertBox.classList.add('error');
            alertIcon.className = 'fa-solid fa-circle-xmark';
        }

        alertTitleText.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.add('visible');

        alertOkBtn.onclick = () => {
            alertModal.classList.remove('visible');
        };
    };
    const showConfirmModal = (message, onConfirm) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');

        confirmMessage.textContent = message;
        confirmModal.classList.add('visible');

        const close = () => confirmModal.classList.remove('visible');

        confirmDeleteBtn.onclick = () => {
            close();
            onConfirm();
        };
        confirmCancelBtn.onclick = close;
    };
    const startEditMode = (set, setId) => {
    isEditMode = true;
    editingSet = { ...set, id: setId }; // Store the set data and its ID

    // Switch to the creation/edit view
    resetDisplayView();
    showCreationView();
    closeSidenav();

    // Populate the form fields
    setTitleInput.value = set.title;
    setDescriptionInput.value = set.description;
    publicToggle.checked = set.public || false; // ▼▼▼ ADD THIS LINE ▼▼▼
    
    // Display the existing image
    imagePreviewContainer.innerHTML = `<img src="${set.imageUrl}" alt="Image Preview">`;
    
    // IMPORTANT: Set the imageFile to a placeholder so the save function knows not to re-upload
    imageFile = { name: 'existing' };
    addCoverBtn.disabled = false;
    console.log("Edit mode started, cover button enabled.");

    labels = JSON.parse(JSON.stringify(set.labels));
    if (set.coverBoxes && Array.isArray(set.coverBoxes)) {
        coverBoxes = JSON.parse(JSON.stringify(set.coverBoxes));
        renderCoverBoxes();
    }
    renderLabelsAndPins();
};

    const checkAnswers = () => {
        if (!currentSet) return; // No set is loaded

        const answerInputs = document.querySelectorAll('.answer-field');
        
        // --- ADD THIS VALIDATION BLOCK ---
        let allFieldsFilled = true;
        answerInputs.forEach(input => {
            if (input.value.trim() === '') {
                allFieldsFilled = false;
            }
        });

        if (!allFieldsFilled) {
            showCustomAlert('Incomplete', 'Please fill in all the answer fields before checking your score.');
            return; // Stop the function here
        }
        // --- END OF VALIDATION BLOCK ---

        const correctAnswers = currentSet.labels.map(label => label.text.toLowerCase().trim());
        let score = 0;

        answerInputs.forEach((input, index) => {
            const userAnswer = input.value.toLowerCase().trim();
            if (userAnswer === correctAnswers[index]) {
                score++;
                input.style.borderColor = '#3a8a4d'; // Correct
            } else {
                input.style.borderColor = '#8a3a3a'; // Incorrect
            }
        });

        showResultsModal(score, correctAnswers.length);
    };
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    };
    const repositionElements = (set) => {
    if (!set) return;

    // Clear existing pins and covers before redrawing
    photoContainer.querySelectorAll('.display-pin, .display-cover-box').forEach(el => el.remove());

    const img = photoContainer.querySelector('img');
    if (!img) return;

    const containerRect = photoContainer.getBoundingClientRect();
    const imageRect = img.getBoundingClientRect();
    const imageOffsetX = (containerRect.width - imageRect.width) / 2;
    const imageOffsetY = (containerRect.height - imageRect.height) / 2;

    console.log("--- REPOSITIONING ELEMENTS ---");
    console.log(`Container Rect: W=${containerRect.width.toFixed(2)}, H=${containerRect.height.toFixed(2)}`);
    console.log(`Image Rect: W=${imageRect.width.toFixed(2)}, H=${imageRect.height.toFixed(2)}`);
    console.log(`Image Offset: X=${imageOffsetX.toFixed(2)}, Y=${imageOffsetY.toFixed(2)}`);

    // Reposition Cover Boxes
    if (set.coverBoxes && Array.isArray(set.coverBoxes)) {
        set.coverBoxes.forEach(boxData => {
            const coverBox = document.createElement('div');
            coverBox.className = 'display-cover-box';
            const leftPx = imageOffsetX + (boxData.left / 100) * imageRect.width;
            const topPx = imageOffsetY + (boxData.top / 100) * imageRect.height;
            const widthPx = (boxData.width / 100) * imageRect.width;
            const heightPx = (boxData.height / 100) * imageRect.height;

            coverBox.style.left = `${leftPx}px`;
            coverBox.style.top = `${topPx}px`;
            coverBox.style.width = `${widthPx}px`;
            coverBox.style.height = `${heightPx}px`;
            photoContainer.appendChild(coverBox);
            
            console.log(`Cover Box (ID: ${boxData.id}): Saved[${boxData.left.toFixed(2)}%, ${boxData.top.toFixed(2)}%] -> Calculated[${leftPx.toFixed(2)}px, ${topPx.toFixed(2)}px]`);
        });
    }

    // Reposition Pins
    set.labels.forEach((label, index) => {
        const pin = document.createElement('div');
        pin.className = 'display-pin';
        pin.textContent = index + 1;
        const leftPx = imageOffsetX + (label.x / 100) * imageRect.width;
        const topPx = imageOffsetY + (label.y / 100) * imageRect.height;

        pin.style.left = `${leftPx}px`;
        pin.style.top = `${topPx}px`;
        photoContainer.appendChild(pin);
        
        console.log(`Pin #${index + 1}: Saved[${label.x.toFixed(2)}%, ${label.y.toFixed(2)}%] -> Calculated[${leftPx.toFixed(2)}px, ${topPx.toFixed(2)}px]`);
    });
    console.log("--- REPOSITIONING COMPLETE ---");
};
    // --- Event Listeners ---
    openCreationViewBtn.addEventListener('click', showCreationView);

    uploadImageBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', (event) => {
        imageFile = event.target.files[0];
        displayImagePreview(imageFile);
    });

    addChoiceBtn.addEventListener('click', addNewLabel);
    choiceInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            addNewLabel();
        }
    });
    openSideNavBtn.addEventListener('click', openSidenav);
    closeSideNavBtn.addEventListener('click', closeSidenav);
    // --- Help Modal Logic ---
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('visible');
    });

    const closeHelpModal = () => {
        helpModal.classList.remove('visible');
    };

    closeHelpModalBtn.addEventListener('click', closeHelpModal);
// Replace the old addCoverBtn listener with this one
addCoverBtn.addEventListener('click', () => {
    console.log("Add Cover Box button clicked.");

    // Create a new data object for the box
    const newBoxData = {
        id: `cover-${Date.now()}`,
        left: 2, // Percentage
        top: 2,   // Percentage
        width: 25,// Percentage
        height: 20// Percentage
    };
    coverBoxes.push(newBoxData);

    // Render all boxes (including the new one)
    renderCoverBoxes();
    console.log("New cover box added and rendered.");
});
    // Also close modal if user clicks on the background overlay
    helpModal.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            closeHelpModal();
        }
    });
    setSearchInput.addEventListener('input', loadPinpointSets);
setFilterSelect.addEventListener('change', loadPinpointSets);
// --- Event Listeners ---
// ... (your other event listeners)

// ADD THIS NEW EVENT LISTENER AND FUNCTION
const handlePasteImage = async () => {
    try {
        // Check for Clipboard API permission
        const permission = await navigator.permissions.query({ name: 'clipboard-read' });
        if (permission.state === 'denied') {
            showCustomAlert('Permission Denied', 'Please allow clipboard access in your browser settings to use this feature.');
            return;
        }

        // Read items from the clipboard
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            // Find the first image item
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);

                // Convert the Blob to a File object
                const pastedFile = new File([blob], `pasted-image-${Date.now()}.png`, { type: imageType });

                // Use the existing logic to handle the file
                imageFile = pastedFile;
                displayImagePreview(pastedFile);
                return; // Stop after pasting the first image
            }
        }
        // If no image was found
        showCustomAlert('No Image Found', 'Could not find a valid image in your clipboard.');
    } catch (error) {
        console.error('Error pasting image:', error);
        showCustomAlert('Paste Error', 'Could not paste image. This feature may not be supported by your browser.');
    }
};

pasteImageBtn.addEventListener('click', handlePasteImage);
window.addEventListener('resize', debounce(() => {
    // Only run if a set is loaded and the display view is visible
    if (currentSet && !displayView.classList.contains('hidden')) {
        repositionElements(currentSet);
    }
}, 250)); // 250ms delay after resizing stops
});