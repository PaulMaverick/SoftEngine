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

    const Device = (function () {
        function Device(canvas) {
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
        }

        //clears the canvas with a new blank spaces
        Device.prototype.clear = function () {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);

            //also clears out the backbuffer to a blank space
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        }

        //gets the image taken from the backbuffer and present it to the front buffer
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0)
        }

        //puts a pixel on the screen in the given x and y coordinates
        Device.prototype.putPixel = function (x, y, color) {
            this.backbufferdata = this.backbuffer.data;

            const index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        }

        //turns 3d coordinates into 2d
        Device.prototype.project = function (coord, transMat) {
            const point = BABYLON.Vector3.TransformCoordinates(coord, transMat);

            let x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
            let y = point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
            return (new BABYLON.Vector2(x, y));
        }

        Device.prototype.drawPoint = function (point) {
            //make sures taht the given point is withing the showing screen 
            if (point.x >= 0 && point.y >= 0 && point.y < this.workingHeight && point.x < this.workingWidth) {
                this.putPixel(point.x, point.y, new BABYLON.Color4(1,1,0,1));
            }
        }

        Device.prototype.render = function(camera, meshes) {
            const viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            const projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);

            for (let index = 0; index < meshes.length; index++) {
                let cMesh = meshes[index];

                let worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(
                    cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z)
                    .multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));

                let transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);

                for (let indexVertices = 0; indexVertices < cMesh.Vertices.length; indexVertices++) {
                    let projectedPoint = this.project(cMesh.Vertices[indexVertices], transformMatrix);

                    this.drawPoint(projectedPoint);
                }
            }
        };

        return Device;
    })();

    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}))