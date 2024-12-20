import * as THREE from "three";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import lineMaterial from "./material/lineMaterial";

const loader = new FontLoader();

export function annotateScene (scene) {

    // 2D stuff...

    loader.load( 'fonts/Comfortaa_Regular.json', function ( font ) {

        console.log("FontLoader loaded: ", font);

        // create points on a line
        const points = [];
        points.push( new THREE.Vector3( 0, 0, 0 ) );
        points.push( new THREE.Vector3( 5, 5, 0 ) );
        points.push( new THREE.Vector3( 10, 0, 0 ) );
        const geometry = new THREE.BufferGeometry().setFromPoints( points );

        const line = new THREE.Line(geometry, lineMaterial);

        line.position.x = -5;

        scene.add(line);

        const text = new THREE.Line(new TextGeometry(
            'Hello three.js!', {
                font: font,
                size: 1,
                depth: 0.01,
                curveSegments: 0.012,
                bevelEnabled: true,
                bevelThickness: 0.010,
                bevelSize: 0.08,
                bevelOffset: 0.0,
                bevelSegments: 0.5
            }), lineMaterial);

        text.position.x = -5;
        text.position.y = 5;

        scene.add(text);
    } );
}
