import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import dotenv from "dotenv"; // Import dotenv package

dotenv.config(); // Load environment variables

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Open modal
window.openModal = function() {
    document.getElementById("taskModal").style.display = "block";
    document.getElementById("taskInput").value = ""; // Clear input field
}

// Close modal
window.closeModal = function() {
    document.getElementById("taskModal").style.display = "none";
}

// Enable dragging
function drag(event) {
    event.dataTransfer.setData("text", event.target.id); // Store the ID of the dragged task
}

// Allow dropping
window.allowDrop = function(event) {
    event.preventDefault(); // Prevent default handling (to allow drop)
}

window.drop = async function(event, status) {
    event.preventDefault();
    let taskId = event.dataTransfer.getData("text");
    let task = document.getElementById(taskId);
    
    // Normalize status to match your container IDs
    let containerId;
    switch(status) {
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

    console.log(`Dropping task into: ${status}`);
    console.log(`Looking for container: ${containerId}`);

    const taskContainer = document.getElementById(containerId);
    
    if (taskContainer) {
        taskContainer.appendChild(task);
        await updateTaskStatus(taskId, status);
        updateCounts();
    } else {
        console.error(`Container with ID "${containerId}" not found.`);
    }
}



// Add new task dynamically
window.addTask = async function() {
    let taskText = document.getElementById("taskInput").value.trim();
    if (taskText === "") return; // Prevent empty task

    let { data, error } = await supabase
        .from("tasks")
        .insert([{ text: taskText, status: "New" }]) // Default status is "New"
        .select("id");

    if (error) {
        console.error("Error adding task:", error);
        return;
    }

    let taskId = "task-" + data[0].id;
    createTaskElement(taskId, taskText, "New"); // Use "New" for initial status
    closeModal();
    updateCounts();
}

// Create and append task element
function createTaskElement(taskId, taskText, status) {
    let taskContainer; // Define the task container based on status

    // Determine the correct container based on the status
    if (status === "New") {
        taskContainer = document.getElementById("todo-tasks");
    } else if (status === "In Progress") {
        taskContainer = document.getElementById("inprogress-tasks");
    } else if (status === "Completed") {
        taskContainer = document.getElementById("completed-tasks");
    } else {
        console.error(`Unknown status "${status}" for task: ${taskId}`);
        return; // Exit if the status is unknown
    }

    let task = document.createElement("div");
    task.className = "task";
    task.textContent = taskText;
    task.id = taskId;
    task.draggable = true; // Enable dragging
    task.ondragstart = drag; // Set up drag event

    // Append the task to the correct container
    if (taskContainer) {
        taskContainer.appendChild(task);
    }
}

// Update task status in database
async function updateTaskStatus(taskId, status) {
    let id = taskId.split("-")[1]; // Extract numeric ID
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

    // Clear existing tasks in each column before loading
    document.getElementById("todo-tasks").innerHTML = '';
    document.getElementById("inprogress-tasks").innerHTML = '';
    document.getElementById("completed-tasks").innerHTML = '';

    tasks.forEach(task => {
        // Create task elements based on their status
        createTaskElement("task-" + task.id, task.text, task.status);
    });
    updateCounts();
}


// Update task counts
function updateCounts() {
    const todoTasksContainer = document.getElementById("todo-tasks");
    const inProgressTasksContainer = document.getElementById("inprogress-tasks");
    const completedTasksContainer = document.getElementById("completed-tasks");

    // Ensure containers exist before accessing their children
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
}

// Load tasks on page load
document.addEventListener("DOMContentLoaded", loadTasks);
