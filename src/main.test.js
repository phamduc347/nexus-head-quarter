// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
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
});
