export default class SideEffects {
    private cleanups: (() => void)[] = [];

    add(effect: () => () => void): void {
        const cleanup = effect();

        this.cleanups.push(cleanup);
    }
    cleanup(): void {
        let cleanup: void | (() => void);

        while ((cleanup = this.cleanups.pop())) {
            cleanup();
        }
    }
}
