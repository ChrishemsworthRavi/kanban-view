import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables are missing!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Open modal
window.openModal = function() {
    document.getElementById("taskModal").style.display = "block";
    document.getElementById("taskInput").value = ""; // Clear input field
};

// Close modal
window.closeModal = function() {
    document.getElementById("taskModal").style.display = "none";
};

// Enable dragging
function drag(event) {
    event.dataTransfer.setData("text", event.target.id); // Store the ID of the dragged task
}

// Allow dropping
window.allowDrop = function(event) {
    event.preventDefault(); // Prevent default handling (to allow drop)
};

window.drop = async function(event, status) {
    event.preventDefault();
    let taskId = event.dataTransfer.getData("text");
    let task = document.getElementById(taskId);
    
    let containerId;
    switch (status) {
        case "New":
            containerId = "todo-tasks";
            break;
        case "In Progress":
            containerId = "inprogress-tasks";
            break;
        case "Completed":
            containerId = "completed-tasks";
            break;
        default:
            console.error(`Unknown status: ${status}`);
            return;
    }

    const taskContainer = document.getElementById(containerId);
    
    if (taskContainer) {
        taskContainer.appendChild(task);
        await updateTaskStatus(taskId, status);
        updateCounts();
    } else {
        console.error(`Container with ID "${containerId}" not found.`);
    }
};

// Add new task dynamically
window.addTask = async function() {
    let taskText = document.getElementById("taskInput").value.trim();
    if (taskText === "") return;

    let { data, error } = await supabase
        .from("tasks")
        .insert([{ text: taskText, status: "New" }]) // Default status is "New"
        .select("id");

    if (error) {
        console.error("Error adding task:", error);
        return;
    }

    let taskId = "task-" + data[0].id;
    createTaskElement(taskId, taskText, "New");
    closeModal();
    updateCounts();
};

// Create and append task element
function createTaskElement(taskId, taskText, status) {
    let taskContainer;
    if (status === "New") {
        taskContainer = document.getElementById("todo-tasks");
    } else if (status === "In Progress") {
        taskContainer = document.getElementById("inprogress-tasks");
    } else if (status === "Completed") {
        taskContainer = document.getElementById("completed-tasks");
    } else {
        console.error(`Unknown status "${status}" for task: ${taskId}`);
        return;
    }

    let task = document.createElement("div");
    task.className = "task";
    task.textContent = taskText;
    task.id = taskId;
    task.draggable = true;
    task.ondragstart = drag;

    if (taskContainer) {
        taskContainer.appendChild(task);
    }
}

// Update task status in database
async function updateTaskStatus(taskId, status) {
    let id = taskId.split("-")[1];
    let { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) {
        console.error("Error updating task:", error);
    }
}

// Load tasks from database
async function loadTasks() {
    let { data: tasks, error } = await supabase.from("tasks").select("*");
    if (error) {
        console.error("Error loading tasks:", error);
        return;
    }

    document.getElementById("todo-tasks").innerHTML = '';
    document.getElementById("inprogress-tasks").innerHTML = '';
    document.getElementById("completed-tasks").innerHTML = '';

    tasks.forEach(task => {
        createTaskElement("task-" + task.id, task.text, task.status);
    });
    updateCounts();
}

// Update task counts
function updateCounts() {
    const todoTasksContainer = document.getElementById("todo-tasks");
    const inProgressTasksContainer = document.getElementById("inprogress-tasks");
    const completedTasksContainer = document.getElementById("completed-tasks");

    if (todoTasksContainer) {
        document.querySelector("#todo .column-header").textContent = `New (${todoTasksContainer.children.length})`;
    } else {
        console.error("Todo tasks container not found.");
    }

    if (inProgressTasksContainer) {
        document.querySelector("#in-progress .column-header").textContent = `In Progress (${inProgressTasksContainer.children.length})`;
    } else {
        console.error("In Progress tasks container not found.");
    }

    if (completedTasksContainer) {
        document.querySelector("#done .column-header").textContent = `Completed (${completedTasksContainer.children.length})`;
    } else {
        console.error("Completed tasks container not found.");
    }
}

// Close modal if clicked outside
window.onclick = function(event) {
    let modal = document.getElementById("taskModal");
    if (event.target === modal) {
        closeModal();
    }
};

// Load tasks on page load
document.addEventListener("DOMContentLoaded", loadTasks);
