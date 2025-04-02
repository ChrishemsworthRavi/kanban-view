import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase;

async function fetchEnvVars() {
    const response = await fetch('/.netlify/functions/env');
    const env = await response.json();
    
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    loadTasks(); // Load tasks after initializing Supabase
}

fetchEnvVars();

// Open modal
window.openModal = function() {
    document.getElementById("taskModal").style.display = "block";
    document.getElementById("taskInput").value = "";
}

// Close modal
window.closeModal = function() {
    document.getElementById("taskModal").style.display = "none";
}

// Enable dragging
function drag(event) {
    event.dataTransfer.setData("text", event.target.id);
}

// Allow dropping
window.allowDrop = function(event) {
    event.preventDefault();
}

window.drop = async function(event, status) {
    event.preventDefault();
    let taskId = event.dataTransfer.getData("text");
    let task = document.getElementById(taskId);

    let containerId = status === "New" ? "todo-tasks" : status === "In Progress" ? "inprogress-tasks" : "completed-tasks";
    
    const taskContainer = document.getElementById(containerId);
    if (taskContainer) {
        taskContainer.appendChild(task);
        await updateTaskStatus(taskId, status);
        updateCounts();
    }
}

// Add new task dynamically
window.addTask = async function() {
    let taskText = document.getElementById("taskInput").value.trim();
    if (taskText === "") return;

    let { data, error } = await supabase.from("tasks").insert([{ text: taskText, status: "New" }]).select("id");
    if (error) return console.error("Error adding task:", error);

    createTaskElement("task-" + data[0].id, taskText, "New");
    closeModal();
    updateCounts();
}

// Create and append task element
function createTaskElement(taskId, taskText, status) {
    let containerId = status === "New" ? "todo-tasks" : status === "In Progress" ? "inprogress-tasks" : "completed-tasks";
    let taskContainer = document.getElementById(containerId);
    if (!taskContainer) return;

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
    let id = taskId.split("-")[1];
    let { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) console.error("Error updating task:", error);
}

// Load tasks from database
async function loadTasks() {
    let { data: tasks, error } = await supabase.from("tasks").select("*");
    if (error) return console.error("Error loading tasks:", error);

    ["todo-tasks", "inprogress-tasks", "completed-tasks"].forEach(id => document.getElementById(id).innerHTML = "");
    tasks.forEach(task => createTaskElement("task-" + task.id, task.text, task.status));
    updateCounts();
}

// Update task counts
function updateCounts() {
    [["todo", "todo-tasks"], ["in-progress", "inprogress-tasks"], ["done", "completed-tasks"]].forEach(([columnId, containerId]) => {
        let container = document.getElementById(containerId);
        if (container) {
            document.querySelector(`#${columnId} .column-header`).textContent = `${columnId.replace('-', ' ')} (${container.children.length})`;
        }
    });
}

// Close modal if clicked outside
window.onclick = function(event) {
    if (event.target === document.getElementById("taskModal")) closeModal();
}
