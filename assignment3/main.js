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
	worldColor: vec4(67 / 255, 70 / 255, 84 / 255) //vec4(50 / 255, 71 / 255, 64 / 255, 1.0)//vec4(0.0, 0.0, 0.0, 1.0)
};

var OBJECT_TYPE = {
	SPHERE: 'SPHERE',
	CONE: 'CONE',
	CYLINDER: 'CYLINDER'
};

var SPHERE_PROPERTY = {
	LONG_SUB_DIVISIONS: 32, //should be double of lat divs
	LAT_SUB_DIVISIONS: 16,

	thetaStart: 0,
	thetaEnd: Math.PI,
	phiStart: 0, 
	phiEnd: 2 * Math.PI,

	color: vec4(1.0, 1.0, 0.0, 1.0),
	wireframeColor: vec4(1.0, 0.0, 0.0, 1.0)
};

var CYLINDER_PROPERTY = {
	radialSegment: 16,
	heightSegment: 1,
	thetaStart: 0,
	thetaEnd: 2 * Math.PI,
	top: true,
	bottom: true,

	color: vec4(0.0, 0.0, 1.0, 1.0),
	coneColor: vec4(0.0, 1.0, 0.0, 1.0),
	coneWireframeColor: vec4(0.0, 0.0, 1.0, 1.0),
	wireframeColor: vec4(1.0, 0.0, 1.0, 1.0)
};

var canvas, 
	gl,
	objectPool = [],
	modelView,
	projection;

//prespective camera properties
var nearP = 0.3,
	farP = 100.0,
	aspect;
	fovy = 45.0;

//ortho graphic camera properties
var left = -5.0;
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
var theta  = 0.0;
var phi    = 0.0;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var eye = vec3(1.0, 5.0, radius);

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
	this.rotate = vec3(radians(rotate[0]), radians(rotate[1]), radians(rotate[2])) || vec3(0.0, 0.0, 0.0);
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

	gl.drawElements(gl.TRIANGLES, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.wireframeColorData), gl.STATIC_DRAW );
	gl.vertexAttribPointer(obj.shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(obj.shaderVariables.vColor);

	gl.drawElements(gl.LINE_STRIP, obj.buffer.idxData.length, gl.UNSIGNED_SHORT, 0);
}

//store vertices for future
function createSphereGeometry(radius, sphereProp) {
	/*var wireframeColors = [];

	for(var i = 0; i < vertices1.length; i++) {
		wireframeColors.push(sphereProp.wireframeColor);
	}

	return {
		vertices : vertices1,
		indices: indices1,
		colors: colors1,
		wireframeColors: wireframeColors
	}*/

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
				phi * totalPoints + theta,
				phi * totalPoints + theta + 1,
				(phi + 1) * totalPoints + theta
			); 

			//second triangle
			indices.push(
				(phi + 1) * totalPoints + theta + 1,
				phi * totalPoints + theta + 1,
				(phi + 1) * totalPoints + theta
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

function createCylinderGeometry(topRadius, bottomRadius, height, cylinderProp, top, bottom) {
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
			colors.push((top === false) ? cylinderProp.coneColor : cylinderProp.color);
			wireframeColors.push((top === false) ? cylinderProp.coneWireframeColor : cylinderProp.wireframeColor);
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
				(y + 1) * totalPoints + x,
				y * totalPoints + x
				
			);

			indices.push(
				y * totalPoints + (x + 1),
				(y + 1) * totalPoints + (x + 1),
				(y + 1) * totalPoints + x
				
			);
			
			/*indices.push(
				y * totalPoints + x,
				y * totalPoints + (x + 1),
				(y + 1) * totalPoints + x
			);

			indices.push(
				(y + 1) * totalPoints + x,
				y * totalPoints + (x + 1),
				(y + 1) * totalPoints + (x + 1)
			);*/
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

	var cylinderGeometry = createCylinderGeometry(this.topRadius, this.bottomRadius, this.height, CYLINDER_PROPERTY, top, bottom);

	shape.apply(this, [OBJECT_TYPE.CYLINDER, cylinderGeometry, translate, rotate, scale]);
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
	//perspective function problem
	//near and far swapped
	projection = perspective(fovy, aspect, farP, nearP);
	//projection = ortho(left, right, bottom, ytop, nearO, farO);
}

function createModel() {
	createShape(OBJECT_TYPE.SPHERE, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
	createShape(OBJECT_TYPE.CYLINDER, vec3(2.0, 0.0, 0.0), vec3(0.0, 0.0, 45.0), vec3(1.0, 1.0, 1.0));
	createShape(OBJECT_TYPE.CONE, vec3(-2.0, 0.0, 0.0), vec3(-30.0, 0.0, -45.0), vec3(1.0, 1.0, 1.0));

	//createShape(OBJECT_TYPE.CYLINDER, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));

	/*for(var i = -4; i < 5; i++) {
		createShape(OBJECT_TYPE.SPHERE, vec3(i, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(0.5, 0.5, 0.5));
		createShape(OBJECT_TYPE.CONE, vec3(i, 0.7, 0.0), vec3(0.0, 0.0, 0.0), vec3(0.3, 0.3, 0.3));
		createShape(OBJECT_TYPE.CYLINDER, vec3(i, -0.7, 0.0), vec3(0.0, 0.0, 0.0), vec3(0.2, 0.2, 0.2))
	}*/
}

window.onload = function() {
	initCanvas();
	initGL();
	initViewProjection();

	createModel();
	
	render();
}

function render() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.clearColor(WORLD.worldColor[0], WORLD.worldColor[1], WORLD.worldColor[2], WORLD.worldColor[3]);
	
	/*eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));*/

    initViewProjection();

	for(var i = 0, l = objectPool.length; i < l; i++) {
		objectPool[i].draw();
	}

	window.requestAnimFrame(render);
}