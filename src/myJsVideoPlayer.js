import {
  parseHLSManifest,
  parseHLSPlaylist,
  fetchSegment,
} from './myVideoPlayerUtils.js';
import { createTransmuxerManager } from './transmuxerManager.js';

export async function myJsVideoPlayer(video, baseURL, manifest) {
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

      // we have reached the end of our playlist so stop the loop and let mediaSource know we
      // are at the end
      console.log(
        `${currentSegment} === ${selectedPlaylist.segments.length}: `,
        currentSegment === selectedPlaylist.segments.length
      );

      if (currentSegment === selectedPlaylist.segments.length) {
        console.log('We have fetched and buffered all segments');
        mediaSource.endOfStream();
        return;
      }

      // Keep the loop going by increment the current segment index
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

  //TODO: flesh out the video player api
  return {
    load: () => {},
    play: () => {},
    pause: () => {},
    seek: () => {},
  };
}
