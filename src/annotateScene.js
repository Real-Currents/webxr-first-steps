import * as THREE from "three";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Text } from 'troika-three-text';

import lineMaterial from "./material/lineMaterial";
import planeGeometry from "./geometry/planeGeometry";
import meshMaterial from "./material/meshMaterial";

const fontLoader = new FontLoader();
const textureLoader = new THREE.TextureLoader();
const base64_url = [ "" ];

export function annotateScene (scene, div, screenWidth, screenHeight, fontSize, position) {

    const ctx = document.createElement('canvas').getContext('2d');
    const DOMURL = window.URL || window.webkitURL || window;
    const img = new Image();
    const texture = new THREE.CanvasTexture(ctx.canvas);
    const { x, y, z } = position;

    ctx.canvas.width = screenWidth;
    ctx.canvas.height = screenHeight;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // img.onload = function () {
    //     // console.log(base64_url);
    //     ctx.fillStyle = "grey";
    //     ctx.fillRect(0, 0, screenWidth, screenHeight/4 + 100);
    //     ctx.drawImage(img, 0, 0, screenWidth, screenHeight); // <= Reduces framerate by > 30% !
    //     DOMURL.revokeObjectURL(base64_url.pop());
    // }
    //
    // img.src = base64_url.pop();

    function randInt(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min | 0;
    }

    function drawRandomDot() {
        ctx.strokeStyle = `#${randInt(0x1000000).toString(16).padStart(6, '0')}`;
        ctx.fillStyle = `#${randInt(0x1000000).toString(16).padStart(6, '0')}`;
        ctx.beginPath();

        const x = randInt(screenWidth);
        const y = randInt(screenHeight);
        const radius = randInt(10, 64);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
    }

    for (let i = 0; i < 1000; i++) {
        drawRandomDot();
    }

    function renderScreen(text) {

        drawRandomDot();

        if (base64_url.length <= 1) {

            const data   = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${(screenHeight/2)}" height="${(screenWidth/2)}">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml">
                            ${div.innerHTML
                                .replace("border-radius: 0px", "border-radius: 20px")
                                .replace("red", "rgba(255, 63, 127, 0.05)")}
                        </div>
                    </foreignObject>
                </svg>
                `;
            const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            base64_url.push(DOMURL.createObjectURL(svg));
            if (!!img && img.hasOwnProperty("src")) {
                img.src = base64_url[(base64_url.length - 1)];
            }
        }

        ctx.font = `${fontSize} Comfortaa`;
        ctx.fillStyle = "grey";
        ctx.fillRect(0, screenHeight/2 - 100, screenWidth, 200);
        ctx.fillStyle = "white";
        ctx.fillText(text, 10, screenHeight/2);
    }

    // Create screen
    const screenCanvas = new THREE.MeshBasicMaterial({
        map: texture,
        opacity: 1.0,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.025
    });
    const screen = new THREE.Mesh(planeGeometry, screenCanvas); // meshMaterial);
    screen.position.x = x;
    screen.position.y = y;
    screen.position.z = z;

    // Create points on a line
    const points = [];
    points.push( new THREE.Vector3( -5 + x, 0 + y, 0 + z ) );
    points.push( new THREE.Vector3( 0 + x, 5 + y, 0 + z ) );
    points.push( new THREE.Vector3( 5 + x, 0 + y, z ) );
    const geometry = new THREE.BufferGeometry().setFromPoints( points );

    const line = new THREE.Line(geometry, lineMaterial);

    scene.add(line);

    scene.add(screen);

    texture.needsUpdate = true; // <= DANGEROUS when used with canvas (2d)!

    fontLoader.load( 'fonts/comfortaa-regular.json', function ( font ) {

        console.log("FontLoader loaded: ", font);

        const textMesh = new THREE.Line(new TextGeometry(
            'Hello three.js!', {
                font: font,
                size: 0.5,
                depth: 0.01,
                curveSegments: 0.012,
                bevelEnabled: true,
                bevelThickness: 0.010,
                bevelSize: 0.08,
                bevelOffset: 0.0,
                bevelSegments: 0.5
            }), lineMaterial);

        textMesh.position.x = -2.5 + x;
        textMesh.position.y = 5 + y;
        textMesh.position.z = 0 + z;

        scene.add(textMesh);
    });

    return function (currentSession, delta, time, div, text) {
        // requestAnimationFrame(render);
        if (!!text) {
            renderScreen(text);
        } else {
            renderScreen(div.textContent);
        }
    }
}
