import https from 'https';
import config from '../../config';

export default {
  id: config.extension,
  handler: (router, { env }) => {

    // Netlify API Environment Variables
    const NETLIFY_TOKEN = env.NETLIFY_TOKEN;
    const NETLIFY_SITE = env.NETLIFY_SITE;

    // Cached Netlify Site ID (used by other API requests)
    let NETLIFY_SITE_ID = undefined;


    //
    // CUSTOM ENDPOINTS
    //


    /**
     * GET /site
     * Get the info for the configured Netlify site
     */
    router.get('/site', _checkAuth, async (req, res) => {
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
     * GET /deploys
     * Get the deploys for the configured Netlify site
     */
    router.get('/deploys', _checkAuth, async (req, res) => {
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
    router.post('/builds', _checkAuth, async (req, res) => {
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
     * POST /lock
     * Lock the currently debployed branch of the Netlify site
     * (Disable auto publishing)
     */
    router.post('/lock', _checkAuth, async (req, res) => {
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
    router.post('/unlock', _checkAuth, async (req, res) => {
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
    router.post('/publish/:deploy_id', _checkAuth, async (req, res) => {
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
      if ( req.accountability.admin || (req.accountability.app && config.additional_role_ids && config.additional_role_ids.includes(req.accountability.role)) ) {
        next();
      }
      else {
        res.status(401).send({ error: "You must be logged in with admin privileges" });
      }
    }


    //
    // NETLIFY API FUNCTIONS
    //

    /**
     * Get the Netlify Site ID (cached, if available)
     * @returns {Promise<String>}
     */
    async function _netlify_get_site_id() {
      if ( !NETLIFY_SITE_ID ) {
        const site = await _netlify_get_site();
        NETLIFY_SITE_ID = site ? site.site_id : undefined;
      }
      return NETLIFY_SITE_ID;
    }

    /**
     * Get the configured Netlify site
     * @returns {Promise<Object>} Site info
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
     * @returns {Promise<Object>} API Response
     */
    async function _netlify_get(path) {
      return await _netlify_api("GET", path, undefined);
    }

    /**
     * Make a POST request to the Netlify API
     * @param {String} path API Path
     * @param {Object} body Post Request Body 
     * @returns {Promise<Object>} API Response
     */
    async function _netlify_post(path, body) {
      return await _netlify_api("POST", path, body);
    }

    /**
     * Make a generic request to the Netlify API
     * @param {string} method HTTP Method
     * @param {string} path API Path
     * @param {Object} body POST / PUT Request Body
     * @returns {Promise<Object>} API Response
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

        const req = https.request(options, (res) => {

          // Return failed API Request (not a 200 response)
          let status = res.statusCode;
          if ( status < 200 || status >= 300 ) {
            return reject(new Error("Netlify API Request Failed [" + status + "]"));
          }

          // Collect response data
          let body = [];
          res.on('data', (chunk) => {
            body.push(chunk);
          });

          // Handle response data - return JSON data
          res.on('end', () => {
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
        req.on('error', (err) => {
          console.log("Could not make Netlify API Request [" + err + "]");
          return reject(err);
        });

        // Add Body
        if ( body ) req.write(body);

        req.end();
      });
    }

  }
};
