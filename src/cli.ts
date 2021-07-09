import { resolve as resolvePath } from 'path';
import yargs from 'yargs';
// import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import tryStorage from './tryStorage';

export const run = async (argv: string[]): Promise<void> => {
    yargs(hideBin(argv))
        .usage('$0 [options] <path>')
        .option('chunkSize', {
            alias: 's',
            type: 'number',
            describe: 'chunk size in mb',
            hidden: false,
            default: 30,
        })
        .option('chunks', {
            alias: 'c',
            type: 'number',
            describe: 'max amount of chunks to write',
            hidden: false,
            default: Number.POSITIVE_INFINITY,
        })
        .command(
            '$0 <path>',
            false,
            (yargs) =>
                yargs.positional('path', {
                    type: 'string',
                    describe: 'testing path',
                    default: '.',
                    normalize: true,
                    /**
                     * This function receives the normalized path,
                     * and resolves it to an absolute path.
                     * @param v
                     * @returns
                     */
                    coerce: (v: string) => resolvePath(process.cwd(), v),
                }),
            async ({ chunkSize, chunks, path }): Promise<void> => {
                console.log('options', { chunkSize, chunks, path });

                try {
                    await tryStorage({ chunkSize, maxChunks: chunks, path });
                } catch (error) {
                    console.error(error);
                }
            }
        )
        .help().argv;
};
