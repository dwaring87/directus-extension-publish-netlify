<template>
    <div>

        <!-- Site Card -->
        <v-card class="site-card" v-if="lastActivityId">
            
            <div v-if="!siteIsBuilding && lastActivityId && siteUpdateAvailable" class="site-card-update site-card-update-available">
                <p><v-icon name="update"></v-icon>&nbsp;&nbsp;Updates Available</p>
            </div>
            <div v-if="!siteIsBuilding && lastActivityId && !siteUpdateAvailable" class="site-card-update site-card-update-none">
                <p><v-icon name="check_circle"></v-icon>&nbsp;&nbsp;Site Updated</p>
            </div>
            <div v-if="siteIsBuilding" class="site-card-update site-card-update-building">
                <p><v-icon name="build"></v-icon>&nbsp;&nbsp;Building<v-progress-circular indeterminate /></p>
            </div> 

            <v-card-title>{{ site.name}}</v-card-title>
            <v-card-subtitle>{{ site.url }}</v-card-subtitle>
        
            <v-card-text>
                <p><strong>State:</strong> {{ site.state }}</p>
                <p><strong>Last Updated:</strong> {{ displayDate(site.updated_at) }}</p>

                <br />

                <template v-if="publishedDeploy">
                    <p><strong>Published Deploy:</strong></p>
                    <ul class="published_deploy_details">
                        <li><strong>ID:</strong>  <span v-html="displayHash(publishedDeploy.id)"></span></li>
                        <li><strong>Published:</strong> {{ displayDate(publishedDeploy.published_at) }}</li>
                        <li><strong>Branch:</strong> {{ publishedDeploy.branch }}</li>
                    </ul>
                </template>
                <v-notice v-else type="warning" center>Site not yet published</v-notice>
            </v-card-text>
            
            <!-- General Actions -->
            <v-card-actions>
                <v-button class="warning" v-on:click="build" v-bind:disabled="siteIsBuilding">
                    <v-icon name="build"></v-icon>&nbsp;Build
                </v-button>
                <v-button v-bind:href="site.url">
                    <v-icon name="launch"></v-icon>&nbsp;View
                </v-button>
                <v-button v-bind:href="site.admin_url" icon>
                    <v-icon name="settings"></v-icon>
                </v-button>
            </v-card-actions>
            
        </v-card>

    </div>
</template>

<script>
    import config from '../../../config.js';
    import { startBuild, getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        props: {
            site: {
                type: Object,
                required: true
            },
            lastActivityId: {
                type: Number,
                required: true
            }
        },

        data: function() {
            return {
                building: false
            }
        },

        computed: {

            /**
             * Determine if the site has a data update
             */
            siteUpdateAvailable: function() {
                return false;
            },

            /**
             * Determine if the site is currently building
             */
            siteIsBuilding: function() {
                return this.building;
            },

            /**
             * Get the currently published deploy for the site
             */
            publishedDeploy: function() {
                return this.site ? this.site.published_deploy : undefined;
            }

        },

        methods: {

            /**
             * Format the date using the user's locale string
             * @param {Date} date Date to format
             */
            displayDate: function(date) {
                return new Date(date).toLocaleString();
            },

            /**
             * Format a hash for display (first and last 4 characters)
             * @param {String} hash Hash to format
             */
            displayHash: function(hash) {
                let s = hash.substring(0, 4);
                let e = hash.substring(hash.length-4);
                return `<span style='font-family: monospace'>${s}...${e}</span>`;
            },

            /**
             * Start the build process for the site
             */
            build: function() {
                startBuild(this.api);
                this.$emit('update');
            }
            
        }
    }
</script>

<style scoped>
    .site-card {
        margin: 25px auto;
        box-shadow: 0 2px 3px 2px rgba(0,0,0,0.1);
        transition: 0.3s;
        max-width: 500px !important;
    }
    .site-card:hover {
        box-shadow: 0 3px 4px 3px rgba(0,0,0,0.1);
    }
    .site-card-update {
        padding: 5px 10px;
    }
    .site-card-update-available {
        background-color: var(--warning);
        color: var(--warning-alt);
    }
    .site-card-update-none {
        background-color: var(--success);
        color: var(--success-alt);
    }
    .site-card-update-building {
        background-color: var(--blue);
        color: var(--blue-alt);
    }
    .v-progress-circular {
        float: right;
    }
    .site-card .v-button.warning {
        --v-button-color: var(--warning-alt);
        --v-button-background-color: var(--warning);
        --v-button-color-hover: var(--warning-alt);
        --v-button-background-color-hover: var(--warning-125);
    }
</style>