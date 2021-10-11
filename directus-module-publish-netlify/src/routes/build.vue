<template>
    <private-view title="Deploy Site">
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
        <!-- <Site v-if="!loading && !setupMessage" v-bind:site="site" /> -->
        {{ site }}
    </private-view>
</template>

<script>
    import Message from '../components/message.vue';
    import Site from '../components/site.vue';
    import { getSite, getLastActivityId } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Message, Site },

        data: function() {
            return {
                loading: true,
                setupTitle: undefined,
                setupMessage: undefined,
                site: undefined,
                lastActivityId: undefined
            }
        },

        methods: {
            
            /**
             * Perform the initial Setup
             * - Attempt to get Site from Netlify
             * - Display error messages, if failed
             * - Display site card, if successful
             */
            setup: function() {
                let vm = this;
                getSite(vm.api, function(resp) {
                    vm.loading = false;
                    if ( !resp || !resp.site ) {
                        vm.setupTitle = "Could not get Netlify Site";
                        vm.setupMessage = resp.error ? resp.error : 'An unknown error occurred';
                    }
                    else {
                        vm.site = resp.site;
                    }
                });
            }

        },

        mounted: function() {
            let vm = this;
            vm.setup();
            getLastActivityId(vm.api, function(lastActivityId) {
                vm.lastActivityId = lastActivityId;
            });
        }
    };
</script>