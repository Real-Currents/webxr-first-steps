import * as THREE from "three";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import lineMaterial from "./material/lineMaterial";
import planeGeometry from "./geometry/planeGeometry";
import meshMaterial from "./material/meshMaterial";

const fontLoader = new FontLoader();
const textureLoader = new THREE.TextureLoader();

export function annotateScene (scene, div, screenWidth, screenHeight, fontSize) {

    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = screenWidth;
    ctx.canvas.height = screenHeight;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    console.log(div.textContent)

    function randInt(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min | 0;
    }

    function drawRandomDot() {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = `#${randInt(0x1000000).toString(16).padStart(6, '0')}`;
        ctx.beginPath();

        const x = randInt(screenWidth);
        const y = randInt(screenHeight);
        const radius = randInt(10, 64);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    const DOMURL = window.URL || window.webkitURL || window;

    const img = new Image();
    let url = "";

    img.onload = function () {
        ctx.drawImage(img, 0, 0, screenWidth, screenHeight);
        DOMURL.revokeObjectURL(url);
    }

    img.src = url;

    const texture = new THREE.CanvasTexture(ctx.canvas);

    // screen
    const screen = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({
        map: texture,
        opacity: 1.0,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.025
    }));
    screen.position.y = 3;
    screen.position.z = -2.5;

    scene.add(screen);

    // 2D stuff...

    fontLoader.load( 'fonts/comfortaa-regular.json', function ( font ) {

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
                size: 0.5,
                depth: 0.01,
                curveSegments: 0.012,
                bevelEnabled: true,
                bevelThickness: 0.010,
                bevelSize: 0.08,
                bevelOffset: 0.0,
                bevelSegments: 0.5
            }), lineMaterial);

        text.position.x = -2.5;
        text.position.y = 5;

        scene.add(text);
    } );

    return function (delta, time, div) {
        requestAnimationFrame(function render() {
            // drawRandomDot();

            const data   = `
<svg xmlns="http://www.w3.org/2000/svg" width="${(screenHeight/2)}" height="${(screenWidth/2)}">
    <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
            ${div.innerHTML.replace("red", "rgba(255, 63, 127, 0.05)")}
        </div>
    </foreignObject>
</svg>
`;
            const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            url = DOMURL.createObjectURL(svg);
            img.src = url;

            ctx.font = `${fontSize} Comfortaa`;
            ctx.strokeStyle = "white";
            ctx.strokeText(div.textContent, 100, (screenWidth - 100));
        });
        texture.needsUpdate = true;
    }
}
