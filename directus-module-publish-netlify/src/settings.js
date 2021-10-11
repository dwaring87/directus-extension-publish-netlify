import config from "../../config.js";

/**
 * Get the info for the configured Netlify Site
 * @param {API} api Directus API
 * @param {Function} callback Callback function({error, site})
 */
function getSite(api, callback) {
    api.get(`/${config.extension}/site`).then(function(resp) {
        return callback(resp && resp.data ? resp.data : {error: 'Unknown API Response'});
    });
}

/**
 * Get the ID of the last Activity Item (excluding authenticate)
 * @param {API} api Directus API
 * @param {Function} calback Callback function(activity_id)
 */
function getLastActivityId(api, callback) {
    let filter = JSON.stringify(config.activityFilter);
    api.get(`/activity?filter=${filter}&sort=-timestamp&limit=1`).then(function(res) {
        return callback(res && res.data && res.data.data && res.data.data.length > 0 ? res.data.data[0].id : 0);
    }).catch(function(err) {
        console.log(err);
        return callback();
    });
}

export { getSite, getLastActivityId };