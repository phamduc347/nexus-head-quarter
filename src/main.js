/**
 * Nexus HQ — Main Application Bootstrap
 * Handles screen navigation and basic interactions
 */


document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
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
