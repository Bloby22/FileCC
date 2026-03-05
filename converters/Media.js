const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

class MediaConverter {
  convert(inputPath, outputPath, targetFormat) {
    return new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputPath);

      this._applyOptions(cmd, targetFormat);

      cmd
        .output(outputPath)
        .on('end', resolve)
        .on('error', err => reject(new Error(err.message)))
        .run();
    });
  }

  _applyOptions(cmd, targetFormat) {
    switch (targetFormat) {
      case 'mp3':
        cmd.audioCodec('libmp3lame').audioBitrate('192k').noVideo();
        break;
      case 'wav':
        cmd.audioCodec('pcm_s16le').noVideo();
        break;
      case 'flac':
        cmd.audioCodec('flac').noVideo();
        break;
      case 'aac':
        cmd.audioCodec('aac').audioBitrate('192k').noVideo();
        break;
      case 'ogg':
        cmd.audioCodec('libvorbis').audioBitrate('192k').noVideo();
        break;
      case 'm4a':
        cmd.audioCodec('aac').audioBitrate('192k').outputOptions('-movflags', '+faststart').noVideo();
        break;
      case 'mp4':
        cmd.videoCodec('libx264').audioCodec('aac').outputOptions('-crf', '23', '-preset', 'fast', '-movflags', '+faststart');
        break;
      case 'avi':
        cmd.videoCodec('libxvid').audioCodec('libmp3lame');
        break;
      case 'mkv':
        cmd.videoCodec('libx264').audioCodec('aac').outputOptions('-crf', '23', '-preset', 'fast');
        break;
      case 'mov':
        cmd.videoCodec('libx264').audioCodec('aac').outputOptions('-crf', '23');
        break;
      case 'webm':
        cmd.videoCodec('libvpx-vp9').audioCodec('libopus').outputOptions('-crf', '30', '-b:v', '0');
        break;
      default:
        throw new Error(`Unsupported media format: ${targetFormat}`);
    }
  }
}

module.exports = new MediaConverter();
