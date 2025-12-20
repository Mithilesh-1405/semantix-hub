import { useApiClient } from "./api_config"
import * as url from "./url_helper"

export const useBackendHelper = () =>{
    const {get, create} = useApiClient();

    const getData = () => get(url.GET_API)

    return{
        getData
    }
}