/**
 * Calls the given function repetitively until it returns something.
 * Returns a promise that is only resolved when the given function returns something.
 * Being asynchronous allows the process to be interrupted.
 * @param work
 * @returns
 */
export default async function repeatUntilReturn<T>(work: () => void | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const looper = (): void => {
            let workYield: void | T = void 0;
            let workError: any = void 0;
            try {
                workYield = work();
            } catch (error) {
                workError = error;
            }

            if (typeof workError !== 'undefined') {
                return reject(workError);
            }

            if (typeof workYield !== 'undefined') {
                return resolve(workYield);
            }

            setTimeout(looper);
        };

        looper();
    });
}
