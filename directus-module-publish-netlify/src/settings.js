import config from "../../config.js";

/**
 * Get the info for the configured Netlify Site
 * @param {API} api Directus API
 * @returns {Object} Site info
 */
async function getSite(api) {
    const { data } = await api.get(`/${config.extension}/site`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.site ? data.site : undefined;
}


/**
 * Get the ID of the last Activity Item (excluding authenticate)
 * @param {API} api Directus API
 * @returns {integer} ID of most recent activity
 */
async function getLastActivityId(api, callback) {
    let filter = JSON.stringify(config.activityFilter);
    const { data } = await api.get(`/activity?filter=${filter}&sort=-timestamp&limit=1`)
    return data && data.data && data.data.length > 0 ? data.data[0].id : 0
}

export { getSite, getLastActivityId };