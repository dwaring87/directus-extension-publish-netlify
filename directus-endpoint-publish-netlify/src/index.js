const https = require('https');
const config = require('./config.js');


//
// DIRECTUS QUERIES
//

/**
 * Get the most recent activity id
 * @param {ActivityService} activityService Directus Activity Service
 * @returns {Integer} activity_id
 */
async function _getActivityId(activityService) {
    let activity_rows = await activityService.readByQuery({ 
        filter: config.activityFilter, 
        sort: [{ column: "timestamp", order: "desc" }], 
        limit: 1 
    });
    return activity_rows && activity_rows.length === 1 ? activity_rows[0].id : undefined;
}


module.exports = async function registerEndpoint(router, { services, env }) {
    const { ActivityService } = services;

    // Netlify API Environment Variables
    const NETLIFY_TOKEN = env.NETLIFY_TOKEN;
    const NETLIFY_SITE = env.NETLIFY_SITE;
    const DIRECTUS_PUBLIC_URL = env.PUBLIC_URL;

    // Cached Netlify Site ID (used by other API requests)
    let NETLIFY_SITE_ID = undefined;


    //
    // CUSTOM ENDPOINTS
    //

    /**
     * GET /site
     * Get the info for the configured Netlify site
     */
    router.get('/site', _checkAuth, async function(req, res) {
        if ( !NETLIFY_TOKEN || NETLIFY_TOKEN === "" ) {
            return res.send({ error: "NETLIFY_TOKEN environment variable not set" });
        }
        if ( !NETLIFY_SITE || NETLIFY_SITE === "" ) {
            return res.send({ error: "NETLIFY_SITE environment variable not set" });
        }

        try {
            const site = await _netlify_get_site();
            return res.send({ site });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * GET /metadata
     * Get the directus metadata for the configured Netlify site
     */
    router.get('/metadata', _checkAuth, async function(req, res) {
        try {
            const site_id = await _netlify_get_site_id();
            const metadata = await _netlify_get(`/sites/${site_id}/metadata`);
            return res.send({ metadata: metadata && metadata.directus ? metadata.directus : {} });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * GET /deploys
     * Get the deploys for the configured Netlify site
     */
    router.get('/deploys', _checkAuth, async function(req, res) {
        try {
            const site_id = await _netlify_get_site_id();
            const deploys = await _netlify_get(`/sites/${site_id}/deploys?per_page=${config.deploy_history_count}`);
            return res.send({ deploys });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * POST /builds
     * Start a new build for the configured Netlify site
     */
    router.post('/builds', _checkAuth, async function(req, res) {
        try {
            const site_id = await _netlify_get_site_id();
            const build = await _netlify_post(`/sites/${site_id}/builds`);
            return res.send({ build });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * GET /hook
     * Check if the post deploy hook exists (set in the site metadata and created)
     */
    router.get('/hook', _checkAuth, async function(req, res) {
        try {
            const site_id = await _netlify_get_site_id();
            let metadata = await _netlify_get(`/sites/${site_id}/metadata`);
            let directus_metadata = metadata && metadata.directus ? metadata.directus : {};

            // Post Deploy Hook not set in site metadata
            if ( !directus_metadata || !directus_metadata.post_deploy_hook_id ) {
                return res.send({ exists: false });
            }

            // Check if Post Deploy Hook exists and registered for the configured site
            let post_deploy_hook_id = directus_metadata.post_deploy_hook_id;
            let post_deploy_hook = await _netlify_get(`/hooks/${post_deploy_hook_id}`);
            return res.send({ exists: post_deploy_hook && post_deploy_hook.site_id && post_deploy_hook.site_id === site_id });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * PUT /hook
     * Create a new Netlify post-deploy hook
     */
    router.put('/hook', _checkAuth, async function(req, res) {
        try {
            if ( !DIRECTUS_PUBLIC_URL || DIRECTUS_PUBLIC_URL === "" ) throw new Error("PUBLIC_URL environment variable not set");
            const site_id = await _netlify_get_site_id();
            
            // Create Hook
            let token = req.body ? req.body.token : undefined;
            if ( !token ) throw new Error("Request did not include Directus API token");
            let hook_url = `${DIRECTUS_PUBLIC_URL}/${config.extension}/hook?access_token=${token}`;
            hook_url = hook_url.replace(/([^:])(\/\/+)/g, '$1/');
            let body = {
                site_id: site_id,
                type: "url",
                event: "deploy_created",
                data: {
                    url: hook_url
                }
            }
            const hook = await _netlify_post(`/hooks?site_id=${site_id}`, body);
            if ( !hook || !hook.id ) throw new Error("Could not create post deploy hook via Netlify API");

            // Update Metadata
            let metadata = await _netlify_get(`/sites/${site_id}/metadata`);
            let directus_metadata = metadata && metadata.directus ? metadata.directus : {};
            directus_metadata.post_deploy_hook_id = hook.id;
            metadata.directus = directus_metadata;
            await _netlify_put(`/sites/${site_id}/metadata`, metadata);

            return res.send({ hook });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * POST /hook
     * Run the post deploy hook (update the site metadata with the latest activitiy id)
     */
    router.post('/hook', async function(req, res) {
        try {
            const site_id = await _netlify_get_site_id();
            let updated = false;

            // Check deploy sent via hook
            let build = req.body;
            if ( build && build.site_id === site_id && build.state === 'ready' ) {
                
                // Get current metadata
                let metadata = await _netlify_get(`/sites/${site_id}/metadata`);
                let directus_metadata = metadata && metadata.directus ? metadata.directus : {};
                
                // Update activity in metadata
                const activityService = new ActivityService({ schema: req.schema, accountability: req.accountability });
                directus_metadata.lastActivityId = await _getActivityId(activityService);
                metadata.directus = directus_metadata;
                await _netlify_put(`/sites/${site_id}/metadata`, metadata);

                updated = true;
            }

            return res.send({ updated });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * POST /lock
     * Lock the currently debployed branch of the Netlify site
     * (Disable auto publishing)
     */
    router.post('/lock', _checkAuth, async function(req, res) {
        try {
            const site = await _netlify_get_site();
            const deploy = await _netlify_post(`/deploys/${site.published_deploy.id}/lock`);
            return res.send({ success: deploy && deploy.locked });
        }
        catch(error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * POST /unlock
     * Unlock the currently deployed branch of the Netlify site
     * (Enable auto publishing)
     */
    router.post('/unlock', _checkAuth, async function(req, res) {
        try {
            const site = await _netlify_get_site();
            const deploy = await _netlify_post(`/deploys/${site.published_deploy.id}/unlock`);
            return res.send({ success: deploy && !deploy.locked });
        }
        catch(error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * POST /publish/:deploy_id
     * Set the specified deploy as the currenly published deploy
     */
    router.post('/publish/:deploy_id', _checkAuth, async function(req, res) {
        try {
            const site_id = await _netlify_get_site_id();
            const deploy = await _netlify_post(`/sites/${site_id}/deploys/${req.params.deploy_id}/restore`);
            return res.send({ deploy });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    //
    // MIDDLEWARE
    //

    /**
     * Check to see if a User is logged in and has admin privileges
     * Return with an error if not an admin
     */
    function _checkAuth(req, res, next) {
        if ( req.accountability.admin ) {
            next();
        }
        else {
            res.send({ error: "You must be logged in with admin privileges" });
        }
    }


    //
    // NETLIFY API FUNCTIONS
    //

    /**
     * Get the Netlify Site ID (cached, if available)
     * @returns {String}
     */
    async function _netlify_get_site_id() {
        if ( !NETLIFY_SITE_ID ) {
            let site = await _netlify_get_site();
            NETLIFY_SITE_ID = site ? site.site_id : undefined;
        }
        return NETLIFY_SITE_ID;
    }

    /**
     * Get the configured Netlify site
     * @returns {Object} Site info
     */
    function _netlify_get_site() {
        return new Promise(async function(resolve, reject) {
            try {
                const resp = await _netlify_get(`/sites?name=${NETLIFY_SITE}`);
                let site = resp && resp.length === 1 ? resp[0] : undefined;
                if ( !site ) {
                    return reject('The configured Netlify site could not be found');
                }
                return resolve(site);
            }
            catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Make a GET request to the Nelify API
     * @param {String} path API Path
     * @returns {Object} API Response
     */
    async function _netlify_get(path) {
        return await _netlify_api("GET", path, undefined);
    }

    /**
     * Make a POST request to the Netlify API
     * @param {String} path API Path
     * @param {Object} body Post Request Body 
     * @returns {Object} API Response
     */
    async function _netlify_post(path, body) {
        return await _netlify_api("POST", path, body);
    }

    /**
     * Make a PUT request to the Netlify API
     * @param {String} path API Path
     * @param {Object} body Post Request Body 
     * @returns {Object} API Response
     */
     async function _netlify_put(path, body) {
        return await _netlify_api("PUT", path, body);
    }

    /**
     * Make a generic request to the Netlify API
     * @param {string} method HTTP Method
     * @param {string} path API Path
     * @param {Object} body POST / PUT Request Body
     * @returns {Object} API Response
     */
    async function _netlify_api(method, path, body) {
        return new Promise(function(resolve, reject) {
            let headers = {
                Authorization: 'Bearer ' + NETLIFY_TOKEN
            }
            if ( body ) {
                body = JSON.stringify(body);
                headers['Content-Type'] = 'application/json';
                headers['Content-Length'] = body.length
            }

            const options = {
                headers: headers,
                method: method,
                hostname: 'api.netlify.com',
                path: '/api/v1/' + path,
                port: 443
            }

            const req = https.request(options, function(res) {

                // Return failed API Request (not a 200 response)
                let status = res.statusCode;
                if ( status < 200 || status >= 300 ) {
                    return reject(new Error("Netlify API Request Failed [" + status + "]"));
                }

                // Collect response data
                let body = [];
                res.on('data', function(chunk) {
                    body.push(chunk);
                });

                // Handle response data - return JSON data
                res.on('end', function() {
                    try {
                        body = JSON.parse(Buffer.concat(body).toString());
                    }
                    catch (e) {
                        return reject(new Error("Netlify API Request Failed [" + e + "]"));
                    }
                    return resolve(body);
                });

            });
            
            // Handle Network Error
            req.on('error', function(err) {
                console.log("Could not make Netlify API Request [" + err + "]");
                return reject(err);
            });

            // Add Body
            if ( body ) req.write(body);

            req.end();
        });
    }
};