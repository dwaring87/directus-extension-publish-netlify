<template>
  <private-view title="Settings">
    <template #headline>Publish to Netlify</template>

    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="settings" />
      </v-button>
    </template>

    <!-- Navigation -->
    <template #navigation>
      <v-list nav>
        <v-list-item :to="`/${extension}`" key="settings.build">
          <v-list-item-icon><v-icon name="build" /></v-list-item-icon>
          <v-list-item-content><v-text-overflow text="Build" /></v-list-item-content>
        </v-list-item>
        <v-list-item :to="`/${extension}/settings`" key="settings.settings" active>
          <v-list-item-icon><v-icon name="settings" /></v-list-item-icon>
          <v-list-item-content><v-text-overflow text="Settings" /></v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <div class="settings-card-container">

      <!-- Settings Card -->
      <v-card class="settings-card">

        <!-- Header -->
        <div class="settings-card-header">
          <p><v-icon name="settings"></v-icon>&nbsp;&nbsp;Site Settings</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" style="margin: 25px auto; max-width: 50px">
          <v-progress-circular indeterminate />
        </div>

        <!-- Settings -->
        <v-card-text v-else>
          <h2>Netlify Site:</h2>
          <v-input v-model="netlify_site" :disabled="netlify_source === 'environment'" />
          <p class="details">This is the Netlify ID of the site you will be building</p>

          <h2>Netlify Token:</h2>
          <v-input v-model="netlify_token" :disabled="netlify_source === 'environment'" />
          <p class="details">This is a <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank">Netlify Personal Access Token</a> used to authenticate your account with the Netlify API.</p>

          <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
            <v-button v-on:click="save" v-bind:disabled="netlify_source === 'environment' || !netlify_site || !netlify_token ">
              <v-icon name="save"></v-icon>&nbsp;Save
            </v-button>
          </div>
        </v-card-text>

        <!-- Environment Source -->
        <div class="alert" v-if="netlify_source === 'environment'">
          Settings are loaded from environment variables and cannot be modified here.  To change these settings, update the <code>NETLIFY_SITE</code> and <code>NETLIFY_TOKEN</code> environment variables.
        </div>

      </v-card>

    </div>

  </private-view>
</template>

<script>
  import { getSettings, saveSettings } from '../api';
  import config from '../../../config';

  export default {
    inject: ['api'],

    data() {
      return {
        extension: config?.extension,
        loading: false,
        netlify_site: undefined,
        netlify_token: undefined,
        netlify_source: undefined
      }
    },

    methods: {

      async load() {
        this.loading = true;
        const { site, token, source } = await getSettings(this.api);
        this.netlify_site = site;
        this.netlify_token = token;
        this.netlify_source = source;
        this.loading = false;
      },

      async save() {
        this.loading = true;
        await saveSettings(this.api, this.netlify_site, this.netlify_token);
        await this.load();
        this.loading = false;
      }

    },

    async mounted() {
      this.load();
    }

  }
</script>

<style scoped>
  .settings-card-container {
    padding: 0 15px;
  }
  .settings-card {
    margin: 25px auto;
    box-shadow: 0 2px 3px 2px rgba(0,0,0,0.1);
    transition: 0.3s;
    max-width: 500px !important;
  }
  .settings-card:hover {
    box-shadow: 0 3px 4px 3px rgba(0,0,0,0.1);
  }
  .settings-card-header {
    padding: 5px 10px;
    background-color: var(--success);
    color: var(--success-alt);
  }
  h2 {
    font-size: 110%;
    margin-top: 15px;
    margin-bottom: 5px;
    font-weight: bold;
  }
  p.details {
    font-size: 90%;
    color: #999;
    line-height: 125%;
    margin-top: 5px;
  }
  p.details a {
    text-decoration: underline;
  }
  .alert {
    margin: 15px;
    background-color: var(--warning);
    border-radius: 5px;
    padding: 5px 15px;
  }
</style>