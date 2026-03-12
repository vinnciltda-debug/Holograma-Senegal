import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, model;
const views = ['top', 'bottom', 'left', 'right'];
const renderers = {};
const cameras = {};

async function init() {
    scene = new THREE.Scene();
    scene.background = null;

    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0x00f2ff, 3);
    light.position.set(0, 1, 1);
    scene.add(light);

    const loader = new GLTFLoader();

    // Load model logic
    const urlParams = new URLSearchParams(window.location.search);
    const externalUrl = urlParams.get('model');
    const hasCustom = sessionStorage.getItem('hasCustomModel');
    const defaultModel = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

    if (externalUrl) {
        loader.load(externalUrl, (gltf) => setupModel(gltf));
    } else if (hasCustom) {
        if (typeof getModelFromDB === 'function') {
            const blob = await getModelFromDB();
            if (blob) {
                loader.load(URL.createObjectURL(blob), (gltf) => setupModel(gltf));
            } else {
                loader.load(defaultModel, (gltf) => setupModel(gltf));
            }
        }
    } else {
        loader.load(defaultModel, (gltf) => setupModel(gltf));
    }

    // Configurar as 4 vistas
    views.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(rect.width, rect.height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        renderers[id] = renderer;

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 4;
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
    model.scale.setScalar(2 / maxDim);
    model.position.sub(center.multiplyScalar(2 / maxDim));
    scene.add(model);

    if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
        const clock = new THREE.Clock();
        const animateWithMixer = () => {
            requestAnimationFrame(animateWithMixer);
            mixer.update(clock.getDelta());
        };
        animateWithMixer();
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (model) model.rotation.y += 0.01;
    views.forEach(id => {
        if (renderers[id]) renderers[id].render(scene, cameras[id]);
    });
}

window.addEventListener('resize', () => {
    views.forEach(id => {
        const container = document.getElementById(id);
        if (renderers[id] && container) {
            const rect = container.getBoundingClientRect();
            renderers[id].setSize(rect.width, rect.height);
        }
    });
});

init();
