import { parseHLSManifest, parseHLSPlaylist, fetchSegment } from './myVideoPlayer.js';
import { mp4 } from 'mux.js';

const video = document.getElementById('my-video');

const baseURL = "https://test-streams.mux.dev/x36xhzz/"
const manifest = `${baseURL}x36xhzz.m3u8`;

const manifestStreams = await parseHLSManifest(manifest);
const selectedManifestStream = manifestStreams[0];
const selectedPlaylist = await parseHLSPlaylist(`${baseURL}${selectedManifestStream.url}`);

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

let currentSegment = 0;

const generateSegmentUrl = () => {
    console.log("generateSegmentUrl")
    const playlistPath = selectedManifestStream.url.match(/^[^/]+\//)[0];
    return `${baseURL}${playlistPath}${selectedPlaylist.segments[currentSegment].url}`
}


mediaSource.addEventListener('sourceopen', async () => {
    
    let transmuxer = new mp4.Transmuxer();
    const mime = `video/mp4; codecs="${selectedManifestStream.codecs}"`;
    const sourceBuffer = mediaSource.addSourceBuffer(mime);

    sourceBuffer.addEventListener('updatestart', async () => {
        console.log('Segment update started');
        currentSegment ++;
        const segment = await fetchSegment(generateSegmentUrl());
        transmuxer.push(segment);
        transmuxer.flush();

    });
    
    sourceBuffer.addEventListener('updateend', () => {
        console.log('Segment update complete');
        
    });
    
    sourceBuffer.addEventListener('error', (error) => {
        console.error('Error appending segment: ', error);
    });
    
    const segment = await fetchSegment(generateSegmentUrl());

    transmuxer.on('data', (segment) => {
        transmuxer.off('data');
        transmuxer.on('data', (segment) =>{
            console.log(segment.initSegment)
          sourceBuffer.appendBuffer(new Uint8Array(segment.data));
        })
        let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
        data.set(segment.initSegment, 0);
        data.set(segment.data, segment.initSegment.byteLength);
        console.log(mp4.tools.inspect(data));
        sourceBuffer.appendBuffer(data);
        
      });

      transmuxer.push(segment);
      transmuxer.flush();


});



video.onerror = function() {
console.log('Error loading video:', video.error);
};

video.onstalled = function() {
console.log('Video playback stalled due to insufficient data.');
};

video.onabort = function() {
console.log('Video playback aborted by user or script.');
};

video.onended = function() {
console.log('Video playback ended.');
};

//mediaSource.addEventListener('sourceended', onSourceEnded);
//mediaSource.addEventListener('sourceclose', onSourceClose);


// 1. Parse Playlist
// 2. Download Segment
// 3. Process segment
// 4A. If not initalized pass in initalization 
// 4b. attach  segment
// 5. back to 3. 