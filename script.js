import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase; // Declare supabase globally

// Fetch environment variables securely from Netlify function
async function fetchEnvVars() {
    try {
        const response = await fetch('/.netlify/functions/env');
        const env = await response.json();

        const SUPABASE_URL = env.SUPABASE_URL;
        const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

        // Initialize Supabase only after fetching the keys
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Now load tasks after Supabase is initialized
        loadTasks();
    } catch (error) {
        console.error("Error fetching environment variables:", error);
    }
}

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
    
    let containerId;
    switch(status) {
        case "New": containerId = "todo-tasks"; break;
        case "In Progress": containerId = "inprogress-tasks"; break;
        case "Completed": containerId = "completed-tasks"; break;
        default:
            console.error(`Unknown status: ${status}`);
            return;
    }

    console.log(`Dropping task into: ${status}`);

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
        .insert([{ text: taskText, status: "New" }])
        .select("id");

    if (error) {
        console.error("Error adding task:", error);
        return;
    }

    let taskId = "task-" + data[0].id;
    createTaskElement(taskId, taskText, "New");
    closeModal();
    updateCounts();
}

// Create and append task element
function createTaskElement(taskId, taskText, status) {
    let taskContainer = document.getElementById(status === "New" ? "todo-tasks" : 
        status === "In Progress" ? "inprogress-tasks" : "completed-tasks");

    if (!taskContainer) {
        console.error(`Unknown status "${status}" for task: ${taskId}`);
        return;
    }

    let task = document.createElement("div");
    task.className = "task";
    task.textContent = taskText;
    task.id = taskId;
    task.draggable = true;
    task.ondragstart = drag;

    taskContainer.appendChild(task);
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
    if (!supabase) {
        console.error("Supabase is not initialized yet.");
        return;
    }

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
    }

    if (inProgressTasksContainer) {
        document.querySelector("#in-progress .column-header").textContent = `In Progress (${inProgressTasksContainer.children.length})`;
    }

    if (completedTasksContainer) {
        document.querySelector("#done .column-header").textContent = `Completed (${completedTasksContainer.children.length})`;
    }
}

// Close modal if clicked outside
window.onclick = function(event) {
    let modal = document.getElementById("taskModal");
    if (event.target === modal) {
        closeModal();
    }
}

// Fetch environment variables first, then load tasks
fetchEnvVars();
