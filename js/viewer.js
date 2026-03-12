document.addEventListener('DOMContentLoaded', () => {
    const modelViewer = document.querySelector('#viewer');
    const loading = document.querySelector('#loading');
    const titleText = document.querySelector('#model-name-ar');

    if (!modelViewer) return;

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const externalUrl = urlParams.get('model');
        const isMinimal = urlParams.get('minimal') === '1';

        if (isMinimal) {
            document.body.classList.add('minimal-mode');
            const overlay = document.querySelector('.model-info-overlay');
            if (overlay) overlay.style.display = 'none';
            const footer = document.querySelector('.mt-4.text-center');
            if (footer) footer.style.display = 'none';
        }

        if (externalUrl) {
            modelViewer.src = externalUrl;
            if (titleText) titleText.textContent = "Modelo Remoto";
        } else if (sessionStorage.getItem('hasCustomModel')) {
            // getModelFromDB() vem do js/db.js
            const blob = await getModelFromDB();
            if (blob) {
                modelViewer.src = URL.createObjectURL(blob);
                if (titleText) titleText.textContent = sessionStorage.getItem('modelName') || "Análise Ativa";
            }
        } else {
            if (titleText) titleText.textContent = "Astronauta (Padrão)";
        }
    }

    init();

    modelViewer.addEventListener('load', () => {
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 600);
        }
    });

    modelViewer.addEventListener('error', (e) => {
        console.error("Erro no Model Viewer:", e);
    });
});
