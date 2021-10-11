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
    try {
        let activity_rows = await activityService.readByQuery({ 
            filter: config.activityFilter, 
            sort: [{ column: "timestamp", order: "desc" }], 
            limit: 1 
        });
        if ( !activity_rows || activity_rows.length !== 1 ) {
            return false;
        }
        let activity_id = activity_rows[0].id;
        return activity_id;
    }
    catch (err) {
        console.log(err);
        return;
    }
}


module.exports = function registerEndpoint(router, { services, env }) {

    const { ActivityService } = services;
    const NETLIFY_TOKEN = env.NETLIFY_TOKEN;
    const NETLIFY_SITE = env.NETLIFY_SITE;

    // const activityService = new ActivityService({ schema: req.schema, accountability: req.accountability });


    //
    // CUSTOM ENDPOINTS
    //

    /**
     * GET /site
     * Get the info for the configured Netlify Site
     */
    router.get('/site', _checkAuth, async function(req, res) {

        // Check required Env Vars
        if ( !NETLIFY_TOKEN || NETLIFY_TOKEN === "" ) {
            res.send({error: "NETLIFY_TOKEN environment variable not set"});
            return;
        }
        if ( !NETLIFY_SITE || NETLIFY_SITE === "" ) {
            res.send({error: "NETLIFY_SITE environment variable not set"});
            return;
        }

        // Get Site info from Netlify
        _netlify_get("/sites?name=" + NETLIFY_SITE, function(err, resp) {
            let site = resp && resp.length === 1 ? resp[0] : undefined;
            let error = err ? err.toString() : !site ? 'The configured Netlify site could not be found' : undefined;
            res.send({ error: error, site: site });
        });

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
            res.send({error: "You must be logged in with admin privileges"});
        }
    }


    //
    // NETLIFY API FUNCTIONS
    //

    /**
     * Make a GET request to the Nelify API
     * @param {String} path API Path
     * @param {Function} callback Callback function(err, results)
     */
    function _netlify_get(path, callback) {
        _netlify_api("GET", path, undefined, callback);
    }

    /**
     * Make a generic request to the Netlify API
     * @param {string} method HTTP Method
     * @param {string} path API Path
     * @param {Object} body POST / PUT Request Body
     * @param {Function} callback Callback function(err, results)
     */
    function _netlify_api(method, path, body, callback) {
        const options = {
            headers: {
                'Authorization': 'Bearer ' + NETLIFY_TOKEN
            },
            method: method,
            hostname: 'api.netlify.com',
            path: '/api/v1/' + path,
            port: 443
        }

        const req = https.request(options, function(res) {

            // Return failed API Request (not a 200 response)
            let status = res.statusCode;
            if ( status < 200 || status >= 300 ) {
                return callback(new Error("Netlify API Request Failed [" + status + "]"));
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
                    return callback(new Error("Netlify API Request Failed [" + e + "]"));
                }
                return callback(null, body);
            });

        });
        
        // Handle Network Error
        req.on('error', function(err) {
            console.log("Could not make Netlify API Request [" + err + "]");
            return callback(err);
        });

        req.end();
    }
};