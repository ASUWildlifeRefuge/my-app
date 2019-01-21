import * as THREE from "three";
import { OrbitControls } from "../js/three/OrbitControls";
import Ground from "./Ground";
import GrassField from "./GrassField";
import AmbientLight from "./AmbientLight";
import DirectionalLight from "./DirectionalLight";
import { getValue } from "../utils/helpers";

class SceneManager {
  groundSize = {
    x: 100,
    y: 100
  }
  camera = null
  scene = null
  renderer = null
  cameraControls = null
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  clock = new THREE.Clock()
  screenDimensions = {}
  subjects = []
  selected = []
  intersected = null

  constructor (canvas) {
    this.setCanvas(canvas);
    this.initializeScene();
    this.initializeRenderer();
    this.initializeCamera();

    this.createSceneSubjects();
  }

  setCanvas (canvas) {
    const { width, height } = canvas;
    this.canvas = canvas;
    this.screenDimensions = { width, height };
  }

  resetCamera () {
    this.cameraControls.reset();
  }

  toggleSelected (model) {
    const modelIndex = this.selected.findIndex(
      selectedModel => model === selectedModel
    );

    if (modelIndex >= 0) {
      const modelToRemove = this.selected[modelIndex];
      const originalColor = getValue("userData.color.original", modelToRemove);

      const color = getValue("material.color", modelToRemove);
      color.set && color.set(originalColor);
      this.selected.splice(modelIndex, 1);
    } else {
      const color = getValue("material.color", model);
      const selectedColor = getValue("userData.color.selected", model);
      color.set && color.set(selectedColor);
      this.selected.push(model);
    }
  }

  update () {
    const elapsedTime = this.clock.getElapsedTime();
    for (let i = 0; i < this.subjects.length; i++) {
      this.subjects[i].update && this.subjects[i].update(elapsedTime);
    }

    this.cameraControls.update();
    this.renderer.render(this.scene, this.camera);
    this.checkIntersects();
  }

  checkIntersects = () => {
    const intersects =
      this.raycaster.intersectObjects(this.scene.children, true) || [];

    if (intersects.length > 0) {
      if (this.intersected !== intersects[0].object) {
        this.resetIntersectedColor(this.intersected);
        this.intersected = getValue("object", intersects[0]);

        const selectable = getValue("userData.selectable", this.intersected);
        if (selectable) {
          const highlight = getValue(
            "userData.color.highlight",
            this.intersected
          );
          const color = getValue("material.color", this.intersected);
          color.set && color.set(highlight);
        }
      }
    } else {
      this.resetIntersectedColor(this.intersected);
      this.intersected = null;
    }
  }

  resetIntersectedColor (intersected) {
    const selectableKey = "userData.selectable";
    if (intersected && getValue(selectableKey, intersected)) {
      const color = getValue("material.color", intersected);
      const isSelected =
        this.selected.findIndex(model => model === intersected) >= 0;

      if (color.set) {
        const colorKey = `userData.color.${
          isSelected ? "selected" : "original"
        }`;
        color.set(getValue(colorKey, intersected));
      }
    }
  }

  rotateCamera (elapsedTime) {
    this.camera.position.x = 120 * Math.cos(elapsedTime / 8);
    this.camera.position.z = 120 * Math.sin(elapsedTime / 8);
    this.camera.lookAt(this.scene.position);
  }

  createSceneSubjects () {
    this.subjects = [
      new Ground(this.scene, { size: this.groundSize, color: "#996600" }),
      new GrassField(this.scene, { count: 500 }),
      new AmbientLight(this.scene),
      new DirectionalLight(this.scene)
    ];
  }

  addObject (sceneObject, position) {
    this.subjects.push(sceneObject);
  }

  onWindowResize () {
    const { width, height } = this.canvas;

    this.screenDimensions.width = width;
    this.screenDimensions.height = height;

    this.renderer.setSize(width, height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  handleClick = event => {
    const vector = this.convertClickToVector(event);
    this.raycaster.set(this.camera.position, vector);
    const intersects =
      this.raycaster.intersectObjects(this.scene.children, true) || [];

    const model = intersects[0] || {};
    const isSelectable = !!getValue("object.userData.selectable", model);

    if (isSelectable) {
      this.toggleSelected(model.object);
    }
  }

  convertClickToVector = event => {
    const vector = new THREE.Vector3();
    const canvasTopOffset = this.canvas.getBoundingClientRect().top;
    vector.x = (event.clientX / this.canvas.width) * 2 - 1;
    vector.y = (-(event.clientY - canvasTopOffset) / this.canvas.height) * 2 + 1;

    vector.unproject(this.camera);
    vector.sub(this.camera.position);
    vector.normalize();
    return vector;
  }

  onDocumentMouseClick = event => {
    this.handleClick(event);
  }

  onDocumentMouseMove = event => {
    const vector = this.convertClickToVector(event);
    this.raycaster.set(this.camera.position, vector);
  }

  initializeCamera () {
    const { width, height } = this.screenDimensions;
    const fieldOfView = 60;
    const aspectRatio = width / height;
    const nearPlane = 1;
    const farPlane = 1000;

    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      aspectRatio,
      nearPlane,
      farPlane
    );

    this.camera.position.set(0, 75, 100);

    this.cameraControls = new OrbitControls(this.camera);
  }

  initializeScene () {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#ffffff");
  }

  initializeRenderer () {
    const { width, height } = this.screenDimensions;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height);
  }
}

export const getSceneManager = () => {
  return SceneManager.instance || null;
};

export default function (container) {
  if (!SceneManager.instance) {
    SceneManager.instance = new SceneManager(container);
  }
  return SceneManager.instance;
}
