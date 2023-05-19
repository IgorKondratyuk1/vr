'use strict';
let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let video, videoTrack, webcamTexture, background;

// Init data for calculation figure coordinates
let scale = 0.4;
let r = 1;
let c = 2;
let d = 1;
let teta = Math.PI/2;
let a0 = 0;

// Device Rotation Data
var alpha = 0;
var beta = 0;
var gamma = 0;
var degtorad = Math.PI / 180; // Degree-to-Radian conversion

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

function getRotationMatrix(alpha, beta, gamma) {
    var _x = beta  ? beta  * degtorad : 0; // beta value
    var _y = gamma ? gamma * degtorad : 0; // gamma value
    var _z = alpha ? alpha * degtorad : 0; // alpha value

    var cX = Math.cos( _x );
    var cY = Math.cos( _y );
    var cZ = Math.cos( _z );
    var sX = Math.sin( _x );
    var sY = Math.sin( _y );
    var sZ = Math.sin( _z );

    //
    // ZXY rotation matrix construction.
    //

    var m11 = cZ * cY - sZ * sX * sY;
    var m12 = - cX * sZ;
    var m13 = cY * sZ * sX + cZ * sY;

    var m21 = cY * sZ + cZ * sX * sY;
    var m22 = cZ * cX;
    var m23 = sZ * sY - cZ * cY * sX;

    var m31 = - cX * sY;
    var m32 = sX;
    var m33 = cX * cY;

    return [
        m11, m12, m13, 0,
        m21, m22, m23, 0,
        m31, m32, m33, 0,
        0,   0,   0,   1
    ];
}


// Constructor
function SurfaceModel(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

function BackgroundModel(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferDataWithTexture = function (vertices, texture) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texture), gl.STREAM_DRAW);

        gl.enableVertexAttribArray(shProgram.iTextureCoords);
        gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

        this.count = vertices.length / 3;
    }

    this.DrawBG = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTextureCoords);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
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

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above draw function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Get the view matrix from the SimpleRotator object.*/
    //let modelView = spaceball.getViewMatrix();
    let modelView = getRotationMatrix(alpha, beta, gamma);

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0);
    let translateToPointZero = m4.translation(0,0,-10);


    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */

    // Default values
    let convergence = 100;          // Convergence
    let eyeSeparation = 0.2;        // Eye Separation
    let aspectRatio = 1.5;          // Aspect Ratio
    let fieldOfView = Math.PI / 3;  // FOV along Y in degrees
    let nearClippingDistance = 9;   // Near Clipping Distance
    let farClippingDistance = 12.0; // Far Clipping Distance

    fieldOfView = Number(document.getElementById('fieldOfView').value);
    convergence = Number(document.getElementById('convergence').value);
    eyeSeparation = Number(document.getElementById('eyeSeparation').value);
    nearClippingDistance = Number(document.getElementById('nearClippingDistance').value);


    let defaultMatr = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 1, 1]);

    // Using only for drawing surface with webcam background
    // let projection = m4.orthographic(0, 1, 0, 1, -1, 1);
    // gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, defaultMatr);
    // gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);

    // gl.texImage2D(
    //     gl.TEXTURE_2D,
    //     0,
    //     gl.RGBA,
    //     gl.RGBA,
    //     gl.UNSIGNED_BYTE,
    //     video
    // );
    // background.DrawBG();
    gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);


    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, defaultMatr);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, defaultMatr);

    let translateLeftEye = m4.translation(-eyeSeparation / 2, 0, 0);
    let translateRightEye = m4.translation(eyeSeparation / 2, 0, 0);

    let matAccum = m4.multiply(rotateToPointZero, modelView)
    let matAccumLR = m4.multiply(translateLeftEye, matAccum)
    let matAccumZero = m4.multiply(translateToPointZero, matAccumLR)
    let matrixLeftFrustum = ApplyLeftFrustum(convergence, eyeSeparation, aspectRatio, fieldOfView, nearClippingDistance, farClippingDistance)

    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrixLeftFrustum)
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumZero)
    gl.colorMask(true, false, false, false)
    surface.Draw()
    gl.clear(gl.DEPTH_BUFFER_BIT)

    let matrixRightFrustum = ApplyRightFrustum(convergence, eyeSeparation, aspectRatio, fieldOfView, nearClippingDistance, farClippingDistance);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrixRightFrustum)
    matAccumLR = m4.multiply(translateRightEye, matAccum)
    matAccumZero = m4.multiply(translateToPointZero, matAccumLR)


    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumZero)
    gl.colorMask(false, true, true, false)

    surface.Draw()
    gl.colorMask(true, true, true, true)
}

function CreateSurfaceData() {
    let vertexList = [];
    const step = 0.5

    for (let t = -15; t <= 15; t += step) {
        for (let a = 0; a <= 15; a += step) {
            const tNext = t + step;
            vertexList.push(getX(t, a, 10), getY(t, a, 10), getZ(t, 20));
            vertexList.push(getX(tNext, a, 10), getY(tNext, a, 10), getZ(tNext, 20));
        }
    }

    return vertexList;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    //shProgram.iColor = gl.getUniformLocation(prog, "color");

    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");

    shProgram.iNormal = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMat');
    shProgram.iColor = gl.getUniformLocation(prog, 'colorU');

    shProgram.iTextureCoords = gl.getAttribLocation(prog, 'textureCoords');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');


    surface = new SurfaceModel('Surface');
    surface.BufferData(CreateSurfaceData());

    // background = new BackgroundModel('Background');
    // background.BufferDataWithTexture(
    //     [
    //         0,0,0,
    //         1,0,0,
    //         1,1,0,
    //         1,1,0,
    //         0,1,0,
    //         0,0,0],
    //     [
    //         1,1,0,
    //         1,0,0,
    //         0,0,1,
    //         0,1,1]
    // );

    gl.enable(gl.DEPTH_TEST);
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
async function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }

        //await configCamVideo();
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

    spaceball = new TrackballRotator(canvas, draw, 0);
    startDeviceOrientation();
    window.setInterval(() => draw(), 1000 / 15);
}

function ApplyLeftFrustum(convergence, eyeSeparation, aspectRatio, fieldOfView, nearClippingDistance, farClippingDistance) {
    let a = aspectRatio * Math.tan(fieldOfView / 2) * convergence;
    let b = a - eyeSeparation / 2;
    let c = a + eyeSeparation / 2;

    let top = nearClippingDistance * Math.tan(fieldOfView / 2);
    let bottom = -top;
    let left = (-b * nearClippingDistance) / convergence;
    let right = (c * nearClippingDistance) / convergence;

    // Create and return a perspective projection matrix
    return m4.frustum(left, right, bottom, top, nearClippingDistance, farClippingDistance)
}

function ApplyRightFrustum(convergence, eyeSeparation, aspectRatio, fieldOfView, nearClippingDistance, farClippingDistance) {
    let a = aspectRatio * Math.tan(fieldOfView / 2) * convergence;
    let b = a - eyeSeparation / 2;
    let c = a + eyeSeparation / 2;

    let top = nearClippingDistance * Math.tan(fieldOfView / 2);
    let bottom = -top;
    let left = (-c * nearClippingDistance) / convergence;
    let right = (b * nearClippingDistance) / convergence;

    // Create and return a perspective projection matrix
    return m4.frustum(left, right, bottom, top, nearClippingDistance, farClippingDistance)
}

async function configCamVideo() {
    video = document.createElement('video');
    video.setAttribute('autoplay', 'true');
    await getWebcam();
    webcamTexture = CreateWebCamTexture();
}

async function getWebcam() {
    let stream = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
        videoTrack = stream.getTracks()[0];
    } catch(err) {
        console.log('Camera Error');
        console.log(err);
    }
}

function CreateWebCamTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}

const startDeviceOrientation = async () => {
    try {
        window.addEventListener('deviceorientation', (event) => {
            alpha = event.alpha;
            beta = event.beta;
            gamma = event.gamma;

            showDeviceorientationData(alpha, beta, gamma);
        }, true);
    } catch (error) {
        console.error('error', error);
    }
};

const showDeviceorientationData = (alpha, beta, gamma) => {
    document.getElementById('alpha').innerHTML = alpha;
    document.getElementById('beta').innerHTML = beta;
    document.getElementById('gamma').innerHTML = gamma;
}