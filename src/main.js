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

                // Screen specific hooks
                if (targetId === 'screen-settings') {
                    updateGoogleCalendarStatus();
                } else if (targetId === 'screen-timeline') {
                    initTimelineRefresh();
                    renderTimelineEvents();
                }
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

    // Guard to prevent double event listener registration and layout loading
    if (container.dataset.eventsBound) return;
    container.dataset.eventsBound = "true";

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
 * Loads layout state from Supabase database or localStorage fallback
 */
async function loadLayout(container) {
    container.innerHTML = '';

    // Render the Add Widget button at the top
    renderAddButton(container);

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
            alert('Database Load Error: ' + e.message);
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
        layout = ['quicklinks', 'weather', 'rss'];
    }

    layout.forEach(type => {
        const template = document.getElementById(`template-${type}`);
        if (template) {
            const clone = template.content.cloneNode(true);
            container.appendChild(clone);
        }
    });

    const weatherWidget = container.querySelector('.widget-weather');
    if (weatherWidget) {
        initWeatherWidget(weatherWidget);
    }

    const rssWidget = container.querySelector('.widget-rss');
    if (rssWidget) {
        initRSSWidget(rssWidget);
    }

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
                const { error: deleteError } = await client
                    .from('widget_layout')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .not('widget_id', 'in', `(${layout.join(',')})`);
                if (deleteError) throw deleteError;
            } else {
                const { error: deleteError } = await client
                    .from('widget_layout')
                    .delete()
                    .eq('user_id', currentUser.id);
                if (deleteError) throw deleteError;
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
            alert('Database Save Error: ' + e.message);
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
    let placeholder = null;
    let startX = 0;
    let startY = 0;

    container.addEventListener('pointerdown', (e) => {
        // Only trigger dragging if handle was clicked
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;

        const wrapper = handle.closest('.widget-wrapper');
        if (!wrapper) return;

        e.preventDefault();
        dragElement = wrapper;
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = wrapper.getBoundingClientRect();
        
        // Create placeholder to occupy the empty slot in the grid
        placeholder = document.createElement('div');
        placeholder.className = 'widget-placeholder';
        placeholder.style.height = rect.height + 'px';
        placeholder.style.width = rect.width + 'px';
        
        // Copy margin & border radius for layout consistency
        const computedStyle = window.getComputedStyle ? window.getComputedStyle(wrapper) : null;
        if (computedStyle) {
            placeholder.style.marginBottom = computedStyle.marginBottom;
            placeholder.style.borderRadius = computedStyle.borderRadius;
        }
        
        // Transform the dragged widget into a floating element
        wrapper.style.width = rect.width + 'px';
        wrapper.style.height = rect.height + 'px';
        wrapper.style.left = rect.left + 'px';
        wrapper.style.top = rect.top + 'px';
        wrapper.style.position = 'fixed';
        wrapper.style.zIndex = '1000';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.margin = '0';
        wrapper.classList.add('dragging-floating');

        // Insert placeholder exactly where the widget wrapper was
        wrapper.parentNode.insertBefore(placeholder, wrapper);
        
        // Add viewport-wide tracking listeners
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
    });

    function onPointerMove(e) {
        if (!dragElement) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        dragElement.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;

        // Find what element is currently under the cursor
        const hitElement = document.elementFromPoint(e.clientX, e.clientY);
        if (!hitElement) return;

        const targetWidget = hitElement.closest('.widget-wrapper');
        const addBtn = hitElement.closest('#add-widget-btn');

        if (targetWidget && targetWidget !== dragElement) {
            const targetRect = targetWidget.getBoundingClientRect();
            const isAfter = e.clientY > targetRect.top + targetRect.height / 2;
            if (isAfter) {
                container.insertBefore(placeholder, targetWidget.nextSibling);
            } else {
                container.insertBefore(placeholder, targetWidget);
            }
        } else if (addBtn) {
            // Position right after the add widget button at the top
            container.insertBefore(placeholder, addBtn.nextSibling);
        } else {
            // Fallback: Check if pointer is above the first widget or below the last widget
            const items = [...container.querySelectorAll('.widget-wrapper:not(.dragging-floating)')];
            if (items.length > 0) {
                const firstRect = items[0].getBoundingClientRect();
                const lastRect = items[items.length - 1].getBoundingClientRect();
                
                if (e.clientY < firstRect.top) {
                    const addBtnEl = document.getElementById('add-widget-btn');
                    if (addBtnEl) {
                        container.insertBefore(placeholder, addBtnEl.nextSibling);
                    } else {
                        container.prepend(placeholder);
                    }
                } else if (e.clientY > lastRect.bottom) {
                    container.appendChild(placeholder);
                }
            }
        }
    }

    function onPointerUp(e) {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);

        if (!dragElement) return;

        // Reset all floating styles
        dragElement.classList.remove('dragging-floating');
        dragElement.style.width = '';
        dragElement.style.height = '';
        dragElement.style.left = '';
        dragElement.style.top = '';
        dragElement.style.position = '';
        dragElement.style.zIndex = '';
        dragElement.style.pointerEvents = '';
        dragElement.style.margin = '';
        dragElement.style.transform = '';

        // Drop the widget back into the placeholder position
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(dragElement, placeholder);
            placeholder.remove();
        }

        dragElement = null;
        placeholder = null;

        saveLayout();
    }
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
    
    // Insert directly below the Add Button at the top of the widgets list
    const addBtn = document.getElementById('add-widget-btn');
    let newWidget = null;
    if (addBtn) {
        container.insertBefore(clone, addBtn.nextSibling);
        newWidget = addBtn.nextSibling;
    } else {
        container.prepend(clone);
        newWidget = container.firstElementChild;
    }

    if (type === 'weather' && newWidget) {
        const weatherEl = newWidget.querySelector('.widget-weather');
        if (weatherEl) {
            initWeatherWidget(weatherEl);
        }
    }

    if (type === 'rss' && newWidget) {
        const rssEl = newWidget.querySelector('.widget-rss');
        if (rssEl) {
            initRSSWidget(rssEl);
        }
    }

    saveLayout();
}

/**
 * Returns weather description and icon symbol for a given WMO code
 */
function getWeatherData(code) {
    const mappings = {
        0: { desc: 'Sonnig', icon: 'wb_sunny' },
        1: { desc: 'Klar', icon: 'wb_sunny' },
        2: { desc: 'Teils wolkig', icon: 'cloud_queue' },
        3: { desc: 'Bedeckt', icon: 'cloud' },
        45: { desc: 'Nebel', icon: 'foggy' },
        48: { desc: 'Reifnebel', icon: 'foggy' },
        51: { desc: 'Leichter Nieselregen', icon: 'rainy' },
        53: { desc: 'Nieselregen', icon: 'rainy' },
        55: { desc: 'Starker Nieselregen', icon: 'rainy' },
        56: { desc: 'Leichter Frostniesel', icon: 'rainy' },
        57: { desc: 'Starker Frostniesel', icon: 'rainy' },
        61: { desc: 'Leichter Regen', icon: 'rainy' },
        63: { desc: 'Regen', icon: 'rainy' },
        65: { desc: 'Starker Regen', icon: 'rainy' },
        66: { desc: 'Gefrierender Regen', icon: 'weather_snowy' },
        67: { desc: 'Starker Gefrierregen', icon: 'weather_snowy' },
        71: { desc: 'Schneefall', icon: 'weather_snowy' },
        73: { desc: 'Mäßiger Schneefall', icon: 'weather_snowy' },
        75: { desc: 'Starker Schneefall', icon: 'weather_snowy' },
        77: { desc: 'Schneegriesel', icon: 'weather_snowy' },
        80: { desc: 'Leichte Schauer', icon: 'rainy' },
        81: { desc: 'Regenschauer', icon: 'rainy' },
        82: { desc: 'Starke Schauer', icon: 'rainy' },
        85: { desc: 'Schneeschauer', icon: 'weather_snowy' },
        86: { desc: 'Starke Schneeschauer', icon: 'weather_snowy' },
        95: { desc: 'Gewitter', icon: 'thunderstorm' },
        96: { desc: 'Gewitter mit Hagel', icon: 'thunderstorm' },
        99: { desc: 'Starkes Gewitter', icon: 'thunderstorm' }
    };
    return mappings[code] || { desc: 'Unbekannt', icon: 'help_outline' };
}

/**
 * Fetches real weather data for Dresden and updates the DOM
 */
async function fetchWeather(weatherEl) {
    const tempEl = weatherEl.querySelector('.weather-temp');
    const descEl = weatherEl.querySelector('.weather-desc');
    const rangeEl = weatherEl.querySelector('.weather-range');
    const iconContainer = weatherEl.querySelector('.weather-icon-container');
    const forecastContainer = weatherEl.querySelector('.weather-forecast');

    const startTime = Date.now();

    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.0504&longitude=13.7373&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=Europe%2FBerlin');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        // Enforce min 500ms duration for loading animations
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
            await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }

        // Update current weather
        const currentTemp = Math.round(data.current.temperature_2m);
        const currentWMO = data.current.weather_code;
        const currentInfo = getWeatherData(currentWMO);

        if (tempEl) tempEl.textContent = `${currentTemp}°`;
        if (descEl) descEl.textContent = currentInfo.desc;
        
        // Find max/min temp of today (index 0 of daily)
        const todayMax = Math.round(data.daily.temperature_2m_max[0]);
        const todayMin = Math.round(data.daily.temperature_2m_min[0]);
        if (rangeEl) rangeEl.textContent = `↑ ${todayMax}° ↓ ${todayMin}°`;

        if (iconContainer) {
            iconContainer.innerHTML = `<span class="material-symbols-outlined">${currentInfo.icon}</span>`;
            // Remove dashed border when icon is active
            iconContainer.style.border = 'none';
            iconContainer.style.background = 'transparent';
        }

        // Find the closest hourly index to the current time
        const nowMs = Date.now();
        let closestIndex = 0;
        let minDiff = Infinity;
        if (data.hourly && data.hourly.time) {
            for (let i = 0; i < data.hourly.time.length; i++) {
                const diff = Math.abs(new Date(data.hourly.time[i]).getTime() - nowMs);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                }
            }
        }

        // Update forecast with the next 5 hours starting from closestIndex
        if (forecastContainer && data.hourly && data.hourly.time) {
            forecastContainer.innerHTML = '';
            
            for (let k = 0; k < 5; k++) {
                const idx = closestIndex + k;
                if (idx >= data.hourly.time.length) break;
                
                const timeStr = data.hourly.time[idx];
                const temp = Math.round(data.hourly.temperature_2m[idx]);
                const wmoCode = data.hourly.weather_code[idx];
                const weatherInfo = getWeatherData(wmoCode);
                
                const dateObj = new Date(timeStr);
                const hourString = `${dateObj.getHours()}:00`;

                const forecastHourEl = document.createElement('div');
                forecastHourEl.className = 'forecast-day';
                forecastHourEl.innerHTML = `
                    <span class="forecast-name">${hourString}</span>
                    <div class="forecast-icon-placeholder" style="border: none; background: transparent; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 24px; color: #ffffff;">${weatherInfo.icon}</span>
                    </div>
                    <span class="forecast-temps">${temp}°</span>
                `;
                forecastContainer.appendChild(forecastHourEl);

                // Staggered fade-in animation
                setTimeout(() => {
                    forecastHourEl.classList.add('revealed');
                }, k * 60);
            }
        }
    } catch (err) {
        console.error('Failed to fetch weather data:', err);
        // Enforce min 500ms duration for loading animations even on failure
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
            await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }
        if (descEl) descEl.textContent = 'Fehler beim Laden';
    }
}

/**
 * Binds events and triggers initial weather load
 */
function initWeatherWidget(weatherEl) {
    const refreshBtn = weatherEl.querySelector('.btn-weather-refresh');
    if (refreshBtn) {
        // Prevent duplicate handler bindings
        if (refreshBtn.dataset.eventsBound) return;
        refreshBtn.dataset.eventsBound = "true";

        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('rotating');
            await fetchWeather(weatherEl);
            if (icon) icon.classList.remove('rotating');
        });
    }

    // Trigger initial load
    fetchWeather(weatherEl);
}

/**
 * Helper to compute relative time in German
 */
function getRelativeTime(pubDateStr) {
    const pubDate = new Date(pubDateStr);
    const now = new Date();
    const diffMs = now - pubDate;
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
        return `vor ${Math.max(1, diffMins)}m`;
    } else if (diffHours < 24) {
        return `vor ${diffHours}h`;
    } else {
        return `vor ${diffDays}d`;
    }
}

/**
 * Fetches RSS feed data using a CORS bypass proxy (rss2json)
 */
async function fetchRSS(rssEl) {
    const listEl = rssEl.querySelector('.rss-list');
    if (!listEl) return;

    const startTime = Date.now();

    try {
        listEl.innerHTML = '<li class="rss-item revealed"><span class="rss-text">Lade News...</span></li>';
        
        const timestamp = Date.now();
        const feedUrl = encodeURIComponent(`https://news.google.com/rss/search?q=Latest+AI+News&hl=en-US&gl=US&ceid=US:en&t=${timestamp}`);
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        // Enforce min 500ms duration for loading animations
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
            await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }

        if (data.status !== 'ok' || !data.items || data.items.length === 0) {
            throw new Error('Invalid Feed Data');
        }

        // Store sorted items on the element (newest first)
        rssEl.items = (data.items || []).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        renderRSSItems(rssEl);

    } catch (err) {
        console.error('Failed to fetch RSS data:', err);
        // Enforce min 500ms duration for loading animations even on failure
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
            await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }
        listEl.innerHTML = '<li class="rss-item revealed"><span class="rss-text">Fehler beim Laden der News.</span></li>';
    }
}

/**
 * Renders the RSS items depending on current expand state
 */
function renderRSSItems(rssEl) {
    const listEl = rssEl.querySelector('.rss-list');
    const items = rssEl.items || [];
    if (!listEl || items.length === 0) return;

    listEl.innerHTML = '';
    const limit = rssEl.dataset.expanded === 'true' ? 8 : 3;

    for (let i = 0; i < Math.min(items.length, limit); i++) {
        const item = items[i];
        const relativeTime = getRelativeTime(item.pubDate);

        const li = document.createElement('li');
        li.className = 'rss-item';
        li.innerHTML = `
            <span class="rss-dot"></span>
            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="rss-link">
                <span class="rss-text">${item.title}</span>
            </a>
            <span class="rss-time">${relativeTime}</span>
        `;
        listEl.appendChild(li);

        // Staggered fade-in animation
        setTimeout(() => {
            li.classList.add('revealed');
        }, i * 50);
    }
}

/**
 * Binds toggle event for expand/collapse and loads initial feed
 */
function initRSSWidget(rssEl) {
    const moreBtn = rssEl.querySelector('.rss-more');
    const refreshBtn = rssEl.querySelector('.btn-rss-refresh');

    if (moreBtn) {
        // Prevent duplicate handler bindings
        if (moreBtn.dataset.eventsBound) return;
        moreBtn.dataset.eventsBound = "true";

        moreBtn.addEventListener('click', () => {
            const isExpanded = rssEl.dataset.expanded === 'true';
            rssEl.dataset.expanded = isExpanded ? 'false' : 'true';
            moreBtn.textContent = isExpanded ? 'Mehr anzeigen' : 'Weniger anzeigen';
            renderRSSItems(rssEl);
        });
    }

    if (refreshBtn) {
        if (refreshBtn.dataset.eventsBound) return;
        refreshBtn.dataset.eventsBound = "true";

        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('rotating');
            await fetchRSS(rssEl);
            if (icon) icon.classList.remove('rotating');
        });
    }

    // Trigger initial fetch
    fetchRSS(rssEl);
}

// ========== GOOGLE CALENDAR INTEGRATION LOGIC ==========

async function linkGoogleAccount() {
    const client = getSupabaseClient();
    if (!client) return;
    localStorage.removeItem('google-calendar-disconnected');
    const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname,
            scopes: 'https://www.googleapis.com/auth/calendar.readonly'
        }
    });
    if (error) {
        console.error('Failed to link Google account', error);
        alert('Fehler bei der Google-Verbindung: ' + error.message);
    }
}

async function updateGoogleCalendarStatus() {
    const statusContainer = document.getElementById('google-calendar-status');
    if (!statusContainer) return;

    const client = getSupabaseClient();
    if (!client) {
        statusContainer.innerHTML = `<span class="status-badge">Nicht verbunden</span>`;
        return;
    }

    const { data: { session } } = await client.auth.getSession();
    const disconnected = localStorage.getItem('google-calendar-disconnected') === 'true';

    if (session && session.provider_token && !disconnected) {
        statusContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-badge badge-green-sm" style="margin-right: 4px;">Verbunden</span>
                <button type="button" id="btn-disconnect-google" class="btn-link-google btn-text">Trennen</button>
            </div>
        `;
        const disconnectBtn = document.getElementById('btn-disconnect-google');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                localStorage.setItem('google-calendar-disconnected', 'true');
                updateGoogleCalendarStatus();
                renderTimelineEvents();
            });
        }
    } else {
        statusContainer.innerHTML = `
            <button type="button" id="btn-link-google" class="btn-link-google btn-text">Verknüpfen</button>
        `;
        const linkBtn = document.getElementById('btn-link-google');
        if (linkBtn) {
            linkBtn.addEventListener('click', linkGoogleAccount);
        }
    }
}

function parseAllDayDate(dateStr) {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function parseEvent(evt) {
    const isAllDay = !evt.start.dateTime;
    let dateObj;
    let dateStr;

    if (isAllDay) {
        dateStr = evt.start.date;
        dateObj = parseAllDayDate(dateStr);
    } else {
        dateStr = evt.start.dateTime.split('T')[0];
        dateObj = new Date(evt.start.dateTime);
    }

    let timeStr = 'Ganztägig';
    if (!isAllDay) {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
    }

    return {
        id: evt.id || Math.random().toString(36).substring(2, 9),
        title: evt.summary || '(Kein Titel)',
        dateStr: dateStr,
        dateObj: dateObj,
        timeStr: timeStr,
        isAllDay: isAllDay,
        source: evt.calendarName || evt.source || 'Google Calendar',
        sourceClass: evt.sourceClass || 'source-google',
        calendarColor: evt.calendarColor || null
    };
}

function sortEvents(events) {
    return events.sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return a.dateObj - b.dateObj;
    });
}

function getGermanDayLabel(dateStr) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const pad = num => String(num).padStart(2, '0');
    const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const todayStr = toKey(today);
    const tomorrowStr = toKey(tomorrow);

    if (dateStr === todayStr) {
        return 'Heute';
    } else if (dateStr === tomorrowStr) {
        return 'Morgen';
    } else {
        const parts = dateStr.split('-');
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        return weekdays[dateObj.getDay()];
    }
}

function getGermanFormattedDate(dateStr) {
    const parts = dateStr.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const months = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return `${dateObj.getDate()}. ${months[dateObj.getMonth()]}`;
}

async function fetchGoogleCalendarList(providerToken) {
    const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${providerToken}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const err = new Error(errorData.error?.message || 'Google Calendar List Error');
        err.status = status;
        throw err;
    }

    const data = await response.json();
    return data.items || [];
}

async function fetchGoogleCalendarEvents(providerToken) {
    // 1. Fetch all calendars first
    const calendars = await fetchGoogleCalendarList(providerToken);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const timeMin = todayStart.toISOString();

    const twoWeeksLater = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    const timeMax = twoWeeksLater.toISOString();

    // 2. Fetch events from all selected calendars in parallel
    const fetchPromises = calendars.map(async (cal) => {
        // Skip hidden/unselected calendars
        if (cal.selected === false) return [];

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${providerToken}`
                }
            });
            if (!response.ok) {
                console.warn(`Failed to fetch events for calendar ${cal.summary} (${cal.id})`);
                return [];
            }
            const data = await response.json();
            return (data.items || []).map(item => ({
                ...item,
                calendarName: cal.summary,
                calendarColor: cal.backgroundColor || null
            }));
        } catch (e) {
            console.warn(`Error fetching events for calendar ${cal.summary}:`, e);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    
    // 3. Flatten and return all events
    return results.flat();
}

async function renderTimelineEvents(forceRefresh = false) {
    const container = document.getElementById('timeline-events-container');
    const spinner = document.getElementById('timeline-spinner');
    if (!container) return;

    if (spinner) spinner.classList.remove('hidden');

    const client = getSupabaseClient();
    let session = null;
    if (client) {
        const { data } = await client.auth.getSession();
        session = data.session;
    }

    const disconnected = localStorage.getItem('google-calendar-disconnected') === 'true';
    const isConnected = !!(session && session.provider_token && !disconnected);

    let rawEvents = [];
    let fetchError = null;

    if (isConnected) {
        try {
            rawEvents = await fetchGoogleCalendarEvents(session.provider_token);
        } catch (err) {
            console.error('Error fetching Google Calendar events:', err);
            fetchError = err;
        }
    }

    if (spinner) spinner.classList.add('hidden');

    if (fetchError) {
        if (fetchError.status === 401) {
            container.innerHTML = `
                <div class="timeline-error-banner">
                    <span>Google-Verbindung abgelaufen. Bitte erneut anmelden/verknüpfen.</span>
                    <button type="button" id="btn-reconnect-google">Erneut verbinden</button>
                </div>
            `;
            const reconnectBtn = document.getElementById('btn-reconnect-google');
            if (reconnectBtn) {
                reconnectBtn.addEventListener('click', linkGoogleAccount);
            }
            return;
        } else {
            container.innerHTML = `
                <div class="timeline-error-banner">
                    <span>Fehler beim Abrufen der Google Kalendereinträge: ${fetchError.message}</span>
                    <button type="button" id="btn-retry-timeline">Erneut versuchen</button>
                </div>
            `;
            const retryBtn = document.getElementById('btn-retry-timeline');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => renderTimelineEvents(true));
            }
            return;
        }
    }

    if (!isConnected) {
        container.innerHTML = `
            <div class="timeline-empty-state">
                <span class="material-symbols-outlined timeline-empty-icon">link_off</span>
                <div class="timeline-empty-title">Google Kalender nicht verknüpft</div>
                <div class="timeline-empty-desc">Verknüpfe deinen Google-Kalender in den Einstellungen, um deine Termine anzuzeigen.</div>
            </div>
        `;
        return;
    }

    if (rawEvents.length === 0) {
        container.innerHTML = `
            <div class="timeline-empty-state">
                <span class="material-symbols-outlined timeline-empty-icon">event_busy</span>
                <div class="timeline-empty-title">Keine Einträge</div>
                <div class="timeline-empty-desc">In den nächsten 2 Wochen stehen keine Termine an.</div>
            </div>
        `;
        return;
    }

    const parsedEvents = rawEvents.map(parseEvent);
    const groups = {};
    parsedEvents.forEach(evt => {
        if (!groups[evt.dateStr]) {
            groups[evt.dateStr] = [];
        }
        groups[evt.dateStr].push(evt);
    });

    const sortedDates = Object.keys(groups).sort();
    container.innerHTML = '';
    
    sortedDates.forEach(dateStr => {
        const eventsInDay = sortEvents(groups[dateStr]);
        const dayLabel = getGermanDayLabel(dateStr);
        const formattedDate = getGermanFormattedDate(dateStr);
        const isHighlight = dayLabel === 'Heute' || dayLabel === 'Morgen';

        const dayEl = document.createElement('div');
        dayEl.className = 'timeline-day';

        const headerEl = document.createElement('div');
        headerEl.className = 'timeline-day-header';
        headerEl.innerHTML = `
            <span class="day-label ${isHighlight ? 'day-highlight' : ''}">${dayLabel}</span>
            <span class="day-date">${formattedDate}</span>
        `;
        dayEl.appendChild(headerEl);

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'timeline-events';

        eventsInDay.forEach(evt => {
            const eventEl = document.createElement('div');
            eventEl.className = 'timeline-event';
            
            const timeClass = evt.isAllDay ? 'event-time event-allday' : 'event-time';
            
            const sourceStyle = evt.calendarColor ? `style="color: ${evt.calendarColor}"` : '';

            eventEl.innerHTML = `
                <span class="${timeClass}">${evt.timeStr}</span>
                <div class="event-details">
                    <span class="event-title">${evt.title}</span>
                    <span class="event-source ${evt.sourceClass}" ${sourceStyle}>${evt.source}</span>
                </div>
            `;
            eventsContainer.appendChild(eventEl);
        });

        dayEl.appendChild(eventsContainer);
        container.appendChild(dayEl);
    });
}

function initTimelineRefresh() {
    const refreshBtn = document.getElementById('btn-timeline-refresh');
    if (refreshBtn) {
        if (refreshBtn.dataset.eventsBound) return;
        refreshBtn.dataset.eventsBound = "true";

        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('rotating');
            await renderTimelineEvents(true);
            if (icon) icon.classList.remove('rotating');
        });
    }
}

// Expose functions globally for testing purposes
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
    window.getWeatherData = getWeatherData;
    window.fetchWeather = fetchWeather;
    window.initWeatherWidget = initWeatherWidget;
    window.getRelativeTime = getRelativeTime;
    window.fetchRSS = fetchRSS;
    window.renderRSSItems = renderRSSItems;
    window.initRSSWidget = initRSSWidget;
    window.linkGoogleAccount = linkGoogleAccount;
    window.updateGoogleCalendarStatus = updateGoogleCalendarStatus;
    window.parseAllDayDate = parseAllDayDate;
    window.parseEvent = parseEvent;
    window.sortEvents = sortEvents;
    window.getGermanDayLabel = getGermanDayLabel;
    window.getGermanFormattedDate = getGermanFormattedDate;
    window.fetchGoogleCalendarEvents = fetchGoogleCalendarEvents;
    window.renderTimelineEvents = renderTimelineEvents;
    window.initTimelineRefresh = initTimelineRefresh;
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
        // Listen to initial and subsequent Auth state changes first to catch early events
        client.auth.onAuthStateChange((event, session) => {
            authLoaded = true;
            clearTimeout(timeoutId);
            handleAuthStateChange(event, session);
        });

        // Explicitly check current session to transition out of loading state
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        
        // If the onAuthStateChange hasn't triggered yet, run it with initial session
        if (!authLoaded) {
            authLoaded = true;
            clearTimeout(timeoutId);
            handleAuthStateChange('INITIAL', data ? data.session : null);
        }
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
    
    // Clean up url hash if redirect contains token
    if (session && window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('id_token'))) {
        try {
            history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch (e) {
            console.warn('Failed to clean up URL hash', e);
        }
    }
    
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
            updateGoogleCalendarStatus();
            
            // Render timeline if active
            const currentActiveScreen = document.querySelector('.screen.active');
            if (currentActiveScreen && currentActiveScreen.id === 'screen-timeline') {
                initTimelineRefresh();
                renderTimelineEvents();
            }
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
            if (grid) {
                grid.innerHTML = '';
                delete grid.dataset.eventsBound;
            }
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

    // Google Sign-In button click
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const client = getSupabaseClient();
            if (!client) {
                showAuthError('Supabase Client nicht initialisiert.');
                return;
            }
            localStorage.removeItem('google-calendar-disconnected');
            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname,
                    scopes: 'https://www.googleapis.com/auth/calendar.readonly'
                }
            });
            if (error) {
                showAuthError(error.message);
            }
        });
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

/**
 * Pull to Refresh for Mobile Devices
 */
function initPullToRefresh() {
    const screenContent = document.querySelector('#screen-home .screen-content');
    if (!screenContent) return;

    // Create the pull-to-refresh container dynamically
    const ptrContainer = document.createElement('div');
    ptrContainer.className = 'ptr-container';
    ptrContainer.innerHTML = `
        <span class="material-symbols-outlined ptr-icon">arrow_downward</span>
        <span class="ptr-text">Zum Aktualisieren ziehen</span>
    `;
    screenContent.insertBefore(ptrContainer, screenContent.firstChild);

    let startY = 0;
    let currentY = 0;
    let pulling = false;
    const threshold = 80; // px
    const maxPull = 120; // px

    screenContent.addEventListener('touchstart', (e) => {
        // Only start pulling if scrolled to the top
        if (screenContent.scrollTop === 0) {
            startY = e.touches[0].pageY;
            pulling = true;
            ptrContainer.classList.remove('resetting', 'ready', 'loading');
        }
    }, { passive: true });

    screenContent.addEventListener('touchmove', (e) => {
        if (!pulling) return;

        currentY = e.touches[0].pageY;
        const diff = currentY - startY;

        if (diff > 0 && screenContent.scrollTop === 0) {
            // Prevent native bounce scroll / standard pull-to-refresh if possible
            if (e.cancelable) {
                e.preventDefault();
            }

            // Apply resistance formula so pulling feels elastic/tactile
            const pullDistance = Math.min(diff * 0.5, maxPull);
            
            ptrContainer.style.height = `${pullDistance}px`;
            ptrContainer.style.opacity = Math.min(pullDistance / threshold, 1);

            // Rotate the arrow icon as user pulls
            const icon = ptrContainer.querySelector('.ptr-icon');
            if (icon) {
                const rotation = Math.min((pullDistance / threshold) * 180, 180);
                icon.style.transform = `rotate(${rotation}deg)`;
            }

            if (pullDistance >= threshold) {
                ptrContainer.classList.add('ready');
                ptrContainer.querySelector('.ptr-text').textContent = 'Zum Aktualisieren loslassen';
            } else {
                ptrContainer.classList.remove('ready');
                ptrContainer.querySelector('.ptr-text').textContent = 'Zum Aktualisieren ziehen';
            }
        } else {
            // If user scrolls up, reset pulling state
            pulling = false;
            resetPTR();
        }
    }, { passive: false });

    screenContent.addEventListener('touchend', () => {
        if (!pulling) return;
        pulling = false;

        const diff = currentY - startY;
        const pullDistance = Math.min(diff * 0.5, maxPull);

        if (pullDistance >= threshold) {
            // Trigger refresh
            ptrContainer.classList.add('loading');
            ptrContainer.classList.remove('ready');
            ptrContainer.querySelector('.ptr-text').textContent = 'Lade neu...';
            ptrContainer.style.height = '60px';
            ptrContainer.style.opacity = '1';

            // Brief delay for visual feedback, then reload page
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            resetPTR();
        }
    });

    screenContent.addEventListener('touchcancel', () => {
        pulling = false;
        resetPTR();
    });

    function resetPTR() {
        ptrContainer.classList.add('resetting');
        ptrContainer.style.height = '0px';
        ptrContainer.style.opacity = '0';
        const icon = ptrContainer.querySelector('.ptr-icon');
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }
        setTimeout(() => {
            ptrContainer.classList.remove('resetting');
        }, 300);
    }
}

// Bootstrap execution
const startApp = async () => {
    initNavigation();
    initPullToRefresh();
    await loadConfigScript();
    initAuth();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
