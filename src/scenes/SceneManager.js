import * as THREE from "three";
import { OrbitControls } from "../js/three/OrbitControls";
import Ground from "./Ground";
import GrassField from "./GrassField";
import AmbientLight from "./AmbientLight";
import DirectionalLight from "./DirectionalLight";
import { getValue } from "../utils/helpers";
import Hawk, { getHawk, NAME as hawkName, TYPE as hawkType } from "./Hawk";
import Bush, { NAME as bushName, TYPE as bushType } from "./Bush";
import Tree, { NAME as treeName, TYPE as treeType } from "./Tree";
import Hare, { NAME as hareName, TYPE as hareType } from "./Hare";
import { getCapiInstance } from "../utils/CAPI/capi";
import { FlyControls } from "../js/three/FlyControls";
import PreLoadModels from "./PreLoadModels";
import SpotLight from "./SpotLight";
import { getPopUpInfo } from "../components/PopUpInfo";
import { addListenerFor } from "../utils/CAPI/listeners";
import ModelFactory from "./ModelFactory";

const modelMap = {
  [hawkType]: Hawk,
  [hareType]: Hare,
  [bushType]: Bush,
  [treeType]: Tree
};

class SceneManager {
  groundSize = {
    x: 1000,
    y: 1000
  }
  camera = null
  scene = null
  renderer = null
  cameraControls = null
  loaded = false
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  clock = new THREE.Clock()
  screenDimensions = {}
  subjects = []
  selected = []
  intersected = null
  defaultCameraPosition = [0, 40, 400]
  loadingScreen = null

  constructor (canvas) {
    this.setCanvas(canvas);
    this.initializeLoadingScreen();
    this.initializeScene();
    this.initializeRenderer();
    this.initializeCamera();

    this.createSceneSubjects();
  }

  initializeLoadingScreen () {
    const { width, height } = this.screenDimensions;
    const aspectRatio = width / height;

    this.loadingScreen = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000),
      indicator: new THREE.Mesh(
        new THREE.CircleGeometry(1, 32),
        new THREE.MeshBasicMaterial({
          color: "#3f51b5",
          side: THREE.DoubleSide
        })
      )
    };
    this.loadingScreen.scene.background = new THREE.Color("#FFFFFF");
    this.loadingScreen.indicator.position.set(0, 0, 5);
    this.loadingScreen.camera.lookAt(this.loadingScreen.indicator.position);
    this.loadingScreen.scene.add(this.loadingScreen.indicator);
  }

  setCanvas (canvas) {
    const { width, height } = canvas;
    this.canvas = canvas;
    this.screenDimensions = { width, height };
  }

  onLoad = () => {
    this.loaded = true;
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
      if (getValue("userData.name") === hawkName) {
        const capi = getCapiInstance();
        const currentHawkCount = capi.getValue({ key: "redtailHawkSelected" });
        capi.setValue({
          key: "redtailHawkSelected",
          value: currentHawkCount - 1
        });
      }
      this.selected.splice(modelIndex, 1);
    } else {
      const color = getValue("material.color", model);
      const selectedColor = getValue("userData.color.selected", model);
      const name = getValue("userData.name", model);
      color.set && color.set(selectedColor);
      if (name === hawkName) {
        const capi = getCapiInstance();
        const currentHawkCount = capi.getValue({ key: "redtailHawkSelected" });
        capi.setValue({
          key: "redtailHawkSelected",
          value: currentHawkCount + 1
        });
      }
      this.selected.push(model);
    }
  }

  update () {
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    for (let i = 0; i < this.subjects.length; i++) {
      this.subjects[i].update && this.subjects[i].update(elapsedTime);
    }

    this.cameraControls.update(delta);
    if (!this.loaded) {
      this.renderer.render(this.loadingScreen.scene, this.loadingScreen.camera);
      return;
    }
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
      // console.log("called else");
      this.resetIntersectedColor(this.intersected);
      this.intersected = null;
    }
    // look for tree
    // const intersects2 =
    //    this.raycaster.intersectObject(this.scene.tree, true);
    /*
    if (intersects2.length > 0) {
      if (this.intersected !== intersects2[0].object) {
        this.resetIntersectedColor(this.intersected);
        this.intersected = getValue("object", intersects2[0]);

        const selectable = getValue("userData.selectable", this.intersected);
        if (selectable) {
          console.log("tree is selected " + selectable + "intersected " + this.intersected);
          const highlight = getValue(
              "userData.color.highlight",
              this.intersected
          );
          const color = getValue("material.color", this.intersected);
          color.set && color.set(highlight);
        }
      }
    } else {
      console.log("called else");
      this.resetIntersectedColor(this.intersected);
      this.intersected = null;
    }
    */
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

  async createSceneSubjects () {
    const grassField = await ModelFactory.makeSceneObject({
      type: "grassField",
      config: { onLoad: this.onLoad }
    });

    this.subjects = [
      ModelFactory.makeSceneObject({ type: "ambientLight" }),
      ModelFactory.makeSceneObject({ type: "directionalLight" }),
      ModelFactory.makeSceneObject({ type: "spotLight" }),
      ModelFactory.makeSceneObject({
        type: "ground",
        config: { size: this.groundSize, color: "#996600" }
      }),
      grassField
    ];

    this.subjects.forEach(subject => {
      this.scene.add(subject.model);
    });
  }

  addObject (sceneObject) {
    this.subjects.push(sceneObject);
    this.scene.add(sceneObject.model);
  }

  removeObject (idx, sceneObject) {
    this.subjects.splice(idx, 1);
    this.scene.remove(sceneObject);
  }

  removeMostRecentModelByType ({ type }) {
    const lastCreated = this.subjects
      .filter(subject => {
        if (subject.model) {
          return subject.model.type === type;
        }
        return false;
      })
      .map(subject => subject.created)
      .reduce((a, b) => Math.max(a, b))
      .valueOf();

    const mostRecentModel = this.subjects.find(subject => {
      if (subject.created) {
        return subject.created.valueOf() === lastCreated;
      }
      return false;
    });
    this.scene.remove(mostRecentModel);
  }

  removeAllModelsByType (type) {
    const modelsToRemove = this.subjects
      .filter(subject => {
        if (subject.model) {
          return subject.model.type === type;
        }
        return false;
      })
      .map(({ model }) => model);

    this.subjects = this.subjects.filter(subject => {
      if (subject.model) {
        return subject.model.type !== type;
      }
      return true;
    });
    modelsToRemove.forEach(model => this.scene.remove(model));
  }

  onTransporterReady () {
    const capi = getCapiInstance();
    console.log("test");
    const [hawks, hares, cedars, bushes] = capi.getValues({
      keys: [
        "redtailHawkCount",
        "snowshoeHareCount",
        "westernCedarCount",
        "sageBushCount"
      ]
    });
    capi.addListenerFor({
      key: "redtailHawkCount",
      callback: this.handleModelCountChange({
        type: "Hawk",
        key: "redtailHawkCount"
      })
    });

    capi.addListenerFor({
      key: "snowshoeHareCount",
      callback: this.handleModelCountChange({
        type: "Hare",
        key: "snowshoeHareCount"
      })
    });

    capi.addListenerFor({
      key: "westernCedarCount",
      callback: this.handleModelCountChange({
        type: "Tree",
        key: "westernCedarCount"
      })
    });

    capi.addListenerFor({
      key: "sageBushCount",
      callback: this.handleModelCountChange({
        type: "Bush",
        key: "sageBushCount"
      })
    });

    new PreLoadModels({ hawks, hares, cedars, bushes });
  }

  addObjects ({ type, count }) {
    for (let i = 0; i < count; i++) {
      const model = ModelFactory.makeSceneObject({ type });
      this.addObject(model);
    }
  }

  handleModelCountChange = ({ type, key }) => capiModel => {
    this.removeAllModelsByType({ type });
    const count = capiModel.get(key);
    this.addObjects({ type, count });
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
    if (intersects.length > 1 && model.object.name !== "LowPolyGrass") {
      getPopUpInfo().popUpInfo("tree", event);
    }
    if (isSelectable) {
      this.toggleSelected(model.object);
      const popUpInfo = getPopUpInfo();
      popUpInfo.popUpInfo(model.object.name, event);
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
    const farPlane = 4000;

    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      aspectRatio,
      nearPlane,
      farPlane
    );

    this.camera.position.set(...this.defaultCameraPosition);

    this.cameraControls = new OrbitControls(this.camera);
  }

  setFlyControlCamera () {
    this.camera.position.x = 100;
    this.camera.position.y = 100;
    this.camera.position.z = 300;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.cameraControls = new FlyControls(this.camera);

    this.cameraControls.movementSpeed = 25;
    this.cameraControls.domElement = document.querySelector("#root");
    this.cameraControls.maxPolarAngle = Math.PI * 0.5;
    this.cameraControls.rollSpeed = Math.PI / 24;
    this.cameraControls.autoForward = true;
    this.cameraControls.dragToLook = true;
  }

  setCameraPosition (x, y, z) {
    this.cameraControls = new OrbitControls(this.camera);

    this.camera.position.x = x;
    this.camera.position.y = y;
    this.camera.position.z = z;
  }

  setDefaultCamera () {
    this.camera.position.set(...this.defaultCameraPosition);
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
