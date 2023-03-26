'use strict';
let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let parabolaValue = 0.0;
let video

const scale = 8;

const calcParabola = () => {
    let TParam = Math.sin(parabolaValue) * 3.6;
    return [TParam * scale, 9 * scale, (-10 + (TParam * TParam)) * scale];
}

// Init data for calculation figure coordinates
const generalColor = [0.5,0.9,0.2,1];

let r = 1;
let c = 2;
let d = 1;
let teta = Math.PI/2;
let a0 = 0;


// Functions for calculation X,Y,Z coordinates for surface
function getX (t,a, param = 15) {
    return ((r * Math.cos(a) - (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) * Math.sin(a)) / param) * scale;
}
function getY (t,a, param = 15) {
    return ((r * Math.sin(a) + (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) * Math.cos(a)) / param) * scale;
}
function getZ (t, height = 15) {
    return (2*(t * Math.sin(teta) + c * Math.sin(d * t) * Math.cos(teta)) / (-height)) * scale;
}

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function({ vertexList, normalsList }) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexList), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsList), gl.STREAM_DRAW);

        this.count = vertexList.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormalVertex, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormalVertex);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
        gl.uniform4fv(shProgram.iColor, [0.,0.,0.,1]);
        gl.lineWidth(1);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iNormalVertex = -1;

    this.iWorldMatrix = -1;
    this.iWorldInverseTranspose = -1;

    this.iLightWorldPosition = -1;
    this.iLightDirection = -1;

    this.iViewWorldPosition = -1;

    this.iLimit = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above draw function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    let D = document;
    let spans = D.getElementsByClassName("slider-value");

    gl.clearColor(1, 1, 1, 1); // color of bg
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    let conv, // convergence
        eyes, // eye separation
        ratio, // aspect ratio
        fov; // field of view
    conv = 1000.0;
    conv = D.getElementById("conv").value;
    spans[3].innerHTML=conv;
    eyes = 70.0;
    eyes = D.getElementById("eyes").value;
    spans[0].innerHTML=eyes;
    ratio = 1.0;
    fov = Math.PI / 4;
    fov = D.getElementById("fov").value;
    spans[1].innerHTML=fov;
    let top, bottom, left, right, near, far;
    near = 10.0;
    near = D.getElementById("near").value-0.0;
    spans[2].innerHTML=near;
    far = 1000.0;

    top = near * Math.tan(fov / 2.0);
    bottom = -top;

    let a = ratio * Math.tan(fov / 2.0) * conv;

    let b = a - eyes / 2;
    let c = a + eyes / 2;

    left = -b * near / conv;
    right = c * near / conv;

    let projectionLeft = m4.orthographic(left, right, bottom, top, near, far);

    left = -c * near / conv;
    right = b * near / conv;

    let projectionRight = m4.orthographic(left, right, bottom, top, near, far);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0.0, 0, -20);
    let translateToLeft = m4.translation(-0.03, 0, -20);
    let translateToRight = m4.translation(0.03, 0, -20);

    let matAccum = m4.multiply(rotateToPointZero, modelView);

    let matAccum1 = m4.multiply(translateToPointZero, matAccum);
    let matAccumLeft = m4.multiply(translateToLeft, matAccum1);
    let matAccumRight = m4.multiply(translateToRight, matAccum1);

    gl.enable(gl.CULL_FACE);

    gl.uniform4fv(shProgram.iColor, generalColor );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
    gl.colorMask(true, false, false, false);
    surface.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniform4fv(shProgram.iColor, generalColor );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
    gl.colorMask(false, true, true, false);


    surface.Draw();
    gl.colorMask(true, true, true, true);
    window.requestAnimationFrame(draw);
    // console.log(video.srcObject);
    // gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,video.srcObject);
}

function CreateSurfaceData() {
    let vertexList = [];
    let normalsList = [];

    let deltaT = 0.005;
    let deltaA = 0.005;

    const step = .5

    for (let t = -15; t <= 15; t += step) {
        for (let a = 0; a <= 15; a += step) {
            const tNext = t + step;
            vertexList.push(getX(t, a, 10), getY(t, a, 10), getZ(t, 20));
            vertexList.push(getX(tNext, a, 10), getY(tNext, a, 10), getZ(tNext, 20));

            // Normals
            let result = m4.cross(calcDerT(t, a, deltaT), calcDerA(t, a, deltaA));
            normalsList.push(result[0], result[1], result[2])

            result = m4.cross(calcDerT(tNext, a, deltaT), calcDerA(tNext, a, deltaA));
            normalsList.push(result[0], result[1], result[2]);
        }
    }

    return { vertexList, normalsList };
}

const calcDerT = (t, a, tDelta) => ([
    (getX(t + tDelta, a, 10) - getX(t, a, 10)) / deg2rad(tDelta),
    (getY(t + tDelta, a, 10) - getY(t, a, 10)) / deg2rad(tDelta),
    (getZ(t + tDelta, a) - getZ(t, a)) / deg2rad(tDelta),
])

const calcDerA = (t, a, aDelta) => ([
    (getX(t, a + aDelta, 10) - getX(t, a, 10)) / deg2rad(aDelta),
    (getY(t, a + aDelta, 10) - getY(t, a, 10)) / deg2rad(aDelta),
    (getZ(t, a + aDelta) - getZ(t, a)) / deg2rad(aDelta),
])


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix          = gl.getUniformLocation(prog, "ProjectionMatrix");
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    video = document.createElement('video');
    //video.autoplay = true;

    spaceball = new TrackballRotator(canvas, draw, 0);

    let constraints = {video: true}
    //navigator.mediaDevices.getUserMedia(constraints).then(stream => {video.srcObject = stream; video.play()});
    // window.setInterval(() => {
    //     draw()
    // }, 1000 / 10);
    draw();
}