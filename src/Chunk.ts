import { datatype, random } from 'faker';
import hasha from 'hasha';
import { MegaBytes } from './constants';

export interface ChunkMeta {
    name: string;
    /**
     * Chunk size in bytes.
     */
    size: number;
    hash: string;
}

export interface Chunk {
    meta: ChunkMeta;
    data: Buffer;
}

export function createChunk(name: string, data: Buffer): Chunk {
    return {
        data,
        meta: {
            name,
            size: data.length,
            hash: hasha(data, {
                encoding: 'hex',
                algorithm: 'md5',
            }),
        },
    };
}

export function* getChunkGenerator(sizeInMb: number): IterableIterator<Chunk> {
    // Prepare phrases to generate a chunk quickly. Each phrase is 1mb.
    const phrases = Array.from({ length: sizeInMb }).map(() => random.alphaNumeric(MegaBytes));

    while (true) {
        const chunkName = `r-${datatype.uuid()}`;
        const chunkData = Buffer.from(random.arrayElements(phrases, sizeInMb).join(''), 'ascii');

        yield createChunk(chunkName, chunkData);
    }
}
