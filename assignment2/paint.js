var canvas;
var gl;

//curve properties
var maxNumVertices = 100000;
var curveIdx = 0;
var numberOfVerticesCurve = [0];
var curveStart = [0];
var curveStarted = false;

var point, index = 0;

var mouseDown = false;

//brush
var defaultBrushColor = '#00ff00';
var brushColor;

var lineWidth = 1;

//canvas
var defaultCanvasBackgroundColor = '#000000';
var canvasBackgroundColor;

//gl
var vBuffer, cBuffer, program;

/*var canvasXPos = window.innerWidth,
    canvasYPos = 0,
    canvasWidth = 512,
    canvasHeight = 512;*/

//convert from HEX color value to RGB
function hexToRGB(hex) {
    hex = hex.substr(1);
    
    var rgb = parseInt(hex, 16);

    var r = (rgb >> 16) & 0xFF;
    var g = (rgb >> 8) & 0xFF;
    var b = rgb & 0xFF;
    
    return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
}

function clearCanvas() {
    //delete old buffers
    gl.deleteBuffer(vBuffer);
    gl.deleteBuffer(cBuffer);

    //initialize buffers
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    //reset
    index = 0;
    curveIdx = 0;
    numberOfVerticesCurve = [0];
    curveStart = [0];
}

function initDOM() {
    //initialize color palette
    $("#brush-color").colorpicker({
        //showOn: "button",
        color: defaultBrushColor,
        defaultPalette: 'web'
    });

    //update paint color
    $("#brush-color").on("change.color", function(e, color){
        brushColor = hexToRGB(color);
    });

    $("#background-color").colorpicker({
        //showOn: "button",
        color: defaultCanvasBackgroundColor,
        defaultPalette: 'web'
    });

    //update paint color
    $("#background-color").on("change.color", function(e, color){
        canvasBackgroundColor = hexToRGB(color);

        gl.clearColor( canvasBackgroundColor[0], canvasBackgroundColor[1], canvasBackgroundColor[2], canvasBackgroundColor[3]);
    });

    //slider listener
    /*$("#slider-line-width").change(function(e) {
        lineWidth = $(this).val();
    });*/

    $('#select-line-width').change(function(){
        lineWidth = $(this).val();
    });

    $("#clear-canvas").click(function(e) {
        clearCanvas();
    });

    canvas = document.getElementById( "gl-canvas" );
}

function initCanvas() {
    clearCanvas();

    canvas.addEventListener("mousedown", function(e) {
        mouseDown = true;
    });

    canvas.addEventListener("mouseup", function(e) {
        mouseDown = false;

        //curve ended
        if(curveStarted) {
            curveStarted = false;

            curveIdx++;
            numberOfVerticesCurve[curveIdx] = 0;
            curveStart[curveIdx] = index;
        }
    });

    canvas.addEventListener("mousemove", function(event){
        //start drawing
        if(mouseDown) {
            //console.debug('Mouse State: Pressed and Moving.');
            curveStarted = true;

            //insert vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            
            point = vec2(2 * event.clientX / canvas.width - 1, 2 * (canvas.height - event.clientY) / canvas.height - 1);

            gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(point));

            //add color to vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(brushColor));

            numberOfVerticesCurve[curveIdx]++;

            index++;

            //console.debug('MouseX: ' + event.clientX + ', MouseY: ' + event.clientY);
        }
    } );

    render();
}

function initPainConfig() {
    //store paint default color
    brushColor = hexToRGB(defaultBrushColor);

    //store background default color
    canvasBackgroundColor = hexToRGB(defaultCanvasBackgroundColor);
}

function initGL() {
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );

    gl.clearColor( canvasBackgroundColor[0], canvasBackgroundColor[1], canvasBackgroundColor[2], canvasBackgroundColor[3]);
    gl.clear( gl.COLOR_BUFFER_BIT );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
}

window.onload = function init() {
    initPainConfig();

    initDOM();
    
    /*canvas.style.position = 'absolute';
    canvas.style.top = (window.innerHeight / 2 - canvasHeight / 2) + 'px';
    canvas.style.left = (window.innerWidth / 2 - canvasWidth / 2) + 'px';*/

    initGL();

    initCanvas();
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    //set line width
    gl.lineWidth(lineWidth);

    for(var i = 0; i <= curveIdx; i++) {
        gl.drawArrays(gl.LINE_STRIP, curveStart[i], numberOfVerticesCurve[i]);
    }

    window.requestAnimFrame(render);
}
