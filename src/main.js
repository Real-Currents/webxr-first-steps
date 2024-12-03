import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import camera from "./camera";
import renderer from "./renderer";
import scene from "./scene";

import geometry from "./geometry";
import material from "./material";

// import { XRDevice, metaQuest3 } from 'iwer';
// import { DevUI } from '@iwer/devui';
//
// // iwer setup
// let nativeWebXRSupport = false;
//
// if (navigator.xr) {
//     nativeWebXRSupport = await navigator.xr.isSessionSupported('immersive-vr');
// }
//
// if (!nativeWebXRSupport) {
//     const xrDevice = new XRDevice(metaQuest3);
//     xrDevice.installRuntime();
//     xrDevice.fovy = (75 / 180) * Math.PI;
//     xrDevice.ipd = 0;
//     window.xrdevice = xrDevice;
//     xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
//     xrDevice.controllers.right.quaternion.set(
//         0.14766305685043335,
//         0.02471366710960865,
//         -0.0037767395842820406,
//         0.9887216687202454,
//     );
//     xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
//     xrDevice.controllers.left.quaternion.set(
//         0.14766305685043335,
//         0.02471366710960865,
//         -0.0037767395842820406,
//         0.9887216687202454,
//     );
//     new DevUI(xrDevice);
// }

const cube = new THREE.Mesh(geometry, material);

camera.position.z = 5;

cube.rotX = function (x) {
    // console.log(this);
    this.rotation.x += x;
}

cube.rotY = function (y) {
    // console.log(this);
    this.rotation.y += y;
}

scene.add(cube);

renderer.setAnimationLoop(() => {
    cube.rotX(0.01);
    cube.rotY(0.01);
    renderer.render(scene, camera);
});


console.log(renderer.domElement);

document.body.appendChild(renderer.domElement);

document.body.appendChild(VRButton.createButton(renderer));
