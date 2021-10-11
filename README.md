# Directus Extension: dwaring87-publish-node

A Directus v9 Extension (including a frontend app module and a backend API endpoint) for initiating and monitoring a build of a static site using an npm package script on a locally installed source.

![Main Module Interface](https://user-images.githubusercontent.com/7526014/134442837-649dda76-b7b7-47b1-a4f3-06bc805e5303.jpeg)

## Use Case

This was developed to make it easier for an admin user of the Directus app to start a build of a static site generator (such as gatsby, gridsome, etc) after data in Directus has been updated.  One or more sites (locally installed node packages) can be added, each with its own local source path and npm package script used to build the site.  The extension will keep track of when the site was last updated and if there have been any data updates in Directus since the last update.

## Installation

This repository includes two extensions (packaged as npm workspaces): 

- **directus-module-publish-node:** A frontend app module that the allows the user to manage sites and intitiate builds
- **directus-endpoint-publish-node:** A backend API endpoint that is used to intiate the build process and retrieve the build logs

### Install

Install the node dependencies:

```
npm install
```

### Build

The app module needs to be built from source (using rollup) before it can be deployed.  To use the included `build` script:

```
npm run build
```

### Deploy

The (built) app module and API endpoint need to be installed in the Directus extensions directory (by default `./extensions/modules` and `./extensions/endpoints`).  First, set the `DIRECTUS_EXTENSIONS_PATH` environment variable to the path of the Directus extensions directory (either directly or by setting it in a .env file in the repository root directory).  Then, use the included `deploy` script to copy the appropriate files:

```
DIRECTUS_EXTENSIONS_PATH=/directus/extensions npm run deploy
```

To manually install the extensions into Directus, copy:

- `./config.js` --> `/directus/extensions/endpoints/dwaring87-publish-node/config.js`
- `./directus-endpoint-publish-node/src/index.js` --> `/directus/extensions/endpoints/dwaring87-publish-node/index.js`
- `./directus-module-publish-node/dist/index.js` --> `/directus/extensions/modules/dwaring87-publish-node/index.js`

## Usage

### Setup

To add and configure a new site, go to the module's Settings page and click the add/plus button in the top right corner.  Fill out the form with the site's display name, the URL used to view the site, the path to the site's source code directory, and the npm package build script (executed with `npm run`).  If the build requires any environment variables to be set, they can be added here.

![Add New Site Form](https://user-images.githubusercontent.com/7526014/134501221-b2c88265-1780-4f73-8b9f-7dcc57b2e66e.jpeg)

### Build

To build a site, go to the module's Build Sites page.  This will list all of the configured sites, along with their Status (Created, Building, Published, or Build Failed), and when they were last updated.  The extension will keep track of the most recent Directus activity item when the Site is published and flag sites as having an update available if there has been more recent activity since the site was last published.

To start a build, just click the Build button for the site.  The module will monitor the progress of the build and update the status when complete (or display an error message if an error was encountered).

![Build started for a site](https://user-images.githubusercontent.com/7526014/134502238-bb5bbf6c-7200-4123-b5da-540b0c4d6dea.jpeg)

The output from the build script is captured in a log file, and can be viewed directly from the module's Build Sites page.

![Site build log displayed](https://user-images.githubusercontent.com/7526014/134502442-30d7fc01-68dc-485b-94c4-eb66e09d9700.jpeg)
