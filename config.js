export default {
  "extension": "directus-extension-publish-netlify",
  "activityFilter": {
    "action": {
      "_nin": ["login", "comment"]
    },
    "collection": {
      "_nin": ["directus_dashboards", "directus_folders", "directus_migrations", "directus_panels", "directus_permissions", "directus_sessions", "directus_settings", "directus_webhooks"]
    }
  },
  "additional_role_ids": [],
  "deploy_history_count": 25
}