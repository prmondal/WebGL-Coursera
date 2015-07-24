
var canvas;
var gl;

var maxNumVertices = 100000;
var curveIdx = 0;
var numberOfVerticesCurve = [0];
var curveStart = [0];

var mouseUp = false, 
    mouseDown = false, 
    mouseMove = false;

var curveStarted = false;

var point, index = 0, lastIndex = 0;

var paintColor = vec2(1.0, 1.0, 0.0, 1.0);
var lineWidth = 2.0;

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    canvas.addEventListener("mousedown", function(e) {
        mouseDown = true;
        mouseUp = false;
        mouseMove = false;

        //lastIndex = index;
    });

    canvas.addEventListener("mouseup", function(e) {
        mouseDown = false;
        mouseUp = true;
        mouseMove = false;

        //curve ended
        if(curveStarted) {
            curveStarted = false;

            curveIdx++;
            numberOfVerticesCurve[curveIdx] = 0;
            curveStart[curveIdx] = index;
        }
    });

    canvas.addEventListener("mousemove", function(event){
        mouseMove = true;
        
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
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(paintColor));

            numberOfVerticesCurve[curveIdx]++;

            index++;

            //console.debug('MouseX: ' + event.clientX + ', MouseY: ' + event.clientY);
        }
    } );

    render();
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
