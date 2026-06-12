/**
 * Nexus HQ — Main Application Bootstrap
 * Handles screen navigation, widget rendering, dragging, and dynamic updates.
 */


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

            // Find indexes to determine transition direction (left vs right)
            const navItemsArray = Array.from(document.querySelectorAll('.nav-item[data-screen]'));
            const activeItem = document.querySelector('.nav-item.active[data-screen]');
            const activeIndex = activeItem ? navItemsArray.indexOf(activeItem) : 0;
            const clickedIndex = navItemsArray.indexOf(item);

            const updateDOM = () => {
                // Deactivate all screens & nav items
                screens.forEach((s) => s.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

                // Activate target
                target.classList.add('active');
                item.classList.add('active');

                // Scroll content to top on screen switch
                const content = target.querySelector('.screen-content');
                if (content) content.scrollTop = 0;
            };

            // Progressive enhancement: Fallback for browsers without View Transitions
            if (!document.startViewTransition) {
                updateDOM();
                return;
            }

            const directionClass = clickedIndex > activeIndex ? 'nav-forward' : 'nav-backward';
            document.documentElement.classList.add(directionClass);

            const transition = document.startViewTransition(updateDOM);
            transition.finished.finally(() => {
                document.documentElement.classList.remove('nav-forward', 'nav-backward');
            });
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

    // Guard to prevent double event listener registration
    if (container.dataset.eventsBound) return;
    container.dataset.eventsBound = "true";

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
 * Loads layout state from Supabase database or localStorage fallback
 */
async function loadLayout(container) {
    container.innerHTML = '';

    let layout = null;
    const client = getSupabaseClient();
    
    if (client && currentUser) {
        try {
            const { data, error } = await client
                .from('widget_layout')
                .select('widget_id')
                .eq('user_id', currentUser.id)
                .order('position_y', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                layout = data.map(row => row.widget_id);
            }
        } catch (e) {
            console.error('Failed to load layout from Supabase, falling back to localStorage', e);
        }
    }

    // Fallback to localStorage
    if (!layout) {
        try {
            layout = JSON.parse(localStorage.getItem('nexus-dashboard-layout'));
        } catch (e) {
            layout = null;
        }
    }

    // Default widgets if none saved
    if (!layout || !Array.isArray(layout)) {
        layout = ['quicklinks', 'weather', 'dhl', 'rss'];
    }

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
 * Persists current widget layout order in Supabase and localStorage
 */
async function saveLayout() {
    const container = document.getElementById('dashboard-grid');
    if (!container) return;

    const wrappers = container.querySelectorAll('.widget-wrapper');
    const layout = Array.from(wrappers).map(w => w.dataset.widgetId);
    
    // Local backup
    localStorage.setItem('nexus-dashboard-layout', JSON.stringify(layout));

    const client = getSupabaseClient();
    if (client && currentUser) {
        try {
            // Delete widgets that are no longer in our list
            if (layout.length > 0) {
                await client
                    .from('widget_layout')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .not('widget_id', 'in', `(${layout.join(',')})`);
            } else {
                await client
                    .from('widget_layout')
                    .delete()
                    .eq('user_id', currentUser.id);
            }

            // Prep upsert rows
            const rows = layout.map((type, idx) => ({
                user_id: currentUser.id,
                widget_id: type,
                title: type.charAt(0).toUpperCase() + type.slice(1),
                position_y: idx,
                position_x: 0,
                col_span: 1,
                row_span: 1,
                is_visible: true,
                updated_at: new Date().toISOString()
            }));

            if (rows.length > 0) {
                const { error } = await client
                    .from('widget_layout')
                    .upsert(rows, { onConflict: 'user_id,widget_id' });
                if (error) throw error;
            }
        } catch (e) {
            console.error('Failed to save layout to Supabase', e);
        }
    }
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
    window.initAuth = initAuth;
    window.getSupabaseClient = getSupabaseClient;
    window.getSupabaseCredentials = getSupabaseCredentials;
    window.handleAuthStateChange = handleAuthStateChange;
}

// ========== AUTHENTICATION LOGIC ==========

let supabaseClient = null;
let currentUser = null;

function getSupabaseCredentials() {
    const url = window.NEXUS_SUPABASE_URL || window.VITE_SUPABASE_URL;
    const key = window.NEXUS_SUPABASE_ANON_KEY || window.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
        return { url, key };
    }
    const savedUrl = localStorage.getItem('nexus-supabase-url');
    const savedKey = localStorage.getItem('nexus-supabase-key');
    if (savedUrl && savedKey) {
        return { url: savedUrl, key: savedKey };
    }
    return null;
}

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const credentials = getSupabaseCredentials();
    if (!credentials) return null;
    if (typeof window !== 'undefined' && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(credentials.url, credentials.key);
            return supabaseClient;
        } catch (e) {
            console.error('Failed to create Supabase client', e);
        }
    }
    return null;
}

async function initAuth() {
    // Bind form events regardless of credentials state
    setupAuthUIEvents();

    const client = getSupabaseClient();

    if (!client) {
        // Show setup screen if keys are missing (hides the default-visible login form)
        showAuthCard('auth-setup');
        document.body.classList.add('auth-locked');
        return;
    }

    // We have credentials — show loading spinner while checking session
    showAuthCard('auth-loading');
    document.body.classList.add('auth-locked');

    // Add a connection timeout (4 seconds) to fall back if the query hangs
    let authLoaded = false;
    const timeoutId = setTimeout(() => {
        if (!authLoaded) {
            console.warn('Supabase session load timed out.');
            showAuthCard('auth-login');
            showAuthError('Die Verbindung dauert ungewöhnlich lange. Überprüfe ggf. deine Zugangsdaten.');
        }
    }, 4000);

    try {
        // Explicitly check current session to transition out of loading state
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        
        authLoaded = true;
        clearTimeout(timeoutId);
        
        handleAuthStateChange('INITIAL', data ? data.session : null);

        // Listen to subsequent Auth state changes
        client.auth.onAuthStateChange((event, session) => {
            handleAuthStateChange(event, session);
        });
    } catch (e) {
        authLoaded = true;
        clearTimeout(timeoutId);
        console.error('Failed to query Supabase session status', e);
        showAuthCard('auth-login');
        showAuthError('Verbindung zum Server konnte nicht hergestellt werden. Bitte Verbindungseinstellungen prüfen.');
    }
}

function showAuthCard(cardId) {
    const cards = ['auth-loading', 'auth-setup', 'auth-login'];
    cards.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === cardId) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });
}

function handleAuthStateChange(event, session) {
    const emailEl = document.getElementById('settings-user-email');
    currentUser = session ? session.user : null;
    
    const updateDOM = () => {
        if (session) {
            // User is logged in
            document.body.classList.remove('auth-locked');
            if (emailEl) emailEl.textContent = session.user.email;
            
            // Show home screen by default if we were locked
            const activeScreen = document.querySelector('.screen.active');
            if (!activeScreen || activeScreen.id === 'screen-auth') {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                const home = document.getElementById('screen-home');
                if (home) home.classList.add('active');
                
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const homeNav = document.querySelector('.nav-item[data-screen="screen-home"]');
                if (homeNav) homeNav.classList.add('active');
            }

            // Initialize widgets for user
            initWidgets();
        } else {
            // User is logged out
            document.body.classList.add('auth-locked');
            
            // Deactivate all screens and activate auth screen
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            const authScreen = document.getElementById('screen-auth');
            if (authScreen) authScreen.classList.add('active');

            showAuthCard('auth-login');
            if (emailEl) emailEl.textContent = '';
            
            // Clear layout container to prevent residual visual data
            const grid = document.getElementById('dashboard-grid');
            if (grid) grid.innerHTML = '';
        }
    };

    if (!document.startViewTransition) {
        updateDOM();
    } else {
        document.startViewTransition(updateDOM);
    }
}

function setupAuthUIEvents() {
    const allowRegistration = typeof window !== 'undefined' && window.NEXUS_ALLOW_REGISTRATION === true;
    const authTabs = document.querySelector('.auth-tabs');
    if (authTabs && !allowRegistration) {
        authTabs.classList.add('hidden');
    }

    // 1. Setup credential storage form
    const setupForm = document.getElementById('setup-form');
    if (setupForm) {
        setupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const url = document.getElementById('setup-url').value.trim();
            const key = document.getElementById('setup-key').value.trim();
            if (url && key) {
                localStorage.setItem('nexus-supabase-url', url);
                localStorage.setItem('nexus-supabase-key', key);
                // Clear any cached client and reload auth
                supabaseClient = null;
                initAuth();
            }
        });
    }

    // 2. Setup Login / Register Tab Toggles
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authTitle = document.querySelector('#auth-login .auth-title');
    const authSubtitle = document.querySelector('#auth-login .auth-subtitle');
    const confirmGroup = document.getElementById('register-confirm-group');
    const confirmInput = document.getElementById('login-confirm-password');
    const passwordInput = document.getElementById('login-password');
    let isRegisterMode = false;

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            authSubmitBtn.textContent = 'Anmelden';
            authTitle.textContent = 'Pham\'s Nexus Hub';
            authSubtitle.textContent = 'Melde dich an, um auf dein Dashboard zuzugreifen.';
            isRegisterMode = false;
            if (confirmGroup) confirmGroup.classList.add('hidden');
            if (confirmInput) confirmInput.removeAttribute('required');
            if (passwordInput) passwordInput.setAttribute('autocomplete', 'current-password');
            hideAuthError();
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            authSubmitBtn.textContent = 'Registrieren';
            authTitle.textContent = 'Konto erstellen';
            authSubtitle.textContent = 'Erstelle ein Konto, um deine Daten in der Cloud zu sichern.';
            isRegisterMode = true;
            if (confirmGroup) confirmGroup.classList.remove('hidden');
            if (confirmInput) confirmInput.setAttribute('required', 'required');
            if (passwordInput) passwordInput.setAttribute('autocomplete', 'new-password');
            hideAuthError();
        });
    }

    // 3. Setup Login / Register submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = passwordInput ? passwordInput.value : '';
            const client = getSupabaseClient();

            if (!client) {
                showAuthError('Supabase Client nicht initialisiert.');
                return;
            }

            if (isRegisterMode) {
                if (!allowRegistration) {
                    showAuthError('Registrierung ist derzeit deaktiviert.');
                    return;
                }
                const confirmPassword = confirmInput ? confirmInput.value : '';
                if (password !== confirmPassword) {
                    showAuthError('Passwörter stimmen nicht überein.');
                    return;
                }
            }

            setSubmitLoading(true);
            hideAuthError();

            try {
                if (isRegisterMode) {
                    const { data, error } = await client.auth.signUp({ email, password });
                    if (error) throw error;
                    alert('Registrierung erfolgreich! Falls E-Mail-Bestätigung aktiviert ist, prüfe deinen Posteingang. Du wirst jetzt angemeldet.');
                } else {
                    const { data, error } = await client.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                }
            } catch (err) {
                showAuthError(err.message || 'Authentifizierungsfehler');
            } finally {
                setSubmitLoading(false);
            }
        });
    }

    // 4. Setup Show Setup Settings button
    const showSetupBtn = document.getElementById('btn-show-setup');
    if (showSetupBtn) {
        if (!allowRegistration) {
            showSetupBtn.classList.add('hidden');
        }
        showSetupBtn.addEventListener('click', () => {
            showAuthCard('auth-setup');
        });
    }

    // 5. Setup Sign out and Connection Reset
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const client = getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
        });
    }

    const resetSetupBtn = document.getElementById('reset-setup-btn');
    if (resetSetupBtn) {
        resetSetupBtn.addEventListener('click', async () => {
            if (confirm('Möchtest du die Supabase-Verbindung wirklich trennen? Du wirst abgemeldet und die Verbindungsdaten werden gelöscht.')) {
                const client = getSupabaseClient();
                if (client) {
                    await client.auth.signOut();
                }
                localStorage.removeItem('nexus-supabase-url');
                localStorage.removeItem('nexus-supabase-key');
                supabaseClient = null;
                initAuth();
            }
        });
    }

    // 6. Autofill local development credentials if set in config.js
    if (typeof window !== 'undefined') {
        const devEmail = window.NEXUS_DEV_EMAIL;
        const devPassword = window.NEXUS_DEV_PASSWORD;
        if (devEmail && devPassword) {
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            if (emailInput && !emailInput.value) {
                emailInput.value = devEmail;
            }
            if (passwordInput && !passwordInput.value) {
                passwordInput.value = devPassword;
            }
        }
    }
}

function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideAuthError() {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
    }
}

function setSubmitLoading(isLoading) {
    const btn = document.getElementById('auth-submit-btn');
    if (btn) {
        btn.disabled = isLoading;
        btn.style.opacity = isLoading ? '0.7' : '';
    }
}

function loadConfigScript() {
    return new Promise((resolve) => {
        // Skip loading config.js in happy-dom/vitest test environment to avoid warnings
        if (typeof window !== 'undefined' && window.happyDOM) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = './config.js';
        script.onload = () => resolve();
        script.onerror = () => resolve(); // continue even if script fails to load
        document.body.appendChild(script);
    });
}

// Bootstrap execution
const startApp = async () => {
    initNavigation();
    await loadConfigScript();
    initAuth();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
