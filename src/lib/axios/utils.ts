import axios, { AxiosError, AxiosInstance, AxiosPromise, AxiosRequestConfig } from 'axios';

export interface IAxiosAuthTokenRefreshOptions {
    statusCode?: number[],
    retryInstance?: AxiosInstance,
    pauseInstanceWhileRefreshing?: boolean,
    onRetry?: (requestConfig: AxiosRequestConfig) => AxiosRequestConfig
}

export interface IAxiosAuthTokenRefreshCache {
    skippedInstances: AxiosInstance[],
    refreshCall: Promise<any> | undefined
    requestQueueInterceptorId: number | undefined
}

export interface IAxiosAuthTokenRefreshRequestConfig extends AxiosRequestConfig {
    skipAuthTokenRefresh?: boolean
}

export interface ICustomAxiosError extends AxiosError {
    config: IAxiosAuthTokenRefreshRequestConfig
}

export const defaultOptions: IAxiosAuthTokenRefreshOptions = {
    statusCode: [ 401 ],
    pauseInstanceWhileRefreshing: false
}

export function mergeOptions(
    defaultOptions: IAxiosAuthTokenRefreshOptions,
    customOptions: IAxiosAuthTokenRefreshOptions
): IAxiosAuthTokenRefreshOptions {
    return {
        ...defaultOptions,
        ...customOptions
    }
}

export function shouldInterceptError(
    error: ICustomAxiosError,
    options: IAxiosAuthTokenRefreshOptions,
    instance: AxiosInstance,
    cache: IAxiosAuthTokenRefreshCache
): boolean {

    if (!error) {
        return false;
    }

    if (error.config.skipAuthTokenRefresh) {
        return false;
    }

    if (!error.response) {
        return false;
    }

    if (!options.statusCode?.includes(error.response.status)) {
        return false;
    }

    return !options.pauseInstanceWhileRefreshing || !cache.skippedInstances.includes(instance);
}

export function createRefreshCall(
    error: ICustomAxiosError,
    fn: (error: ICustomAxiosError) => Promise<any>,
    cache: IAxiosAuthTokenRefreshCache
): Promise<any> {

    if (!cache.refreshCall) {
        cache.refreshCall = fn(error);
        if (typeof cache.refreshCall.then !== 'function') {
            console.warn('axios-auth-refresh requires `refreshTokenCall` to return a promise.');
            return Promise.reject();
        }
    }
    return cache.refreshCall;
}

export function createRequestQueueInterceptor(
    instance: AxiosInstance,
    cache: IAxiosAuthTokenRefreshCache,
    options: IAxiosAuthTokenRefreshOptions
): number {

    if (typeof cache.requestQueueInterceptorId === 'undefined') {
        
        cache.requestQueueInterceptorId = instance.interceptors.request.use(
            (request) => {
                if (!cache.refreshCall) {
                    throw new Error('axios-auth-token-refresh-interceptor: `refreshCall` is not defined');
                }
                return cache.refreshCall
                    .catch(() => {
                      throw new axios.Cancel('Request call failed');
                    })
                    .then(() => options.onRetry ? options.onRetry(request) : request);
              });
    }
    return cache.requestQueueInterceptorId;
}

export function unsetCache(
    instance: AxiosInstance,
    cache: IAxiosAuthTokenRefreshCache
): void {
    if (cache.requestQueueInterceptorId) {
        instance.interceptors.request.eject(cache.requestQueueInterceptorId);
    }
    cache.requestQueueInterceptorId = undefined;
    cache.refreshCall = undefined;
    cache.skippedInstances = cache.skippedInstances.filter(skippedInstance => skippedInstance !== instance);
}

export function getRetryInstance(
    instance: AxiosInstance,
    options: IAxiosAuthTokenRefreshOptions
): AxiosInstance {
    return options.retryInstance || instance;
}

export function resendFailedRequest(
    error: ICustomAxiosError,
    instance: AxiosInstance
): AxiosPromise {
    error.config.skipAuthTokenRefresh = true;
    return instance(error.config);
}