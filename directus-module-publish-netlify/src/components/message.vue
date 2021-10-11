<template>
    <div class="container">
        <v-info v-bind:icon="icon" v-bind:title="title" v-bind:type="type">{{ subtitle }}</v-info>
        <br />
        <v-notice v-if="!!$slots.default" type="info"><slot></slot></v-notice>
    </div>
</template>

<script>
    export default {
        props: {
            title: { 
                type: String, 
                required: true 
            },
            subtitle: String,
            icon: {
                type: String,
                default: 'info'
            },
            type: {
                type: String,
                default: 'warning'
            }
        }
    }
</script>

<style scoped>
    div.container {
        max-width: 500px;
        margin: 25px auto;
        text-align: center;
    }
</style>