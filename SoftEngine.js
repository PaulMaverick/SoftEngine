var SoftEngine;

(function (SoftEngine) {
    const Camera = (function () {
        function Camera() {
            this.Position = BABYLON.Vector3.Zero();
            this.target = BABYLON.Vector3.Zero();
        }
        return Camera
    })();

    SoftEngine.Camera = Camera;

    const Mesh = (function() {
        function Mesh(name, verticesCount) {
            this.name = name
            this.Vertices = new Array(verticesCount);
            this.Rotation = BABYLON.Vector3.Zero();
            this.Position = BABYLON.Vector3.Zero();

        }

        return Mesh;
    })();

    SoftEngine.Mesh = Mesh;

   
})(SoftEngine || (SoftEngine = {}))