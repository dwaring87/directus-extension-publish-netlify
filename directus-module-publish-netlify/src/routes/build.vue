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
    import { getSite, getDeploys, getLastActivityId } from '../api.js';


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
             */
            updateAvailable: function() {
                // TODO: Update the logic of this check
                return true;
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