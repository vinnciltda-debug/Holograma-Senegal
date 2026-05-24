const loader = new THREE.GLTFLoader();

let currentAnimationId = null;
let currentRenderer = null;
let catalogMode = '3d';

document.addEventListener('DOMContentLoaded', () => {
    const btnReset = document.getElementById('btn-reset');
    const btnResetTop = document.getElementById('btn-reset-top');

    const resetStorage = () => {
        localStorage.removeItem('hasCustomModel');
        localStorage.removeItem('modelName');
        localStorage.removeItem('syncedModelUrl');
        window.location.reload();
    };

    if (btnReset) btnReset.addEventListener('click', resetStorage);
    if (btnResetTop) btnResetTop.addEventListener('click', resetStorage);
});

function getAbsoluteModelUrl(path) {
    return new URL(path, window.location.href).href;
}

function setCatalogMode(mode) {
    catalogMode = mode === 'hologram' ? 'hologram' : '3d';

    document.getElementById('mode-3d')?.classList.toggle('is-active', catalogMode === '3d');
    document.getElementById('mode-hologram')?.classList.toggle('is-active', catalogMode === 'hologram');
}

function openCatalogModel(path, name, tag) {
    if (catalogMode === 'hologram') {
        openHologramViewer(path);
        return;
    }

    openModernViewer(path, name, tag);
}

function openHologramViewer(path) {
    window.location.href = `pyramid.html?model=${encodeURIComponent(getAbsoluteModelUrl(path))}`;
}

function openModernViewer(path, name, tag) {
    const overlay = document.getElementById('modern-viewer-overlay');
    const viewer = document.getElementById('main-model-viewer');
    const progressBar = document.querySelector('.update-bar');
    const progressContainer = document.querySelector('.progress-bar-container');

    if (!overlay || !viewer) return;

    document.getElementById('v-name').textContent = name;
    document.getElementById('v-tag').textContent = tag;
    document.getElementById('link-holograma').href = `pyramid.html?model=${encodeURIComponent(getAbsoluteModelUrl(path))}`;
    document.getElementById('link-vr').href = `vr.html?model=${encodeURIComponent(getAbsoluteModelUrl(path))}`;

    if (progressBar) progressBar.style.width = '0%';
    if (progressContainer) progressContainer.style.display = 'block';

    const onProgress = (event) => {
        const progress = event.detail.totalProgress * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;
    };

    const onLoad = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        viewer.removeEventListener('progress', onProgress);
        viewer.removeEventListener('load', onLoad);
    };

    viewer.addEventListener('progress', onProgress);
    viewer.addEventListener('load', onLoad);

    viewer.src = path;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModernViewer() {
    const overlay = document.getElementById('modern-viewer-overlay');
    const viewer = document.getElementById('main-model-viewer');

    if (overlay) {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
    }

    document.body.style.overflow = '';
    if (viewer) viewer.src = '';
}

function triggerAR() {
    const viewer = document.getElementById('main-model-viewer');
    if (viewer && viewer.activateAR) {
        viewer.activateAR();
    } else {
        alert('Seu navegador não suporta Realidade Aumentada nativa.');
    }
}

async function loadCatalogModel(path, name) {
    try {
        const response = await fetch(path);
        const blob = await response.blob();
        const file = new File([blob], name, { type: 'model/gltf-binary' });

        localStorage.removeItem('syncedModelUrl');
        await handleFile(file);
        document.getElementById('analysis-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
        console.error('Erro ao carregar modelo do catálogo:', err);
        alert('Erro ao carregar o modelo selecionado.');
    }
}

async function handleFile(file, shouldAddToHistory = true) {
    try {
        await saveModelToDB(file);
        if (shouldAddToHistory) {
            await addToHistory(file);
            renderHistory();
        }

        const url = URL.createObjectURL(file);
        localStorage.setItem('modelName', file.name);
        localStorage.setItem('hasCustomModel', 'true');

        const analysisCard = document.getElementById('analysis-card');
        if (!analysisCard) return;

        analysisCard.style.display = 'block';
        document.getElementById('model-name').textContent = file.name;
        document.getElementById('model-size').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        loader.load(url, (gltf) => {
            const model = gltf.scene;
            let vertices = 0;
            let triangles = 0;

            model.traverse((node) => {
                if (node.isMesh) {
                    const geometry = node.geometry;
                    vertices += geometry.attributes.position.count;
                    triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
                }
            });

            document.getElementById('poly-count').textContent = Math.round(triangles).toLocaleString();
            document.getElementById('vert-count').textContent = vertices.toLocaleString();
            document.getElementById('anim-count').textContent = gltf.animations.length;

            initPreview(model);

            const ipConfig = document.getElementById('ip-config');
            if (ipConfig) ipConfig.value = window.location.host;
            updateDynamicQR();
            const qrSection = document.getElementById('qr-section');
            if (qrSection) qrSection.style.display = 'block';
        }, undefined, (err) => {
            console.error('Three.js Load Error:', err);
            alert('Erro ao carregar o modelo 3D no preview.');
            resetAll();
        });
    } catch (err) {
        console.error('HandleFile Error:', err);
        alert('Ocorreu um erro ao processar seu arquivo.');
    }
}

async function updateDynamicQR(externalUrl = null) {
    const host = document.getElementById('ip-config')?.value || window.location.host;
    const protocol = window.location.protocol;
    const urlParams = externalUrl ? `?model=${encodeURIComponent(externalUrl)}` : '';

    document.querySelectorAll('a[href^="pyramid.html"], a[href^="vr.html"], a[href^="viewer.html"]').forEach(link => {
        const base = link.getAttribute('href').split('?')[0];
        link.setAttribute('href', base + urlParams);
    });

    let viewerUrl = `${protocol}//${host}/viewer.html?minimal=1`;
    if (externalUrl) viewerUrl += `&model=${encodeURIComponent(externalUrl)}`;

    const qrDiv = document.getElementById('qrcode');
    if (!qrDiv) return;

    qrDiv.innerHTML = '';
    new QRCode(qrDiv, {
        text: viewerUrl,
        width: 200,
        height: 200,
        colorDark: '#102019',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

const btnSync = document.getElementById('btn-sync-cloud');
if (btnSync) {
    btnSync.addEventListener('click', async () => {
        const status = document.getElementById('sync-status');
        const blob = await getModelFromDB();

        if (!blob) return alert('Suba um modelo primeiro.');

        btnSync.disabled = true;
        btnSync.textContent = 'Sincronizando...';
        status.style.display = 'block';
        status.className = 'alert alert-info py-2 small';

        try {
            const filename = sessionStorage.getItem('modelName') || 'modelo.glb';
            const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
                method: 'POST',
                body: blob
            });

            const data = await response.json();
            if (response.ok && data.url) {
                updateDynamicQR(data.url);
                localStorage.setItem('syncedModelUrl', data.url);
                status.textContent = 'Sincronizado com Vercel Blob.';
                status.className = 'alert alert-success py-2 small';
                btnSync.textContent = 'Modelo sincronizado';
            } else {
                throw new Error(data.error || 'Erro no upload');
            }
        } catch (err) {
            status.textContent = 'Erro: ' + err.message;
            status.className = 'alert alert-danger py-2 small';
            btnSync.disabled = false;
            btnSync.textContent = 'Tentar novamente';
        }
    });
}

function initPreview(loadedModel) {
    const container = document.getElementById('model-preview');
    if (!container) return;

    if (currentAnimationId) cancelAnimationFrame(currentAnimationId);
    if (currentRenderer) {
        currentRenderer.dispose();
        if (currentRenderer.domElement && currentRenderer.domElement.parentNode) {
            currentRenderer.domElement.parentNode.removeChild(currentRenderer.domElement);
        }
    }

    container.innerHTML = '';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f5ec);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);

    currentRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    currentRenderer.setSize(container.clientWidth, container.clientHeight);
    currentRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(currentRenderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 10, 7.5);
    scene.add(light);

    const box = new THREE.Box3().setFromObject(loadedModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3.5 / maxDim;
    loadedModel.scale.set(scale, scale, scale);
    loadedModel.position.sub(center.multiplyScalar(scale));
    scene.add(loadedModel);

    camera.position.z = 8;

    function animate() {
        currentAnimationId = requestAnimationFrame(animate);
        loadedModel.rotation.y += 0.005;
        if (currentRenderer) currentRenderer.render(scene, camera);
    }
    animate();
}

async function renderHistory() {
    const listContainer = document.getElementById('recent-list');
    const section = document.getElementById('recent-models-section');
    if (!listContainer || !section) return;

    const history = await getHistory();

    if (history.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    listContainer.innerHTML = '';

    history.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-6';
        const sizeMB = (item.size / (1024 * 1024)).toFixed(1);

        col.innerHTML = `
            <div class="stat-card d-flex align-items-center justify-content-between p-3">
                <div class="d-flex align-items-center flex-grow-1 recent-open">
                    <div class="bg-primary text-white rounded-3 p-2 me-3 recent-file-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <div class="recent-file-copy">
                        <p class="mb-0 fw-bold text-truncate">${item.name}</p>
                        <p class="mb-0 text-muted">${sizeMB} MB</p>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 btn-open">Abrir</button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle p-1 d-flex align-items-center justify-content-center btn-delete" title="Remover">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;

        const openAction = () => {
            const file = new File([item.blob], item.name, { type: 'model/gltf-binary' });
            handleFile(file, false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        col.querySelector('.recent-open').addEventListener('click', openAction);
        col.querySelector('.btn-open').addEventListener('click', openAction);
        col.querySelector('.btn-delete').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Remover "${item.name}"?`)) {
                await deleteFromHistory(item.id);
                renderHistory();
            }
        });

        listContainer.appendChild(col);
    });
}
