import {
  parseHLSManifest,
  parseHLSPlaylist,
  fetchSegment,
} from './myVideoPlayerUtils.js';
import { createTransmuxerManager } from './transmuxerManager.js';

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
  const mime = `video/mp4; codecs="${selectedManifestStream.codecs}"`;

  // Create a new source buffer and add it to the media source
  const sourceBuffer = mediaSource.addSourceBuffer(mime);
  const transmuxSegment = createTransmuxerManager(sourceBuffer);

  // Event listener for when the source buffer's update starts
  sourceBuffer.addEventListener('updatestart', async () => {
    console.log('Segment update started');

    // Increment the current segment index
    //TODO: We need to stop and call endOfStream once we reach the end of our segment array.
    currentSegment++;

    // Fetch the next segment
    const segment = await fetchSegment(generateSegmentUrl());

    // Push the segment to the transmuxer and flush it
    transmuxSegment(segment);
  });

  // Event listener for when the source buffer's update ends
  sourceBuffer.addEventListener('updateend', () => {
    console.log('Segment update complete');
  });

  // Event listener for source buffer errors
  sourceBuffer.addEventListener('error', error => {
    console.error('Error appending segment: ', error);
  });

  // Prime the pump
  // Fetch the initial segment
  const segment = await fetchSegment(generateSegmentUrl());
  // Push the inital segment to the transmuxer and flush it
  transmuxSegment(segment);
});

mediaSource.addEventListener('sourceended', () => {
  console.log('Media source has reached its end');
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
