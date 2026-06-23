export const STORAGE_PATHS = {
  // Organization level
  ORG_PROFILE: (orgId: number) => `org-${orgId}/profile`,
  ORG_DOCS: (orgId: number) => `org-${orgId}/documents`,

  // Store level
  STORE_PROFILE: (orgId: number) => `org-${orgId}/stores/profile`,

  STORE_RECEIPTS: (orgId: number) => `org-${orgId}/stores/receipts`,
  DIGITAL_CONFIG: (storeId: number) => `stores/${storeId}/digital-configs`,

  PAYMENT_ICONS: 'payment-icons',

  // Master Data (Shared)
  CATEGORY_ICON: 'master-data/categories',
  BRAND_LOGO: 'master-data/brands',
  SKU_IMAGE: 'master-data/sku',

  // System
  TEMPLATES: 'templates',
};
