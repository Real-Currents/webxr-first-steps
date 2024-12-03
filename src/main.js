import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import camera from "./camera";
import renderer from "./renderer";
import scene from "./scene";

import geometry from "./geometry";
import material from "./material";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';

// iwer setup
let nativeWebXRSupport = false;

async function setupScene() {

    // Set camera position
    camera.position.z = 5;
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

    renderer.setAnimationLoop(() => {
        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);
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

    await setupScene();

    console.log(renderer.domElement);

    document.body.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));

}

initScene();
