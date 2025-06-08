import { RouteConfig } from 'vue-router'
import MetaBookListView from '@/views/metabook/MetaBookListView.vue'
import MetaBookDetailView from '@/views/metabook/MetaBookDetailView.vue'
import MetaBookEditView from '@/views/metabook/MetaBookEditView.vue'

export const metabookRoutes: RouteConfig[] = [
  {
    path: '/metabooks',
    name: 'metabooks',
    component: MetaBookListView,
    meta: {
      title: 'Metabooks',
      requiresAuth: true
    }
  },
  {
    path: '/metabooks/create',
    name: 'metabook-create',
    component: MetaBookEditView,
    meta: {
      title: 'Create Metabook',
      requiresAuth: true
    }
  },
  {
    path: '/metabooks/:id',
    name: 'metabook-detail',
    component: MetaBookDetailView,
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/metabooks/:id/edit',
    name: 'metabook-edit',
    component: MetaBookEditView,
    props: true,
    meta: {
      requiresAuth: true
    }
  }
]
