import { fetchSegment } from './myVideoPlayerUtils.js';
import { createTransmuxerManager } from './transmuxerManager.js';
import { segmentManager } from './segmentManager.js';
import { sourceBufferManager } from './sourceBufferManager.js';

export async function myJsVideoPlayer(video, baseURL, manifest) {
  // Create a new MediaSource object and set it as the video's source
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);

  // Event listener for when the media source is opened
  mediaSource.addEventListener('sourceopen', async () => {
    //initalize the segmentSegmentManager.  This will parse manifests and
    // keep track of the current segment.
    const { codecs, getNextSegmentURL } = await segmentManager(
      baseURL,
      manifest
    );

    // Set the MIME type based on the selected manifest stream's codecs
    const mime = `video/mp4; codecs="${codecs}"`;

    // Create a new source buffer and add it to the media source
    const sourceBuffer = mediaSource.addSourceBuffer(mime);
    const transmuxSegment = createTransmuxerManager(sourceBuffer);
    const { calculateRemainingSpace } = sourceBufferManager(sourceBuffer);

    // Event listener for when the source buffer's update ends
    sourceBuffer.addEventListener('updateend', () => {
      console.log('Segment update complete');
    });

    // Event listener for source buffer errors
    sourceBuffer.addEventListener('error', error => {
      console.error('Error appending segment: ', error);
    });

    // Event listener for when the source buffer's update starts
    sourceBuffer.addEventListener('updatestart', async () => {
      console.log('Segment update started');
      console.log(`Remaining Space ${calculateRemainingSpace()}`);

      const segmentUrl = getNextSegmentURL();

      if (!segmentUrl) {
        console.log('We have fetched and buffered all segments');
        mediaSource.endOfStream();
        return;
      }

      // Fetch the next segment
      const segment = await fetchSegment(segmentUrl);

      // Push the segment to the transmuxer and flush it
      transmuxSegment(segment);
    });

    // Prime the pump
    // Fetch the initial segment
    const segmentURL = getNextSegmentURL();
    const segment = await fetchSegment(segmentURL);

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
