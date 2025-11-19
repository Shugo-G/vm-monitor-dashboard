/**
 * 1. Inicializa el tema al cargar la página.
 */
function initializeTheme() {
    // Obtiene el tema guardado en LocalStorage (por defecto 'light')
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

/**
 * 2. Aplica el tema (light o dark) actualizando los archivos CSS y el botón.
 * @param {string} theme - 'light' o 'dark'
 */
function applyTheme(theme) {
    const lightLink = document.getElementById('theme-light');
    const darkLink = document.getElementById('theme-dark');
    const toggleButton = document.getElementById('theme-toggle');

    if (!lightLink || !darkLink) return; // Se necesita al menos CSS

    if (theme === 'dark') {
        lightLink.disabled = true;
        darkLink.disabled = false;
        // document.body.classList.add('dark-mode'); // No es necesario si el CSS_DT tiene todos los estilos
        if (toggleButton) {
            toggleButton.innerHTML = '☀️ Tema Claro';
        }
    } else {
        lightLink.disabled = false;
        darkLink.disabled = true;
        // document.body.classList.remove('dark-mode');
        if (toggleButton) {
            toggleButton.innerHTML = '🌙 Tema Oscuro';
        }
    }
    
    // Guarda la preferencia
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

// Ejecución Inicial: Aplica el tema guardado apenas el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeTheme);