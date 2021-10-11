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

        <!-- Setup Required -->
        <Message v-if="!loading && setupMessage" 
                icon="settings" title="Setup Required" v-bind:subtitle="setupTitle">
            {{ setupMessage }}
        </Message>

        <!-- List of Sites -->
        <Site v-if="!loading && !setupMessage" v-bind:site="site" page='deploy' />
    </private-view>
</template>

<script>
    import Message from '../components/message.vue';
    import Site from '../components/site.vue';
    import { getLastActivityId } from '../settings.js';

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
            
            setup: function() {

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