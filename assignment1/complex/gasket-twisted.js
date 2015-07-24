"use strict";

var canvas;
var gl;

var points = [];
var quadVerticesLen = 0;

var verticesQuad;

var triangleVertices;

var triangle1Vertices;
var triangle2Vertices;
var triangle3Vertices;
var triangle4Vertices;

var NumTimesToSubdivide = 0;
var theta = 0.0;
var thetaLoc;
var wireframeLoc;
var SCALE = 0.5;
var SCALE_STAR = 0.25;

var speed = 100;
var animate = false;
var enableWireframe = false;
var sierpinskiEnabled = false;

var shapeTri = true;
var shapeSquare = false;
var shapeStar = false;

function initTriangle() {
    triangleVertices = [
        vec2( -SCALE, -SCALE ),
        vec2(  0,  SCALE ),
        vec2(  SCALE, -SCALE )
    ];
}

function initSquare() {
    verticesQuad = [
        vec2(-SCALE, -SCALE),
        vec2(-SCALE, SCALE),
        vec2(SCALE, SCALE),
        vec2(SCALE, -SCALE)
    ];
}

function initStar() {
    verticesQuad = [
        vec2(-SCALE_STAR, -SCALE_STAR),
        vec2(-SCALE_STAR, SCALE_STAR),
        vec2(SCALE_STAR, SCALE_STAR),
        vec2(SCALE_STAR, -SCALE_STAR)
    ];

    var V = 1 + Math.sqrt(3);

    triangle1Vertices = [
        vec2(-SCALE_STAR, SCALE_STAR),
        vec2(0, SCALE_STAR * V),
        vec2(SCALE_STAR, SCALE_STAR)
    ];

    triangle2Vertices = [
        vec2(SCALE_STAR, SCALE_STAR),
        vec2(SCALE_STAR * V, 0),
        vec2(SCALE_STAR, -SCALE_STAR)
    ];

    triangle3Vertices = [
        vec2(-SCALE_STAR, -SCALE_STAR),
        vec2(0, -SCALE_STAR * V),
        vec2(SCALE_STAR, -SCALE_STAR)
    ];

    triangle4Vertices = [
        vec2(-SCALE_STAR, -SCALE_STAR),
        vec2(-SCALE_STAR * V, 0),
        vec2(-SCALE_STAR, SCALE_STAR)
    ];
}

function resetShapeFlag() {
    shapeTri = shapeSquare = shapeStar = false;
}

function reset() {
    resetShapeFlag();

    theta = 0;
    speed = 100;
    animate = false;
    shapeTri = true;
    enableWireframe = false;
    NumTimesToSubdivide = 0;

    $('#animate').attr('checked', false);
    $('#wireframe').attr('checked', false);
    $('#steps-slider').attr('value', 0);
    $("#twist-text").attr('value', 0);
    $('#select-shape').attr('value', 'Triangle');

    render();
}

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    initTriangle();
    divideTriangle( triangleVertices[0], triangleVertices[1], triangleVertices[2], NumTimesToSubdivide);

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

    //get wireframe variable
    wireframeLoc = gl.getUniformLocation(program, "wireframe");

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
        enableWireframe = ($(this).is(":checked")) ? true : false;
        
        //redraw
        render();
    });

    $("#animate").change(function(e) {
        animate = ($(this).is(":checked")) ? true : false;
        render();
    });

    $("#sierpinsky").change(function(e) {
        sierpinskiEnabled = ($(this).is(":checked")) ? true : false;
        render();
    });

    $("#reset-btn").click(function(e) {
        reset();
    });

    //select shape listener
    $('#select-shape').change(function(){
        var s = $(this).val();

        //reset flag
        resetShapeFlag();

        if(s === 'Triangle') {
            //enable sierpinsky
            $("#sierpinsky").attr('disabled', false);

            shapeTri = true;
        } else if(s === 'Square') {
            //enable sierpinsky
            $("#sierpinsky").attr('disabled', false);

            shapeSquare = true;

            //disable sierpinsky
            $("#sierpinsky").attr('disabled', true);
        } else if(s === 'Star') {
            shapeStar = true;
        }

        render();
    });

    render();
};
//triangle
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
        
        if(!sierpinskiEnabled) divideTriangle( ab, bc, ac, count - 1);
    }
}

//square
function quad( a, b, c, d )
{
    points.push( a, b, c, d );
}

function divideQuad( a, b, c, d, count )
{

    // check for end of recursion

    if ( count == 0 ) {
        quad( a, b, c, d );
    }
    else {

        //bisect the sides

        var ab = mix( a, b, 0.5 );
        var bc = mix( b, c, 0.5 );
        var cd = mix( c, d, 0.5 );
        var da = mix( d, a, 0.5 );
        var mid = mix(cd, ab, 0.5);

        divideQuad( a, ab, mid, da, count - 1);
        divideQuad( da, mid, cd, d, count - 1);
        divideQuad( ab, b, bc, mid, count - 1);
        divideQuad( mid, bc, c, cd, count - 1);
    }
}

//render tri
function renderTri() {
    initTriangle();

    divideTriangle( triangleVertices[0], triangleVertices[1], triangleVertices[2], NumTimesToSubdivide);
}

//render square
function renderSquare() {
    initSquare();

    divideQuad( verticesQuad[0], verticesQuad[1], verticesQuad[2], verticesQuad[3], NumTimesToSubdivide);
}

//render star
function renderStar() {
    initStar();

    divideQuad( verticesQuad[0], verticesQuad[1], verticesQuad[2], verticesQuad[3], NumTimesToSubdivide);

    quadVerticesLen = points.length;

    divideTriangle( triangle1Vertices[0], triangle1Vertices[1], triangle1Vertices[2], NumTimesToSubdivide);
    divideTriangle( triangle2Vertices[0], triangle2Vertices[1], triangle2Vertices[2], NumTimesToSubdivide);
    divideTriangle( triangle3Vertices[0], triangle3Vertices[1], triangle3Vertices[2], NumTimesToSubdivide);
    divideTriangle( triangle4Vertices[0], triangle4Vertices[1], triangle4Vertices[2], NumTimesToSubdivide);
}

function render()
{
    points = [];

    if(shapeTri) {
        renderTri();
    } else if(shapeSquare) {
        renderSquare();
    } else if(shapeStar) {
        renderStar();
    }
    
    theta = (animate) ? theta + radians(10.0) : theta;

    gl.uniform1f(thetaLoc, theta);
    gl.uniform1i(wireframeLoc, (enableWireframe) ? 1 : 0);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    if(enableWireframe) {
        if(shapeSquare) {
            for (var i = 0; i < points.length; i += 4) {
                gl.drawArrays( gl.LINE_LOOP, i, 4);
            }
        } else if(shapeTri) {
            for (var i = 0; i < points.length; i += 3) {
                gl.drawArrays( gl.LINE_LOOP, i, 3);
            }
        } else if(shapeStar) {
            //middle square
            for (var i = 0; i < quadVerticesLen; i += 4) {
                gl.drawArrays( gl.LINE_LOOP, i, 4);
            }

            //triangles
            for (var i = quadVerticesLen; i < points.length; i += 3) {
                gl.drawArrays( gl.LINE_LOOP, i, 3);
            }
        }
    } else {
        if(shapeSquare) {
            for (var i = 0; i < points.length; i += 4) {
                gl.drawArrays( gl.TRIANGLE_FAN, i, 4);
            }
        } else if(shapeTri) {
            gl.drawArrays( gl.TRIANGLES, 0, points.length );
        } else if(shapeStar) {
            //middle square
            for (var i = 0; i < quadVerticesLen; i += 4) {
                gl.drawArrays( gl.TRIANGLE_FAN, i, 4);
            }

            //side wings
            gl.drawArrays( gl.TRIANGLES, quadVerticesLen, points.length - quadVerticesLen );
        }
    }

    if(animate) {
        setTimeout(
            function () {
                requestAnimFrame( render );
            }, 
            speed
        );
    }
}
