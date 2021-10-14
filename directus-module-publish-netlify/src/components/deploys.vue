<template>
    <div class="container">
        <h2>Deploys</h2>
        <v-table v-bind:headers="headers" v-bind:items="deploys"
                v-bind:sort="{by: 'created_at', desc: true }">

            <!-- Deploy ID -->
            <template #[`item.id`]="{ item }">
                <span v-html="displayHash(item.id)"></span>
            </template>

            <!-- Created Date -->
            <template #[`item.created_at`]="{ item }">
                <span v-html="displayDate(item.created_at)"></span>
            </template>

            <!-- Deploy State / Published -->
            <template #[`item.state`]="{ item }">
                <v-chip v-if="deployIsPublished(item)" class="success">
                    <v-icon name="public"></v-icon>&nbsp;Published
                    <span v-if="!autoPublishEnabled">&nbsp;<v-icon name="lock"></v-icon></span>
                </v-chip>
                <v-notice v-else-if="deployIsReady(item)" type="success">
                    Ready
                </v-notice>
                <v-notice v-else-if="deployIsError(item)" type="danger">
                    Error
                </v-notice>
                <v-notice v-else icon="build" type="warning">
                    {{ item.state.charAt(0).toUpperCase() + item.state.slice(1) }}
                </v-notice>
            </template>

            <!-- Actions -->
            <template #item-append="{ item }">
                
                <v-progress-circular v-if="!deployIsReady(item) && !deployIsError(item)" indeterminate />
                
                <v-menu v-else placement="left-start" show-arrow>
                    <template #activator="{ toggle }">
                        <v-icon name="more_horiz" clickable @click="toggle" />
                    </template>
                    <v-list>

                        <v-list-item v-if="deployIsReady(item)" v-on:click="view(item)" clickable>
                            <v-list-item-icon>
                                <v-icon name="launch" outline />
                            </v-list-item-icon>
                            <v-list-item-content>
                                View
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-if="deployIsReady(item) && !deployIsPublished(item)" v-on:click="publish(item)" clickable>
                            <v-list-item-icon>
                                <v-icon name="public" outline />
                            </v-list-item-icon>
                            <v-list-item-content>
                                Publish
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-on:click="details(item)" clickable>
                            <v-list-item-icon>
                                <v-icon name="info" outline />
                            </v-list-item-icon>
                            <v-list-item-content>
                                Deploy Details
                            </v-list-item-content>
                        </v-list-item>

                    </v-list>
                </v-menu>
            </template>

        </v-table>
    </div>
</template>


<script>
    import { publishDeploy } from '../api.js';

    export default {
        inject: ['api'],

        props: {
            site: {
                type: Object,
                required: true
            },
            deploys: {
                type: Array,
                required: true
            },
            publishedDeploy: {
                type: Object,
                required: true
            }
        },

        data: function() {
            return {
                headers: [
                    {
                        text: "Deploy ID",
                        value: "id",
                        sortable: false
                    },
                    {
                        text: "Created",
                        value: "created_at",
                        width: 250
                    },
                    {
                        text: "State",
                        value: "state",
                        sortable: false
                    }
                ]
            }
        },

        computed: {
            
            /**
             * Get if auto-publishing is enabled
             * enabled = published deploy is not locked
             * disabled = published deploy is locked
             */
            autoPublishEnabled: function() {
                return this.publishedDeploy && !this.publishedDeploy.locked;
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
             * Check if the deploy state is 'ready'
             * @param {Object} deploy Deploy to check
             */
            deployIsReady: function(deploy) {
                return deploy.state === 'ready';
            },

            /**
             * Check if the deploy state is 'error'
             * @param {Object} deploy Deploy to check
             */
            deployIsError: function(deploy) {
                return deploy.state === 'error';
            },

            /**
             * Check if the deploy is currently published
             * @param {Object} deploy Deploy to check
             */
            deployIsPublished: function(deploy) {
                return this.site.published_deploy && this.site.published_deploy.id === deploy.id;
            },


            /**
             * View the selected Deploy
             * @param {Object} deploy Deploy to view
             */
            view: function(deploy) {
                window.open(deploy.deploy_url, "_blank");
            },

            /**
             * Publish the selected Deploy
             * @param {Object} deploy Deploy to publish
             */
            publish: async function(deploy) {
                deploy.state = "publishing";
                await publishDeploy(this.api, deploy.id);
                this.$emit('update');
            },

            /**
             * View the build details of the selected Deploy
             * @param {Object} deploy Deploy to view log for
             */
            details: function(deploy) {
                window.open(`${deploy.admin_url}/deploys/${deploy.id}`, "_blank");
            }

        }
    }
</script>


<style scoped>
    div.container {
        max-width: 800px;
        margin: 40px auto;
        padding: 0 15px;
    }

    h2 {
        color: var(--foreground-normal-alt);
        font-weight: 700;
        font-size: 18px;
        font-family: var(--family-sans-serif);
        font-style: normal;
        line-height: 24px;
    }

    .v-notice {
        height: 36px;
        min-height: 36px;
    }
    .v-chip {
        --v-chip-color-hover: var(--v-chip-color);
        --v-chip-background-color-hover: var(--v-chip-background-color);
    }
    .v-chip.success {
        --v-chip-color: var(--success-alt);
        --v-chip-background-color: var(--success);
        --v-chip-color-hover: var(--success-alt);
        --v-chip-background-color-hover: var(--success);
    }
</style>