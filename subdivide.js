// Copyright Yifei Chen - University of Tokyo Creative Informatics
// For Computer Graphics homework assignment 1

// import * as THREE from 'three';

// import { OrbitControls } from './jsm/controls/OrbitControls.js';
// import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
// import { SimplifyModifier } from './jsm/modifiers/SimplifyModifier.js';

let renderer, scene, camera;

init();

function init() {
  const info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "10px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.innerHTML =
    '<a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> - Vertex Reduction using SimplifyModifier';
  document.body.appendChild(info);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 15;

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.enablePan = false;
  controls.enableZoom = false;

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const light = new THREE.PointLight(0xffffff, 0.7);
  camera.add(light);
  scene.add(camera);

  // new THREE.GLTFLoader().load("LeePerrySmith.glb", function (gltf) {
  new THREE.GLTFLoader().load("ban_hada/scene.gltf", function (gltf) {
    const mesh = gltf.scene.children[0];
    console.log(mesh);
    mesh.position.x = 0;
    mesh.scale.x = 1;
    mesh.scale.y = 1;
    mesh.scale.z = 1;
    // mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);

    const modifier = new THREE.SimplifyModifier();
    const simplified = mesh.clone();
    simplified.traverse(function (child) {
      if (child.isMesh) {
        glTFGeometry = child.geometry;
        const count = Math.floor(glTFGeometry.attributes.position.count * 0.6); // number of vertices to remove
        child.material = child.material.clone();
        child.material.flatShading = true;
        child.geometry = modifier.modify(child.geometry, count);
      }
    });

    // simplified.material = simplified.material.clone();
    // simplified.material.flatShading = true;
    // const count = Math.floor( simplified.geometry.attributes.position.count * 0.9 ); // number of vertices to remove
    // simplified.geometry = modifier.modify( simplified.geometry, count );

    simplified.position.x = 3;
    // simplified.rotation.y = - Math.PI / 2;
    scene.add(simplified);

    render();
  });

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  render();
}

function render() {
  renderer.render(scene, camera);
}
