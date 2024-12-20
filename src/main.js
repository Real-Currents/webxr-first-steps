import * as THREE from "three";
// import {
//     Clock,
//     PerspectiveCamera,
//     Vector2,
//     Scene,
//     ACESFilmicToneMapping,
//     Box2,
//     MathUtils,
//     BufferGeometry,
//     PlaneGeometry,
//     Mesh,
//     Vector3,
//     Color,
//     EquirectangularReflectionMapping,
//     BufferAttribute,
//     BatchedMesh,
//     Object3D,
//     Plane,
//     MeshStandardMaterial,
//     MeshPhysicalMaterial,
//     pass,
//     PostProcessing,
//     Renderer,
//     fxaa,
//     dof,
//     ao,
//     uniform,
//     output,
//     mrt,
//     transformedNormalView,
//     Raycaster,
//     viewportUV,
//     clamp,
//     FloatType,
//     MeshStandardNodeMaterial,
//     MeshPhysicalNodeMaterial,
//     WebGPURenderer
// } from "three/webgpu";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { gsap } from 'gsap';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import setupScene from "./setupScene";
import {annotateScene} from "./annotateScene";

const controllerModelFactory = new XRControllerModelFactory();
const controllers = {
    left: null,
    right: null,
};

const scene = new THREE.Scene();

async function initScene (setup = (scene, camera, controllers, players) => {}) {

    // iwer setup
    let nativeWebXRSupport = false;

    if (navigator.xr) {
        nativeWebXRSupport = await
            // navigator.xr.requestSession('immersive-vr', {requiredFeatures: ['webgpu']});
            navigator.xr.isSessionSupported('immersive-vr');
    }

    // Setup Immersive Web Emulation Runtime (iwer) and emulated XR device (@iwer/devui)
    if (!nativeWebXRSupport) {
        const xrDevice = new XRDevice(metaQuest3);
        xrDevice.installRuntime();
        xrDevice.fovy = (75 / 180) * Math.PI;
        xrDevice.ipd = 0;
        window.xrdevice = xrDevice;
        xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
        xrDevice.controllers.right.quaternion.set(
            0.14766305685043335,
            0.02471366710960865,
            -0.0037767395842820406,
            0.9887216687202454,
        );
        xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
        xrDevice.controllers.left.quaternion.set(
            0.14766305685043335,
            0.02471366710960865,
            -0.0037767395842820406,
            0.9887216687202454,
        );
        new DevUI(xrDevice);

    }

    const previewWindow = {
        width: window.innerWidth / 2, // 640,
        height: window.innerHeight, // 480,
    };

    const body = document.body,
        container = document.createElement('div');
    container.style = `display: block; background-color: #000; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
    body.appendChild(container);

    console.log(container);

    const canvas= // window.document.querySelector('canvas') ||
        window.document.createElement('canvas');

    // const renderer = new WebGPURenderer({ canvas: canvas, antialias: true });
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setSize(previewWindow.width, previewWindow.height);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // const camera = cameraFactory(previewWindow.width, previewWindow.height);
    const camera = new THREE.PerspectiveCamera(
        50,
        previewWindow.width / previewWindow.height,
        0.1,
        100,
    );
    camera.position.set(0, 1.6, 3);

    const controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.6, 0);
    controls.update();

    console.log(renderer.domElement);

    container.appendChild(renderer.domElement);

    function onWindowResize() {
        camera.aspect = previewWindow.width / previewWindow.height;
        camera.updateProjectionMatrix();

        renderer.setSize(previewWindow.width, previewWindow.height);
    }

    window.addEventListener('resize', onWindowResize);

    const environment = new RoomEnvironment(renderer);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture;

    const player = new THREE.Group();
    scene.add(player);

    for (let i = 0; i < 2; i++) {
        const raySpace = renderer.xr.getController(i);
        const gripSpace = renderer.xr.getControllerGrip(i);
        const mesh = controllerModelFactory.createControllerModel(gripSpace);

        gripSpace.add(mesh);

        gripSpace.addEventListener('connected', (e) => {

            raySpace.visible = true;
            gripSpace.visible = true;
            const handedness = e.data.handedness;
            controllers[handedness] = {
                raySpace,
                gripSpace,
                mesh,
                gamepad: new GamepadWrapper(e.data.gamepad),
            };
        });

        gripSpace.addEventListener('disconnected', (e) => {
            raySpace.visible = false;
            gripSpace.visible = false;
            const handedness = e.data.handedness;
            controllers[handedness] = null;
        });

        player.add(raySpace, gripSpace);
        // raySpace.visible = false;
        // gripSpace.visible = false;
    }


    const clock = new THREE.Clock();
    const updateScene = await setup(scene, camera, controllers, player);

    annotateScene(scene);

    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        Object.values(controllers).forEach((controller) => {
            if (controller?.gamepad) {
                controller.gamepad.update();
            }
        });
        updateScene();

        renderer.render(scene, camera);
    });

    const vr_button = VRButton.createButton(renderer);
    vr_button.className = "vr-button";
    vr_button.addEventListener('click', async () => {

        console.log("VR Button clicked");

        previewWindow.width = window.innerWidth;
        previewWindow.height = window.innerHeight;

        renderer.setSize(previewWindow.width, previewWindow.height);

        camera.aspect = previewWindow.width / previewWindow.height;
        camera.updateProjectionMatrix();

        player.position.z = camera.position.z;
        player.position.y = camera.position.y;

        renderer.render(scene, camera);

        container.style = `display: block; color: #FFF; font-size: 24px; text-align: center; background-color: #000; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
        container.innerHTML = "Reload page";

        const vrDisplays = [];

        if (navigator.getVRDisplays) {
            function updateDisplay() {
                // Call `navigator.getVRDisplays` (before Firefox 59).
                navigator.getVRDisplays().then(displays => {
                    constole.log("Checking VR display");
                    if (!displays.length) {
                        throw new Error('No VR display found');
                    } else {
                        for (const display of displays) vrDisplays.push(display);
                        console.log("VR displays:", vrDisplays);
                        container.innerHTML = `<br />
VR Display Connected!<br />
Reload page to reset VR scene.
`
                    }
                });
            }

            // As of Firefox 59, it's preferred to also wait for the `vrdisplayconnect` event to fire.
            window.addEventListener('vrdisplayconnect', updateDisplay);
            window.addEventListener('vrdisplaydisconnect', e => console.log.bind(console));
            window.addEventListener('vrdisplayactivate', e => console.log.bind(console));
            window.addEventListener('vrdisplaydeactivate', e => console.log.bind(console));
            window.addEventListener('vrdisplayblur', e => console.log.bind(console));
            window.addEventListener('vrdisplayfocus', e => console.log.bind(console));
            window.addEventListener('vrdisplaypointerrestricted', e => console.log.bind(console));
            window.addEventListener('vrdisplaypointerunrestricted', e => console.log.bind(console));
            window.addEventListener('vrdisplaypresentchange', e => console.log.bind(console))
        }
    });

    container.appendChild(vr_button);

}

initScene(setupScene);
