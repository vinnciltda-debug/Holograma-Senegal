import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, model, mixer;
const clock = new THREE.Clock();
const renderers = {};
const cameras = {};

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0x00f2ff, 3);
    light.position.set(1, 1, 1);
    scene.add(light);

    const loader = new GLTFLoader();

    // Pegar o modelo
    const urlParams = new URLSearchParams(window.location.search);
    const externalUrl = urlParams.get('model');
    const hasCustom = sessionStorage.getItem('hasCustomModel');
    const defaultModel = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

    if (externalUrl) {
        loader.load(externalUrl, (gltf) => setupModel(gltf));
    } else if (hasCustom) {
        // Usando a função do db.js que será importada ou global
        const blob = await getModelFromDB(); // Função global definida em js/db.js
        if (blob) {
            loader.load(URL.createObjectURL(blob), (gltf) => setupModel(gltf));
        } else {
            loader.load(defaultModel, (gltf) => setupModel(gltf));
        }
    } else {
        loader.load(defaultModel, (gltf) => setupModel(gltf));
    }

    // Configurar 2 câmeras
    const ipd = 0.064;
    ['left-eye', 'right-eye'].forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        renderers[id] = renderer;

        const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 8;
        camera.position.x = (id === 'left-eye' ? -ipd / 2 : ipd / 2);
        cameras[id] = camera;
    });

    animate();
}

function setupModel(gltf) {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    model.scale.setScalar(3 / maxDim);
    model.position.sub(center.multiplyScalar(3 / maxDim));
    scene.add(model);

    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (model) model.rotation.y += 0.005;

    ['left-eye', 'right-eye'].forEach(id => {
        if (renderers[id]) renderers[id].render(scene, cameras[id]);
    });
}

window.addEventListener('resize', () => {
    ['left-eye', 'right-eye'].forEach(id => {
        const container = document.getElementById(id);
        if (renderers[id]) {
            renderers[id].setSize(container.clientWidth, container.clientHeight);
            cameras[id].aspect = container.clientWidth / container.clientHeight;
            cameras[id].updateProjectionMatrix();
        }
    });
});

init();
