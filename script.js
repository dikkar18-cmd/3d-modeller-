// ============================
// 1. GLOBAL STATE
// ============================
const objects = [];
let selectedObject = null;
let editMode = false;
let userObject = null;

// ============================
// 2. SCENE SETUP
// ============================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 3, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ============================
// 3. CONTROLS
// ============================
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.5;
controls.maxDistance = 10;

// ============================
// 4. LIGHTING & GRID
// ============================
scene.add(new THREE.GridHelper(20, 20));

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ============================
// 5. MAIN OBJECT (REFERENCE)
// ============================
const baseGeo = new THREE.SphereGeometry(1, 32, 32);
const baseMat = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  wireframe: true
});
const mainObject = new THREE.Mesh(baseGeo, baseMat);
mainObject.position.y = 1;
registerObject(mainObject);

// ============================
// 6. OBJECT REGISTRATION
// ============================
function registerObject(obj) {
  objects.push(obj);
  scene.add(obj);
}

// ============================
// 7. SELECTION SYSTEM
// ============================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(objects, true);

  if (hits.length > 0) {
    selectedObject = hits[0].object;
    highlight(selectedObject);
    if (editMode) showVertexHandles(selectedObject);
  }
});

function highlight(obj) {
  objects.forEach(o => {
    if (o.material?.emissive) o.material.emissive.set(0x000000);
  });
  if (obj.material?.emissive) obj.material.emissive.set(0x333333);
}

// ============================
// 8. EDIT MODE
// ============================
document.getElementById("editModeToggle").onclick = () => {
  editMode = !editMode;
  document.getElementById("editModeToggle").innerText =
    `Edit Mode: ${editMode ? "ON" : "OFF"}`;

  if (!editMode) clearHandles();
  else if (selectedObject) showVertexHandles(selectedObject);
};

// ============================
// 9. VERTEX HANDLES
// ============================
const vertexHandles = [];

function showVertexHandles(mesh) {
  clearHandles();
  const pos = mesh.geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const h = new THREE.Mesh(
      new THREE.SphereGeometry(0.05),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    h.position.fromBufferAttribute(pos, i);
    h.userData = { mesh, index: i };
    scene.add(h);
    vertexHandles.push(h);
  }
}

function clearHandles() {
  vertexHandles.forEach(h => scene.remove(h));
  vertexHandles.length = 0;
}

// ============================
// 10. TOOLS
// ============================
document.getElementById("addCube").onclick = () => {
  const c = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  );
  c.position.y = 0.5;
  registerObject(c);
};

document.getElementById("addSphere").onclick = () => {
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xff00ff })
  );
  s.position.y = 0.5;
  registerObject(s);
};

document.getElementById("convertTriangle").onclick = () => {
  if (!selectedObject) return;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -0.5, 0, 0,
         0.5, 0, 0,
         0,   1, 0
      ]),
      3
    )
  );
  geo.computeVertexNormals();
  selectedObject.geometry.dispose();
  selectedObject.geometry = geo;

  if (editMode) showVertexHandles(selectedObject);
};

document.getElementById("smoothToggle").onclick = () => {
  if (selectedObject) selectedObject.geometry.computeVertexNormals();
};

// ============================
// 11. FILE IMPORT
// ============================
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  const name = file.name.toLowerCase();

  reader.onload = (ev) => {
    if (userObject) scene.remove(userObject);

    if (name.endsWith(".glb") || name.endsWith(".gltf")) {
      new THREE.GLTFLoader().parse(ev.target.result, "", (gltf) => {
        userObject = gltf.scene;
        registerObject(userObject);
      });
    } else if (name.endsWith(".obj")) {
      userObject = new THREE.OBJLoader().parse(ev.target.result);
      registerObject(userObject);
    }
  };

  name.endsWith(".glb") ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
});

// ============================
// 12. ANIMATION LOOP
// ============================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
