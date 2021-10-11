# Directus API Endpoint: dwaring87-publish-node

The custom API endpoints for initiating and monitoring a build of static site.

## API Endpoints

### Start Build

`GET` `/dwaring87-publish-node/build/:site`

- `site`: the ID number of the site stored in the extension's settings (see the module's settings page to get the ID number)

This will run the saved npm build script and return when complete with either an error or success response:

- `{error: "Error message"}`
- `{success: "Site successfully published"}`

### Get Status

`GET` `/dwaring87-publish-node/status/:site`

- `site`: the ID number of the site stored in the extension's settings (see the module's settings page to get the ID number)

This will return the status and log contents of the specified site or an error response:

- `{error: "Error message"}`
- `{status: "Site status", timestamp: timestamp in ms, log: logContents}`

### Authentication

Both endpoints require an [authenticated user](https://docs.directus.io/reference/api/authentication/) with admin access.
