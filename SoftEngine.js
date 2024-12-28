const SoftEngine = {};

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
        function Mesh(name, verticesCount, facesCount) {
            this.name = name;
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
            this.Rotation = new BABYLON.Vector3(0, 0, 0);
            this.Position = new BABYLON.Vector3(0, 0, 0);
        }
        return Mesh;
    })();

    SoftEngine.Mesh = Mesh;

    const Device = (function () {
        function Device(canvas) {
            
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext("2d", { willReadFrequently: true });
            
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

        Device.prototype.drawLine = function (point0, point1) {
            let dist = point1.subtract(point0).length();

            if (dist < 2) {
                return;
            }

            let middlePoint = point0.add((point1.subtract(point0)).scale(0.5));

            this.drawPoint(middlePoint);
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
        }

        Device.prototype.drawBLine = function (point0, point1) {
            let x0 = point0.x >> 0;
            let y0 = point0.y >> 0;
            let x1 = point1.x >> 0;
            let y1 = point1.y >> 0;
            let dx = Math.abs(x1 - x0);
            let dy = Math.abs(y1 - y0);
            let sx = (x0 < x1) ? 1 : -1;
            let sy = (y0 < y1) ? 1 : -1;
            let err = dx - dy;

            while(true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0));
                if((x0 == x1) && (y0 == y1)) break;
                let e2 = 2 * err;
                if(e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                };
                if(e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
                    
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

                // for (let indexVertices = 0; indexVertices < cMesh.Vertices.length; indexVertices++) {
                //     let projectedPoint = this.project(cMesh.Vertices[indexVertices], transformMatrix);

                //     this.drawPoint(projectedPoint);
                // }
                for (let i = 0; i < cMesh.Vertices.length -1; i++){
                    let point0 = this.project(cMesh.Vertices[i], transformMatrix);
                    let point1 = this.project(cMesh.Vertices[i + 1], transformMatrix);
                    this.drawLine(point0, point1);
                }

                for (let indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++)
                    {
                        let currentFace = cMesh.Faces[indexFaces];
                        let vertexA = cMesh.Vertices[currentFace.A];
                        let vertexB = cMesh.Vertices[currentFace.B];
                        let vertexC = cMesh.Vertices[currentFace.C];
                    
                        let pixelA = this.project(vertexA, transformMatrix);
                        let pixelB = this.project(vertexB, transformMatrix);
                        let pixelC = this.project(vertexC, transformMatrix);
                    
                        this.drawBLine(pixelA, pixelB);
                        this.drawBLine(pixelB, pixelC);
                        this.drawBLine(pixelC, pixelA);
                    }
            }
        };

        return Device;
    })();

    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}))