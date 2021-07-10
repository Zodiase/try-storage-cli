import { constants as FsConst } from 'fs';

/**
 * Permission needed on the working directory.
 */
export const WorkDirectoryPermission = 0o700;

/**
 * Permission needed on the working directory. Used by `fs.access`.
 */
export const WorkDirectoryAccessMode = FsConst.F_OK | FsConst.R_OK | FsConst.W_OK;

/**
 * Permission needed on the working files.
 */
export const WorkFilePermission = 0o600;

/**
 * Permission needed on the working files. Used by `fs.access`.
 */
export const WorkFileAccessMode = FsConst.F_OK | FsConst.R_OK | FsConst.W_OK;

/**
 * Maximum chunk size in MBs.
 * @see https://github.com/Zodiase/try-storage-cli/issues/5.
 */
export const MaxChunkSize = 300;

/**
 * How many bytes in one MB.
 */
export const MegaBytes = 1000000;
