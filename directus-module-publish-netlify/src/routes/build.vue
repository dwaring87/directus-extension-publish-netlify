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
        <Site v-if="!loading && !setupMessage" v-bind:site="site" v-on:update="update" />

        <!-- Confirmation / Error Dialog -->
        <Dialog v-bind:show="!!dialog" v-bind:title="dialog ? dialog.title : undefined" v-bind:message="dialog ? dialog.message : undefined" 
                v-bind:close="dialog ? dialog.close : undefined" v-on:close="dialog = undefined" 
                v-bind:action="dialog ? dialog.action : undefined" v-on:action="function() { dialog ? dialog.onAction() : undefined }" />
        
    </private-view>
</template>

<script>
    import config from '../../../config.js';
    import Message from '../components/message.vue';
    import Site from '../components/site.vue';
    import Dialog from '../components/dialog.vue';
    import { getSite, getHook, createHook, getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Message, Site, Dialog },

        data: function() {
            return {
                loading: true,
                setupTitle: undefined,
                setupMessage: undefined,
                site: undefined,
                hook: undefined,
                lastActivityId: undefined,
                dialog: undefined
            }
        },

        methods: {
            
            /**
             * Update the Netlify Site
             * - Attempt to get Site from Netlify
             * - Display error messages, if failed
             * - Display site card, if successful
             */
            update: function() {
                let vm = this;
                vm.setupTitle = undefined;
                vm.setupMessage = undefined;

                // Get the configured Site
                getSite(vm.api, function(err, site) {
                    vm.loading = false;
                    vm.site = site;
                    
                    // Site not retrieved...
                    if ( err || !site ) {
                        vm.setupTitle = "Could not get Netlify site";
                        vm.setupMessage = err ? err : 'The site could not be retrieved via Netlify API';
                    }

                    else {

                        // Get the extension's build hook
                        getHook(vm.api, vm.site, function(hook) {
                            vm.hook = hook;
   
                            // Build hook not found...
                            if ( !vm.hook ) {
                                vm.setupTitle = "Build hook not found";
                                vm.setupMessage = "The extension needs to first create a build hook in order to trigger a Netlify build";
                                vm.promptCreateHook();
                            }

                        });

                    }
                });
            },

            promptCreateHook: function() {
                let vm = this;

                let message = "<p>A Netlify build hook needs to be created for this site that will be used to trigger a build from within Directus.</p>";
                message += "<br /><p>The build hook will have the following properties:</p>";
                message += "<ul>";
                message += "<li><strong>Site:</strong> " + vm.site.name + "</strong>";
                message += "<li><strong>Title:</strong> " + config.extension_build_hook + "</strong>";
                message += "<li><strong>Branch:</strong> " + vm.site.build_settings.repo_branch + "</strong>";
                message += "</ul>";

                vm.dialog = {
                    title: "Create Build Hook",
                    message: message,
                    close: "Cancel",
                    action: "Create Hook",
                    onAction: function() {
                        vm.startCreateHook();
                    }
                }
            },

            startCreateHook: function() {
                let vm = this;
                vm.dialog = undefined;
                vm.loading = true;

                createHook(vm.api, vm.site, function(hook) {
                    vm.loading = false;
                    if ( hook ) {
                        vm.update();
                    }
                    else {
                        vm.setupTitle = "Create Build Hook";
                        vm.setupMessage = "ERROR: Could not create required build hook!";
                    }
                });
            }

        },

        mounted: function() {
            let vm = this;
            vm.update();
            getLastActivityId(vm.api, function(lastActivityId) {
                vm.lastActivityId = lastActivityId;
            });
        }
    };
</script>