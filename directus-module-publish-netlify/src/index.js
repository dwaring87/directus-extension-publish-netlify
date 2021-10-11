import config from '../../config.js';
import Build from './routes/build.vue';
import Settings from './routes/settings.vue';

export default {
    id: config.extension,
    name: 'Publish',
    icon: 'cloud_upload',
    routes: [
        {
            path: '',
            redirect: '/' + config.extension + '/build'
        },
        {
            path: 'build',
            component: Build
        },
        {
            path: 'settings',
            component: Settings
        }
    ],
    preRegisterCheck: function(user) {
        return user.role.admin_access === true;
    }
};