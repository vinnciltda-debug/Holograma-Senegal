// Dependências: THREE, GLTFLoader (via THREE.GLTFLoader), QRCode
const loader = new THREE.GLTFLoader();

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadPanel = document.getElementById('upload-panel');
    const analysisCard = document.getElementById('analysis-card');

    if (!dropZone) return;

    // Drag & Drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.glb')) {
            handleFile(file);
        } else {
            alert('Por favor, suba apenas arquivos .GLB');
        }
    });

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
    }

    // Reset Buttons
    const btnReset = document.getElementById('btn-reset');
    const btnResetTop = document.getElementById('btn-reset-top');
    if (btnReset) btnReset.addEventListener('click', resetAll);
    if (btnResetTop) btnResetTop.addEventListener('click', resetAll);

    // Verificação inicial: Se já existe um modelo no banco, carrega ele automaticamente
    if (sessionStorage.getItem('hasCustomModel')) {
        getModelFromDB().then(blob => {
            if (blob) {
                const modelName = sessionStorage.getItem('modelName') || 'modelo.glb';
                const file = new File([blob], modelName, { type: "model/gltf-binary" });
                handleFile(file, false); // Não adiciona ao histórico de novo
                console.log("Sessão restaurada: ", modelName);
            }
        });
    }

    renderHistory();
});

async function handleFile(file, shouldAddToHistory = true) {
    try {
        await saveModelToDB(file);
        if (shouldAddToHistory) {
            await addToHistory(file);
            renderHistory();
        }
        const url = URL.createObjectURL(file);
        sessionStorage.setItem('modelName', file.name);
        sessionStorage.setItem('hasCustomModel', 'true');

        document.getElementById('upload-panel').style.display = 'none';
        document.getElementById('analysis-card').style.display = 'block';
        document.getElementById('btn-reset-top').style.display = 'block';
        document.getElementById('model-name').textContent = file.name;
        document.getElementById('model-size').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        loader.load(url, (gltf) => {
            const model = gltf.scene;
            let vertices = 0, triangles = 0;

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

            const currentHost = window.location.host;
            document.getElementById('ip-config').value = currentHost;
            updateDynamicQR();
            document.getElementById('qr-section').style.display = 'block';
        }, undefined, (err) => {
            console.error("Three.js Load Error:", err);
            alert("Erro ao carregar o modelo 3D no preview.");
            resetAll();
        });
    } catch (err) {
        console.error("HandleFile Error:", err);
        alert("Ocorreu um erro ao processar seu arquivo.");
    }
}

async function updateDynamicQR(externalUrl = null) {
    const host = document.getElementById('ip-config')?.value || window.location.host;
    const protocol = window.location.protocol;
    let viewerUrl = `${protocol}//${host}/viewer.html?minimal=1`;
    if (externalUrl) viewerUrl += `&model=${encodeURIComponent(externalUrl)}`;

    const qrDiv = document.getElementById('qrcode');
    if (!qrDiv) return;

    qrDiv.innerHTML = "";
    new QRCode(qrDiv, {
        text: viewerUrl,
        width: 200,
        height: 200,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Lógica de Sincronização
const btnSync = document.getElementById('btn-sync-cloud');
if (btnSync) {
    btnSync.addEventListener('click', async () => {
        const status = document.getElementById('sync-status');
        const blob = await getModelFromDB();

        if (!blob) return alert("Suba um modelo primeiro!");

        btnSync.disabled = true;
        btnSync.textContent = "Sincronizando...";
        status.style.display = "block";
        status.className = "alert alert-info py-2 small";

        try {
            const filename = sessionStorage.getItem('modelName') || 'modelo.glb';
            const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
                method: 'POST',
                body: blob
            });

            const data = await response.json();
            if (response.ok && data.url) {
                updateDynamicQR(data.url);
                status.textContent = "✅ Sincronizado com Vercel Blob!";
                status.className = "alert alert-success py-2 small";
                btnSync.textContent = "Modelo Sincronizado";
            } else {
                throw new Error(data.error || "Erro no upload");
            }
        } catch (err) {
            status.textContent = "❌ Erro: " + err.message;
            status.className = "alert alert-danger py-2 small";
            btnSync.disabled = false;
            btnSync.textContent = "Tentar novamente";
        }
    });
}

function initPreview(loadedModel) {
    const container = document.getElementById('model-preview');
    if (!container) return;
    container.innerHTML = '';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
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
        requestAnimationFrame(animate);
        loadedModel.rotation.y += 0.005;
        renderer.render(scene, camera);
    }
    animate();
}

/**
 * Renderiza a lista de arquivos recentes
 */
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
        col.className = 'col-md-4 col-lg-6'; // 2 por linha em telas grandes, 1 em médias

        const sizeMB = (item.size / (1024 * 1024)).toFixed(1);
        const date = new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        col.innerHTML = `
            <div class="stat-card d-flex align-items-center justify-content-between p-3" style="cursor: pointer; transition: all 0.3s ease;">
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-3 p-2 me-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <div style="max-width: 150px; overflow: hidden;">
                        <p class="mb-0 fw-bold text-truncate" style="font-size: 0.9rem;">${item.name}</p>
                        <p class="mb-0 text-muted" style="font-size: 0.75rem;">${sizeMB} MB • ${date}</p>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1" style="font-size: 0.7rem;">ABRIR</button>
            </div>
        `;

        col.querySelector('.stat-card').addEventListener('click', () => {
            const file = new File([item.blob], item.name, { type: "model/gltf-binary" });
            handleFile(file, false); // Carrega sem re-adicionar ao histórico
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        listContainer.appendChild(col);
    });
}
