import * as THREE from "three";
import lineMaterial from "./material/lineMaterial";

export function annotateScene (scene) {

    // 2D stuff...
    // create points on a line
    const points = [];
    points.push( new THREE.Vector3( - 5, 0, 0 ) );
    points.push( new THREE.Vector3( 0, 5, 0 ) );
    points.push( new THREE.Vector3( 5, 0, 0 ) );
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, lineMaterial );

    scene.add(line);
}
