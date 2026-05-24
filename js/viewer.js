document.addEventListener('DOMContentLoaded', () => {
    const modelViewer = document.querySelector('#viewer');
    const loading = document.querySelector('#loading');
    const titleText = document.querySelector('#model-name-ar');
    let loadingTimer = null;

    if (!modelViewer) return;

    function modelNameFromUrl(url) {
        try {
            return decodeURIComponent(url.split('/').pop().split('?')[0]).replace(/\.glb$/i, '');
        } catch (err) {
            return 'Modelo 3D';
        }
    }

    function setLoadingMessage(message) {
        if (!loading) return;
        loading.style.display = 'grid';
        loading.style.opacity = '1';
        loading.innerHTML = message;
    }

    function hideLoading() {
        clearTimeout(loadingTimer);
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 450);
        }
    }

    function applyViewerDefaults() {
        modelViewer.setAttribute('camera-orbit', '0deg 75deg auto');
        modelViewer.setAttribute('camera-target', 'auto auto auto');
        modelViewer.setAttribute('field-of-view', '32deg');
        modelViewer.setAttribute('bounds', 'tight');
        modelViewer.setAttribute('loading', 'eager');
        modelViewer.setAttribute('reveal', 'auto');
        modelViewer.setAttribute('interaction-prompt', 'auto');
    }

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const externalUrl = urlParams.get('model');
        const isMinimal = urlParams.get('minimal') === '1';

        if (isMinimal) {
            document.body.classList.add('minimal-mode');
        }

        applyViewerDefaults();

        if (externalUrl) {
            modelViewer.src = externalUrl;
            if (titleText) titleText.textContent = modelNameFromUrl(externalUrl);
        } else if (localStorage.getItem('hasCustomModel')) {
            const blob = await getModelFromDB();
            if (blob) {
                modelViewer.src = URL.createObjectURL(blob);
                if (titleText) titleText.textContent = localStorage.getItem('modelName') || 'Análise ativa';
            }
        } else if (titleText) {
            titleText.textContent = 'Modelo padrão';
        }

        loadingTimer = setTimeout(() => {
            setLoadingMessage('Modelo pesado. Aguarde mais um pouco ou volte e tente outro modelo.');
        }, 12000);
    }

    init();

    modelViewer.addEventListener('load', () => {
        hideLoading();
        requestAnimationFrame(() => {
            modelViewer.resetTurntableRotation?.();
            modelViewer.jumpCameraToGoal?.();
            modelViewer.play?.();
        });
    });

    modelViewer.addEventListener('error', (event) => {
        console.error('Erro no Model Viewer:', event);
        clearTimeout(loadingTimer);
        setLoadingMessage('Não foi possível abrir esse modelo neste aparelho. Volte e tente outro modelo.');
    });
});
