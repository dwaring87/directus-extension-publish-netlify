import config from "../../config.js";

/**
 * Get the info for the configured Netlify Site
 * @param {API} api Directus API
 * @param {Function} callback Callback function(error, site)
 */
function getSite(api, callback) {
    api.get(`/${config.extension}/site`).then(function(resp) {
        let error = resp.data && resp.data.error ? resp.data.error : undefined;
        let site = resp.data && resp.data.site ? resp.data.site : undefined;
        return callback(error, site);
    });
}

/**
 * Get the extension's build hook for the site
 * @param {API} api Directus API
 * @param {Object} site Netlify Site
 * @param {Function} callback Callback function(hook)
 */
function getHook(api, site, callback) {
    api.get(`/${config.extension}/hooks/${site.site_id}`).then(function(resp) {
        let hooks = resp && resp.data && resp.data.hooks ? resp.data.hooks : [];
        let hook;
        for ( let i = 0; i < hooks.length; i++ ) {
            if ( hooks[i].title === config.extension_build_hook ) {
                hook = hooks[i];
            }
        }
        return callback(hook);
    });
}

/**
 * Create the extension's build hook for the site
 * @param {API} api Directus API
 * @param {Object} site Netlify Site
 * @param {Function} callback Callback function(hook)
 */
function createHook(api, site, callback) {
    api.post(`/${config.extension}/hooks/${site.site_id}/${site.build_settings.repo_branch}`).then(function(resp) {
        return callback(resp && resp.data && resp.data.hook ? resp.data.hook : undefined);
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

export { getSite, getHook, createHook, getLastActivityId };