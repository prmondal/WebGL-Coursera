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

var near = 0.3,
	far = 10.0,
	aspect;
	fovy = 45.0;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var cameraDistance = 4.0;

var eye = vec3(0.0, 0.0, cameraDistance);

var vertices1 = [
    vec2(-1.0, -1.0),
    vec2(0,  1.0),
    vec2(1.0, -1.0)
];

var colors1 = [
	vec4(1.0,0.0,0.0,1.0),
	vec4(0.0,1.0,0.0,1.0),
	vec4(0.0,0.0,1.0,1.0)
];

var colors2 = [
	vec4(0.0,0.0,1.0,1.0),
	vec4(0.0,0.0,1.0,1.0),
	vec4(0.0,0.0,1.0,1.0)
];

var vertices2 = [
    vec2(-0.5, -0.5),
    vec2(0.0,  0.5),
    vec2(0.5, -0.5)
];

//constructor to create an object
//type property defines the object type
function shape(type, vertices, colors, translate, rotate, scale) {
	this.buffer = {
		verId: gl.createBuffer(),
		verData: vertices,
		colId: gl.createBuffer(),
		colData: colors || [
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
	//vertices
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.verData), gl.STATIC_DRAW);

    //color
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.colId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.buffer.colData), gl.STATIC_DRAW);

    //enable vertex coordinate data
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer.verId);
    gl.vertexAttribPointer(obj.shaderVariables.vPosition, 2, gl.FLOAT, false, 0, 0);
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

function sphere(vertices, colors, translate, rotate, scale, radius) {
	shape.apply(this, [OBJECT_TYPE.SPHERE, vertices, colors, translate, rotate, scale]);
	this.radius = radius;

	//set shader variables
	initShaderForShapes.call(this);
}

//utility method to create shape and push it to the object pool
function createShape(type, vertices, colors, translate, rotate, scale) {
	var obj;

	switch(type) {
		case OBJECT_TYPE.SPHERE:
			obj = new sphere(vertices, colors, translate, rotate, scale, 10);

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
	projection = perspective(fovy, aspect, near, far);
}

function createModel() {
	createShape('SPHERE', vertices1, colors1, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
	createShape('SPHERE', vertices2, colors2, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 180.0), vec3(1.0, 1.0, 1.0));
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
		gl.vertexAttribPointer(objectPool[i].shaderVariables.vPosition, 2, gl.FLOAT, false, 0, 0);
    	gl.enableVertexAttribArray(objectPool[i].shaderVariables.vPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, objectPool[i].buffer.colId);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(objectPool[i].buffer.colData), gl.STATIC_DRAW );
		gl.vertexAttribPointer(objectPool[i].shaderVariables.vColor, 4, gl.FLOAT, false, 0, 0);
    	gl.enableVertexAttribArray(objectPool[i].shaderVariables.vColor);

    	gl.drawArrays(gl.TRIANGLES, 0, objectPool[i].buffer.verData.length);
		//gl.drawArrays( gl.LINE_LOOP, 0, 3);
	}

	window.requestAnimFrame(render);
}