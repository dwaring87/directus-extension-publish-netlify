<template>
    <div>

        <!-- List of Site Cards -->
        <v-card class="site-card" v-if="lastActivityId" v-for="site in sites" v-bind:key="site[config.keys.id]">
            
            <div v-if="build && !siteIsBuilding(site) && lastActivityId && siteUpdateAvailable(site)" class="site-card-update site-card-update-available">
                <p><v-icon name="update"></v-icon>&nbsp;&nbsp;Updates Available</p>
            </div>
            <div v-if="build && !siteIsBuilding(site) && lastActivityId && !siteUpdateAvailable(site)" class="site-card-update site-card-update-none">
                <p><v-icon name="check_circle"></v-icon>&nbsp;&nbsp;Site Updated</p>
            </div>
            <div v-if="build && siteIsBuilding(site)" class="site-card-update site-card-update-building">
                <p><v-icon name="build"></v-icon>&nbsp;&nbsp;Building<v-progress-circular indeterminate /></p>
            </div> 

            <v-card-title>{{ site[config.keys.name] }}<span v-if="settings" class="id-badge">#{{ site[config.keys.id] }}</span></v-card-title>
            <v-card-subtitle>{{ site[config.keys.url] }}</v-card-subtitle>
            
            <v-card-text>
                <p v-if="settings">
                    <strong>Path:</strong> 
                    <code>{{ site[config.keys.path] }}</code>
                </p>
                <p v-if="settings">
                    <strong>Build Command:</strong> 
                    <code>npm run {{ site[config.keys.command] }}</code>
                </p>
                <p v-if="settings">
                    <strong>Environment Variables:</strong>
                    <ul v-for="(value, key) in site[config.keys.env]" class="envvar-list">
                        <li :key="key">{{ key }}={{ value }}</li>
                    </ul>
                </p>
                <p>
                    <strong>Status:</strong> 
                    {{ site[config.keys.status] ? site[config.keys.status] : 'Unknown' }}
                </p>
                <p>
                    <strong>Last Updated:</strong> 
                    {{ site[config.keys.timestamp] ? new Date(parseInt(site[config.keys.timestamp])).toLocaleString() : 'Unknown' }}
                </p>
            </v-card-text>
            
            <v-card-actions>
                <v-button v-if="build" v-bind:href="site[config.keys.url]">
                    <v-icon name="launch"></v-icon>&nbsp;View
                </v-button>
                <v-button v-if="build && site[config.keys.log]" v-on:click="displayLog(site)">
                    <v-icon name="text_snippet"></v-icon>&nbsp;Log
                </v-button>
                <v-button v-if="build" v-on:click="startBuild(site)" v-bind:disabled="siteIsBuilding(site) || (!config.allow_concurrent_builds && anySiteIsBuilding)">
                    <v-icon name="build"></v-icon>&nbsp;Build
                </v-button>
                <v-button v-if="settings" v-on:click="promptDeleteSite(site)" class="danger">
                    <v-icon name="delete"></v-icon>&nbsp;Delete
                </v-button>
            </v-card-actions>
            
        </v-card>

        <!-- Confirmation / Error Dialog -->
        <Dialog v-bind:show="!!dialog" v-bind:title="dialog ? dialog.title : undefined" v-bind:message="dialog ? dialog.message : undefined" 
                v-bind:close="dialog ? dialog.close : undefined" v-on:close="dialog = undefined" 
                v-bind:action="dialog ? dialog.action : undefined" v-on:action="function() { dialog ? dialog.onAction() : undefined }" />

        <!-- Log Drawer -->
        <LogDrawer v-bind:show="!!log" v-bind:site="log" v-on:close="onLogClose" />

    </div>
</template>

<script>
    import config from '../../../config.js';
    import Dialog from './dialog.vue';
    import LogDrawer from './logDrawer.vue';
    import { removeSite, buildSite, getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Dialog, LogDrawer },

        props: {
            sites: {
                type: Array,
                required: true
            },
            page: String
        },

        data: function() {
            return {
                config: config,
                lastActivityId: undefined,
                dialog: undefined,
                log: undefined,
                updateInterval: undefined
            }
        },
        
        computed: {
            build: function() {
                return this.page === 'build';
            },
            settings: function() {
                return this.page === 'settings';
            },
            anySiteIsBuilding: function() {
                for ( let i = 0; i < this.sites.length; i++ ) {
                    if ( this.sites[i][config.keys.status] === config.statuses.started ) {
                        return true;
                    }
                }
                return false;
            }
        },

        methods: {

            /**
             * Check if there have been activity since the specified Site has last been updated
             * @param {Site} site Site to check
             * @returns {Boolean} true if the Site can be updated
             */
            siteUpdateAvailable: function(site) {
                return this.lastActivityId && (parseInt(this.lastActivityId) > parseInt(site[this.config.keys.activity]));
            },

            /**
             * Check if the Site is currently being built
             * @param {Site} site Site to check
             * @returns {Boolean} true if the site status is Building
             */
            siteIsBuilding: function(site) {
                return site[this.config.keys.status] === this.config.statuses.started;
            },

            /**
             * Display the Log dialog for the specified Site
             * @param {Site} site Site to display log for
             */
            displayLog: function(site) {
                this.log = site;
            },

            /**
             * Dismiss the dialog and refresh the Sites after closing the Log Dialog
             */
            onLogClose: function() {
                this.log = undefined;
                this.$emit('update');
            },

            /**
             * Start the Build process for the specified Site
             * - Flag the site as "Building"
             * - Call the Build API endpoint
             * - Refresh the sites when complete
             */
            startBuild: function(site) {
                let vm = this;
                site[vm.config.keys.status] = vm.config.statuses.started;
                buildSite(vm.api, site[vm.config.keys.id], function(resp) {
                    if ( resp && resp.error ) {
                        vm.dialog = {
                            title: "Build Error",
                            message: "There was an error while running the build command for <strong>" + site[vm.config.keys.name] + "</strong> (" + resp.error + ").  View the log for more detailed information.",
                            action: "Close",
                            onAction: function() {
                                vm.dialog = undefined;
                                vm.$emit('update');
                            }
                        }
                    }
                    else {
                        if ( !vm.log ) vm.$emit('update');
                    }
                });
            },

            /**
             * Prompt the User to delete the selected Site
             * @param {Site} site Site to delete
             */
            promptDeleteSite: function(site) {
                let vm = this;
                this.dialog = {
                    title: "Delete Site?",
                    message: "Are you sure you want to delete <strong>" + site[this.config.keys.name] + "</strong> from the Build Settings?  The Site will not be removed from the server.",
                    close: "Cancel",
                    action: "Delete",
                    onAction: function() {
                        vm.dialog = undefined;
                        vm.$emit('loading');
                        removeSite(vm.api, site[vm.config.keys.id], function(success) {
                            if ( !success ) {
                                alert("Error: Could not remove site!");
                            }
                            vm.$emit('update');
                        });
                    }
                }
            }

        },

        mounted: function() {
            let vm = this;
            getLastActivityId(vm.api, function(lastActivityId) {
                vm.lastActivityId = lastActivityId;
            });
            if ( !vm.updateInterval ) {
                vm.updateInterval = setInterval(function() {
                    if ( vm.anySiteIsBuilding ) {
                        vm.$emit('update');
                    }
                }, 1000);
            }
        },

        beforeUnmount: function() {
            if ( this.updateInterval ) {
                clearInterval(this.updateInterval);
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
    .site-card span.id-badge {
        background-color: var(--v-chip-background-color);
        color: var(--v-chip-color);
        border-radius: 5px;
        margin-left: 10px;
        width: 25px;
        height: 25px;
        text-align: center;
        font-size: 14px;
    }
    .site-card code {
        font-family: Monaco, monospace;
        line-height: 100%;
        padding: 0.2em;
    }
    .site-card .v-button.danger {
        --v-button-color: var(--danger-alt);
        --v-button-background-color: var(--danger);
        --v-button-color-hover: var(--danger-alt);
        --v-button-background-color-hover: var(--danger-125);
    }
    .site-card ul.envvar-list {
        list-style: none;
        padding-inline-start: 15px;
    }
    .site-card ul.envvar-list li {
        font-family: monospace;
    }
</style>