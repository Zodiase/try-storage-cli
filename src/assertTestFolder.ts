import { accessSync, mkdirSync } from 'fs';
import { WorkDirectoryAccessMode, WorkDirectoryPermission } from './constants';

/**
 * Given a path, make sure it points to a folder that we can use for the tests.
 * If it doesn't exist, try to create it.
 * If it's not a folder, throw an error.
 * If it doesn't have good permission, throw an error.
 * @param path
 */
export default function assertTestFolder(path: string): void {
    mkdirSync(path, {
        recursive: true,
        mode: WorkDirectoryPermission,
    });
    accessSync(path, WorkDirectoryAccessMode);
}
