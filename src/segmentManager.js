import { parseHLSManifest, parseHLSPlaylist } from './myVideoPlayerUtils.js';

export async function segmentManager(baseURL, manifestUrl) {
  // Initialize the current segment index
  let currentSegment = 0;

  // Parse the HLS manifest to retrieve the available streams
  const manifestStreams = await parseHLSManifest(manifestUrl);
  const selectedManifestStream = manifestStreams[0];

  // Parse the selected playlist to retrieve the segments
  const selectedPlaylist = await parseHLSPlaylist(
    `${baseURL}${selectedManifestStream.url}`
  );

  return {
    //TODO:  Come back and clean this up so getNextSegment URL is not musating the current segment
    getNextSegmentURL: () => {
      console.log('getNextSegmentURL');
      if (currentSegment === selectedPlaylist.segments.length) {
        console.log('No more segments to load');
        return null;
      }
      const playlistPath = selectedManifestStream.url.match(/^[^/]+\//)[0];
      const segmentURL = `${baseURL}${playlistPath}${selectedPlaylist.segments[currentSegment].url}`;
      currentSegment++;
      return segmentURL;
    },
    codecs: selectedManifestStream.codecs,
  };
}
