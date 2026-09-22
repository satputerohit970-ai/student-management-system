/**
 * Student Management System - Authentication Guard & Common Shell
 */

document.addEventListener('DOMContentLoaded', async () => {
    const isLoginPage = window.location.pathname.endsWith('login.html');

    try {
        const res = await API.get('/api/me');
        
        if (res.authenticated) {
            if (isLoginPage) {
                window.location.href = 'dashboard.html';
                return;
            }
            // Populate user interface elements
            populateUserProfile(res.user);
        } else {
            if (!isLoginPage && !window.location.pathname.endsWith('index.html')) {
                window.location.href = 'login.html';
                return;
            }
        }
    } catch (err) {
        if (!isLoginPage && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'login.html';
            return;
        }
    }

    // Initialize shell features if not on login page
    if (!isLoginPage) {
        initCommonShell();
    }
});

function populateUserProfile(user) {
    if (!user) return;
    const nameEls = document.querySelectorAll('.user-name-display');
    nameEls.forEach(el => el.textContent = user.full_name || user.username);

    const avatarEls = document.querySelectorAll('.user-avatar-display');
    const initials = (user.full_name || user.username || 'A').charAt(0).toUpperCase();
    avatarEls.forEach(el => el.textContent = initials);
}

function initCommonShell() {
    // 1. Mobile Sidebar Toggle
    const mobileBtn = document.querySelector('.mobile-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }

    // 2. Real-time Live Clock
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        const updateClock = () => {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            clockEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${dateStr} • ${timeStr}`;
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // 3. Logout Button Action
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await API.post('/api/logout');
                showToast('Logged out successfully', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 400);
            } catch (err) {
                window.location.href = 'login.html';
            }
        });
    }

    // 4. Highlight active navigation item
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (currentPath.endsWith(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}
