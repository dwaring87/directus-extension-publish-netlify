import config from '../../config.js';
import Build from './routes/build.vue';

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
        }
    ],
    preRegisterCheck: function(user) {
        return user.role.admin_access === true || 
            (user.role.app_access && config.additional_role_ids && config.additional_role_ids.includes(user.role.id));
    }
};