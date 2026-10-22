/* Layer sorting adapted from OpenPage LayersPanel.tsx (MIT), Federico De Ponte, 2026.
 * Source commit and modifications: docs/editor/IMPLEMENTATION_STATUS.md; license: LICENSES/OpenPage.txt.
 */
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Section } from "./types";
interface RowProps {
  section: Section;
  selected: boolean;
  select: () => void;
  move: (delta: number) => void;
  first: boolean;
  last: boolean;
}
function Layer({ section, selected, select, move, first, last }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      className={"layer " + (selected ? "selected" : "")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        marginLeft: Number(section.depth || 0) * 12,
      }}
    >
      <button
        className="drag"
        {...attributes}
        {...listeners}
        aria-label={"Drag " + section.heading + " to reorder"}
        title="Drag, or press Space and use arrow keys"
      >
        ⠿
      </button>
      <button className="layer-name" onClick={select} aria-pressed={selected}>
        <span>{section.heading || "Untitled section"}</span>
        <small>
          {section.visible === false
            ? "Hidden"
            : section.kindLabel
              ? String(section.kindLabel)
              : section.image
                ? "Image & story"
                : "Story"}
        </small>
      </button>
      <div className="layer-arrows">
        <button
          disabled={first}
          onClick={() => move(-1)}
          aria-label={"Move " + section.heading + " up"}
        >
          ↑
        </button>
        <button
          disabled={last}
          onClick={() => move(1)}
          aria-label={"Move " + section.heading + " down"}
        >
          ↓
        </button>
      </div>
    </div>
  );
}
export function Layers({
  sections,
  selected,
  select,
  move,
  add,
}: {
  sections: Section[];
  selected: string;
  select: (id: string) => void;
  move: (from: number, to: number) => void;
  add: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function end(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id)
      move(
        sections.findIndex((s) => s.id === e.active.id),
        sections.findIndex((s) => s.id === e.over!.id),
      );
  }
  return (
    <aside className="layers">
      <div className="panel-label">
        <h2>Page sections</h2>
        <span>{sections.length}</span>
      </div>
      <p className="hint">Drag to arrange. Select to edit.</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={end}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="layer-list">
            {sections.map((s, i) => (
              <Layer
                key={s.id}
                section={s}
                selected={selected === s.id}
                select={() => select(s.id)}
                move={(delta) => move(i, i + delta)}
                first={i === 0}
                last={i === sections.length - 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        className="add-section"
        onClick={add}
        disabled={sections.length >= 50}
      >
        + Add block
      </button>
      <div className="source-note">
        <span className="tiny-label">CONTENT SOURCE</span>
        <strong>About page</strong>
        <p>Story, images and section order stay together in one document.</p>
      </div>
    </aside>
  );
}
