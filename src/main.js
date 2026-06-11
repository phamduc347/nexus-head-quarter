/**
 * Nexus HQ — Main Application Bootstrap
 * Handles screen navigation, widget rendering, dragging, and dynamic updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initWidgets();
});

/**
 * Bottom navigation — switch between screens
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-screen]');
    const screens = document.querySelectorAll('.screen');

    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            const targetId = item.dataset.screen;
            const target = document.getElementById(targetId);
            if (!target) return;

            // Deactivate all screens & nav items
            screens.forEach((s) => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

            // Activate target
            target.classList.add('active');
            item.classList.add('active');

            // Scroll content to top on screen switch
            const content = target.querySelector('.screen-content');
            if (content) content.scrollTop = 0;
        });
    });
}

/**
 * Dynamic Widget Grid System Initialization
 */
function initWidgets() {
    const container = document.getElementById('dashboard-grid');
    if (!container) return;

    // Load initial layout
    loadLayout(container);

    // Setup Edit Mode
    initEditMode(container);

    // Setup Pointer-based Drag & Drop Reordering
    setupDragAndDrop(container);

    // Setup Deletion Click Handler (Event Delegation)
    setupDeleteHandler(container);

    // Setup Add Dialog Event Handlers
    setupAddDialogHandler();
}

/**
 * Loads layout state from localStorage or sets defaults
 */
function loadLayout(container) {
    let layout;
    try {
        layout = JSON.parse(localStorage.getItem('nexus-dashboard-layout'));
    } catch (e) {
        layout = null;
    }

    // Default widgets if none saved
    if (!layout || !Array.isArray(layout)) {
        layout = ['quicklinks', 'weather', 'dhl', 'rss'];
    }

    container.innerHTML = '';

    layout.forEach(type => {
        const template = document.getElementById(`template-${type}`);
        if (template) {
            const clone = template.content.cloneNode(true);
            container.appendChild(clone);
        }
    });

    // Render the Add Widget button
    renderAddButton(container);
}

/**
 * Persists current widget layout order in localStorage
 */
function saveLayout() {
    const container = document.getElementById('dashboard-grid');
    if (!container) return;

    const wrappers = container.querySelectorAll('.widget-wrapper');
    const layout = Array.from(wrappers).map(w => w.dataset.widgetId);
    
    localStorage.setItem('nexus-dashboard-layout', JSON.stringify(layout));
}

/**
 * Renders the persistent Add Widget button at the bottom of the grid
 */
function renderAddButton(container) {
    let btn = document.getElementById('add-widget-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'add-widget-btn';
        btn.className = 'btn-add-widget';
        btn.innerHTML = `
            <span class="material-symbols-outlined">add</span>
            <span>Widget hinzufügen</span>
        `;
        btn.addEventListener('click', () => {
            const dialog = document.getElementById('add-widget-dialog');
            if (dialog) {
                dialog.showModal();
            }
        });
    }
    container.appendChild(btn);
}

/**
 * Toggles dashboard edit mode
 */
function initEditMode(container) {
    const editBtn = document.getElementById('edit-mode-btn');
    if (!editBtn) return;

    editBtn.addEventListener('click', () => {
        const isActive = container.classList.toggle('edit-active');
        
        // Update edit button icon
        const iconSpan = editBtn.querySelector('.material-symbols-outlined');
        if (iconSpan) {
            iconSpan.textContent = isActive ? 'check' : 'edit';
        }
        
        // Save state upon exiting edit mode
        if (!isActive) {
            saveLayout();
        }
    });
}

/**
 * Handles pointer-based drag & drop reordering (works on mouse & touch screens)
 */
let dragElement = null;

function setupDragAndDrop(container) {
    container.addEventListener('pointerdown', (e) => {
        // Only trigger dragging if handle was clicked
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;

        const wrapper = handle.closest('.widget-wrapper');
        if (!wrapper) return;

        e.preventDefault();
        dragElement = wrapper;
        
        // Visual dragging feedback
        wrapper.classList.add('dragging');
        wrapper.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
        if (!dragElement) return;

        e.preventDefault();
        
        const x = e.clientX;
        const y = e.clientY;
        
        // Find all sibling wrappers (exclude the currently dragged one)
        const items = [...container.querySelectorAll('.widget-wrapper:not(.dragging)')];
        
        // Find which sibling wrapper is underneath the current pointer location
        const nextSibling = items.find(item => {
            const rect = item.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });

        if (nextSibling) {
            const rect = nextSibling.getBoundingClientRect();
            const midpointY = rect.top + rect.height / 2;
            const midpointX = rect.left + rect.width / 2;
            
            // Check direction of movement to place item before or after
            const isAfter = (y > midpointY) || (x > midpointX && y > rect.top);
            
            if (isAfter) {
                container.insertBefore(dragElement, nextSibling.nextSibling);
            } else {
                container.insertBefore(dragElement, nextSibling);
            }
        }
    });

    const endDrag = (e) => {
        if (!dragElement) return;
        
        dragElement.classList.remove('dragging');
        try {
            dragElement.releasePointerCapture(e.pointerId);
        } catch (err) {}
        dragElement = null;
        
        saveLayout();
    };

    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
}

/**
 * Sets up delete button click handling using event delegation
 */
function setupDeleteHandler(container) {
    container.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        const wrapper = deleteBtn.closest('.widget-wrapper');
        if (wrapper) {
            // Smooth delete animation before removing from DOM
            wrapper.style.opacity = '0';
            wrapper.style.transform = 'scale(0.8)';
            wrapper.style.transition = 'all var(--transition-fast)';
            
            setTimeout(() => {
                wrapper.remove();
                saveLayout();
            }, 150);
        }
    });
}

/**
 * Binds click events on add options dialog items
 */
function setupAddDialogHandler() {
    const dialog = document.getElementById('add-widget-dialog');
    const closeBtn = document.getElementById('close-dialog-btn');
    if (!dialog) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            dialog.close();
        });
    }

    dialog.addEventListener('click', (e) => {
        // Close modal if backdrop is clicked
        if (e.target === dialog) {
            dialog.close();
            return;
        }

        const optionBtn = e.target.closest('.widget-option-item');
        if (optionBtn) {
            const type = optionBtn.dataset.widgetType;
            addWidget(type);
            dialog.close();
        }
    });
}

/**
 * Appends a new widget clone to the dashboard grid
 */
function addWidget(type) {
    const container = document.getElementById('dashboard-grid');
    const template = document.getElementById(`template-${type}`);
    if (!template || !container) return;

    const clone = template.content.cloneNode(true);
    
    // Insert before the Add Widget action button
    const addBtn = document.getElementById('add-widget-btn');
    if (addBtn) {
        container.insertBefore(clone, addBtn);
    } else {
        container.appendChild(clone);
    }

    saveLayout();
}

// Expose functions globally for testing purposes
if (typeof window !== 'undefined') {
    window.initNavigation = initNavigation;
    window.initWidgets = initWidgets;
    window.loadLayout = loadLayout;
    window.saveLayout = saveLayout;
    window.addWidget = addWidget;
}
