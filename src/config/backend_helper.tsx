import { useApiClient } from "./api_config"
import * as url from "./url_helper"
import { useCallback } from 'react'

export const useBackendHelper = () =>{
    const {get, create} = useApiClient();

    const getData = useCallback(() => get(url.GET_API), [get])
    const polishResume = useCallback((pdf_file: File, job_description: string) => {
        const formData = new FormData();
        formData.append('pdf_file', pdf_file);
        formData.append('job_description', job_description);

        return create(url.POLISH_RESUME, formData)
    }, [create])

    const searchPDF = useCallback((pdf_file: File, searchQuery: string) => {
        const formData = new FormData();
        formData.append('pdf_file', pdf_file);
        formData.append('search_query', searchQuery);

        return create(url.SEARCH_PDF, formData)

    }, [create])
    const getPolishHistory = useCallback(
        (page: number, limit: number, search?: string) => 
            get(url.GET_POLISH_HISTORY, { page, limit, ...(search && search.trim() !== '' ? { search } : {}) }), 
        [get]
    )

    const getSearchHistory = useCallback(
        (page: number, limit: number, search?: string) => 
            get(url.GET_SEARCH_HISTORY, { page, limit, ...(search && search.trim() !== '' ? { search } : {}) }), 
        [get]
    )

    return{
        getData,
        polishResume,
        searchPDF,
        getSearchHistory,
        getPolishHistory
    }
}
