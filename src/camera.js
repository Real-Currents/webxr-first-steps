import * as THREE from "three";

export default function cameraFactory (width, height) {
    return new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
}
