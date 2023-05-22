const calculateBufferedDuration = sourceBuffer => {
  let bufferedDuration = 0;
  for (let i = 0; i < sourceBuffer.buffered.length; i++) {
    bufferedDuration +=
      sourceBuffer.buffered.end(i) - sourceBuffer.buffered.start(i);
  }
  return bufferedDuration;
};

/*const findBufferedDurationOfTimeInSec = (sourceBuffer, timeInSec) => {
  for (let i = 0; i < sourceBuffer.buffered.length; i++) {
    if (
      sourceBuffer.buffered.start(i) <= timeInSec &&
      sourceBuffer.buffered.end(i) >= timeInSec
    ) {
      return i;
    }
  }
  return -1;
};*/

export function sourceBufferManager(sourceBuffer, bufferCapacity = 60) {
  return {
    haveSpaceToAppend: segment => {
      return true;
      /*const bufferedDuration = calculateBufferedDuration(sourceBuffer);
        return bufferCapacity - bufferedDuration;*/
    },
    shouldRemoveSegmentsFromBackBuffer: (
      currentPlayheadTimeInSec,
      backBufferTimeInSec = 10
    ) => {
      return (
        sourceBuffer.buffered.start(0) <=
        currentPlayheadTimeInSec - backBufferTimeInSec
      );
    },
    removeSegments: () => false,
  };
}
