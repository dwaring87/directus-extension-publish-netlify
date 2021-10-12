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
             * Perform the initial Setup
             * - Attempt to get Site from Netlify
             * - Attempt to get extension build hook
             */
            setup: async function() {
                this.loading = true;
                this.setupTitle = undefined;
                this.setupMessage = undefined;

                await this.updateSite();
                if ( this.site ) {
                    await this.updateBuildHook();
                }

                this.loading = false;
                return;
            },

            /**
             * Update the site info from Netlify
             */
            updateSite: async function() {
                try {
                    this.site = await getSite(this.api);
                    if ( !this.site ) {
                        throw new Error("The site could not be retrieved via Netlify API");
                    }
                }
                catch (error) {
                    this.loading = false;
                    this.setupTitle = "Could not get Netlify Site";
                    this.setupMessage = error;
                    return;
                }
            },

            /**
             * Update the extension Build Hook from Netlify
             */
            updateBuildHook: async function() {
                try {
                    this.hook = await getHook(this.api);
                    if ( !this.hook ) {
                        throw new Error("The extension needs to first create a build hook in order to trigger a Netlify build");
                    }
                }
                catch (error) {
                    this.loading = false;
                    this.setupTitle = "Could not get Netlify build hook";
                    this.setupMessage = error;
                    this.promptCreateHook();
                    return;
                }
            },

            /**
             * Prompt the user to create a new build hook
             */
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
                    onAction: async function() {
                        await vm.startCreateHook();
                    }
                }
            },

            /**
             * Start the create build hook function
             */
            startCreateHook: async function() {
                this.dialog = undefined;
                this.loading = true;

                this.hook = await createHook(this.api);
                    
                if ( this.hook ) {
                    await this.setup();
                }
                else {
                    this.loading = false;
                    this.setupTitle = "Create Build Hook";
                    this.setupMessage = "ERROR: Could not create required build hook!";
                }
            }

        },

        mounted: async function() {
            await this.setup();
            this.lastActivityId = await getLastActivityId(this.api);
        }
    };
</script>