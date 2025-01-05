import * as THREE from "three";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { gsap } from 'gsap';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import Stats from "https://unpkg.com/three@0.118.3/examples/jsm/libs/stats.module.js";

import setupScene from "./setupScene";
import { annotateScene } from "./annotateScene";

let currentSession;

let score = 0;

const scene = new THREE.Scene();

const controllerModelFactory = new XRControllerModelFactory();
const controllers = {
    left: null,
    right: null,
};

async function initScene (setup = (scene, camera, controllers, players) => {}) {

    // iwer setup
    let nativeWebXRSupport = false;

    if (navigator.xr) {
        nativeWebXRSupport = await (navigator.xr.isSessionSupported('immersive-ar')
            || navigator.xr.isSessionSupported('immersive-vr'));
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
        height: window.innerHeight + 10, // 480,
    };

    const body = document.body,
        container = document.createElement('div');
    container.style = `display: block; background-color: #000; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
    body.appendChild(container);

    const stats = new Stats();
    stats.showPanel(0);
    container.appendChild(stats.dom);

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
        1000,
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

    const data_pad = document.getElementById("data-pad");

    const data_pad_data = document.getElementById("data-pad-data");

    const updateScene = await setup(scene, camera, controllers, player);

    const updateSceneAnnotations = annotateScene(
        scene, data_pad, 2048, 2048,
        "48px", { x: 0, y: 3, z: -5 }
    );

    updateSceneAnnotations(currentSession, clock.getDelta(), clock.getElapsedTime(), data_pad);

    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        Object.values(controllers).forEach((controller) => {
            if (controller?.gamepad) {
                controller.gamepad.update();
            }
        });

        stats.begin();

        updateScene(
            currentSession,
            delta,
            time,
            score,
            function updateData (data) {
                score = (data.hasOwnProperty("score")) ? data.score : score;

                const new_data = JSON.stringify(data, null, 4);

                data_pad_data.innerHTML = data_pad_data.innerHTML + "<br />" + new_data;

                if (score > 0) {
                    console.log("Score:", score);
                    updateSceneAnnotations(currentSession, delta, time, data_pad,
                        "Your new score is " + score + " \n" + new_data);
                } else {
                    updateSceneAnnotations(currentSession, delta, time, data_pad);
                }

                return data_pad_data;
            }
        );

        renderer.render(scene, camera);

        stats.end();
    });

    // Note: Added WebXR session handling features
    // From vr-paint example and VRButton.js
    function startAR() {
        const sessionInit = {
            optionalFeatures: [
                "local-floor",
                "bounded-floor",
                "hand-tracking",
                "layers",
                "webgpu"
            ],
            requiredFeatures: [
                // "webgpu"
            ]
        };
        navigator.xr
            .requestSession("immersive-ar", sessionInit)
            .then(onSessionStarted);
    }

    async function onSessionStarted(session) {
        session.addEventListener("end", onSessionEnded);
        //renderer.xr.setReferenceSpaceType("local");
        await renderer.xr.setSession(session);
        currentSession = session;
    }

    function onSessionEnded() {
        currentSession.removeEventListener("end", onSessionEnded);
        currentSession = null;
    }

    const xr_button = // VRButton.createButton(renderer);
        document.createElement("button");
    // xr_button.className = "vr-button";
    xr_button.className = "xr-button";
    xr_button.innerHTML = "Enter XR";
    xr_button.addEventListener('click', async () => {

        console.log("XR Button clicked");

        startAR();

        previewWindow.width = window.innerWidth;
        previewWindow.height = window.innerHeight;

        renderer.setSize(previewWindow.width, previewWindow.height);

        camera.aspect = previewWindow.width / previewWindow.height;
        camera.updateProjectionMatrix();

        // Set camera position
        camera.position.z = 5;
        camera.position.y = 0;

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

    container.appendChild(xr_button);

}

initScene(setupScene);
