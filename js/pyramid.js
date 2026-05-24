import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, model;
const views = ['top', 'bottom', 'left', 'right'];
const renderers = {};
const cameras = {};
const isMobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

function showLoadStatus(message) {
    let status = document.getElementById('hologram-status');
    if (!status) {
        status = document.createElement('div');
        status.id = 'hologram-status';
        status.style.cssText = [
            'position:fixed',
            'left:50%',
            'top:50%',
            'z-index:20',
            'max-width:min(320px,calc(100vw - 32px))',
            'padding:14px 16px',
            'color:white',
            'font:800 13px/1.4 system-ui,sans-serif',
            'text-align:center',
            'background:rgba(0,0,0,.72)',
            'border:1px solid rgba(255,255,255,.18)',
            'border-radius:14px',
            'transform:translate(-50%,-50%)'
        ].join(';');
        document.body.appendChild(status);
    }
    status.textContent = message;
}

function hideLoadStatus() {
    document.getElementById('hologram-status')?.remove();
}

async function init() {
    scene = new THREE.Scene();
    scene.background = null;

    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0x00f2ff, 3);
    light.position.set(0, 1, 1);
    scene.add(light);

    const loader = new GLTFLoader();
    const urlParams = new URLSearchParams(window.location.search);
    const externalUrl = urlParams.get('model');
    const hasCustom = localStorage.getItem('hasCustomModel');
    const defaultModel = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

    const onError = () => {
        showLoadStatus('Não foi possível abrir esse modelo no holograma deste aparelho.');
    };

    if (externalUrl) {
        loader.load(externalUrl, (gltf) => setupModel(gltf), undefined, onError);
    } else if (hasCustom && typeof getModelFromDB === 'function') {
        const blob = await getModelFromDB();
        if (blob) {
            loader.load(URL.createObjectURL(blob), (gltf) => setupModel(gltf), undefined, onError);
        } else {
            loader.load(defaultModel, (gltf) => setupModel(gltf), undefined, onError);
        }
    } else {
        loader.load(defaultModel, (gltf) => setupModel(gltf), undefined, onError);
    }

    views.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'low-power' });
        renderer.setSize(rect.width, rect.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
        container.appendChild(renderer.domElement);
        renderers[id] = renderer;

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 4;
        cameras[id] = camera;
    });

    animate();
}

function setupModel(gltf) {
    hideLoadStatus();
    if (model) scene.remove(model);
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = (isMobile ? 1.65 : 2) / maxDim;
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
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
