export type RequestInterceptor = (input: RequestInfo, init: RequestInit) => Promise<[RequestInfo, RequestInit]> | [RequestInfo, RequestInit];
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;
export type ApiClientOptions = {
    baseUrl?: string;
    headers?: Record<string, string>;
    getAuthToken?: () => Promise<string | null> | string | null;
    cache?: boolean;
    cacheDuration?: number;
};
export declare class ApiClient {
    private readonly baseUrl;
    private readonly headers;
    private readonly requestInterceptors;
    private readonly responseInterceptors;
    private readonly getAuthToken?;
    private readonly cacheEnabled;
    private readonly cacheStore;
    private readonly cacheDuration;
    constructor(options?: ApiClientOptions);
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
    private applyRequestInterceptors;
    private applyResponseInterceptors;
    private withAuth;
    private cacheKey;
    get<T = unknown>(path: string): Promise<T>;
    post<T = unknown>(path: string, body: unknown): Promise<T>;
    put<T = unknown>(path: string, body: unknown): Promise<T>;
    delete<T = unknown>(path: string): Promise<T>;
    clearCache(): void;
}
