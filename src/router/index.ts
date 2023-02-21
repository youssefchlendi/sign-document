import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue'
import sig from '../views/SignaturesPage.vue'

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		redirect: '/tabs/signatures'
	},
	{
		path: '/tabs/',
		component: TabsPage,
		children: [
			{
				path: '',
				redirect: '/tabs/signatures'
			},
			
			{
				path: 'signatures',
				component:sig
			},
			{
				path: 'files',
				component: () => import('@/views/FilesPage.vue')
			},
			{
				path: 'settings',
				component: () => import('@/views/SettingsPage.vue')
			}
		]
	},
	{
		path: '/signandpreviewfile/:id',
		name: 'SignAndPreviewFile',
		component: () => import('@/views/SignAndPreviewFile.vue')
	}
]

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
})

export default router
