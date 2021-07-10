import repeatUntilReturn from './repeatUntilReturn';

describe('repeatUntilReturn', () => {
    it('calls the given function immediately and resolves the promise once the function returns something.', async () => {
        let countDown = 10;
        const work = jest.fn(() => {
            if (--countDown <= 0) {
                return true;
            }
        });
        const promise = repeatUntilReturn(work);

        // `work` should have been called once already.
        expect(work).toBeCalledTimes(1);

        // Wait for all repetitions to run. Each could take (4 + 2)ms.
        await delay(10 * 6);

        expect(work).toBeCalledTimes(10);
        expect(promise).resolves.toBe(true);
    });

    it('rejects the promise when the given function throws.', () => {
        const work = jest.fn(() => {
            throw new Error('test error');
        });

        const promise = repeatUntilReturn(work);

        expect(work).toBeCalledTimes(1);
        expect(promise).rejects.toMatchObject({ message: 'test error' });
    });
});

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
