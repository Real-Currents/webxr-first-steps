import * as THREE from "three";

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth - 2, window.innerHeight - 2);

renderer.domElement.style.border = "1px solid #000";

renderer.xr.enabled = true;

export default renderer;
