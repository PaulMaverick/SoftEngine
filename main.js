window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

let canvas;
let device;
let meshes = [];
let mera;
let mesh;
let divCurrentFPS;
let divAverageFPS;
let previousDate = Date.now();
let lastFPSValues = new Array(60);

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = document.getElementById("main-view");
    divCurrentFPS = document.getElementById("currentFPS");
    divAverageFPS = document.getElementById("averageFPS");
    mera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);

    mera.Position = new BABYLON.Vector3(0, 0, 8);
    mera.Target = new BABYLON.Vector3(0, 0, 0);
    loadMesh("monkey.babylon");
    // loadJSONComplete(mesh);
}

function loadMesh(filename) {
    device.LoadJSONFileAsync(filename)
    .then((mesh) => {
        loadJSONComplete(mesh);
    })
    .catch((error) => {
        console.log(`Error loading mesh ${error.message}`);
    })
}

function loadJSONComplete(meshesLoaded) {
    meshes = meshesLoaded;

    requestAnimationFrame(drawingLoop);
}

function drawingLoop() {
    let now = Date.now();
    let currentFPS = 1600 / (now - previousDate);
    previousDate = now;

    divCurrentFPS.textContent = currentFPS.toFixed(2);

    if(lastFPSValues.length < 60) {
        lastFPSValues.push(currentFPS);
    } else {
        lastFPSValues.shift();
        lastFPSValues.push(currentFPS);
        let totalValues = 0;
        for(let i = 0; i < lastFPSValues.length; i++) {
            totalValues += lastFPSValues[i];
        }

        let averageFPS = totalValues / lastFPSValues.length;
        divAverageFPS.textContent = averageFPS.toFixed(2);
    }

    device.clear();
    for (let i = 0; i < meshes.length; i++) {
        // rotating slightly the mesh during each frame rendered
        // meshes[i].Rotation.x += 0.01;
        meshes[i].Rotation.y += 0.01;
    }

    // Doing the various matrix operations
    device.render(mera, meshes);
    // Flushing the back buffer into the front buffer
    device.present();

    // Calling the HTML5 rendering loop recursively
    requestAnimationFrame(drawingLoop);
}


/*
    rectangle
    mesh.Vertices[0] = new BABYLON.Vector3(-1.5, 1, 1);
    mesh.Vertices[1] = new BABYLON.Vector3(1.5, 1, 1);
    mesh.Vertices[2] = new BABYLON.Vector3(-1.5, -1, 1);
    mesh.Vertices[3] = new BABYLON.Vector3(-1.5, -1, -1);
    mesh.Vertices[4] = new BABYLON.Vector3(-1.5, 1, -1);
    mesh.Vertices[5] = new BABYLON.Vector3(1.5, 1, -1);
    mesh.Vertices[6] = new BABYLON.Vector3(1.5, -1, 1);
    mesh.Vertices[7] = new BABYLON.Vector3(1.5, -1, -1);
*/


//vector coordinates of each point of the cube
// mesh.Vertices[0] = new BABYLON.Vector3(-1, 1, 1);
// mesh.Vertices[1] = new BABYLON.Vector3(1, 1, 1);
// mesh.Vertices[2] = new BABYLON.Vector3(-1, -1, 1);
// mesh.Vertices[3] = new BABYLON.Vector3(1, -1, 1);
// mesh.Vertices[4] = new BABYLON.Vector3(-1, 1, -1);
// mesh.Vertices[5] = new BABYLON.Vector3(1, 1, -1);
// mesh.Vertices[6] = new BABYLON.Vector3(1, -1, -1);
// mesh.Vertices[7] = new BABYLON.Vector3(-1, -1, -1);

// mesh.Faces[0] = { A:0, B:1, C:2 };
// mesh.Faces[1] = { A:1, B:2, C:3 };
// mesh.Faces[2] = { A:1, B:3, C:6 };
// mesh.Faces[3] = { A:1, B:5, C:6 };
// mesh.Faces[4] = { A:0, B:1, C:4 };
// mesh.Faces[5] = { A:1, B:4, C:5 };
// mesh.Faces[6] = { A:2, B:3, C:7 };
// mesh.Faces[7] = { A:3, B:6, C:7 };
// mesh.Faces[8] = { A:0, B:2, C:7 };
// mesh.Faces[9] = { A:0, B:4, C:7 };
// mesh.Faces[10] = { A:4, B:5, C:6 };
// mesh.Faces[11] = { A:4, B:6, C:7 };
