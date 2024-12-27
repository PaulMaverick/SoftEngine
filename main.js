let canvas;
let device;
let mesh;
let meshes = [];
let mera;

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = document.getElementById("main-view");
    mesh = new SoftEngine.Mesh("Cube", 8);
    meshes.push(mesh);
    mera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);

    //vector coordinates of each point of the cube
    mesh.Vertices[0] = new BABYLON.Vector3(-1, 1, 1);
    mesh.Vertices[1] = new BABYLON.Vector3(1, 1, 1);
    mesh.Vertices[2] = new BABYLON.Vector3(-1, -1, 1);
    mesh.Vertices[3] = new BABYLON.Vector3(-1, -1, -1);
    mesh.Vertices[4] = new BABYLON.Vector3(-1, 1, -1);
    mesh.Vertices[5] = new BABYLON.Vector3(1, 1, -1);
    mesh.Vertices[6] = new BABYLON.Vector3(1, -1, 1);
    mesh.Vertices[7] = new BABYLON.Vector3(1, -1, -1);

    mera.Position = new BABYLON.Vector3(0, 0, 10);
    mera.Target = new BABYLON.Vector3(0, 0, 0);

    requestAnimationFrame(drawingLoop);
}

function drawingLoop() {
    device.clear();

    mesh.Rotation.x += 0.01;
    mesh.Rotation.y += 0.01;

    device.render(mera, meshes);
    device.present();

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

