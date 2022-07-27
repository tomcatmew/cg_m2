// Assignment CG M2 Yifei Chen



/*
 Implementation of Catmull-Clark Subdivision method 
 */
 THREE.SubdivisionModifier = function(subdivisions) {
    this.subdivisions = subdivisions === undefined ? 1 : subdivisions;
    this.useOldVertexColors = false;
    this.supportUVs = true;
};

THREE.SubdivisionModifier.prototype.modify = function(geometry) {
    var repeats = this.subdivisions;

    while (repeats-- > 0) {
        this.smooth(geometry);
    }
};

THREE.GeometryUtils.orderedKey = function(a, b) {
    return Math.min(a, b) + "_" + Math.max(a, b);
};

THREE.GeometryUtils.computeEdgeFaces = function(geometry) {
    var i,
        il,
        v1,
        v2,
        j,
        k,
        face,
        faceIndices,
        faceIndex,
        edge,
        hash,
        edgeFaceMap = {};

    var orderedKey = THREE.GeometryUtils.orderedKey;

    function mapEdgeHash(hash, i) {
        if (edgeFaceMap[hash] === undefined) {
            edgeFaceMap[hash] = [];
        }

        edgeFaceMap[hash].push(i);
    }

    for (i = 0, il = geometry.faces.length; i < il; i++) {
        face = geometry.faces[i];

        if (face instanceof THREE.Face3) {
            hash = orderedKey(face.a, face.b);
            mapEdgeHash(hash, i);

            hash = orderedKey(face.b, face.c);
            mapEdgeHash(hash, i);

            hash = orderedKey(face.c, face.a);
            mapEdgeHash(hash, i);
        } else if (face instanceof THREE.Face4) {
            hash = orderedKey(face.a, face.b);
            mapEdgeHash(hash, i);

            hash = orderedKey(face.b, face.c);
            mapEdgeHash(hash, i);

            hash = orderedKey(face.c, face.d);
            mapEdgeHash(hash, i);

            hash = orderedKey(face.d, face.a);
            mapEdgeHash(hash, i);
        }
    }
    return edgeFaceMap;
};

THREE.SubdivisionModifier.prototype.smooth = function(oldGeometry) {
    var newVertices = [],
        newFaces = [],
        newUVs = [];

    function v(x, y, z) {
        newVertices.push(new THREE.Vector3(x, y, z));
    }

    var scope = this;
    var orderedKey = THREE.GeometryUtils.orderedKey;
    var computeEdgeFaces = THREE.GeometryUtils.computeEdgeFaces;

    function warn() {
        if (console) console.log.apply(console, arguments);
    }

    function f4(a, b, c, d, oldFace, orders, facei) {
        var newFace = new THREE.Face4(
            a,
            b,
            c,
            d,
            null,
            oldFace.color,
            oldFace.materialIndex
        );

        if (scope.useOldVertexColors) {
            newFace.vertexColors = [];

            var color, tmpColor, order;

            for (var i = 0; i < 4; i++) {
                order = orders[i];

                (color = new THREE.Color()), color.setRGB(0, 0, 0);

                for (var j = 0, jl = 0; j < order.length; j++) {
                    tmpColor = oldFace.vertexColors[order[j] - 1];
                    color.r += tmpColor.r;
                    color.g += tmpColor.g;
                    color.b += tmpColor.b;
                }

                color.r /= order.length;
                color.g /= order.length;
                color.b /= order.length;

                newFace.vertexColors[i] = color;
            }
        }

        newFaces.push(newFace);

        if (scope.supportUVs) {
            var aUv = [
                getUV(a, ""),
                getUV(b, facei),
                getUV(c, facei),
                getUV(d, facei),
            ];

            newUVs.push(aUv);
        }
    }

    var originalPoints = oldGeometry.vertices;
    var originalFaces = oldGeometry.faces;
    var originalVerticesLength = originalPoints.length;

    var newPoints = originalPoints.concat();

    var facePoints = [],
        edgePoints = {};
    var sharpEdges = {},
        sharpVertices = [];

    var uvForVertices = {};

    function getUV(vertexNo, oldFaceNo) {
        var j, jl;

        var key = vertexNo + ":" + oldFaceNo;
        var theUV = uvForVertices[key];

        if (!theUV) {
            warn("warning, UV not found for", key);

            return null;
        }

        return theUV;
    }

    function addUV(vertexNo, oldFaceNo, value) {
        var key = vertexNo + ":" + oldFaceNo;
        if (!(key in uvForVertices)) {
            uvForVertices[key] = value;
        } else {
            warn(
                "dup vertexNo",
                vertexNo,
                "oldFaceNo",
                oldFaceNo,
                "value",
                value,
                "key",
                key,
                uvForVertices[key]
            );
        }
    }

    var i, il, j, jl, face;

    var uvs = oldGeometry.faceVertexUvs[0];
    var abcd = "abcd",
        vertice;

    if (scope.supportUVs)
        for (i = 0, il = uvs.length; i < il; i++) {
            for (j = 0, jl = uvs[i].length; j < jl; j++) {
                vertice = originalFaces[i][abcd.charAt(j)];
                addUV(vertice, i, uvs[i][j]);
            }
        }

    if (uvs.length == 0) scope.supportUVs = false;

    var uvCount = 0;
    for (var u in uvForVertices) {
        uvCount++;
    }
    if (!uvCount) {
        scope.supportUVs = false;
    }

    var avgUv;

    for (i = 0, il = originalFaces.length; i < il; i++) {
        face = originalFaces[i];
        facePoints.push(face.centroid);
        newPoints.push(face.centroid);

        if (!scope.supportUVs) continue;

        avgUv = new THREE.Vector2();

        if (face instanceof THREE.Face3) {
            avgUv.x = getUV(face.a, i).x + getUV(face.b, i).x + getUV(face.c, i).x;
            avgUv.y = getUV(face.a, i).y + getUV(face.b, i).y + getUV(face.c, i).y;
            avgUv.x /= 3;
            avgUv.y /= 3;
        } else if (face instanceof THREE.Face4) {
            avgUv.x =
                getUV(face.a, i).x +
                getUV(face.b, i).x +
                getUV(face.c, i).x +
                getUV(face.d, i).x;
            avgUv.y =
                getUV(face.a, i).y +
                getUV(face.b, i).y +
                getUV(face.c, i).y +
                getUV(face.d, i).y;
            avgUv.x /= 4;
            avgUv.y /= 4;
        }

        addUV(originalVerticesLength + i, "", avgUv);
    }

    var edgeFaceMap = computeEdgeFaces(oldGeometry);
    var edge, faceIndexA, faceIndexB, avg;

    var edgeCount = 0;

    var edgeVertex, edgeVertexA, edgeVertexB;

    var vertexEdgeMap = {};
    var vertexFaceMap = {};

    function addVertexEdgeMap(vertex, edge) {
        if (vertexEdgeMap[vertex] === undefined) {
            vertexEdgeMap[vertex] = [];
        }

        vertexEdgeMap[vertex].push(edge);
    }

    function addVertexFaceMap(vertex, face, edge) {
        if (vertexFaceMap[vertex] === undefined) {
            vertexFaceMap[vertex] = {};
        }

        vertexFaceMap[vertex][face] = edge;
    }

    for (i in edgeFaceMap) {
        edge = edgeFaceMap[i];

        edgeVertex = i.split("_");
        edgeVertexA = edgeVertex[0];
        edgeVertexB = edgeVertex[1];

        addVertexEdgeMap(edgeVertexA, [edgeVertexA, edgeVertexB]);
        addVertexEdgeMap(edgeVertexB, [edgeVertexA, edgeVertexB]);

        for (j = 0, jl = edge.length; j < jl; j++) {
            face = edge[j];
            addVertexFaceMap(edgeVertexA, face, i);
            addVertexFaceMap(edgeVertexB, face, i);
        }

        if (edge.length < 2) {
            sharpEdges[i] = true;
            sharpVertices[edgeVertexA] = true;
            sharpVertices[edgeVertexB] = true;
        }
    }

    for (i in edgeFaceMap) {
        edge = edgeFaceMap[i];

        faceIndexA = edge[0];
        faceIndexB = edge[1];

        edgeVertex = i.split("_");
        edgeVertexA = edgeVertex[0];
        edgeVertexB = edgeVertex[1];

        avg = new THREE.Vector3();

        if (edge.length == 1) {
            avg.add(originalPoints[edgeVertexA]);
            avg.add(originalPoints[edgeVertexB]);
            avg.multiplyScalar(0.5);

            sharpVertices[newPoints.length] = true;
        } else {
            avg.add(facePoints[faceIndexA]);
            avg.add(facePoints[faceIndexB]);

            avg.add(originalPoints[edgeVertexA]);
            avg.add(originalPoints[edgeVertexB]);

            avg.multiplyScalar(0.25);
        }

        edgePoints[i] = originalVerticesLength + originalFaces.length + edgeCount;

        newPoints.push(avg);

        edgeCount++;

        if (!scope.supportUVs) {
            continue;
        }

        avgUv = new THREE.Vector2();

        avgUv.x =
            getUV(edgeVertexA, faceIndexA).x + getUV(edgeVertexB, faceIndexA).x;
        avgUv.y =
            getUV(edgeVertexA, faceIndexA).y + getUV(edgeVertexB, faceIndexA).y;
        avgUv.x /= 2;
        avgUv.y /= 2;

        addUV(edgePoints[i], faceIndexA, avgUv);

        if (edge.length >= 2) {
            avgUv = new THREE.Vector2();

            avgUv.x =
                getUV(edgeVertexA, faceIndexB).x + getUV(edgeVertexB, faceIndexB).x;
            avgUv.y =
                getUV(edgeVertexA, faceIndexB).y + getUV(edgeVertexB, faceIndexB).y;
            avgUv.x /= 2;
            avgUv.y /= 2;

            addUV(edgePoints[i], faceIndexB, avgUv);
        }
    }

    var facePt, currentVerticeIndex;

    var hashAB, hashBC, hashCD, hashDA, hashCA;

    var abc123 = ["123", "12", "2", "23"];
    var bca123 = ["123", "23", "3", "31"];
    var cab123 = ["123", "31", "1", "12"];
    var abc1234 = ["1234", "12", "2", "23"];
    var bcd1234 = ["1234", "23", "3", "34"];
    var cda1234 = ["1234", "34", "4", "41"];
    var dab1234 = ["1234", "41", "1", "12"];

    for (i = 0, il = facePoints.length; i < il; i++) {
        facePt = facePoints[i];
        face = originalFaces[i];
        currentVerticeIndex = originalVerticesLength + i;

        if (face instanceof THREE.Face3) {
            hashAB = orderedKey(face.a, face.b);
            hashBC = orderedKey(face.b, face.c);
            hashCA = orderedKey(face.c, face.a);

            f4(
                currentVerticeIndex,
                edgePoints[hashAB],
                face.b,
                edgePoints[hashBC],
                face,
                abc123,
                i
            );
            f4(
                currentVerticeIndex,
                edgePoints[hashBC],
                face.c,
                edgePoints[hashCA],
                face,
                bca123,
                i
            );
            f4(
                currentVerticeIndex,
                edgePoints[hashCA],
                face.a,
                edgePoints[hashAB],
                face,
                cab123,
                i
            );
        } else if (face instanceof THREE.Face4) {
            hashAB = orderedKey(face.a, face.b);
            hashBC = orderedKey(face.b, face.c);
            hashCD = orderedKey(face.c, face.d);
            hashDA = orderedKey(face.d, face.a);

            f4(
                currentVerticeIndex,
                edgePoints[hashAB],
                face.b,
                edgePoints[hashBC],
                face,
                abc1234,
                i
            );
            f4(
                currentVerticeIndex,
                edgePoints[hashBC],
                face.c,
                edgePoints[hashCD],
                face,
                bcd1234,
                i
            );
            f4(
                currentVerticeIndex,
                edgePoints[hashCD],
                face.d,
                edgePoints[hashDA],
                face,
                cda1234,
                i
            );
            f4(
                currentVerticeIndex,
                edgePoints[hashDA],
                face.a,
                edgePoints[hashAB],
                face,
                dab1234,
                i
            );
        }
    }

    newVertices = newPoints;

    var F = new THREE.Vector3();
    var R = new THREE.Vector3();

    var n;
    for (i = 0, il = originalPoints.length; i < il; i++) {
        if (vertexEdgeMap[i] === undefined) continue;

        F.set(0, 0, 0);
        R.set(0, 0, 0);
        var newPos = new THREE.Vector3(0, 0, 0);

        var f = 0;
        for (j in vertexFaceMap[i]) {
            F.add(facePoints[j]);
            f++;
        }

        var sharpEdgeCount = 0;

        n = vertexEdgeMap[i].length;

        var boundary_case = f != n;

        for (j = 0; j < n; j++) {
            if (
                sharpEdges[orderedKey(vertexEdgeMap[i][j][0], vertexEdgeMap[i][j][1])]
            ) {
                sharpEdgeCount++;
            }
        }

        F.divideScalar(f);

        var boundary_edges = 0;

        if (boundary_case) {
            var bb_edge;
            for (j = 0; j < n; j++) {
                edge = vertexEdgeMap[i][j];
                bb_edge = edgeFaceMap[orderedKey(edge[0], edge[1])].length == 1;
                if (bb_edge) {
                    var midPt = originalPoints[edge[0]]
                        .clone()
                        .add(originalPoints[edge[1]])
                        .divideScalar(2);
                    R.add(midPt);
                    boundary_edges++;
                }
            }

            R.divideScalar(4);
        } else {
            for (j = 0; j < n; j++) {
                edge = vertexEdgeMap[i][j];
                var midPt = originalPoints[edge[0]]
                    .clone()
                    .add(originalPoints[edge[1]])
                    .divideScalar(2);
                R.add(midPt);
            }

            R.divideScalar(n);
        }
        newPos.add(originalPoints[i]);

        if (boundary_case) {
            newPos.divideScalar(2);
            newPos.add(R);
        } else {
            newPos.multiplyScalar(n - 3);

            newPos.add(F);
            newPos.add(R.multiplyScalar(2));
            newPos.divideScalar(n);
        }

        newVertices[i] = newPos;
    }

    var newGeometry = oldGeometry;

    newGeometry.vertices = newVertices;
    newGeometry.faces = newFaces;
    newGeometry.faceVertexUvs[0] = newUVs;

    delete newGeometry.__tmpVertices;

    newGeometry.computeCentroids();
    newGeometry.computeFaceNormals();
    newGeometry.computeVertexNormals();
};


//  End of implementation 

var container, stats, controls, camera, scene, renderer,cube, plane;
var targetYRotation = 0;
var targetXRotation = 0;
var targetYRotationOnMouseDown = 0;
var targetXRotationOnMouseDown = 0;
var mouseX = 0;
var mouseY = 0;
var mouseXOnMouseDown = 0;
var message;
var subdivisions = 0;
var geometryIndex = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

const params = {
  Iteration: 1,
};
var settings = {
  mesh_name: "Cube",
};

var makeGeometry = function (klass, args) {
  var F = function (klass, args) {
    return klass.apply(this, args);
  };
  F.prototype = klass.prototype;
  return new F(klass, args);
};

var materials = [];

for (var i = 0; i < 6; i++) {
  materials.push([
    new THREE.MeshBasicMaterial({
      color: Math.random() * 0xffffff,
      wireframe: false,
    }),
  ]);
}

var geometriesParams = [
  { type: "CubeGeometry", args: [200, 200, 200, 2, 2, 2, materials] },
];

var loader2 = new THREE.JSONLoader();
loader2.load("Suzanne.js", function (geometry) {
  geometriesParams.push({
    type: "Suzanne",
    args: [],
    scale: 100,
    meshScale: 2,
  });

  THREE.Suzanne = function () {
    return geometry.clone();
  };

  updateInfo();
});


init();
animate();

function nextSubdivision() {
  var x = params.Iteration;
  subdivisions = Math.max(0, x);
//   console.log(x);
  targetYRotation = 0.3;
  targetXRotation = 0.3;
  updateMesh();
}

function nextGeometry() {
  geometryIndex++;

  if (geometryIndex > geometriesParams.length - 1) {
    geometryIndex = 0;
  }

  updateMesh();
}

function switchMesh(i) {
  if (i == "Cube") geometryIndex = 0;
  if (i == "Suzanne") geometryIndex = 1;
  updateMesh();
}

function updateInfo() {
  var params = geometriesParams[geometryIndex];

  message.innerHTML =
    "Catmull-Clerk Method Mesh: " +
    params.type +
    "<br><br>vertex count: <br>before : " +
    geometry.vertices.length +
    " --- after subdivid : " +
    smoothMesh.vertices.length +
    "<br>Face count: <br>before :" +
    geometry.faces.length +
    " --- after subdivid : " +
    smoothMesh.faces.length; 
}

function updateMesh() {
  if (cube) {
    scene.remove(group);
    scene.remove(cube);
  }

  var modifier = new THREE.SubdivisionModifier(subdivisions);

  var params = geometriesParams[geometryIndex];

  geometry = makeGeometry(THREE[params.type], params.args);


  if (params.scale) {
    geometry.applyMatrix(
      new THREE.Matrix4().makeScale(params.scale, params.scale, params.scale)
    );
  }

  smoothMesh = geometry.clone();
  smoothMesh.mergeVertices();

  smoothMesh.computeCentroids();
  smoothMesh.computeFaceNormals();
  smoothMesh.computeVertexNormals();

  modifier.modify(smoothMesh);

  updateInfo();

  var faceABCD = "abcd";
  var color, f, p, n, vertexIndex;

  for (i = 0; i < smoothMesh.faces.length; i++) {
    f = smoothMesh.faces[i];
    n = f instanceof THREE.Face3 ? 3 : 4;
    for (var j = 0; j < n; j++) {
      vertexIndex = f[faceABCD.charAt(j)];
      p = smoothMesh.vertices[vertexIndex];
      color = new THREE.Color(0x2b629f);
      f.vertexColors[j] = color;
    }
  }

  group = new THREE.Object3D();
  group.add(
    new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xfefefe,
        wireframe: true,
        opacity: 0.5,
      })
    )
  );
  scene.add(group);

  var meshmaterials = [
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      shading: THREE.FlatShading,
      vertexColors: THREE.VertexColors,
    }),
    new THREE.MeshBasicMaterial({
      color: 0x405040,
      wireframe: true,
      opacity: 0.9,
      transparent: true,
    }),
  ];
  cube = THREE.SceneUtils.createMultiMaterialObject(smoothMesh, meshmaterials);
  var meshScale = params.meshScale ? params.meshScale : 1;
  cube.scale.x = meshScale;
  cube.scale.y = meshScale;
  cube.scale.z = meshScale;
  scene.add(cube);
  group.scale.copy(cube.scale);
}

function init() {
  container = document.getElementById("maincanvas");
  document.body.appendChild(container);

  message = document.createElement("div");
  message.style.position = "absolute";
  message.style.top = "80px";
  message.style.width = "100%";
  message.style.textAlign = "center";
  container.appendChild(message);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 500;
  scene = new THREE.Scene();
  var light = new THREE.PointLight(0xffffff, 1.4);
  light.position.set(900, 900, 1800);
  scene.add(light);

  updateMesh();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.style.margin = 0;
  document.body.style.padding = 0;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  container.appendChild(renderer.domElement);

  const gui = new dat.GUI();
  gui.domElement.id = "gui";
  const cubeFolder = gui.addFolder("Catmull-Clark Parameters");
  cubeFolder.add(params, "Iteration", 0, 5).step(1).onChange(nextSubdivision);
  cubeFolder
    .add(settings, "mesh_name", ["Cube", "Suzanne"])
    .name("Select Mesh")
    .onChange((newValue) => {
        switchMesh(newValue);
    });
  cubeFolder.open();

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.left = "225px";
  stats.domElement.style.top = "150px";
  container.appendChild(stats.domElement);

  document.addEventListener("mousedown", onDocumentMouseDown, false);
  document.addEventListener("touchstart", onDocumentTouchStart, false);
  document.addEventListener("touchmove", onDocumentTouchMove, false);
  window.addEventListener("resize", onWindowResize, false);

  nextSubdivision();
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseDown(event) {

  document.addEventListener("mousemove", onDocumentMouseMove, false);
  document.addEventListener("mouseup", onDocumentMouseUp, false);
  document.addEventListener("mouseout", onDocumentMouseOut, false);

  mouseXOnMouseDown = event.clientX - windowHalfX;
  mouseYOnMouseDown = event.clientY - windowHalfY;
  targetYRotationOnMouseDown = targetYRotation;
  targetXRotationOnMouseDown = targetXRotation;
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;

  targetYRotation =
    targetYRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.02;
  targetXRotation =
    targetXRotationOnMouseDown + (mouseY - mouseYOnMouseDown) * 0.02;
}

function onDocumentMouseUp(event) {
  document.removeEventListener("mousemove", onDocumentMouseMove, false);
  document.removeEventListener("mouseup", onDocumentMouseUp, false);
  document.removeEventListener("mouseout", onDocumentMouseOut, false);
}

function onDocumentMouseOut(event) {
  document.removeEventListener("mousemove", onDocumentMouseMove, false);
  document.removeEventListener("mouseup", onDocumentMouseUp, false);
  document.removeEventListener("mouseout", onDocumentMouseOut, false);
}

function onDocumentTouchStart(event) {
  if (event.touches.length == 1) {
    event.preventDefault();

    mouseXOnMouseDown = event.touches[0].pageX - windowHalfX;
    targetRotationOnMouseDown = targetRotation;
  }
}

function onDocumentTouchMove(event) {
  if (event.touches.length == 1) {
    event.preventDefault();
    mouseX = event.touches[0].pageX - windowHalfX;
    targetRotation =
      targetRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.05;
  }
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  group.rotation.x = cube.rotation.x +=
    (targetXRotation - cube.rotation.x) * 0.02;
  group.rotation.y = cube.rotation.y +=
    (targetYRotation - cube.rotation.y) * 0.02;

  renderer.render(scene, camera);
}
