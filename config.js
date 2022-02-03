module.exports = {
    "extension": "dwaring87-publish-netlify",
    "activityFilter": {
        "action": {
            "_nin": ["login", "comment"]
        },
        "collection": {
            "_nin": ["directus_dashboards", "directus_folders", "directus_migrations", "directus_panels", "directus_permissions", "directus_sessions", "directus_settings", "directus_webhooks"]
        }
    },
    "additional_role_ids": [],
    "deploy_history_count": 25,
    "extension_path_env_var": "DIRECTUS_EXTENSIONS_PATH"
}