import * as THREE from "three";
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import camera from "./camera";
import renderer from "./renderer";
import scene from "./scene";

import geometry from "./geometry";
import material from "./material";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';

// iwer setup
let nativeWebXRSupport = false;

const environment = new RoomEnvironment(renderer);
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(environment).texture;

const player = new THREE.Group();
scene.add(player);
player.add(camera);

const controllerModelFactory = new XRControllerModelFactory();
const controllers = {
    left: null,
    right: null,
};

async function setupScene (controllers) {

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
    const rotatingCube = new THREE.Mesh(geometry, material);

    rotatingCube.position.y = 2;

    rotatingCube.rotX = function (x) {
        // console.log(this);
        this.rotation.x += x;
    }

    rotatingCube.rotY = function (y) {
        // console.log(this);
        this.rotation.y += y;
    }

    scene.add(rotatingCube);

    // // ... or Controller mesh
    // const gripSpace = renderer.xr.getControllerGrip(0);
    // const controllerMesh = controllerModelFactory.createControllerModel(gripSpace);
    //
    // scene.add(controllerMesh);

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

    function onFrame (delta, time, globals) {
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

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);
    }

    renderer.setAnimationLoop(() => {
        onFrame(); //(delta, time, globals);
        renderer.render(scene, camera);
    });
}

async function initScene() {

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

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onWindowResize);

    await setupScene(controllers);

    console.log(renderer.domElement);

    document.body.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));

}

initScene();
