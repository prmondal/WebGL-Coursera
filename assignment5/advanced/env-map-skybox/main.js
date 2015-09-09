/*
The MIT License (MIT)

Copyright (c) 2015 Prasenjit M

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

"use strict";

var WORLD = {
	vertDim: 3,
	
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	worldColor: vec4(1.0, 1.0, 1.0, 1.0),

	timeScale: 0.02,

	showFPS: true,
	enableObjectRotation: true 
};

var OBJECT_TYPE = {
	SPHERE: 'SPHERE',
	CONE: 'CONE',
	CYLINDER: 'CYLINDER',
	FUNNEL: 'FUNNEL'
};

var SPHERE_PROPERTY = {
	LONG_SUB_DIVISIONS: 64, //should be double of lat divs
	LAT_SUB_DIVISIONS: 32,

	thetaStart: 0,
	thetaEnd: Math.PI,
	phiStart: 0, 
	phiEnd: 2 * Math.PI,

	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
};

var CYLINDER_PROPERTY = {
	radialSegment: 32,
	heightSegment: 10,
	thetaStart: 0,
	thetaEnd: 2 * Math.PI,
	top: true,
	bottom: true,
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
};

var CONE_PROPERTY = {
	radialSegment: 64,
	heightSegment: 10,
	thetaStart: 0,
	thetaEnd: 2 * Math.PI,
	top: false,
	bottom: true,
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
};

var FUNNEL_PROPERTY = {
	radialSegment: 32,
	heightSegment: 10,
	thetaStart: 0,
	thetaEnd: 2 * Math.PI,
	top: false,
	bottom: false,
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
};

var geoCache = {
	sphere: {
		geometry: {
			vertices : [],
			normals : [],
			indices: [],
			wireframeColors: []
		},
		cached: false
	},

	cylinder: {
		geometry: {
			vertices : [],
			normals : [],
			indices: [],
			wireframeColors: []
		},
		cached: false
	},

	cone: {
		geometry: {
			vertices : [],
			normals : [],
			indices: [],
			wireframeColors: []
		},
		cached: false
	},

	funnel: {
		geometry: {
			vertices : [],
			normals : [],
			indices: [],
			wireframeColors: []
		},
		cached: false
	}
};

var canvas, 
	gl,
	objectPool = [],
	axisCarpets = [],
	modelView,
	projection;

//prespective camera properties
var nearP = 0.3,
	farP = 100.0,
	aspect,
	fovy = 45.0;

//ortho graphic camera properties
var left = -5.0,
	right = 5.0,
	ytop = 5.0,
	bottom = -5.0,
	nearO = -5,
	farO = 5;

var radius = 10.0;
var theta = 0;
var phi = 0;
var dr = 5.0;

var eye = vec3(0.0, 0.0, radius);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var tX = 0.0, tY = 0.0, tZ = 0.0, 
	sX = 1.0, sY = 1.0, sZ = 1.0,
	rX = 0.0, rY = 0.0, rZ = 0.0;

var objectType = OBJECT_TYPE.SPHERE;

var wireframe = false;

var frameCount = 0,
	lastTime = 0,
	elapsedTime = 0;

var textureCubeMap = {
	urls: {
		pos_x: 'resource/cubemap/posx.jpg',
		pos_y: 'resource/cubemap/posy.jpg',
		pos_z: 'resource/cubemap/posz.jpg',
		neg_x: 'resource/cubemap/negx.jpg',
		neg_y: 'resource/cubemap/negy.jpg',
		neg_z: 'resource/cubemap/negz.jpg'
	},

	images: {}
};

var skybox = {
	textures: [
		['TEXTURE_CUBE_MAP_POSITIVE_X', 'resource/cubemap/right.jpg'],
		['TEXTURE_CUBE_MAP_NEGATIVE_X', 'resource/cubemap/left.jpg'],
		['TEXTURE_CUBE_MAP_POSITIVE_Y', 'resource/cubemap/top.jpg'],
		['TEXTURE_CUBE_MAP_NEGATIVE_Y', 'resource/cubemap/down.jpg'],
		['TEXTURE_CUBE_MAP_POSITIVE_Z', 'resource/cubemap/front.jpg'],
		['TEXTURE_CUBE_MAP_NEGATIVE_Z', 'resource/cubemap/back.jpg']
	],

	indices: [ 
		0, 1, 2, 
		0, 2, 3, 
		4, 5, 6, 
		4, 6, 7, 
		8, 9, 10, 
		8, 10, 11, 
		12, 13, 14, 
		12, 14, 15, 
		16, 17, 18, 
		16, 18, 19, 
		20, 21, 22, 
		20, 22, 23
	],

	vertices: [ 
	  // Front face
	  -1.0, -1.0,  1.0,
	   1.0, -1.0,  1.0,
	   1.0,  1.0,  1.0,
	  -1.0,  1.0,  1.0,
	  
	  // Back face
	  -1.0, -1.0, -1.0,
	  -1.0,  1.0, -1.0,
	   1.0,  1.0, -1.0,
	   1.0, -1.0, -1.0,
	  
	  // Top face
	  -1.0,  1.0, -1.0,
	  -1.0,  1.0,  1.0,
	   1.0,  1.0,  1.0,
	   1.0,  1.0, -1.0,
	  
	  // Bottom face
	  -1.0, -1.0, -1.0,
	   1.0, -1.0, -1.0,
	   1.0, -1.0,  1.0,
	  -1.0, -1.0,  1.0,
	  
	  // Right face
	   1.0, -1.0, -1.0,
	   1.0,  1.0, -1.0,
	   1.0,  1.0,  1.0,
	   1.0, -1.0,  1.0,
	  
	  // Left face
	  -1.0, -1.0, -1.0,
	  -1.0, -1.0,  1.0,
	  -1.0,  1.0,  1.0,
	  -1.0,  1.0, -1.0 
	] 
};

function inverse(a) {
    var a00 = a[0][0], a01 = a[0][1], a02 = a[0][2],
        a10 = a[1][0], a11 = a[1][1], a12 = a[1][2],
        a20 = a[2][0], a21 = a[2][1], a22 = a[2][2],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21,
        out = mat3();

    if (!det) { 
        return null; 
    }

    det = 1.0 / det;

    out[0][0] = b01 * det;
    out[0][1] = (-a22 * a01 + a02 * a21) * det;
    out[0][2] = (a12 * a01 - a02 * a11) * det;
    out[1][0] = b11 * det;
    out[1][1] = (a22 * a00 - a02 * a20) * det;
    out[1][2] = (-a12 * a00 + a02 * a10) * det;
    out[2][0] = b21 * det;
    out[2][1] = (-a21 * a00 + a01 * a20) * det;
    out[2][2] = (a11 * a00 - a01 * a10) * det;

    return out;
};

//constructor to create an object
//type property defines the object type
function shape(type, shapeProp, translate, rotate, scale) {
	this.buffer = {
		verId: gl.createBuffer(),
		verData: shapeProp.vertices,

		normalId: gl.createBuffer(),
		normalData: shapeProp.normals,

		idxId: gl.createBuffer(),
		idxData: shapeProp.indices, 

		wireframeColorData: shapeProp.wireframeColors
	};

	this.type = type;
	
	this.rotation = {
		rotXDelta: 0,
		rotXSpeed: 0.5,

		rotYDelta: 0,
		rotYSpeed: 0.5,

		rotZDelta: 0,
		rotZSpeed: 0.5
	};

	this.translate = translate || vec3(0.0, 0.0, 0.0);
	this.rotate = (rotate) ? vec3(rotate[0], rotate[1], rotate[2]) : vec3(0.0, 0.0, 0.0);
	this.scale = scale || vec3(1.0, 1.0, 1.0);

	this.texture = {
		cubeMap: gl.createTexture()
	};

	this.program = initShaders(gl, "vertex-shader", "fragment-shader");
	
	this.shaderVariables = {
		vPosition: gl.getAttribLocation(this.program, "vPosition"),
		vNormal: gl.getAttribLocation(this.program, "vNormal"),
		texMap: gl.getUniformLocation(this.program, "texMap"),

		modelView: gl.getUniformLocation(this.program, "modelView"),
		transformMat: gl.getUniformLocation(this.program, "transformMat"),
		normalMatrix: gl.getUniformLocation(this.program, "normalMatrix"),
		projection: gl.getUniformLocation(this.program, "projection")
	};

	this.update = function() {
		updateShape(this);
	}

	this.draw = function() {
		drawShape(this);
	}

	this.setTranslate = function(translate) {
		this.translate = translate;
	}

	this.setRotate = function(rotate) {
		this.rotate = vec3(rotate[0], rotate[1], rotate[2]);
	}

	this.setScale = function(scale) {
		this.scale = scale;
	}

	this.configTexture = function() {
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture.cubeMap);
	    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureCubeMap.images.pos_x);
	    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureCubeMap.images.neg_x);
	    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureCubeMap.images.pos_y);
	    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureCubeMap.images.neg_y);
	    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureCubeMap.images.pos_z);
	    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureCubeMap.images.neg_z);

	    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	    gl.activeTexture(gl.TEXTURE0);
    	gl.uniform1i(this.shaderVariables.texMap, 0);
	}
}

function updateShape(obj) {
	obj.rotation.rotXDelta -= obj.rotation.rotXSpeed;

	obj.setRotate(vec3(obj.rotation.rotXDelta, obj.rotation.rotYDelta, obj.rotation.rotZDelta));
}

function drawShape(obj) {
	//initialize shader variables
	gl.useProgram(obj.program);

    var transformMat = mat4();
    
    //MV.js has problem with scale Fn
    var scale = mat4();
    scale[0][0] = obj.scale[0];
    scale[1][1] = obj.scale[1];
    scale[2][2] = obj.scale[2];

    transformMat = mult(scale, transformMat);
    transformMat = mult(rotateX(obj.rotate[0]), transformMat);
    transformMat = mult(rotateY(obj.rotate[1]), transformMat);
    transformMat = mult(rotateZ(obj.rotate[2]), transformMat);
    transformMat = mult(translate(obj.translate[0], obj.translate[1], obj.translate[2]), transformMat);

    var transformMat3x3 = mat3();
    var viewTransformMat = mult(modelView, transformMat);

    transformMat3x3[0][0] = viewTransformMat[0][0];
    transformMat3x3[0][1] = viewTransformMat[0][1];
    transformMat3x3[0][2] = viewTransformMat[0][2];

    transformMat3x3[1][0] = viewTransformMat[1][0];
    transformMat3x3[1][1] = viewTransformMat[1][1];
    transformMat3x3[1][2] = viewTransformMat[1][2];

    transformMat3x3[2][0] = viewTransformMat[2][0];
    transformMat3x3[2][1] = viewTransformMat[2][1];
    transformMat3x3[2][2] = viewTransformMat[2][2];

    var normalMatrix = transpose(inverse(transformMat3x3));

	gl.uniformMatrix4fv(obj.shaderVariables.transformMat, false, flatten(transformMat));
	gl.uniformMatrix4fv(obj.shaderVariables.modelView, false, flatten(modelView));
	gl.uniformMatrix3fv(obj.shaderVariables.normalMatrix, false, flatten(normalMatrix));
	gl.uniformMatrix4fv(obj.shaderVariables.projection, false, flatten(projection));

	gl.depthMask(true);

	//bind buffer
	//indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.buffer.idxId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.buffer.idxData), gl.STATIC_DRAW);

    //vertices
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.verData), gl.STATIC_DRAW);

    //normal
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.normalId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.normalData), gl.STATIC_DRAW);

    //enable vertex coordinate data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.vertexAttribPointer(obj.shaderVariables.vPosition, WORLD.vertDim, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj.shaderVariables.vPosition);

    //enable normal data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.normalId);
    gl.vertexAttribPointer(obj.shaderVariables.vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj.shaderVariables.vNormal);

    //obj.configTexture();

    if(wireframe === false) {
		gl.drawElements(gl.TRIANGLES, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
	} else {
		gl.drawElements(gl.LINES, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
	}
}

function clearCanvas() {
	objectPool.forEach(function(o) {
		gl.deleteBuffer(o.idxId);
		gl.deleteBuffer(o.verId);
		gl.deleteBuffer(o.normalId);

		o.verData = [];
		o.normalData = [];
		o.idxData = [];
	});

	objectPool.length = 0;
}

//store vertices for future
function createSphereGeometry(radius, sphereProp) {
	if(geoCache.sphere.cached === true) {
		//console.log('Sphere:: Loaded from cache');
		return geoCache.sphere.geometry;
	}

	var vertices = [],
		normals = [],
		indices = [],
		wireframeColors = [];
	
	var thetaStart = sphereProp.thetaStart || 0, 
		thetaEnd = sphereProp.thetaEnd || Math.PI,
		phiStart = sphereProp.phiStart || 0, 
		phiEnd = sphereProp.phiEnd || 2 * Math.PI,
		longSubDiv = sphereProp.LONG_SUB_DIVISIONS || 16,
		latSubDiv = sphereProp.LAT_SUB_DIVISIONS || 16;

	var thetaRange = thetaEnd - thetaStart,
		phiRange = phiEnd - phiStart;
	
	for(var phi = 0; phi <= longSubDiv; phi++) {
		for(var theta = 0; theta <= latSubDiv; theta++) {
			var t = thetaStart + theta * (thetaRange / latSubDiv),
				p = phiStart + phi * (phiRange / longSubDiv);

			var cosTheta = Math.cos(t),
				sinTheta = Math.sin(t),
				cosPhi = Math.cos(p),
				sinPhi = Math.sin(p);

			var x = cosPhi * sinTheta,
				y = cosTheta,
				z = sinPhi * sinTheta;

			vertices.push(vec3(radius * x, radius * y, radius * z));
			normals.push(vec4(x, y, z, 0.0));

			wireframeColors.push(sphereProp.wireframeColor);
		}
	}

	//calculate indices
	for(var theta = 0; theta < latSubDiv; theta++) {
		for(var phi = 0; phi < longSubDiv; phi++) {
			var totalPoints = (latSubDiv + 1);

			//first triangle
			indices.push(
				phi * totalPoints + theta + 1,
				phi * totalPoints + theta,
				(phi + 1) * totalPoints + theta
			); 

			//second triangle
			indices.push(
				(phi + 1) * totalPoints + theta,
				(phi + 1) * totalPoints + theta + 1,
				phi * totalPoints + theta + 1
			);
		}
	}

	var g = {
		vertices : vertices,
		normals: normals,
		indices: indices,
		wireframeColors: wireframeColors
	};

	geoCache.sphere.geometry = g;
	geoCache.sphere.cached = true;

	return g;
}

function createCylinderGeometry(topRadius, bottomRadius, height, shapeProp, top, bottom, type) {
	if(type === OBJECT_TYPE.CONE) {
		if(geoCache.cone.cached === true) {
			//console.log('Cone:: Loaded from cache');
			return geoCache.cone.geometry;
		}
	} else if(type === OBJECT_TYPE.FUNNEL) {
		if(geoCache.funnel.cached === true) {
			//console.log('Funnel:: Loaded from cache');
			return geoCache.funnel.geometry;
		}
	} else if(type === OBJECT_TYPE.CYLINDER) {
		if(geoCache.cylinder.cached === true) {
			//console.log('Cylinder:: Loaded from cache');
			return geoCache.cylinder.geometry;
		}
	}

	var vertices = [],
		indices = [],
		normals = [],
		wireframeColors = [];

	var radialSegment = shapeProp.radialSegment || 16,
		heightSegment = shapeProp.heightSegment || 1,
		thetaStart = shapeProp.thetaStart || 0,
		thetaEnd = shapeProp.thetaEnd || 2 * Math.PI,
		thetaRange = thetaEnd - thetaStart;

	for(var y = 0; y <= heightSegment; y++) {
		for(var x = 0; x <= radialSegment; x++) {
			var heightStep = y / heightSegment,
				effectiveRadius = heightStep * (bottomRadius - topRadius) + topRadius,
				thetaStep = x / radialSegment,
				theta = thetaStart + thetaStep * thetaRange,
				cosTheta = Math.cos(theta),
				sinTheta = Math.sin(theta);

			var vx = effectiveRadius * cosTheta,
				vy = height / 2 - heightStep * height, //centered at origin
				vz = effectiveRadius * sinTheta;

			vertices.push(vec3(vx, vy, vz));

			//fix normals for cone TODO
			//average the normals along top cap and bottom cap
			if(y == 0 && (type === OBJECT_TYPE.CYLINDER || type === OBJECT_TYPE.FUNNEL)) {
				normals.push(normalize(vec4(0.5 * vx, 0.5, 0.5 * vz, 0.0)));
			} else if(y == heightSegment) {
				normals.push(normalize(vec4(0.5 * vx, -0.5, 0.5 * vz, 0.0)));
			} else {
				normals.push(normalize(vec4(vx, 0, vz, 0.0)));
			}

			wireframeColors.push(shapeProp.wireframeColor);
		}
	}

	//indices for top
	if(top === true && type !== OBJECT_TYPE.CONE) {
		//push center
		vertices.push(vec3(0, height / 2, 0));
		normals.push(vec4(0.0, 1.0, 0.0, 0.0));
		wireframeColors.push(shapeProp.wireframeColor);

		for(var x = 0; x < radialSegment; x++) {
			indices.push(
				x,
				x + 1,
				vertices.length - 1
			);
		}
	}

	//calculate indices
	for(var y = 0; y < heightSegment; y++) {
		for(var x = 0; x < radialSegment; x++) {
			var totalPoints = radialSegment + 1;

			indices.push(
				y * totalPoints + (x + 1),
				y * totalPoints + x,
				(y + 1) * totalPoints + x
			);

			indices.push(
				(y + 1) * totalPoints + x,
				(y + 1) * totalPoints + (x + 1),
				y * totalPoints + (x + 1)
			);
		}
	}

	//indices for bottom
	if(bottom === true) {
		//push center
		vertices.push(vec3(0, -height / 2, 0));
		normals.push(vec4(0.0, -1.0, 0.0, 0.0));
		wireframeColors.push(shapeProp.wireframeColor);

		for(var x = 0; x < radialSegment; x++) {
			var totalPoints = radialSegment + 1;

			indices.push(
				heightSegment * totalPoints + x,
				heightSegment * totalPoints + x + 1,
				vertices.length - 1
			);
		}
	}

	var g = {
		vertices : vertices,
		indices: indices,
		normals: normals,
		wireframeColors: wireframeColors
	};

	if(type === OBJECT_TYPE.CYLINDER) {
		geoCache.cylinder.geometry = g;
		geoCache.cylinder.cached = true;
	} else if(type === OBJECT_TYPE.CONE) {
		geoCache.cone.geometry = g;
		geoCache.cone.cached = true;
	} else if(type === OBJECT_TYPE.FUNNEL) {
		geoCache.funnel.geometry = g;
		geoCache.funnel.cached = true;
	}

	return g;
}

function sphere(translate, rotate, scale, radius) {
	this.radius = radius || 1;

	var sphereGeometry = createSphereGeometry(this.radius, SPHERE_PROPERTY);

	shape.apply(this, [OBJECT_TYPE.SPHERE, sphereGeometry, translate, rotate, scale]);
}

function cylinder(translate, rotate, scale, topRadius, bottomRadius, height, top, bottom) {
	this.topRadius = topRadius || 1;
	this.bottomRadius = bottomRadius || 1;
	this.height = height || 1;
	this.top = top;
	this.bottom = bottom;

	var cylinderGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, CYLINDER_PROPERTY, top, bottom, OBJECT_TYPE.CYLINDER);

	shape.apply(this, [OBJECT_TYPE.CYLINDER, cylinderGeometry, translate, rotate, scale]);
}

function cone(translate, rotate, scale, bottomRadius, height, bottom) {
	this.bottomRadius = bottomRadius || 1;
	this.height = height || 1;
	this.bottom = bottom || true;

	var coneGeometry = createCylinderGeometry(0.00001, this.bottomRadius, this.height, CONE_PROPERTY, false, bottom, OBJECT_TYPE.CONE);

	shape.apply(this, [OBJECT_TYPE.CONE, coneGeometry, translate, rotate, scale]);
}

function funnel(translate, rotate, scale, topRadius, bottomRadius, height, top, bottom) {
	this.topRadius = topRadius || 1;
	this.bottomRadius = bottomRadius || 1;
	this.height = height || 1;
	this.top = top;
	this.bottom = bottom;

	var funnelGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, FUNNEL_PROPERTY, top, bottom, OBJECT_TYPE.FUNNEL);

	shape.apply(this, [OBJECT_TYPE.FUNNEL, funnelGeometry, translate, rotate, scale]);
}

//utility method to create shape and push it to the object pool
function createShape(type, translate, rotate, scale) {
	var obj;

	switch(type) {
		case OBJECT_TYPE.SPHERE:
			obj = new sphere(translate, rotate, scale, 0.5);
			break;

		case OBJECT_TYPE.CYLINDER:
			obj = new cylinder(translate, rotate, scale, 0.5, 0.5, 1, true, true);
			break;

		case OBJECT_TYPE.CONE:
			obj = new cone(translate, rotate, scale, 0.5, 1, true);
			break;

		case OBJECT_TYPE.FUNNEL:
			obj = new funnel(translate, rotate, scale, 0.25, 0.5, 1, false, false);
			break;
	}

	obj.configTexture();
	objectPool.push(obj);
}

//TODO resize
function fullscreen(){
  if(canvas.webkitRequestFullScreen) {
   		canvas.webkitRequestFullScreen();
   } else {
   		canvas.mozRequestFullScreen();
   }           
}

function initCanvas() {
	canvas = document.getElementById( "gl-canvas" );
	aspect =  canvas.width / canvas.height;

    //canvas.addEventListener("click", fullscreen);

    //place fps container in proper position
    $(".fpsContainer").css({
    	left: canvas.getBoundingClientRect().x,
    	top: canvas.getBoundingClientRect().y
    });
}

function initGL() {
	gl = WebGLUtils.setupWebGL(canvas);

    if ( !gl ) { 
    	alert( "WebGL isn't available" ); 
    }

    gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.clearColor(WORLD.worldColor[0], WORLD.worldColor[1], WORLD.worldColor[2], WORLD.worldColor[3]);
    
    //gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    //gl.frontFace(gl.CW);
    //gl.depthFunc(gl.LEQUAL);
    
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);
}

function initViewProjection() {
	modelView = lookAt(eye, at, up);
	projection = perspective(fovy, aspect, nearP, farP);
	//projection = ortho(left, right, bottom, ytop, nearO, farO);
}

function hexToRGB(hex) {
    hex = hex.substr(1);
    
    var rgb = parseInt(hex, 16);

    var r = (rgb >> 16) & 0xFF;
    var g = (rgb >> 8) & 0xFF;
    var b = rgb & 0xFF;
    
    return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
}

//TODO
function resetController() {
	$('#translate-x-slider').attr('value', 0);
}

function initDOM() {
	//sliders input
	$('#translate-x-slider').change(function(e) {
		tX = parseFloat($(this).val()) / 5;
	});

	$('#translate-y-slider').change(function(e) {
		tY = parseFloat($(this).val()) / 5;
	});

	$('#translate-z-slider').change(function(e) {
		tZ = parseFloat($(this).val()) / 5;
	});

	$('#scale-x-slider').change(function(e) {
		sX = parseFloat($(this).val());
	});
	
	$('#scale-y-slider').change(function(e) {
		sY = parseFloat($(this).val());
	});
	
	$('#scale-z-slider').change(function(e) {
		sZ = parseFloat($(this).val());
	});

	$('#rotate-x-slider').change(function(e) {
		rX = parseFloat($(this).val());
	});

	$('#rotate-y-slider').change(function(e) {
		rY = parseFloat($(this).val());
	});

	$('#rotate-z-slider').change(function(e) {
		rZ = parseFloat($(this).val());
	});

	//menu input
	$('#select-object').change(function(e) {
		objectType = $(this).val();
	});

	/*$('#select-texture').change(function(e) {
		$('#loading').show();

		textureType = $(this).val();

		textureImageURL = textureURLs[textureType];

		textureImage = new Image();
		textureImage.crossOrigin = "anonymous";
		textureImage.src = textureImageURL;
		
		if(textureType === TEXTURE_TYPE.CHECKERBOARD) {
			$('#loading').hide();
		}
		
		textureImage.onload = function() {
			$('#loading').hide();
		}

		//update all objects with new texture
		objectPool.forEach(function(o) {
			o.updateTextureImage(textureType);
		});
	});*/

	//button input
	$('#btn-add-object').click(function(e) {
		createShape(objectType, vec3(tX, tY, tZ), vec3(rX, rY, rZ), vec3(sX, sY, sZ));
	});

	$('#btn-clear-canvas').click(function(e) {
		clearCanvas();
	});

	$('#btn-undo').click(function(e) {
		if(objectPool.length > 0) {
			objectPool.splice(objectPool.length - 1, 1)
		}
	});

	$('#btn-reset-controller').click(function(e) {
		resetController();
	});

	$('#camera-theta-slider').on('input', function(e) {
		theta = parseFloat($(this).val());
	});

	$('#camera-phi-slider').on('input', function(e) {
		phi = parseFloat($(this).val());
	});

	$('#camera-dist-slider').on('input',function(e) {
		radius = parseFloat($(this).val());
	});

	$('#btn-camera-reset').click(function(e) {
		theta  = 45;
		phi = 51.04;
		radius = 5.0;
	});

	$('#chkbx-wireframe').click(function(e) {
		wireframe = !wireframe;
	});
}

function updateFpsContainerLocation() {
	$(".fpsContainer").css({
    	left: canvas.getBoundingClientRect().x,
    	top: canvas.getBoundingClientRect().y
    });
}

function loadImage(url) {
	var img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = url;

	return img;
}

function loadCubeMapTextureImages() {
	for(var u in textureCubeMap.urls) {
		textureCubeMap.images[u] = loadImage(textureCubeMap.urls[u]);
	}
}

function loadSkyBox() {
	//init shader
    skybox.program = initShaders(gl, "vertex-shader-skybox", "fragment-shader-skybox");
	
	skybox.shaderVariables = {
		vPosition: gl.getAttribLocation(skybox.program, "vPosition"),
		skyMap: gl.getUniformLocation(skybox.program, "skyMap"),

		modelView: gl.getUniformLocation(skybox.program, "modelView"),
		transformMat: gl.getUniformLocation(skybox.program, "transformMat"),
		projection: gl.getUniformLocation(skybox.program, "projection")
	};

	//init buffers
	skybox.buffer = {
		verId: gl.createBuffer(),
		idxId: gl.createBuffer()
	};

	//load skybox textures
	skybox.texId = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.texId);
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	for(var i = 0, l = skybox.textures.length; i < l; i++) {
		var image = loadImage(skybox.textures[i][1]);
		gl.texImage2D(gl[skybox.textures[i][0]], 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	}

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    //bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(skybox.shaderVariables.skyMap, 0);

    skybox.draw = function() {
		gl.useProgram(this.program);

	    var scale = mat4(),
	    	transformMat = mat4();
	    
	    scale[0][0] = 10;
	    scale[1][1] = 10;
	    scale[2][2] = 10;

	    transformMat = mult(scale, transformMat);

	    gl.uniformMatrix4fv(this.shaderVariables.transformMat, false, flatten(transformMat));
		gl.uniformMatrix4fv(this.shaderVariables.modelView, false, flatten(modelView));
		gl.uniformMatrix4fv(this.shaderVariables.projection, false, flatten(projection));

		gl.depthMask(false);

		//bind buffer
		//indices
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.idxId);
	    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

	    //vertices
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.verId);
	    gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

	    //enable vertex coordinate data
	    gl.vertexAttribPointer(this.shaderVariables.vPosition, WORLD.vertDim, gl.FLOAT, false, 0, 0);
	    gl.enableVertexAttribArray(this.shaderVariables.vPosition);
	    //gl.drawElements(gl.LINE_STRIP, this.indices.length, gl.UNSIGNED_SHORT, 0);
	    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
	}
}

function initObjects() {
	/*createShape(OBJECT_TYPE.SPHERE, vec3(1.5, 0, 0), vec3(0, 0, 0), vec3(1.2, 0.6, 1.2));
	createShape(OBJECT_TYPE.SPHERE, vec3(0, 1.4, 0), vec3(0, 0, 0), vec3(1.2, 0.6, 1.2));
	createShape(OBJECT_TYPE.SPHERE, vec3(0, -1.4, 0), vec3(0, 0, 0), vec3(1.2, 0.5, 1.6));
	createShape(OBJECT_TYPE.CYLINDER, vec3(0, 0, 0), vec3(0, 0, 0), vec3(1, 1, 1));
	createShape(OBJECT_TYPE.CONE, vec3(-1.5, 0, 0), vec3(0, 0, 0), vec3(1, 1, 1));
	createShape(OBJECT_TYPE.FUNNEL, vec3(-1.6, 1.4, 0), vec3(0, 0, 0), vec3(1, 1, 1));
	createShape(OBJECT_TYPE.FUNNEL, vec3(1.6, 1.4, 0), vec3(0, 0, 0), vec3(1.5, 1, 1));*/

	createShape(OBJECT_TYPE.SPHERE, vec3(0, 0, -5), vec3(0, 0, 0), vec3(1.2, 0.6, 1.2));
}

window.onresize = function() {
	updateFpsContainerLocation();
}

window.onload = function() {
	loadCubeMapTextureImages();
	
	initDOM();
	initCanvas();
	initGL();
	initViewProjection();

	loadSkyBox();
	initObjects();	

	render();
}

function calculateFPS() {
	var now = new Date().getTime();
	elapsedTime += (now - lastTime);

	lastTime = now;
	frameCount++;

	if(elapsedTime >= 1000) {
		$('.fps').html('Fps: ' + frameCount);
		frameCount = 0;
		elapsedTime = 0;
	}
}

function render() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.clearColor(WORLD.worldColor[0], WORLD.worldColor[1], WORLD.worldColor[2], WORLD.worldColor[3]);
	
	eye = vec3(radius * Math.sin(radians(theta)) * Math.cos(radians(phi)),
        radius * Math.sin(radians(theta)) * Math.sin(radians(phi)), radius * Math.cos(radians(theta)));

	initViewProjection();

	//draw skybox
	skybox.draw();

	objectPool.forEach(function(o) {
		o.update();
	});

	objectPool.forEach(function(o) {
		o.draw();
	});

	window.requestAnimFrame(render);

	if(WORLD.showFPS) {
		calculateFPS();
	}
}