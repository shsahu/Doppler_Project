var baseFreq = 20000;
var freqRange = 33;
var fftSizeValue = 2048;
//create web audio api context
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var flag = 0;

function disableDoppler() {
    console.log("disable called");
    clearInterval(flag);
}

function enableDoppler(callback) {
    // Speaker : create Oscillator  
    var osc = audioCtx.createOscillator();
    osc.frequency.value = baseFreq; // hz
    osc.type = 'sine'; //???
    osc.connect(audioCtx.destination);
    osc.start();  // start(0);

    //Analyser for audio
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = fftSizeValue;
    analyser.smoothingTimeConstant = 0.5;
    //console.log("sample: ", audioCtx.sampleRate);

    var constraints = { audio: { optional: [{ echoCancellation: false }] } };
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        var mic = audioCtx.createMediaStreamSource(stream);
        mic.connect(analyser);

    }).catch(function (err) {
        console.error("mic issue");
    });
    clearInterval(flag);
    setTimeout(function () {
        readFromMic(analyser, callback);
    }, 3500);
}

function readFromMic(analyser, callback) {
    //frequencyBinCount: Is an unsigned long value half that of the FFT size. This generally equates to the number of data values
    var freqData = new Uint8Array(analyser.frequencyBinCount);//unsigned byte array ???
    //console.log("length: ",analyser.frequencyBinCount);
    //Copy the current frequency data into freqData.
    analyser.getByteFrequencyData(freqData);
    var bandwidth = getBandwidth(analyser, freqData);
    //console.log("left: ",bandwidth.left,"right: ",bandwidth.right);
    callback(bandwidth);

    flag = setTimeout(readFromMic, 1, analyser, callback);

}

function getBandwidth(analyser, freqData) {
    var base = freqToIndex(analyser, baseFreq);
    var baseVolume = freqData[base];
    var leftBandwidth = 0;
    var rightBandwidth = 0;
    var volume = 0;
    var ratio = 0;
    var maxVolumeRatio = 0.001;

    do {
        leftBandwidth++;
        volume = freqData[base - leftBandwidth];
        ratio = volume / baseVolume;
    } while (ratio > maxVolumeRatio && leftBandwidth < freqRange);


    do {
        rightBandwidth++;
        volume = freqData[base + rightBandwidth];
        ratio = volume / baseVolume;
    } while (ratio > maxVolumeRatio && rightBandwidth < freqRange);


    return { left: leftBandwidth, right: rightBandwidth };
};

function freqToIndex(analyser, freq) {
    var nyquist = audioCtx.sampleRate / 2;
    return Math.round(freq / nyquist * analyser.fftSize / 2);
};

function indexToFreq(analyser, index) {
    var nyquist = audioCtx.sampleRate / 2;
    return nyquist / (analyser.fftSize / 2) * index;
};

enableDoppler(function (bandwidth) {
    var threshold = 4;
    if (bandwidth.left > threshold || bandwidth.right > threshold) {
        var diff = bandwidth.left - bandwidth.right;
        console.log("diff: ", diff);
        if(Math.abs(diff)>4)
            window.scrollBy(0, -10 * diff);
    }
});