import { mp4 } from 'mux.js';

const cleanString = str => str?.replace(/\"/g, '');

export async function parseHLSManifest(url) {
  const response = await fetch(url);
  const text = await response.text();

  const streams = [];

  // split the text into individual lines
  const lines = text.split(/\r?\n/);

  let i = 0;

  while (i < lines.length) {
    // find the next stream info tag
    while (i < lines.length && !lines[i].startsWith('#EXT-X-STREAM-INF:')) {
      i++;
    }

    if (i >= lines.length) {
      break;
    }

    const stream = {};

    // parse the attributes of the stream info tag
    const attributes = lines[i].substring(18).split(',');
    for (let j = 0; j < attributes.length; j++) {
      const parts = attributes[j].split('=');
      const key = parts[0].toLowerCase();
      const value = cleanString(parts[1]);

      switch (key) {
        case 'program-id':
          stream.programId = parseInt(value);
          break;
        case 'bandwidth':
          stream.bandwidth = parseInt(value);
          break;
        case 'codecs':
          j++;
          stream.codecs = `${value},${cleanString(attributes[j])}`;
          break;
        case 'resolution':
          stream.resolution = value;
          break;
        case 'name':
          stream.name = value;
          break;
        case 'audio':
          stream.audio = value;
          break;
      }
    }

    // set the URL for the stream
    i++;
    stream.url = lines[i];

    // add the stream to the list of streams
    streams.push(stream);

    i++;
  }

  return streams;
}

export async function parseHLSPlaylist(url) {
  const response = await fetch(url);
  const text = await response.text();

  const playlist = {
    version: '',
    playListType: '',
    TARGETDURATION: '',
    segments: [],
  };

  const lines = text.split(/\r?\n/);
  playlist.version = lines[1].substring(15);
  playlist.playListType = lines[2].substring(21);
  playlist.TARGETDURATION = lines[3].substring(22);

  for (let i = 4; i < lines.length; i += 2) {
    const segment = {
      duration: lines[i].substring(8).split(',')[0],
      url: lines[i + 1],
    };
    playlist.segments.push(segment);
  }

  return playlist;
}

export async function fetchSegment(url) {
  const response = await fetch(url);
  const responseArrayBuffer = await response.arrayBuffer();
  const result = new Uint8Array(responseArrayBuffer);
  return result;
}

export async function remuxTSSegment(transportStreamSegment) {
  return new Promise((resolve, reject) => {
    // Create your transmuxer:
    //  initOptions is optional and can be omitted at this time.
    var transmuxer = new mp4.Transmuxer();

    // Create an event listener which will be triggered after the transmuxer processes data:
    //  'data' events signal a new fMP4 segment is ready
    transmuxer.on('data', function (segment) {
      // This code will be executed when the event listener is triggered by a Transmuxer.push() method execution.
      // Create an empty Uint8Array with the summed value of both the initSegment and data byteLength properties.
      let data = new Uint8Array(
        segment.initSegment.byteLength + segment.data.byteLength
      );

      // Add the segment.initSegment (ftyp/moov) starting at position 0
      data.set(segment.initSegment, 0);

      // Add the segment.data (moof/mdat) starting after the initSegment
      data.set(segment.data, segment.initSegment.byteLength);

      // Uncomment this line below to see the structure of your new fMP4
      console.log(mp4.tools.inspect(data));

      // Add your brand new fMP4 segment to your MSE Source Buffer
      resolve(data);
    });

    // When you push your starting MPEG-TS segment it will cause the 'data' event listener above to run.
    // It is important to push after your event listener has been defined.
    transmuxer.push(transportStreamSegment);
    transmuxer.flush();
  });
}
