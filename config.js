const extension_name = "dwaring87-publish-netlify";
const collection_name = "dwaring87_publish_netlify";

module.exports = {
    "extension": extension_name,
    "activityFilter": {
        "action": {
            "_neq": "authenticate"
        },
        "collection":  {
            "_neq": collection_name
        }
    },
    "deploy_history_count": 25,
    "extension_path_env_var": "DIRECTUS_EXTENSIONS_PATH"
}