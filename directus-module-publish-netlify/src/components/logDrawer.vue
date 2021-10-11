<template>
    <v-drawer v-model="show" v-on:cancel="this.$emit('close');" persistent
            v-bind:title="name" subtitle="Viewing Build Log" icon="text_snippet">
        <div class="drawer-content">
            <p><strong>Status:</strong> {{ status }}</p>
            <p><strong>Last Updated:</strong> {{ timestamp }}</p>
            <br />
            <p><strong>Log:</strong></p>
            <div v-if="log" class="log">
                <pre><code>{{ log }}</code></pre>
            </div>
            <v-progress-linear v-if="!log" indeterminate></v-progress-linear>
        </div>
    </v-drawer>
</template>

<script>
    import config from '../../../config.js';
    import { getSiteStatus } from '../settings.js';

    export default {
        inject: ['api'],

        props: {
            show: {
                type: Boolean,
                default: false
            },
            site: {
                type: Object,
                required: true
            }
        },

        data: function() {
            return {
                interval: undefined,
                status: "...",
                timestamp: "...",
                log: undefined
            }
        },

        computed: {
            name: function() {
                return this.site ? this.site[config.keys.name] : "";
            }
        },

        watch: {
            site: {
                handler: function(site) {
                    let vm = this;
                    vm.status = "...";
                    vm.timestamp = "...";
                    vm.log = undefined;
                    if ( site ) {
                        vm.interval = setInterval(function() { 
                            getSiteStatus(vm.api, site[config.keys.id], function(resp) {
                                vm.status = resp && resp.status ? resp.status : 'Unknown';
                                vm.timestamp = resp && resp.timestamp ? 
                                    new Date(parseInt(resp.timestamp)).toLocaleString() :  
                                    'Unknown';
                                vm.log = resp && resp.log ? resp.log : 'Unknown'
                            })
                        }, 1000);
                    }
                    else {
                        if ( vm.interval ) clearInterval(vm.interval);
                    }
                },
                deep: true
            }
        }
    }
</script>

<style scoped>
    div.drawer-content {
        padding: 10px 32px;
    }
    div.log {
        overflow-y: scroll; 
        max-height: 400px;
        font-family: monospace;
        background-color: var(--background-inverted);
        color: var(--foreground-inverted);
        padding: 5px 15px;
    }
</style>