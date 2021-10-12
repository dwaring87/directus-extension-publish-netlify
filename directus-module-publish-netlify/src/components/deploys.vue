<template>
    <div class="container">
        <h2>Deploys</h2>
        <v-table v-bind:headers="headers" v-bind:items="deploys"
                v-bind:sort="{by: 'updated_at', desc: true }">

            <!-- Deploy ID -->
            <template #[`item.id`]="{ item }">
                <span v-html="displayHash(item.id)"></span>
            </template>

            <!-- Updated Date -->
            <template #[`item.updated_at`]="{ item }">
                <span v-html="displayDate(item.updated_at)"></span>
            </template>

            <!-- Deploy State / Published -->
            <template #[`item.state`]="{ item }">
                <v-notice v-if="isBuilding(item)" icon="build" type="warning">
                    Building...
                </v-notice>
                <v-chip v-else-if="isPublished(item)" class="success">
                    <v-icon name="public"></v-icon>&nbsp;Published
                </v-chip>
                <v-notice v-else-if="isReady(item)" type="success">
                    Ready
                </v-notice>
                <v-notice v-else-if="isError(item)" type="danger">
                    Error
                </v-notice>
                <v-notice v-else type="warning">
                    {{ item.state }}
                </v-notice>
            </template>

            <!-- Actions -->
            <template #item-append="{ item }">
                <v-progress-circular v-if="isBuilding(item)" indeterminate />
                <v-menu v-else placement="left-start" show-arrow>
                    <template #activator="{ toggle }">
                        <v-icon name="more_horiz" clickable @click="toggle" />
                    </template>
                    <v-list>

                        <v-list-item v-if="isReady(item)" v-bind:click="view(item)" clickable>
                            <v-list-item-icon>
                                <v-icon name="launch" outline />
                            </v-list-item-icon>
                            <v-list-item-content>
                                View
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-if="isReady(item) && !isPublished(item)" v-bind:click="publish(item)" clickable>
                            <v-list-item-icon>
                                <v-icon name="public" outline />
                            </v-list-item-icon>
                            <v-list-item-content>
                                Publish
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-bind:click="log(item)" clickable>
                            <v-list-item-icon>
                                <v-icon name="article" outline />
                            </v-list-item-icon>
                            <v-list-item-content>
                                Build Log
                            </v-list-item-content>
                        </v-list-item>

                    </v-list>
                </v-menu>
            </template>

        </v-table>
    </div>
</template>


<script>
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
                        text: "Updated",
                        value: "updated_at",
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

            isBuilding: function(deploy) {
                return deploy.state === 'building';
            },

            isReady: function(deploy) {
                return deploy.state === 'ready';
            },

            isError: function(deploy) {
                return deploy.state === 'error';
            },

            isPublished: function(deploy) {
                return this.site.published_deploy && this.site.published_deploy.id === deploy.id;
            },


            view: function(deploy) {
                console.log("view deploy");
            },

            publish: function(deploy) {
                console.log("publish deploy");
            },

            log: function(deploy) {
                console.log("view build log of deploy");
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