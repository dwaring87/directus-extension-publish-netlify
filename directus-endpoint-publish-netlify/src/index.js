const config = require('./config.js');

const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require('child_process');

module.exports = function registerEndpoint(router, { services }) {

    const { ActivityService, ItemsService } = services;

    /**
     * Build the specified Site
     * - Create Temp File for Log
     * - Update Status to Building...
     * - Run the Build Command, saving output to Log
     * - Return an error or success message
     */
    router.get('/build/:site', _checkAuth, async function(req, res) {
        const activityService = new ActivityService({ schema: req.schema, accountability: req.accountability });
        const settingsService = new ItemsService(config.collection.collection, { schema: req.schema, accountability: req.accountability });
        
        // Lookup Site Info from DB
        let site = await _getSiteInfo(settingsService, req.params.site);
        if ( !site ) {
            return res.send({error: "Site configuration not found in Settings"});
        }

        // Make Temp File for Log
        let logFile = await _makeLogFile(settingsService, site);
        if ( !logFile ) {
            return res.send({error: "Could not create log file"});
        }

        // Update Status
        let start_update_success = await _updateStatus(settingsService, site, config.statuses.started);
        if ( !start_update_success ) {
            return res.send({error: "Could not update Site status to Building in Settings"});
        }

        // Set command
        let path = site[config.keys.path];
        let command = site[config.keys.command];
        let env = site[config.keys.env];
        let env_string = "";
        if ( env ) {
            try {
                env = JSON.parse(env);
                for ( const key in env ) {
                    if ( env.hasOwnProperty(key) ) {
                        env_string += key + "=" + env[key] + " ";
                    }
                }
            }
            catch (err) {
                console.log("ERROR: Could not parse env string into object");
                console.log(err);
            }
        }
        let cmd = env_string + "npm --no-color run --prefix \"" + path + "\" \"" + command + "\"";

        // Run Build Command
        let logStream = fs.createWriteStream(logFile);
        var child = exec(cmd);
        child.stdout.pipe(logStream);
        child.stderr.pipe(logStream);
        child.on('exit', async function(code) {
            if ( code === 0 ) {
                let finish_update_success = await _updateStatus(settingsService, site, config.statuses.completed);
                if ( !finish_update_success ) {
                    return res.send({error: "Could not update Site status to Published in Settings"});
                }
                let activity_update_success = await _updateActivity(activityService, settingsService, site);
                if ( !activity_update_success ) {
                    return res.send({error: "Could not update Site activity in Settings"});
                }
                return res.send({success: "Site successfully published"});
            }
            else {
                let finish_update_success = await _updateStatus(settingsService, site, config.statuses.failed);
                if ( !finish_update_success ) {
                    return res.send({error: "Could not update Site status to Build Failed in Settings"});
                }
                return res.send({error: "The Build process failed - view log for details"});
            }
        });

    });

    /**
     * Get the status, timestamp, and log contents of the specified Site
     */
    router.get('/status/:site', _checkAuth, async function(req, res) {
        const settingsService = new ItemsService(config.collection.collection, { schema: req.schema, accountability: req.accountability });

        // Lookup Site Info from DB
        let site = await _getSiteInfo(settingsService, req.params.site);
        if ( !site ) {
            return res.send({error: "Site configuration not found in Settings"});
        }

        // Read Log File
        let logContents;
        try {
            logContents = fs.readFileSync(site[config.keys.log], 'utf8');
        } catch (err) {
            console.error(err);
        }

        res.send({
            status: site[config.keys.status],
            timestamp: site[config.keys.timestamp],
            log: logContents
        });

    });



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


    /**
     * Lookup Site info from DB (create object from key/value rows)
     * @param {ItemsService} settingsService ItemsService for extension settings
     * @param {int} site_id Site ID
     * @returns {Object} Site Info object
     */
    async function _getSiteInfo(settingsService, site_id) {
        try {
            let rows = await settingsService.readByQuery({ 
                filter: { site: { "_eq": site_id } }, 
                fields: ['key', 'value'] 
            });
            let site = {};
            for (let row of rows) {
                site[row.key] = row.value;
            }
            return rows.length > 0 ? site : undefined;
        }
        catch (err) {
            console.log(err);
            return;
        }
    }

    /**
     * Update the Build Status and Timestamp in the Settings
     * @param {ItemsService} settingsService ItemsService for extension settings
     * @param {Site} site Site Info object
     * @param {String} status Site Build Status
     * @returns {Boolean} success
     */
    async function _updateStatus(settingsService, site, status) {
        try {
            let status_update = await settingsService.updateByQuery(
                { filter : { site: { "_eq": site[config.keys.id] }, key: { "_eq": config.keys.status } } },
                { value: status }
            );
            let timestamp_update = await settingsService.updateByQuery(
                { filter: { site: { "_eq": site[config.keys.id] }, key: { "_eq": config.keys.timestamp } } },
                { value: new Date().getTime() }
            );
            return status_update && status_update.length === 1 && timestamp_update && timestamp_update.length === 1;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    }

    /**
     * Update the build activity id for the specified Site in the Settings
     * @param {ActivityService} activityService Directus Activity Service
     * @param {ItemsService} settingsService ItemsService for extension settings
     * @param {Site} site Site Info object
     * @returns {Boolean} success
     */
    async function _updateActivity(activityService, settingsService, site) {
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

            let activity_update = await settingsService.updateByQuery(
                { filter: { site: { "_eq": site[config.keys.id] }, key: { "_eq": config.keys.activity } } },
                { value: activity_id }
            );
            return activity_update && activity_update.length === 1; 
        }
        catch (err) {
            console.log(err);
            return false;
        }
    }

    /**
     * Create a temp file for the build log
     * @param {ItemsService} settingsService ItemsService for extension settings
     * @param {Site} site Site Info object
     * @returns {String} Path to log file
     */
    async function _makeLogFile(settingsService, site) {
        try {
            let tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), config.extension + "-"));
            let logFile = path.join(tmpDir, "site-" + site[config.keys.id] + ".log");
            let log_update = await settingsService.updateByQuery(
                { filter: { site: { "_eq": site[config.keys.id] }, key: { "_eq": config.keys.log } } },
                { value: logFile }
            );
            return log_update && log_update.length === 1 ? logFile : undefined;
        }
        catch (err) {
            console.log(err);
            return;
        }
    }

};