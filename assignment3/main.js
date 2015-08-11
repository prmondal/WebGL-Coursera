/*var vertices1 = [
   vec2(-0.5, 0.5),
   vec2(-0.5, -0.5),
   vec2(0.5, -0.5),
   vec2(0.5, 0.5)
];

var indices1 = [
	0, 1, 2,
	0, 2, 3
];

var colors1 = [
	vec4(1.0,0.0,0.0,1.0),
	vec4(0.0,1.0,0.0,1.0),
	vec4(0.0,0.0,1.0,1.0),
	vec4(1.0,0.0,1.0,1.0)
];

var vertices2 = [
    vec3( -9.5, -0.5,  0.5 ),
    vec3( -0.5,  0.5,  0.5 ),
    vec3(  0.5,  0.5,  0.5 ),
    vec3(  0.5, -0.5,  0.5 ),
    vec3( -0.5, -0.5, -0.5 ),
    vec3( -0.5,  0.5, -0.5 ),
    vec3(  0.5,  0.5, -0.5 ),
    vec3(  0.5, -0.5, -0.5 )
];

var colors2 = [
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

var indices2 = [
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

var sphereColor = vec4(1.0, 1.0, 1.0, 1.0);
var sphereRadius = 1;
var LONG_SUB_DIVISIONS = 16;
var LAT_SUB_DIVISIONS = 16;

var OBJECT_TYPE = {
	SPHERE: 'SPHERE',
	CONE: 'CONE',
	CYLINDER: 'CYLINDER'
};

var canvas, 
	gl,
	objectPool = [],
	modelView,
	projection;

var nearP = 0.3,
	farP = 1000.0,
	aspect;
	fovy = 45.0;

var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;
var near = -10;
var far = 10;

/*const at = vec3(0.0, -1.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var cameraDistance = 1.0;

var eye = vec3(0.0, 0.5, cameraDistance);*/

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var cameraDistance = 5.0;

var eye = vec3(0.0, 0.0, cameraDistance);

var numVertCoordinate = 3;

//constructor to create an object
//type property defines the object type
function shape(type, vertices, indices, colors, translate, rotate, scale) {
	this.buffer = {
		verId: gl.createBuffer(),
		verData: vertices,

		idxId: gl.createBuffer(),
		idxData: indices, 

		colId: gl.createBuffer(),
		colData: colors || [
			vec4(1.0,0.0,0.0,1.0),
			vec4(1.0,0.0,0.0,1.0),
			vec4(1.0,0.0,0.0,1.0),
			vec4(1.0,0.0,0.0,1.0)
		]
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

function initShaderForShapes() {
	var obj = this;

	//initialize shader variables
	gl.useProgram(obj.program);

	//set model view and projection matrix which are same for each object
	gl.uniformMatrix4fv(obj.shaderVariables.modelView, false, flatten(modelView));
	gl.uniformMatrix4fv(obj.shaderVariables.projection, false, flatten(projection));

	//bind buffer
	//indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.buffer.idxId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(obj.buffer.idxData), gl.STATIC_DRAW);

    //vertices
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.verData), gl.STATIC_DRAW);

    //color
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.colData), gl.STATIC_DRAW);

    //enable vertex coordinate data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.vertexAttribPointer(obj.shaderVariables.vPosition, numVertCoordinate, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj.shaderVariables.vPosition);

    //enable vertex color data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
    gl.vertexAttribPointer(obj.shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj.shaderVariables.vColor);

    //send transformation vectors
    gl.uniform3fv(obj.shaderVariables.translate, flatten(obj.translate));
    gl.uniform3fv(obj.shaderVariables.rotate, flatten(obj.rotate));
    gl.uniform3fv(obj.shaderVariables.scale, flatten(obj.scale));
}

function createSphereGeometry(radius) {
	var sphereGeometry = {};

	var vertices = [],
		indices = [],
		colors = [];
	
	var thetaStart = 0, thetaEnd = Math.PI,
		phiStart = 0, phiEnd = 2 * Math.PI;

	var thetaRange = thetaEnd - thetaStart,
		phiRange = phiEnd - phiStart;

	for(var phi = 0; phi <= LONG_SUB_DIVISIONS; phi++) {
		for(var theta = 0; theta <= LAT_SUB_DIVISIONS; theta++) {
			var t = thetaStart + theta * (thetaRange / LAT_SUB_DIVISIONS),
				p = phiStart + phi * (phiRange / LONG_SUB_DIVISIONS);

			var cosTheta = Math.cos(t),
				sinTheta = Math.sin(t),
				cosPhi = Math.cos(p),
				sinPhi = Math.sin(p);

			var x = radius * cosTheta * sinPhi,
				y = radius * cosPhi,
				z = radius * sinTheta * sinPhi;

			vertices.push(vec3(x, y, z));
			colors.push(vec4(1.0, 0.0, 0.0, 1.0));
		}
	}

	//calculate indices
	for(var theta = 0; theta < LAT_SUB_DIVISIONS; theta++) {
		for(var phi = 0; phi < LONG_SUB_DIVISIONS; phi++) {
			var totalPoints = (LAT_SUB_DIVISIONS + 1);

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

	sphereGeometry.vertices = vertices;
	sphereGeometry.indices = indices;
	sphereGeometry.colors = colors;

	return sphereGeometry;
}

function sphere(translate, rotate, scale, radius) {
	this.radius = radius || 1;

	/*var vertices = createSphereVertices(this.radius);
	var indices = createIndices();*/
	var sphereGeometry = createSphereGeometry(this.radius);

	shape.apply(this, [OBJECT_TYPE.SPHERE, sphereGeometry.vertices, sphereGeometry.indices, sphereGeometry.colors, translate, rotate, scale]);
	//shape.apply(this, [OBJECT_TYPE.SPHERE, vertices, indices, colors, translate, rotate, scale]);
	//shape.apply(this, [OBJECT_TYPE.SPHERE, vertices1, indices1, color, translate, rotate, scale]);
	
	//set shader variables
	initShaderForShapes.call(this);
}

//utility method to create shape and push it to the object pool
function createShape(type, translate, rotate, scale) {
	var obj;

	switch(type) {
		case OBJECT_TYPE.SPHERE:
			obj = new sphere(translate, rotate, scale, sphereRadius);

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
	gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
    
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);
}

function initViewProjection() {
	modelView = lookAt(eye, at, up);
	projection = perspective(fovy, aspect, nearP, farP);
	//projection = ortho(left, right, bottom, ytop, near, far);
}

function createModel() {
	createShape('SPHERE', vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
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
	gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
	
	for(var i = 0, l = objectPool.length; i < l; i++) {
		gl.useProgram(objectPool[i].program);

		gl.bindBuffer(gl.ARRAY_BUFFER, objectPool[i].buffer.verId);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(objectPool[i].buffer.verData), gl.STATIC_DRAW );
		gl.vertexAttribPointer(objectPool[i].shaderVariables.vPosition, numVertCoordinate, gl.FLOAT, false, 0, 0);
    	gl.enableVertexAttribArray(objectPool[i].shaderVariables.vPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, objectPool[i].buffer.colId);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(objectPool[i].buffer.colData), gl.STATIC_DRAW );
		gl.vertexAttribPointer(objectPool[i].shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
    	gl.enableVertexAttribArray(objectPool[i].shaderVariables.vColor);

    	gl.drawElements(gl.TRIANGLES, objectPool[i].buffer.idxData.length, gl.UNSIGNED_BYTE, 0);
    	//gl.drawElements(gl.LINE_LOOP, objectPool[i].buffer.idxData.length, gl.UNSIGNED_BYTE, 0);

    	//gl.drawArrays(gl.TRIANGLES, 0, objectPool[i].buffer.verData.length);
		//for(var j = 0; j < objectPool[i].buffer.verData.length; j += 3) {
			//gl.drawArrays(gl.TRIANGLES, 0, 3);
			//gl.drawArrays( gl.LINE_LOOP, 0, 3);
		//}
	}

	window.requestAnimFrame(render);
}