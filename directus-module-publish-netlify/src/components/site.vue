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
                <p>
                    <strong>Last Updated:</strong> 
                    {{ new Date(site.updated_at).toLocaleString() }}
                </p>
            </v-card-text>
            
            <!-- General Actions -->
            <v-card-actions>
                <v-button v-bind:href="site.url">
                    <v-icon name="launch"></v-icon>&nbsp;View
                </v-button>
                <v-button v-bind:href="site.admin_url">
                    <v-icon name="settings"></v-icon>&nbsp;Settings
                </v-button>
            </v-card-actions>
            
        </v-card>

        <!-- Confirmation / Error Dialog -->
        <Dialog v-bind:show="!!dialog" v-bind:title="dialog ? dialog.title : undefined" v-bind:message="dialog ? dialog.message : undefined" 
                v-bind:close="dialog ? dialog.close : undefined" v-on:close="dialog = undefined" 
                v-bind:action="dialog ? dialog.action : undefined" v-on:action="function() { dialog ? dialog.onAction() : undefined }" />

    </div>
</template>

<script>
    import config from '../../../config.js';
    import Dialog from './dialog.vue';
    import { getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Dialog },

        props: {
            site: {
                type: Object,
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

            siteUpdateAvailable: function() {
                return false;
            },

            siteIsBuilding: function() {
                return false;
            }

        },

        methods: {

            startDeploy: function() {
                console.log("Start Deploy");
                this.siteIsBuilding = true;
            }
            
        },

        mounted: function() {
            let vm = this;
            getLastActivityId(vm.api, function(lastActivityId) {
                vm.lastActivityId = lastActivityId;
            });
            if ( !vm.updateInterval ) {
                vm.updateInterval = setInterval(function() {
                    if ( vm.siteIsBuilding ) {
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