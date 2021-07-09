import { ChunkMeta } from './Chunk';

const MicroSecondsInSecond = 1000000;

export interface ScoreCardView {
    totalBytesWritten: number;
    /**
     * Write speed in bytes per second.
     */
    writeSpeed: number;
    /**
     * Time spent writing in seconds.
     */
    totalWriteTime: number;

    totalBytesRead: number;
    /**
     * Read speed in bytes per second.
     */
    readSpeed: number;
    /**
     * Time spent reading in seconds.
     */
    totalReadTime: number;

    /**
     * Amount of chunks tracked.
     */
    chunks: number;

    /**
     * Amount of chunks that are read differently from what's written.
     */
    mistakes: number;
}

export default class ScoreCard {
    private totalBytesWritten = 0;

    private totalWriteTimeInMicroSeconds = 0;

    private totalBytesRead = 0;

    private totalReadTimeInMicroSeconds = 0;

    private writeMistakes = 0;

    private chunks: { [key: string]: ChunkMeta } = {};

    /**
     * Write speed in bytes per second.
     */
    get currentWriteSpeed(): number {
        return this.totalWriteTimeInMicroSeconds > 0
            ? (this.totalBytesWritten / this.totalWriteTimeInMicroSeconds) * MicroSecondsInSecond
            : 0;
    }

    /**
     * Read speed in bytes per second.
     */
    get currentReadSpeed(): number {
        return this.totalReadTimeInMicroSeconds > 0
            ? (this.totalBytesRead / this.totalReadTimeInMicroSeconds) * MicroSecondsInSecond
            : 0;
    }

    addChunkWrite(chunkMeta: ChunkMeta, durationInMicroSeconds: number): ScoreCardView {
        this.chunks[chunkMeta.name] = chunkMeta;
        this.totalBytesWritten += chunkMeta.size;
        this.totalWriteTimeInMicroSeconds += durationInMicroSeconds;

        return this.report();
    }

    getChunksWritten(): ChunkMeta[] {
        return Object.values(this.chunks);
    }

    addChunkRead(chunkMeta: ChunkMeta, durationInMicroSeconds: number): ScoreCardView {
        if (this.chunks[chunkMeta.name].hash !== chunkMeta.hash) {
            this.writeMistakes++;
        }

        this.totalBytesRead += chunkMeta.size;
        this.totalReadTimeInMicroSeconds += durationInMicroSeconds;

        return this.report();
    }

    report(): ScoreCardView {
        return {
            totalBytesWritten: this.totalBytesWritten,
            writeSpeed: this.currentWriteSpeed,
            totalWriteTime: this.totalWriteTimeInMicroSeconds / MicroSecondsInSecond,
            totalBytesRead: this.totalBytesRead,
            readSpeed: this.currentReadSpeed,
            totalReadTime: this.totalReadTimeInMicroSeconds / MicroSecondsInSecond,
            chunks: Object.keys(this.chunks).length,
            mistakes: this.writeMistakes,
        };
    }
}
