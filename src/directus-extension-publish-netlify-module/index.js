import BuildComponent from './routes/build.vue';
import config from '../../config';

export default {
  id: config.extension,
  name: 'Publish',
  icon: 'cloud_upload',
  routes: [
    {
      path: '',
      component: BuildComponent,
    },
  ],
  preRegisterCheck(user) {
		// Allow access to the module if:
		// - the user has admin access OR
		// - the user has app access AND the user's rols id is defined in the extension's config of additional role ids
		const has_admin_access = user.admin_access || user.role.admin_access;
		const has_app_access = user.app_access || user.role.app_access;
		const config_additional_roles = config.additional_role_ids || [];
    return has_admin_access || (has_app_access && config_additional_roles.includes(user.role.id));
  }
};
