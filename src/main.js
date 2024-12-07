import * as THREE from "three";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

// import cameraFactory from "./camera";
// import renderer from "./renderer";
import scene from "./scene";

import geometry from "./geometry";
import material from "./material";

const controllerModelFactory = new XRControllerModelFactory();
const controllers = {
    left: null,
    right: null,
};

async function initScene (setup = (camera, controllers, players) => {}) {

    // iwer setup
    let nativeWebXRSupport = false;

    if (navigator.xr) {
        nativeWebXRSupport = await navigator.xr.isSessionSupported('immersive-vr');
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
    }

    const body = document.body,
        container = document.createElement('div');
    container.style = `display: block; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
    body.appendChild(container);

    console.log(container);

    // const camera = cameraFactory(previewWindow.width, previewWindow.height);
    const camera = new THREE.PerspectiveCamera(
        50,
        previewWindow.width / previewWindow.height,
        0.1,
        100,
    );
    camera.position.set(0, 1.6, 3);

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onWindowResize);

    const controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.6, 0);
    controls.update();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setSize(previewWindow.width, previewWindow.height);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    console.log(renderer.domElement);

    container.appendChild(renderer.domElement);

    const environment = new RoomEnvironment(renderer);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture;

    const player = new THREE.Group();
    scene.add(player);
    player.add(camera);

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


    const onFrameUpdate = await setup(camera, controllers, player);

    renderer.setAnimationLoop(() => {
        onFrameUpdate(); //(delta, time, globals);
        renderer.render(scene, camera);
    });

    renderer.render(scene, camera);

    const vr_button = VRButton.createButton(renderer);
    vr_button.className = "vr-button"
    body.appendChild(vr_button);

}

async function setupScene (camera, controllers, player) {

    // Set camera position
    camera.position.z = 10;
    camera.position.y = 1;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(6, 6);
    const floorMaterial = new THREE.MeshBasicMaterial({color: 'white'});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    floor.rotateX(-Math.PI / 2);

    scene.add(floor);

    // Cone
    const coneGeometry = new THREE.ConeGeometry(0.6, 1.5);
    const coneMaterial = new THREE.MeshBasicMaterial({color: 'purple'});
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);

    cone.position.set(0.4, 0.75, -1.5);

    scene.add(cone);

    // Cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshBasicMaterial({color: 'orange'});
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);
    cube.position.set(-0.8, 0.5, -1.5);
    cube.rotateY(Math.PI / 4);

    // Rotating Cube
    const rotatingMesh = (controllers.left === null) ?
        new THREE.Mesh(geometry, material) :
        // ... or Controller mesh
        controllerModelFactory.createControllerModel(controllers.left.gripSpace);

    rotatingMesh.position.y = 2;

    rotatingMesh.rotX = function (x) {
        // console.log(this);
        this.rotation.x += x;
    }

    rotatingMesh.rotY = function (y) {
        // console.log(this);
        this.rotation.y += y;
    }

    scene.add(rotatingMesh);

    // Sphere
    const sphereGeometry = new THREE.SphereGeometry(0.4);
    const sphereMaterial = new THREE.MeshBasicMaterial({color: 'red'});
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    sphere.position.set(0.6, 0.4, -0.5);
    sphere.scale.set(1.2, 1.2, 1.2);

    scene.add(sphere);

    // Power Ball
    const bulletGeometry = new THREE.SphereGeometry(0.02);
    const bulletMaterial = new THREE.MeshStandardMaterial({color: 'gray'});
    const bulletPrototype = new THREE.Mesh(bulletGeometry, bulletMaterial);

    return function onFrame (delta, time, globals) {
        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const { gamepad, raySpace } = controllers.right;

            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);
                const bullet = bulletPrototype.clone();
                scene.add(bullet);
                raySpace.getWorldPosition(bullet.position);
                raySpace.getWorldQuaternion(bullet.quaternion);
            } else {
                for (const b in XR_BUTTONS) {
                    if (XR_BUTTONS.hasOwnProperty(b)) {
                        // console.log("Check button: ", XR_BUTTONS[b]);
                        if (gamepad.getButtonClick(XR_BUTTONS[b])) {
                            console.log("Button on right controller was activated:", XR_BUTTONS[b], gamepad);
                        }
                    }
                }
            }
        }

        rotatingMesh.rotX(0.01);
        rotatingMesh.rotY(0.01);
    }
}

initScene(setupScene);
