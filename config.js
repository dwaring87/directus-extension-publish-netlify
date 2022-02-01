const extension_name = "dwaring87-publish-netlify";

module.exports = {
    "extension": extension_name,
    "activityFilter": {
        "action": {
            "_nin": ["login", "comment"]
        },
        "collection": {
            "_nin": ["directus_dashboards", "directus_folders", "directus_migrations", "directus_panels", "directus_sessions", "directus_settings", "directus_webhooks"]
        }
    },
    "deploy_history_count": 25,
    "extension_path_env_var": "DIRECTUS_EXTENSIONS_PATH"
}