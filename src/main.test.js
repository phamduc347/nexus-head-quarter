// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './main.js'; // Imports the file and registers functions on window

describe('Nexus HQ Core UI Tests', () => {
    beforeEach(() => {
        // Clear local storage and body
        localStorage.clear();
        document.body.innerHTML = '';
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
                <template id="template-dhl"><div class="widget-wrapper" data-widget-id="dhl">DHL</div></template>
                <template id="template-rss"><div class="widget-wrapper" data-widget-id="rss">RSS</div></template>
            `;

            const container = document.getElementById('dashboard-grid');
            window.loadLayout(container);

            // Verify default widgets are rendered
            const widgets = container.querySelectorAll('.widget-wrapper');
            expect(widgets.length).toBe(4);
            expect(widgets[0].dataset.widgetId).toBe('quicklinks');
            expect(widgets[1].dataset.widgetId).toBe('weather');
            expect(widgets[2].dataset.widgetId).toBe('dhl');
            expect(widgets[3].dataset.widgetId).toBe('rss');
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
                signOut: vi.fn()
            };
            mockSupabase = {
                auth: mockAuth,
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
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
    });
});

