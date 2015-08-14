"use strict";

/*var vertices1 = [
    vec3( -0.5, -0.5,  0.5 ),
    vec3( -0.5,  0.5,  0.5 ),
    vec3(  0.5,  0.5,  0.5 ),
    vec3(  0.5, -0.5,  0.5 ),
    vec3( -0.5, -0.5, -0.5 ),
    vec3( -0.5,  0.5, -0.5 ),
    vec3(  0.5,  0.5, -0.5 ),
    vec3(  0.5, -0.5, -0.5 )
];

var colors1 = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 1.0, 1.0, 1.0, 1.0 ),  // white
    vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
];

// indices of the 12 triangles that compise the cube

var indices1 = [
    1, 0, 3,
    3, 2, 1,
    2, 3, 7,
    7, 6, 2,
    3, 0, 4,
    4, 7, 3,
    6, 5, 1,
    1, 2, 6,
    4, 5, 6,
    6, 7, 4,
    5, 4, 0,
    0, 1, 5
];*/

var WORLD = {
	vertDim: 3,
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	worldColor: vec4(0.26, 0.274, 0.32)
}

var OBJECT_TYPE = {
	SPHERE: 'SPHERE',
	CONE: 'CONE',
	CYLINDER: 'CYLINDER',
	FUNNEL: 'FUNNEL',
	AXIS_CARPET: 'AXIS_CARPET'
};

var SPHERE_PROPERTY = {
	LONG_SUB_DIVISIONS: 32, //should be double of lat divs
	LAT_SUB_DIVISIONS: 16,

	thetaStart: 0,
	thetaEnd: Math.PI,
	phiStart: 0, 
	phiEnd: 2 * Math.PI,

	color: vec4(0.8, 0, 1, 1),
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
};

var CYLINDER_PROPERTY = {
	radialSegment: 16,
	heightSegment: 1,
	thetaStart: 0,
	thetaEnd: 2 * Math.PI,
	top: true,
	bottom: true,

	color: vec4(0.0, 0.6, 1.0, 1.0),
	coneColor: vec4(1.0, 0.6, 0.0, 1.0),
	coneWireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	wireframeColor: vec4(1.0, 1.0, 1.0, 1.0),
	funnelColor: vec4(0, 0.8, 0.6, 1),
	funnelWireframeColor: vec4(1.0, 1.0, 1.0, 1.0)
};

var geoCache = {
	sphere: {
		geometry: {
			vertices : [],
			indices: [],
			colors: [],
			wireframeColors: []
		},
		cached: false
	},

	cylinder: {
		geometry: {
			vertices : [],
			indices: [],
			colors: [],
			wireframeColors: []
		},
		cached: false
	},

	cone: {
		geometry: {
			vertices : [],
			indices: [],
			colors: [],
			wireframeColors: []
		},
		cached: false
	},

	funnel: {
		geometry: {
			vertices : [],
			indices: [],
			colors: [],
			wireframeColors: []
		},
		cached: false
	}
}

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

/*const at = vec3(0.0, -1.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var cameraDistance = 1.0;

var eye = vec3(0.0, 0.5, cameraDistance);*/

var radius = 8.0;
var theta  = 45;
var phi    = 51.04;
var dr = 5.0 * Math.PI/180.0;

var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var eye = vec3(1.0, 5.0, radius);

var tX = 0.0, tY = 0.0, tZ = 0.0, 
	sX = 1.0, sY = 1.0, sZ = 1.0,
	rX = 0.0, rY = 0.0, rZ = 0.0;

var objectType = OBJECT_TYPE.SPHERE;
var wireframe = false;
var shapeColor;

//constructor to create an object
//type property defines the object type
function shape(type, shapeProp, translate, rotate, scale) {
	this.buffer = {
		verId: gl.createBuffer(),
		verData: shapeProp.vertices,

		idxId: gl.createBuffer(),
		idxData: shapeProp.indices, 

		colId: gl.createBuffer(),
		colData: shapeProp.colors,

		wireframeColorData: shapeProp.wireframeColors
	};

	this.type = type;

	this.translate = translate || vec3(0.0, 0.0, 0.0);
	this.rotate = (rotate) ? vec3(radians(rotate[0]), radians(rotate[1]), radians(rotate[2])) : vec3(0.0, 0.0, 0.0);
	this.scale = scale || vec3(1.0, 1.0, 1.0);

	this.program = initShaders( gl, "vertex-shader", "fragment-shader" );
	
	this.shaderVariables = {
		vPosition: gl.getAttribLocation(this.program, "vPosition"),
		vColor: gl.getAttribLocation(this.program, "vColor"),

		modelView: gl.getUniformLocation(this.program, "modelView"),
		projection: gl.getUniformLocation(this.program, "projection"),
		
		translate: gl.getUniformLocation(this.program, "translation"),
		rotate: gl.getUniformLocation(this.program, "rotation"),
		scale: gl.getUniformLocation(this.program, "scale")
	};

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

	//set model view and projection matrix which are same for each object
	gl.uniformMatrix4fv(obj.shaderVariables.modelView, false, flatten(modelView));
	gl.uniformMatrix4fv(obj.shaderVariables.projection, false, flatten(projection));

	//bind buffer
	//indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.buffer.idxId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.buffer.idxData), gl.STATIC_DRAW);

    //vertices
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.verData), gl.STATIC_DRAW);

    //color
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.colData), gl.STATIC_DRAW);

    //enable vertex coordinate data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.vertexAttribPointer(obj.shaderVariables.vPosition, WORLD.vertDim, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj.shaderVariables.vPosition);

    //enable vertex color data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
    gl.vertexAttribPointer(obj.shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj.shaderVariables.vColor);

    //send transformation vectors
    gl.uniform3fv(obj.shaderVariables.translate, flatten(obj.translate));
    gl.uniform3fv(obj.shaderVariables.rotate, flatten(obj.rotate));
    gl.uniform3fv(obj.shaderVariables.scale, flatten(obj.scale));

    //draw
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.verData), gl.STATIC_DRAW );
	gl.vertexAttribPointer(obj.shaderVariables.vPosition, WORLD.vertDim, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(obj.shaderVariables.vPosition);

	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.colData), gl.STATIC_DRAW );
	gl.vertexAttribPointer(obj.shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(obj.shaderVariables.vColor);

	if(wireframe === false && obj.type !== OBJECT_TYPE.AXIS_CARPET) {
		gl.drawElements(gl.TRIANGLES, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.wireframeColorData), gl.STATIC_DRAW );
	gl.vertexAttribPointer(obj.shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(obj.shaderVariables.vColor);

	if(obj.type === OBJECT_TYPE.AXIS_CARPET) {
		gl.drawElements(gl.LINES, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
	} else {
		gl.drawElements(gl.LINE_STRIP, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
	}
}

function clearCanvas() {
	objectPool.forEach(function(o) {
		gl.deleteBuffer(o.idxId);
		gl.deleteBuffer(o.verId);
		gl.deleteBuffer(o.colId);

		o.verData = [];
		o.colData = [];
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
		indices = [],
		colors = [],
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

			var x = radius * cosTheta * sinPhi,
				y = radius * cosPhi,
				z = radius * sinTheta * sinPhi;

			vertices.push(vec3(x, y, z));
			
			colors.push(sphereProp.color);
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
		indices: indices,
		colors: colors,
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
		colors = [],
		wireframeColors = [];

	var radialSegment = cylinderProp.radialSegment || 16,
		heightSegment = (top === true) ? cylinderProp.heightSegment || 1 : 1,
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
			colors.push((top === false && bottom === false) ? cylinderProp.funnelColor : ((top === false) ? cylinderProp.coneColor : cylinderProp.color));
			//colors.push((top === false) ? cylinderProp.coneColor : cylinderProp.color);
			wireframeColors.push((top === false && bottom === false) ? cylinderProp.coneWireframeColor : ((top === false) ? cylinderProp.funnelWireframeColor : cylinderProp.wireframeColor));
			//wireframeColors.push((top === false) ? cylinderProp.coneWireframeColor : cylinderProp.wireframeColor);
		}
	}

	//indices for top
	if(top === true && topRadius > 0) {
		//push center
		vertices.push(vec3(0, height / 2, 0));
		colors.push(cylinderProp.color);
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
		colors.push((top === false) ? cylinderProp.coneColor : cylinderProp.color);
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
		colors: colors,
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
		vertices : vertices,
		indices: indices,
		colors: colors,
		wireframeColors: wireframeColors
	}
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

	var cylinderGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, CYLINDER_PROPERTY, top, bottom);

	shape.apply(this, [OBJECT_TYPE.CYLINDER, cylinderGeometry, translate, rotate, scale]);
}

function funnel(translate, rotate, scale, topRadius, bottomRadius, height, top, bottom) {
	this.topRadius = topRadius || 1;
	this.bottomRadius = bottomRadius || 1;
	this.height = height || 1;
	this.top = top;
	this.bottom = bottom;

	var cylinderGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, CYLINDER_PROPERTY, top, bottom);

	shape.apply(this, [OBJECT_TYPE.CYLINDER, cylinderGeometry, translate, rotate, scale]);
}

function axisCarpet() {
	var axisCarpetGeometry = createAxisLinesGeometry();//createAxisCarpetGeometry();

	shape.apply(this, [OBJECT_TYPE.AXIS_CARPET, axisCarpetGeometry]);
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
			obj = new cylinder(translate, rotate, scale, 0.00001, 0.5, 1, false, true);
			break;

		case OBJECT_TYPE.FUNNEL:
			obj = new cylinder(translate, rotate, scale, 0.5, 1.0, 1, false, false);
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
		obj.geometry.colors = [];

		for(var i = 0, l = obj.geometry.vertices.length; i < l; i++) {
			obj.geometry.colors.push(shapeColor);
		}
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
		if(shapeColor !== undefined) {
			if($('#select-object').val() === OBJECT_TYPE.SPHERE) {
 				SPHERE_PROPERTY.color = shapeColor;

 				updateObjectColorInCache(geoCache.sphere);
 			} else if($('#select-object').val() === OBJECT_TYPE.CYLINDER) {
 				CYLINDER_PROPERTY.color = shapeColor;

 				updateObjectColorInCache(geoCache.cylinder);
 			} else if($('#select-object').val() === OBJECT_TYPE.CONE) {
 				CYLINDER_PROPERTY.coneColor = shapeColor;

 				updateObjectColorInCache(geoCache.cone);
 			} else if($('#select-object').val() === OBJECT_TYPE.FUNNEL) {
 				CYLINDER_PROPERTY.funnelColor = shapeColor;

 				updateObjectColorInCache(geoCache.funnel);
 			}
		}

		createShape(objectType, vec3(tX, tY, tZ), vec3(rX, rY, rZ), vec3(sX, sY, sZ));
	});

	$('#btn-clear-canvas').click(function(e) {
		clearCanvas();
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

	$("#brush-color").colorpicker({
        color: '#cc33ff',
        defaultPalette: 'web'
    });

    //update paint color
    $("#brush-color").on("change.color", function(e, color){
        shapeColor = hexToRGB(color);
    });
}

function initAxisGeometry() {
	var carpetXZ = new axisCarpet();

	axisCarpets.push(carpetXZ);
}

window.onload = function() {
	initDOM();
	initCanvas();
	initGL();
	initViewProjection();
	initAxisGeometry();
	render();
}

function render() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.clearColor(WORLD.worldColor[0], WORLD.worldColor[1], WORLD.worldColor[2], WORLD.worldColor[3]);
	
	eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
	/*eye = vec3(radius*Math.sin(theta)*Math.cos(phi), -radius*Math.cos(theta),
        radius*Math.sin(theta)*Math.sin(phi));*/
	
	initViewProjection();

    //draw axis
    axisCarpets.forEach(function(c) {
    	c.draw();
    });

	objectPool.forEach(function(o) {
		o.draw();
	});

	window.requestAnimFrame(render);
}