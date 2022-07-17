import config from "../../config.js";

/**
 * Get the info for the configured Netlify site
 * @param {API} api Directus API
 * @returns {Object} Site info
 */
async function getSite(api) {
    const { data } = await api.get(`/${config.extension}/site`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.site ? data.site : undefined;
}

/**
 * Get the deploys for the configured Netlify site
 * @param {API} api Directus API
 * @returns {Object[]} Site deploys
 */
async function getDeploys(api) {
    const { data } = await api.get(`/${config.extension}/deploys`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.deploys ? data.deploys : [];
}

/**
 * Start a new build for the configured Netlify site
 * @param {API} api Directus API
 * @returns {Object} Site build
 */
async function startBuild(api) {
    const { data } = await api.post(`/${config.extension}/builds`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.build ? data.build : undefined;
}

/**
 * Lock the currently published deploy
 * @param {API} api Directus API
 * @returns {Boolean} Lock success
 */
async function lockDeploy(api) {
    const { data } = await api.post(`${config.extension}/lock`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.success ? data.success : false;
}

/**
 * Unlock the currently published deploy
 * @param {API} api Directus API
 * @returns {Boolean} Unlock success
 */
async function unlockDeploy(api) {
    const { data } = await api.post(`${config.extension}/unlock`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.success ? data.success : false;
}

/**
 * Set the specified deploy as the currently published deploy
 * @param {API} api Directus API
 * @param {String} deploy_id ID of deploy to publish
 * @returns {Object} new currently published deploy
 */
async function publishDeploy(api, deploy_id) {
    const { data } = await api.post(`${config.extension}/publish/${deploy_id}`);
    if ( data && data.error ) throw new Error(data.error);
    return data && data.deploy ? data.deploy : undefined;
}

/**
 * Get info on the latest Activity Item from the Directus DB
 * @param {API} api Directus API
 * @returns {Object} Most recent activity
 */
async function getLatestDirectusActivity(api) {
    let filter = JSON.stringify(config.activityFilter);
    const { data } = await api.get(`/activity?filter=${filter}&sort=-timestamp&limit=1&fields=*.*`)
    return data && data.data && data.data.length > 0 ? data.data[0] : undefined;
}

export { getSite, getDeploys, getLatestDirectusActivity,
    startBuild, lockDeploy, unlockDeploy, publishDeploy };