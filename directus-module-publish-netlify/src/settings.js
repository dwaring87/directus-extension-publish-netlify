import config from "../../config.js";

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

export { getLastActivityId };