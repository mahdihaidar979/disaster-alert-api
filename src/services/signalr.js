import * as signalR from "@microsoft/signalr";

let connection = null;

const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL;

const listeners = {
  onReceiveAlert: [],
  onReportSubmitted: [],
  onReportStatusUpdated: [],
  onReportDeleted: [],
  onNewPendingReport: [],
};

function addListener(name, fn) {
  if (fn && !listeners[name].includes(fn)) {
    listeners[name].push(fn);
  }
}

function runListeners(name, data) {
  listeners[name].forEach((fn) => fn(data));
  window.dispatchEvent(new Event("reportsChanged"));
}

export function startSignalR({
  onReceiveAlert,
  onReportSubmitted,
  onReportStatusUpdated,
  onReportDeleted,
  onNewPendingReport,
} = {}) {
  addListener("onReceiveAlert", onReceiveAlert);
  addListener("onReportSubmitted", onReportSubmitted);
  addListener("onReportStatusUpdated", onReportStatusUpdated);
  addListener("onReportDeleted", onReportDeleted);
  addListener("onNewPendingReport", onNewPendingReport);

  if (connection) return connection;

  console.log("SIGNALR_URL =", SIGNALR_URL);

  connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_URL, {
      accessTokenFactory: () => localStorage.getItem("adminToken") || "",
    })
    .withAutomaticReconnect()
    .build();

  connection.on("ReceiveAlert", (data) => {
    console.log("ReceiveAlert:", data);
    runListeners("onReceiveAlert", data);
  });

  connection.on("ReportSubmitted", (data) => {
    console.log("ReportSubmitted:", data);
    runListeners("onReportSubmitted", data);
  });

  connection.on("NewPendingReport", (data) => {
    console.log("NewPendingReport:", data);
    runListeners("onNewPendingReport", data);
  });

  connection.on("ReportStatusUpdated", (data) => {
    console.log("ReportStatusUpdated:", data);
    runListeners("onReportStatusUpdated", data);
  });

  connection.on("ReportDeleted", (data) => {
    console.log("ReportDeleted:", data);
    runListeners("onReportDeleted", data);
  });

  connection
    .start()
    .then(() => console.log("✅ SignalR connected"))
    .catch((err) => console.error("SignalR connection error:", err));

  return connection;
}

export function stopSignalR() {
  if (connection) {
    connection.stop();
    connection = null;
  }
}