import { mp4 } from 'mux.js';

export function createTransmuxerManager(sourceBuffer) {
  let transmuxer = new mp4.Transmuxer();

  // Event listener for transmuxer data
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

  return segment => {
    // Push the segment to the transmuxer and flush it
    transmuxer.push(segment);
    transmuxer.flush();
  };
}
