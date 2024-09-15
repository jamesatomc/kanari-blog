document.addEventListener('DOMContentLoaded', () => {
    const modeToggle = document.getElementById('mode-toggle');
    const modeIcon = document.getElementById('mode-icon');
    const mobileModeToggle = document.getElementById('mobile-mode-toggle');
    const mobileModeIcon = document.getElementById('mobile-mode-icon');
    const modes = ['default', 'dark', 'light-orange'];

    // Function to get cookie by name
    function getCookie(name: string): string | null {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }

    // Function to set cookie
    function setCookie(name: string, value: string, days: number): void {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${d.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/`;
    }

    // Get the current mode from cookies
    let currentModeIndex = modes.indexOf(getCookie('mode') || 'default');
    if (currentModeIndex === -1) currentModeIndex = 0;

    // Apply the current mode
    document.documentElement.classList.add(modes[currentModeIndex]);
    updateIcons();

    function updateIcons(): void {
        if (modes[currentModeIndex] === 'dark') {
            modeIcon?.classList.remove('fa-sun');
            modeIcon?.classList.add('fa-moon');
            mobileModeIcon?.classList.remove('fa-sun');
            mobileModeIcon?.classList.add('fa-moon');
        } else if (modes[currentModeIndex] === 'light-orange') {
            modeIcon?.classList.remove('fa-moon');
            modeIcon?.classList.add('fa-sun');
            mobileModeIcon?.classList.remove('fa-moon');
            mobileModeIcon?.classList.add('fa-sun');
        } else {
            modeIcon?.classList.remove('fa-sun', 'fa-moon');
            modeIcon?.classList.add('fa-adjust');
            mobileModeIcon?.classList.remove('fa-sun', 'fa-moon');
            mobileModeIcon?.classList.add('fa-adjust');
        }
    }

    function toggleMode(): void {
        document.documentElement.classList.remove(modes[currentModeIndex]);
        currentModeIndex = (currentModeIndex + 1) % modes.length;
        document.documentElement.classList.add(modes[currentModeIndex]);
        updateIcons();
        setCookie('mode', modes[currentModeIndex], 7);
    }

    if (modeToggle) {
        modeToggle.addEventListener('click', toggleMode);
    } else {
        console.error('Mode toggle button not found');
    }

    if (mobileModeToggle) {
        mobileModeToggle.addEventListener('click', toggleMode);
    } else {
        console.error('Mobile mode toggle button not found');
    }
});