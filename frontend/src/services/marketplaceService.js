import api from './api';

// Category mapping: Frontend to Backend
const CATEGORY_MAP = {
  'Electronics': 'electronics',
  'Fashion': 'clothing',
  'Home & Garden': 'home',
  'Sports & Outdoors': 'sports',
  'Toys & Games': 'toys',
  'Books & Media': 'books',
  'Automotive': 'automotive',
  'Health & Beauty': 'beauty',
  'Food & Beverages': 'food',
  'Office Supplies': 'other',
  'Pet Supplies': 'pets',
  'Jewelry & Accessories': 'clothing',
  'Art & Crafts': 'art',
  'Music Instruments': 'music',
  'Baby & Kids': 'toys',
  'Tools & Hardware': 'home',
  'Furniture': 'home',
  'Collectibles': 'other',
  'Other': 'other',
  // Gaming
  'Gaming': 'games'
};

// Reverse mapping: Backend to Frontend
const CATEGORY_REVERSE_MAP = {
  'electronics': 'Electronics',
  'clothing': 'Fashion',
  'home': 'Home & Garden',
  'sports': 'Sports & Outdoors',
  'toys': 'Toys & Games',
  'books': 'Books & Media',
  'automotive': 'Automotive',
  'beauty': 'Health & Beauty',
  'pets': 'Pet Supplies',
  'food': 'Food & Beverages',
  'music': 'Music Instruments',
  'art': 'Art & Crafts',
  'games': 'Gaming',
  'health': 'Health & Beauty',
  'other': 'Other'
};

// Condition mapping
const CONDITION_MAP = {
  'New': 'new',
  'Used': 'good', // Map "Used" to "good" condition
  'Like New': 'like_new',
  'Excellent': 'excellent',
  'Good': 'good',
  'Fair': 'fair',
  'Poor': 'poor'
};

const CONDITION_REVERSE_MAP = {
  'new': 'New',
  'like_new': 'Like New',
  'excellent': 'Excellent',
  'good': 'Good',
  'fair': 'Fair',
  'poor': 'Poor'
};

/**
 * Map frontend category to backend category
 */
export const mapCategoryToBackend = (frontendCategory) => {
  return CATEGORY_MAP[frontendCategory] || 'other';
};

/**
 * Map backend category to frontend category
 */
export const mapCategoryToFrontend = (backendCategory) => {
  return CATEGORY_REVERSE_MAP[backendCategory] || 'Other';
};

/**
 * Map frontend condition to backend condition
 */
export const mapConditionToBackend = (frontendCondition) => {
  return CONDITION_MAP[frontendCondition] || 'good';
};

/**
 * Map backend condition to frontend condition
 */
export const mapConditionToFrontend = (backendCondition) => {
  return CONDITION_REVERSE_MAP[backendCondition] || 'Good';
};

/**
 * Format product from backend to frontend
 */
const formatProduct = (backendProduct) => {
  return {
    id: backendProduct.id,
    name: backendProduct.name,
    image: backendProduct.images && backendProduct.images.length > 0 
      ? backendProduct.images[0] 
      : 'https://picsum.photos/seed/placeholder/300/300',
    images: backendProduct.images || [],
    category: mapCategoryToFrontend(backendProduct.category),
    price: parseFloat(backendProduct.price),
    originalPrice: null, // Not in backend schema
    rating: 4.5, // Not in backend schema yet
    reviewCount: 0, // Not in backend schema yet
    seller: backendProduct.seller?.name || 'Unknown Seller',
    sellerId: backendProduct.seller_id,
    sellerSlug: backendProduct.seller?.slug,
    sellerAvatar: backendProduct.seller?.avatar,
    isNew: backendProduct.status === 'active',
    stock: backendProduct.stock,
    condition: mapConditionToFrontend(backendProduct.condition),
    description: backendProduct.description,
    location: backendProduct.location,
    isFavorited: backendProduct.is_favorited || false,
    createdAt: backendProduct.created_at,
    updatedAt: backendProduct.updated_at
  };
};

// ==================== PRODUCT APIs ====================

/**
 * Get list of products with filters
 */
export const getProducts = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', mapCategoryToBackend(filters.category));
    if (filters.condition) params.append('condition', mapConditionToBackend(filters.condition));
    if (filters.minPrice) params.append('min_price', filters.minPrice);
    if (filters.maxPrice) params.append('max_price', filters.maxPrice);
    if (filters.sellerId) params.append('seller_id', filters.sellerId);
    params.append('page', filters.page || 1);
    params.append('page_size', filters.pageSize || 20);

    const response = await api.get(`/api/marketplace/products?${params}`);
    
    return {
      products: response.data.products.map(formatProduct),
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.page_size
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Get single product by ID
 */
export const getProduct = async (productId) => {
  try {
    const response = await api.get(`/api/marketplace/products/${productId}`);
    return formatProduct(response.data);
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

/**
 * Create new product
 */
export const createProduct = async (productData) => {
  try {
    const payload = {
      name: productData.name,
      description: productData.description,
      price: parseFloat(productData.price),
      stock: parseInt(productData.stock),
      condition: mapConditionToBackend(productData.condition),
      category: productData.categories && productData.categories.length > 0
        ? mapCategoryToBackend(productData.categories[0]) // Use first category
        : 'other',
      images: productData.images || [], // Array of image URLs
      location: productData.location || null
    };

    const response = await api.post('/api/marketplace/products', payload);
    return formatProduct(response.data);
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update product
 */
export const updateProduct = async (productId, productData) => {
  try {
    const payload = {};
    
    if (productData.name !== undefined) payload.name = productData.name;
    if (productData.description !== undefined) payload.description = productData.description;
    if (productData.price !== undefined) payload.price = parseFloat(productData.price);
    if (productData.stock !== undefined) payload.stock = parseInt(productData.stock);
    if (productData.condition !== undefined) payload.condition = mapConditionToBackend(productData.condition);
    if (productData.category !== undefined) payload.category = mapCategoryToBackend(productData.category);
    if (productData.images !== undefined) payload.images = productData.images;
    if (productData.location !== undefined) payload.location = productData.location;
    if (productData.status !== undefined) payload.status = productData.status;

    const response = await api.patch(`/api/marketplace/products/${productId}`, payload);
    return formatProduct(response.data);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (productId) => {
  try {
    await api.delete(`/api/marketplace/products/${productId}`);
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// ==================== FAVORITES APIs ====================

/**
 * Add product to favorites
 */
export const addToFavorites = async (productId) => {
  try {
    const response = await api.post(`/api/marketplace/products/${productId}/favorite`);
    return response.data;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

/**
 * Remove product from favorites
 */
export const removeFromFavorites = async (productId) => {
  try {
    const response = await api.delete(`/api/marketplace/products/${productId}/favorite`);
    return response.data;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
};

/**
 * Get user's favorite products
 */
export const getFavorites = async (page = 1, pageSize = 20) => {
  try {
    const response = await api.get(`/api/marketplace/favorites?page=${page}&page_size=${pageSize}`);
    return {
      products: response.data.products.map(formatProduct),
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.page_size
    };
  } catch (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }
};

// ==================== CART APIs ====================

/**
 * Format cart item from backend
 */
const formatCartItem = (backendItem) => {
  return {
    id: backendItem.id,
    productId: backendItem.product_id,
    name: backendItem.product.name,
    image: backendItem.product.images && backendItem.product.images.length > 0
      ? backendItem.product.images[0]
      : 'https://picsum.photos/seed/placeholder/300/300',
    price: parseFloat(backendItem.product.price),
    quantity: backendItem.quantity,
    seller: backendItem.product.seller?.name || 'Unknown Seller',
    sellerId: backendItem.product.seller_id,
    stock: backendItem.product.stock,
    subtotal: backendItem.subtotal,
    addedAt: backendItem.added_at,
    product: formatProduct(backendItem.product)
  };
};

/**
 * Get shopping cart
 */
export const getCart = async () => {
  try {
    const response = await api.get('/api/marketplace/cart');
    return {
      items: response.data.items.map(formatCartItem),
      totalItems: response.data.total_items,
      totalPrice: response.data.total_price
    };
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
};

/**
 * Add product to cart
 */
export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await api.post('/api/marketplace/cart', {
      product_id: productId,
      quantity: quantity
    });
    return formatCartItem(response.data);
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItemQuantity = async (cartItemId, quantity) => {
  try {
    const response = await api.patch(`/api/marketplace/cart/${cartItemId}`, {
      quantity: quantity
    });
    return formatCartItem(response.data);
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (cartItemId) => {
  try {
    await api.delete(`/api/marketplace/cart/${cartItemId}`);
    return true;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
};

/**
 * Clear entire cart
 */
export const clearCart = async () => {
  try {
    await api.delete('/api/marketplace/cart');
    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
};

export default {
  // Products
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  // Favorites
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  // Cart
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  // Helpers
  mapCategoryToBackend,
  mapCategoryToFrontend,
  mapConditionToBackend,
  mapConditionToFrontend
};
