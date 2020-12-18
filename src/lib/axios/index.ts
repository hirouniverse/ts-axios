import { AxiosInstance, AxiosResponse } from "axios";

import {
    mergeOptions,
    shouldInterceptError,
    createRefreshCall,
    createRequestQueueInterceptor,
    getRetryInstance,
    unsetCache,
    resendFailedRequest,
    IAxiosAuthTokenRefreshCache,
    IAxiosAuthTokenRefreshOptions,
    defaultOptions
} from './utils'

const cache: IAxiosAuthTokenRefreshCache = {
    skippedInstances: [],
    refreshCall: undefined,
    requestQueueInterceptorId: undefined
}

export default function setAuthTokenRefreshInterceptor(
    instance: AxiosInstance,
    refreshAuthTokenFn: (error: any) => Promise<any>,
    options: IAxiosAuthTokenRefreshOptions
): number {

    if (typeof refreshAuthTokenFn !== 'function') {
        throw new Error('axios-auth-token-refresh-interceptor: `refreshAuthTokenFn` requires function returns a promise');
    }

    return instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: any) => {

            options = mergeOptions(defaultOptions, options);

            if (!shouldInterceptError(error, options, instance, cache)) {
                return Promise.reject();
            }

            if (options.pauseInstanceWhileRefreshing) {
                cache.skippedInstances.push(instance);
            }

            const refreshing = createRefreshCall(error, refreshAuthTokenFn, cache);

            createRequestQueueInterceptor(instance, cache, options);

            return refreshing
                .finally(() => unsetCache(instance, cache))
                .catch(error => Promise.reject(error))
                .then(() => resendFailedRequest(error, getRetryInstance(instance, options)));
        }
    )
}