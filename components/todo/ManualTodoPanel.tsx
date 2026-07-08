"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Todo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type TodoBucket = "priority" | "normal";

const BUCKET_STYLES: Record<
  TodoBucket,
  { bg: string; border: string; header: string; badge: string; ring: string }
> = {
  priority: {
    bg: "bg-gradient-to-b from-amber-50 to-orange-50/80",
    border: "border-amber-200/80",
    header: "text-amber-800",
    badge: "bg-amber-200/70 text-amber-900",
    ring: "ring-amber-300",
  },
  normal: {
    bg: "bg-gradient-to-b from-sky-50 to-indigo-50/80",
    border: "border-sky-200/80",
    header: "text-indigo-800",
    badge: "bg-sky-200/70 text-indigo-900",
    ring: "ring-sky-300",
  },
};

const inputClass =
  "w-full rounded-lg border border-violet-200 bg-white/90 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200";

function sortByPosition(a: Todo, b: Todo) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at);
}

function TodoRowContent({
  todo,
  accent,
  sortable,
  editing,
  editText,
  onEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggle,
  onDelete,
  setNodeRef,
  style,
  isDragging,
}: {
  todo: Todo;
  accent: "amber" | "indigo" | "slate";
  sortable?: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  };
  editing: boolean;
  editText: string;
  onEditText: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
}) {
  const accentBorder =
    accent === "amber"
      ? "border-amber-100 hover:border-amber-200"
      : accent === "indigo"
        ? "border-sky-100 hover:border-sky-200"
        : "border-gray-100";

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.45 : style?.opacity ?? 1,
      }}
      className={cn(
        "group flex items-start gap-2 rounded-lg border bg-white/90 px-2.5 py-2 shadow-sm transition-shadow hover:shadow-md",
        accentBorder,
        todo.done && "bg-gray-50/80"
      )}
    >
      {sortable ? (
        <button
          type="button"
          className="mt-1 cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <input
        type="checkbox"
        checked={todo.done}
        onChange={onToggle}
        className={cn(
          "mt-1 rounded border-gray-300",
          accent === "amber" && "accent-amber-500",
          accent === "indigo" && "accent-indigo-500"
        )}
      />
      {editing ? (
        <input
          className="min-w-0 flex-1 rounded-md border border-violet-200 px-2 py-1 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          value={editText}
          onChange={(e) => onEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={onSaveEdit}
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 cursor-text text-sm",
            todo.done ? "text-gray-400 line-through" : "text-gray-900"
          )}
          onDoubleClick={onStartEdit}
        >
          {todo.text}
        </span>
      )}
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!todo.done && !editing ? (
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded p-1 text-gray-300 hover:bg-violet-50 hover:text-violet-600"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function SortableTodoRow(props: Omit<
  React.ComponentProps<typeof TodoRowContent>,
  "setNodeRef" | "style" | "isDragging" | "sortable"
> & { todo: Todo }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.todo.id });

  return (
    <TodoRowContent
      {...props}
      setNodeRef={setNodeRef}
      sortable={{ attributes, listeners }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      isDragging={isDragging}
    />
  );
}

function TodoBucketColumn({
  bucket,
  title,
  hint,
  todos,
  editingId,
  editText,
  onEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggle,
  onDelete,
}: {
  bucket: TodoBucket;
  title: string;
  hint: string;
  todos: Todo[];
  editingId: string | null;
  editText: string;
  onEditText: (v: string) => void;
  onStartEdit: (todo: Todo) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  const styles = BUCKET_STYLES[bucket];
  const { setNodeRef, isOver } = useDroppable({ id: bucket });
  const accent = bucket === "priority" ? "amber" : "indigo";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[220px] flex-col rounded-2xl border-2 p-4 shadow-sm transition-shadow",
        styles.bg,
        styles.border,
        isOver && `ring-2 ${styles.ring}`
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className={cn("text-sm font-bold", styles.header)}>{title}</h2>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            styles.badge
          )}
        >
          {todos.length}
        </span>
      </div>
      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-1 flex-col gap-2">
          {todos.length === 0 ? (
            <li className="rounded-lg border border-dashed border-gray-200/80 px-3 py-8 text-center text-xs text-gray-400">
              Drag tasks here
            </li>
          ) : (
            todos.map((todo) => (
              <SortableTodoRow
                key={todo.id}
                todo={todo}
                accent={accent}
                editing={editingId === todo.id}
                editText={editText}
                onEditText={onEditText}
                onStartEdit={() => onStartEdit(todo)}
                onSaveEdit={() => onSaveEdit(todo.id)}
                onCancelEdit={onCancelEdit}
                onToggle={() => onToggle(todo)}
                onDelete={() => onDelete(todo.id)}
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

function notifyTodoQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("todo-queue-changed"));
  }
}

export function ManualTodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("done", { ascending: true })
      .order("priority", { ascending: false })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setLoadError(
        error.message.includes("relation") ||
          error.message.includes("does not exist")
          ? "To-do table not found. Run supabase/migrations/20250522_todos.sql in the Supabase SQL Editor."
          : error.message.includes("priority")
            ? "Run supabase/migrations/20250527_todos_priority.sql in the Supabase SQL Editor."
            : error.message
      );
      setTodos([]);
    } else {
      setTodos(
        ((data as Todo[]) ?? []).map((t) => ({
          ...t,
          priority: t.priority ?? false,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  const priorityOpen = useMemo(
    () => todos.filter((t) => !t.done && t.priority).sort(sortByPosition),
    [todos]
  );
  const normalOpen = useMemo(
    () => todos.filter((t) => !t.done && !t.priority).sort(sortByPosition),
    [todos]
  );
  const done = useMemo(
    () => todos.filter((t) => t.done).sort(sortByPosition),
    [todos]
  );

  const persistBuckets = async (prio: Todo[], later: Todo[]) => {
    const reindexedPrio = prio.map((t, i) => ({ ...t, priority: true, position: i }));
    const reindexedLater = later.map((t, i) => ({
      ...t,
      priority: false,
      position: i,
    }));
    const changed = [...reindexedPrio, ...reindexedLater];
    const doneTodos = todos.filter((t) => t.done);
    setTodos([...changed, ...doneTodos]);

    await Promise.all(
      changed.map((t) =>
        supabase
          .from("todos")
          .update({ position: t.position, priority: t.priority })
          .eq("id", t.id)
      )
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const dragged = todos.find((t) => t.id === activeId);
    if (!dragged || dragged.done) return;

    let prio = [...priorityOpen];
    let later = [...normalOpen];

    const fromBucket: TodoBucket = dragged.priority ? "priority" : "normal";
    const fromList = fromBucket === "priority" ? prio : later;
    const fromIdx = fromList.findIndex((t) => t.id === activeId);
    if (fromIdx < 0) return;

    let toBucket: TodoBucket;
    let toIdx: number;

    if (over.id === "priority" || over.id === "normal") {
      toBucket = over.id;
      toIdx = (toBucket === "priority" ? prio : later).length;
    } else {
      const overTodo = todos.find((t) => t.id === over.id);
      if (!overTodo || overTodo.done) return;
      toBucket = overTodo.priority ? "priority" : "normal";
      const list = toBucket === "priority" ? prio : later;
      toIdx = list.findIndex((t) => t.id === over.id);
      if (toIdx < 0) toIdx = list.length;
    }

    if (fromBucket === toBucket) {
      const moved = arrayMove(fromList, fromIdx, toIdx);
      if (fromBucket === "priority") prio = moved;
      else later = moved;
    } else {
      if (fromBucket === "priority") {
        prio = prio.filter((t) => t.id !== activeId);
      } else {
        later = later.filter((t) => t.id !== activeId);
      }

      const updated = { ...dragged, priority: toBucket === "priority" };
      const dest = toBucket === "priority" ? [...prio] : [...later];
      dest.splice(toIdx, 0, updated);
      if (toBucket === "priority") prio = dest;
      else later = dest;
    }

    await persistBuckets(prio, later);
    notifyTodoQueueChanged();
  };

  const addTodo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newText.trim();
    if (!text) return;
    setSaving(true);
    const position =
      normalOpen.length === 0
        ? 0
        : Math.max(...normalOpen.map((t) => t.position), 0) + 1;
    const { data, error } = await supabase
      .from("todos")
      .insert({ text, position, priority: false })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (data) {
      setTodos((prev) => [...prev, { ...(data as Todo), priority: false }]);
      setNewText("");
      notifyTodoQueueChanged();
    }
  };

  const toggleTodo = async (todo: Todo) => {
    const doneNext = !todo.done;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: doneNext } : t))
    );
    const { error } = await supabase
      .from("todos")
      .update({ done: doneNext })
      .eq("id", todo.id);
    if (error) void loadTodos();
    else notifyTodoQueueChanged();
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) void loadTodos();
    else notifyTodoQueueChanged();
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = async (id: string) => {
    const text = editText.trim();
    setEditingId(null);
    if (!text) {
      await deleteTodo(id);
      return;
    }
    const prev = todos.find((t) => t.id === id);
    if (!prev || prev.text === text) return;

    setTodos((prevTodos) =>
      prevTodos.map((t) => (t.id === id ? { ...t, text } : t))
    );
    const { error } = await supabase
      .from("todos")
      .update({ text })
      .eq("id", id);
    if (error) void loadTodos();
    else notifyTodoQueueChanged();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const activeDragTodo = activeDragId
    ? todos.find((t) => t.id === activeDragId)
    : null;

  return (
    <section>
          <form
            onSubmit={(e) => void addTodo(e)}
            className="flex gap-2 rounded-2xl border border-violet-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm"
          >
            <input
              className={inputClass}
              placeholder="Add a task…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              disabled={saving}
            />
            <Button
              type="submit"
              disabled={saving || !newText.trim()}
              className="shrink-0 bg-violet-600 hover:bg-violet-700"
            >
              Add
            </Button>
          </form>

          {loadError ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {loadError}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-center text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="mt-6 space-y-6">
              {priorityOpen.length === 0 &&
              normalOpen.length === 0 &&
              done.length === 0 &&
              !loadError ? (
                <p className="text-center text-sm text-gray-400">
                  Nothing here yet — add your first task above.
                </p>
              ) : null}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveDragId(String(e.active.id))}
                onDragEnd={(e) => void handleDragEnd(e)}
                onDragCancel={() => setActiveDragId(null)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TodoBucketColumn
                    bucket="priority"
                    title="Priority"
                    hint="Drag here for must-do items"
                    todos={priorityOpen}
                    editingId={editingId}
                    editText={editText}
                    onEditText={setEditText}
                    onStartEdit={startEdit}
                    onSaveEdit={(id) => void saveEdit(id)}
                    onCancelEdit={cancelEdit}
                    onToggle={(t) => void toggleTodo(t)}
                    onDelete={(id) => void deleteTodo(id)}
                  />
                  <TodoBucketColumn
                    bucket="normal"
                    title="Later"
                    hint="Everything else for now"
                    todos={normalOpen}
                    editingId={editingId}
                    editText={editText}
                    onEditText={setEditText}
                    onStartEdit={startEdit}
                    onSaveEdit={(id) => void saveEdit(id)}
                    onCancelEdit={cancelEdit}
                    onToggle={(t) => void toggleTodo(t)}
                    onDelete={(id) => void deleteTodo(id)}
                  />
                </div>

                <DragOverlay>
                  {activeDragTodo && !activeDragTodo.done ? (
                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg">
                      {activeDragTodo.text}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {done.length > 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    Done ({done.length})
                  </h2>
                  <ul className="space-y-1.5">
                    {done.map((todo) => (
                      <TodoRowContent
                        key={todo.id}
                        todo={todo}
                        accent="slate"
                        editing={editingId === todo.id}
                        editText={editText}
                        onEditText={setEditText}
                        onStartEdit={() => startEdit(todo)}
                        onSaveEdit={() => void saveEdit(todo.id)}
                        onCancelEdit={cancelEdit}
                        onToggle={() => void toggleTodo(todo)}
                        onDelete={() => void deleteTodo(todo.id)}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
    </section>
  );
}
