import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';

// Middleware that compresses files before they are uploaded to the s3 bucket

ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

function bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

export const compressFile = async (fileBuffer: Buffer, mimeType: string): Promise<Buffer> => {
    try {
        if (mimeType.startsWith('image/')) {
            return await sharp(fileBuffer)
                .resize(800)
                .jpeg({ quality: 90 })
                .toBuffer();
        } else if (mimeType.startsWith('video/')) {
            return new Promise<Buffer>((resolve, reject) => {
                const pass = new PassThrough();
                const chunks: any[] = [];

                ffmpeg()
                    .input(bufferToStream(fileBuffer))
                    .size('800x?')
                    .pipe(pass, { end: true });

                pass.on('data', (chunk: any) => chunks.push(chunk));
                pass.on('end', () => resolve(Buffer.concat(chunks)));
                pass.on('error', reject);
            });
        } else if (mimeType.startsWith('audio/')) {
            return new Promise<Buffer>((resolve, reject) => {
                const pass = new PassThrough();
                const chunks: any[] = [];

                ffmpeg()
                    .input(bufferToStream(fileBuffer))
                    .audioCodec('libmp3lame')
                    .pipe(pass, { end: true });

                pass.on('data', (chunk: any) => chunks.push(chunk));
                pass.on('end', () => resolve(Buffer.concat(chunks)));
                pass.on('error', reject);
            });
        } else {
            return fileBuffer;
        }
    } catch (error:any) {
        throw new Error('Compression Error: ' + error.message);
    }
};
