<template>
    <div>

        <!-- Add Site Drawer -->
        <v-drawer v-model="show" v-on:cancel="this.$emit('close');" persistent
                title="Adding New Site" subtitle="Settings" icon="add">
            <div>
                <div class="input-row">
                    <div class="type-label">
                        Site Name
                        <v-icon tooltip="Required" class="required" name="star" sup />
                    </div>
                    <v-input v-model="name" placeholder="Production" autofocus></v-input>
                </div>

                <div class="input-row">
                    <div class="type-label">
                        Public URL
                        <v-icon tooltip="Required" class="required" name="star" sup />
                    </div>
                    <v-input v-model="url" placeholder="https://www.example.com"></v-input>
                </div>

                <div class="input-row">
                    <div class="type-label">
                        Local Path to Site
                        <v-icon tooltip="Required" class="required" name="star" sup />    
                    </div>
                    <v-input v-model="path" placeholder="/site"></v-input>
                </div>

                <div class="input-row">
                    <div class="type-label">
                        Build Command
                        <v-icon tooltip="Required" class="required" name="star" sup />
                    </div>
                    <v-input v-model="command" placeholder="build"><template v-slot:prepend>npm run </template></v-input>
                </div>

                <div class="input-row">
                    <div class="type-label">Environment Variables</div>
                    <div class="envvar-input-row">
                        <div class="envvar-input-key">
                            <v-input v-model="envVarKey" placeholder="API_URL"></v-input>
                        </div>
                        <div class="envvar-input-value">
                            <v-input v-model="envVarValue" placeholder="https://api.example.com"></v-input>
                        </div>
                        <div class="envvar-input-add">
                            <v-button v-on:click="addEnvVar" icon><v-icon name="done"></v-icon></v-button>
                        </div>
                    </div>
                    <br />
                    <template v-for="(value, key) in env" :key="key">
                        <div class="envvar-display-row">
                            <div class="envvar-display-value">
                                <code>{{ key }}={{ value }}</code>
                            </div>
                            <div class="envvar-display-remove">
                                <v-button class="danger" v-on:click="removeEnvVar(key)" x-small icon><v-icon name="clear"></v-icon></v-button>
                            </div>
                        </div>
                    </template>
                </div>

                <br /><br />

                <div style="max-width: 250px; margin: 0 auto">
                    <v-button v-on:click="startSaveSite" v-bind:disabled="saving" full-width>Save</v-button>
                </div>
            </div>
        </v-drawer>

        <!-- Add Site Error Dialog -->
        <Dialog v-bind:show="!!dialog" v-bind:title="dialog ? dialog.title : undefined" v-bind:message="dialog ? dialog.message : undefined" 
                v-bind:close="dialog ? dialog.close : undefined" v-on:close="dialog = undefined" />

    </div>
</template>

<script>
    import Dialog from '../components/dialog.vue';
    import { saveSite } from '../settings.js';

    export default {
        inject: ['api'],

        components: { Dialog },

        props: {
            show: {
                type: Boolean,
                default: false
            }
        },

        data: function() {
            return {
                show: false,
                name: undefined,
                path: undefined,
                command: undefined,
                url: undefined,
                saving: false,
                dialog: undefined,
                envVarKey: undefined,
                envVarValue: undefined,
                env: {}
            }
        },

        methods: {

            /**
             * Add the entered env var key and value to the env object
             */
            addEnvVar: function() {
                if ( this.envVarKey && this.envVarKey !== "" && this.envVarValue && this.envVarValue !== "" ) {
                    this.env[this.envVarKey] = this.envVarValue;
                    this.envVarKey = undefined;
                    this.envVarValue = undefined;
                }
            },

            /**
             * Remove the specified env var from the env object
             * @param {string} key the key of the env var to remove
             */
            removeEnvVar: function(key) {
                if ( this.env.hasOwnProperty(key) ) {
                    delete this.env[key];
                }
            },
            
            /**
            * Process user input to create a new Site
            */
            startSaveSite: function() {
                let vm = this;
                
                if ( !vm.name || vm.name === "" ) {
                    return vm.displayError("Site Name is required");
                }
                if ( !vm.path || vm.path === "" ) {
                    return vm.displayError("Local path to Site is required");
                }
                if ( !vm.command || vm.command === "" ) {
                    return vm.displayError("Site build command is required");
                }
                if ( !vm.url || vm.url === "" ) {
                    return vm.displayError("URL of site is required");
                }

                vm.saving = true;
                saveSite(vm.api, vm.name, vm.path, vm.command, vm.url, vm.env, function(success) {
                    vm.saving = false;
                    if ( !success ) {
                        vm.displayError("Could not add Site to Settings");
                    }
                    else {
                        vm.name = undefined;
                        vm.path = undefined;
                        vm.command = undefined;
                        vm.url = undefined;
                        vm.env = {};
                        vm.$emit('close');
                        vm.$emit('done');
                    }
                });
            },

            /**
            * Display an Error Dialog Message
            * @param {String} msg Dialog Message
            */
            displayError: function(msg) {
                this.dialog = {
                    title: "Error",
                    message: msg,
                    close: "OK"
                };
            }

        }
    }
</script>


<style scoped>
    div.input-row {
        padding: 10px 32px
    }
    div.type-label {
        padding-bottom: 5px;
    }
    div.envvar-input-row, div.envvar-display-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
    }
    div.envvar-input-key, div.envvar-input-value, div.envvar-display-value {
        flex-grow: 1;
    }
    code {
        font-family: monospace;
    }

    .v-button.danger {
        --v-button-color: var(--danger-alt);
        --v-button-background-color: var(--danger);
        --v-button-color-hover: var(--danger-alt);
        --v-button-background-color-hover: var(--danger-125);
    }
</style>