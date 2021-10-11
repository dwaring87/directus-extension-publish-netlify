<template>
    <v-dialog v-model="show" persistent>
        <v-card>
            <v-card-title>{{ title }}</v-card-title>
            <v-card-text v-html="message"></v-card-text>
            <v-card-actions>
                <v-button outlined v-if="close" v-on:click="this.$emit('close')">{{ close }}</v-button>
                <v-button v-if="action" v-on:click="this.$emit('action')">{{ action }}</v-button>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>


<script>
    export default {
        props: {
            show: {
                type: Boolean,
                default: false
            },
            title: String,
            message: String,
            close: {
                type: String,
                default: undefined,
            },
            action: {
                type: String,
                default: undefined
            }
        }
    }
</script>
