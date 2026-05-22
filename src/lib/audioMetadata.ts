export interface AudioMetadata {
  duration: number;
  bitrate?: number;
  sampleRate?: number;
}

export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    const handleCanLoadMetadata = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('loadedmetadata', handleCanLoadMetadata);
      audio.removeEventListener('error', handleError);
      resolve({
        duration: audio.duration,
      });
    };

    const handleError = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('loadedmetadata', handleCanLoadMetadata);
      audio.removeEventListener('error', handleError);
      reject(new Error('Failed to load audio metadata'));
    };

    audio.addEventListener('loadedmetadata', handleCanLoadMetadata);
    audio.addEventListener('error', handleError);
    audio.src = objectUrl;
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function extractFilename(file: File): string {
  return file.name.replace(/\.[^/.]+$/, '');
}
