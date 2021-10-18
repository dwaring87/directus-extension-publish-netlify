<template>
    <private-view title="Build Site">
        <template #headline>Publish</template>

        <template #title-outer:prepend>
            <v-button class="header-icon" rounded disabled icon secondary>
                <v-icon name="build" />
            </v-button>
        </template>

        <!-- Loading -->
        <div v-if="loading" style="margin: 25px auto; max-width: 50px">
            <v-progress-circular indeterminate />
        </div>

        <!-- Setup Error -->
        <Message v-if="!loading && setupMessage" 
                icon="settings" title="Setup Error" v-bind:subtitle="setupTitle">
            {{ setupMessage }}
        </Message>

        <!-- Site Card -->
        <Site v-if="!loading && !setupMessage" 
                v-on:update="update"
                v-on:build="buildRequested = true"
                v-bind:site="site"
                v-bind:publishedDeploy="publishedDeploy"
                v-bind:isBuilding="isBuilding"
                v-bind:updateAvailable="updateAvailable" />

        <!-- Deploys Table -->
        <Deploys v-if="!loading && !setupMessage" v-on:update="update"
                v-bind:site="site"
                v-bind:deploys="deploys"
                v-bind:publishedDeploy="publishedDeploy" />

        <!-- Confirmation Dialog -->
        <Dialog v-bind:show="!!dialog" 
                v-bind:title="dialog ? dialog.title : undefined" v-bind:message="dialog ? dialog.message : undefined"
                v-bind:close="dialog ? dialog.close : undefined" v-on:close="dialog = undefined"
                v-bind:action="dialog ? dialog.action : undefined" v-on:action="function() { dialog ? dialog.onAction() : undefined }" />

    </private-view>
</template>

<script>
    import config from '../../../config.js';
    import Message from '../components/message.vue';
    import Site from '../components/site.vue';
    import Deploys from '../components/deploys.vue';
    import Dialog from '../components/dialog.vue';
    import { getSite, getSiteMetadata, getDeploys, postDeployHookExists, createPostDeployHook, getUser, setUserToken, getLastActivityId } from '../api.js';


    /**
     * Create a random uuid-like token
     * @returns {String} token
     */
    function _createToken() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }


    export default {
        inject: ['api'],

        components: { Message, Site, Deploys, Dialog },

        data: function() {
            return {
                loading: true,
                setupTitle: undefined,
                setupMessage: undefined,
                site: undefined,
                metadata: undefined,
                deploys: undefined,
                lastActivityId: undefined,
                updateTimeout: undefined,
                buildRequested: undefined,
                dialog: undefined
            }
        },

        computed: {

            /**
             * Get the currently published deploy for the site
             */
            publishedDeploy: function() {
                return this.site ? this.site.published_deploy : undefined;
            },

            /**
             * Check if there is a deploy that is currently being built
             * building = deploy state is not ready or error
             */
            isBuilding: function() {
                if ( this.deploys ) {
                    for ( let i = 0; i < this.deploys.length; i++ ) {
                        if ( ! ['ready', 'error'].includes(this.deploys[i].state) ) {
                            this.buildRequested = false;
                            return true;
                        }
                    }
                }
                return this.buildRequested;
            },

            /**
             * Check if there is a data update available
             * true = the directus last activity id is greater than the 
             *          last activity id saved in the Netlify site metadata
             */
            updateAvailable: function() {
                return !this.metadata || !this.metadata.lastActivityId || this.lastActivityId > this.metadata.lastActivityId;
            }

        },

        methods: {

            /**
             * Update the Netlify data
             * - Attempt to get site from Netlify
             * - Get the site deploys
             * - Set the last Directus activity id
             */
            update: async function() {
                if ( this.updateTimeout ) {
                    clearTimeout(this.updateTimeout);
                }

                // Get the Site
                try {
                    this.site = await getSite(this.api);
                    if ( !this.site ) {
                        throw new Error("The site could not be retrieved via Netlify API");
                    }
                }
                catch (error) {
                    return this.displayError("Could not get Netlify site", error);
                }

                // Get the Site Metadata
                try {
                    this.metadata = await getSiteMetadata(this.api);
                    if ( !this.metadata ) {
                        throw new Error("The site metadata could not be retrieved via the Netlify API");
                    }
                }
                catch (error) {
                    return this.displayError("Could not get Netlify site metadata", error);
                }

                // Get the Deploys
                try {
                    this.deploys = await getDeploys(this.api);
                }
                catch (error) {
                    return this.displayError("Could not get Netlify site deploys", error);
                }

                // Set next update timeout
                // Poll more frequently if there is a deploy build in progress
                this.updateTimeout = setTimeout(
                    this.update, 
                    this.isBuilding ? 2500 : 15000
                );

                this.loading = false;
                this.setupTitle = undefined;
                this.setupMessage = undefined;
                return;
            },

            /**
             * Check if the post deploy hook is set
             * - Call createHook() if the hook does not exists or is not set
             */
            checkHook: async function() {
                try {
                    let exists = await postDeployHookExists(this.api);
                    if ( exists ) return;
                }
                catch (error) {}

                // Prompt user to create the hook...
                // - if the hook does not exist
                // - the check encountered an error, such as a 404
                this.dialog = {
                    title: "Create Post-Deploy Hook",
                    message: "This extension requires a Netlify outgoing webhook to be created.  This outgoing webhook is called after a successful deploy of the Netlify site and is used to keep track of the Directus database revision number when the site is deployed so the extension can alert you when your Directus database has been updated after your latest Netlify deployment.",
                    close: "Cancel",
                    action: "Create Post-Deploy Hook",
                    onAction: this.checkToken
                }
            },

            /**
             * Check if the current user has a token set
             * - call createToken(user, token) if the user token is not set
             * - call createHook(), if the user token is set
             */
            checkToken: async function() {
                try {
                    let vm = this;
                    const user = await getUser(vm.api);
                    if ( !user ) throw new Error("Directus user not returned from API");
                    
                    // Prompt user to set a token...
                    if ( !user.token || user.token === "" ) {
                        let token = _createToken();
                        vm.dialog = {
                            title: "Create User Token",
                            message: `<p>In order for Netlify to access the Directus post-deploy hook, a Directus API access token needs to be set for your account.  The following token will be created:</p><br /><p></strong>User Account:</strong> ${user.first_name} ${user.last_name} &lt;${user.email}&gt;<br /><strong>Token:</strong> ${token}</p>`,
                            close: "Cancel",
                            action: "Add User Token",
                            onAction: function() {
                                vm.createToken(user, token);
                            }
                        }
                    }

                    // Token exists, create the hook...
                    else {
                        vm.createHook(user.token);
                    }
                }
                catch (error) {
                    vm.displayError("Could not create post-deploy hook [checkToken]", error);
                }
            },

            /**
             * Update the specified user with the specified token
             * - Call createHook(), if successfully set token
             * @param {Object} user User info
             * @param {String} token New user token
             */
            createToken: async function(user, token) {
                try {
                    let success = await setUserToken(this.api, user.id, token);
                    if ( !success ) throw new Error("Could not set Directus user token");
                    this.createHook(token);
                }
                catch (error) {
                    this.displayError("Could not create post-deploy hook [createToken]", error);
                }
            },

            /**
             * Create the post deploy hook
             * - Create the post deploy hook
             * @param {String} token User token
             */
            createHook: async function(token) {
                try {
                    this.dialog = {
                        title: "Working...",
                        message: "Creating the Netlify post-deploy hook..."
                    }

                    const hook = await createPostDeployHook(this.api, token);
                    if ( !hook ) throw new Error("New hook not returned from Netlify API");

                    this.dialog = {
                        title: "Done",
                        message: "The Netlify post deploy hook has been created",
                        close: "Close"
                    }
                }
                catch (error) {
                    this.displayError("Could not create post-deploy hook [createHook]", error);
                }
            },

            /**
             * Display a Setup error message
             * @param {String} title Error title
             * @param {String} message Error message
             */
            displayError: function(title, message) {
                this.dialog = undefined;
                this.loading = false;
                this.setupTitle = title;
                this.setupMessage = message;
            }

        },

        mounted: async function() {
            this.loading = true;
            
            // Update Netlify Data
            await this.update();

            // Check Post Deploy Hook
            if ( this.site ) {
                await this.checkHook();
            }

            // Get Latest Directus Activity
            try {
                this.lastActivityId = await getLastActivityId(this.api);
            }
            catch (error) {
                return this.displayError("Could not get Directus activity", error);
            }
        },

        beforeUnmount: function() {
            if ( this.updateTimeout ) {
                clearTimeout(this.updateTimeout);
            }
        }
    };
</script>