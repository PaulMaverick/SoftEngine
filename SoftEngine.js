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
            this.depthbuffer = new Array(this.workingWidth * this.workingHeight);     
        }

        //clears the canvas with a new blank spaces
        Device.prototype.clear = function () {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            
            //also clears out the backbuffer to a blank space
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);

            //clear depthbuffer
            for(let i = 0; i < this.depthbuffer.length; i++) {
                //max possible value
                this.depthbuffer[i] = 10000000;
            }
        }

        //gets the image taken from the backbuffer and present it to the front buffer
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        }

        //puts a pixel on the screen in the given x and y coordinates
        Device.prototype.putPixel = function (x, y, z, color) {
            this.backbufferdata = this.backbuffer.data;

            let index = ((x >> 0) + (y >> 0) * this.workingWidth);
            let index4 = index * 4;

            if(this.depthbuffer[index] < z) {
                return; // Discard
            }

            this.depthbuffer[index] = z;

            this.backbufferdata[index4] = color.r * 255;
            this.backbufferdata[index4 + 1] = color.g * 255;
            this.backbufferdata[index4 + 2] = color.b * 255;
            this.backbufferdata[index4 + 3] = color.a * 255;
        }

        //turns 3d coordinates into 2d
        Device.prototype.project = function (coord, transMat) {
        
            const point = BABYLON.Vector3.TransformCoordinates(coord, transMat);    
            
            let x = point.x * this.workingWidth + this.workingWidth / 2.0;
            let y = -point.y * this.workingHeight + this.workingHeight / 2.0;
            return (new BABYLON.Vector3(x, y, point.z));
        }

        Device.prototype.drawPoint = function (point, color) {
            //make sures taht the given point is withing the showing screen 
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, point.z, color);
            }
        }

        //clamping the value between 1 and 0
        Device.prototype.clamp = function (value, min, max) {
            if (typeof min === "undefined") { min = 0; }
            if (typeof max === "undefined") { max = 1; }
            return Math.max(min, Math.min(value, max));
        }

        //Interpolate the value between two vertices
        //min is the starting point and max being the end point
        //and the gradient being the % of value between the 2 vertices
        Device.prototype.interpolate = function (min, max, gradient) {
            return min + (max - min) * this.clamp(gradient);
        };

        Device.prototype.processScanLine = function(y, pa, pb, pc, pd, color) {
            let gradient1 = pa.y != pb.y ? (y - pa.y) / (pb.y - pa.y) : 1;
            let gradient2 = pc.y != pd.y ? (y - pc.y) / (pd.y - pc.y) : 1;

            let sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
            let ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;

            let z1 = this.interpolate(pa.z, pb.z, gradient1);
            let z2 = this.interpolate(pc.z, pd.z, gradient2)

            for(let x = sx; x < ex; x++) {
                let gradient = (x - sx) / (ex - sx);
                let z = this.interpolate(z1, z2, gradient);
                this.drawPoint(new BABYLON.Vector3(x, y, z), color);
            }
        };

        Device.prototype.drawTriangle = function (p1, p2, p3, color) {
            //sorting each points in order (p1, p2, p3)
            //p1 is always up and p2 in between, and p3 in the bottom
            if(p1.y > p2.y) {
                let temp = p2;
                p2 = p1;
                p1 = temp;
            }
            if(p2.y > p3.y) {
                let temp = p2;
                p2 = p3;
                p3 = temp;
            }
            if(p1.y > p2.y) {
                let temp = p2;
                p2 = p1;
                p1 = temp;
            }

            //inverse slopes
            let dP1P2, dP1P3;

            //getting slopes
            if(p2.y - p1.y > 0) {
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
            } else {
                dP1P2 = 0;
            }
        
            if(p3.y - p1.y > 0) {
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
            } else {
                dP1P3 = 0;
            }

            //if p2 is to the right of both p1 and p3
            if(dP1P2 > dP1P3) {
                for(let y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    if(y < p2.y) {
                        this.processScanLine(y, p1, p3, p1, p2, color);
                    } else {
                        this.processScanLine(y, p1, p3, p2, p3, color);
                    }
                }
            } else {
                //if p2 is to the left of both p1 and p3
                for(let y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    if(y < p2.y) {
                        this.processScanLine(y, p1, p2, p1, p3, color);
                    } else {
                        this.processScanLine(y, p2, p3, p1, p3, color);
                    }
                }
            }


        }

        // Device.prototype.drawLine = function (point0, point1) {
        //     let dist = point1.subtract(point0).length();

        //     if(dist < 2) {
        //         return;
        //     }

        //     let middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
        //     this.drawPoint(middlePoint);
        //     this.drawLine(point0, middlePoint);
        //     this.drawLine(middlePoint, point1);
        // }

        // Device.prototype.drawBLine = function (point0, point1) {
        //     let x0 = point0.x >> 0;
        //     let y0 = point0.y >> 0;
        //     let x1 = point1.x >> 0;
        //     let y1 = point1.y >> 0;
        //     let dx = Math.abs(x1 - x0);
        //     let dy = Math.abs(y1 - y0);
        //     let sx = (x0 < x1) ? 1 : -1;
        //     let sy = (y0 < y1) ? 1 : -1;
        //     let err = dx - dy;
        //     while(true) {
        //         this.drawPoint(new BABYLON.Vector2(x0, y0));
        //         if((x0 == x1) && (y0 == y1)) {
        //             break;
        //         }
        //         let e2 = 2 * err;
        //         if(e2 > -dy) {
        //             err -= dy;
        //             x0 += sx;
        //         }
        //         if(e2 < dx) {
        //             err += dx;
        //             y0 += sy;
        //         }
        //     }
        // }

        Device.prototype.render = function(camera, meshes) {
           
            const viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            const projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);
       
            for (let index = 0; index < meshes.length; index++) {
                let cMesh = meshes[index];
                
                let worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
            
                let transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);

                // for (let i = 0; i < cMesh.Vertices.length -1; i++){
                //     let point0 = this.project(cMesh.Vertices[i], transformMatrix);
                //     let point1 = this.project(cMesh.Vertices[i + 1], transformMatrix);
                //     this.drawLine(point0, point1);
                // }

                for (let indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                    let currentFace = cMesh.Faces[indexFaces];
                    let vertexA = cMesh.Vertices[currentFace.A];
                    let vertexB = cMesh.Vertices[currentFace.B];
                    let vertexC = cMesh.Vertices[currentFace.C];
                
                    let pixelA = this.project(vertexA, transformMatrix);
                    let pixelB = this.project(vertexB, transformMatrix);
                    let pixelC = this.project(vertexC, transformMatrix);

                    // this.drawBLine(pixelA, pixelB);
                    // this.drawBLine(pixelB, pixelC);
                    // this.drawBLine(pixelC, pixelA);

                
                    let color = 0.25 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;
                    this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1));
                }

            }
        };

        Device.prototype.LoadJSONFileAsync = async function (filename) {
            // let xmlhttp = new XMLHttpRequest();
            // xmlhttp.open("Get", filename, true);
            // let that = this;
            // xmlhttp.onreadystatechange = function () {
            //     if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            //         jsonObject = JSON.parse(xmlhttp.responseText);
            //         callback(that.CreateMeshesFromJSON(jsonObject));
            //     } 
            // }
            // xmlhttp.send(null);
            try {
                const response = await fetch(filename);
                if(!response.ok) {
                    throw new Error(`Response.status: ${response.status}`);
                }
                const json = await response.json();
                let mesh = this.CreateMeshesFromJSON(json);
                return mesh;
            } catch (error) {
                console.log(error.message);
            }
        }

        Device.prototype.CreateMeshesFromJSON = function (jsonObject) {
            let meshes = [];

            for(let meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                let verticesArray = jsonObject.meshes[meshIndex].vertices;
                let indicesArray = jsonObject.meshes[meshIndex].indices;
                let uvCount = jsonObject.meshes[meshIndex].uvCount;
                let verticesStep = 1;

                switch(uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }

                let verticesCount = verticesArray.length / verticesStep;
                let facesCount = indicesArray.length / 3;
                let mesh = new SoftEngine.Mesh(jsonObject.meshes[meshIndex].name, verticesCount, facesCount);

                for(let index = 0; index < verticesCount; index++) {
                    let x = verticesArray[index * verticesStep];
                    let y = verticesArray[index * verticesStep + 1];
                    let z = verticesArray[index * verticesStep + 2];
                    mesh.Vertices[index] = new BABYLON.Vector3(x,y,z);
                }

                for(let index = 0; index < facesCount; index++) {
                    let a = indicesArray[index * 3];
                    let b = indicesArray[index * 3 + 1];
                    let c = indicesArray[index * 3 + 2];
                    mesh.Faces[index] = {
                        A: a,
                        B: b,
                        C: c
                    };
                }

                let position = jsonObject.meshes[meshIndex].position;
                mesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
                meshes.push(mesh)
            }

            return meshes;
        }

        return Device;
    })();

    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}))