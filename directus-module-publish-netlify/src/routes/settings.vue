<template>
    <private-view title="Settings">
        <template #headline>Publish</template>

        <template #title-outer:prepend>
            <v-button class="header-icon" rounded disabled icon secondary>
                <v-icon name="settings" />
            </v-button>
        </template>

        <template #actions>
            <v-button  @click="showAddSiteDrawer = true" tooltip.bottom="Add Site" rounded icon>
                <v-icon name="add" />
            </v-button>
		</template>

        <template #navigation>
            <Navigation />
        </template>

        <!-- Loading -->
        <div v-if="loading" style="margin: 25px auto; max-width: 50px">
            <v-progress-circular indeterminate />
        </div>

        <!-- Setup Error -->
        <Error v-if="!loading && setupMessage" 
                title="Setup Failed" v-bind:message="setupMessage" />

        <!-- No Sites -->
        <Message v-if="!loading && !setupMessage && (!sites || sites.length === 0)" 
                icon="add" title="Add Site" subtitle="No Sites Configured">
            Click the <strong>&nbsp;&nbsp;<v-icon class="btn-color" name="add_circle"></v-icon>&nbsp;</strong> Add button above to add a Site.
        </Message>

        <!-- List of Sites -->
        <Sites v-if="!loading && !setupMessage && sites && sites.length > 0" page='settings'
                v-bind:sites="sites" v-on:update="displaySites" v-on:loading="loading = true" />

        <!-- Add Site Drawer -->
        <AddSiteDrawer v-bind:show="showAddSiteDrawer" 
                v-on:close="showAddSiteDrawer = false"
                v-on:done="displaySites" />
    </private-view>
</template>

<script>
    import Navigation from '../components/navigation.vue';
    import Error from '../components/error.vue';
    import Message from '../components/message.vue';
    import Sites from '../components/sites.vue';
    import AddSiteDrawer from '../components/addSiteDrawer.vue';
    import { collectionExists, createCollection, getSites } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Navigation, Error, Message, Sites, AddSiteDrawer },
        
        data: function() {
            return {
                loading: true,
                setupMessage: undefined,
                sites: undefined,
                showAddSiteDrawer: false
            }
        },
        
        methods: {

            /**
            * Perform the Setup steps
            * - Check if the Settings Collection exists
            * - Create the Collection, if it does not exist
            * @param {Function} callback Callback function(success)
            */
            setup: function(callback) {
                let vm = this;
                
                collectionExists(vm.api, function(exists) {
                    if ( !exists ) {
                        createCollection(vm.api, function(success) {
                            return callback(success);
                        });
                    }
                    else {
                        return callback(true);
                    }
                });
            },

            /**
            * Get the Sites and their properties to be displayed
            */
            displaySites: function() {
                let vm = this;
                
                vm.loading = true;
                getSites(vm.api, function(sites) {
                    if ( !sites ) vm.setupMessage = "Could not get Sites from Settings";
                    vm.sites = sites;
                    vm.loading = false;
                });
            }

        },
        
        mounted: function() {
            let vm = this;
            
            vm.setup(function(success) {
                if ( !success ) {
                    vm.setupMessage = "Could not create Settings Collection";
                    vm.loading = false;
                }
                else {
                    vm.displaySites();
                }
            });
        }
    };
</script>

<style scoped>
    .btn-color {
        color: var(--v-button-background-color);
    }
</style>