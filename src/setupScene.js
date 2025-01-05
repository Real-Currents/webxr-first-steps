import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { XR_BUTTONS } from "gamepad-wrapper";
import { Text } from "troika-three-text";

import boxGeometry from "./geometry/boxGeometry";
import bulletGeometry from "./geometry/bulletGeometry";
import meshMaterial from "./material/meshMaterial";

import defaultFragmentShader from './shaders/default/fragmentShader.glsl';

// import defaultVertexShader from './shaders/default/vertexShader.glsl';
import wavesVertexShader from './shaders/waves/vertexShader.glsl';


const bulletSpeed = 3;
const bulletTimeToLive = 5;
const bullets = {};

const gltfLoader = new GLTFLoader();

const audioLoader = new THREE.AudioLoader();

const listener = new THREE.AudioListener();

let waiting_for_confirmation = false;

const SIZE = 10;
const RESOLUTION = 512;

export default async function setupScene (scene, camera, controllers) {

    const uniforms = {
        ...THREE.ShaderLib.physical.uniforms,
        // diffuse: { value: "#5B82A6" }, // <= DO NO USE WITH THREE.ShaderChunk.meshphysical_frag ...
        diffuse: { value: { "r": 0.36, "g": 0.51, "b": 0.65 } },
        roughness: { value: 0.5 },
        amplitude: { value: 0.25},
        frequency: { value: 0.5 },
        speed: { value: 0.3 },
        time: { value: 1.0 }
    };

    const geometry = new THREE.PlaneGeometry(SIZE, SIZE, RESOLUTION, RESOLUTION).rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: wavesVertexShader,
        fragmentShader: defaultFragmentShader,
        lights: true,
        side: THREE.DoubleSide,
        defines: {
            STANDARD: '',
            PHYSICAL: '',
        },
        extensions: {
            derivatives: true,
        },
    });

    // Wavy Floor
    const floor = new THREE.Mesh(geometry, material);

    floor.position.y += 0.25;

    const rotatingTargetGroup = new THREE.Group();

    // Rotating Cube
    const rotatingMesh = (controllers.left === null) ?
        new THREE.Mesh(boxGeometry, meshMaterial) :
        // ... or Controller mesh
        controllerModelFactory.createControllerModel(controllers.left.gripSpace);

    // Later used for updating material of each rotating cube face...
    const cube_faces = [
        material, // hidden_box_face,
        material,
        material,
        material,
        material,
        material,
    ];

    const hidden_box_face = meshMaterial.clone();
    hidden_box_face.opacity = 0.0;
    hidden_box_face.transparent = true;

    rotatingTargetGroup.add(rotatingMesh);

    rotatingTargetGroup.position.x = 0;
    rotatingTargetGroup.position.y = 2;
    rotatingTargetGroup.position.z = -2.5;

    rotatingTargetGroup.rotX = function (x) {
        // console.log(this);
        this.rotation.x += x;
    }

    rotatingTargetGroup.rotY = function (y) {
        // console.log(this);
        this.rotation.y += y;
    }

    const scoreText = new Text();;

    gltfLoader.load("assets/spacestation.glb", (gltf_file) => {
        const scene_posistion = { x: 0, y: 0, z: -1 };

        const space_station_scene = gltf_file.scene;
        space_station_scene.position.x += scene_posistion.x;
        space_station_scene.position.y += scene_posistion.y;
        space_station_scene.position.z += scene_posistion.z;
        scene.add(gltf_file.scene);

        scene.add(floor);

        // Add the score text to the scene
        scoreText.fontSize = 0.52;
        scoreText.font = "assets/fonts/SpaceMono-Bold.ttf";
        scoreText.position.z = -2;
        scoreText.color = 0xffa276;
        scoreText.anchorX = 'center';
        scoreText.anchorY = 'middle'
        scoreText.position.set(0 + scene_posistion.x, 0.67 + scene_posistion.y, -1.44 + scene_posistion.z);
        scoreText.rotateX(-Math.PI / 3.3);
        scene.add(scoreText);

        scene.add(rotatingTargetGroup);

        // Faces of rotatingMesh (cube)
        const faces = getFaces(rotatingMesh);
        faces.forEach((face) => {
            console.log("Face:", face);
        });
    });

    // Score sound
    const scoreSound = new THREE.PositionalAudio(listener);
    audioLoader.load('assets/score.ogg', buffer => {
        scoreSound.setBuffer(buffer);
        scoreText.add(scoreSound);
    });

    scoreSound.play();

    scoreText.sync();

    function updateScoreDisplay (new_score) {
        const clampedScore = Math.max(0, Math.min(9999, new_score));
        const displayScore = clampedScore.toString().padStart(4, '0');
        scoreText.text = displayScore;
        scoreText.sync();
    }

    return function (currentSession, delta, time, text, updateData) {

        const data = {};

        let score = text.toString().match(/(\d+)$/)[0];

        score = (!!score) ? parseInt(score) : 0;

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

                data["event"] = "Shoot";
                data["position"] = bullet.position;
                data["quaternion"] = bullet.quaternion;

                if (!!waiting_for_confirmation) {
                    console.log("Cancel event");
                    waiting_for_confirmation = false;
                }

                data["waiting_for_confirmation"] = waiting_for_confirmation;

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                console.log("BUTTON_2 (A) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);
                if (!!waiting_for_confirmation) {
                    console.log("Confirm event");
                    waiting_for_confirmation = false;
                    console.log("End session");

                    data["event"] = "End session confirmed";
                    data["waiting_for_confirmation"] = waiting_for_confirmation;

                    currentSession.end();
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                console.log("BUTTON_2 (B) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel event");
                    waiting_for_confirmation = false;

                    data["event"] = "End session cancelled";
                    data["waiting_for_confirmation"] = waiting_for_confirmation;

                } else {
                    console.log("Waiting for confirmation...")
                    waiting_for_confirmation = true;

                    data["event"] = "End session initiated";
                    data["waiting_for_confirmation"] = waiting_for_confirmation;

                }

            } else {
                for (const b in XR_BUTTONS) {
                    if (XR_BUTTONS.hasOwnProperty(b)) {
                        // console.log("Check button: ", XR_BUTTONS[b]);
                        if (gamepad.getButtonClick(XR_BUTTONS[b])) {
                            console.log("Button on right controller was activated:", XR_BUTTONS[b], gamepad);
                            if (!!waiting_for_confirmation) {
                                console.log("Cancel event");
                                waiting_for_confirmation = false;

                                data["event"] = "End session cancelled";
                            }

                            data["waiting_for_confirmation"] = waiting_for_confirmation;
                        }
                    }
                }
            }
        }

        if (Object.values(bullets) !== null && Object.values(bullets).length > 0) {
            console.log("Update bullets");

            Object.values(bullets).forEach((bullet) => {
                const distance_to_target = rotatingTargetGroup.position.distanceTo(bullet.position);
                
                if (distance_to_target < 1) {
                    // Check target intersection
                    scene.remove(bullet);
                    delete bullets[bullet.uuid];

                    if (scoreSound.isPlaying) {
                        scoreSound.stop();
                    }
                    scoreSound.play();

                    // make target disappear, and then reappear at a different place after 2 seconds
                    rotatingTargetGroup.visible = false;
                    rotatingTargetGroup.position.x = Math.random() * 5 - 2.5;
                    rotatingTargetGroup.position.z = Math.random() * -5;

                    setTimeout(() => {
                        rotatingTargetGroup.visible = true;
                    }, 2000);

                    score += 10; // Update the score when a target is hit

                    if (!data.hasOwnProperty("event")) {
                        data["event"] = "Hit";
                    }
                    data["score"] = score;

                    data["waiting_for_confirmation"] = waiting_for_confirmation;

                    console.log("data: ", data);

                    updateScoreDisplay(score);

                } else if (bullet.userData.timeToLive < 0) {
                    // Check bullet life cycle
                    scene.remove(bullet);
                    delete bullets[bullet.uuid];

                } else {
                    const deltaVelocity = bullet.userData.velocity.clone().multiplyScalar(delta);
                    bullet.position.add(deltaVelocity);
                    bullet.userData.timeToLive -= delta;
                }
            });
        }

        // update the time uniform
        floor.material.uniforms.time.value = time;

        rotatingTargetGroup.rotX(0.01);
        rotatingTargetGroup.rotY(0.01);

        rotatingMesh.material = cube_faces;

        if (data.hasOwnProperty("event") && typeof updateData === "function") {
            updateData(data);
        }

    }
}


//------------------------
// Util functions to extract face geometry from:
// https://discourse.threejs.org/t/how-ot-get-vertices-faces-facevertexuvs-from-buffergeometry/23086/3
//------------------------

function isIndexed(mesh) {
    return mesh.geometry.index != null;
}

function getFaces(mesh) {
    const faces = [];
    const position = mesh.geometry.getAttribute( 'position' );

    if (isIndexed(mesh)) {
        const index = mesh.geometry.getIndex();

        for ( let i = 0; i < index.count; i += 3 ) {
            const face = {
                a: index.getX(i),
                b: index.getX(i+1),
                c: index.getX(i+2),
                normal: new THREE.Vector3()
            };
            faces.push(face);
        }
    }
    else {
        for ( let i = 0; i < position.count; i += 3 ) {
            const face = {
                a: i,
                b: i+1,
                c: i+2
            };
            faces.push(face);
        }
    }


    for( let j = 0; j < faces.length; j ++ ) {
        const face = faces[j];
        let pointA = new THREE.Vector3(
            position.getX(face.a),
            position.getY(face.a),
            position.getZ(face.a)
        );
        let pointB = new THREE.Vector3(
            position.getX(face.b),
            position.getY(face.b),
            position.getZ(face.b)
        );
        let pointC = new THREE.Vector3(
            position.getX(face.c),
            position.getY(face.c),
            position.getZ(face.c)
        );

        let faceTriangule = new THREE.Triangle(
            pointA,
            pointB,
            pointC
        );

        faceTriangule.getNormal(faces[j].normal);
    }

    return faces;
}

function getVertices(mesh) {
    const position = mesh.geometry.getAttribute( 'position' );
    const vertices = [];

    for ( let i = 0; i < position.count / position.itemSize; i++ ) {
        const vertex = new THREE.Vector3(
            position.getX(i),
            position.getY(i),
            position.getZ(i)
        );

        vertices.push(vertex);
    }

    return vertices;
}

function getFaceVertexUvs(mesh) {
    const faceVertexUvs = [];
    const uv = mesh.geometry.getAttribute( 'uv' );

    if (isIndexed(mesh)) {
        const index = mesh.geometry.getIndex();

        for ( let i = 0; i < index.count; i += 3 ) {
            const faceVertexUv = [
                new Vector2(
                    uv.getX( index.getX(i) ),
                    uv.getY( index.getX(i) )
                ),
                new Vector2(
                    uv.getX( index.getX(i+1) ),
                    uv.getY( index.getX(i+1) )
                ),
                new Vector2(
                    uv.getX( index.getX(i+2) ),
                    uv.getY( index.getX(i+2) )
                )
            ];

            faceVertexUvs.push(faceVertexUv);
        }
    }
    else {
        for ( let i = 0; i < uv.count; i += 3 ) {
            const faceVertexUv = [
                new Vector2(
                    uv.getX(i),
                    uv.getY(i)
                ),
                new Vector2(
                    uv.getX(i+1),
                    uv.getY(i+1)
                ),
                new Vector2(
                    uv.getX(i+2),
                    uv.getY(i+2)
                )
            ];

            faceVertexUvs.push(faceVertexUv);
        }
    }

    return faceVertexUvs;
}
