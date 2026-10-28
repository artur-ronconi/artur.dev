"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { ChoiceField, type ChoiceOption } from "@/components/admin/choice-field";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { useCsrf } from "@/components/admin/csrf";
import { ImageField } from "@/components/admin/image-field";
import { ListField } from "@/components/admin/list-field";
import { MediaField } from "@/components/admin/media-field";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import type { MediaItem } from "@/lib/media";
import { cn, slugify } from "@/lib/utils";
import type { ActionResult } from "@/server/actions/result";

export type FieldDef = {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "checkbox"
    | "select"
    | "tags"
    | "url"
    | "slug"
    /** Cor em hexadecimal, com seletor. */
    | "color"
    /** Lista de itens (bullet points). */
    | "list"
    /** Uma imagem, com upload. */
    | "image"
    /** Galeria de fotos e vídeos. */
    | "media"
    /** Seleção múltipla entre `options`. */
    | "choices";
  options?: ChoiceOption[];
  /** Para `image`: formato da prévia. */
  shape?: "wide" | "square";
  /** Para `list`: texto do botão de adicionar. */
  addLabel?: string;
  /** Para `choices`: link para a tela onde as opções são cadastradas. */
  manage?: { href: string; label: string };
  required?: boolean;
  description?: string;
  placeholder?: string;
  /** Fills a slug field automatically from this other field. */
  slugFrom?: string;
  full?: boolean;
};

type Entity = Record<string, unknown> & { id: string };

/**
 * Reusable list + inline form for the simpler admin entities (technologies,
 * categories, experiences, certifications, links). Each page only describes its
 * fields and plugs in its server actions.
 */
export function CrudManager({
  title,
  description,
  items,
  fields,
  emptyValue,
  onSave,
  onDelete,
  renderItem,
  addLabel = "Adicionar",
}: {
  title: string;
  description?: string;
  items: Entity[];
  fields: FieldDef[];
  emptyValue: Record<string, unknown>;
  onSave: (csrf: string, payload: { id?: string; input: unknown }) => Promise<ActionResult<unknown>>;
  onDelete: (csrf: string, id: string) => Promise<ActionResult>;
  renderItem: (item: Entity) => React.ReactNode;
  addLabel?: string;
}) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();

  const [editing, setEditing] = useState<Entity | "new" | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(emptyValue);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    setValues(emptyValue);
    setErrors({});
    setEditing("new");
  };

  const startEdit = (item: Entity) => {
    const next: Record<string, unknown> = {};
    for (const field of fields) next[field.name] = item[field.name] ?? emptyValue[field.name];
    setValues(next);
    setErrors({});
    setEditing(item);
  };

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      const result = await onSave(csrf, {
        id: editing && editing !== "new" ? editing.id : undefined,
        input: values,
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Salvo.");
      setEditing(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Entity) => {
    const result = await onDelete(csrf, item.id);
    if (result.ok) {
      toast.success(result.message ?? "Removido.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-[12.5px] text-ink-faint">{description}</p> : null}
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={startCreate}>
          <Plus size={14} /> {addLabel}
        </Button>
      </div>

      {editing ? (
        <div className="mt-5 rounded-lg border border-accent/25 bg-base-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink">
              {editing === "new" ? addLabel : "Editar registro"}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Cancelar edição"
              className="rounded border border-line p-1 text-ink-faint hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const value = values[field.name];
              const error = errors[field.name];
              const id = `field-${field.name}`;

              return (
                <Field
                  key={field.name}
                  label={field.label}
                  htmlFor={id}
                  error={error}
                  required={field.required}
                  description={field.description}
                  className={cn(
                    (field.full || ["textarea", "list", "media", "choices"].includes(field.type)) && "sm:col-span-2",
                  )}
                >
                  {field.type === "textarea" ? (
                    <Textarea
                      id={id}
                      rows={4}
                      value={(value as string) ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "checkbox" ? (
                    <Checkbox
                      label={field.label}
                      checked={Boolean(value)}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.checked }))
                      }
                    />
                  ) : field.type === "select" ? (
                    <Select
                      id={id}
                      value={(value as string) ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value || null }))
                      }
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : field.type === "list" ? (
                    <ListField
                      id={id}
                      items={Array.isArray(value) ? (value as string[]) : []}
                      placeholder={field.placeholder}
                      addLabel={field.addLabel}
                      onChange={(items) => setValues((current) => ({ ...current, [field.name]: items }))}
                    />
                  ) : field.type === "image" ? (
                    <ImageField
                      id={id}
                      label={field.label}
                      shape={field.shape}
                      value={(value as string | null) || null}
                      onChange={(url) => setValues((current) => ({ ...current, [field.name]: url ?? "" }))}
                    />
                  ) : field.type === "media" ? (
                    <MediaField
                      items={Array.isArray(value) ? (value as MediaItem[]) : []}
                      onChange={(items) => setValues((current) => ({ ...current, [field.name]: items }))}
                    />
                  ) : field.type === "choices" ? (
                    <ChoiceField
                      options={field.options ?? []}
                      value={Array.isArray(value) ? (value as string[]) : []}
                      manage={field.manage}
                      emptyLabel={field.placeholder}
                      onChange={(ids) => setValues((current) => ({ ...current, [field.name]: ids }))}
                    />
                  ) : field.type === "color" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label={`${field.label}: seletor`}
                        value={/^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? String(value) : "#8cc84b"}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.name]: event.target.value }))
                        }
                        className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-base-900 p-1"
                      />
                      <Input
                        id={id}
                        value={(value as string) ?? ""}
                        placeholder={field.placeholder ?? "#8cc84b"}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.name]: event.target.value.trim() }))
                        }
                        className="font-mono"
                      />
                    </div>
                  ) : field.type === "tags" ? (
                    <Textarea
                      id={id}
                      rows={4}
                      value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
                      placeholder={field.placeholder ?? "Um item por linha"}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  ) : (
                    <Input
                      id={id}
                      type={field.type === "number" ? "number" : "text"}
                      value={(value as string | number | null) ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setValues((current) => {
                          const next = {
                            ...current,
                            [field.name]:
                              field.type === "number"
                                ? Number(raw)
                                : field.type === "slug"
                                  ? slugify(raw)
                                  : raw,
                          };

                          // Keep the slug in sync while it has not been edited.
                          const slugField = fields.find((item) => item.slugFrom === field.name);
                          if (slugField && !current[slugField.name]) {
                            next[slugField.name] = slugify(raw);
                          }

                          return next;
                        });
                      }}
                    />
                  )}
                </Field>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={submit}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-faint">
          Nenhum registro cadastrado.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">{renderItem(item)}</div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  aria-label="Editar"
                  className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-accent"
                >
                  <Pencil size={14} />
                </button>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  className="!px-1.5 text-ink-muted hover:text-rose"
                  title="Remover registro?"
                  description="Esta ação não pode ser desfeita."
                  confirmLabel="Remover"
                  onConfirm={() => remove(item)}
                >
                  <Trash2 size={14} />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
