"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
};

type OrderResponse = {
  success: boolean;
  orderId: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // User: Order form states
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderLoading, setOrderLoading] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  // Admin: Add product form states
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [addProductMessage, setAddProductMessage] = useState<string | null>(
    null
  );

  // Admin: Delete product states
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null
  );

  // Admin: Edit product states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
  });
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [editProductMessage, setEditProductMessage] = useState<string | null>(
    null
  );

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("role");

      if (!storedToken) {
        router.push("/login");
        return;
      }

      setToken(storedToken);
      setRole(storedRole);
    }
  }, [router]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch("/api/v1/products?page=1&limit=10", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const result = await response.json();
        setProducts(result.data || []);
      } catch (error) {
        setProductsError("Unable to load products. Please try again.");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (editingProductId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [editingProductId]);

  // ADMIN: Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingProductId) {
        closeEditModal();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [editingProductId]);

  // ADMIN: Handle edit product - open modal
  const handleEditClick = (product: Product) => {
    setEditProduct(product);
    setEditingProductId(product._id);
    setEditFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
    });
    setEditProductMessage(null);
  };

  // ADMIN: Close edit modal
  const closeEditModal = () => {
    setEditingProductId(null);
    setEditProduct(null);
    setEditFormData({ name: "", description: "", price: 0, stock: 0 });
    setEditProductMessage(null);
  };

  // ADMIN: Handle edit modal backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeEditModal();
    }
  };

  // ADMIN: Handle save product
  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token || !editingProductId) {
      setEditProductMessage("Authentication required");
      return;
    }

    if (
      !editFormData.name ||
      !editFormData.description ||
      editFormData.price <= 0 ||
      editFormData.stock < 0
    ) {
      setEditProductMessage("Please fill all fields with valid values");
      return;
    }

    try {
      setIsUpdatingProduct(true);
      const response = await fetch(`/api/v1/products/${editingProductId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Failed to update product");
      }

      // Refresh products list
      const productsResponse = await fetch("/api/v1/products");
      const result = await productsResponse.json();
      setProducts(result.data || []);

      closeEditModal();
    } catch (error) {
      setEditProductMessage(
        error instanceof Error ? error.message : "Failed to update product"
      );
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  // USER: Handle buy product
  const handleBuyProduct = async (productId: string) => {
    const quantity = quantities[productId] || 1;

    if (quantity <= 0) {
      setOrderMessage("Quantity must be at least 1");
      return;
    }

    if (!token) {
      setOrderMessage("Authentication required");
      return;
    }

    try {
      setOrderLoading(productId);
      setOrderMessage(null);

      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Order failed");
      }

      const data: OrderResponse = await response.json();

      if (data.success) {
        setOrderMessage(`Order successful! Order ID: ${data.orderId}`);
        setQuantities((prev) => ({ ...prev, [productId]: 1 }));
      } else {
        setOrderMessage("Order failed. Please try again.");
      }
    } catch (error) {
      setOrderMessage(
        error instanceof Error
          ? error.message
          : "Order failed. Please try again."
      );
    } finally {
      setOrderLoading(null);
    }
  };

  // ADMIN: Handle add product
  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      setAddProductMessage("Authentication required");
      return;
    }

    if (
      !newProduct.name ||
      !newProduct.description ||
      newProduct.price <= 0 ||
      newProduct.stock < 0
    ) {
      setAddProductMessage("Please fill all fields with valid values");
      return;
    }

    console.log(token);
    try {
      setIsAddingProduct(true);
      setAddProductMessage(null);
      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Failed to add product");
      }

      setAddProductMessage("Product added successfully!");
      setNewProduct({ name: "", description: "", price: 0, stock: 0 });

      // Refresh products list
      const productsResponse = await fetch("/api/v1/products");
      const result = await productsResponse.json();
      setProducts(result.data || []);
    } catch (error) {
      setAddProductMessage(
        error instanceof Error ? error.message : "Failed to add product"
      );
    } finally {
      setIsAddingProduct(false);
    }
  };

  // ADMIN: Handle delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!token) {
      alert("Authentication required");
      return;
    }

    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    console.log(productId);
    try {
      setDeletingProductId(productId);
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Failed to delete product");
      }

      // Refresh products list
      const productsResponse = await fetch("/api/v1/products");
      const result = await productsResponse.json();
      setProducts(result.data || []);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete product"
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  // Don't render until auth check is complete
  if (!token || !role) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <header
          style={{
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.875rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              }}
            >
              Dashboard
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Role: <strong>{role}</strong>
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
              }
              router.push("/login");
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Logout
          </button>
        </header>

        {/* ADMIN: Add Product Form */}
        {role === "admin" && (
          <section
            style={{
              backgroundColor: "#ffffff",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              marginBottom: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Add New Product
            </h2>

            {addProductMessage && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: addProductMessage.includes("success")
                    ? "#d1fae5"
                    : "#fef2f2",
                  color: addProductMessage.includes("success")
                    ? "#065f46"
                    : "#b91c1c",
                  fontSize: "0.875rem",
                }}
              >
                {addProductMessage}
              </div>
            )}

            <form onSubmit={handleAddProduct}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    disabled={isAddingProduct}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        description: e.target.value,
                      })
                    }
                    disabled={isAddingProduct}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Price
                  </label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isAddingProduct}
                    min="0"
                    step="0.01"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={isAddingProduct}
                    min="0"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingProduct}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: isAddingProduct ? "#9ca3af" : "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: isAddingProduct ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {isAddingProduct ? "Adding..." : "Add Product"}
              </button>
            </form>
          </section>
        )}

        {/* Products List */}
        <section
          style={{
            backgroundColor: "#ffffff",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            Products
          </h2>

          {isLoadingProducts && (
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Loading products...
            </p>
          )}

          {productsError && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {productsError}
            </div>
          )}

          {!isLoadingProducts && !productsError && products.length === 0 && (
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              No products available.
            </p>
          )}

          {!isLoadingProducts && !productsError && products.length > 0 && (
            <>
              {orderMessage && (
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: orderMessage.includes("successful")
                      ? "#d1fae5"
                      : "#fef2f2",
                    color: orderMessage.includes("successful")
                      ? "#065f46"
                      : "#b91c1c",
                    fontSize: "0.875rem",
                  }}
                >
                  {orderMessage}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                }}
              >
                {products.map((product) => (
                  <div
                    key={product._id}
                    style={{
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <h3
                          style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            marginBottom: "0.25rem",
                          }}
                        >
                          {product.name}
                        </h3>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "#6b7280",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {product.description}
                        </p>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                          }}
                        >
                          Price: ${product.price.toFixed(2)} | Stock:{" "}
                          {product.stock}
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        {/* USER: Buy functionality */}
                        {role === "user" && (
                          <>
                            <input
                              type="number"
                              min="1"
                              max={product.stock}
                              value={quantities[product._id] || 1}
                              onChange={(e) =>
                                setQuantities({
                                  ...quantities,
                                  [product._id]: parseInt(e.target.value) || 1,
                                })
                              }
                              disabled={orderLoading === product._id}
                              style={{
                                width: "80px",
                                padding: "0.5rem",
                                borderRadius: "0.5rem",
                                border: "1px solid #d1d5db",
                                fontSize: "0.875rem",
                              }}
                            />
                            <button
                              onClick={() => handleBuyProduct(product._id)}
                              disabled={
                                orderLoading === product._id ||
                                product.stock === 0
                              }
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor:
                                  orderLoading === product._id ||
                                  product.stock === 0
                                    ? "#9ca3af"
                                    : "#2563eb",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "0.5rem",
                                cursor:
                                  orderLoading === product._id ||
                                  product.stock === 0
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                              }}
                            >
                              {orderLoading === product._id
                                ? "Buying..."
                                : "Buy"}
                            </button>
                          </>
                        )}

                        {/* ADMIN: Edit & Delete functionality */}
                        {role === "admin" && (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleEditClick(product)}
                              disabled={editingProductId !== null}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor:
                                  editingProductId !== null
                                    ? "#9ca3af"
                                    : "#3b82f6",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "0.5rem",
                                cursor:
                                  editingProductId !== null
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              disabled={deletingProductId === product._id}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor:
                                  deletingProductId === product._id
                                    ? "#9ca3af"
                                    : "#ef4444",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "0.5rem",
                                cursor:
                                  deletingProductId === product._id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                              }}
                            >
                              {deletingProductId === product._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ADMIN: Edit Product Modal */}
        {editingProductId && (
          <div
            onClick={handleBackdropClick}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "2rem",
                borderRadius: "0.75rem",
                boxShadow: "0 20px 25px rgba(0, 0, 0, 0.15)",
                maxWidth: "500px",
                width: "90%",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Edit Product
                </h2>
                <button
                  onClick={closeEditModal}
                  disabled={isUpdatingProduct}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: isUpdatingProduct ? "not-allowed" : "pointer",
                    color: "#6b7280",
                    padding: "0",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>

              {/* Error/Success Message */}
              {editProductMessage && (
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: editProductMessage.includes("successfully")
                      ? "#d1fae5"
                      : "#fef2f2",
                    color: editProductMessage.includes("successfully")
                      ? "#065f46"
                      : "#b91c1c",
                    fontSize: "0.875rem",
                  }}
                >
                  {editProductMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveProduct}>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    disabled={isUpdatingProduct}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                      backgroundColor: isUpdatingProduct
                        ? "#f3f4f6"
                        : "#ffffff",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        description: e.target.value,
                      })
                    }
                    disabled={isUpdatingProduct}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                      backgroundColor: isUpdatingProduct
                        ? "#f3f4f6"
                        : "#ffffff",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Price
                  </label>
                  <input
                    type="number"
                    value={editFormData.price}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isUpdatingProduct}
                    min="0"
                    step="0.01"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                      backgroundColor: isUpdatingProduct
                        ? "#f3f4f6"
                        : "#ffffff",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Stock
                  </label>
                  <input
                    type="number"
                    value={editFormData.stock}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={isUpdatingProduct}
                    min="0"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                      backgroundColor: isUpdatingProduct
                        ? "#f3f4f6"
                        : "#ffffff",
                    }}
                  />
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isUpdatingProduct}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#e5e7eb",
                      color: "#374151",
                      border: "none",
                      borderRadius: "0.5rem",
                      cursor: isUpdatingProduct ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProduct}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: isUpdatingProduct
                        ? "#9ca3af"
                        : "#10b981",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.5rem",
                      cursor: isUpdatingProduct ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    {isUpdatingProduct ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
