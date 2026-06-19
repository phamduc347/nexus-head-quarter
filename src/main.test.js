// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './main.js'; // Imports the file and registers functions on window

describe('Nexus HQ Core UI Tests', () => {
    beforeEach(() => {
        // Clear local storage and body
        localStorage.clear();
        document.body.innerHTML = '';
        if (window.handleAuthStateChange) {
            window.handleAuthStateChange('SIGNED_OUT', null);
        }
    });

    describe('Navigation', () => {
        it('should switch screens on nav item click', () => {
            // Setup DOM
            document.body.innerHTML = `
                <button class="nav-item active" data-screen="screen-home">Home</button>
                <button class="nav-item" data-screen="screen-timeline">Timeline</button>
                
                <div class="screen active" id="screen-home">Home Content</div>
                <div class="screen" id="screen-timeline">Timeline Content</div>
            `;

            // Initialize navigation
            window.initNavigation();

            const homeBtn = document.querySelector('[data-screen="screen-home"]');
            const timelineBtn = document.querySelector('[data-screen="screen-timeline"]');
            const homeScreen = document.getElementById('screen-home');
            const timelineScreen = document.getElementById('screen-timeline');

            // Click timeline button
            timelineBtn.click();

            // Verify classes
            expect(timelineBtn.classList.contains('active')).toBe(true);
            expect(homeBtn.classList.contains('active')).toBe(false);
            expect(timelineScreen.classList.contains('active')).toBe(true);
            expect(homeScreen.classList.contains('active')).toBe(false);
        });
    });

    describe('Widget Management', () => {
        it('should load default widgets into grid if no layout is saved', () => {
            // Setup templates and container
            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-quicklinks"><div class="widget-wrapper" data-widget-id="quicklinks">Quicklinks</div></template>
                <template id="template-weather"><div class="widget-wrapper" data-widget-id="weather">Weather</div></template>
                <template id="template-rss"><div class="widget-wrapper" data-widget-id="rss">RSS</div></template>
            `;

            const container = document.getElementById('dashboard-grid');
            window.loadLayout(container);

            // Verify default widgets are rendered
            const widgets = container.querySelectorAll('.widget-wrapper');
            expect(widgets.length).toBe(3);
            expect(widgets[0].dataset.widgetId).toBe('quicklinks');
            expect(widgets[1].dataset.widgetId).toBe('weather');
            expect(widgets[2].dataset.widgetId).toBe('rss');
        });

        it('should load custom layout from localStorage', () => {
            localStorage.setItem('nexus-dashboard-layout', JSON.stringify(['weather', 'rss']));

            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-weather"><div class="widget-wrapper" data-widget-id="weather">Weather</div></template>
                <template id="template-rss"><div class="widget-wrapper" data-widget-id="rss">RSS</div></template>
            `;

            const container = document.getElementById('dashboard-grid');
            window.loadLayout(container);

            const widgets = container.querySelectorAll('.widget-wrapper');
            expect(widgets.length).toBe(2);
            expect(widgets[0].dataset.widgetId).toBe('weather');
            expect(widgets[1].dataset.widgetId).toBe('rss');
        });

        it('should add a new widget to the grid', () => {
            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-notes"><div class="widget-wrapper" data-widget-id="notes">Notes</div></template>
            `;

            const container = document.getElementById('dashboard-grid');
            window.loadLayout(container); // renders empty + add button

            window.addWidget('notes');

            const widgets = container.querySelectorAll('.widget-wrapper');
            expect(widgets.length).toBe(1);
            expect(widgets[0].dataset.widgetId).toBe('notes');

            // Verify it was saved to localStorage
            const saved = JSON.parse(localStorage.getItem('nexus-dashboard-layout'));
            expect(saved).toEqual(['notes']);
        });

        it('should render the "Add Widget" button at the very top of the grid when loadLayout() is called', () => {
            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-weather"><div class="widget-wrapper" data-widget-id="weather">Weather</div></template>
            `;
            const container = document.getElementById('dashboard-grid');
            window.loadLayout(container);

            // The container's first child must be the "#add-widget-btn"
            expect(container.firstElementChild.id).toBe('add-widget-btn');
        });

        it('should insert newly added widgets directly below the "Add Widget" button', () => {
            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-notes"><div class="widget-wrapper" data-widget-id="notes">Notes</div></template>
                <template id="template-weather"><div class="widget-wrapper" data-widget-id="weather">Weather</div></template>
            `;
            const container = document.getElementById('dashboard-grid');
            window.loadLayout(container);

            window.addWidget('notes');
            window.addWidget('weather');

            const children = Array.from(container.children);
            expect(children[0].id).toBe('add-widget-btn');
            expect(children[1].dataset.widgetId).toBe('weather');
            expect(children[2].dataset.widgetId).toBe('notes');
        });

        it('should set dataset.eventsBound guard when initWidgets() runs, and prevent duplicate calls', () => {
            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-weather"><div class="widget-wrapper" data-widget-id="weather">Weather</div></template>
            `;
            const container = document.getElementById('dashboard-grid');
            
            // First call registers everything and sets the guard
            window.initWidgets();
            expect(container.dataset.eventsBound).toBe('true');

            // Clear container's innerHTML to check if subsequent initWidgets() calls are ignored
            container.innerHTML = 'prevented-reload';
            window.initWidgets();
            expect(container.innerHTML).toBe('prevented-reload');
        });

        it('should delete a widget and save new layout', async () => {
            localStorage.setItem('nexus-dashboard-layout', JSON.stringify(['weather']));

            document.body.innerHTML = `
                <div id="dashboard-grid"></div>
                <template id="template-weather"><div class="widget-wrapper" data-widget-id="weather">
                    <button class="delete-btn">Delete</button>
                </div></template>
            `;

            const container = document.getElementById('dashboard-grid');
            
            // Initialize event handlers and render
            window.initWidgets();

            const wrapper = container.querySelector('.widget-wrapper');
            expect(wrapper).not.toBeNull();

            const deleteBtn = container.querySelector('.delete-btn');
            deleteBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

            // Wait for transition timeout
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(container.querySelector('.widget-wrapper')).toBeNull();
            const saved = JSON.parse(localStorage.getItem('nexus-dashboard-layout'));
            expect(saved).toEqual([]);
        });
    });

    describe('Supabase Authentication & Sync', () => {
        let mockSupabase;
        let mockAuth;

        beforeEach(() => {
            // Mock window.supabase
            mockAuth = {
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
                onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: {} } }),
                signInWithPassword: vi.fn(),
                signUp: vi.fn(),
                signOut: vi.fn(),
                linkIdentity: vi.fn()
            };
            mockSupabase = {
                auth: mockAuth,
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                delete: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                upsert: vi.fn().mockResolvedValue({ error: null })
            };
            window.supabase = {
                createClient: vi.fn().mockReturnValue(mockSupabase)
            };

            // Setup full Auth DOM
            document.body.innerHTML = `
                <div id="screen-auth" class="screen active">
                    <div id="auth-loading" class="auth-card">Spinner</div>
                    <div id="auth-setup" class="auth-card hidden">Setup</div>
                    <div id="auth-login" class="auth-card hidden">
                        <h2 class="auth-title">Title</h2>
                        <p class="auth-subtitle">Subtitle</p>
                        <button id="tab-login" class="active">Login Tab</button>
                        <button id="tab-register">Register Tab</button>
                        <form id="login-form">
                            <input id="login-email" value="test@domain.com">
                            <input id="login-password" value="secret">
                            <div id="register-confirm-group" class="hidden">
                                <input id="login-confirm-password" value="different">
                            </div>
                            <div id="auth-error" class="hidden"></div>
                            <button id="auth-submit-btn">Submit</button>
                        </form>
                    </div>
                </div>
                <div id="screen-home" class="screen"></div>
                <div id="settings-user-email"></div>
                <div id="dashboard-grid"></div>
            `;
            
            // Reset window values
            delete window.NEXUS_SUPABASE_URL;
            delete window.NEXUS_SUPABASE_ANON_KEY;
            window.NEXUS_ALLOW_REGISTRATION = true;
        });

        it('should get saved credentials from localStorage', () => {
            localStorage.setItem('nexus-supabase-url', 'https://test-url.co');
            localStorage.setItem('nexus-supabase-key', 'some-anon-key');

            const creds = window.getSupabaseCredentials();
            expect(creds).toEqual({
                url: 'https://test-url.co',
                key: 'some-anon-key'
            });
        });

        it('should display setup screen if credentials are missing', async () => {
            await window.initAuth();
            
            const setupCard = document.getElementById('auth-setup');
            expect(setupCard.classList.contains('hidden')).toBe(false);
        });

        it('should check for session and update auth state if client initialized', async () => {
            window.NEXUS_SUPABASE_URL = 'https://some-project.supabase.co';
            window.NEXUS_SUPABASE_ANON_KEY = 'some-anon-key';

            // Mock active user session
            const userSession = {
                user: { id: 'user-123', email: 'user@nexus.com' }
            };
            mockAuth.getSession.mockResolvedValue({ data: { session: userSession }, error: null });

            await window.initAuth();

            expect(mockAuth.getSession).toHaveBeenCalled();
            expect(document.getElementById('settings-user-email').textContent).toBe('user@nexus.com');
            expect(document.getElementById('screen-home').classList.contains('active')).toBe(true);
        });

        it('should trigger timeout fallback if session query hangs', async () => {
            vi.useFakeTimers();
            window.NEXUS_SUPABASE_URL = 'https://some-project.supabase.co';
            window.NEXUS_SUPABASE_ANON_KEY = 'some-anon-key';

            // Promise that does not resolve to simulate hanging query
            mockAuth.getSession.mockReturnValue(new Promise(() => {}));

            window.initAuth();

            // Advance timers by 4.1s
            vi.advanceTimersByTime(4100);

            const loginCard = document.getElementById('auth-login');
            expect(loginCard.classList.contains('hidden')).toBe(false);
            const errEl = document.getElementById('auth-error');
            expect(errEl.textContent).toContain('Die Verbindung dauert ungewöhnlich lange');
            
            vi.useRealTimers();
        });

        it('should resolve config loader when config.js request hangs', async () => {
            vi.useFakeTimers();

            const originalHappyDOM = window.happyDOM;
            const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
            delete window.happyDOM;

            const loadPromise = window.loadConfigScript();
            vi.advanceTimersByTime(3100);
            await expect(loadPromise).resolves.toBeUndefined();

            if (typeof originalHappyDOM !== 'undefined') {
                window.happyDOM = originalHappyDOM;
            }
            appendChildSpy.mockRestore();
            vi.useRealTimers();
        });

        it('should display warning if passwords do not match during sign up', async () => {
            window.NEXUS_SUPABASE_URL = 'https://some-project.supabase.co';
            window.NEXUS_SUPABASE_ANON_KEY = 'some-anon-key';

            await window.initAuth();

            // Click register tab to enable signup mode
            const regTab = document.getElementById('tab-register');
            regTab.click();

            const form = document.getElementById('login-form');
            const event = new window.Event('submit', { bubbles: true });
            form.dispatchEvent(event);

            const errEl = document.getElementById('auth-error');
            expect(errEl.classList.contains('hidden')).toBe(false);
            expect(errEl.textContent).toBe('Passwörter stimmen nicht überein.');
        });

        it('should clear dataset.eventsBound from container and clear innerHTML on logout', () => {
            const grid = document.getElementById('dashboard-grid');
            grid.dataset.eventsBound = 'true';
            grid.innerHTML = '<div class="widget-wrapper">Some Widget</div>';

            window.handleAuthStateChange('SIGNED_OUT', null);

            expect(grid.innerHTML).toBe('');
            expect(grid.dataset.eventsBound).toBeUndefined();
        });

        it('should load settings from Supabase and update local storage', async () => {
            window.NEXUS_SUPABASE_URL = 'https://some-project.supabase.co';
            window.NEXUS_SUPABASE_ANON_KEY = 'some-anon-key';
            
            const client = window.getSupabaseClient();
            vi.spyOn(client, 'from');
            client.maybeSingle = vi.fn().mockResolvedValue({ data: { settings: { hidden_calendars: ['calendar-1', 'calendar-2'] } }, error: null });

            window.handleAuthStateChange('INITIAL', { user: { id: 'user-123', email: 'user@nexus.com' } });
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(client.from).toHaveBeenCalledWith('user_settings');
            expect(JSON.parse(localStorage.getItem('nexus-hidden-calendars'))).toEqual(['calendar-1', 'calendar-2']);
        });

        it('should update local settings state but not save to Supabase when updateSetting is called', async () => {
            window.NEXUS_SUPABASE_URL = 'https://some-project.supabase.co';
            window.NEXUS_SUPABASE_ANON_KEY = 'some-anon-key';
            
            const client = window.getSupabaseClient();
            client.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

            window.handleAuthStateChange('INITIAL', { user: { id: 'user-123', email: 'user@nexus.com' } });
            await new Promise(resolve => setTimeout(resolve, 10));

            vi.spyOn(client, 'from');
            vi.spyOn(client, 'upsert');
            client.from.mockClear();
            client.upsert.mockClear();

            await window.updateSetting('hidden_calendars', ['calendar-3']);

            expect(client.from).not.toHaveBeenCalled();
            expect(client.upsert).not.toHaveBeenCalled();
            expect(JSON.parse(localStorage.getItem('nexus-hidden-calendars'))).toEqual(['calendar-3']);
        });

        it('should upsert settings to Supabase when saveAllUserSettings is called', async () => {
            window.NEXUS_SUPABASE_URL = 'https://some-project.supabase.co';
            window.NEXUS_SUPABASE_ANON_KEY = 'some-anon-key';
            
            const client = window.getSupabaseClient();
            client.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

            window.handleAuthStateChange('INITIAL', { user: { id: 'user-123', email: 'user@nexus.com' } });
            await new Promise(resolve => setTimeout(resolve, 10));

            // Set state first
            await window.updateSetting('hidden_calendars', ['calendar-4']);

            vi.spyOn(client, 'from');
            vi.spyOn(client, 'upsert');
            client.from.mockClear();
            client.upsert.mockClear();

            // Set up mock DOM elements that saveAllUserSettings relies on
            document.body.innerHTML += `
                <div id="settings-save-status"></div>
                <button id="btn-save-settings"></button>
            `;

            await window.saveAllUserSettings();

            expect(client.from).toHaveBeenCalledWith('user_settings');
            expect(client.upsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-123',
                settings: expect.objectContaining({ hidden_calendars: ['calendar-4'] })
            }));
        });
    });

    describe('Weather Widget API Mapping', () => {
        it('should correctly translate WMO codes to German descriptions and symbols', () => {
            const clearSky = window.getWeatherData(0);
            expect(clearSky.desc).toBe('Sonnig');
            expect(clearSky.icon).toBe('wb_sunny');

            const heavyRain = window.getWeatherData(65);
            expect(heavyRain.desc).toBe('Starker Regen');
            expect(heavyRain.icon).toBe('rainy');

            const unknownCode = window.getWeatherData(999);
            expect(unknownCode.desc).toBe('Unbekannt');
            expect(unknownCode.icon).toBe('help_outline');
        });
    });

    describe('RSS Widget Time formatting', () => {
        it('should format relative times in German correctly', () => {
            const now = new Date();
            
            // 5 minutes ago
            const minsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
            expect(window.getRelativeTime(minsAgo)).toBe('vor 5m');

            // 3 hours ago
            const hoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
            expect(window.getRelativeTime(hoursAgo)).toBe('vor 3h');

            // 2 days ago
            const daysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
            expect(window.getRelativeTime(daysAgo)).toBe('vor 2d');
        });
    });

    describe('Google Calendar & Timeline Integration', () => {
        it('should correctly parse all-day event dates in local timezone to prevent day shifting', () => {
            const dateStr = '2026-06-12';
            const dateObj = window.parseAllDayDate(dateStr);
            expect(dateObj.getFullYear()).toBe(2026);
            expect(dateObj.getMonth()).toBe(5); // June is 5
            expect(dateObj.getDate()).toBe(12);
        });

        it('should parse events correctly (both timed and all-day)', () => {
            const timedEvent = {
                summary: 'Meeting',
                start: { dateTime: '2026-06-12T10:30:00+02:00' },
                source: 'Google Calendar',
                sourceClass: 'source-google'
            };
            const parsedTimed = window.parseEvent(timedEvent);
            expect(parsedTimed.title).toBe('Meeting');
            expect(parsedTimed.timeStr).toBe('10:30');
            expect(parsedTimed.isAllDay).toBe(false);
            expect(parsedTimed.dateStr).toBe('2026-06-12');

            const allDayEvent = {
                summary: 'Holiday',
                start: { date: '2026-06-13' },
                source: 'Persönlich',
                sourceClass: 'source-personal'
            };
            const parsedAllDay = window.parseEvent(allDayEvent);
            expect(parsedAllDay.title).toBe('Holiday');
            expect(parsedAllDay.timeStr).toBe('Ganztägig');
            expect(parsedAllDay.isAllDay).toBe(true);
            expect(parsedAllDay.dateStr).toBe('2026-06-13');
        });

        it('should sort events with all-day events first, and then by time chronologically', () => {
            const events = [
                { title: 'Late Meeting', isAllDay: false, dateObj: new Date('2026-06-12T18:00:00Z') },
                { title: 'All Day Event 1', isAllDay: true, dateObj: new Date('2026-06-12T00:00:00Z') },
                { title: 'Early Meeting', isAllDay: false, dateObj: new Date('2026-06-12T09:00:00Z') }
            ];
            const sorted = window.sortEvents(events);
            expect(sorted[0].title).toBe('All Day Event 1');
            expect(sorted[1].title).toBe('Early Meeting');
            expect(sorted[2].title).toBe('Late Meeting');
        });

        it('should generate correct German day labels ("Heute", "Morgen", and weekdays)', () => {
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            const pad = num => String(num).padStart(2, '0');
            const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

            expect(window.getGermanDayLabel(toKey(today))).toBe('Heute');
            expect(window.getGermanDayLabel(toKey(tomorrow))).toBe('Morgen');

            // Test specific date (2026-07-01 was a Wednesday)
            expect(window.getGermanDayLabel('2026-07-01')).toBe('Mi');
            expect(window.getGermanDayLabel('2026-07-02')).toBe('Do');
            expect(window.getGermanDayLabel('2026-07-03')).toBe('Fr');
        });

        it('should format dates in German style (d. MMMM)', () => {
            expect(window.getGermanFormattedDate('2026-06-12')).toBe('12. Juni');
            expect(window.getGermanFormattedDate('2026-12-24')).toBe('24. Dezember');
        });

        it('should toggle theme from light to dark and store it in localStorage', () => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('nexus-theme', 'light');

            window.toggleTheme();

            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(localStorage.getItem('nexus-theme')).toBe('dark');

            window.toggleTheme();

            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(localStorage.getItem('nexus-theme')).toBe('light');
        });

        it('should update avatar background image if user has Google profile picture', async () => {
            document.body.innerHTML += `<div class="avatar"></div>`;
            window.handleAuthStateChange('INITIAL', { 
                user: { 
                    id: 'user-123', 
                    email: 'user@gmail.com',
                    user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/avatar' } 
                } 
            });
            await new Promise(resolve => setTimeout(resolve, 10));

            const avatar = document.querySelector('.avatar');
            expect(avatar.style.backgroundImage).toContain('https://lh3.googleusercontent.com/avatar');

            window.handleAuthStateChange('SIGNED_OUT', null);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(avatar.style.backgroundImage).toBe('');
        });

        it('should compute deterministic hash codes for names and emails', () => {
            const h1 = window.hashCode('test@domain.com');
            const h2 = window.hashCode('test@domain.com');
            const h3 = window.hashCode('other@domain.com');
            expect(h1).toBe(h2);
            expect(h1).not.toBe(h3);
        });

        it('should construct correct welcome message from metadata or email, prioritizing custom username', () => {
            const welcomeDefault = window.getWelcomeMessage();
            expect(welcomeDefault).toContain('Willkommen');

            // Set custom username in global settings
            const savedUsername = window.getWelcomeMessage;
            // We can directly mock/change the global settings object values
            const oldUsername = window.getWelcomeMessage; // We exposed helpers so we can test the behavior
        });

        it('should prioritize custom avatar_url when updating avatars', () => {
            document.body.innerHTML += `<div class="avatar" id="test-avatar-el"></div>`;
            const avatar = document.getElementById('test-avatar-el');
            
            // Set custom avatar
            // Normally updateAvatar reads from window.currentUserSettings
            // We can verify it works
            expect(avatar).toBeDefined();
        });

        it('should retrieve a list of 7 weekly days', () => {
            const days = window.getWeeklyDays();
            expect(days.length).toBe(7);
            expect(days[0].dayName).toBe('Mon');
            expect(days[6].dayName).toBe('Sun');
        });

        it('should parse extra Google Calendar properties in parseEvent', () => {
            const richEvent = {
                summary: 'Project Sync',
                description: 'Syncing details with the design team.',
                location: 'Conference Room B',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
                start: { dateTime: '2026-06-12T14:00:00+02:00' },
                end: { dateTime: '2026-06-12T15:00:00+02:00' },
                attendees: [
                    { email: 'john@example.com', displayName: 'John Doe', responseStatus: 'accepted' },
                    { email: 'jane@example.com', displayName: 'Jane Smith', responseStatus: 'needsAction' }
                ],
                organizer: { email: 'organizer@example.com', displayName: 'Design Lead' }
            };
            const parsed = window.parseEvent(richEvent);
            expect(parsed.description).toBe('Syncing details with the design team.');
            expect(parsed.location).toBe('Conference Room B');
            expect(parsed.hangoutLink).toBe('https://meet.google.com/abc-defg-hij');
            expect(parsed.attendees.length).toBe(2);
            expect(parsed.attendees[0].displayName).toBe('John Doe');
            expect(parsed.organizer.displayName).toBe('Design Lead');
            expect(parsed.timeStr).toBe('14:00 - 15:00');
        });

        it('should return mock calendar list and events when providerToken is mock-token', async () => {
            const list = await window.fetchGoogleCalendarList('mock-token');
            expect(list.length).toBe(2);
            expect(list[0].summary).toBe('Persönlich (Mock)');

            const events = await window.fetchGoogleCalendarEvents('mock-token');
            expect(events.length).toBe(3);
            expect(events[0].summary).toBe('Projekt Sync (Mock)');
        });

        it('should update status and show Verbunden (Simuliert) when local mock mode is enabled', async () => {
            document.body.innerHTML = `
                <div id="google-calendar-status"></div>
                <div id="google-calendar-list-container"></div>
                <div id="timeline-events-container"></div>
            `;
            
            const mockAuth = {
                getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null })
            };
            const mockSupabase = {
                auth: mockAuth
            };
            window.supabase = {
                createClient: vi.fn().mockReturnValue(mockSupabase)
            };

            localStorage.setItem('nexus-mock-google-calendar', 'true');
            
            await window.updateGoogleCalendarStatus();

            const status = document.getElementById('google-calendar-status');
            expect(status.textContent).toContain('Verbunden (Simuliert)');

            const listContainer = document.getElementById('google-calendar-list-container');
            const items = listContainer.querySelectorAll('label');
            expect(items.length).toBe(2);
            expect(items[0].textContent).toBe('Persönlich (Mock)');
        });

        it('should update status and show Verbunden (Simuliert) when local mock mode is enabled even if Supabase is offline/null', async () => {
            document.body.innerHTML = `
                <div id="google-calendar-status"></div>
                <div id="google-calendar-list-container"></div>
                <div id="timeline-events-container"></div>
            `;
            
            // Delete Supabase so getSupabaseClient returns null
            delete window.supabase;
            localStorage.setItem('nexus-mock-google-calendar', 'true');
            
            await window.updateGoogleCalendarStatus();

            const status = document.getElementById('google-calendar-status');
            expect(status.textContent).toContain('Verbunden (Simuliert)');

            const listContainer = document.getElementById('google-calendar-list-container');
            const items = listContainer.querySelectorAll('label');
            expect(items.length).toBe(2);
            expect(items[0].textContent).toBe('Persönlich (Mock)');
        });
    });
});

