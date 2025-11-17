import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import ProfileHero from '../../components/Profile/ProfileHero';
import Product from './Product';
import ProductProfile from './ProductProfile';
import marketplaceService from '../../services/marketplaceService';
import './Market.css';

function Market() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { translate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [page, searchQuery]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters = {
        search: searchQuery || undefined,
        page: page,
        pageSize: 20
      };

      const response = await marketplaceService.getProducts(filters);
      
      if (page === 1) {
        setProducts(response.products);
      } else {
        setProducts(prev => [...prev, ...response.products]);
      }
      
      setTotalProducts(response.total);
      setHasMore(response.products.length === 20);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.detail || 'Failed to load products');
      // Show empty state instead of keeping old data
      if (page === 1) {
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products;

  const handleNewProduct = () => {
    navigate('/marketplace/new');
  };

  const handleProductClick = async (product) => {
    try {
      // Fetch fresh product data
      const fullProduct = await marketplaceService.getProduct(product.id);
      setSelectedProduct(fullProduct);
    } catch (err) {
      console.error('Error loading product:', err);
      // Fallback to current product data
      setSelectedProduct(product);
    }
  };

  const handleCloseProductProfile = () => {
    setSelectedProduct(null);
    // Refresh products to get updated favorite/cart status
    fetchProducts();
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page when searching
    fetchProducts();
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (!e.target.value) {
      // If search cleared, reset page and fetch
      setPage(1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="market-layout">
      {/* Left Sidebar */}
      <aside className="market-sidebar">
        <ProfileHero />
      </aside>

      {/* Main Content */}
      <main className="market-main">
        <div className="market-header">
          <div className="market-header-top">
            <h1 className="market-title">{translate('marketplace.title')}</h1>
            <button
              className="btn-cart"
              onClick={() => navigate('/marketplace/cart')}
              aria-label="Shopping cart"
            >
              <i className="fas fa-shopping-cart"></i>
            </button>
          </div>
          
          <div className="market-controls">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="search-input"
                placeholder={translate('marketplace.searchProducts')}
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchQuery ? (
                <button
                  className="clear-search"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <i className="fas fa-times"></i>
                </button>
              ) : (
                <button
                  className="search-button"
                  onClick={handleSearch}
                  aria-label="Search"
                  disabled={isLoading}
                >
                  {translate('marketplace.search')}
                </button>
              )}
            </div>
            
            <button
              className="btn-new-product"
              onClick={handleNewProduct}
            >
              <i className="fas fa-plus"></i>
              {translate('marketplace.newProduct')}
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="results-info">
          {isLoading && page === 1 ? (
            <p>
              <i className="fas fa-spinner fa-spin"></i> {translate('marketplace.loading')}
            </p>
          ) : error ? (
            <p className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </p>
          ) : searchQuery ? (
            <p>
              {translate('marketplace.found')} <strong>{totalProducts}</strong> {totalProducts === 1 ? translate('marketplace.product') : translate('marketplace.products')} 
              {` ${translate('marketplace.for')} "${searchQuery}"`}
            </p>
          ) : (
            <p>
              {translate('marketplace.showing')} <strong>{totalProducts}</strong> {translate('marketplace.products')}
            </p>
          )}
        </div>

        {/* Products Grid */}
        {isLoading && page === 1 ? (
          <div className="products-loading">
            <i className="fas fa-spinner fa-spin fa-3x"></i>
            <p>{translate('marketplace.loading')}</p>
          </div>
        ) : error && page === 1 ? (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>{translate('marketplace.failedToLoad')}</h3>
            <p>{error}</p>
            <button
              className="btn-retry"
              onClick={() => fetchProducts()}
            >
              <i className="fas fa-redo"></i>
              {translate('marketplace.tryAgain')}
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="products-grid">
              {filteredProducts.map(product => (
                <Product 
                  key={product.id} 
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && filteredProducts.length < totalProducts && (
              <div className="load-more-container">
                <button
                  className="btn-load-more"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      {translate('marketplace.loadingProduct')}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-arrow-down"></i>
                      {translate('marketplace.loadMore')}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-results">
            <i className="fas fa-search"></i>
            <h3>{translate('marketplace.noProductsFound')}</h3>
            <p>{translate('marketplace.tryAdjusting')}</p>
            {searchQuery && (
              <button
                className="btn-clear-filters"
                onClick={handleClearSearch}
              >
                {translate('marketplace.clearSearch')}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Product Profile Modal */}
      {selectedProduct && (
        <ProductProfile
          product={selectedProduct}
          onClose={handleCloseProductProfile}
        />
      )}
    </div>
  );
}

export default Market;
