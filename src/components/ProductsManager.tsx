import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";
import { listCategories } from "../services/categoriesService";
import { getSettings } from "../services/settingsService";
import {
  addProduct,
  listProducts,
  setProductActive,
  updateProduct,
} from "../services/productsService";
import type { Category, Product } from "../types";
import { fileToDataUrl } from "../utils/image";
import { formatMoney } from "../utils/money";

export function ProductsManager() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("₱");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [productList, categoryList, settings] = await Promise.all([
        listProducts(),
        listCategories(),
        getSettings(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
      setCurrency(settings.currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (products === null) return null;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";
  const noCategories = categories.length === 0;

  return (
    <>
      <div className="list-toolbar">
        <Button onClick={() => setEditing("new")} disabled={noCategories}>
          + Add product
        </Button>
      </div>

      {noCategories && (
        <div className="banner banner--success" style={{ marginBottom: "var(--space-4)" }}>
          Add a category first (in the Categories tab), then come back here to add products.
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon="☕"
          title="No products yet"
          description="Add your first product — a coffee, a pastry, anything you sell from the cart."
        />
      ) : (
        <Card style={{ padding: 0 }}>
          {products.map((product) => (
            <div className="list-row" key={product.id}>
              <div className="list-row__thumb" aria-hidden="true">
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                  />
                ) : (
                  "☕"
                )}
              </div>
              <div className="list-row__main">
                <div className="list-row__title">
                  {product.name}
                  {!product.active && <span className="badge badge--inactive"> Inactive</span>}
                </div>
                <div className="list-row__subtitle">
                  {categoryName(product.categoryId)} · {formatMoney(product.price, currency)}
                </div>
              </div>
              <div className="list-row__actions">
                <button
                  className="icon-btn"
                  aria-label="Edit product"
                  onClick={() => setEditing(product)}
                >
                  ✎
                </button>
                <button
                  className="icon-btn"
                  aria-label={product.active ? "Deactivate product" : "Reactivate product"}
                  onClick={() =>
                    setProductActive(product.id, !product.active).then(refresh)
                  }
                >
                  {product.active ? "⏸" : "▶"}
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}

function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ?? categories[0]?.id ?? "",
  );
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [image, setImage] = useState<string | undefined>(product?.image);
  const [active, setActive] = useState(product?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      setFormError("Could not read that image. Try a different file.");
    }
  }

  async function handleSave() {
    const parsedPrice = Number(price);
    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!categoryId) {
      setFormError("Choose a category.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Enter a valid price (0 or more).");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (product) {
        await updateProduct(product.id, {
          name: name.trim(),
          categoryId,
          price: parsedPrice,
          image,
        });
        if (active !== product.active) {
          await setProductActive(product.id, active);
        }
      } else {
        await addProduct({ name: name.trim(), categoryId, price: parsedPrice, image });
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={product ? "Edit product" : "Add product"} onClose={onClose}>
      <div className="field">
        <label className="field__label" htmlFor="product-name">
          Name
        </label>
        <input
          id="product-name"
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Iced Caramel Latte"
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="product-category">
          Category
        </label>
        <select
          id="product-category"
          className="field__select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="product-price">
          Price
        </label>
        <input
          id="product-price"
          className="field__input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
        {product && (
          <span className="field__hint">
            Changing the price only affects new sales — past sales keep the price they were
            recorded at.
          </span>
        )}
      </div>

      <div className="field">
        <span className="field__label">Photo (optional)</span>
        <div className="image-picker">
          <img
            src={image ?? undefined}
            alt=""
            className="image-picker__preview"
            style={{ display: image ? "block" : "none" }}
          />
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>
      </div>

      {product && (
        <div className="field">
          <div className="toggle-row">
            <span className="field__label">Available on POS</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
          </div>
        </div>
      )}

      {formError && <div className="field__error">{formError}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
