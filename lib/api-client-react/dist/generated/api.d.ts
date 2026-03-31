import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { BrowserProfile, CreateProfileRequest, DashboardStats, ErrorResponse, HealthStatus, JobStatus, StartJobRequest, StartJobResponse, StartProfileJobRequest, SuccessResponse } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all browser profiles
 */
export declare const getListProfilesUrl: () => string;
export declare const listProfiles: (options?: RequestInit) => Promise<BrowserProfile[]>;
export declare const getListProfilesQueryKey: () => readonly ["/api/profiles"];
export declare const getListProfilesQueryOptions: <TData = Awaited<ReturnType<typeof listProfiles>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProfiles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProfiles>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProfilesQueryResult = NonNullable<Awaited<ReturnType<typeof listProfiles>>>;
export type ListProfilesQueryError = ErrorType<unknown>;
/**
 * @summary List all browser profiles
 */
export declare function useListProfiles<TData = Awaited<ReturnType<typeof listProfiles>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProfiles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new browser profile
 */
export declare const getCreateProfileUrl: () => string;
export declare const createProfile: (createProfileRequest: CreateProfileRequest, options?: RequestInit) => Promise<BrowserProfile>;
export declare const getCreateProfileMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProfile>>, TError, {
        data: BodyType<CreateProfileRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProfile>>, TError, {
    data: BodyType<CreateProfileRequest>;
}, TContext>;
export type CreateProfileMutationResult = NonNullable<Awaited<ReturnType<typeof createProfile>>>;
export type CreateProfileMutationBody = BodyType<CreateProfileRequest>;
export type CreateProfileMutationError = ErrorType<unknown>;
/**
 * @summary Create a new browser profile
 */
export declare const useCreateProfile: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProfile>>, TError, {
        data: BodyType<CreateProfileRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProfile>>, TError, {
    data: BodyType<CreateProfileRequest>;
}, TContext>;
/**
 * @summary Get a browser profile by ID
 */
export declare const getGetProfileUrl: (id: string) => string;
export declare const getProfile: (id: string, options?: RequestInit) => Promise<BrowserProfile>;
export declare const getGetProfileQueryKey: (id: string) => readonly [`/api/profiles/${string}`];
export declare const getGetProfileQueryOptions: <TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
export type GetProfileQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a browser profile by ID
 */
export declare function useGetProfile<TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a browser profile
 */
export declare const getDeleteProfileUrl: (id: string) => string;
export declare const deleteProfile: (id: string, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getDeleteProfileMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProfile>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProfile>>, TError, {
    id: string;
}, TContext>;
export type DeleteProfileMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProfile>>>;
export type DeleteProfileMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a browser profile
 */
export declare const useDeleteProfile: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProfile>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProfile>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Queue a browser job for a specific profile
 */
export declare const getStartProfileJobUrl: (id: string) => string;
export declare const startProfileJob: (id: string, startProfileJobRequest: StartProfileJobRequest, options?: RequestInit) => Promise<StartJobResponse>;
export declare const getStartProfileJobMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startProfileJob>>, TError, {
        id: string;
        data: BodyType<StartProfileJobRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startProfileJob>>, TError, {
    id: string;
    data: BodyType<StartProfileJobRequest>;
}, TContext>;
export type StartProfileJobMutationResult = NonNullable<Awaited<ReturnType<typeof startProfileJob>>>;
export type StartProfileJobMutationBody = BodyType<StartProfileJobRequest>;
export type StartProfileJobMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Queue a browser job for a specific profile
 */
export declare const useStartProfileJob: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startProfileJob>>, TError, {
        id: string;
        data: BodyType<StartProfileJobRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startProfileJob>>, TError, {
    id: string;
    data: BodyType<StartProfileJobRequest>;
}, TContext>;
/**
 * @summary Trigger a warmup run for a profile
 */
export declare const getWarmupProfileUrl: (id: string) => string;
export declare const warmupProfile: (id: string, options?: RequestInit) => Promise<StartJobResponse>;
export declare const getWarmupProfileMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof warmupProfile>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof warmupProfile>>, TError, {
    id: string;
}, TContext>;
export type WarmupProfileMutationResult = NonNullable<Awaited<ReturnType<typeof warmupProfile>>>;
export type WarmupProfileMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Trigger a warmup run for a profile
 */
export declare const useWarmupProfile: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof warmupProfile>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof warmupProfile>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Trigger a session health check for a profile
 */
export declare const getTriggerHealthCheckUrl: (id: string) => string;
export declare const triggerHealthCheck: (id: string, options?: RequestInit) => Promise<StartJobResponse>;
export declare const getTriggerHealthCheckMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerHealthCheck>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof triggerHealthCheck>>, TError, {
    id: string;
}, TContext>;
export type TriggerHealthCheckMutationResult = NonNullable<Awaited<ReturnType<typeof triggerHealthCheck>>>;
export type TriggerHealthCheckMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Trigger a session health check for a profile
 */
export declare const useTriggerHealthCheck: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerHealthCheck>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof triggerHealthCheck>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Start a browser job using an available profile
 */
export declare const getStartBrowserJobUrl: () => string;
export declare const startBrowserJob: (startJobRequest: StartJobRequest, options?: RequestInit) => Promise<StartJobResponse>;
export declare const getStartBrowserJobMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startBrowserJob>>, TError, {
        data: BodyType<StartJobRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startBrowserJob>>, TError, {
    data: BodyType<StartJobRequest>;
}, TContext>;
export type StartBrowserJobMutationResult = NonNullable<Awaited<ReturnType<typeof startBrowserJob>>>;
export type StartBrowserJobMutationBody = BodyType<StartJobRequest>;
export type StartBrowserJobMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Start a browser job using an available profile
 */
export declare const useStartBrowserJob: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startBrowserJob>>, TError, {
        data: BodyType<StartJobRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startBrowserJob>>, TError, {
    data: BodyType<StartJobRequest>;
}, TContext>;
/**
 * @summary List all queued and completed browser jobs
 */
export declare const getListJobsUrl: () => string;
export declare const listJobs: (options?: RequestInit) => Promise<JobStatus[]>;
export declare const getListJobsQueryKey: () => readonly ["/api/browser/jobs"];
export declare const getListJobsQueryOptions: <TData = Awaited<ReturnType<typeof listJobs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListJobsQueryResult = NonNullable<Awaited<ReturnType<typeof listJobs>>>;
export type ListJobsQueryError = ErrorType<unknown>;
/**
 * @summary List all queued and completed browser jobs
 */
export declare function useListJobs<TData = Awaited<ReturnType<typeof listJobs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get dashboard stats
 */
export declare const getGetDashboardStatsUrl: () => string;
export declare const getDashboardStats: (options?: RequestInit) => Promise<DashboardStats>;
export declare const getGetDashboardStatsQueryKey: () => readonly ["/api/dashboard/stats"];
export declare const getGetDashboardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>;
export type GetDashboardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard stats
 */
export declare function useGetDashboardStats<TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map