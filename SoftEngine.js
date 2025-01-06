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

    const Texture = (function () {
        function Texture(filename, width, height) {
            this.width = width;
            this.height = height;
            this.load(filename);
        }

        Texture.prototype.load = function(filename) {
            let _this = this;
            let imageTexture = new Image();
            imageTexture.height = this.height;
            imageTexture.width = this.width;
            imageTexture.onload = function () {
                let internalCanvas = document.createElement("canvas");
                internalCanvas.width = _this.width;
                internalCanvas.height = _this.height;
                let internalContext = internalCanvas.getContext("2d");
                internalContext.drawImage(imageTexture, 0, 0);
                _this.internalBuffer = internalContext.getImageData(0, 0, _this.width, _this.height);
            };
            imageTexture.src = filename;
        };

        Texture.prototype.map = function (tu, tv) {
            if (this.internalBuffer) {
                let u = Math.abs(((tu * this.width) % this.width)) >> 0;
                let v = Math.abs(((tv * this.height) % this.height)) >> 0;

                let pos = (u + v * this.width) * 4;

                let r = this.internalBuffer.data[pos];
                let g = this.internalBuffer.data[pos + 1];
                let b = this.internalBuffer.data[pos + 2];
                let a = this.internalBuffer.data[pos + 3];

                return new BABYLON.Color4(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
            } else {
                return new BABYLON.Color4(1, 1, 1, 1);
            }
        };
        return Texture;
    })();

    SoftEngine.Texture = Texture;

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

        Device.prototype.drawPoint = function (point, color) {
            //make sures taht the given point is withing the showing screen 
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, point.z, color);
            }
        }

        //gets the image taken from the backbuffer and present it to the front buffer
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
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

        //turns 3d coordinates into 2d
        Device.prototype.project = function (vertex, transMat, world) {
            //turns coordinates into 2d space
            const point2d = BABYLON.Vector3.TransformCoordinates(vertex.Coordinates, transMat);
            const point3DWorld = BABYLON.Vector3.TransformCoordinates(vertex.Coordinates, world);
            const normal3DWorld = BABYLON.Vector3.TransformCoordinates(vertex.Normal, world);
            

            let x = point2d.x * this.workingWidth + this.workingWidth / 2.0;
            let y = -point2d.y * this.workingHeight + this.workingHeight / 2.0;
            return ({
                Coordinates: new BABYLON.Vector3(x, y, point2d.z),
                Normal: normal3DWorld,
                WorldCoordinates: point3DWorld,
                TextureCoordinates: vertex.TextureCoordinates
            });
        }

        Device.prototype.computeNDotL = function (vertex, normal, lightPosition) {
            let lightDirection = lightPosition.subtract(vertex);

            normal.normalize();
            lightDirection.normalize();

            return Math.max(0, BABYLON.Vector3.Dot(normal, lightDirection));
        }


        Device.prototype.processScanLine = function(data, va, vb, vc, vd, color, texture) {
            let pa = va.Coordinates;
            let pb = vb.Coordinates;
            let pc = vc.Coordinates;
            let pd = vd.Coordinates;

            //using y to compute the gradient and to computer other values 
            let gradient1 = pa.y != pb.y ? (data.currentY - pa.y) / (pb.y - pa.y) : 1;
            let gradient2 = pc.y != pd.y ? (data.currentY - pc.y) / (pd.y - pc.y) : 1;

            //starting line sx and ending line ex
            let sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
            let ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;

            //starting z and ending z for the z-buffer
            let z1 = this.interpolate(pa.z, pb.z, gradient1);
            let z2 = this.interpolate(pc.z, pd.z, gradient2)

            //interpolating normals
            let snl = this.interpolate(data.ndotla, data.ndotlb, gradient1);
            let enl = this.interpolate(data.ndotlc, data.ndotld, gradient2);

            //texture coordinates
            let su = this.interpolate(data.ua, data.ub, gradient1);
            let eu = this.interpolate(data.uc, data.ud, gradient2);
            let sv = this.interpolate(data.va, data.vb, gradient1);
            let ev = this.interpolate(data.vc, data.vd, gradient2);


            for(let x = sx; x < ex; x++) {
                let gradient = (x - sx) / (ex - sx);

                //interpolating z, normal and textture
                let z = this.interpolate(z1, z2, gradient);
                let ndotl = this.interpolate(snl, enl, gradient);
                let u = this.interpolate(su, eu, gradient);
                let v = this.interpolate(sv, ev, gradient);

                let textureColor;

                if(texture) {
                    textureColor = texture.map(u, v)
                }else {
                    textureColor = new BABYLON.Color4(1,1,1,1);
                }

                this.drawPoint(new BABYLON.Vector3(x, data.currentY, z), new BABYLON.Color4(color.r * ndotl * textureColor.r, 
                                                                                            color.g * ndotl * textureColor.g, 
                                                                                            color.b * ndotl * textureColor.b, 1));
            }
        };

        Device.prototype.drawTriangle = function (v1, v2, v3, color, texture) {
            //sorting each points in order (p1, p2, p3)
            //p1 is always up and p2 in between, and p3 in the bottom
            if(v1.Coordinates.y > v2.Coordinates.y) {
                let temp = v2;
                v2 = v1;
                v1 = temp;
            }
            if(v2.Coordinates.y > v3.Coordinates.y) {
                let temp = v2;
                v2 = v3;
                v3 = temp;
            }
            if(v1.Coordinates.y > v2.Coordinates.y) {
                let temp = v2;
                v2 = v1;
                v1 = temp;
            }

            let p1 = v1.Coordinates;
            let p2 = v2.Coordinates;
            let p3 = v3.Coordinates;

            let vnFace = (v1.Normal.add(v2.Normal.add(v3.Normal))).scale(1/3);
            let centerPoint = (v1.WorldCoordinates.add(v2.WorldCoordinates.add(v3.WorldCoordinates))).scale(1/3);

            //light position
            let lightPos = new BABYLON.Vector3(0, 10, 10);

            let nl1 = this.computeNDotL(v1.WorldCoordinates, v1.Normal, lightPos)
            let nl2 = this.computeNDotL(v2.WorldCoordinates, v2.Normal, lightPos)
            let nl3 = this.computeNDotL(v3.WorldCoordinates, v3.Normal, lightPos)

            let data = {};

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
                    data.currentY = y;

                    if(y < p2.y) {
                        data.ndotla = nl1;
                        data.ndotlb = nl3;
                        data.ndotlc = nl1;
                        data.ndotld = nl2;

                        data.ua = v1.TextureCoordinates.x;
                        data.ub = v3.TextureCoordinates.x;
                        data.uc = v1.TextureCoordinates.x;
                        data.ud = v2.TextureCoordinates.x;

                        data.va = v1.TextureCoordinates.y;
                        data.vb = v3.TextureCoordinates.y;
                        data.vc = v1.TextureCoordinates.y;
                        data.vd = v2.TextureCoordinates.y;

                        this.processScanLine(data, v1, v3, v1, v2, color, texture);
                    } else {
                        data.ndotla = nl1;
                        data.ndotlb = nl3;
                        data.ndotlc = nl2;
                        data.ndotld = nl3;

                        data.ua = v1.TextureCoordinates.x;
                        data.ub = v3.TextureCoordinates.x;
                        data.uc = v2.TextureCoordinates.x;
                        data.ud = v3.TextureCoordinates.x;

                        data.va = v1.TextureCoordinates.y;
                        data.vb = v3.TextureCoordinates.y;
                        data.vc = v2.TextureCoordinates.y;
                        data.vd = v3.TextureCoordinates.y;

                        this.processScanLine(data, v1, v3, v2, v3, color, texture);
                    }
                }
            } else {
                //if p2 is to the left of both p1 and p3
                for(let y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y

                    if(y < p2.y) {
                        data.ndotla = nl1;
                        data.ndotlb = nl2;
                        data.ndotlc = nl1;
                        data.ndotld = nl3;

                        data.ua = v1.TextureCoordinates.x;
                        data.ub = v2.TextureCoordinates.x;
                        data.uc = v1.TextureCoordinates.x;
                        data.ud = v3.TextureCoordinates.x;

                        data.va = v1.TextureCoordinates.y;
                        data.vb = v2.TextureCoordinates.y;
                        data.vc = v1.TextureCoordinates.y;
                        data.vd = v3.TextureCoordinates.y;

                        this.processScanLine(data, v1, v2, v1, v3, color, texture);
                    } else {
                        data.ndotla = nl2;
                        data.ndotlb = nl3;
                        data.ndotlc = nl1;
                        data.ndotld = nl3;

                        data.ua = v2.TextureCoordinates.x;
                        data.ub = v3.TextureCoordinates.x;
                        data.uc = v1.TextureCoordinates.x;
                        data.ud = v3.TextureCoordinates.x;

                        data.va = v2.TextureCoordinates.y;
                        data.vb = v3.TextureCoordinates.y;
                        data.vc = v1.TextureCoordinates.y;
                        data.vd = v3.TextureCoordinates.y;

                        this.processScanLine(data, v2, v3, v1, v3, color, texture);
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
                    
                    let pixelA = this.project(vertexA, transformMatrix, worldMatrix);
                    let pixelB = this.project(vertexB, transformMatrix, worldMatrix);
                    let pixelC = this.project(vertexC, transformMatrix, worldMatrix);

                    // this.drawBLine(pixelA, pixelB);
                    // this.drawBLine(pixelB, pixelC);
                    // this.drawBLine(pixelC, pixelA);

                
                    let color = 1.0;
                    this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1), cMesh.Texture);
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
            let materials = [];

            for (let materialIndex = 0; materialIndex < jsonObject.materials.length; materialIndex++) {
                let material = {};

                material.Name = jsonObject.materials[materialIndex].name;
                material.ID = jsonObject.materials[materialIndex].id;
                if (jsonObject.materials[materialIndex].diffuseTexture)
                    material.DiffuseTextureName = jsonObject.materials[materialIndex].diffuseTexture.name;

                materials[material.ID] = material;
            }

            for(let meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                //vertices
                let verticesArray = jsonObject.meshes[meshIndex].vertices;
                //indices
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

                //number of vertices
                let verticesCount = verticesArray.length / verticesStep;
                //number of faces
                let facesCount = indicesArray.length / 3;
                let mesh = new SoftEngine.Mesh(jsonObject.meshes[meshIndex].name, verticesCount, facesCount);

                //filling up vertices array 
                for(let index = 0; index < verticesCount; index++) {
                    let x = verticesArray[index * verticesStep];
                    let y = verticesArray[index * verticesStep + 1];
                    let z = verticesArray[index * verticesStep + 2];
                    // vertex normal
                    let nx = verticesArray[index * verticesStep + 3];
                    let ny = verticesArray[index * verticesStep + 4];
                    let nz = verticesArray[index * verticesStep + 5];

                    mesh.Vertices[index] = {
                        Coordinates: new BABYLON.Vector3(x,y,z),
                        Normal: new BABYLON.Vector3(nx,ny,nz),
                    };
                   
                    if (uvCount > 0) {
                        let u = verticesArray[index * verticesStep + 6];
                        let v = verticesArray[index * verticesStep + 7];
                        mesh.Vertices[index].TextureCoordinates = new BABYLON.Vector2(u, v);
                    } else {
                        mesh.Vertices[index].TextureCoordinates = new BABYLON.Vector2(0, 0);
                    }
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

                if (uvCount > 0) {
                    let meshTextureID = jsonObject.meshes[meshIndex].materialId;
                    let meshTextureName = materials[meshTextureID].DiffuseTextureName;
                    mesh.Texture = new Texture(meshTextureName, 512, 512);
                }
                meshes.push(mesh)
            }

            return meshes;
        }

        return Device;
    })();

    SoftEngine.Device = Device;


})(SoftEngine || (SoftEngine = {}))