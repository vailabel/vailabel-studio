export {};
declare global {
    interface Window {
        ipc: {
            invoke: (channel: string, ...args: any[]) => Promise<any>;
        };
    }
}
