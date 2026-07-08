"use client";

import { useEffect, useState } from "react";
import { fetchTodoQueueCount } from "@/lib/todo-queue";

export function TodoNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => void fetchTodoQueueCount().then(setCount);
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("todo-queue-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("todo-queue-changed", refresh);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto rounded-full bg-[var(--stage-responded)] px-1.5 py-px text-[10px] font-semibold text-white">
      {count}
    </span>
  );
}
