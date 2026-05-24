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
        }

        if (externalUrl) {
            modelViewer.src = externalUrl;
            if (titleText) titleText.textContent = 'Modelo remoto';
        } else if (localStorage.getItem('hasCustomModel')) {
            const blob = await getModelFromDB();
            if (blob) {
                modelViewer.src = URL.createObjectURL(blob);
                if (titleText) titleText.textContent = localStorage.getItem('modelName') || 'Análise ativa';
            }
        } else if (titleText) {
            titleText.textContent = 'Modelo padrão';
        }
    }

    init();

    modelViewer.addEventListener('load', () => {
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 450);
        }
    });

    modelViewer.addEventListener('error', (event) => {
        console.error('Erro no Model Viewer:', event);
    });
});
