<template>
    <Message v-bind:title="title" v-bind:subtitle="message" icon="error" type="danger" />
</template>

<script>
    import Message from './message.vue';

    export default {
        components: { Message },
        
        props: {
            title: {
                type: String,
                required: true
            },
            message: {
                type: String,
                required: true
            }
        }
    }
</script>
