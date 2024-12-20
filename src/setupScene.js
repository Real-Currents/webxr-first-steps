import * as THREE from "three";
import planeGeometry from "./geometry/planeGeometry";
import meshMaterial from "./material/meshMaterial";
import boxGeometry from "./geometry/boxGeometry";
import {XR_BUTTONS} from "gamepad-wrapper";
import bulletGeometry from "./geometry/bulletGeometry";

export default async function setupScene (scene, camera, controllers, player, updateDOMData) {

    // Set player view
    player.add(camera);

    // Set camera position
    camera.position.z = 10;
    camera.position.y = 1;

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

    return function () {
        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const { gamepad, raySpace } = controllers.right;

            // Power Ball
            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                const bullet = new THREE.Mesh(bulletGeometry, meshMaterial);

                scene.add(bullet);

                raySpace.getWorldPosition(bullet.position);
                raySpace.getWorldQuaternion(bullet.quaternion);

                if (typeof updateDOMData === "function") {
                    updateDOMData({
                        position: bullet.position,
                        quaternion: bullet.quaternion
                    });
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
    }
}
