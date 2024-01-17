
# Directus Extension: directus-extension-publish-netlify

A Directus Extension bundle (including a frontend app module and backend API endpoints) for managing builds and deploys of a Netlify site.

![Main Module Interface](https://user-images.githubusercontent.com/7526014/137394029-05ac81cb-d985-4e47-8e8a-56a9e75dda6d.png)

## Use Case

This was developed to make it easier for an admin user of the Directus app to start a build of a static site generator (such as gatsby, gridsome, etc) on Netlify after data in Directus has been updated. The extension will keep track of when the site was last updated and if there have been any data updates in Directus since the last update.  The user can start a new Netlify build and manage the published deploy directly from within Directus.

## Installation

For the most up-to-date information about installing extensions, see the [Directus Docs](https://docs.directus.io/extensions/installing-extensions.html).

1) Clone the repository into the Directus extensions directory

```
git clone https://github.com/dwaring87/directus-extension-publish-netlify /PATH_TO_DIRECTUS/extensions/directus-extension-publish-netlify
```

2) Install dependencies

```
cd /PATH_TO_DIRECTUS/extensions/directus-extension-publish-netlify
npm install
```

3) Build the Extension

```
npm run build
```

4) Restart Directus

## Configuration

Some advanced configuration options can be set in the `config.js` file before the extension is built and deployed:

```js
export default {
    "extension":  "directus-extension-publish-netlify",
    "activityFilter": {
        "action": {
            "_nin": ["login", "comment"]
        },
        "collection": {
            "_nin": ["directus_dashboards", "directus_folders", "directus_migrations", "directus_panels", "directus_permissions", "directus_sessions", "directus_settings", "directus_webhooks"]
        }
    },
    "additional_role_ids": ["bdc0ea73-1b18-4a2a-a2dd-dc5c6d139810"],
    "deploy_history_count":  25
}
```

### Activity Filter

The `activityFilter` object is passed to the `GET` `/activity` Directus API endpoint when determining the ID of the last activity item to compare to the stored activity ID associated with the most recent Netlify build.  When the ID of the last activity item is greater than the stored activity ID of the most recent Netlify build, the module will indicate that updates are available (ie, data in the database has been updated since the last build).

By default, the module will exclude any login and comment activity, as well as any changes to most of the internal Directus tables.  You can modify the `activityFilter` to include additional tables to exclude when checking if an update is suggested.

### Enabled Roles

By default, the module is available in the Directus app to any user associated with a Directus role that has **Admin Access** enabled.  If you want to enable the module for non-admin roles:

- Add the **Role ID** to the `additional_role_ids` array
    - You need to add the _ID_ of the role and _not_ the name.  You can get the ID from the `directus_roles` table or from the URL of the Role Settings page (ie, `/admin/settings/roles/{id}`).
- Ensure the role has **full read access** to the **Directus Activity** table.
	- The module checks the activity table to see if there has been a data change since the most recent Netlify build
	- By default, roles with _App Access_ have limited read access to the activity table (filtered to include only activity of their own account)
	- Without full read access, the module will not indicate that updates are available if changes were made by another user
- Rebuild and Redeploy the extension
- Restart Directus

### Deploy History

By default, the module will display the last 25 Netlify builds in the Deploys table.  You can modify the `deploy_history_count` property to change the max number of deploys displayed.

## Usage

### Setup

There are two environment variables that need to be set before the extension can be used:

- **`NETLIFY_SITE`:** the name of the Netlify site (the part before `.netlify.app`) to manage with the extension
- **`NETLIFY_TOKEN`:** a Netlify personal access token used to interact with the Netlify API (User Settings -> Applications -> Personal access tokens -> New access token)

### Enable

The custom module will need to be first enabled in the Directus app's settings.  Go to the **Settings** module, **Settings** page, and enable the *Publish, /directus-extension-publish-netlify* module in the **Modules** section.

### Build

To build a site, go to the module's Build Site page.  This will display basic information about the configured Netlify site, including information on its published deploy. To start a build, just click the Build button.  This will trigger a build on Netlify and its status will be monitored within Directus.

If auto-publishing is enabled, the new deploy will be published (if the build is successful).  When auto-publishing is disabled, a new build will be created but not published.  When the build is complete, you can preview the build by viewing the specific deploy and then choose to publish the new deploy.

![Build Running](https://user-images.githubusercontent.com/7526014/137395847-edccced9-0459-4a0e-bb61-7eda7eda604e.png)

The Deploys table lists the 25 most recent deploys for the site.  Each deploy can be viewed and chosen as the new published deploy.

![Deploys Table](https://user-images.githubusercontent.com/7526014/137396368-d55441ad-da1a-4904-b191-ca1a616082da.png)
