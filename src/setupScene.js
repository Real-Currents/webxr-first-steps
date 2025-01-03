import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import planeGeometry from "./geometry/planeGeometry";
import meshMaterial from "./material/meshMaterial";
import boxGeometry from "./geometry/boxGeometry";
import {XR_BUTTONS} from "gamepad-wrapper";
import bulletGeometry from "./geometry/bulletGeometry";

const bulletSpeed = 3;
const bulletTimeToLive = 1;
const bullets = {};
const forwardVector = new THREE.Vector3(0, 0, -1);

const loader = new GLTFLoader();

let waiting_for_confirmation = false;

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    // Floor
    const floor = new THREE.Mesh(planeGeometry, meshMaterial);

    floor.rotateX(-Math.PI / 2);

    scene.add(floor);

    // Rotating Cube
    const rotatingMesh = (controllers.left === null) ?
        new THREE.Mesh(boxGeometry, meshMaterial) :
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

    loader.load("assets/spacestation.glb", (gltf_file) => {
        const space_station_scene = gltf_file.scene;
        space_station_scene.position.z += -1;
        scene.add(gltf_file.scene);
    });

    return function (currentSession, delta, time, updateDOMData) {
        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const { gamepad, raySpace } = controllers.right;

            // Power Ball
            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                const bullet = new THREE.Mesh(bulletGeometry, meshMaterial);

                scene.add(bullet);

                raySpace.getWorldPosition(bullet.position);
                raySpace.getWorldQuaternion(bullet.quaternion);

                const directionVector = new THREE.Vector3(0, 0, -1) // forwardVector
                    .clone()
                    .applyQuaternion(bullet.quaternion);

                bullet.userData = {
                    velocity: directionVector.multiplyScalar(bulletSpeed),
                    timeToLive: bulletTimeToLive
                };

                bullets[bullet.uuid] = bullet;

                console.log("bullets:", bullets);

                if (typeof updateDOMData === "function") {
                    updateDOMData({
                        action: "Shoot",
                        position: bullet.position,
                        quaternion: bullet.quaternion,
                        waiting_for_confirmation: waiting_for_confirmation
                    });
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                console.log("BUTTON_2 (A) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);
                if (!!waiting_for_confirmation) {
                    console.log("Confirm action");
                    waiting_for_confirmation = false;
                    console.log("End session");
                    if (typeof updateDOMData === "function") {
                        updateDOMData({
                            action: "End session confirmed",
                            waiting_for_confirmation: waiting_for_confirmation
                        });
                    }
                    currentSession.end();
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                console.log("BUTTON_2 (B) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                    if (typeof updateDOMData === "function") {
                        updateDOMData({
                            action: "End session cancelled",
                            waiting_for_confirmation: waiting_for_confirmation
                        });
                    }
                } else {
                    console.log("Waiting for confirmation...")
                    waiting_for_confirmation = true;
                    if (typeof updateDOMData === "function") {
                        updateDOMData({
                            action: "End session initiated",
                            waiting_for_confirmation: waiting_for_confirmation
                        });
                    }
                }

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

        if (Object.values(bullets) !== null && Object.values(bullets).length > 0) {
            console.log("Update bullets")
            Object.values(bullets).forEach((bullet) => {
                if (bullet.userData.timeToLive < 0) {
                    scene.remove(bullet);
                    delete bullets[bullet.uuid];
                } else {
                    const deltaVelocity = bullet.userData.velocity.clone().multiplyScalar(delta);
                    bullet.position.add(deltaVelocity);
                    bullet.userData.timeToLive -= delta;
                }
            });
        }
    }
}
