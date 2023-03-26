document.addEventListener("DOMContentLoaded", function () {
    var videoelement = document.getElementById("videoelement");
    var streamContraints = {
        audio: false,
        video: { width: 1920, height: 1080 },
    };
    var canvaselement = document.getElementById('webglcanvas');
    console.log(canvaselement);
    var ctx = canvaselement.getContext('2d', { alpha: false });
    var canvasInterval = null;
    var fps=60


    if (videoelement) {
        navigator.mediaDevices
            .getUserMedia(streamContraints)
            .then(gotStream)
            .catch(function (e) {
                if (confirm("An error with camera occured:(" + e.name + ") Do you want to reload?")) {
                    location.reload();
                }
            });

        // navigator.mediaDevices
        //     .enumerateDevices()
        //     .getUserMedia(streamContraints)
        //     .then(function(devices) {
        //         devices.forEach(function(device) {
        //             console.log(device.kind + ": " + device.label +
        //                 " id = " + device.deviceId);
        //             gotStream(devices);
        //         });
        //     })
        //     .catch(function(err) {
        //         console.log(err.name + ": " + err.message);
        //     });
    }
//if stream found
    function gotStream(stream) {
        videoelement.srcObject = stream
        videoelement.play()
    }


    function drawImage(video) {
        ctx.drawImage(video, 0, 0, canvaselement.width, canvaselement.height);
    }
    canvasInterval = window.setInterval(() => {
        drawImage(videoelement);
    }, 1000 / fps);
})