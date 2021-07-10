import once from 'lodash/once';

export interface Looper {
    (work: () => void | any): void;
}

/**
 * Returns a looper function.
 * Calling the looper function with a work function for the first time would start the looping.
 * When the looper function reaches the end (the work function returns anything), it will call the `done` callback.
 * When the work function encounters any error, it will stop the looping and call the `done` callback.
 * @param done
 * @returns
 */
export default function loopTilResult<T = any>(done: (error: any, result?: T) => void): Looper {
    const looper = (work: () => void | T): void => {
        let workYield: void | T = void 0;
        let workError: any = void 0;
        try {
            workYield = work();
        } catch (error) {
            workError = error;
        }

        if (typeof workError !== 'undefined') {
            return done(workError);
        }

        if (typeof workYield !== 'undefined') {
            return done(null, workYield);
        }

        setTimeout(looper, 0, work);
    };

    return once(looper);
}
