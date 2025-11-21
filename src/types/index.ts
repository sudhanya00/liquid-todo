export interface Space {
    id: string;
    name: string;
    color?: string;
    createdAt: number;
    userId: string;
}

export interface TaskUpdate {
    id: string;
    timestamp: number;
    type: "status_change" | "note" | "field_update";
    content: string;
    field?: string; // e.g., "priority", "dueDate", "status"
    oldValue?: string;
    newValue?: string;
}

export interface Task {
    id: string;
    spaceId: string;
    title: string;
    description?: string;
    dueDate?: string | null;
    dueTime?: string; // e.g., "14:00" or "2:00 PM"
    priority?: "low" | "medium" | "high";
    status: "todo" | "in-progress" | "done";
    createdAt: number;
    updatedAt: number;
    updates?: TaskUpdate[]; // Activity timeline
}
