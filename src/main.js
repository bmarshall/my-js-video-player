import {
  parseHLSManifest,
  parseHLSPlaylist,
  fetchSegment,
} from './myVideoPlayer.js';
import { mp4 } from 'mux.js';

// Get the video element by its ID
const video = document.getElementById('my-video');

// Define the base URL and the manifest URL
const baseURL = 'https://test-streams.mux.dev/x36xhzz/';
const manifest = `${baseURL}x36xhzz.m3u8`;

// Parse the HLS manifest to retrieve the available streams
const manifestStreams = await parseHLSManifest(manifest);
const selectedManifestStream = manifestStreams[0];

// Parse the selected playlist to retrieve the segments
const selectedPlaylist = await parseHLSPlaylist(
  `${baseURL}${selectedManifestStream.url}`
);

// Create a new MediaSource object and set it as the video's source
const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

// Initialize the current segment index
let currentSegment = 0;

// Function to generate the URL of the current segment
//TODO: move this to a util file
const generateSegmentUrl = () => {
  console.log('generateSegmentUrl');
  const playlistPath = selectedManifestStream.url.match(/^[^/]+\//)[0];
  return `${baseURL}${playlistPath}${selectedPlaylist.segments[currentSegment].url}`;
};

// Event listener for when the media source is opened
mediaSource.addEventListener('sourceopen', async () => {
  // Set the MIME type based on the selected manifest stream's codecs
  let transmuxer = new mp4.Transmuxer();
  const mime = `video/mp4; codecs="${selectedManifestStream.codecs}"`;

  // Create a new source buffer and add it to the media source
  const sourceBuffer = mediaSource.addSourceBuffer(mime);

  // Event listener for when the source buffer's update starts
  sourceBuffer.addEventListener('updatestart', async () => {
    console.log('Segment update started');

    // Increment the current segment index
    //TODO: We need to stop and call endOfStream once we reach the end of our segment array.
    currentSegment++;

    // Fetch the next segment
    const segment = await fetchSegment(generateSegmentUrl());

    // Push the segment to the transmuxer and flush it
    transmuxer.push(segment);
    transmuxer.flush();
  });

  // Event listener for when the source buffer's update ends
  sourceBuffer.addEventListener('updateend', () => {
    console.log('Segment update complete');
  });

  // Event listener for source buffer errors
  sourceBuffer.addEventListener('error', error => {
    console.error('Error appending segment: ', error);
  });

  // Event listener for transmuxer data
  // TODO:  Lets see if we can move this into a transmuxer manager that accepts a sorce buffer and returns an api to accept a new segment.  Idea being that
  // the tranmuxer attaches itself to the sorce buffer and then appends to the buffer when needed.  The benifit of this approach is that it
  // makes this code eaiser to read and also us to move to make the video player a little more configurable.
  transmuxer.on('data', segment => {
    // replace the original transmuxer data handler wwith one that only appends segments data to the buffer, not init segment and media segment.
    transmuxer.off('data');
    transmuxer.on('data', segment => {
      console.log(segment.initSegment);
      sourceBuffer.appendBuffer(new Uint8Array(segment.data));
    });

    // Create a Uint8Array to hold the combined init segment and media segment.  This is done only for the first segment.
    let data = new Uint8Array(
      segment.initSegment.byteLength + segment.data.byteLength
    );
    data.set(segment.initSegment, 0);
    data.set(segment.data, segment.initSegment.byteLength);
    console.log(mp4.tools.inspect(data));

    // Append the combined data to the source buffer
    sourceBuffer.appendBuffer(data);
  });

  // Fetch the initial segment
  const segment = await fetchSegment(generateSegmentUrl());

  // Append the combined data to the source buffer
  transmuxer.push(segment);
  transmuxer.flush();
});

video.onerror = function () {
  console.log('Error loading video:', video.error);
};

video.onstalled = function () {
  console.log('Video playback stalled due to insufficient data.');
};

video.onabort = function () {
  console.log('Video playback aborted by user or script.');
};

video.onended = function () {
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
