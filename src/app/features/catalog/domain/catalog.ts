export interface CatalogService {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  price: number;
  description: string;
  status: 'active' | 'inactive';
}

export interface SaveCatalogServiceRequest {
  name: string;
  categoryId: string;
  price: number;
  description?: string;
}
