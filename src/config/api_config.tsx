import { useAuth } from '@/contexts/AuthContext'
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'


const setAuthorization = (token: string | undefined) => {
    if (token) {
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
    } else {
        delete axios.defaults.headers.common['Authorization']
    }
}

export const useApiClient = () => {
    const { session } = useAuth()
    const paramKeys: string[] = []

    // Default base url
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL

    // Get, Post methods
    const get = (url: string, params?: Record<string, unknown>) => {
        let response: Promise<AxiosResponse<never>>
        setAuthorization(session?.access_token)
        if (params) {
            Object.keys(params).map(key => {
                paramKeys.push(key + '=' + params[key])
                return paramKeys
            })
            const queryString =
                paramKeys && paramKeys.length ? paramKeys.join('&') : ''
            response = axios.get(`${url}?${queryString}`, params)
        } else {
            response = axios.get(`${url}`, params)
        }

        return response
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const create = (url: string, data: any, config?: AxiosRequestConfig) => {
        const returnValue = axios.post(url, data, config);
        return returnValue;
    };

    return { get, create }
}
