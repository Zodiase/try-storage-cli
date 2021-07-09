import checkDiskSpace from 'check-disk-space';
import { SingleBar, Presets as ProgressBarPresets } from 'cli-progress';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { performance } from 'perf_hooks';
import prettyBytes from 'pretty-bytes';
import assertTestFolder from './assertTestFolder';
import { ChunkMeta, createChunk, getChunkGenerator } from './Chunk';
import ScoreCard from './ScoreCard';
import SideEffects from './sideEffects';

export interface TryStorageOptions {
    path: string;
    /**
     * Size of each chunk in megabytes.
     */
    chunkSize: number;
    /**
     * Max amount of chunks to write.
     * Set to positive infinity to remove the limit.
     */
    maxChunks: number;
}

interface TestContext {
    options: TryStorageOptions;
    scoreCard: ScoreCard;
    getChunkFilePath(chunkMeta: ChunkMeta): string;
}

export default async function tryStorage(options: TryStorageOptions): Promise<void> {
    preFlightCheck(options);

    // Write to test folder until disk is full.

    const context: TestContext = {
        options,
        scoreCard: new ScoreCard(),
        getChunkFilePath: (chunkMeta: ChunkMeta): string => resolvePath(options.path, `./${chunkMeta.name}.chunk`),
    };

    const writeReport = await performWrites(context);

    const readReport = await performReads(context);

    await performCleanup(context);
}

function preFlightCheck({ path, chunkSize, maxChunks }: TryStorageOptions): void {
    if (chunkSize <= 0) {
        throw new Error('chunk size must be positive');
    }

    if (maxChunks <= 0) {
        throw new Error('max chunk count must be positive');
    }

    // Using chunks would generate random chunk files under test path. Test path must be a folder.

    try {
        assertTestFolder(path);
    } catch (error) {
        throw new Error(`path is not a valid directory: ${path}`);
    }
}

async function performWrites(context: TestContext): Promise<void> {
    const {
        options: { path, chunkSize, maxChunks },
        scoreCard,
    } = context;

    const diskSpace = await checkDiskSpace(path);
    // `diskSpace.free` is in bytes.
    const availableMegaBytes = diskSpace.free / (1000 * 1000);
    const totalChunksToWrite = Math.min(Math.ceil(availableMegaBytes / chunkSize), maxChunks);
    const writeProgress = new SingleBar(
        {
            format: 'Writes: {bar} {percentage}% | Speed: {speed} | ETA: {eta_formatted} | {value}/{total} {abort}',
            stopOnComplete: false,
            clearOnComplete: false,
            align: 'left',
            hideCursor: true,
        },
        ProgressBarPresets.shades_classic
    );
    const sideEffects = new SideEffects();

    writeProgress.start(totalChunksToWrite, 0, {
        speed: 'N/A',
        abort: '',
    });

    // Allow Ctrl+C to kill the writes.
    let abortWrites = false;
    sideEffects.add(() => {
        const onForceKill = () => {
            process.exit(1);
        };
        const onInterruptDuringWrites = () => {
            abortWrites = true;
            writeProgress.update({
                abort: 'aborting',
            });
            process.on('SIGINT', onForceKill);
        };
        process.on('SIGINT', onInterruptDuringWrites);

        return () => {
            process.off('SIGINT', onForceKill);
            process.off('SIGINT', onInterruptDuringWrites);

            if (abortWrites) {
                writeProgress.update({
                    abort: '(aborted)',
                });
            }
        };
    });

    // Write asynchronously until the space is used up or the total amount of chunks have been written.
    // Being asynchronous allows the process to be interrupted.
    await new Promise<void>((resolve) => {
        const chunkWriter = getChunkWriter(context);
        let remainingChunksToWrite = totalChunksToWrite;

        const writeNextChunk = () => {
            if (abortWrites || remainingChunksToWrite <= 0) {
                return resolve();
            }

            const chunkWriteYield = chunkWriter.next();

            if (chunkWriteYield.done) {
                // Ran out of storage.
                return;
            }

            const { chunk, duration } = chunkWriteYield.value;

            const report = scoreCard.addChunkWrite(chunk, duration);
            remainingChunksToWrite--;

            writeProgress.increment({
                speed: `${prettyBytes(report.writeSpeed)}/s`,
            });

            setTimeout(writeNextChunk);
        };

        writeNextChunk();
    });

    sideEffects.cleanup();
    writeProgress.stop();
}

function* getChunkWriter({
    options: { chunkSize },
    getChunkFilePath,
}: TestContext): Generator<{ chunk: ChunkMeta; duration: number }> {
    const chunkGenerator = getChunkGenerator(chunkSize);

    while (true) {
        const chunkYield = chunkGenerator.next();

        if (chunkYield.done) {
            throw new Error('chunk generation failed');
        }

        const chunk = chunkYield.value;
        const chunkFilePath = getChunkFilePath(chunk.meta);

        try {
            const startTimeInMicroSecond = performance.now() * 1000;

            writeFileSync(chunkFilePath, chunk.data, {
                encoding: 'ascii',
            });

            const writeDurationInMicroSecond = performance.now() * 1000 - startTimeInMicroSecond;

            yield {
                chunk: chunk.meta,
                duration: writeDurationInMicroSecond,
            };
        } catch (error) {
            if (typeof error === 'object' && error.code === 'ENOSPC') {
                // Ran out of storage space. End the writes now.
                break;
            } else {
                throw error;
            }
        }
    }
}

async function performReads(context: TestContext): Promise<void> {
    const { scoreCard } = context;
    const totalChunksToRead = scoreCard.report().chunks;
    const readProgress = new SingleBar(
        {
            format: 'Reads : {bar} {percentage}% | Speed: {speed} | ETA: {eta_formatted} | {value}/{total} {abort}',
            stopOnComplete: false,
            clearOnComplete: false,
            align: 'left',
            hideCursor: true,
        },
        ProgressBarPresets.shades_classic
    );
    const sideEffects = new SideEffects();

    readProgress.start(totalChunksToRead, 0, {
        speed: 'N/A',
        abort: '',
    });

    // Allow Ctrl+C to kill the writes.
    let abortReads = false;
    sideEffects.add(() => {
        const onForceKill = () => {
            process.exit(1);
        };
        const onInterruptDuringWrites = () => {
            abortReads = true;
            readProgress.update({
                abort: 'aborting',
            });
            process.on('SIGINT', onForceKill);
        };
        process.on('SIGINT', onInterruptDuringWrites);

        return () => {
            process.off('SIGINT', onForceKill);
            process.off('SIGINT', onInterruptDuringWrites);

            if (abortReads) {
                readProgress.update({
                    abort: '(aborted)',
                });
            }
        };
    });

    // Read asynchronously until all the written chunks have been read.
    // Being asynchronous allows the process to be interrupted.
    await new Promise<void>((resolve) => {
        const chunkReader = getChunkReader(context);

        const readNextChunk = () => {
            if (abortReads) {
                return resolve();
            }

            const chunkReadYield = chunkReader.next();

            if (chunkReadYield.done) {
                // All read.
                return resolve();
            }

            const { chunk, duration } = chunkReadYield.value;

            const report = scoreCard.addChunkRead(chunk, duration);

            readProgress.increment({
                speed: `${prettyBytes(report.readSpeed)}/s`,
            });

            setTimeout(readNextChunk);
        };

        readNextChunk();
    });

    sideEffects.cleanup();
    readProgress.stop();
}

function* getChunkReader(context: TestContext): Generator<{ chunk: ChunkMeta; duration: number }> {
    for (const chunkMeta of context.scoreCard.getChunksWritten()) {
        const chunkFilePath = context.getChunkFilePath(chunkMeta);

        const startTimeInMicroSecond = performance.now() * 1000;

        const chunkData = readFileSync(chunkFilePath);

        const readDurationInMicroSecond = performance.now() * 1000 - startTimeInMicroSecond;

        const chunk = createChunk(chunkMeta.name, chunkData);

        yield {
            chunk: chunk.meta,
            duration: readDurationInMicroSecond,
        };
    }
}

async function performCleanup(context: TestContext): Promise<void> {
    const { scoreCard } = context;
    const totalChunksToClean = scoreCard.report().chunks;
    const cleanProgress = new SingleBar(
        {
            format: 'Clean : {bar} {percentage}% | {value}/{total}',
            stopOnComplete: false,
            clearOnComplete: false,
            align: 'left',
            hideCursor: true,
        },
        ProgressBarPresets.shades_classic
    );

    cleanProgress.start(totalChunksToClean, 0);

    scoreCard.getChunksWritten().forEach((chunkMeta) => {
        const chunkFilePath = context.getChunkFilePath(chunkMeta);

        unlinkSync(chunkFilePath);

        cleanProgress.increment();
    });

    cleanProgress.stop();
}
