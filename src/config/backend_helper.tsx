import { useApiClient } from "./api_config"
import * as url from "./url_helper"

export const useBackendHelper = () =>{
    const {get, create} = useApiClient();

    const getData = () => get(url.GET_API)
    const polishResume = (pdf_file: File, job_description: string) => {
        const formData = new FormData();
        formData.append('pdf_file', pdf_file);
        formData.append('job_description', job_description);

        return create(url.POLISH_RESUME, formData)
    }

    return{
        getData,
        polishResume
    }
}