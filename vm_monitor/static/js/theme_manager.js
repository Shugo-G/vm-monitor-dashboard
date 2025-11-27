/**
 * 1. Inicializa el tema al cargar la página.
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

/**
 * 2. Aplica el tema (light o dark) agregando/removiendo la clase dark-theme al body.
 * @param {string} theme - 'light' o 'dark'
 */
function applyTheme(theme) {
    const toggleButton = document.getElementById('theme-toggle');

    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (toggleButton) {
            toggleButton.innerHTML = '☀️ Tema Claro';
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (toggleButton) {
            toggleButton.innerHTML = '🌙 Tema Oscuro';
        }
    }

    localStorage.setItem('theme', theme);
}

/**
 * 3. Alterna entre los temas al hacer click en el botón.
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

document.addEventListener('DOMContentLoaded', initializeTheme);