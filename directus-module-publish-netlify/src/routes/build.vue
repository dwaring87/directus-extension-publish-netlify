<template>
    <private-view title="Build Sites">
        <template #headline>Publish</template>

        <template #title-outer:prepend>
            <v-button class="header-icon" rounded disabled icon secondary>
                <v-icon name="build" />
            </v-button>
        </template>

        <template #navigation>
            <Navigation />
        </template>

        <!-- Loading -->
        <div v-if="loading" style="margin: 25px auto; max-width: 50px">
            <v-progress-circular indeterminate />
        </div>

        <!-- Setup Required -->
        <Message v-if="!loading && setupMessage" 
                icon="settings" title="Setup Required" v-bind:subtitle="setupMessage">
            Go to the <strong>&nbsp;&nbsp;<v-icon name="settings"></v-icon>&nbsp;</strong> Settings page to configure the sites to build.
        </Message>

        <!-- No Sites -->
        <Message v-if="!loading && !setupMessage && sites && sites.length === 0" 
                icon="settings" title="Setup Required" subtitle="No Sites Configured">
            Go to the <strong>&nbsp;&nbsp;<v-icon name="settings"></v-icon>&nbsp;</strong> Settings page to add a site.
        </Message>

        <!-- List of Sites -->
        <Sites v-if="!loading && !setupMessage && sites && sites.length > 0" page='build'
            v-bind:sites="sites" v-on:update="displaySites" />
    </private-view>
</template>

<script>
    import Navigation from '../components/navigation.vue';
    import Message from '../components/message.vue';
    import Sites from '../components/sites.vue';
    import { collectionExists, getSites, getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Navigation, Message, Sites },

        data: function() {
            return {
                loading: true,
                setupMessage: undefined,
                sites: undefined,
                lastActivityId: undefined
            }
        },

        methods: {
            
            /**
            * Perform the Setup steps
            * - Check if the Settings Collection exists
            * @param {Function} callback Callback function(setupMessage)
            */
            setup: function(callback) {
                let vm = this;
                collectionExists(vm.api, function(exists) {
                    return callback(!exists ? "Build Settings Missing" : undefined);
                });
            },

            /**
            * Get the Sites and their properties to be displayed
            */
            displaySites: function() {
                let vm = this;
                if ( !vm.sites ) vm.loading = true;
                getSites(vm.api, function(sites) {
                    if ( !sites ) vm.setupMessage = "Could not get Sites from Settings";
                    vm.sites = sites;
                    vm.loading = false;
                });
            }

        },

        mounted: function() {
            let vm = this;
            
            vm.setup(function(setupMessage) {
                vm.setupMessage = setupMessage;
                vm.displaySites();
            });

            getLastActivityId(vm.api, function(lastActivityId) {
                vm.lastActivityId = lastActivityId;
            });
        }
    };
</script>