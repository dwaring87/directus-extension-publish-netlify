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
        <Site v-if="!loading && !setupMessage" v-on:update="update" 
                v-bind:site="site"
                v-bind:lastActivityId="lastActivityId" />

        <!-- Deploys Table -->
        <Deploys v-if="!loading && !setupMessage" v-on:update="update"
                v-bind:site="site"
                v-bind:deploys="deploys" />
        
    </private-view>
</template>

<script>
    import config from '../../../config.js';
    import Message from '../components/message.vue';
    import Site from '../components/site.vue';
    import Deploys from '../components/deploys.vue';
    import { getSite, getDeploys, getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Message, Site, Deploys },

        data: function() {
            return {
                loading: true,
                setupTitle: undefined,
                setupMessage: undefined,
                site: undefined,
                deploys: undefined,
                lastActivityId: undefined,
                updateInterval: undefined
            }
        },

        methods: {

            /**
             * Update the Netlify data
             * - Attempt to get Site from Netlify
             */
            update: async function() {
                console.log("---> UPDATING <---");
                this.setupTitle = undefined;
                this.setupMessage = undefined;

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

                // Get the Directus last activity id
                try {
                    this.lastActivityId = await getLastActivityId(this.api);
                }
                catch (error) {
                    return this.displayError("Could not get Directus activity", error);
                }

                this.loading = false;
                return;
            },

            /**
             * Display a Setup error message
             * @param {String} title Error title
             * @param {String} message Error message
             */
            displayError: function(title, message) {
                this.loading = false;
                this.setupTitle = title;
                this.setupMessage = message;
            }

        },

        mounted: function() {
            this.loading = true;
            this.update();
            if ( !this.updateInterval ) {
                this.updateInterval = setInterval(this.update, 5000);
            }
        },

        beforeUnmount: function() {
            if ( this.updateInterval ) {
                clearInterval(this.updateInterval);
            }
        }
    };
</script>