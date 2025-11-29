import { db, auth } from "./firebaseinit.js";
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, // Added
    arrayUnion, 
    collection,
    addDoc,
    getDocs, // Added
    deleteDoc, // Added
    query,     // Added
    where      // Added
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- REVEAL ANSWER LOGIC ---
    const revealBtn = document.getElementById('revealBtn');
    const revealModal = document.getElementById('revealAnswerModal');
    const closeRevealBtn = document.getElementById('closeRevealBtn');
    const revealContent = document.getElementById('revealContent');

    if (revealBtn) {
        revealBtn.addEventListener('click', () => {
            if (!activeSet || !activeSet.cards || activeSet.cards.length === 0) return;
            
            const card = activeSet.cards[activeCardIndex];
            
            // Inject the raw content (which contains the span tags)
            revealContent.innerHTML = card.content;
            
            // Show the modal
            revealModal.classList.remove('hidden');
        });
    }

    if (closeRevealBtn) {
        closeRevealBtn.addEventListener('click', () => {
            revealModal.classList.add('hidden');
        });
    }
    
    // Optional: Close on backdrop click
    if (revealModal) {
        revealModal.addEventListener('click', (e) => {
            if (e.target === revealModal) {
                revealModal.classList.add('hidden');
            }
        });
    }
    // --- View Switching ---
    const dashboardView = document.getElementById('fillInDashboard');
    const createSetView = document.getElementById('createSetView');
    const triggerAddSetBtn = document.getElementById('triggerAddSetBtn');
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    
    // NEW: Track editing state
    let editingSetId = null; 

    triggerAddSetBtn.addEventListener('click', () => {
        // RESET FORM FOR NEW SET
        editingSetId = null;
        document.getElementById('setTitle').value = '';
        document.getElementById('setDescription').value = '';
        document.getElementById('categorySelect').value = '';
        document.getElementById('publicToggle').checked = false;
        document.getElementById('cardsContainer').innerHTML = '';
        document.getElementById('saveSetBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Set';
        
        // Add one empty card to start
        createNewCard();

        dashboardView.classList.add('hidden');
        createSetView.classList.remove('hidden');
    });

    backToDashboardBtn.addEventListener('click', () => {
        createSetView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // --- Dropdown Logic ---
    const setDropdownBtn = document.getElementById('setDropdownBtn');
    const setDropdownContent = document.getElementById('setDropdownContent');
    const dropdownIcon = setDropdownBtn.querySelector('i');

    // ... (existing dropdown listeners) ...

    window.addEventListener('click', (e) => {
        if (!setDropdownBtn.contains(e.target)) {
            setDropdownContent.classList.remove('show');
            dropdownIcon.style.transform = 'rotate(0deg)';
        }
        
        // Close any open action menus AND reset z-index classes
        document.querySelectorAll('.action-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.set-item.menu-open').forEach(item => {
            item.classList.remove('menu-open');
        });
    });

   // --- SIDEBAR LIBRARY LOGIC ---
    const setListContainer = document.querySelector('.set-list-container');
    let activeSet = null;
    let activeCardIndex = 0;
    let currentLibraryMode = 'private'; // 'private' or 'public'
    
    // NEW: Cache for search functionality
    let allSetsCache = []; 

    // NEW: Search Input Listener
    const searchInput = document.getElementById('setSearchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        const filteredSets = allSetsCache.filter(set => {
            const title = (set.title || '').toLowerCase();
            const desc = (set.description || '').toLowerCase();
            const creator = (set.creatorEmail || '').toLowerCase();
            
            return title.includes(searchTerm) || 
                   desc.includes(searchTerm) || 
                   creator.includes(searchTerm);
        });

        renderSetList(filteredSets);
    });

    // Handle Dropdown Selection
    const dropdownLinks = setDropdownContent.querySelectorAll('a');
    const btnText = setDropdownBtn.querySelector('span');

    dropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            btnText.textContent = link.textContent;
            
            if (link.textContent.includes("My Sets")) {
                currentLibraryMode = 'private';
            } else {
                currentLibraryMode = 'public';
            }
            
            loadSidebarSets(); // Reload list based on selection
            
            setDropdownContent.classList.remove('show');
            dropdownIcon.style.transform = 'rotate(0deg)';
        });
    });

    async function loadSidebarSets() {
        const user = auth.currentUser;
        if (!user && currentLibraryMode === 'private') {
            setListContainer.innerHTML = '<p style="padding:20px; color:#666;">Please log in.</p>';
            return;
        }

        setListContainer.innerHTML = '<p style="padding:20px; color:#666;">Loading...</p>';

        try {
            let setsToDisplay = [];

            if (currentLibraryMode === 'private') {
                // Load from Filllocal -> User Email -> mySets Array
                const docRef = doc(db, "Filllocal", user.email);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setsToDisplay = docSnap.data().mySets || [];
                }
            } else {
                // Load from Fillpublic Collection
                const querySnapshot = await getDocs(collection(db, "Fillpublic"));
                querySnapshot.forEach((doc) => {
                    setsToDisplay.push(doc.data());
                });
            }

            // NEW: Store in cache and clear search input
            allSetsCache = setsToDisplay; 
            document.getElementById('setSearchInput').value = '';

            renderSetList(setsToDisplay);

        } catch (error) {
            console.error("Error loading sets:", error);
            setListContainer.innerHTML = '<p style="padding:20px; color:#red;">Error loading sets.</p>';
        }
    }

    function renderSetList(sets) {
        setListContainer.innerHTML = '';
        
        if (sets.length === 0) {
            setListContainer.innerHTML = '<p style="padding:20px; color:#666;">No sets found.</p>';
            return;
        }

        // Sort by newest first (optional, based on ID or createdAt if available)
        // sets.sort((a, b) => b.createdAt - a.createdAt);

        sets.forEach(set => {
            const setItem = document.createElement('div');
            setItem.className = 'set-item';
            
            // Determine Icon based on mode
            const iconClass = currentLibraryMode === 'private' ? 'fa-folder-closed' : 'fa-folder-closed';
            
            // Basic Info with Icon Box
            // Prepare Creator HTML only for Public Mode
            let creatorHtml = '';
            if (currentLibraryMode === 'public') {
                let creatorName = set.creatorEmail || 'Unknown';
                if (creatorName.includes('@')) {
                    creatorName = creatorName.split('@')[0];
                    // Capitalize first letter
                    creatorName = creatorName.charAt(0).toUpperCase() + creatorName.slice(1);
                }
                creatorHtml = `<span class="set-creator" style="font-size: 11px; color: #666; margin-top: 4px;">By: <span style="color: #ffcf00;">${creatorName}</span></span>`;
            }

            // Basic Info with Icon Box
            let html = `
                <div class="set-icon-box">
                    <i class="fa-regular ${iconClass}"></i>
                </div>
                <div class="set-info">
                    <span class="set-name">${set.title}</span>
                    <span class="set-desc">${set.description || 'No description'}</span>
                    ${creatorHtml}
                </div>
            `;

            // Add 3-Dots Menu ONLY for Private Sets
            if (currentLibraryMode === 'private') {
                html += `
                    <div class="set-actions">
                        <button class="action-dots-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div class="action-menu">
                            <button class="edit-option"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="delete-option"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    </div>
                `;
            }

            setItem.innerHTML = html;
            setListContainer.appendChild(setItem);

            // Event Listeners
            
            setItem.querySelector('.set-info').addEventListener('click', () => {
                document.querySelectorAll('.set-item').forEach(i => i.classList.remove('active'));
                setItem.classList.add('active');
                
                // Load the game with this set
                loadGameWithSet(set);
            });

            // 2. Menu Logic (Private Only)
            if (currentLibraryMode === 'private') {
                const dotsBtn = setItem.querySelector('.action-dots-btn');
                const menu = setItem.querySelector('.action-menu');
                const deleteBtn = setItem.querySelector('.delete-option');
                const editBtn = setItem.querySelector('.edit-option');

                dotsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // 1. Close ANY other open menus and reset their parent z-index
                    document.querySelectorAll('.set-item.menu-open').forEach(item => {
                        if (item !== setItem) {
                            item.classList.remove('menu-open');
                            const otherMenu = item.querySelector('.action-menu');
                            if (otherMenu) otherMenu.classList.remove('show');
                        }
                    });

                    // 2. Toggle the current menu and the parent class
                    menu.classList.toggle('show');
                    setItem.classList.toggle('menu-open');
                });
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Check if the set has a public version
                    const hasPublicVersion = set.isPublic === true;

                    // Action: Delete (Red button)
                    showCustomConfirm(
                        `Are you sure you want to delete "${set.title}"? This cannot be undone.`, 
                        (deletePublicToo) => { 
                            // Pass the checkbox result to the delete function
                            deleteSetFromLibrary(set, deletePublicToo); 
                        },
                        "Delete", // Button Text
                        true,     // Is Danger? (Red)
                        hasPublicVersion // Show Checkbox?
                    );
                });

                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close menu/reset z-index
                    menu.classList.remove('show');
                    setItem.classList.remove('menu-open');
                    
                    // Load data and switch view
                    loadSetForEditing(set);
                });
            }
        });
    }

    async function deleteSetFromLibrary(setToRemove, deletePublicToo = false) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // 1. Delete from Local Library (Filllocal)
            const docRef = doc(db, "Filllocal", user.email);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                let currentSets = docSnap.data().mySets || [];
                // Filter out the set with the matching ID
                const newSets = currentSets.filter(s => s.id !== setToRemove.id);
                
                await updateDoc(docRef, {
                    mySets: newSets
                });
            }

            // 2. Optionally Delete Public Version
            if (deletePublicToo && setToRemove.isPublic) {
                console.log("Attempting to delete public version...");
                const publicSetsRef = collection(db, "Fillpublic");
                
                // Query for the set with the same ID in Fillpublic
                const q = query(publicSetsRef, where("id", "==", setToRemove.id));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // There should technically only be one, but loop just in case
                    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
                    await Promise.all(deletePromises);
                    console.log("Public version deleted.");
                } else {
                    console.log("Public version not found.");
                }
            }
            
            loadSidebarSets(); // Refresh UI
            showCustomAlert("Set deleted successfully.");

        } catch (error) {
            console.error("Error deleting set:", error);
            showCustomAlert("Failed to delete set.");
        }
    }

    setDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setDropdownContent.classList.toggle('show');
        if (setDropdownContent.classList.contains('show')) {
            dropdownIcon.style.transform = 'rotate(180deg)';
        } else {
            dropdownIcon.style.transform = 'rotate(0deg)';
        }
    });

    window.addEventListener('click', (e) => {
        if (!setDropdownBtn.contains(e.target)) {
            setDropdownContent.classList.remove('show');
            dropdownIcon.style.transform = 'rotate(0deg)';
        }
    });

    // --- HIGHLIGHT LOGIC ---
    const cardsContainer = document.getElementById('cardsContainer');

    cardsContainer.addEventListener('mouseup', (e) => {
        const cardBody = e.target.closest('.flashcard-body');
        if (!cardBody) return;

        const toggle = cardBody.querySelector('.highlight-toggle');
        const contentBox = cardBody.querySelector('.content-box');

        if (toggle && toggle.checked && contentBox.contains(e.target)) {
            applyHighlight();
        }
    });

    function applyHighlight() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        if (selectedText.length > 0) {
            const span = document.createElement('span');
            span.className = 'answer-highlight';
            span.textContent = selectedText;

            try {
                range.deleteContents();
                range.insertNode(span);
                selection.removeAllRanges();
            } catch (error) {
                console.warn("Could not highlight selection.", error);
            }
        }
    }

    cardsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('answer-highlight')) {
            const text = e.target.textContent;
            const textNode = document.createTextNode(text);
            e.target.parentNode.replaceChild(textNode, e.target);
        }
    });


    // --- DYNAMIC CARD MANAGEMENT ---
    
    // 1. Function to add a card
    function createNewCard() {
        const existingCards = cardsContainer.querySelectorAll('.flashcard');
        const newIndex = existingCards.length;

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('flashcard');
        cardDiv.setAttribute('data-index', newIndex);
        
        // TEMPLATE WITH ADD BUTTON
        cardDiv.innerHTML = `
            <div class="flashcard-header">
                <span>${newIndex + 1}</span>
                <div class="card-buttons">
                    <button class="add-btn"><i class="fa-solid fa-plus"></i></button>
                    <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="flashcard-body">
                <div class="highlight-toolbar">
                    <label class="toggle-label">
                        <div class="switch">
                            <input type="checkbox" class="highlight-toggle">
                            <span class="slider round"></span>
                        </div>
                        <span class="label-text">Highlight Mode</span>
                    </label>

                    <!-- NEW: Image Import Controls -->
                    <div class="image-controls">
                        <input type="file" accept="image/*" class="hidden card-img-input">
                        <button class="toolbar-btn import-img-btn" title="Import Image File">
                            <i class="fa-regular fa-image"></i>
                        </button>
                        <button class="toolbar-btn paste-img-btn" title="Paste Image from Clipboard">
                            <i class="fa-regular fa-clipboard"></i>
                        </button>
                    </div>

                    <label class="toggle-label">
                        <div class="switch">
                            <input type="checkbox" class="case-sensitive-toggle">
                            <span class="slider round"></span>
                        </div>
                        <span class="label-text">Case Sensitive</span>
                    </label>
                </div>
                <div class="input-group">
    <div class="input content-box" contenteditable="true" placeholder="Enter the full sentence or definition here..."></div>
</div>
            </div>
        `;

        cardsContainer.appendChild(cardDiv);
        updateCardNumbers();
    }

    // 2. Event Delegation for Add/Delete buttons
    cardsContainer.addEventListener('click', (e) => {
        // Handle Add Button
        if (e.target.closest('.add-btn')) {
            createNewCard();
        }

        // Handle Delete Button
        if (e.target.closest('.delete-btn')) {
            const card = e.target.closest('.flashcard');
            if (cardsContainer.querySelectorAll('.flashcard').length > 1) {
                card.remove();
                updateCardNumbers();
            } else {
                showCustomAlert("You must have at least one card.");
            }
        }
    });

    function updateCardNumbers() {
        const cards = cardsContainer.querySelectorAll('.flashcard');
        cards.forEach((card, index) => {
            card.querySelector('.flashcard-header span').textContent = index + 1;
        });
    }


    // --- SAVE LOGIC ---
    const saveSetBtn = document.getElementById('saveSetBtn');

    saveSetBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            showCustomAlert("You must be logged in to save.");
            return;
        }

        const title = document.getElementById('setTitle').value.trim();
        const description = document.getElementById('setDescription').value.trim();
        const category = document.getElementById('categorySelect').value;
        const isPublic = document.getElementById('publicToggle').checked;

        if (!title) {
            showCustomAlert("Please enter a title.");
            return;
        }
        if (!category) {
            showCustomAlert("Please select a category.");
            return;
        }

        const cards = [];
        const cardElements = cardsContainer.querySelectorAll('.flashcard');
        
        let hasEmptyCards = false;

        cardElements.forEach((card) => {
            const contentBox = card.querySelector('.content-box');
            // NEW: Get the case sensitive toggle state
            const isCaseSensitive = card.querySelector('.case-sensitive-toggle').checked;
            
            const htmlContent = contentBox.innerHTML;
            
            if (contentBox.textContent.trim() === "") {
                hasEmptyCards = true;
            }

            cards.push({
                content: htmlContent, 
                createdAt: new Date().toISOString(),
                isCaseSensitive: isCaseSensitive // NEW: Save the preference
            });
        });

        if (hasEmptyCards) {
            showCustomAlert("Please fill in all cards.");
            return;
        }

        // Use existing ID if editing, else generate new
        const setId = editingSetId ? editingSetId : Date.now().toString();

        const setPayload = {
            id: setId,
            title: title,
            description: description,
            category: category,
            cards: cards,
            createdAt: new Date(),
            creatorEmail: user.email,
            isPublic: isPublic
        };

        try {
            saveSetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            saveSetBtn.disabled = true;

            const localRef = doc(db, "Filllocal", user.email);
            const docSnap = await getDoc(localRef);
            
            // 1. Handle Local Save
            if (docSnap.exists()) {
                let currentSets = docSnap.data().mySets || [];
                
                if (editingSetId) {
                    // UPDATE EXISTING: Replace the object with matching ID
                    const index = currentSets.findIndex(s => s.id === editingSetId);
                    if (index !== -1) {
                        currentSets[index] = setPayload;
                    } else {
                        currentSets.push(setPayload); // Fallback
                    }
                    await updateDoc(localRef, { mySets: currentSets });
                } else {
                    // CREATE NEW
                    await updateDoc(localRef, {
                        mySets: arrayUnion(setPayload)
                    });
                }
            } else {
                // Create doc if doesn't exist
                await setDoc(localRef, { mySets: [setPayload] });
            }

            // 2. Handle Public (Simplified: Add new doc if public)
            // Note: Updating existing public docs requires finding them by ID query first.
            if (isPublic) {
                if (editingSetId) {
                    // Find and update existing public doc
                    const q = query(collection(db, "Fillpublic"), where("id", "==", editingSetId));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach(async (d) => {
                            await setDoc(d.ref, setPayload);
                        });
                    } else {
                        await addDoc(collection(db, "Fillpublic"), setPayload);
                    }
                } else {
                    await addDoc(collection(db, "Fillpublic"), setPayload);
                }
            }

            showCustomAlert(editingSetId ? "Set updated successfully!" : "Set saved successfully!");
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error("Error saving set:", error);
            showCustomAlert("Error saving set. Check console.");
            saveSetBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Set';
            saveSetBtn.disabled = false;
        }
    });

    // --- CUSTOM MODAL HELPERS ---

    function showCustomAlert(message) {
        const modal = document.getElementById('customAlertModal');
        const msgBox = document.getElementById('customAlertMessage');
        const okBtn = document.getElementById('customAlertOkBtn');
        
        msgBox.textContent = message;
        modal.classList.remove('hidden');

        const closeAlert = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', closeAlert); // Cleanup
        };

        okBtn.addEventListener('click', closeAlert);
    }

function showCustomConfirm(message, onConfirm, btnText = "Confirm", isDanger = true, showCheckbox = false) {
        const modal = document.getElementById('customConfirmModal');
        const msgBox = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        // Checkbox Elements
        const checkboxContainer = document.getElementById('publicDeleteOption');
        const checkbox = document.getElementById('confirmPublicDeleteCheckbox');

        msgBox.textContent = message;
        confirmBtn.textContent = btnText;

        // Handle Checkbox Visibility
        if (showCheckbox) {
            checkboxContainer.classList.remove('hidden');
            checkbox.checked = false; // Reset state
        } else {
            checkboxContainer.classList.add('hidden');
            checkbox.checked = false;
        }

        // Toggle red styling based on the action type
        if (isDanger) {
            confirmBtn.classList.add('danger');
        } else {
            confirmBtn.classList.remove('danger');
        }

        modal.classList.remove('hidden');

        const closeConfirm = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', closeConfirm);
        };

        const handleConfirm = () => {
            // Pass the checkbox state to the callback
            const shouldDeletePublic = checkbox.checked;
            onConfirm(shouldDeletePublic); 
            closeConfirm();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', closeConfirm);
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User logged in:", user.email);
            loadSidebarSets(); // <--- Trigger load on login
        } else {
            console.log("No user logged in.");
            setListContainer.innerHTML = '<p style="padding:20px; color:#666;">Please log in to see your sets.</p>';
        }
    });
// --- GAME LOGIC ---

    function loadGameWithSet(set) {
        activeSet = set;
        activeCardIndex = 0;

        // --- 1. Update Metadata Pill ---
        const metaInfo = document.querySelector('.set-meta-info');
        const metaCategory = document.getElementById('metaCategory');
        const metaCreator = document.getElementById('metaCreator');
        
        if (metaInfo) {
            metaInfo.style.display = 'inline-flex';
            metaCategory.textContent = set.category || 'General';
            
            // Format Creator Name (Grab name before @ in email)
            let creatorName = set.creatorEmail || 'Unknown';
            if (creatorName.includes('@')) {
                creatorName = creatorName.split('@')[0];
                // Capitalize first letter
                creatorName = creatorName.charAt(0).toUpperCase() + creatorName.slice(1);
            }
            metaCreator.textContent = creatorName;
        }

        // --- 2. Update Title & Label ---
        document.getElementById('fillinTitleText').textContent = set.title;
        const titleLabel = document.querySelector('.title-label');
        if (titleLabel) titleLabel.style.display = 'inline'; // Show "Title:" label

        // --- 3. Update Description Box ---
        const descText = document.getElementById('fillinDescriptionText');
        if (descText) {
            descText.textContent = (set.description && set.description.trim() !== "") 
                ? set.description 
                : "No description provided.";
            
            // Optional: dim text if no description
            descText.style.color = (set.description && set.description.trim() !== "") ? "#e0e0e0" : "#666";
        }
        
        // FIX: Reveal the new controls footer AND header
        const controls = document.querySelector('.game-controls');
        const header = document.querySelector('.game-card-header');
        
        controls.style.display = 'flex';
        if (header) header.style.display = 'flex';

        const checkBtn = document.querySelector('.check-btn');
        checkBtn.disabled = false;
        checkBtn.textContent = "Check";
        
        renderGameCard();
    }

    function renderGameCard() {
        console.log("--- Rendering Game Card ---");
        if (!activeSet || !activeSet.cards || activeSet.cards.length === 0) {
            console.log("No active set or cards found.");
            return;
        }

        const card = activeSet.cards[activeCardIndex];
        console.log("Raw Card Content:", card.content);

        const displayArea = document.querySelector('.definition-display');
        // const descriptionArea = document.querySelector('.fillin-description'); // No longer needed
        const checkBtn = document.querySelector('.check-btn');
        const counterDisplay = document.querySelector('.card-counter');
// NEW: Update Case Sensitivity Header
        const caseBadge = document.getElementById('caseBadge');
        if (caseBadge) {
            const isStrict = card.isCaseSensitive === true;
            if (isStrict) {
                caseBadge.innerHTML = '<i class="fa-solid fa-a"></i> <span>Case Sensitive</span>';
                caseBadge.classList.add('active');
            } else {
                caseBadge.innerHTML = '<i class="fa-solid fa-font"></i> <span>Normal Mode</span>';
                caseBadge.classList.remove('active');
            }
        }
        // Update the footer counter instead of the description
        if (counterDisplay) {
            counterDisplay.textContent = `${activeCardIndex + 1} of ${activeSet.cards.length}`;
        }

        // NEW: Update Navigation Button States
        const prevBtn = document.getElementById('prevCardBtn');
        const nextBtn = document.getElementById('nextCardBtn');
        
        if (prevBtn) prevBtn.disabled = (activeCardIndex === 0);
        if (nextBtn) nextBtn.disabled = (activeCardIndex === activeSet.cards.length - 1);

        checkBtn.textContent = "Check";
        
        checkBtn.classList.remove('correct-btn', 'incorrect-btn');
        checkBtn.onclick = handleCheckAnswer;

        // 1. Create temp container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = card.content;

        // 2. Process Highlights
        const highlights = tempDiv.querySelectorAll('.answer-highlight');
        console.log("Highlights found:", highlights.length);
        
        if (highlights.length === 0) {
            console.log("No highlights, showing plain text.");
            displayArea.innerHTML = card.content;
            checkBtn.onclick = () => { nextCardLogic(); };
            return;
        }

        highlights.forEach((span, index) => {
            const phrase = span.textContent;
            console.log(`Processing Highlight #${index + 1}:`, phrase);

            const fragment = document.createDocumentFragment();
            const words = phrase.split(/(\s+)/);

            words.forEach(part => {
                // FIX: If it's whitespace (space, tab, newline), preserve it!
                if (part.match(/^\s+$/)) {
                    const spaceSpan = document.createElement('span');
                    spaceSpan.style.whiteSpace = 'pre-wrap'; // Ensure formatting keeps
                    spaceSpan.textContent = part;
                    fragment.appendChild(spaceSpan);
                    return; 
                }

                // FIX: Use 'span' instead of 'div' so it stays inline with the text
                const wordWrapper = document.createElement('span');
                wordWrapper.className = 'word-wrapper';

                [...part].forEach(char => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'char-input';
                    input.maxLength = 1;
                    input.dataset.char = char;
                    input.autocomplete = "off";
                    
                    input.addEventListener('input', handleCharInput);
                    input.addEventListener('keydown', handleKeyDown);
                    input.addEventListener('focus', (e) => e.target.select()); 
                    
                    wordWrapper.appendChild(input);
                });

                fragment.appendChild(wordWrapper);
            });
            
            span.parentNode.replaceChild(fragment, span);
        });

        // FIX: Move nodes directly
        // FIX: Move nodes directly
        displayArea.innerHTML = '';
        
        // Create a wrapper to keep text flowing together while parent centers it
        // Create a wrapper to keep text flowing together
        const contentWrapper = document.createElement('div');
        contentWrapper.style.width = "100%";
        // Removed textAlign = "center" to respect CSS
        
        while (tempDiv.firstChild) {
            contentWrapper.appendChild(tempDiv.firstChild);
        }
        displayArea.appendChild(contentWrapper);

        console.log("DOM updated. Element display style:", window.getComputedStyle(displayArea).display);

        // --- NEW: Auto-Resize Text to Fit ---
        displayArea.style.fontSize = '24px'; 
        
        let currentSize = 24;
        const minSize = 12;

        while (displayArea.scrollHeight > displayArea.clientHeight && currentSize > minSize) {
            currentSize--;
            displayArea.style.fontSize = `${currentSize}px`;
        }
        console.log("Final Font Size:", currentSize + "px");

        // Auto-focus first input
        const firstInput = displayArea.querySelector('.char-input');
        if (firstInput) firstInput.focus();
    }

    // --- Typing Logic ---
// --- Typing Logic ---
// --- Typing Logic ---
function handleCharInput(e) {
        const input = e.target;
        
        // 1. Force uppercase
        

        // 2. Move to next input
        if (input.value.length >= 1) {
            const container = document.querySelector('.definition-display');
            const allInputs = Array.from(container.querySelectorAll('.char-input'));
            const currentIndex = allInputs.indexOf(input);

            // FIX: Loop forward to find the next NOT disabled input
            for (let i = currentIndex + 1; i < allInputs.length; i++) {
                if (!allInputs[i].disabled) {
                    allInputs[i].focus();
                    break; // Stop once we find an editable input
                }
            }
        }
    }

function handleKeyDown(e) {
        const input = e.target;
        const allInputs = Array.from(document.querySelectorAll('.char-input'));
        const currentIndex = allInputs.indexOf(input);

        if (e.key === 'Backspace') {
            if (input.value === '') {
                e.preventDefault();
                // FIX: Loop backward to find the previous NOT disabled input
                for (let i = currentIndex - 1; i >= 0; i--) {
                    if (!allInputs[i].disabled) {
                        allInputs[i].focus();
                        allInputs[i].value = ''; // Clear it
                        break;
                    }
                }
            }
        } 
        else if (e.key === 'ArrowRight') {
            // FIX: Loop forward to find next enabled
            for (let i = currentIndex + 1; i < allInputs.length; i++) {
                if (!allInputs[i].disabled) {
                    allInputs[i].focus();
                    break;
                }
            }
        } 
        else if (e.key === 'ArrowLeft') {
            // FIX: Loop backward to find prev enabled
            for (let i = currentIndex - 1; i >= 0; i--) {
                if (!allInputs[i].disabled) {
                    allInputs[i].focus();
                    break;
                }
            }
        }
    }

    function nextCardLogic() {
        if (activeCardIndex < activeSet.cards.length - 1) {
            activeCardIndex++;
            renderGameCard();
        } else {
            showCustomAlert("Congratulations! You finished the set.");
            activeCardIndex = 0;
            renderGameCard();
        }
    }

    function handleCheckAnswer() {
        const displayArea = document.querySelector('.definition-display');
        const inputs = displayArea.querySelectorAll('.char-input');
        const checkBtn = document.querySelector('.check-btn');
        let allCorrect = true;

        // Get the current card data to check its specific setting
        const currentCardData = activeSet.cards[activeCardIndex];
        const isStrict = currentCardData.isCaseSensitive === true; // Default false if undefined

        inputs.forEach(input => {
            let userChar = input.value;
            let correctChar = input.dataset.char;

            // Apply logic based on the card's setting
            if (!isStrict) {
                // If NOT case sensitive, convert both to lowercase
                userChar = userChar.toLowerCase();
                correctChar = correctChar.toLowerCase();
            }
            // If isStrict is true, we leave them as-is (Case Sensitive)

            if (userChar === correctChar) {
                input.classList.add('correct');
                input.classList.remove('incorrect');
                input.disabled = true; // Lock correct ones
            } else {
                input.classList.add('incorrect');
                input.classList.remove('correct');
                allCorrect = false;
            }
        });

        if (allCorrect) {
            checkBtn.textContent = (activeCardIndex < activeSet.cards.length - 1) ? "Next Card" : "Finish Review";
            checkBtn.style.backgroundColor = "#22c55e"; // Green success color
            checkBtn.style.color = "#fff";
            checkBtn.onclick = nextCardLogic;
            
            // Auto focus button so user can hit enter
            checkBtn.focus();
        } else {
            checkBtn.textContent = "Try Again";
            checkBtn.style.backgroundColor = "#ef4444"; // Red error color
            checkBtn.style.color = "#fff";
            
            setTimeout(() => {
                // Reset button style
                checkBtn.textContent = "Check";
                checkBtn.style.backgroundColor = "#ffcf00";
                checkBtn.style.color = "#171717";
                
                // Clear incorrect
                inputs.forEach(input => {
                    if (input.classList.contains('incorrect')) {
                        input.value = '';
                        input.classList.remove('incorrect');
                    }
                });
                // Focus first empty
                const firstEmpty = [...inputs].find(i => i.value === '');
                if(firstEmpty) firstEmpty.focus();
            }, 1200);
        }
    }
    // --- NEW: Hint, Shuffle, and Navigation Logic ---
    
    const hintBtn = document.getElementById('hintBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const prevCardBtn = document.getElementById('prevCardBtn'); // Added
    const nextCardBtn = document.getElementById('nextCardBtn'); // Added

    // PREV BUTTON
    prevCardBtn.addEventListener('click', () => {
        if (activeCardIndex > 0) {
            activeCardIndex--;
            renderGameCard();
        }
    });

    // NEXT BUTTON
    nextCardBtn.addEventListener('click', () => {
        if (activeSet && activeCardIndex < activeSet.cards.length - 1) {
            activeCardIndex++;
            renderGameCard();
        }
    });

    // SHUFFLE BUTTON

    // SHUFFLE BUTTON
    // SHUFFLE BUTTON
    shuffleBtn.addEventListener('click', () => {
        if (!activeSet || !activeSet.cards) return;
        
        // Action: Shuffle (Normal/Yellow button)
        showCustomConfirm(
            "Shuffle cards and restart?", 
            () => {
                // Fisher-Yates Shuffle
                for (let i = activeSet.cards.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [activeSet.cards[i], activeSet.cards[j]] = [activeSet.cards[j], activeSet.cards[i]];
                }
                activeCardIndex = 0;
                renderGameCard();
            },
            "Shuffle", // Button Text
            false      // Is Danger? (False = Yellow/Normal)
        );
    });

    // HINT BUTTON (Reveals 1 random empty letter)
    hintBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.char-input');
        // Filter for empty inputs only
        const emptyInputs = Array.from(inputs).filter(input => input.value === '');
        
        if (emptyInputs.length > 0) {
            // Pick a random empty input
            const randomInput = emptyInputs[Math.floor(Math.random() * emptyInputs.length)];
            
            // Fill it with the correct char
            randomInput.value = randomInput.dataset.char;
            randomInput.classList.add('correct'); // Optional: mark it green immediately
            randomInput.disabled = true;
        } else {
            // If no empty inputs, look for incorrect ones to fix
            const incorrectInputs = Array.from(inputs).filter(input => input.classList.contains('incorrect'));
             if (incorrectInputs.length > 0) {
                const fixInput = incorrectInputs[0];
                fixInput.value = fixInput.dataset.char;
                fixInput.classList.remove('incorrect');
                fixInput.classList.add('correct');
                fixInput.disabled = true;
            }
        }
    });
    // --- ENTER KEY SUPPORT ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const checkBtn = document.querySelector('.check-btn');
            const isGameActive = !document.querySelector('.game-controls').style.display === 'none';
            
            // Only trigger if:
            // 1. The game controls are visible
            // 2. The check button exists and is not disabled
            // 3. We are NOT focused on a textarea (like creating a description)
            // 4. We ARE allowed to hit enter from game inputs
            
            if (checkBtn && !checkBtn.disabled && checkBtn.offsetParent !== null) {
                 // Prevent default only if we are actually clicking the button
                 e.preventDefault(); 
                 checkBtn.click();
            }
        }
    });
    // --- HIGHLIGHT TOGGLE CURSOR LOGIC ---
    cardsContainer.addEventListener('change', (e) => {
        // Check if the changed element is a highlight toggle
        if (e.target.classList.contains('highlight-toggle')) {
            const cardBody = e.target.closest('.flashcard-body');
            const contentBox = cardBody.querySelector('.content-box');
            
            // Toggle the class that applies the CSS cursor
            if (e.target.checked) {
                contentBox.classList.add('highlight-active');
            } else {
                contentBox.classList.remove('highlight-active');
            }
        }
    });
    // --- ALIGNMENT BUTTON LOGIC ---
    const alignBtns = document.querySelectorAll('.align-btn');
    const definitionDisplay = document.querySelector('.definition-display');

    if (alignBtns.length > 0 && definitionDisplay) {
        alignBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 1. Visual Update: Remove active class from all, add to clicked
                alignBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 2. Logic Update: Change text alignment
                const alignment = btn.dataset.align;
                
                if (alignment === 'left') {
                    definitionDisplay.style.textAlign = 'left';
                    definitionDisplay.style.alignItems = 'flex-start';
                } else if (alignment === 'center') {
                    definitionDisplay.style.textAlign = 'center';
                    definitionDisplay.style.alignItems = 'center';
                } else if (alignment === 'right') {
                    definitionDisplay.style.textAlign = 'right';
                    definitionDisplay.style.alignItems = 'flex-end';
                }
            });
        });
    }
    // --- EDIT FUNCTIONALITY ---
    function loadSetForEditing(set) {
        editingSetId = set.id;

        // 1. Populate Text Fields
        document.getElementById('setTitle').value = set.title;
        document.getElementById('setDescription').value = set.description || '';
        document.getElementById('categorySelect').value = set.category || '';
        document.getElementById('publicToggle').checked = set.isPublic || false;

        // 2. Populate Cards
        const container = document.getElementById('cardsContainer');
        container.innerHTML = ''; // Clear existing

        if (set.cards && set.cards.length > 0) {
            set.cards.forEach((cardData) => {
                // Use existing helper to create structure
                createNewCard(); 
                
                // Get the card we just added (it will be the last one)
                const newCard = container.lastElementChild;
                
                // Fill Data
                const contentBox = newCard.querySelector('.content-box');
                contentBox.innerHTML = cardData.content; // Use innerHTML to keep highlight spans

                // Set Toggles
                const caseToggle = newCard.querySelector('.case-sensitive-toggle');
                if (caseToggle && cardData.isCaseSensitive) {
                    caseToggle.checked = true;
                }
                
                // Note: Highlight toggle visual state in Create Mode is just for cursor
                // We don't strictly need to check it, but we can if we want cursor to show immediately
                // For now, leaving it unchecked is fine as contenteditable works regardless.
            });
        } else {
            createNewCard(); // Ensure at least one
        }

        // 3. Update UI Button
        const saveBtn = document.getElementById('saveSetBtn');
        saveBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Update Set';

        // 4. Switch View
        document.getElementById('fillInDashboard').classList.add('hidden');
        document.getElementById('createSetView').classList.remove('hidden');
    }
    // --- HOW TO PLAY MODAL LOGIC ---
    const gameInfoBtn = document.getElementById('gameInfoBtn');
    const howToPlayModal = document.getElementById('howToPlayModal');
    const closeHowToPlayBtn = document.getElementById('closeHowToPlayBtn');

    if (gameInfoBtn) {
        gameInfoBtn.addEventListener('click', () => {
            howToPlayModal.classList.remove('hidden');
        });
    }

    if (closeHowToPlayBtn) {
        closeHowToPlayBtn.addEventListener('click', () => {
            howToPlayModal.classList.add('hidden');
        });
    }

    // Close on backdrop click (Shared logic with other modals)
    if (howToPlayModal) {
        howToPlayModal.addEventListener('click', (e) => {
            if (e.target === howToPlayModal) {
                howToPlayModal.classList.add('hidden');
            }
        });
    }
    // --- IMAGE OCR LOGIC (Import & Paste) ---
    
    // 1. Handle Button Clicks
    cardsContainer.addEventListener('click', async (e) => {
        // IMPORT BUTTON
        if (e.target.closest('.import-img-btn')) {
            const btn = e.target.closest('.import-img-btn');
            const cardBody = btn.closest('.flashcard-body');
            const fileInput = cardBody.querySelector('.card-img-input');
            fileInput.click();
        }

        // PASTE BUTTON
        if (e.target.closest('.paste-img-btn')) {
            const btn = e.target.closest('.paste-img-btn');
            const cardBody = btn.closest('.flashcard-body');
            const contentBox = cardBody.querySelector('.content-box');

            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    if (item.types.some(type => type.startsWith('image/'))) {
                        const blob = await item.getType(item.types.find(type => type.startsWith('image/')));
                        processImageToText(blob, contentBox);
                        return;
                    }
                }
                showCustomAlert("No image found in clipboard.");
            } catch (err) {
                console.error('Failed to read clipboard:', err);
                showCustomAlert("Failed to paste. Please allow clipboard access.");
            }
        }
    });

    // 2. Handle File Input Change
    cardsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('card-img-input')) {
            const file = e.target.files[0];
            if (file) {
                const cardBody = e.target.closest('.flashcard-body');
                const contentBox = cardBody.querySelector('.content-box');
                processImageToText(file, contentBox);
            }
            // Reset input so same file can be selected again if needed
            e.target.value = ''; 
        }
    });

    // 3. OCR Processing Function
    async function processImageToText(imageBlob, contentBox) {
        if (!contentBox) return;

        // UI Loading State
        const originalPlaceholder = contentBox.getAttribute('placeholder');
        contentBox.textContent = "Extracting text from image...";
        contentBox.classList.add('processing');
        contentBox.contentEditable = false;

        try {
            // Use Tesseract.js (loaded via CDN in HTML)
            const result = await Tesseract.recognize(
                imageBlob,
                'eng', // Language
                { 
                    logger: m => console.log(m) // Optional: log progress
                }
            );

            const text = result.data.text;
            
            // Clean up text slightly (remove excessive newlines if needed)
            const cleanText = text.replace(/\n\s*\n/g, '\n').trim();

            contentBox.textContent = cleanText;
            
        } catch (error) {
            console.error("OCR Error:", error);
            contentBox.textContent = ""; // Clear on error
            showCustomAlert("Failed to extract text from image.");
        } finally {
            // Restore UI
            contentBox.classList.remove('processing');
            contentBox.contentEditable = true;
            contentBox.setAttribute('placeholder', originalPlaceholder);
            contentBox.focus();
        }
    }
    // --- LIBRARY DELETE ALL LOGIC ---
    const libraryMenuBtn = document.getElementById('libraryMenuBtn');
    const libraryMenu = document.getElementById('libraryMenu');
    const deleteAllSetsBtn = document.getElementById('deleteAllSetsBtn');

    // 1. Toggle Menu
    if (libraryMenuBtn) {
        libraryMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close individual set menus first
            document.querySelectorAll('.action-menu.show').forEach(m => {
                if (m !== libraryMenu) m.classList.remove('show');
            });
            libraryMenu.classList.toggle('show');
        });
    }

    // 2. Handle Delete All Click
    if (deleteAllSetsBtn) {
        deleteAllSetsBtn.addEventListener('click', () => {
            // Hide menu
            libraryMenu.classList.remove('show');

            const user = auth.currentUser;
            if (!user) {
                showCustomAlert("Please log in first.");
                return;
            }

            // Check if there are sets to delete
            if (allSetsCache.length === 0 && currentLibraryMode === 'private') {
                showCustomAlert("Your library is already empty.");
                return;
            }

            // Show Confirmation with Checkbox
            showCustomConfirm(
                "Are you sure you want to DELETE ALL your sets? This action cannot be undone.",
                (deletePublicToo) => {
                    performDeleteAllSets(deletePublicToo);
                },
                "Delete All",
                true, // Danger (Red)
                true  // Show Checkbox
            );
        });
    }

    // 3. Close menu when clicking outside (Update existing window listener)
    // (You already have a window click listener, ensure it includes this:)
    /* The existing listener:
       document.querySelectorAll('.action-menu.show').forEach(menu => { menu.classList.remove('show'); });
       ...already handles closing this because #libraryMenu has the class .action-menu
    */

    // 4. The Deletion Logic
    async function performDeleteAllSets(deletePublicToo) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // A. Delete Local Sets (Filllocal)
            const localRef = doc(db, "Filllocal", user.email);
            
            // We set the array to empty []
            await setDoc(localRef, { mySets: [] }, { merge: true });
            
            // B. Delete Public Sets (if checked)
            if (deletePublicToo) {
                console.log("Deleting user's public sets...");
                const publicSetsRef = collection(db, "Fillpublic");
                // Query all public sets created by this user
                const q = query(publicSetsRef, where("creatorEmail", "==", user.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
                    await Promise.all(deletePromises);
                    console.log(`${querySnapshot.size} public sets deleted.`);
                }
            }

            // C. UI Cleanup
            loadSidebarSets(); // Refresh list
            showCustomAlert("All sets deleted successfully.");
            
            // If the currently loaded set was deleted, reset the dashboard
            if (activeSet) {
                document.getElementById('fillinTitleText').textContent = "Fill-in Mode";
                document.querySelector('.definition-display').innerHTML = 
                    '<span class="placeholder-text">Select a set from the sidebar to begin practicing.</span>';
                document.querySelector('.game-controls').style.display = 'none';
                document.querySelector('.game-card-header').style.display = 'none';
                activeSet = null;
            }

        } catch (error) {
            console.error("Error deleting all sets:", error);
            showCustomAlert("Failed to delete all sets.");
        }
    }
    // --- MOBILE SIDEBAR LOGIC ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        
        if (sidebar.classList.contains('open')) {
            sidebarOverlay.style.display = 'block';
            // Small delay to allow CSS transition to render opacity
            setTimeout(() => sidebarOverlay.classList.add('show'), 10);
        } else {
            sidebarOverlay.classList.remove('show');
            setTimeout(() => {
                if (!sidebar.classList.contains('open')) {
                    sidebarOverlay.style.display = 'none';
                }
            }, 300); // Match CSS transition time
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Close when clicking overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        });
    }

// Close sidebar when a set is clicked on mobile
    // (setListContainer is already defined at the top of the file, so we just use it)
    setListContainer.addEventListener('click', (e) => {
        // Only close if we are on mobile (window width check)
        if (window.innerWidth <= 768 && e.target.closest('.set-item')) {
            if (sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        }
    });
});