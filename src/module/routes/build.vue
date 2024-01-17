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
    <Site v-if="!loading && !setupMessage" 
        v-on:update="update"
        v-on:build="buildRequested = true"
        v-bind:site="site"
        v-bind:publishedDeploy="publishedDeploy"
        v-bind:latestDeploy="latestDeploy"
        v-bind:latestActivity="latestActivity"
        v-bind:isBuilding="isBuilding"
        v-bind:updateAvailable="updateAvailable"
        v-bind:isPublishedLatest="isPublishedLatest" />

    <!-- Deploys Table -->
    <Deploys v-if="!loading && !setupMessage" v-on:update="update"
        v-bind:site="site"
        v-bind:deploys="deploys"
        v-bind:publishedDeploy="publishedDeploy" />

    <!-- Confirmation Dialog -->
    <Dialog v-bind:show="!!dialog" 
        v-bind:title="dialog ? dialog.title : undefined" v-bind:message="dialog ? dialog.message : undefined"
        v-bind:close="dialog ? dialog.close : undefined" v-on:close="dialog = undefined"
        v-bind:action="dialog ? dialog.action : undefined" v-on:action="function() { dialog ? dialog.onAction() : undefined }" />

  </private-view>
</template>

<script>
  import Message from '../components/message.vue';
  import Site from '../components/site.vue';
  import Deploys from '../components/deploys.vue';
  import Dialog from '../components/dialog.vue';
  import { getSite, getDeploys, getLatestDirectusActivity } from '../api';

  export default {
    inject: ['api'],

    components: { Message, Site, Deploys, Dialog },

    data() {
      return {
        loading: true,
        setupTitle: undefined,
        setupMessage: undefined,
        site: undefined,
        deploys: undefined,
        latestActivity: undefined,
        updateTimeout: undefined,
        buildRequested: undefined,
        dialog: undefined
      }
    },

    computed: {

      /**
       * Get the currently published deploy for the site
       */
      publishedDeploy() {
        return this.site ? this.site.published_deploy : undefined;
      },

      /**
       * Get the latest (most recent) 'ready' deploy for the site
       */
      latestDeploy() {
        if ( this.deploys && this.deploys.length > 0 ) {
          for ( let i = 0; i < this.deploys.length; i++ ) {
            if ( this.deploys[i].state === 'ready' ) {
              return this.deploys[i];
            }
          }
        }
      },

      /**
       * Check if the published deploy is the latest deploy
       */
      isPublishedLatest() {
        return this.publishedDeploy && this.latestDeploy ?
           this.publishedDeploy.id === this.latestDeploy.id :
           false;
      },

      /**
       * Check if there is a deploy that is currently being built
       * building = deploy state is not ready or error
       */
      isBuilding() {
        if ( this.deploys ) {
          for ( let i = 0; i < this.deploys.length; i++ ) {
            if ( ! ['ready', 'error'].includes(this.deploys[i].state) ) {
              this.buildRequested = false;
              return true;
            }
          }
        }
        return this.buildRequested;
      },

      /**
       * Check if there is a data update available
       * updateAvailable = when the timestamp of the latest Directus activity is 
       *    greater than the timestamp of the published Netlify deploy
       */
      updateAvailable() {
        return this.latestActivity && this.latestActivity.timestamp && 
           this.publishedDeploy && this.publishedDeploy.created_at ?
           new Date(this.latestActivity.timestamp) > new Date(this.publishedDeploy.created_at) :
           true
      }

    },

    methods: {

      /**
       * Update the Netlify data
       * - Get site from Netlify
       * - Get the site deploys
       */
      async update() {
        if ( this.updateTimeout ) {
          clearTimeout(this.updateTimeout);
        }

        // Get the Site
        try {
          this.site = await getSite(this.api);
          if ( !this.site ) {
            throw new Error("The site could not be retrieved via Netlify API");
          }
        }
        catch (error) {
          return this.displayError("Could not get Netlify site", error);
        }

        // Get the Deploys
        try {
          this.deploys = await getDeploys(this.api);
        }
        catch (error) {
          return this.displayError("Could not get Netlify site deploys", error);
        }

        // Get Latest Directus Activity
        try {
          this.latestActivity = await getLatestDirectusActivity(this.api);
        }
        catch (error) {
          return this.displayError("Could not get Directus activity", error);
        }

        // Set next update timeout
        // Poll more frequently if there is a deploy build in progress
        this.updateTimeout = setTimeout(
          this.update, 
          this.isBuilding ? 2500 : 15000
        );

        this.loading = false;
        this.setupTitle = undefined;
        this.setupMessage = undefined;
        return;
      },

      /**
       * Display a Setup error message
       * @param {String} title Error title
       * @param {String} message Error message
       */
      displayError(title, message) {
        this.dialog = undefined;
        this.loading = false;
        this.setupTitle = title;
        this.setupMessage = message;
      }

    },

    async mounted() {
      this.loading = true;
      await this.update();
    },

    beforeUnmount() {
      if ( this.updateTimeout ) {
        clearTimeout(this.updateTimeout);
      }
    }
  };
</script>