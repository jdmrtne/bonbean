import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { Modal } from "./Modal";
import { ArrowDownIcon, ArrowUpIcon, FolderIcon, PencilIcon } from "./Icon";
import {
  addCategory,
  listCategories,
  moveCategory,
  updateCategory,
} from "../services/categoriesService";
import type { Category } from "../types";

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setCategories(await listCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories");
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

  if (categories === null) return <LoadingState label="Loading categories…" />;

  return (
    <>
      <div className="list-toolbar">
        <Button onClick={() => setEditing("new")}>+ Add category</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderIcon size={28} />}
          title="No categories yet"
          description="Add a category (like Coffee, Snacks, or Cold Drinks) to start grouping products."
        />
      ) : (
        <Card style={{ padding: 0 }}>
          {categories.map((category, index) => (
            <div className="list-row" key={category.id}>
              <div className="list-row__main">
                <div className="list-row__title">
                  {category.name}
                  {!category.active && <span className="badge badge--inactive"> Inactive</span>}
                </div>
              </div>
              <div className="list-row__actions">
                <button
                  className="icon-btn"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => moveCategory(category.id, "up").then(refresh)}
                >
                  <ArrowUpIcon size={15} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Move down"
                  disabled={index === categories.length - 1}
                  onClick={() => moveCategory(category.id, "down").then(refresh)}
                >
                  <ArrowDownIcon size={15} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Edit category"
                  onClick={() => setEditing(category)}
                >
                  <PencilIcon size={15} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <CategoryFormModal
          category={editing === "new" ? null : editing}
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

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [active, setActive] = useState(category?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setFormError("Category name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (category) {
        await updateCategory(category.id, { name: name.trim(), active });
      } else {
        await addCategory({ name: name.trim() });
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={category ? "Edit category" : "Add category"} onClose={onClose}>
      <div className="field">
        <label className="field__label" htmlFor="category-name">
          Name
        </label>
        <input
          id="category-name"
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Coffee"
          autoFocus
        />
      </div>

      {category && (
        <div className="field">
          <div className="toggle-row">
            <span className="field__label">Available for sale</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
          </div>
          <span className="field__hint">
            Turning this off hides the category and its products from the POS screen,
            without deleting anything.
          </span>
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
