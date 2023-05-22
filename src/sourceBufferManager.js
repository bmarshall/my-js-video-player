const calculateBufferedDuration = sourceBuffer => {
  let bufferedDuration = 0;
  for (let i = 0; i < sourceBuffer.buffered.length; i++) {
    bufferedDuration +=
      sourceBuffer.buffered.end(i) - sourceBuffer.buffered.start(i);
  }
  return bufferedDuration;
};

export function sourceBufferManager(sourceBuffer, bufferCapacity = 60) {
  return {
    calculateRemainingSpace: () => {
      const bufferedDuration = calculateBufferedDuration(sourceBuffer);
      return bufferCapacity - bufferedDuration;
    },
  };
}
