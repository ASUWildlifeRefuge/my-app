/*
   Created by: Thongphanh Duangboudda
   Date: March 18, 2019

 */

import {getSimTime} from "../components/UI/DisplayTime";
import AddModels from "./AddModels";
import {getSceneManager} from "./SceneManager";
const maxAmountOfTree = 15;
let timeInterval = 1;
let days = timeInterval;

function AddModelsBasedOnSimTime() {

const sceneManager = getSceneManager();
    const simTime = getSimTime();
    let numberOfTrees = 0;
    const trees = sceneManager.getSceneObjectsOf({ types: ["Tree"] });
    numberOfTrees = trees.length;

   //adding tree every 1 days (simulation time)
    if( parseInt(simTime.getDay()) >= days && parseInt(simTime.getDay()%(timeInterval)) == 0){
        if(numberOfTrees < maxAmountOfTree && numberOfTrees >= 2){
            new AddModels("tree");
        }
        days = days +timeInterval;
    }


    function addGras() {
        //TODO: need logic for adding grass

    }
}

export default AddModelsBasedOnSimTime;