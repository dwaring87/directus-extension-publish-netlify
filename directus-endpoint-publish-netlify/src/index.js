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

    const NETLIFY_TOKEN = env.NETLIFY_TOKEN;
    const NETLIFY_SITE = env.NETLIFY_SITE;

    // const { ActivityService } = services;
    // const activityService = new ActivityService({ schema: req.schema, accountability: req.accountability });


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
            let site = await _netlify_get_site();
            return res.send({ site });
        }
        catch (error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * GET /hook
     * Get the build hook for the configured Netlify site
     */
    router.get('/hook', _checkAuth, async function(req, res) {
        try {
            let site = await _netlify_get_site();            
            let site_id = site.site_id;
            let hooks = await _netlify_get(`/sites/${site_id}/build_hooks`);

            let hook;
            if ( hooks ) {
                for (let i = 0; i < hooks.length; i++ ) {
                    if ( hooks[i].title === config.extension_build_hook ) {
                        hook = hooks[i];
                    }
                }
            }

            return res.send({ hook });
        }
        catch(error) {
            return res.send({ error: error.message });
        }
    });


    /**
     * POST /hook
     * Create the extesion build hook for the configured Netlify site
     */
    router.post('/hook', _checkAuth, async function(req, res) {
        try {
            let site = await _netlify_get_site();           
            let site_id = site.site_id;
            let branch = site.build_settings.repo_branch;
            
            let body = {
                title: config.extension_build_hook,
                branch: branch
            }
            let hook = await _netlify_post(`/sites/${site_id}/build_hooks`, body);
            
            return res.send({ hook })
        }
        catch(error) {
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
     * Make a generic request to the Netlify API
     * @param {string} method HTTP Method
     * @param {string} path API Path
     * @param {Object} body POST / PUT Request Body
     * @returns {Object} API Response
     */
    async function _netlify_api(method, path, body) {
        return new Promise(function(resolve, reject) {
            console.log("===> API: [" + method + "] " + path);

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
                    console.log(body);
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