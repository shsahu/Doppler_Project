var baseFreq = 20000;
var freqRange = 33;
var fftSizeValue = 2048;
//create web audio api context
var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
var flag = 0;

function disableDoppler(){
    console.log("disable called");
    clearInterval(flag);
}


function enableDoppler(callback){

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

var constraints = { audio:{optional:[{echoCancellation: false}]}};
navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
     var mic = audioCtx.createMediaStreamSource(stream);
     mic.connect(analyser);

}).catch(function(err) {
 console.error("mic issue");
});


baseFreq = optimizeFrequency(osc, analyser, 19000, 22000); //can be omitted??
console.log("optimised frequency: ", baseFreq);
clearInterval(flag);
setTimeout(function() {
    readFromMic(analyser,callback);
},3500);




}

function readFromMic(analyser,callback){
    //frequencyBinCount: Is an unsigned long value half that of the FFT size. This generally equates to the number of data values
    var freqData = new Uint8Array(analyser.frequencyBinCount);//unsigned byte array ???
    //console.log("length: ",analyser.frequencyBinCount);
    //Copy the current frequency data into freqData.
    analyser.getByteFrequencyData(freqData);
    var bandwidth = getBandwidth(analyser, freqData);
    //console.log("left: ",bandwidth.left,"right: ",bandwidth.right);
    callback(bandwidth,freqData);

    flag = setTimeout(readFromMic, 1, analyser,callback);

}

function getBandwidth (analyser, freqData) {
    var base = freqToIndex(analyser, baseFreq);
    var baseVolume = freqData[base];
    // console.log("base: ",base);
    // console.log("baseVolume: ",baseVolume);
    var leftBandwidth = 0;
    var rightBandwidth = 0; 
    var volume =0;
    var ratio = 0;
    var maxVolumeRatio = 0.001;

    do{
        leftBandwidth++;
        volume = freqData[base-leftBandwidth];
        ratio = volume/baseVolume;
    } while (ratio>maxVolumeRatio && leftBandwidth<freqRange);
    

    do {
        rightBandwidth++;
        volume = freqData[base+rightBandwidth];
        ratio = volume/baseVolume;
    } while (ratio>maxVolumeRatio && rightBandwidth<freqRange);


    return {left:leftBandwidth,right:rightBandwidth};
  };

  var optimizeFrequency = function(osc, analyser, freqSweepStart, freqSweepEnd) {
    var oldFreq = osc.frequency.value;

    var audioData = new Uint8Array(analyser.frequencyBinCount);
    var maxAmp = 0;
    var maxAmpIndex = 0;

    var from = freqToIndex(analyser, freqSweepStart);
    var to   = freqToIndex(analyser, freqSweepEnd);
    for (var i = from; i < to; i++) {
      osc.frequency.value = indexToFreq(analyser, i);
      analyser.getByteFrequencyData(audioData);

      if (audioData[i] > maxAmp) {
        maxAmp = audioData[i];
        maxAmpIndex = i;
      }
    }
    // Sometimes the above procedure seems to fail, not sure why.
    // If that happends, just use the old value.
    if (maxAmpIndex == 0) {
        osc.frequency.value = oldFreq;
        return oldFreq;
    }
    else {
        var freq = indexToFreq(analyser, maxAmpIndex);
        osc.frequency.value = freq;
        return freq;
    }
  };


  function freqToIndex(analyser, freq) {
    var nyquist = audioCtx.sampleRate / 2;
    return Math.round( freq/nyquist * analyser.fftSize/2 );
  };

  function indexToFreq (analyser, index) {
    var nyquist = audioCtx.sampleRate / 2;
    return nyquist/(analyser.fftSize/2) * index;
  };
