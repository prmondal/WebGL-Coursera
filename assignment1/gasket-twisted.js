"use strict";

var canvas;
var gl;

var points = [];

var NumTimesToSubdivide = 0;
var theta = 0.0;
var thetaLoc;
var SCALE = 0.5;
//var speed = 100;
var enable_wireframe = false;
var filled_enabled = false;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.

    var vertices = [
        vec2( -SCALE, -SCALE ),
        vec2(  0,  SCALE ),
        vec2(  SCALE, -SCALE )
    ];
    
    divideTriangle( vertices[0], vertices[1], vertices[2],
                    NumTimesToSubdivide);

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    //get theta from program
    thetaLoc = gl.getUniformLocation(program, "theta");

    //slider listener
    $("#steps-slider").change(function(e) {
        NumTimesToSubdivide = $(this).val();
        
        //redraw
        render();
    });

    //text listener
    $("#twist-text").keyup(function(e) {
        theta = radians($(this).val());
        
        //redraw
        render();
    });

    //checkbox listener
    $("#wireframe").change(function(e) {
        enable_wireframe = ($(this).is(":checked")) ? true : false;
        
        //redraw
        render();
    });

    $("#filled").change(function(e) {
        filled_enabled = ($(this).is(":checked")) ? true : false;
        
        //redraw
        render();
    });

    render();
};

function triangle( a, b, c )
{
    points.push( a, b, c );
}

function divideTriangle( a, b, c, count )
{

    // check for end of recursion

    if ( count == 0 ) {
        triangle( a, b, c );
    }
    else {

        //bisect the sides

        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var bc = mix( b, c, 0.5 );

        // three new triangles
        divideTriangle( a, ab, ac, count - 1);
        divideTriangle( c, ac, bc, count - 1);
        divideTriangle( b, bc, ab, count - 1);
        
        if(filled_enabled) divideTriangle( ab, bc, ac, count - 1);
    }
}

function render()
{
    //reset points
    points = [];

    var vertices = [
        vec2( -SCALE, -SCALE ),
        vec2(  0,  SCALE ),
        vec2(  SCALE, -SCALE )
    ];

    //divide traingle
    divideTriangle(vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);
    //theta += radians(10.0);

    gl.uniform1f(thetaLoc, theta);

    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    gl.clear( gl.COLOR_BUFFER_BIT );
    
    if(enable_wireframe) {
        for (var i = 0; i < points.length; i += 3) {
            gl.drawArrays( gl.LINE_LOOP, i, 3);
        }
    } else {
        gl.drawArrays( gl.TRIANGLES, 0, points.length );
    }
    
    /*setTimeout(
        function () {requestAnimFrame( render );},
        speed
    );*/
}
