"use strict";

var WORLD = {
	vertDim: 3,
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	worldColor: vec4(0.26, 0.274, 0.32),

	numberOfLights: 2,
	lights: [],
	animateLight: false,
	lightMoveDelta: 0.0,

	timeScale: 0.02
};

var OBJECT_TYPE = {
	SPHERE: 'SPHERE',
	CONE: 'CONE',
	CYLINDER: 'CYLINDER',
	FUNNEL: 'FUNNEL',
	AXIS_CARPET: 'AXIS_CARPET'
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
	heightSegment: 32,
	thetaStart: 0,
	thetaEnd: 2 * Math.PI,
	top: true,
	bottom: true,
	coneWireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	funnelWireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
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

var radius = 8.0;
var theta  = 45;
var phi    = 51.04;
var dr = 5.0 * Math.PI / 180.0;

var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var eye = vec3(1.0, 5.0, radius);

var tX = 0.0, tY = 0.0, tZ = 0.0, 
	sX = 1.0, sY = 1.0, sZ = 1.0,
	rX = 0.0, rY = 0.0, rZ = 0.0;

var objectType = OBJECT_TYPE.SPHERE;

var wireframe = false;

var matDefaultAmbientColor = '#003300', 
	matDefaultDiffuseColor = '#003300', 
	matDefaultSpecularColor = '#ffff99', 
	matDefaultShininess = 15;

var matAmbientColor = hexToRGB(matDefaultAmbientColor), 
	matDiffuseColor = hexToRGB(matDefaultDiffuseColor),
	matSpecularColor = hexToRGB(matDefaultSpecularColor),
	matShininess = matDefaultShininess;

var light1R = 10.0,
	light2R = 10.0;

var light1DefaultPosition = vec4(light1R, 0.0, 0.0, 1.0),
	light1DefaultAmbientColor = '#ffffff', 
	light1DefaultDiffuseColor = '#99ffcc', 
	light1DefaultSpecularColor = '#ff9900',

	light2DefaultPosition = vec4(0.0, light2R, 0.0, 1.0),
	light2DefaultAmbientColor = '#ffffff', 
	light2DefaultDiffuseColor = '#009933', 
	light2DefaultSpecularColor = '#00ff00';

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
function shape(type, shapeProp, material, translate, rotate, scale) {
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
	this.material = material;

	this.translate = translate || vec3(0.0, 0.0, 0.0);
	this.rotate = (rotate) ? vec3(rotate[0], rotate[1], rotate[2]) : vec3(0.0, 0.0, 0.0);
	this.scale = scale || vec3(1.0, 1.0, 1.0);

	this.program = initShaders(gl, "vertex-shader", "fragment-shader");
	
	this.shaderVariables = {
		vPosition: gl.getAttribLocation(this.program, "vPosition"),
		vNormal: gl.getAttribLocation(this.program, "vNormal"),

		modelView: gl.getUniformLocation(this.program, "modelView"),
		transformMat: gl.getUniformLocation(this.program, "transformMat"),
		normalMatrix: gl.getUniformLocation(this.program, "normalMatrix"),
		projection: gl.getUniformLocation(this.program, "projection"),

		matAmbientColor: gl.getUniformLocation(this.program, "matAmbientColor"),
		matDiffuseColor: gl.getUniformLocation(this.program, "matDiffuseColor"),
		matSpecularColor: gl.getUniformLocation(this.program, "matSpecularColor"),
		shininess: gl.getUniformLocation(this.program, "shininess"),
		lights: []
		//,numLights: gl.getUniformLocation(this.program, "numLights")
	};

	//init light shader variables
	for(var i = 0; i < WORLD.numberOfLights; i++) {
		var lightShaderVars = {};

		lightShaderVars.position = gl.getUniformLocation(this.program, 'lightPosition[' + i + ']');
		
		lightShaderVars.ambient = gl.getUniformLocation(this.program, 'lights[' + i + '].ambient');
		lightShaderVars.diffuse = gl.getUniformLocation(this.program, 'lights[' + i + '].diffuse');
		lightShaderVars.specular = gl.getUniformLocation(this.program, 'lights[' + i + '].specular');
		lightShaderVars.enabled = gl.getUniformLocation(this.program, 'lights[' + i + '].enabled');

		lightShaderVars.constantAttenuation = gl.getUniformLocation(this.program, 'lightAttenuation[' + i + '].constantAttenuation');
		lightShaderVars.linearAttenuation = gl.getUniformLocation(this.program, 'lightAttenuation[' + i + '].linearAttenuation');
		lightShaderVars.quadraticAttenuation = gl.getUniformLocation(this.program, 'lightAttenuation[' + i + '].quadraticAttenuation');

		this.shaderVariables.lights.push(lightShaderVars);
	}

	this.draw = function() {
		drawShape(this);
	}

	this.setTranslate = function(translate) {
		this.translate = translate;
		gl.uniform3fv(this.shaderVariables.translate, flatten(this.translate));
	}

	this.setRotate = function(rotate) {
		this.rotate = vec3(radians(rotate[0]), radians(rotate[1]), radians(rotate[2]));
		gl.uniform3fv(this.shaderVariables.rotate, flatten(this.rotate));
	}

	this.setScale = function(scale) {
		this.scale = scale;
		gl.uniform3fv(this.shaderVariables.scale, flatten(this.scale));
	}
}

function drawShape(obj) {
	//initialize shader variables
	gl.useProgram(obj.program);

	gl.uniform4fv(obj.shaderVariables.matAmbientColor, flatten(obj.material.ambientColor));
    gl.uniform4fv(obj.shaderVariables.matDiffuseColor, flatten(obj.material.diffuseColor));
    gl.uniform4fv(obj.shaderVariables.matSpecularColor, flatten(obj.material.specularColor));
    gl.uniform1f(obj.shaderVariables.shininess, obj.material.shininess);

    //gl.uniform1i(obj.shaderVariables.numLights, WORLD.numberOfLights);

    for(var i = 0; i < WORLD.numberOfLights; i++) {
    	gl.uniform4fv(obj.shaderVariables.lights[i].position, flatten(WORLD.lights[i].position));

    	gl.uniform4fv(obj.shaderVariables.lights[i].ambient, flatten(WORLD.lights[i].ambient));
    	gl.uniform4fv(obj.shaderVariables.lights[i].diffuse, flatten(WORLD.lights[i].diffuse));
    	gl.uniform4fv(obj.shaderVariables.lights[i].specular, flatten(WORLD.lights[i].specular));
    	gl.uniform1i(obj.shaderVariables.lights[i].enabled, WORLD.lights[i].enabled);

    	gl.uniform1f(obj.shaderVariables.lights[i].constantAttenuation, WORLD.lights[i].constantAttenuation);
    	gl.uniform1f(obj.shaderVariables.lights[i].linearAttenuation, WORLD.lights[i].linearAttenuation);
    	gl.uniform1f(obj.shaderVariables.lights[i].quadraticAttenuation, WORLD.lights[i].quadraticAttenuation);
    }

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

    //draw
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.verData), gl.STATIC_DRAW );
	gl.vertexAttribPointer(obj.shaderVariables.vPosition, WORLD.vertDim, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(obj.shaderVariables.vPosition);

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

			var x = cosTheta * sinPhi,
				y = cosPhi,
				z = sinTheta * sinPhi;

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

function createCylinderGeometry(topRadius, bottomRadius, height, cylinderProp, top, bottom) {
	if(top === true) {
		if(geoCache.cylinder.cached === true) {
			return geoCache.cylinder.geometry;
		}
	} else if(bottom === true) {
		if(geoCache.cone.cached === true) {
			return geoCache.cone.geometry;
		}
	} else {
		if(geoCache.funnel.cached === true) {
			return geoCache.funnel.geometry;
		}
	}

	var vertices = [],
		indices = [],
		normals = [],
		wireframeColors = [];

	var radialSegment = cylinderProp.radialSegment || 16,
		heightSegment = cylinderProp.heightSegment || 1,
		thetaStart = cylinderProp.thetaStart || 0,
		thetaEnd = cylinderProp.thetaEnd || 2 * Math.PI,
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
			if(y == 0 && top === true && topRadius > 0) {
				normals.push(normalize(vec4(0.5 * vx, 0.5, 0.5 * vz, 0.0)));
			} else if(y == heightSegment) {
				normals.push(normalize(vec4(0.5 * vx, -0.5, 0.5 * vz, 0.0)));
			} else {
				normals.push(normalize(vec4(vx, 0, vz, 0.0)));
			}

			wireframeColors.push((top === false && bottom === false) ? cylinderProp.coneWireframeColor : ((top === false) ? cylinderProp.funnelWireframeColor : cylinderProp.wireframeColor));
		}
	}

	//indices for top
	if(top === true && topRadius > 0) {
		//push center
		vertices.push(vec3(0, height / 2, 0));
		normals.push(vec4(0.0, 1.0, 0.0, 0.0));
		wireframeColors.push(cylinderProp.wireframeColor);

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
	if(bottom === true && bottomRadius > 0) {
		//push center
		vertices.push(vec3(0, -height / 2, 0));
		normals.push(vec4(0.0, -1.0, 0.0, 0.0));
		wireframeColors.push((top === false) ? cylinderProp.coneWireframeColor : cylinderProp.wireframeColor);

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

	if(top === true) {
		geoCache.cylinder.geometry = g;
		geoCache.cylinder.cached = true;
	} else if(bottom === true) {
		geoCache.cone.geometry = g;
		geoCache.cone.cached = true;
	} else {
		geoCache.funnel.geometry = g;
		geoCache.funnel.cached = true;
	}

	return g;
}

function createAxisCarpetGeometry() {
	var xmax = 4,
		xmin = 0,
		zmax = 2,
		zmin = 0,
		step = 1.0;

	var vertices = [],
		indices = [],
		colors = [],
		wireframeColors = [];

	for(var z = zmin; z <= zmax; z += step) {
		for(var x = xmin; x <= xmax; x += step) {
			vertices.push(vec3(x, 0.0, z));
			colors.push(vec4(0.0, 1.0, 1.0, 1.0));
			wireframeColors.push(vec4(1.0, 1.0, 1.0, 1.0));
		}
	}
	
	for(var z = zmax; z > zmin; z -= step) {
		for(var x = xmax; x > xmin; x -= step) {
			var totalPoints = (xmax - xmin) / step + 1;

			indices.push(
				(z - 1) * totalPoints + x - 1,
				(z - 1) * totalPoints + x,
				z * totalPoints + x
			);

			indices.push(
				z * totalPoints + x,
				z * totalPoints + x - 1,
				(z - 1) * totalPoints + (x - 1)
			);
		}
	}

	return {
		vertices : vertices,
		indices: indices,
		colors: colors,
		wireframeColors: wireframeColors
	}	
}

function createAxisLinesGeometry() {
	var vertices = [],
		indices = [],
		colors = [],
		wireframeColors = [];

	var length = 1000,
		xcolor = vec4(1.0, 0.0, 0.0, 1.0),
		ycolor = vec4(0.0, 1.0, 0.0, 1.0),
		zcolor = vec4(0.0, 0.0, 1.0, 1.0);

	//x-axis
	vertices.push(vec3(-length, 0.0, 0.0));
	colors.push(xcolor);
	wireframeColors.push(xcolor);
	
	vertices.push(vec3(length, 0.0, 0.0));
	colors.push(xcolor);
	wireframeColors.push(xcolor);

	//y-axis
	vertices.push(vec3(0.0, -length, 0.0));
	colors.push(ycolor);
	wireframeColors.push(ycolor);
	
	vertices.push(vec3(0.0, length, 0.0));
	colors.push(ycolor);
	wireframeColors.push(ycolor);

	//z-axis
	vertices.push(vec3(0.0, 0.0, -length));
	colors.push(zcolor);
	wireframeColors.push(zcolor);
	
	vertices.push(vec3(0.0, 0.0, length));
	colors.push(zcolor);
	wireframeColors.push(zcolor);

	indices.push(
		0, 1,
		2, 3,
		4, 5
	);

	return {
		vertices: vertices,
		indices: indices,
		colors: colors,
		wireframeColors: wireframeColors
	}
}

function sphere(material, translate, rotate, scale, radius) {
	this.radius = radius || 1;

	var sphereGeometry = createSphereGeometry(this.radius, SPHERE_PROPERTY);

	shape.apply(this, [OBJECT_TYPE.SPHERE, sphereGeometry, material, translate, rotate, scale]);
}

function cylinder(material, translate, rotate, scale, topRadius, bottomRadius, height, top, bottom) {
	this.topRadius = topRadius || 1;
	this.bottomRadius = bottomRadius || 1;
	this.height = height || 1;
	this.top = top;
	this.bottom = bottom;

	var cylinderGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, CYLINDER_PROPERTY, top, bottom);

	shape.apply(this, [OBJECT_TYPE.CYLINDER, cylinderGeometry, material, translate, rotate, scale]);
}

function funnel(material, translate, rotate, scale, topRadius, bottomRadius, height, top, bottom) {
	this.topRadius = topRadius || 1;
	this.bottomRadius = bottomRadius || 1;
	this.height = height || 1;
	this.top = top;
	this.bottom = bottom;

	var cylinderGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, CYLINDER_PROPERTY, top, bottom);

	shape.apply(this, [OBJECT_TYPE.CYLINDER, cylinderGeometry, material, translate, rotate, scale]);
}

function axisCarpet() {
	var axisCarpetGeometry = createAxisLinesGeometry();//createAxisCarpetGeometry();

	shape.apply(this, [OBJECT_TYPE.AXIS_CARPET, axisCarpetGeometry]);
}

//utility method to create shape and push it to the object pool
function createShape(type, material, translate, rotate, scale) {
	var obj;

	switch(type) {
		case OBJECT_TYPE.SPHERE:
			obj = new sphere(material, translate, rotate, scale, 0.5);
			break;

		case OBJECT_TYPE.CYLINDER:
			obj = new cylinder(material, translate, rotate, scale, 0.5, 0.5, 1, true, true);
			break;

		case OBJECT_TYPE.CONE:
			obj = new cylinder(material, translate, rotate, scale, 0.00001, 0.5, 1, false, true);
			break;

		case OBJECT_TYPE.FUNNEL:
			obj = new cylinder(material, translate, rotate, scale, 0.25, 0.5, 1, false, false);
			break;
	}

	objectPool.push(obj);
}

function initCanvas() {
	canvas = document.getElementById( "gl-canvas" );

	aspect =  canvas.width / canvas.height;
}

function initGL() {
	gl = WebGLUtils.setupWebGL( canvas );

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

function updateObjectColorInCache(obj) {
	if(obj.cached === true) {
		//obj.geometry.material.ambientColor = shapeColor;
	}
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

	//button input
	$('#btn-add-object').click(function(e) {
		var material = {
			ambientColor: matAmbientColor,
			diffuseColor: matDiffuseColor,
			specularColor: matSpecularColor,
			shininess: matShininess
		};
		
		createShape(objectType, material, vec3(tX, tY, tZ), vec3(rX, rY, rZ), vec3(sX, sY, sZ));
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

	$('#btn-camera-theta-increase').click(function(e) {
		theta += dr;
	});

	$('#btn-camera-theta-decrease').click(function(e) {
		theta -= dr;
	});

	$('#btn-camera-phi-increase').click(function(e) {
		phi += dr;
	});

	$('#btn-camera-phi-decrease').click(function(e) {
		phi -= dr;
	});

	$('#btn-camera-closer').click(function(e) {
		radius -= 0.2;
	});

	$('#btn-camera-away').click(function(e) {
		radius += 0.2;
	});

	$('#btn-camera-reset').click(function(e) {
		theta  = 45;
		phi = 51.04;
		radius = 8.0;
	});

	$('#chkbx-wireframe').click(function(e) {
		wireframe = !wireframe;
	});

	/*
		Material properties
	*/
	$("#shape-ambient-color").colorpicker({
        color: matDefaultAmbientColor,
        defaultPalette: 'web'
    });

    $("#shape-diffuse-color").colorpicker({
        color: matDefaultDiffuseColor,
        defaultPalette: 'web'
    });

    $("#shape-specular-color").colorpicker({
        color: matDefaultSpecularColor,
        defaultPalette: 'web'
    });

    //update material properties
    $("#shape-ambient-color").on("change.color", function(e, color){
        matAmbientColor = hexToRGB(color + '');
    });

    $("#shape-diffuse-color").on("change.color", function(e, color){
        matDiffuseColor = hexToRGB(color + '');
    });

    $("#shape-specular-color").on("change.color", function(e, color){
        matSpecularColor = hexToRGB(color + '');
    });

    $('#shininess-slider').change(function(e) {
		matShininess = parseFloat($(this).val());
	});

	/*
		Light properties
	*/
	$("#light1-ambient-color").colorpicker({
        color: light1DefaultAmbientColor,
        defaultPalette: 'web'
    });

    $("#light1-diffuse-color").colorpicker({
        color: light1DefaultDiffuseColor,
        defaultPalette: 'web'
    });

    $("#light1-specular-color").colorpicker({
        color: light1DefaultSpecularColor,
        defaultPalette: 'web'
    });

    $("#light2-ambient-color").colorpicker({
        color: light2DefaultAmbientColor,
        defaultPalette: 'web'
    });

    $("#light2-diffuse-color").colorpicker({
        color: light2DefaultDiffuseColor,
        defaultPalette: 'web'
    });

    $("#light2-specular-color").colorpicker({
        color: light2DefaultSpecularColor,
        defaultPalette: 'web'
    });

    $("#light1-ambient-color").on("change.color", function(e, color){
        WORLD.lights[0].ambient = hexToRGB(color + '');
    });

    $("#light1-diffuse-color").on("change.color", function(e, color){
        WORLD.lights[0].diffuse = hexToRGB(color + '');
    });

    $("#light1-specular-color").on("change.color", function(e, color){
        WORLD.lights[0].specular = hexToRGB(color + '');
    });

    $("#light2-ambient-color").on("change.color", function(e, color){
        WORLD.lights[1].ambient = hexToRGB(color + '');
    });

    $("#light2-diffuse-color").on("change.color", function(e, color){
        WORLD.lights[1].diffuse = hexToRGB(color + '');
    });

    $("#light2-specular-color").on("change.color", function(e, color){
        WORLD.lights[1].specular = hexToRGB(color + '');
    });

    $('#light1-posx-slider').change(function(e) {
		WORLD.lights[0].position[0] = parseFloat($(this).val());
	});

	$('#light1-posy-slider').change(function(e) {
		WORLD.lights[0].position[1] = parseFloat($(this).val());
	});

	$('#light1-posz-slider').change(function(e) {
		WORLD.lights[0].position[2] = parseFloat($(this).val());
	});

	$('#light1-constant-attn').change(function(e) {
		WORLD.lights[0].constantAttenuation = parseFloat($(this).val());
	});

	$('#light1-linear-attn').change(function(e) {
		WORLD.lights[0].linearAttenuation = parseFloat($(this).val());
	});

	$('#light1-quadratic-attn').change(function(e) {
		WORLD.lights[0].quadraticAttenuation = parseFloat($(this).val());
	});

	$('#light2-constant-attn').change(function(e) {
		WORLD.lights[1].constantAttenuation = parseFloat($(this).val());
	});

	$('#light2-linear-attn').change(function(e) {
		WORLD.lights[1].linearAttenuation = parseFloat($(this).val());
	});

	$('#light2-quadratic-attn').change(function(e) {
		WORLD.lights[1].quadraticAttenuation = parseFloat($(this).val());
	});

	$('#light2-posx-slider').change(function(e) {
		WORLD.lights[1].position[0] = parseFloat($(this).val());
	});

	$('#light2-posy-slider').change(function(e) {
		WORLD.lights[1].position[1] = parseFloat($(this).val());
	});

	$('#light2-posz-slider').change(function(e) {
		WORLD.lights[1].position[2] = parseFloat($(this).val());
	});

	$('#chkbx-light1-enabled').click(function(e) {
		WORLD.lights[0].enabled = 1 - WORLD.lights[0].enabled;
	});

	$('#chkbx-light2-enabled').click(function(e) {
		WORLD.lights[1].enabled = 1 - WORLD.lights[1].enabled;
	});

	$('#chkbx-light-animation-enabled').click(function(e) {
		WORLD.animateLight = !WORLD.animateLight;

		if(WORLD.animateLight === true) {
			$('#light1-position').hide();
			$('#light2-position').hide();
		} else {
			$('#light1-position').show();
			$('#light2-position').show();

			WORLD.lightMoveDelta = 0.0;
			WORLD.lights[0].position = light1DefaultPosition;
			WORLD.lights[1].position = light2DefaultPosition;
		}
	});
}

function initLight() {
	var light1 = {};

	light1.position = light1DefaultPosition;
	light1.ambient = hexToRGB(light1DefaultAmbientColor);
	light1.diffuse = hexToRGB(light1DefaultDiffuseColor);
	light1.specular = hexToRGB(light1DefaultSpecularColor);

	light1.constantAttenuation = 1.0;
	light1.linearAttenuation = 0.0;
	light1.quadraticAttenuation = 0.0;

	light1.enabled = 1;

	var light2 = {};

	light2.position = light2DefaultPosition;
	light2.ambient = hexToRGB(light2DefaultAmbientColor);
	light2.diffuse = hexToRGB(light2DefaultDiffuseColor);
	light2.specular = hexToRGB(light2DefaultSpecularColor);

	light2.constantAttenuation = 1.0;
	light2.linearAttenuation = 0.0;
	light2.quadraticAttenuation = 0.0;

	light2.enabled = 1;

	WORLD.lights.push(light1, light2);
}

function initAxisGeometry() {
	var carpetXZ = new axisCarpet();

	axisCarpets.push(carpetXZ);
}

function animateLights() {
	/*var x1 = light1R * Math.cos(radians(new Date().getTime() * WORLD.timeScale));
	var y1 = light1R * Math.sin(radians(new Date().getTime() * WORLD.timeScale));

	WORLD.lights[0].position = vec4(x1, y1, WORLD.lights[0].position[2], 1.0);

	var y2 = light2R * Math.cos(radians(new Date().getTime() * WORLD.timeScale));
	var z2 = light2R * Math.sin(radians(new Date().getTime() * WORLD.timeScale));

	WORLD.lights[1].position = vec4(WORLD.lights[1].position[0], y2, z2, 1.0);*/
	

	var x1 = light1R * Math.cos(radians(WORLD.lightMoveDelta));
	var y1 = light1R * Math.sin(radians(WORLD.lightMoveDelta));

	WORLD.lights[0].position = vec4(x1, y1, WORLD.lights[0].position[2], 1.0);

	var y2 = light2R * Math.cos(radians(WORLD.lightMoveDelta));
	var z2 = light2R * Math.sin(radians(WORLD.lightMoveDelta));

	WORLD.lights[1].position = vec4(WORLD.lights[1].position[0], y2, z2, 1.0);
}

window.onload = function() {
	initDOM();
	initCanvas();
	initGL();
	initLight();
	initViewProjection();
	//initAxisGeometry();
	render();
}

var frameCount = 0,
	lastTime = 0,
	elapsedTime = 0;

function render() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.clearColor(WORLD.worldColor[0], WORLD.worldColor[1], WORLD.worldColor[2], WORLD.worldColor[3]);
	
	eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
	
	initViewProjection();

	if(WORLD.animateLight === true) {
		WORLD.lightMoveDelta += 0.5;

		animateLights();
	}

    //draw axis
    /*axisCarpets.forEach(function(c) {
    	c.draw();
    });*/

	objectPool.forEach(function(o) {
		o.draw();
	});

	window.requestAnimFrame(render);

	var now = new Date().getTime();
	elapsedTime += (now - lastTime);

	lastTime = now;
	frameCount++;

	if(elapsedTime >= 1000) {
		$('#fps').html('FPS: ' + frameCount);
		frameCount = 0;
		elapsedTime = 0;
	}
}